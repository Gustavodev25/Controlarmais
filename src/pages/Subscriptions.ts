import gsap from 'gsap';
import { getLogoUrl, getLogoDomain } from '../lib/logoService';
import { Header, attachHeaderListeners } from '../components/Header';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { EmptyState, initEmptyStateLotties } from '../components/EmptyState';
import { toaster } from '../components/Toast';

import { Select, attachSelectListeners } from '../components/Select';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { openSubscriptionModal } from '../components/SubscriptionModal';
import { DynamicIsland, animateDynamicIslandEntrance, animateDynamicIslandTransition } from '../components/DynamicIsland';
import { db } from '../lib/firebase';
import { themeManager } from '../components/ThemeManager';
import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  setDoc,
  addDoc,
  doc,
  Timestamp,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  onSnapshot
} from 'firebase/firestore';
import { GenericDropdown, attachGenericDropdownListeners, type DropdownItem } from '../components/GenericDropdown';
import type { Unsubscribe } from 'firebase/firestore';
import { CategoryService } from '../services/categoryService';
import { 
  MonthSelector, 
  attachMonthSelectorListeners, 
  MonthSelectorStyles,
  toMonthKey,
  shiftMonth 
} from '../components/MonthSelector';

// Sources gerados automaticamente — aguardam confirmação do usuário
const AUTO_SOURCES = new Set(['pluggy-auto']);
const isAutoDetected = (s: any): boolean => AUTO_SOURCES.has(s?.source);

let subscriptions: any[] = [];
let userCategories: any[] = [];
let billingsBySubId: Map<string, any> = new Map();
let currentSearch = '';
let currentSort: 'name' | 'value' | 'date' = 'date';
let currentStatusFilter: 'all' | 'pending' | 'paid' = 'all';
let currentMonth = toMonthKey(new Date());   // 'YYYY-MM'

// ─── Real-time listener cleanup ───────────────────────────────────────────────
let unsubSubs: Unsubscribe | null = null;
let unsubBillings: Unsubscribe | null = null;

