import gsap from 'gsap';
import { Header, attachHeaderListeners } from '../components/Header';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { EmptyState, initEmptyStateLotties } from '../components/EmptyState';
import { toaster } from '../components/Toast';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { openReminderModal } from '../components/ReminderModal';
import { DynamicIsland, animateDynamicIslandEntrance, animateDynamicIslandTransition } from '../components/DynamicIsland';
import { db } from '../lib/firebase';
import {
  collection,
  deleteDoc,
  setDoc,
  doc,
  Timestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { GenericDropdown, attachGenericDropdownListeners, type DropdownItem } from '../components/GenericDropdown';
import type { Unsubscribe } from 'firebase/firestore';
import { CategoryService } from '../services/categoryService';
import { 
  MonthSelector, 
  attachMonthSelectorListeners, 
  MonthSelectorStyles,
  toMonthKey 
} from '../components/MonthSelector';


let reminders: any[] = [];
let userCategories: any[] = [];
let billingsByReminderId: Map<string, any> = new Map();
let currentSearch = '';
let currentSort: 'name' | 'value' | 'date' = 'date';
let currentStatusFilter: 'all' | 'paid' | 'pending' = 'all';
let currentTypeFilter: 'all' | 'income' | 'expense' = 'all';
let currentMonth = toMonthKey(new Date());   // 'YYYY-MM'

// ─── Real-time listener cleanup ───────────────────────────────────────────────
let unsubReminders: Unsubscribe | null = null;
let unsubBillings: Unsubscribe | null = null;

function cleanupListeners() {
  if (unsubReminders) { unsubReminders(); unsubReminders = null; }
  if (unsubBillings) { unsubBillings(); unsubBillings = null; }
}

// ─── Month helpers ─────────────────────────────────────────────────────────────



// ─── Labels & maps ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  entertainment: 'Lazer', leisure: 'Lazer', lazer: 'Lazer',
  education: 'Educação', Educacao: 'Educação', educacao: 'Educação',
  health: 'Saúde', Saude: 'Saúde', saude: 'Saúde',
  gym: 'Academia',
  'health insurance': 'Plano de Saúde',
  serviços: 'Serviços', Servicos: 'Serviços',
  'digital services': 'Serviços digitais', 'Servicos digitais': 'Serviços digitais',
  'video streaming': 'Streaming', 'music streaming': 'Streaming música',
  productivity: 'Produtividade', Produtividade: 'Produtividade',
  insurance: 'Seguro', Seguros: 'Seguro', seguro: 'Seguro',
  other: 'Outros', others: 'Outros',
  bills: 'Contas Fixas',
  reminders: 'Lembretes', reminder: 'Lembrete',
};

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  weekly: 'Semanal',
  once: 'Única vez',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Lazer': '#f59e0b',
  'Educação': '#6366f1',
  'Saúde': '#10b981',
  'Academia': '#10b981',
  'Plano de Saúde': '#10b981',
  'Serviços': '#8b5cf6',
  'Serviços digitais': '#8b5cf6',
  'Streaming': '#ef4444',
  'Streaming música': '#ec4899',
  'Produtividade': '#3b82f6',
  'Seguro': '#D97757',
  'Outros': '#6b7280',
  'Contas Fixas': '#d97757',
  'Lembretes': '#d97757',
};

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSplit = (n: number) => {
  const [reais, centavos] = fmt(n).split(',');
  return `${reais}<span class="rem-decimal">,${centavos}</span>`;
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

// ─── Due date status ────────────────────────────────────────────────────────

function getDueDateStatus(r: any, isPaid: boolean): { type: 'warning' | 'danger' | 'overdue'; label: string; daysLeft: number } | null {
  if (!r.dueDate || isPaid) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let effectiveDueDate: Date;

  if (r.frequency === 'monthly') {
    const day = parseInt(r.dueDate.substring(8, 10));
    const [year, month] = currentMonth.split('-').map(Number);
    effectiveDueDate = new Date(year, month - 1, day);
  } else if (r.frequency === 'yearly') {
    const monthDay = r.dueDate.substring(5);
    const currentYear = parseInt(currentMonth.substring(0, 4));
    effectiveDueDate = new Date(`${currentYear}-${monthDay}T00:00:00`);
  } else {
    effectiveDueDate = new Date(r.dueDate + 'T00:00:00');
  }

  const diffMs = effectiveDueDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { type: 'overdue', label: `Vencido há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) > 1 ? 's' : ''}`, daysLeft };
  if (daysLeft === 0) return { type: 'danger', label: 'Vence hoje', daysLeft };
  if (daysLeft === 1) return { type: 'danger', label: 'Vence amanhã', daysLeft };
  if (daysLeft <= 5) return { type: 'warning', label: `Vence em ${daysLeft} dias`, daysLeft };

  return null;
}

function dueBadgeHtml(status: ReturnType<typeof getDueDateStatus>): string {
  if (!status) return '';
  const cls = status.type === 'warning' ? 'rem-due-badge--warning' : 'rem-due-badge--danger';
  const icon = status.type === 'warning'
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  return `<div class="rem-due-badge ${cls}">${icon}<span>${status.label}</span></div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryInfo(r: any): { label: string; color: string } {
  const rawCat = (r.category || '').toLowerCase().trim();
  let catLabel: string | null = null;

  const foundUserCat = userCategories.find(c =>
    c.id === r.category ||
    c.name.toLowerCase() === rawCat ||
    (c.originalKey && c.originalKey.toLowerCase() === rawCat)
  );
  if (foundUserCat) catLabel = foundUserCat.name;
  if (!catLabel) {
    const key = rawCat as keyof typeof CATEGORY_LABELS;
    catLabel = CATEGORY_LABELS[key] ?? null;
  }
  if (!catLabel) {

    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      if (rawCat.includes(key) || key.includes(rawCat)) { catLabel = label; break; }
    }
  }
  if (!catLabel) catLabel = r.category || 'Outros';

  const finalLabel = catLabel as string;
  const color = CATEGORY_COLORS[finalLabel as keyof typeof CATEGORY_COLORS] ?? '#6b7280';
  return { label: finalLabel, color };
}


// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCards(): string {
  const nameWidths = [72, 58, 68, 80];

  // Summary strip skeleton
  const summarySkel = `
    <div class="rem-skel-summary" aria-busy="true">
      <div class="rem-skel-summary-item">
        <span class="skel skel-label" style="width:72px;"></span>
        <span class="skel skel-summary-value"></span>
      </div>
      <div class="rem-skel-summary-divider"></div>
      <div class="rem-skel-summary-item">
        <span class="skel skel-label" style="width:60px;"></span>
        <span class="skel skel-summary-value"></span>
      </div>
      <div class="rem-skel-summary-divider"></div>
      <div class="rem-skel-summary-item">
        <span class="skel skel-label" style="width:44px;"></span>
        <span class="skel skel-summary-value"></span>
      </div>
    </div>`;

  // Toolbar skeleton
  const toolbarSkel = `
    <div class="rem-skel-toolbar" aria-busy="true">
      <div class="skel skel-search"></div>
      <div class="skel skel-month-selector"></div>
    </div>`;

  // Category header skeleton
  const catHeaderSkel = `
    <div class="rem-category-header" style="margin-bottom:4px;">
      <span class="skel skel-cat-title"></span>
      <span class="rem-category-line"></span>
      <span class="skel skel-cat-count"></span>
    </div>`;

  // Card skeletons
  const cardsSkel = Array.from({ length: 4 }).map((_, i) => `
    <div class="rem-card rem-card-skeleton" style="animation-delay:${i * 80}ms" aria-busy="true">
      <div class="rem-card-main">
        <div class="skel skel-avatar"></div>
        <div class="rem-card-info">
          <span class="rem-name">
            <span class="skel skel-name" style="width:${nameWidths[i]}%;"></span>
            <span class="skel skel-badge"></span>
          </span>
        </div>
      </div>
      <div class="rem-card-metrics">
        <div class="rem-metric-item">
          <span class="skel skel-label"></span>
          <span class="skel skel-meta-value"></span>
        </div>
        <div class="rem-metric-item">
          <span class="skel skel-label"></span>
          <span class="skel skel-value skel-value-wide"></span>
        </div>
      </div>
      <div class="rem-card-actions">
        <div class="skel skel-action-btn"></div>
        <div class="skel skel-action-btn"></div>
        <div class="skel skel-action-btn"></div>
      </div>
    </div>`).join('');

  return `
    ${summarySkel}
    ${toolbarSkel}
    <div class="rem-category-group">
      ${catHeaderSkel}
      <div class="rem-grid">${cardsSkel}</div>
    </div>`;
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function SummaryStrip(): string {
  const summaryContent = `
    <div class="rem-summary-item">
      <span class="rem-summary-label">A receber</span>
      <div class="rem-summary-value-row">
        <span class="rem-summary-currency">R$</span>
        <strong id="card-to-receive" class="rem-summary-amount rem-summary-amount--income">0<span class="rem-decimal">,00</span></strong>
      </div>
    </div>
    <div class="rem-summary-divider"></div>
    <div class="rem-summary-item">
      <span class="rem-summary-label">A pagar</span>
      <div class="rem-summary-value-row">
        <span class="rem-summary-currency">R$</span>
        <strong id="card-to-pay" class="rem-summary-amount rem-summary-amount--danger">0<span class="rem-decimal">,00</span></strong>
      </div>
    </div>
    <div class="rem-summary-divider"></div>
    <div class="rem-summary-item">
      <span class="rem-summary-label">Total Mensal</span>
      <div class="rem-summary-value-row">
        <span class="rem-summary-currency">R$</span>
        <strong id="card-total-month" class="rem-summary-amount">0<span class="rem-decimal">,00</span></strong>
      </div>
    </div>
`;

  return DynamicIsland({
    id: 'summary-strip',
    content: summaryContent,
    className: 'rem-summary hidden',
    style: 'display: none;',
    hidden: true
  });
}

// ─── Status Selector ──────────────────────────────────────────────────────────

function StatusSelector(): string {
  const statusLabels: Record<string, string> = {
    all: 'Status: Todos',
    pending: 'Em aberto',
    paid: 'Realizados'
  };

  const innerContent = `
    <button id="rem-status-prev" class="month-nav-btn relative z-10" type="button" aria-label="Filtro anterior">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <span id="rem-status-label" class="month-selector-label" style="min-width: 85px; text-align: center;">${statusLabels[currentStatusFilter]}</span>
    <button id="rem-status-next" class="month-nav-btn relative z-10" type="button" aria-label="Próximo filtro">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  `;

  return DynamicIsland({
    id: 'rem-status-selector',
    content: innerContent,
    contentWrapperId: 'rem-status-content-wrapper',
    className: 'month-selector-container',
    hidden: true,
    style: 'padding: 2px 2px; gap: 0px;',
  });
}

function TypeSelector(): string {
  const typeLabels: Record<string, string> = {
    all: 'Tipo: Todos',
    income: 'Receitas',
    expense: 'Despesas'
  };

  const innerContent = `
    <button id="rem-type-prev" class="month-nav-btn relative z-10" type="button" aria-label="Tipo anterior">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <span id="rem-type-label" class="month-selector-label" style="min-width: 85px; text-align: center;">${typeLabels[currentTypeFilter]}</span>
    <button id="rem-type-next" class="month-nav-btn relative z-10" type="button" aria-label="Próximo tipo">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  `;

  return DynamicIsland({
    id: 'rem-type-selector',
    content: innerContent,
    contentWrapperId: 'rem-type-content-wrapper',
    className: 'month-selector-container',
    hidden: true,
    style: 'padding: 2px 2px; gap: 0px;',
  });
}

// ─── Toolbar (search + sort) ──────────────────────────────────────────────────

function Toolbar(): string {
  return `
    <div id="rem-toolbar" class="rem-toolbar hidden">
      <div class="rem-search-wrap">
        <svg class="rem-search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="rem-search"
          class="rem-search-input"
          type="search"
          placeholder="Buscar lembrete…"
          aria-label="Buscar lembrete"
          autocomplete="off"
        />
        <button id="rem-search-clear" class="rem-search-clear hidden" aria-label="Limpar busca" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="rem-header-controls">
        <div class="flex flex-row items-center gap-2 w-full">
          ${StatusSelector()}
          ${TypeSelector()}
          ${MonthSelector({ id: 'rem-month-selector' })}
        </div>
      </div>
    </div>`;
}


// ─── Page shell ───────────────────────────────────────────────────────────────

function RemindersContent(): string {
  return `
    <div class="w-full">
      <div class="rem-page-header">
        <div>
          <h2 class="rem-page-title">Lembretes</h2>
          <p class="rem-page-subtitle">Organize seus compromissos e contas que precisam de atenção.</p>
        </div>
        <div class="rem-page-actions">
          <button id="btn-add-reminder" class="rem-add-btn" type="button" aria-label="Novo lembrete">
            Novo lembrete
          </button>
        </div>
      </div>

      ${SummaryStrip()}
      ${Toolbar()}

      <div id="reminders-list-container" aria-live="polite" aria-label="Lista de lembretes">
        <div class="rem-skeleton-grid">
          ${SkeletonCards()}
        </div>
      </div>
    </div>`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  ${MonthSelectorStyles}
  
  @keyframes fadein {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer {
    from { background-position: -200% center; }
    to   { background-position: 200% center; }
  }

  /* ── Page header ──────────────────────────────────────── */
  .rem-page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
  }
  .rem-page-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rem-page-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.4px;
    line-height: 1;
  }
  .rem-page-subtitle {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-top: 6px;
    line-height: 1.4;
  }
  .rem-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
    white-space: nowrap;
    outline: none;
  }
  .rem-add-btn:hover {
    background: var(--color-surface-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .rem-add-btn:active  { transform: translateY(0); }

  /* ── Summary strip ──────────────────────────────────────── */
  #summary-strip {
    display: flex;
    align-items: stretch;
    padding: 18px 28px;
    margin-bottom: 20px;
    overflow: hidden;
    transition: opacity 0.25s, transform 0.25s;
  }
  #summary-strip.hidden { display: none; }
  .rem-summary {
    display: flex;
    align-items: stretch;
  }
  .rem-summary-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
  }
  .rem-summary-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    opacity: 0.7;
  }
  .rem-summary-value-row {
    display: flex;
    align-items: baseline;
    gap: 3px;
  }
  .rem-summary-currency {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  .rem-summary-amount {
    font-size: 22px;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.8px;
    font-variant-numeric: tabular-nums;
  }
  .rem-decimal {
    font-size: 0.72em;
    font-weight: 600;
    opacity: 0.6;
    margin-left: 0.5px;
  }
  .rem-summary-amount--income, .rem-summary-amount--paid {
    color: #8FDBA2 !important;
  }
  .rem-summary-amount--danger {
    color: #FF8080 !important;
  }
  .rem-summary-divider {
    width: 1px;
    background: var(--color-border);
    margin: 0 20px;
    flex-shrink: 0;
  }

  /* ── Toolbar ──────────────────────────────────────────── */
  .rem-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .rem-toolbar.hidden { display: none; }

  .rem-header-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .rem-search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    width: 240px;
    flex-shrink: 0;
  }
  .rem-search-icon {
    position: absolute;
    left: 11px;
    color: var(--color-text-secondary);
    pointer-events: none;
    opacity: 0.6;
  }
  .rem-search-input {
    width: 100%;
    padding: 8px 34px 8px 32px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .rem-search-input:focus {
    border-color: rgba(217,119,87,0.45);
    box-shadow: 0 0 0 3px rgba(217,119,87,0.08);
  }

  .rem-search-clear {
    position: absolute;
    right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px; height: 20px;
    border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.06);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    padding: 0;
  }
  .rem-search-clear.hidden { opacity: 0; pointer-events: none; }

  .rem-sort-group {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 3px;
  }
  .rem-sort-indicator {
    position: absolute;
    top: 3px;
    left: 3px;
    height: calc(100% - 6px);
    border-radius: 7px;
    background: rgba(217, 119, 87, 0.14);
    pointer-events: none;
    z-index: 0;
    will-change: transform, width;
  }
  .rem-sort-btn {
    position: relative;
    z-index: 1;
    padding: 5px 12px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.2s;
    white-space: nowrap;
    outline: none;
  }
  .rem-sort-btn.active  { color: #d97757; }

  /* ── Category groups ──────────────────────────────────── */
  .rem-category-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 28px;
  }
  .rem-category-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
    margin-left: 2px;
  }
  .rem-category-title {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    opacity: 0.55;
  }
  .rem-category-line {
    height: 1px;
    flex: 1;
    background: var(--color-border);
    opacity: 0.25;
  }
  .rem-category-count {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-secondary);
    opacity: 0.4;
  }

  /* ── Card ──────────────────────────────────────────────── */
  .rem-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rem-card {
    width: 100%;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 14px;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    position: relative;
    overflow: hidden;
    cursor: default;
  }
  .rem-menu-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.2s;
    flex-shrink: 0;
    margin-left: auto;
  }
  .rem-menu-btn:hover { opacity: 1; background: rgba(255,255,255,0.05); }
  .rem-menu-btn.active { opacity: 1; color: #D97757; }


  .rem-card-main {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .rem-placeholder {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .rem-logo-initial {
    font-size: 17px;
    font-weight: 800;
    color: var(--color-text);
    opacity: 0.5;
  }

  .rem-card-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    gap: 3px;
  }
  .rem-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .rem-type-badge {
    font-size: 8px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.8;
  }
  .rem-type-income {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
  .rem-type-expense {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }


  .rem-card-metrics {
    display: flex;
    align-items: center;
    gap: 28px;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .rem-metric-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .rem-meta-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    opacity: 0.5;
  }
  .rem-meta-value {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }
  .rem-value-wrap {
    display: flex;
    align-items: baseline;
    gap: 2px;
  }
  .rem-currency {
    font-size: 11px;
    color: var(--color-text-secondary);
  }
  .rem-value {
    font-size: 16px;
    font-weight: 800;
    color: var(--color-text);
  }

  .rem-card-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    position: relative;
    z-index: 1;
  }

  .btn-action-rem {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px; height: 30px;
    border-radius: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s;
    padding: 0;
    outline: none;
    opacity: 0.7;
    color: var(--color-text-secondary);
  }
  .btn-action-rem:hover    { opacity: 1; }
  .btn-action-rem:focus-visible { outline: 2px solid var(--color-text-secondary); outline-offset: 2px; }
  html[data-theme="light"] .rem-card-actions lottie-player {
    filter: brightness(0);
  }

  .btn-pay-rem { color: #10b981; opacity: 1; }
  .btn-pay-rem:hover { opacity: 1; }
  .btn-pay-rem:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }

  .btn-unpay-rem { color: #ef4444; opacity: 1; }
  .btn-unpay-rem:hover { opacity: 1; }
  .btn-unpay-rem:focus-visible { outline: 2px solid #ef4444; outline-offset: 2px; }

  /* ── Due date badge ─────────────────────────────────── */
  .rem-card-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .rem-card-wrapper--has-badge {
    gap: 0;
  }
  .rem-due-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    align-self: flex-start;
    padding: 4px 10px 4px 8px;
    border-radius: 8px 8px 0 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-left: 16px;
    position: relative;
    z-index: 2;
  }
  .rem-due-badge--warning {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-bottom: none;
  }
  .rem-due-badge--danger {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-bottom: none;
    animation: pulse-danger 2s ease-in-out infinite;
  }
  @keyframes pulse-danger {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.75; }
  }
  .rem-due-badge svg {
    flex-shrink: 0;
  }
  .rem-due-badge span {
    white-space: nowrap;
  }

  /* Card danger/warning border accents */
  .rem-card--danger {
    border-color: rgba(239, 68, 68, 0.3) !important;
  }
  .rem-card--danger::before {
    background: radial-gradient(circle at center,
      rgba(239, 68, 68, 0.15) 0%,
      transparent 70%) !important;
    opacity: 0.8 !important;
  }
  .rem-card--warning {
    border-color: rgba(245, 158, 11, 0.25) !important;
  }
  .rem-card--warning::before {
    background: radial-gradient(circle at center,
      rgba(245, 158, 11, 0.12) 0%,
      transparent 70%) !important;
    opacity: 0.7 !important;
  }

  /* ── Skeleton ────────────────────────────────────────── */
  @keyframes shimmer-wave {
    0% { background-position: -1000px center; }
    100% { background-position: 1000px center; }
  }

  .rem-card-skeleton {
    position: relative;
    background: var(--color-surface);
    border-color: rgba(255,255,255,0.05);
    cursor: default !important;
    pointer-events: none;
  }
  .rem-card-skeleton:hover {
    border-color: var(--color-border);
    background: var(--color-surface);
    transform: none !important;
    box-shadow: none !important;
  }

  .skel {
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.06) 25%,
      rgba(255,255,255,0.12) 50%,
      rgba(255,255,255,0.06) 75%,
      rgba(255,255,255,0.04) 100%
    );
    background-size: 1000px 100%;
    animation: shimmer-wave 2s ease-in-out infinite;
  }
  .skel-avatar {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    flex-shrink: 0;
  }
  .skel-name {
    height: 13px;
    border-radius: 5px;
  }
  .skel-badge {
    height: 16px;
    width: 46px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .skel-meta-value {
    height: 12px;
    width: 54px;
    border-radius: 5px;
  }
  .skel-label {
    height: 10px;
    width: 48px;
    border-radius: 4px;
  }
  .skel-value {
    height: 16px;
    width: 72px;
    border-radius: 6px;
  }
  .skel-value-wide {
    width: 92px;
  }
  .skel-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .skel-action-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }

  /* ── Skeleton – summary strip ───────────────────────── */
  .rem-skel-summary {
    display: flex;
    align-items: stretch;
    padding: 18px 28px;
    margin-bottom: 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
  }
  .rem-skel-summary-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .rem-skel-summary-divider {
    width: 1px;
    background: var(--color-border);
    margin: 0 28px;
    flex-shrink: 0;
  }
  .skel-summary-value {
    height: 22px;
    width: 96px;
    border-radius: 6px;
  }

  /* ── Skeleton – toolbar ─────────────────────────────── */
  .rem-skel-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 20px;
  }
  .skel-search {
    width: 240px;
    height: 36px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .skel-month-selector {
    width: 180px;
    height: 36px;
    border-radius: 12px;
  }

  /* ── Skeleton – category header ────────────────────── */
  .skel-cat-title {
    height: 10px;
    width: 64px;
    border-radius: 4px;
  }
  .skel-cat-count {
    height: 10px;
    width: 14px;
    border-radius: 4px;
  }

  /* ── Month selector ──────────────────────────────────── */
  .rem-month-selector {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: fit-content;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 3px;
    transition: all 0.2s ease;
  }
  .rem-month-selector:hover {
    border-color: rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
  }
  .rem-month-selector.hidden { display: none; }

  .rem-month-nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px; height: 30px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.15s;
    outline: none;
    opacity: 0.6;
    padding: 0;
  }
  .rem-month-nav:hover { background: rgba(255,255,255,0.05); color: var(--color-text); opacity: 1; transform: scale(1.04); }
  .rem-month-nav:active { transform: scale(0.93); }
  .rem-month-nav:focus-visible { background: rgba(255,255,255,0.08); }

  .rem-month-label-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 4px;
    min-width: 110px;
    justify-content: center;
  }

  /* ── Month label — pill-morph ready ─────────────────── */
  .rem-month-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.3px;
    white-space: nowrap;
    display: inline-block;
    will-change: transform, filter, opacity;
    transform-origin: center center;
  }

  .rem-month-today-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    background: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    outline: none;
    will-change: transform, opacity;
    transform-origin: center center;
    padding: 0;
  }
  .rem-month-today-btn:hover { background: rgba(255, 255, 255, 0.05); transform: scale(1.1); }
  .rem-month-today-btn lottie-player { opacity: 0.8; transition: opacity 0.2s; }
  .rem-month-today-btn:hover lottie-player { opacity: 1; }
  .rem-month-today-btn.hidden { display: none; }
  .rem-month-today-btn:focus-visible { outline: 2px solid #d97757; outline-offset: 2px; }

  /* ── Card pago ────────────────────────────────────────── */
  .rem-card--paid {
    border-color: #10b981;
    border-width: 1.5px;
  }




  .rem-paid-lottie {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }


  @media (max-width: 640px) {
    .rem-page-header { flex-direction: column; gap: 14px; }
    .rem-summary { flex-direction: row; gap: 16px; height: auto !important; padding: 12px 16px !important; align-items: center; justify-content: space-between; }
    #summary-strip .dynamic-island__content { flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; }
    .rem-summary-divider { width: 1px; height: 16px; margin: 0; opacity: 0.1; }
    .rem-summary-item { align-items: center; text-align: center; flex: 1; }
    .rem-summary-amount { font-size: 15px; }
    .rem-summary-label { font-size: 9px; }
    .rem-decimal { font-size: 10px; }
    .rem-summary-currency { font-size: 10px; }

    .rem-toolbar { flex-direction: column; align-items: stretch; gap: 10px; padding: 0; margin-bottom: 24px; height: auto !important; }
    .rem-header-controls { width: 100%; display: flex; flex-direction: row; align-items: center; gap: 8px; }
    .rem-header-controls > div, 
    #rem-status-selector, 
    #rem-month-selector { flex: 1 !important; width: auto !important; margin: 0 !important; height: 32px !important; }
    
    .rem-search-input { height: 34px; font-size: 13px; }
    .rem-search-icon { left: 10px; }
    .month-selector-label { font-size: 11px; }
    .rem-month-selector { height: 32px !important; }
    .month-nav-btn { width: 26px; height: 26px; }
    #rem-status-label { font-size: 11px; }
    .dynamic-island__content { padding: 0 4px !important; }

    .rem-card { flex-direction: column; align-items: stretch; gap: 14px; padding: 16px 18px; }

    .rem-card-main { width: 100%; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; }
    .rem-card-info { flex: 1; }
    .rem-card-metrics { width: 100%; justify-content: space-between; gap: 10px; }
    .rem-metric-item:first-child { align-items: flex-start; }
    .rem-metric-item:last-child { align-items: flex-end; }
    .rem-card-actions { display: none !important; }
    .rem-menu-btn { display: flex; }
    .btn-action-rem { width: 34px; height: 34px; }

    .rem-search-wrap { width: 100%; }
    .rem-skel-summary { flex-direction: column; gap: 14px; }
    .rem-skel-summary-divider { width: 100%; height: 1px; margin: 0; }
    .rem-skel-toolbar { flex-direction: column; align-items: stretch; }
    .skel-search { width: 100%; }
    .skel-month-selector { width: 100%; }
    .rem-due-badge { margin-left: 12px; }
  }
`;

// ─── Render page ──────────────────────────────────────────────────────────────

export async function renderReminders(user: any) {
  // Clean up previous listeners when re-rendering the page
  cleanupListeners();

  const app = document.querySelector<HTMLDivElement>('#app')!;

  sessionStorage.setItem('currentPage', 'reminders');
  sessionStorage.removeItem('currentTab');

  currentSearch = '';
  currentSort = 'date';
  currentStatusFilter = 'all';
  currentTypeFilter = 'all';

  app.innerHTML = `
    <div class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}
      <style>${STYLES}</style>
      <main class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="w-full px-2 md:px-0">${RemindersContent()}</div>
      </main>
    </div>`;

  const mainContent = app.querySelector('main > div');
  if (mainContent) {
    gsap.fromTo(mainContent,
      { opacity: 0, y: 20, scale: 0.98, filter: 'blur(10px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power4.out' }
    );
  }


  attachHeaderListeners();
  initEmptyStateLotties();
  attachToolbarListeners(user.uid);

  document.getElementById('btn-add-reminder')?.addEventListener('click', () => {
    openReminderModal({
      userId: user.uid,
      userCategories,
      onSaved: () => { }
    });
  });

  await fetchUserCategories(user.uid);
  loadReminders(user.uid);

  attachMonthSelectorListeners({
    id: 'rem-month-selector',
    initialDate: new Date(Number(currentMonth.split('-')[0]), Number(currentMonth.split('-')[1]) - 1, 1),
    onMonthChange: (_date, monthKey) => {
      currentMonth = monthKey;
      renderReminderList(user.uid);
      refreshSummary();
    }
  });

  attachStatusSelectorListeners(user.uid);
  attachTypeSelectorListeners(user.uid);
}

function attachStatusSelectorListeners(userId: string) {
  const statusOrder: ('all' | 'pending' | 'paid')[] = ['all', 'pending', 'paid'];
  const statusLabels: Record<string, string> = {
    all: 'Todos',
    pending: 'Em aberto',
    paid: 'Realizados'
  };

  const container = document.getElementById('rem-status-selector');
  const label = document.getElementById('rem-status-label');
  const prevBtn = document.getElementById('rem-status-prev');
  const nextBtn = document.getElementById('rem-status-next');

  if (!container || !label || !prevBtn || !nextBtn) return;

  const updateStatus = (direction: 'next' | 'prev') => {
    const currentIndex = statusOrder.indexOf(currentStatusFilter);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % statusOrder.length;
    } else {
      nextIndex = (currentIndex - 1 + statusOrder.length) % statusOrder.length;
    }

    const nextStatus = statusOrder[nextIndex];

    animateDynamicIslandTransition({
      containerId: 'rem-status-selector',
      contentWrapperId: 'rem-status-content-wrapper',
      direction: direction === 'next' ? 'next' : 'prev',
      onMidpoint: () => {
        currentStatusFilter = nextStatus;
        label.textContent = statusLabels[currentStatusFilter];
        renderReminderList(userId);
        refreshSummary();
      }
    });
  };

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateStatus('prev');
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateStatus('next');
  });

  // Entrance animation
  container.classList.remove('dynamic-island--hidden');
  animateDynamicIslandEntrance('rem-status-selector', 'rem-status-content-wrapper');
}