// ─── Month helpers ─────────────────────────────────────────────────────────────

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${PT_MONTHS[m - 1]} ${y}`;
}

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
  subscriptions: 'Assinaturas', subscription: 'Assinatura',
};

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  weekly: 'Semanal',
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
  'Seguro': '#f97316',
  'Outros': '#6b7280',
  'Assinaturas': '#d97757',
  'Assinatura': '#d97757',
};

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSplit = (n: number) => {
  const [reais, centavos] = fmt(n).split(',');
  return `${reais}<span class="subs-decimal">,${centavos}</span>`;
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');



// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryInfo(s: any): { label: string; color: string } {
  const rawCat = (s.category || '').toLowerCase().trim();
  let catLabel: string | null = null;

  const foundUserCat = userCategories.find(c =>
    c.id === s.category ||
    c.name.toLowerCase() === rawCat ||
    (c.originalKey && c.originalKey.toLowerCase() === rawCat)
  );
  if (foundUserCat) catLabel = foundUserCat.name;
  if (!catLabel) catLabel = CATEGORY_LABELS[rawCat] ?? null;
  if (!catLabel) {
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      if (rawCat.includes(key) || key.includes(rawCat)) { catLabel = label; break; }
    }
  }
  if (!catLabel) catLabel = String(s.category || 'Outros');

  const color = CATEGORY_COLORS[catLabel] ?? '#6b7280';
  return { label: catLabel, color };
}



// ─── Debug modal ──────────────────────────────────────────────────────────────



// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCards(): string {
  const nameWidths = [65, 78, 55, 72];

  // Summary strip skeleton
  const summarySkel = `
    <div class="subs-skel-summary" aria-busy="true">
      <div class="subs-skel-summary-item">
        <span class="skel skel-label" style="width:72px;"></span>
        <span class="skel skel-summary-value"></span>
      </div>
      <div class="subs-skel-summary-divider"></div>
      <div class="subs-skel-summary-item">
        <span class="skel skel-label" style="width:60px;"></span>
        <span class="skel skel-summary-value"></span>
      </div>
      <div class="subs-skel-summary-divider"></div>
      <div class="subs-skel-summary-item">
        <span class="skel skel-label" style="width:44px;"></span>
        <span class="skel skel-summary-value"></span>
      </div>
    </div>`;

  // Toolbar skeleton
  const toolbarSkel = `
    <div class="subs-skel-toolbar" aria-busy="true">
      <div class="skel skel-search"></div>
      <div class="skel skel-month-selector"></div>
    </div>`;

  // Category header skeleton
  const catHeaderSkel = `
    <div class="subs-category-header" style="margin-bottom:4px;">
      <span class="skel skel-cat-title"></span>
      <span class="subs-category-line"></span>
      <span class="skel skel-cat-count"></span>
    </div>`;

  // Card skeletons
  const cardsSkel = Array.from({ length: 4 }).map((_, i) => `
    <div class="subs-card subs-card-skeleton" style="animation-delay:${i * 80}ms" aria-busy="true">
      <div class="subs-card-main">
        <div class="skel skel-avatar"></div>
        <div class="subs-card-info">
          <span class="subs-name">
            <span class="skel skel-name" style="width:${nameWidths[i]}%;"></span>
          </span>
        </div>
      </div>
      <div class="subs-card-metrics">
        <div class="subs-metric-item">
          <span class="skel skel-label"></span>
          <span class="skel skel-meta-value"></span>
        </div>
        <div class="subs-metric-item">
          <span class="skel skel-label"></span>
          <span class="skel skel-value skel-value-wide"></span>
        </div>
      </div>
      <div class="subs-card-actions">
        <div class="skel skel-action-btn"></div>
        <div class="skel skel-action-btn"></div>
        <div class="skel skel-action-btn"></div>
      </div>
    </div>`).join('');

  return `
    ${summarySkel}
    ${toolbarSkel}
    <div class="subs-category-group">
      ${catHeaderSkel}
      <div class="subs-grid">${cardsSkel}</div>
    </div>`;
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function SummaryStrip(): string {
  const summaryContent = `
    <div class="subs-summary-item">
      <span class="subs-summary-label subs-summary-label-dynamic">Total deste mês</span>
      <div class="subs-summary-value-row">
        <span class="subs-summary-currency">R$</span>
        <strong id="card-total-month" class="subs-summary-amount">0<span class="subs-decimal">,00</span></strong>
      </div>
    </div>
    <div class="subs-summary-divider"></div>
    <div class="subs-summary-item">
      <span class="subs-summary-label">Pago no mês</span>
      <div class="subs-summary-value-row">
        <span class="subs-summary-currency">R$</span>
        <strong id="card-paid-amount" class="subs-summary-amount subs-summary-amount--paid">0<span class="subs-decimal">,00</span></strong>
      </div>
    </div>
    <div class="subs-summary-divider"></div>
    <div class="subs-summary-item">
      <span class="subs-summary-label">A pagar</span>
      <div class="subs-summary-value-row">
        <span class="subs-summary-currency">R$</span>
        <strong id="card-to-pay" class="subs-summary-amount subs-summary-amount--danger">0<span class="subs-decimal">,00</span></strong>
      </div>
    </div>`;

  return DynamicIsland({
    id: 'summary-strip',
    content: summaryContent,
    className: 'subs-summary hidden',
    style: 'display: none;',
    hidden: true
  });
}

// ─── Status Selector ──────────────────────────────────────────────────────────

function StatusSelector(): string {
  const statusLabels: Record<string, string> = {
    all: 'Todos',
    pending: 'Em aberto',
    paid: 'Pagos'
  };

  const innerContent = `
    <button id="subs-status-prev" class="month-nav-btn relative z-10" type="button" aria-label="Filtro anterior">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <span id="subs-status-label" class="month-selector-label" style="min-width: 85px; text-align: center;">${statusLabels[currentStatusFilter]}</span>
    <button id="subs-status-next" class="month-nav-btn relative z-10" type="button" aria-label="Próximo filtro">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  `;

  return DynamicIsland({
    id: 'subs-status-selector',
    content: innerContent,
    contentWrapperId: 'subs-status-content-wrapper',
    className: 'month-selector-container',
    hidden: true,
    style: 'padding: 2px 2px; gap: 0px;',
  });
}

// ─── Toolbar (search + sort) ──────────────────────────────────────────────────

function Toolbar(): string {
  return `
    <div id="subs-toolbar" class="subs-toolbar hidden">
      <div class="subs-search-wrap">
        <svg class="subs-search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="subs-search"
          class="subs-search-input"
          type="search"
          placeholder="Buscar assinatura…"
          aria-label="Buscar assinatura"
          autocomplete="off"
        />
        <button id="subs-search-clear" class="subs-search-clear hidden" aria-label="Limpar busca" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="subs-header-controls">
        <div class="flex flex-row items-center gap-2 w-full">
          ${StatusSelector()}
          ${MonthSelector({ id: 'subs-month-selector' })}
        </div>
      </div>
    </div>`;
}


// ─── Page shell ───────────────────────────────────────────────────────────────

function SubscriptionsContent(): string {
  return `
    <div class="w-full">
      <div class="subs-page-header">
        <div>
          <h2 class="subs-page-title">Assinaturas</h2>
          <p class="subs-page-subtitle">Controle total dos seus compromissos financeiros recorrentes.</p>
        </div>
        <div class="subs-page-actions">

          <button id="btn-add-subscription" class="subs-add-btn" type="button" aria-label="Nova assinatura">
            Nova assinatura
          </button>
        </div>
      </div>

      ${SummaryStrip()}
      ${Toolbar()}

      <div id="subscriptions-list-container" aria-live="polite" aria-label="Lista de assinaturas">
        <div class="subs-skeleton-grid">
          ${SkeletonCards()}
        </div>
      </div>
    </div>`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes fadein {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes card-in {
    from { opacity: 0; transform: translateY(10px) scale(0.99); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ── Logo loading ─────────────────────────────────────── */
  .subs-logo {
    width: 76%; height: 76%;
    object-fit: contain;
    display: block;
    animation: logoFadeIn 0.3s ease forwards;
    opacity: 0;
  }
  @keyframes logoFadeIn {
    from { opacity: 0; transform: scale(0.88); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* ── Page header ──────────────────────────────────────── */
  .subs-page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
  }
  .subs-page-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .subs-page-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.4px;
    line-height: 1;
  }
  .subs-page-subtitle {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-top: 6px;
    line-height: 1.4;
  }
  .subs-add-btn {
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
  .subs-add-btn:hover {
    background: var(--color-surface-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .subs-add-btn:active  { transform: translateY(0); }
  .subs-add-btn:focus-visible { outline: 2px solid var(--color-text-secondary); outline-offset: 2px; }



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
  .subs-summary {
    display: flex;
    align-items: stretch;
  }
  .subs-summary-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
  }
  .subs-summary-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    opacity: 0.7;
  }
  .subs-summary-value-row {
    display: flex;
    align-items: baseline;
    gap: 3px;
  }
  .subs-summary-currency {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  .subs-summary-amount {
    font-size: 22px;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.8px;
    font-variant-numeric: tabular-nums;
  }
  .subs-decimal {
    font-size: 0.72em;
    font-weight: 600;
    opacity: 0.6;
    margin-left: 0.5px;
    font-variant-numeric: tabular-nums;
  }
  .subs-summary-count {
    font-size: 26px;
    letter-spacing: -1px;
  }
  .subs-summary-amount--paid {
    color: #8FDBA2 !important;
  }
  .subs-summary-amount--danger {
    color: #FF8080 !important;
  }
  .subs-summary-divider {
    width: 1px;
    background: var(--color-border);
    margin: 0 28px;
    flex-shrink: 0;
  }

  /* ── Toolbar ──────────────────────────────────────────── */
  .subs-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .subs-toolbar.hidden { display: none; }

  .subs-header-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .subs-search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    width: 240px;
    flex-shrink: 0;
  }
  .subs-search-icon {
    position: absolute;
    left: 11px;
    color: var(--color-text-secondary);
    pointer-events: none;
    opacity: 0.6;
  }
  .subs-search-input {
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
  .subs-search-input::placeholder { color: var(--color-text-secondary); opacity: 0.5; }
  .subs-search-input:focus {
    border-color: rgba(217,119,87,0.45);
    box-shadow: 0 0 0 3px rgba(217,119,87,0.08);
  }
  .subs-search-input::-webkit-search-cancel-button { display: none; }

  .subs-search-clear {
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
  .subs-search-clear:hover { background: rgba(255,255,255,0.1); }
  .subs-search-clear.hidden { opacity: 0; pointer-events: none; }

  .subs-sort-group {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 3px;
  }
  .subs-sort-indicator {
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
  .subs-sort-btn {
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
  .subs-sort-btn:hover   { color: var(--color-text); }
  .subs-sort-btn.active  { color: #d97757; }
  .subs-sort-btn:focus-visible { outline: 2px solid #d97757; outline-offset: 1px; }

  /* ── Results count ──────────────────────────────────────── */
  #subs-result-count {
    font-size: 11px;
    color: var(--color-text-secondary);
    opacity: 0.6;
    margin-bottom: 16px;
    display: none;
  }
  #subs-result-count.visible { display: block; }

  /* ── Category groups ──────────────────────────────────── */
  .subs-category-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 28px;
  }
  .subs-category-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
    margin-left: 2px;
  }
  .subs-category-title {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    opacity: 0.55;
  }
  .subs-category-line {
    height: 1px;
    flex: 1;
    background: var(--color-border);
    opacity: 0.25;
  }
  .subs-category-count {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-secondary);
    opacity: 0.4;
    letter-spacing: 0.02em;
  }

  /* ── Card ──────────────────────────────────────────────── */
  .subs-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .subs-card {
    width: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    transition: border-color 0.25s ease, background 0.25s ease, transform 0.2s ease, box-shadow 0.25s ease;
    position: relative;
    overflow: hidden;
    cursor: default;
  }
  .subs-card-skeleton {
    cursor: default;
    pointer-events: none;
  }

  .subs-card::before {
    content: '';
    position: absolute;
    top: 50%;
    right: -20px;
    transform: translateY(-50%);
    width: 130px; height: 130px;
    background: radial-gradient(circle at center,
      rgba(217, 119, 87, 0.15) 0%,
      rgba(230, 110, 55, 0.08) 40%,
      transparent 70%);
    filter: blur(25px);
    pointer-events: none;
    z-index: 0;
    opacity: 0.5;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  .subs-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 14px;
    background: linear-gradient(135deg,
      rgba(255,255,255,0.045) 0%,
      transparent 50%,
      rgba(255,255,255,0.02) 100%);
    pointer-events: none;
    z-index: 0;
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .subs-card:hover {
    border-color: rgba(255,255,255,0.13);
    background: rgba(255,255,255,0.018);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  }
  .subs-card:hover::before { opacity: 1; transform: translateY(-50%) scale(1.2); }

  /* ── Card internals ──────────────────────────────────── */
  .subs-card-main {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .subs-placeholder {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
    border: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    transition: transform 0.2s ease;
    padding: 0;
  }
  .subs-card:hover .subs-placeholder { transform: scale(1.06); }

  .subs-logo {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 12px;
    animation: logoFadeIn 0.3s ease forwards;
    opacity: 0;
  }
  @keyframes logoFadeIn {
    from { opacity: 0; transform: scale(0.88); }
    to   { opacity: 1; transform: scale(1); }
  }

  .subs-logo-initial {
    font-size: 17px;
    font-weight: 800;
    color: var(--color-text);
    opacity: 0.5;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    line-height: 1;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .subs-card-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    gap: 3px;
  }
  .subs-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .subs-paid-lottie {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .subs-summary-amount--danger {
    color: #ef4444 !important;
  }

  /* ── Metrics ──────────────────────────────────────────── */
  .subs-card-metrics {
    display: flex;
    align-items: center;
    gap: 28px;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .subs-metric-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .subs-meta-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    opacity: 0.5;
  }
  .subs-meta-value {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }
  .subs-value-wrap {
    display: flex;
    align-items: baseline;
    gap: 2px;
  }
  .subs-currency {
    font-size: 11px;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  .subs-value {
    font-size: 16px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
    color: #FF8080;
    line-height: 1;
  }

  /* ── Action buttons ──────────────────────────────────── */
  .subs-card-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    position: relative;
    z-index: 1;
  }

  .btn-action-sub {
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
  }
  .btn-action-sub:hover    { opacity: 1; }
  .btn-action-sub:focus-visible { outline: 2px solid var(--color-text-secondary); outline-offset: 2px; }
  html[data-theme="light"] .subs-card-actions lottie-player {
    filter: brightness(0);
  }

  /* ── Skeleton ────────────────────────────────────────── */
  @keyframes shimmer-wave {
    0% { background-position: -1000px center; }
    100% { background-position: 1000px center; }
  }

  .subs-skeleton-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .subs-card-skeleton {
    position: relative;
    background: var(--color-surface);
    border-color: rgba(255,255,255,0.05);
    cursor: default !important;
    pointer-events: none;
  }
  .subs-card-skeleton:hover {
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
  .subs-skel-summary {
    display: flex;
    align-items: stretch;
    padding: 18px 28px;
    margin-bottom: 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
  }
  .subs-skel-summary-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .subs-skel-summary-divider {
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
  .subs-skel-toolbar {
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

  /* ── No results ──────────────────────────────────────── */
  .subs-no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 0;
    gap: 10px;
  }
  .subs-no-results-icon {
    width: 36px; height: 36px;
    opacity: 0.2;
  }
  .subs-no-results-text {
    font-size: 13px;
    color: var(--color-text-secondary);
    opacity: 0.6;
  }

  /* ── Loading ─────────────────────────────────────────── */
  .subs-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 60px 0;
  }
  .subs-spinner {
    width: 22px; height: 22px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-text-secondary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ── Card pendente (detecção automática) ────────────── */
  .subs-card--pending {
    /* sem estilo extra — igual a qualquer outro card */
  }

  .subs-pending-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 3px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    opacity: 0.45;
    white-space: nowrap;
  }
  .subs-pending-badge svg {
    flex-shrink: 0;
    opacity: 0.7;
  }

  /* ── Botões confirmar / rejeitar ─────────────────────── */
  .subs-pending-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .btn-confirm-sub,
  .btn-reject-sub {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px; height: 30px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: transparent;
    cursor: pointer;
    transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                background 0.15s, border-color 0.15s, opacity 0.15s;
    outline: none;
    opacity: 0.5;
    padding: 0;
  }
  .btn-confirm-sub { color: var(--color-text-secondary); }
  .btn-reject-sub  { color: var(--color-text-secondary); }

  .btn-confirm-sub:hover {
    opacity: 1;
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.35);
    background: rgba(16, 185, 129, 0.08);
    transform: scale(1.12);
  }
  .btn-reject-sub:hover {
    opacity: 1;
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.07);
    transform: scale(1.12);
  }
  .btn-confirm-sub:active,
  .btn-reject-sub:active  { transform: scale(0.93); }
  .btn-confirm-sub:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
  .btn-reject-sub:focus-visible  { outline: 2px solid #ef4444; outline-offset: 2px; }

  .btn-confirm-sub[disabled],
  .btn-reject-sub[disabled] {
    opacity: 0.25;
    cursor: wait;
    transform: none;
    pointer-events: none;
  }

  /* ── Month selector ──────────────────────────────────── */
  .subs-month-selector {
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
  .subs-month-selector:hover {
    border-color: rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
  }
  .subs-month-selector.hidden { display: none; }

  .subs-month-nav {
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
  .subs-month-nav:hover { background: rgba(255,255,255,0.05); color: var(--color-text); opacity: 1; transform: scale(1.04); }
  .subs-month-nav:active { transform: scale(0.93); }
  .subs-month-nav:focus-visible { background: rgba(255,255,255,0.08); }

  .subs-month-label-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 4px;
    min-width: 110px;
    justify-content: center;
  }

  /* ── Month label — pill-morph ready ─────────────────── */
  .subs-month-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.3px;
    white-space: nowrap;
    display: inline-block;
    will-change: transform, filter, opacity;
    transform-origin: center center;
  }

  .subs-month-today-btn {
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
  .subs-month-today-btn:hover { background: rgba(255, 255, 255, 0.05); transform: scale(1.1); }
  .subs-month-today-btn lottie-player { opacity: 0.8; transition: opacity 0.2s; }
  .subs-month-today-btn:hover lottie-player { opacity: 1; }
  .subs-month-today-btn.hidden { display: none; }
  .subs-month-today-btn:focus-visible { outline: 2px solid #d97757; outline-offset: 2px; }

  /* ── Card pago ────────────────────────────────────────── */
  .subs-card--paid {
    opacity: 1;
    border-color: rgba(16, 185, 129, 0.25);
  }
  .subs-card--paid:hover {
    opacity: 0.9;
    border-color: rgba(16, 185, 129, 0.4);
  }

  .subs-card--paid::before {
    background: radial-gradient(circle at center,
      rgba(16, 185, 129, 0.25) 0%,
      rgba(16, 185, 129, 0.12) 45%,
      transparent 70%) !important;
    left: -40px !important;
    right: auto !important;
    filter: blur(30px) !important;
    opacity: 1 !important;
    transform: translateY(-50%) scale(1.4) !important;
    width: 150px !important;
    height: 150px !important;
  }

  /* ── Botão pagar ──────────────────────────────────────── */
  .btn-pay-sub {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px; height: 30px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s;
    outline: none;
    opacity: 0.7;
    padding: 0;
  }
  .btn-pay-sub:hover {
    opacity: 1;
    color: #10b981;
  }
  .btn-pay-sub:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
  .btn-pay-sub[disabled],
  .btn-unpay-sub[disabled] {
    opacity: 0.25;
    cursor: wait;
    pointer-events: none;
  }

  .btn-unpay-sub {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px; height: 30px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s;
    outline: none;
    opacity: 0.7;
    padding: 0;
  }
  .btn-unpay-sub:hover {
    opacity: 1;
    color: #ef4444;
  }

  .subs-menu-btn {
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
  .subs-menu-btn:hover { opacity: 1; background: rgba(255,255,255,0.05); }
  .subs-menu-btn.active { opacity: 1; color: #D97757; }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 640px) {
    .subs-page-header { flex-direction: column; gap: 14px; }
    .subs-page-actions { width: 100%; flex-wrap: wrap; }
    .subs-summary { flex-direction: row; gap: 10px; height: auto !important; padding: 12px 14px !important; align-items: center; justify-content: space-between; }
    #summary-strip .dynamic-island__content { flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; }
    .subs-summary-divider { width: 1px; height: 16px; margin: 0; opacity: 0.1; }
    .subs-summary-item { align-items: center; text-align: center; flex: 1; }
    .subs-summary-amount { font-size: 13px; }
    .subs-summary-label { font-size: 8px; white-space: nowrap; }
    .subs-decimal { font-size: 9px; }
    .subs-summary-currency { font-size: 9px; }

    .subs-toolbar { flex-direction: column; align-items: stretch; gap: 10px; padding: 0; margin-bottom: 24px; height: auto !important; }
    .subs-header-controls { width: 100%; display: flex; flex-direction: row; align-items: center; gap: 8px; }
    .subs-header-controls > div, 
    #subs-status-selector, 
    #subs-month-selector { flex: 1 !important; width: auto !important; margin: 0 !important; height: 32px !important; }
    
    .subs-search-input { height: 34px; font-size: 13px; }
    .subs-search-icon { left: 10px; }
    .month-selector-label { font-size: 11px; }
    #subs-status-label { font-size: 11px; }
    #subs-month-selector { height: 32px !important; }
    .month-nav-btn { width: 26px; height: 26px; }
    .dynamic-island__content { padding: 0 4px !important; }

    .subs-card { flex-direction: column; align-items: stretch; gap: 14px; padding: 16px 18px; }
    .subs-card-main { width: 100%; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; }
    .subs-card-info { flex: 1; }
    .subs-card-metrics { width: 100%; justify-content: space-between; gap: 10px; }
    .subs-metric-item:first-child { align-items: flex-start; }
    .subs-metric-item:last-child { align-items: flex-end; }
    .subs-card-actions { display: none !important; }
    .subs-menu-btn { display: flex; }

    .subs-search-wrap { width: 100%; max-width: none; }
    .subs-skel-summary { flex-direction: column; gap: 14px; }
    .subs-skel-summary-divider { width: 100%; height: 1px; margin: 0; }
    .subs-skel-toolbar { flex-direction: column; align-items: stretch; }
    .skel-search { width: 100%; }
    .skel-month-selector { width: 100%; }
  }

  ${MonthSelectorStyles}
`;