function attachTypeSelectorListeners(userId: string) {
  const typeOrder: ('all' | 'income' | 'expense')[] = ['all', 'income', 'expense'];
  const typeLabels: Record<string, string> = {
    all: 'Tipo: Todos',
    income: 'Receitas',
    expense: 'Despesas'
  };

  const container = document.getElementById('rem-type-selector');
  const label = document.getElementById('rem-type-label');
  const prevBtn = document.getElementById('rem-type-prev');
  const nextBtn = document.getElementById('rem-type-next');

  if (!container || !label || !prevBtn || !nextBtn) return;

  const updateType = (direction: 'next' | 'prev') => {
    const currentIndex = typeOrder.indexOf(currentTypeFilter);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % typeOrder.length;
    } else {
      nextIndex = (currentIndex - 1 + typeOrder.length) % typeOrder.length;
    }

    const nextType = typeOrder[nextIndex];

    animateDynamicIslandTransition({
      containerId: 'rem-type-selector',
      contentWrapperId: 'rem-type-content-wrapper',
      direction: direction === 'next' ? 'next' : 'prev',
      onMidpoint: () => {
        currentTypeFilter = nextType;
        label.textContent = typeLabels[currentTypeFilter];
        renderReminderList(userId);
        refreshSummary();
      }
    });
  };

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateType('prev');
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateType('next');
  });

  // Entrance animation
  container.classList.remove('dynamic-island--hidden');
  animateDynamicIslandEntrance('rem-type-selector', 'rem-type-content-wrapper');
}

function attachToolbarListeners(userId: string) {
  const searchInput = document.getElementById('rem-search') as HTMLInputElement | null;
  const clearBtn = document.getElementById('rem-search-clear');

  searchInput?.addEventListener('input', () => {
    currentSearch = searchInput.value.trim();
    clearBtn?.classList.toggle('hidden', currentSearch === '');
    renderReminderList(userId);
  });

  clearBtn?.addEventListener('click', () => {
    if (searchInput) { searchInput.value = ''; currentSearch = ''; }
    clearBtn.classList.add('hidden');
    renderReminderList(userId);
  });
}


async function fetchUserCategories(userId: string) {
  try {
    const mappings = await CategoryService.ensureCategoryMappings(userId);
    userCategories = mappings.map(m => ({
      id: m.id,
      name: m.displayName,
      originalKey: m.originalKey,
      group: m.group,
      isDefault: m.isDefault,
    }));
  } catch (err) { console.error(err); }
}

function loadReminders(userId: string) {
  // Clean up any existing listeners before setting up new ones
  cleanupListeners();

  const remQuery = query(collection(db, `users/${userId}/reminders`), orderBy('createdAt', 'desc'));
  const billsRef = collection(db, `users/${userId}/reminder_billings`);

  let remindersLoaded = false;
  let billingsLoaded = false;

  const refreshAll = () => {
    if (!remindersLoaded || !billingsLoaded) return;
    renderReminderList(userId);
    refreshSummary();

    const has = reminders.length > 0;
    const summaryStrip = document.getElementById('summary-strip');
    if (summaryStrip) {
      summaryStrip.classList.toggle('hidden', !has);
      if (!has) {
        summaryStrip.style.display = 'none';
      } else {
        summaryStrip.style.display = 'flex';
        setTimeout(() => animateDynamicIslandEntrance('summary-strip'), 50);
      }
    }
    document.getElementById('rem-toolbar')?.classList.toggle('hidden', !has);
    document.getElementById('rem-month-selector')?.classList.toggle('hidden', !has);
    document.getElementById('rem-status-selector')?.classList.toggle('hidden', !has);
    document.getElementById('rem-type-selector')?.classList.toggle('hidden', !has);
  };

  // Real-time listener for reminders
  unsubReminders = onSnapshot(remQuery, (snap) => {
    reminders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    remindersLoaded = true;
    refreshAll();
  }, (err) => {
    console.error('Reminders listener error:', err);
    toaster.create({ title: 'Erro', description: 'Erro ao carregar lembretes.', type: 'error' });
  });

  // Real-time listener for billings
  unsubBillings = onSnapshot(billsRef, (snap) => {
    billingsByReminderId = new Map();
    snap.forEach(d => {
      const b = { id: d.id, ...d.data() } as any;
      const arr = billingsByReminderId.get(b.reminderId) || [];
      arr.push(b);
      billingsByReminderId.set(b.reminderId, arr);
    });
    billingsLoaded = true;
    refreshAll();
  }, (err) => {
    console.error('Billings listener error:', err);
  });
}