// ─── Render page ──────────────────────────────────────────────────────────────

export async function renderSubscriptions(user: any) {
  const app = document.querySelector<HTMLDivElement>('#app')!;

  sessionStorage.setItem('currentPage', 'subscriptions');
  sessionStorage.removeItem('currentTab');

  currentSearch = '';
  currentSort = 'date';
  currentStatusFilter = 'all';

  app.innerHTML = `
    <div class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}
      <style>${STYLES}</style>
      <main class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="w-full px-2 md:px-0">${SubscriptionsContent()}</div>
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
  attachMonthSelectorListeners({
    id: 'subs-month-selector',
    initialDate: new Date(Number(currentMonth.split('-')[0]), Number(currentMonth.split('-')[1]) - 1, 1),
    onMonthChange: (_date, monthKey) => {
      currentMonth = monthKey;
      renderSubscriptionList(user.uid);
      refreshSummaryCards();
    }
  });

  document.getElementById('btn-add-subscription')?.addEventListener('click', () => {
    openAddSubscriptionModal(user.uid);
  });

  attachStatusSelectorListeners(user.uid);

  await fetchUserCategories(user.uid);
  await loadSubscriptions(user.uid);
}
function attachStatusSelectorListeners(userId: string) {
  const statusOrder: ('all' | 'pending' | 'paid')[] = ['all', 'pending', 'paid'];
  const statusLabels: Record<string, string> = {
    all: 'Todos',
    pending: 'Em aberto',
    paid: 'Pagos'
  };

  const container = document.getElementById('subs-status-selector');
  const label = document.getElementById('subs-status-label');
  const prevBtn = document.getElementById('subs-status-prev');
  const nextBtn = document.getElementById('subs-status-next');

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
      containerId: 'subs-status-selector',
      contentWrapperId: 'subs-status-content-wrapper',
      direction: direction === 'next' ? 'next' : 'prev',
      onMidpoint: () => {
        currentStatusFilter = nextStatus;
        label.textContent = statusLabels[currentStatusFilter];
        renderSubscriptionList(userId);
        refreshSummaryCards();
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
  animateDynamicIslandEntrance('subs-status-selector', 'subs-status-content-wrapper');
}

// ─── Toolbar wiring ───────────────────────────────────────────────────────────

function attachToolbarListeners(userId: string) {
  const searchInput = document.getElementById('subs-search') as HTMLInputElement | null;
  const clearBtn = document.getElementById('subs-search-clear');

  searchInput?.addEventListener('input', () => {
    currentSearch = searchInput.value.trim();
    clearBtn?.classList.toggle('hidden', currentSearch === '');
    renderSubscriptionList(userId);
  });

  clearBtn?.addEventListener('click', () => {
    if (searchInput) { searchInput.value = ''; currentSearch = ''; }
    clearBtn.classList.add('hidden');
    searchInput?.focus();
    renderSubscriptionList(userId);
  });

}


// ─── Data ─────────────────────────────────────────────────────────────────────

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
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
  }
}

async function loadSubscriptions(userId: string) {
  try {
    // Load subscriptions + all billings in parallel
    const [subsSnap, billingsSnap] = await Promise.all([
      getDocs(query(collection(db, `users/${userId}/subscriptions`), orderBy('createdAt', 'desc'))),
      getDocs(collection(db, `users/${userId}/billings`)),
    ]);

    subscriptions = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Index billings by subscriptionId → Map<subId, billing[]>
    billingsBySubId = new Map();
    for (const d of billingsSnap.docs) {
      const b = { id: d.id, ...d.data() } as any;
      const arr = billingsBySubId.get(b.subscriptionId) ?? [];
      arr.push(b);
      billingsBySubId.set(b.subscriptionId, arr);
    }

    renderSubscriptionList(userId);
    refreshSummaryCards();

    const toolbar = document.getElementById('subs-toolbar');
    const monthSel = document.getElementById('subs-month-selector');
    const summary = document.getElementById('summary-strip');

    const hasItems = subscriptions.length > 0;
    if (toolbar) toolbar.classList.toggle('hidden', !hasItems);
    if (monthSel) monthSel.classList.toggle('hidden', !hasItems);
    if (summary) summary.classList.toggle('hidden', !hasItems);



    // Keep month label current
    const label = document.getElementById('subs-month-label');
    if (label) label.textContent = monthLabel(currentMonth);
  } catch (err) {
    console.error('Erro ao carregar assinaturas:', err);
    toaster.create({ title: 'Erro', description: 'Não foi possível carregar suas assinaturas.', type: 'error' });
  }
}

// ─── List render ──────────────────────────────────────────────────────────────

function renderSubscriptionList(userId: string) {
  const container = document.getElementById('subscriptions-list-container');
  if (!container) return;

  if (subscriptions.length === 0) {
    container.innerHTML = EmptyState({
      title: 'Nenhuma assinatura ainda',
      description: 'Cadastre seus gastos fixos mensais para ter um perfil financeiro mais preciso.',
      icon: '',
    });
    initEmptyStateLotties();
    return;
  }

  // ── Filter: subscriptions visible in currentMonth ──────────────────────────
  const todayKey = toMonthKey(new Date());

  let byMonth = subscriptions.filter(s => {
    const billings = billingsBySubId.get(s.id) ?? [];
    if (billings.length === 0) return true;
    if (billings.some((b: any) => b.month === currentMonth)) return true;
    const createdMonth = s.createdAt?.toDate
      ? toMonthKey(s.createdAt.toDate())
      : (s.createdAt ? toMonthKey(new Date(s.createdAt)) : todayKey);
    return currentMonth >= createdMonth;
  });

  const searchQuery = currentSearch.toLowerCase();
  let filtered = searchQuery
    ? byMonth.filter(s =>
      s.name?.toLowerCase().includes(searchQuery) ||
      getCategoryInfo(s).label.toLowerCase().includes(searchQuery)
    )
    : [...byMonth];

  if (currentSort === 'name') {
    filtered.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'));
  } else if (currentSort === 'value') {
    filtered.sort((a, b) => Number(b.value ?? b.amount ?? 0) - Number(a.value ?? a.amount ?? 0));
  }

  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(s => {
      const b = (billingsBySubId.get(s.id) ?? []).find((x: any) => x.month === currentMonth);
      const isPaid = b?.status === 'paid' || s.status === 'paid' ||
        (Array.isArray(s.paidMonths) && s.paidMonths.includes(currentMonth));
      return currentStatusFilter === 'paid' ? isPaid : !isPaid;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="subs-no-results" role="status">
        <svg class="subs-no-results-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="1.5"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span class="subs-no-results-text">Nenhuma assinatura encontrada para "<em>${escapeHtml(currentSearch)}</em>"</span>
      </div>`;
    return;
  }

  // Agrupamento por categoria
  const groups = new Map<string, { color: string; items: any[] }>();
  filtered.forEach(s => {
    const { label, color } = getCategoryInfo(s);
    if (!groups.has(label)) groups.set(label, { color, items: [] });
    groups.get(label)!.items.push(s);
  });

  const sortedCategories = [...groups.keys()].sort();

  container.innerHTML = `
    <p id="subs-result-count" class="${currentSearch ? 'visible' : ''}">
      ${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}
    </p>
    ${sortedCategories.map(cat => {
    const group = groups.get(cat)!;
    return `
        <div class="subs-category-group">
          <div class="subs-category-header">
            <span class="subs-category-title">${escapeHtml(cat)}</span>
            <span class="subs-category-line"></span>
            <span class="subs-category-count">${group.items.length}</span>
          </div>
          <div class="subs-grid">
            ${group.items.map(s => {
      const freqLabel = FREQ_LABELS[s.frequency] ?? s.frequency ?? '';

      const logoUrl = getLogoUrl(s);
      const logoDomain = logoUrl ? (getLogoDomain(s) ?? '') : '';
      const initial = escapeHtml(s.name.charAt(0).toUpperCase());

      const logoHtml = logoUrl
        ? `<img
                     src="${escapeHtml(logoUrl)}"
                     class="subs-logo"
                     alt="${escapeHtml(s.name)} logo"
                     loading="lazy"
                     decoding="async"
                     data-logo-domain="${escapeHtml(logoDomain)}"
                     onerror="window.__onLogoError('${escapeHtml(logoDomain)}', this)"
                   />
                   <span class="subs-logo-initial" style="display:none;">${initial}</span>`
        : `<span class="subs-logo-initial">${initial}</span>`;

      const billing = (billingsBySubId.get(s.id) ?? []).find((b: any) => b.month === currentMonth);
      const isPaid = billing?.status === 'paid' || s.status === 'paid' ||
        (Array.isArray(s.paidMonths) && s.paidMonths.includes(currentMonth));
      const pending = isAutoDetected(s);

      const metricsHtml = pending ? '' : `
                <div class="subs-card-metrics">
                  <div class="subs-metric-item">
                    <p class="subs-meta-label">Frequência</p>
                    <p class="subs-meta-value">${escapeHtml(freqLabel)}</p>
                  </div>
                  <div class="subs-metric-item">
                    <p class="subs-meta-label">Valor</p>
                    <div class="subs-value-wrap">
                      <span class="subs-currency">R$</span>
                      <span class="subs-value">${fmtSplit(Number(s.value ?? s.amount ?? 0))}</span>
                    </div>
                  </div>
                </div>`;

      const theme = themeManager.getCurrentTheme();
      const unpayLottie = theme === 'light' ? 'desmarcarpreto.json' : 'desmarcarbranco.json';

      const dropdownId = `subs-dropdown-${s.id}`;
      const dropdownItems: DropdownItem[] = pending 
        ? [
            { id: `drop-confirm-${s.id}`, label: 'Confirmar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' },
            { id: `drop-reject-${s.id}`, label: 'Rejeitar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', variant: 'danger' }
          ]
        : [
            { 
              id: isPaid ? `drop-unpay-${s.id}` : `drop-pay-${s.id}`, 
              label: isPaid ? 'Marcar aberto' : 'Marcar pago', 
              icon: isPaid 
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            },
            { id: `drop-edit-${s.id}`, label: 'Editar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' },
            { id: `drop-delete-${s.id}`, label: 'Excluir', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>', variant: 'danger' }
          ];

      const actionsHtml = pending
        ? `<div class="subs-pending-actions">
                    <button class="btn-confirm-sub" data-id="${s.id}"
                            title="Confirmar assinatura" aria-label="Confirmar ${escapeHtml(s.name)}">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                           fill="none" stroke="currentColor" stroke-width="2.5"
                           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                    <button class="btn-reject-sub" data-id="${s.id}"
                            title="Rejeitar assinatura" aria-label="Rejeitar ${escapeHtml(s.name)}">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                           fill="none" stroke="currentColor" stroke-width="2.5"
                           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>`
        : `<div class="subs-card-actions">
                    ${isPaid ? `
                    <button class="btn-unpay-sub" data-id="${s.id}"
                            title="Desmarcar pagamento de ${monthLabel(currentMonth)}"
                            aria-label="Desmarcar ${escapeHtml(s.name)} como pago">
                      <lottie-player class="action-lottie" 
                                     src="/assets/lottie/${unpayLottie}"
                                     background="transparent" speed="1.2" 
                                     style="width:18px;height:18px;"></lottie-player>
                    </button>` : `
                    <button class="btn-pay-sub" data-id="${s.id}"
                            title="Marcar como pago em ${monthLabel(currentMonth)}"
                            aria-label="Marcar ${escapeHtml(s.name)} como pago">
                      <lottie-player class="action-lottie" 
                                     src="/assets/lottie/check.json"
                                     background="transparent" speed="1.4" 
                                     style="width:18px;height:18px;"></lottie-player>
                    </button>`}
                    <button class="btn-action-sub btn-edit-sub" data-id="${s.id}"
                            title="Editar assinatura" aria-label="Editar ${escapeHtml(s.name)}">
                      <lottie-player class="action-lottie" src="/assets/lottie/info.json"
                                     background="transparent" speed="1"
                                     style="width:18px;height:18px;"></lottie-player>
                    </button>
                    <button class="btn-action-sub btn-delete-sub" data-id="${s.id}"
                            title="Remover assinatura" aria-label="Remover ${escapeHtml(s.name)}">
                      <lottie-player class="action-lottie" src="/assets/lottie/lixeira.json"
                                     background="transparent" speed="1"
                                     style="width:18px;height:18px;"></lottie-player>
                    </button>
                  </div>`;

      return `
                <div class="subs-card${pending ? ' subs-card--pending' : ''}${isPaid ? ' subs-card--paid' : ''}" data-id="${s.id}" id="subs-card-${s.id}" role="listitem">
                  <div class="subs-card-main">
                    <div class="subs-placeholder" aria-hidden="true">
                      ${logoHtml}
                    </div>
                    <div class="subs-card-info">
                      <span class="subs-name">
                        ${escapeHtml(s.name)}
                        ${isPaid ? `
                          <lottie-player class="subs-paid-lottie"
                                         src="/assets/lottie/check.json"
                                         background="transparent" speed="1.4"></lottie-player>
                        ` : ''}
                      </span>
                      ${pending ? `
                        <span class="subs-pending-badge">
                          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24"
                               fill="none" stroke="currentColor" stroke-width="2.5"
                               stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"/><path d="M11 8v3l2 2"/>
                          </svg>
                          Detectada automaticamente
                        </span>` : ''}
                    </div>

                    <button id="subs-menu-trigger-${s.id}" class="subs-menu-btn" aria-label="Menu de ações">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                      </svg>
                    </button>
                    ${GenericDropdown({ id: dropdownId, items: dropdownItems })}

                  </div>

                  ${metricsHtml}
                  ${actionsHtml}
                </div>`;
    }).join('')}
          </div>
        </div>`;
  }).join('')}`;

  // ── Entrance animation ────────────────────────────────────────────────────
  const allCards = container.querySelectorAll<HTMLElement>('.subs-card');
  gsap.fromTo(
    allCards,
    { opacity: 0, filter: 'blur(10px)' },
    {
      opacity: 1,
      filter: 'blur(0px)',
      duration: 0.5,
      ease: 'power2.out',
      stagger: { each: 0.055, ease: 'none' },
    }
  );

  // ── Listeners ─────────────────────────────────────────────────────────────
  container.querySelectorAll('.subs-card').forEach(card => {
    const id = (card as HTMLElement).dataset.id;
    if (!id) return;

    const sub = filtered.find(s => s.id === id);
    if (!sub) return;

    const billing = (billingsBySubId.get(id) ?? []).find((b: any) => b.month === currentMonth);
    const isPaid = billing?.status === 'paid' || sub.status === 'paid' ||
      (Array.isArray(sub.paidMonths) && sub.paidMonths.includes(currentMonth));
    const pending = isAutoDetected(sub);

    // 1. Dropdown
    attachGenericDropdownListeners(`subs-menu-trigger-${id}`, `subs-dropdown-${id}`);

    // Helpers
    const handleTogglePaid = async () => {
      if (isPaid) await markAsPending(id, userId);
      else await markAsPaid(id, userId);
    };

    const handleEdit = () => {
      openSubscriptionModal({
        userId,
        editingSub: sub,
        userCategories,
        onSaved: () => loadSubscriptions(userId)
      });
    };

    const handleDelete = () => {
      DeleteConfirmationModal({
        title: 'Excluir assinatura',
        description: `Deseja realmente excluir a assinatura "${sub.name}"? Esta ação não pode ser desfeita.`,
        onConfirm: async () => {
          await deleteSubscription(id, userId);
        }
      });
    };

    const handleConfirm = () => confirmSubscription(id, userId);

    // 2. Dropdown Item Listeners
    document.getElementById(`drop-pay-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleTogglePaid(); });
    document.getElementById(`drop-unpay-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleTogglePaid(); });
    document.getElementById(`drop-edit-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleEdit(); });
    document.getElementById(`drop-delete-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleDelete(); });
    document.getElementById(`drop-confirm-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleConfirm(); });
    document.getElementById(`drop-reject-${id}`)?.addEventListener('click', e => { e.stopPropagation(); handleDelete(); });

    // 3. Direct Actions (Desktop)
    card.querySelector('.btn-pay-sub')?.addEventListener('click', e => { e.stopPropagation(); handleTogglePaid(); });
    card.querySelector('.btn-unpay-sub')?.addEventListener('click', e => { e.stopPropagation(); handleTogglePaid(); });
    card.querySelector('.btn-edit-sub')?.addEventListener('click', e => { e.stopPropagation(); handleEdit(); });
    card.querySelector('.btn-delete-sub')?.addEventListener('click', e => { e.stopPropagation(); handleDelete(); });
    card.querySelector('.btn-confirm-sub')?.addEventListener('click', e => { e.stopPropagation(); handleConfirm(); });
    card.querySelector('.btn-reject-sub')?.addEventListener('click', e => { e.stopPropagation(); handleDelete(); });
  });

  // Lottie triggers

  // ── Rejeitar assinatura detectada automaticamente ─────────────────────────
  container.querySelectorAll<HTMLButtonElement>('.btn-reject-sub').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id;
      if (!id) return;

      const card = btn.closest<HTMLElement>('.subs-card');
      card?.querySelectorAll<HTMLButtonElement>('.btn-confirm-sub, .btn-reject-sub')
        .forEach(b => { b.disabled = true; });

      if (card) {
        await gsap.to(card, {
          opacity: 0, x: 20, scale: 0.96,
          duration: 0.28, ease: 'power2.in',
        });
      }
      await deleteSubscription(id, userId);
    });
  });
}

// ─── Summary cards ─────────────────────────────────────────────────────────────

function refreshSummaryCards() {
  const strip = document.getElementById('summary-strip');
  const cardTotal = document.getElementById('card-total-month');
  const cardPaid = document.getElementById('card-paid-amount');
  const cardPending = document.getElementById('card-to-pay');
  if (!strip || !cardTotal || !cardPaid || !cardPending) return;

  if (subscriptions.length === 0) {
    strip.classList.add('hidden');
    strip.style.display = 'none';
    return;
  }
  strip.classList.remove('hidden');
  strip.style.display = 'flex';
  setTimeout(() => animateDynamicIslandEntrance('summary-strip'), 50);

  const monthItems = subscriptions.filter(s => {
    const billings = billingsBySubId.get(s.id) ?? [];
    if (billings.length === 0) return true;
    if (billings.some((b: any) => b.month === currentMonth)) return true;
    const createdMonth = s.createdAt?.toDate
      ? toMonthKey(s.createdAt.toDate())
      : (s.createdAt ? toMonthKey(new Date(s.createdAt)) : toMonthKey(new Date()));
    return currentMonth >= createdMonth;
  });

  const activeSubs = monthItems.filter(s => !isAutoDetected(s));

  const filteredItems = currentStatusFilter === 'all' ? activeSubs : activeSubs.filter(s => {
    const b = (billingsBySubId.get(s.id) ?? []).find((x: any) => x.month === currentMonth);
    const isPaid = b?.status === 'paid' || s.status === 'paid' ||
      (Array.isArray(s.paidMonths) && s.paidMonths.includes(currentMonth));
    return currentStatusFilter === 'paid' ? isPaid : !isPaid;
  });

  let paidTotal = 0;
  let pendingTotal = 0;

  for (const s of filteredItems) {
    const billing = (billingsBySubId.get(s.id) ?? []).find((b: any) => b.month === currentMonth);
    const val = Number(s.value ?? s.amount ?? 0);
    const isSubPaid = billing?.status === 'paid' || s.status === 'paid' ||
      (Array.isArray(s.paidMonths) && s.paidMonths.includes(currentMonth));
    if (isSubPaid) {
      paidTotal += val;
    } else {
      if (s.frequency !== 'yearly' || currentMonth === toMonthKey(new Date())) {
        pendingTotal += val;
      }
    }
  }

  const totalAmount = paidTotal + pendingTotal;

  if (cardTotal) cardTotal.innerHTML = fmtSplit(totalAmount);
  if (cardPaid) cardPaid.innerHTML = fmtSplit(paidTotal);
  if (cardPending) cardPending.innerHTML = fmtSplit(Math.max(0, totalAmount - paidTotal));

  const todayKey = toMonthKey(new Date());
  const labelEl = document.querySelector<HTMLElement>('.subs-summary-label-dynamic');
  if (labelEl) {
    labelEl.textContent = currentMonth === todayKey
      ? 'Total deste mês'
      : `Total em ${PT_MONTHS[(Number(currentMonth.split('-')[1]) - 1)]}`;
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function deleteSubscription(id: string, userId: string) {
  try {
    await deleteDoc(doc(db, `users/${userId}/subscriptions`, id));
    toaster.create({ title: 'Removida', description: 'Assinatura excluída com sucesso.', type: 'success' });
    await loadSubscriptions(userId);
  } catch (err) {
    console.error('Erro ao excluir:', err);
    toaster.create({ title: 'Erro', description: 'Não foi possível excluir.', type: 'error' });
  }
}

// ─── Confirm auto-detected subscription ──────────────────────────────────────

async function confirmSubscription(id: string, userId: string) {
  try {
    await updateDoc(doc(db, `users/${userId}/subscriptions`, id), {
      source: 'confirmed',
    });
    toaster.create({
      title: 'Assinatura confirmada',
      description: 'A assinatura foi salva na sua lista.',
      type: 'success',
    });
    await loadSubscriptions(userId);
  } catch (err) {
    console.error('Erro ao confirmar assinatura:', err);
    toaster.create({ title: 'Erro', description: 'Não foi possível confirmar a assinatura.', type: 'error' });
    await loadSubscriptions(userId);
  }
}

// ─── Mark as paid ────────────────────────────────────────────────────────────

async function markAsPaid(subId: string, userId: string) {
  try {
    const sub = subscriptions.find(s => s.id === subId);
    if (!sub) return;

    const billingsCol = collection(db, `users/${userId}/billings`);
    const nextMonth = shiftMonth(currentMonth, 1);

    // ── Mês atual → pago ─────────────────────────────────────────────────────
    const currentBillingId = `${subId}_${currentMonth}`;
    await setDoc(
      doc(billingsCol, currentBillingId),
      {
        subscriptionId: subId,
        month: currentMonth,
        status: 'paid',
        amount: Number(sub.value ?? 0),
        name: sub.name ?? '',
        frequency: sub.frequency ?? 'monthly',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Also update subscription document paidMonths for mobile app compatibility
    await updateDoc(doc(db, `users/${userId}/subscriptions`, subId), {
      paidMonths: arrayUnion(currentMonth),
      updatedAt: new Date().toISOString()
    });

    // ── Mês seguinte → garantir doc pendente ─────────────────────────────────
    if (sub.frequency !== 'yearly') {
      const nextBillingId = `${subId}_${nextMonth}`;
      const existingBillings = billingsBySubId.get(subId) ?? [];
      const alreadyHasNext = existingBillings.some((b: any) => b.month === nextMonth);

      if (!alreadyHasNext) {
        const nextBillingDoc = {
          subscriptionId: subId,
          month: nextMonth,
          status: 'pending',
          amount: Number(sub.value ?? 0),
          name: sub.name ?? '',
          frequency: sub.frequency ?? 'monthly',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(billingsCol, nextBillingId), nextBillingDoc, { merge: false });

        // Update local map as well
        existingBillings.push({ id: nextBillingId, ...nextBillingDoc });
        billingsBySubId.set(subId, existingBillings);
      }
    }

    toaster.create({
      title: 'Pago!',
      description: `${sub.name} marcado como pago em ${monthLabel(currentMonth)}.`,
      type: 'success',
    });

    // ── Local update (no reload) ─────────────────────────────────────────────
    // 1. Update billingsBySubId map in memory
    const billingData = {
      subscriptionId: subId,
      month: currentMonth,
      status: 'paid',
      amount: Number(sub.value ?? 0),
      name: sub.name ?? '',
      frequency: sub.frequency ?? 'monthly',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const currentBillings = billingsBySubId.get(subId) ?? [];
    const existingIndex = currentBillings.findIndex((b: any) => b.month === currentMonth);
    if (existingIndex !== -1) {
      currentBillings[existingIndex] = { ...currentBillings[existingIndex], ...billingData };
    } else {
      currentBillings.push(billingData);
    }
    billingsBySubId.set(subId, currentBillings);

    // 2. Update card DOM directly
    const card = document.querySelector(`.subs-card[data-id="${subId}"]`) as HTMLElement;
    if (card) {
      card.classList.add('subs-card--paid');
      const payBtn = card.querySelector('.btn-pay-sub') as HTMLElement;
      if (payBtn) {
        // Swap Pay for Unpay button
        const newUnpayBtn = document.createElement('button');
        newUnpayBtn.className = 'btn-unpay-sub';
        newUnpayBtn.dataset.id = subId;
        newUnpayBtn.title = `Desmarcar pagamento de ${monthLabel(currentMonth)}`;
        const theme = themeManager.getCurrentTheme();
        const unpayLottie = theme === 'light' ? 'desmarcarpreto.json' : 'desmarcarbranco.json';

        newUnpayBtn.innerHTML = `
          <lottie-player class="action-lottie" 
                         src="/assets/lottie/${unpayLottie}"
                         background="transparent" speed="1.2" 
                         style="width:18px;height:18px;"></lottie-player>
        `;

        payBtn.parentNode?.insertBefore(newUnpayBtn, payBtn);
        gsap.set(newUnpayBtn, { opacity: 0, scale: 0.5 });

        gsap.to(payBtn, { opacity: 0, scale: 0.5, duration: 0.3, onComplete: () => payBtn.remove() });
        gsap.to(newUnpayBtn, { opacity: 0.5, scale: 1, duration: 0.4, delay: 0.2 });

        const lottiePlayer = newUnpayBtn.querySelector('lottie-player');
        if (lottiePlayer) (window as any)._initPeriodicLottie?.(lottiePlayer);

        // Re-attach listener to the new button
        newUnpayBtn.addEventListener('click', async e => {
          e.stopPropagation();
          (newUnpayBtn as HTMLButtonElement).disabled = true;
          gsap.to(card, { opacity: 0.4, scale: 0.98, duration: 0.15 });
          await markAsPending(subId, userId);
        });
      }

      const nameEl = card.querySelector('.subs-name');
      if (nameEl && !nameEl.querySelector('.subs-paid-lottie')) {
        const lottie = document.createElement('lottie-player');
        lottie.className = 'subs-paid-lottie';
        lottie.setAttribute('src', '/assets/lottie/check.json');
        lottie.setAttribute('background', 'transparent');
        lottie.setAttribute('speed', '1.4');

        gsap.set(lottie, { opacity: 0, scale: 0.5 });
        nameEl.appendChild(lottie);
        gsap.to(lottie, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', delay: 0.1 });
        (window as any)._initPeriodicLottie?.(lottie);
      }

      gsap.fromTo(card,
        { scale: 0.98, background: 'rgba(16, 185, 129, 0.1)', opacity: 0.6 },
        { scale: 1, background: '', opacity: 1, duration: 0.6, ease: 'elastic.out(1, 0.7)' }
      );
    }

    // 3. Refresh summary and other UI parts
    refreshSummaryCards();
  } catch (err) {
    console.error('Erro ao marcar como pago:', err);
    toaster.create({ title: 'Erro', description: 'Não foi possível registrar o pagamento.', type: 'error' });
  }
}

async function markAsPending(subId: string, userId: string) {
  try {
    const sub = subscriptions.find(s => s.id === subId);
    if (!sub) return;

    const billingId = `${subId}_${currentMonth}`;
    await updateDoc(doc(db, `users/${userId}/billings`, billingId), {
      status: 'pending',
      updatedAt: new Date().toISOString(),
    });

    // Also update subscription document paidMonths for mobile app compatibility
    await updateDoc(doc(db, `users/${userId}/subscriptions`, subId), {
      paidMonths: arrayRemove(currentMonth),
      updatedAt: new Date().toISOString()
    });

    toaster.create({
      title: 'Status alterado',
      description: `${sub.name} agora está pendente em ${monthLabel(currentMonth)}.`,
      type: 'success',
    });

    // ── Local update (no reload) ─────────────────────────────────────────────
    const currentBillings = billingsBySubId.get(subId) ?? [];
    const bIndex = currentBillings.findIndex((b: any) => b.month === currentMonth);
    if (bIndex !== -1) currentBillings[bIndex].status = 'pending';
    billingsBySubId.set(subId, currentBillings);

    const card = document.querySelector(`.subs-card[data-id="${subId}"]`) as HTMLElement;
    if (card) {
      card.classList.remove('subs-card--paid');
      gsap.to(card, { opacity: 1, scale: 1, background: '', duration: 0.4 });

      // Swap Unpay for Pay button
      const unpayBtn = card.querySelector('.btn-unpay-sub') as HTMLElement;
      if (unpayBtn) {
        const newPayBtn = document.createElement('button');
        newPayBtn.className = 'btn-pay-sub';
        newPayBtn.dataset.id = subId;
        newPayBtn.title = `Marcar como pago em ${monthLabel(currentMonth)}`;
        newPayBtn.innerHTML = `
          <lottie-player class="action-lottie" 
                         src="/assets/lottie/check.json"
                         background="transparent" speed="1.4" 
                         style="width:18px;height:18px;"></lottie-player>
        `;

        unpayBtn.parentNode?.insertBefore(newPayBtn, unpayBtn);
        gsap.set(newPayBtn, { opacity: 0, scale: 0.5 });

        gsap.to(unpayBtn, { opacity: 0, scale: 0.5, duration: 0.3, onComplete: () => unpayBtn.remove() });
        gsap.to(newPayBtn, { opacity: 0.5, scale: 1, duration: 0.4, delay: 0.2 });

        const lottiePlayer = newPayBtn.querySelector('lottie-player');
        if (lottiePlayer) (window as any)._initPeriodicLottie?.(lottiePlayer);

        newPayBtn.addEventListener('click', async e => {
          e.stopPropagation();
          (newPayBtn as HTMLButtonElement).disabled = true;
          gsap.to(card, { opacity: 0.4, scale: 0.98, duration: 0.15 });
          await markAsPaid(subId, userId);
        });
      }

      // Remove check Lottie from name
      const lottie = card.querySelector('.subs-paid-lottie');
      if (lottie) {
        gsap.to(lottie, { scale: 0, opacity: 0, duration: 0.3, onComplete: () => lottie.remove() });
      }
    }

    refreshSummaryCards();
  } catch (err) {
    console.error('Erro ao desmarcar:', err);
    toaster.create({ title: 'Erro', description: 'Erro ao desmarcar pagamento.', type: 'error' });
  }
}

// ─── Debug ────────────────────────────────────────────────────────────────────



// ─── Add modal ────────────────────────────────────────────────────────────────

function openAddSubscriptionModal(userId: string) {
  openSubscriptionModal({
    userId,
    userCategories,
    onSaved: () => loadSubscriptions(userId),
  });
}