function renderReminderList(userId: string) {
  const container = document.getElementById('reminders-list-container');
  if (!container) return;

  if (reminders.length === 0) {
    container.innerHTML = EmptyState({
      title: 'Nenhum lembrete',
      description: 'Crie lembretes para não esquecer de pagamentos ou tarefas importantes.',
      icon: '',
    });
    initEmptyStateLotties();
    return;
  }

  let filtered = reminders.filter(r => {
    // Mobile-created reminders have 'dueDate' field (YYYY-MM-DD)
    if (r.dueDate) {
      const dueMonthKey = r.dueDate.substring(0, 7);
      if (r.frequency === 'yearly') {
        return r.dueDate.substring(5, 7) === currentMonth.substring(5, 7);
      }
      if (r.frequency === 'once') {
        if (dueMonthKey === currentMonth) return true;
        const isDocPaid = r.status === 'paid' || r.paid === true || (Array.isArray(r.paidMonths) && r.paidMonths.includes(dueMonthKey));
        return dueMonthKey < currentMonth && !isDocPaid;
      }
      // Monthly or default: show from due month onwards
      return currentMonth >= dueMonthKey;
    }
    // Web-created reminders: billing-based logic
    const billings = billingsByReminderId.get(r.id) || [];
    if (billings.length === 0) return true;
    if (billings.some((b: any) => b.month === currentMonth)) return true;
    const created = r.createdAt?.toDate ? toMonthKey(r.createdAt.toDate()) : toMonthKey(new Date());
    return currentMonth >= created || r.frequency === 'once';
  });

  const search = currentSearch.toLowerCase();
  if (search) {
    filtered = filtered.filter(r => (r.name || r.title || r.description)?.toLowerCase().includes(search) || getCategoryInfo(r).label.toLowerCase().includes(search));
  }

  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(r => {
      const b = (billingsByReminderId.get(r.id) || []).find((x: any) => x.month === currentMonth);
      const isPaid = b?.status === 'paid' || r.status === 'paid' || r.paid === true ||
        (Array.isArray(r.paidMonths) && r.paidMonths.includes(currentMonth));
      return currentStatusFilter === 'paid' ? isPaid : !isPaid;
    });
  }

  if (currentTypeFilter !== 'all') {
    filtered = filtered.filter(r => r.type === currentTypeFilter);
  }

  if (currentSort === 'name') filtered.sort((a, b) => (a.name || a.title || a.description || '').localeCompare(b.name || b.title || b.description || ''));
  else if (currentSort === 'value') filtered.sort((a, b) => (b.value ?? b.amount ?? 0) - (a.value ?? a.amount ?? 0));

  const groups = new Map<string, any[]>();
  filtered.forEach(r => {
    const { label } = getCategoryInfo(r);
    const arr = groups.get(label) || [];
    arr.push(r);
    groups.set(label, arr);
  });

  container.innerHTML = Array.from(groups.entries()).map(([cat, items]) => `
    <div class="rem-category-group">
      <div class="rem-category-header">
        <span class="rem-category-title">${cat}</span>
        <span class="rem-category-line"></span>
        <span class="rem-category-count">${items.length}</span>
      </div>
      <div class="rem-grid">
        ${items.map(r => {
    const billing = (billingsByReminderId.get(r.id) || []).find((b: any) => b.month === currentMonth);
    const isPaid = billing?.status === 'paid' || r.status === 'paid' || r.paid === true ||
      (Array.isArray(r.paidMonths) && r.paidMonths.includes(currentMonth));
    const rName = r.name || r.title || r.description || '';
    const initial = (rName || '?').charAt(0).toUpperCase();
    const dueStatus = getDueDateStatus(r, isPaid);
    const hasDueBadge = dueStatus !== null;

    const cardId = r.id;
    const dropdownId = `rem-dropdown-${cardId}`;
    const dropdownItems: DropdownItem[] = [
      {
        id: `drop-pay-${cardId}`,
        label: isPaid ? 'Marcar como aberto' : 'Marcar como pago',
        icon: isPaid 
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      },
      {
        id: `drop-edit-${cardId}`,
        label: 'Editar',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
      },
      {
        id: `drop-delete-${cardId}`,
        label: 'Excluir',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
        variant: 'danger'
      }
    ];

    return `
            <div class="rem-card-wrapper${hasDueBadge ? ' rem-card-wrapper--has-badge' : ''}" id="rem-card-${r.id}">
            ${dueBadgeHtml(dueStatus)}
            <div class="rem-card ${isPaid ? 'rem-card--paid' : ''}${dueStatus?.type === 'danger' || dueStatus?.type === 'overdue' ? ' rem-card--danger' : ''}${dueStatus?.type === 'warning' ? ' rem-card--warning' : ''}" data-id="${r.id}">
              <div class="rem-card-main">
                <div class="rem-placeholder">
                  <span class="rem-logo-initial">${initial}</span>
                </div>
                <div class="rem-card-info">
                  <span class="rem-name">
                    ${escapeHtml(rName || 'Sem nome')}
                    ${isPaid ? `
                      <lottie-player class="rem-paid-lottie"
                                     src="/assets/lottie/check.json"
                                     background="transparent" speed="1.4" autoplay></lottie-player>
                    ` : ''}
                    <span class="rem-type-badge ${r.type === 'income' ? 'rem-type-income' : 'rem-type-expense'}">
                      ${r.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </span>
                </div>

                <button id="rem-menu-trigger-${cardId}" class="rem-menu-btn" aria-label="Menu de ações">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="19" r="1.2"/>
                  </svg>
                </button>
                ${GenericDropdown({ id: dropdownId, items: dropdownItems })}

              </div>
              <div class="rem-card-metrics">
                <div class="rem-metric-item">
                  <p class="rem-meta-label">Freq</p>
                  <p class="rem-meta-value">${FREQ_LABELS[r.frequency] || r.frequency}</p>
                </div>
                <div class="rem-metric-item">
                  <p class="rem-meta-label">Valor</p>
                  <div class="rem-value-wrap">
                    <span class="rem-currency" style="color: ${r.type === 'income' ? '#8FDBA2' : '#FF8080'}">R$</span>
                    <span class="rem-value" style="color: ${r.type === 'income' ? '#8FDBA2' : '#FF8080'}">
                      ${r.type === 'income' ? '+' : '-'}${fmtSplit(Number(r.value ?? r.amount ?? 0) || 0)}
                    </span>
                  </div>
                </div>

              </div>
              <div class="rem-card-actions">
                <button class="btn-action-rem ${isPaid ? 'btn-unpay-rem' : 'btn-pay-rem'}" data-id="${r.id}" data-action="${isPaid ? 'unpay' : 'pay'}" title="${isPaid ? 'Desmarcar' : 'Pagar'}">
                  <lottie-player src="/assets/lottie/${isPaid ? 'check.json' : 'check.json'}" background="transparent" speed="1.5" style="width:18px;height:18px;" ${isPaid ? 'autoplay' : ''}></lottie-player>
                </button>
                <button class="btn-action-rem btn-edit-rem" data-id="${r.id}" data-action="edit" title="Editar">
                  <lottie-player src="/assets/lottie/info.json" background="transparent" speed="1" style="width:18px;height:18px;"></lottie-player>
                </button>
                <button class="btn-action-rem btn-delete-rem" data-id="${r.id}" data-action="delete" title="Excluir">
                  <lottie-player src="/assets/lottie/lixeira.json" background="transparent" speed="1" style="width:18px;height:18px;"></lottie-player>
                </button>
              </div>
            </div>
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `).join('');

  attachCardListeners(userId);

  // Animate cards entrance
  const allCards = document.querySelectorAll<HTMLElement>('.rem-card-wrapper');
  gsap.fromTo(
    allCards,
    { opacity: 0, filter: 'blur(10px)', y: 10 },
    {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
      stagger: { each: 0.055, ease: 'none' },
    }
  );
}

function attachCardListeners(userId: string) {
  document.querySelectorAll('.rem-card').forEach(card => {
    const id = (card as HTMLElement).dataset.id!;
    const r = reminders.find(x => x.id === id);
    if (!r) return;

    // 1. Dropdown
    attachGenericDropdownListeners(`rem-menu-trigger-${id}`, `rem-dropdown-${id}`);

    // Helpers for common actions
    const handleTogglePaid = async () => {
      try {
        const billing = (billingsByReminderId.get(id) || []).find((b: any) => b.month === currentMonth);
        const isPaid = billing?.status === 'paid' || r.status === 'paid' || r.paid === true ||
          (Array.isArray(r.paidMonths) && r.paidMonths.includes(currentMonth));

        const billingId = `${id}_${currentMonth}`;
        if (!isPaid) {
          const updateData: any = {
            paidMonths: arrayUnion(currentMonth),
            updatedAt: Timestamp.now()
          };
          if (!r.frequency || r.frequency === 'once') {
            updateData.paid = true;
            updateData.status = 'paid';
          }

          await Promise.all([
            setDoc(doc(db, `users/${userId}/reminder_billings/${billingId}`), {
              reminderId: id,
              month: currentMonth,
              status: 'paid',
              value: Number(r.value ?? r.amount ?? 0) || 0,
              paidAt: Timestamp.now()
            }),
            updateDoc(doc(db, `users/${userId}/reminders/${id}`), updateData)
          ]);
          toaster.create({ title: 'Pago', type: 'success' });
        } else {
          await Promise.all([
            deleteDoc(doc(db, `users/${userId}/reminder_billings/${billingId}`)),
            updateDoc(doc(db, `users/${userId}/reminders/${id}`), {
              paidMonths: arrayRemove(currentMonth),
              paid: false,
              status: 'pending',
              updatedAt: Timestamp.now()
            })
          ]);
          toaster.create({ title: 'Pagamento removido', type: 'success' });
        }
      } catch (err) {
        console.error('Error toggling paid status', err);
        toaster.create({ title: 'Erro', description: 'Ocorreu um erro ao atualizar.', type: 'error' });
      }
    };

    const handleEdit = () => {
      openReminderModal({
        userId,
        editingReminder: r,
        userCategories,
        onSaved: () => { }
      });
    };

    const handleDelete = () => {
      DeleteConfirmationModal({
        title: 'Excluir lembrete?',
        description: 'Esta ação não pode ser desfeita.',
        onConfirm: async () => {
          await deleteDoc(doc(db, `users/${userId}/reminders/${id}`));
          toaster.create({ title: 'Excluído', type: 'success' });
        }
      });
    };

    // 2. Dropdown Item Listeners
    document.getElementById(`drop-pay-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleTogglePaid(); });
    document.getElementById(`drop-edit-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleEdit(); });
    document.getElementById(`drop-delete-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleDelete(); });

    // 3. Desktop/Inline Actions
    card.querySelectorAll('.btn-action-rem').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        if (action === 'pay' || action === 'unpay') handleTogglePaid();
        else if (action === 'edit') handleEdit();
        else if (action === 'delete') handleDelete();
      });
    });
  });
}

function refreshSummary() {
  const summary = document.getElementById('summary-strip');
  if (!summary) return;

  const monthItems = reminders.filter(r => {
    if (r.dueDate) {
      const dueMonthKey = r.dueDate.substring(0, 7);
      if (r.frequency === 'yearly') return r.dueDate.substring(5, 7) === currentMonth.substring(5, 7);
      if (r.frequency === 'once') {
        if (dueMonthKey === currentMonth) return true;
        const isDocPaid = r.status === 'paid' || r.paid === true || (Array.isArray(r.paidMonths) && r.paidMonths.includes(dueMonthKey));
        return dueMonthKey < currentMonth && !isDocPaid;
      }
      return currentMonth >= dueMonthKey;
    }
    const billings = billingsByReminderId.get(r.id) || [];
    if (billings.some((b: any) => b.month === currentMonth)) return true;
    const created = r.createdAt?.toDate ? toMonthKey(r.createdAt.toDate()) : toMonthKey(new Date());
    return currentMonth >= created || r.frequency === 'once';
  });

  let toReceive = 0;
  let toPay = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  const filteredItems = currentTypeFilter === 'all' ? monthItems : monthItems.filter(r => r.type === currentTypeFilter);

  filteredItems.forEach(r => {
    const val = Number(r.value ?? r.amount ?? 0) || 0;
    const isIncome = r.type === 'income';

    const b = (billingsByReminderId.get(r.id) || []).find((x: any) => x.month === currentMonth);
    const isReminderPaid = b?.status === 'paid' || r.status === 'paid' || r.paid === true ||
      (Array.isArray(r.paidMonths) && r.paidMonths.includes(currentMonth));

    if (isIncome) {
      totalIncome += val;
      if (!isReminderPaid) toReceive += val;
    } else {
      totalExpense += val;
      if (!isReminderPaid) toPay += val;
    }
  });

  const hasItems = reminders.length > 0;
  summary.classList.toggle('hidden', !hasItems);

  const toReceiveEl = document.getElementById('card-to-receive');
  const toPayEl = document.getElementById('card-to-pay');
  const totalMonthEl = document.getElementById('card-total-month');

  if (toReceiveEl) toReceiveEl.innerHTML = fmtSplit(toReceive);
  if (toPayEl) toPayEl.innerHTML = fmtSplit(toPay);
  if (totalMonthEl) {
    // Show consolidated total of filtered items
    const totalConsolidated = totalExpense > 0 ? totalExpense : totalIncome;
    // If both exist and type filter is ALL, show the net or just expense?
    // Let's mirror what the user probably wants: the absolute total of expenses if filtering by expenses, or income if income.
    // If filtering by ALL, let's show Expenses minus Income? Or just one?
    // User screenshot suggests they want the Total of the current view.
    let displayTotal = 0;
    if (currentTypeFilter === 'expense') displayTotal = totalExpense;
    else if (currentTypeFilter === 'income') displayTotal = totalIncome;
    else displayTotal = totalExpense; // Default to expenses in summary if both exist

    totalMonthEl.innerHTML = fmtSplit(displayTotal);
  }
}


