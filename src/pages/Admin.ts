import { BrilhoHeader } from '../components/BrilhoHeader';
import { Header, attachHeaderListeners } from '../components/Header';
import { Modal } from '../components/Modal';
import { toaster } from '../components/Toast';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';
import { auth } from '../lib/firebase';
import { API_BASE } from '../lib/apiConfig';

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberFormatter = new Intl.NumberFormat('pt-BR');

type AdminStats = {
  activeSubscribersCount: number;
  mrr: number;
  avgActiveDaysOfPaying: number;
  totalUsers: number;
  canceledStripeInMrrCount?: number;
  providerErrors?: Array<{ provider: string; status?: number | null; message?: string }>;
  isPartial?: boolean;
  generatedAt: string;
};

type PluggySyncSummary = {
  connectedAccounts: number;
  connectedConnections: number;
  connectedUsers: number;
  errorConnections: number;
  staleConnections: number;
  latestSync: string | null;
  bankCount: number;
  staleAfterHours: number;
};

type PluggySyncRow = {
  uid: string;
  name: string;
  email: string | null;
  itemId: string;
  banks: string[];
  bankDataList?: Array<{ name: string; logo: string | null }>;
  accountCount: number;
  lastSync: string | null;
  status: 'ok' | 'stale' | 'error' | 'updating' | 'no_sync' | string;
  rawStatus: string | null;
  errorMessage: string | null;
  source: string;
};

type AdminConfig = {
  pluggy: {
    allowNewConnections: boolean;
    syncStatusWindowHours: number;
    showSandboxConnectors: boolean;
  };
  automaticRules: {
    detectSubscriptionsFromPluggy: boolean;
    categorizeTransactions: boolean;
    preserveCustomCategories: boolean;
  };
  globalSettings: {
    maintenanceMode: boolean;
    supportEmail: string;
    adminNotice: string;
  };
  updatedAt?: string | null;
  updatedBy?: string | null;
};

type AdminUserItem = {
  uid: string;
  name: string;
  email: string;
  provider: string;
  plan: string;
  status: string;
  isAdmin: boolean;
  disabled?: boolean;
  isBlocked?: boolean;
  blockedAt?: string | null;
  createdAt?: string | null;
  lastLogin?: string | null;
  activeDaysCount?: number;
};

let currentAdminConfig: AdminConfig | null = null;
let currentPluggyRows: PluggySyncRow[] = [];
let currentUsers: AdminUserItem[] = [];

const defaultCategoryGroupCount = DEFAULT_CATEGORIES.length;
const defaultCategoryItemCount = DEFAULT_CATEGORIES.reduce((sum, group) => sum + group.items.length, 0);

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(value: string | null | undefined): string {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data invalida';

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} dia${diffDays === 1 ? '' : 's'}`;
}

function planLabel(plan: string | null | undefined): string {
  const normalized = String(plan || 'free').toLowerCase();
  if (normalized === 'pro') return 'Pro';
  if (normalized === 'trial') return 'Trial';
  return 'Free';
}

function providerLabel(provider: string | null | undefined): string {
  const normalized = String(provider || '').toLowerCase();
  if (normalized === 'stripe') return 'Stripe';
  if (normalized === 'asaas') return 'Asaas';
  if (normalized === 'pluggy') return 'Pluggy';
  return 'Sistema';
}

function boolLabel(value: boolean): string {
  return value ? 'Ativo' : 'Inativo';
}

function providerErrorHint(errors: AdminStats['providerErrors']): string | null {
  if (!errors?.length) return null;
  const names = errors
    .map((error) => providerLabel(error.provider))
    .filter(Boolean)
    .join(', ');
  return `Dados parciais: falha ao consultar ${names || 'provedores'}.`;
}

async function getAdminToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nao autenticado.');
  return user.getIdToken();
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAdminToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Erro desconhecido');
  }
  return res.json();
}

function kpiCard(opts: {
  id: string;
  label: string;
  hint: string;
  icon: string;
}): string {
  return `
    <div id="${opts.id}" class="admin-kpi-card">
      <div class="admin-kpi-head">
        <div class="admin-kpi-icon">${opts.icon}</div>
        <span class="admin-kpi-label">${opts.label}</span>
      </div>
      <div class="admin-kpi-value-row">
        <strong class="admin-kpi-value" data-role="value">
          <span class="admin-kpi-skeleton"></span>
        </strong>
      </div>
      <span class="admin-kpi-hint" data-role="hint">${opts.hint}</span>
    </div>
  `;
}

function sectionSkeleton(label = 'Carregando...'): string {
  return `
    <div class="admin-section-loading">
      <span class="admin-mini-spinner"></span>
      <span>${label}</span>
    </div>
  `;
}

function setKpiValue(id: string, value: string, hint?: string) {
  const root = document.getElementById(id);
  if (!root) return;
  const v = root.querySelector<HTMLElement>('[data-role="value"]');
  if (v) v.textContent = value;
  if (hint) {
    const h = root.querySelector<HTMLElement>('[data-role="hint"]');
    if (h) h.textContent = hint;
  }
}

function setKpiError(id: string) {
  const root = document.getElementById(id);
  if (!root) return;
  const v = root.querySelector<HTMLElement>('[data-role="value"]');
  if (v) v.textContent = '-';
  const h = root.querySelector<HTMLElement>('[data-role="hint"]');
  if (h) h.textContent = 'Erro ao carregar';
}

function renderStatusPill(status: string): string {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: 'OK', cls: 'admin-pill-ok' },
    stale: { label: 'Atrasada', cls: 'admin-pill-warn' },
    error: { label: 'Erro', cls: 'admin-pill-error' },
    updating: { label: 'Atualizando', cls: 'admin-pill-info' },
    no_sync: { label: 'Sem sync', cls: 'admin-pill-muted' },
  };
  const entry = map[status] || { label: status || 'N/A', cls: 'admin-pill-muted' };
  return `<span class="admin-pill ${entry.cls}">${entry.label}</span>`;
}

function renderAccessPill(userItem: AdminUserItem): string {
  if (userItem.disabled || userItem.isBlocked) {
    return `<span class="admin-pill admin-pill-error">Bloqueado</span>`;
  }
  if (userItem.isAdmin) {
    return `<span class="admin-pill admin-pill-info">Admin</span>`;
  }
  return `<span class="admin-pill admin-pill-ok">Padrao</span>`;
}

function renderPluggyTable(rows: PluggySyncRow[], opts: { limit?: number; className?: string } = {}): string {
  if (rows.length === 0) {
    return `<div class="admin-empty-state">Nenhuma conexao bancaria encontrada.</div>`;
  }

  const visibleRows = typeof opts.limit === 'number' ? rows.slice(0, opts.limit) : rows;
  const hiddenCount = rows.length - visibleRows.length;

  return `
    <div class="admin-table-scroll ${opts.className || ''}">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Bancos</th>
            <th>Contas</th>
            <th>Ultima sync</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${visibleRows.map((row) => `
            <tr>
              <td>
                <div class="admin-user-cell">
                  <strong>${escapeHtml(row.name || row.email || row.uid)}</strong>
                  <span>${escapeHtml(row.email || row.uid)}</span>
                </div>
              </td>
              <td>
                <div class="admin-bank-list" title="${escapeHtml(row.banks.join(', '))}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="opacity-60"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
                  ${escapeHtml(row.banks.slice(0, 2).join(', ') || 'Banco nao identificado')}
                  ${row.banks.length > 2 ? `<span>+${row.banks.length - 2}</span>` : ''}
                </div>
                ${row.errorMessage ? `<div class="admin-row-note">${escapeHtml(row.errorMessage)}</div>` : ''}
              </td>
              <td>${numberFormatter.format(row.accountCount)}</td>
              <td>
                <div class="admin-date-cell">
                  <strong>${escapeHtml(formatRelative(row.lastSync))}</strong>
                  <span>${escapeHtml(formatDateTime(row.lastSync))}</span>
                </div>
              </td>
              <td>${renderStatusPill(row.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ${hiddenCount > 0 ? `<div class="admin-section-footnote admin-table-footnote">Mostrando ${numberFormatter.format(visibleRows.length)} de ${numberFormatter.format(rows.length)} conexoes. Abra o modal para ver todos.</div>` : ''}
  `;
}

function renderPluggySummary(summary: PluggySyncSummary): string {
  return `
    <div class="admin-mini-grid">
      <div class="admin-mini-card">
        <span>Contas conectadas</span>
        <strong>${numberFormatter.format(summary.connectedAccounts)}</strong>
      </div>
      <div class="admin-mini-card">
        <span>Usuarios com banco</span>
        <strong>${numberFormatter.format(summary.connectedUsers)}</strong>
      </div>
      <div class="admin-mini-card">
        <span>Erros</span>
        <strong>${numberFormatter.format(summary.errorConnections)}</strong>
      </div>
      <div class="admin-mini-card">
        <span>Sync atrasada</span>
        <strong>${numberFormatter.format(summary.staleConnections)}</strong>
      </div>
    </div>
    <div class="admin-section-footnote">
      Ultima sincronizacao: ${escapeHtml(formatDateTime(summary.latestSync))}. Alerta apos ${numberFormatter.format(summary.staleAfterHours)}h sem atualizacao.
    </div>
  `;
}

function getDistinctPluggyBanks(): number {
  return new Set(currentPluggyRows.flatMap((row) => row.banks).filter(Boolean)).size;
}

function renderAdminConfig(): void {
  const container = document.getElementById('admin-config-area');
  if (!container || !currentAdminConfig) return;

  const activeRules = [
    currentAdminConfig.automaticRules.detectSubscriptionsFromPluggy,
    currentAdminConfig.automaticRules.categorizeTransactions,
    currentAdminConfig.automaticRules.preserveCustomCategories,
  ].filter(Boolean).length;
  const bankCount = getDistinctPluggyBanks();

  container.innerHTML = `
    <div class="admin-management-grid">
      <button class="admin-management-card" id="admin-open-categories" type="button">
        <span>Categorias padrao</span>
        <strong>${numberFormatter.format(defaultCategoryItemCount)}</strong>
        <small>${numberFormatter.format(defaultCategoryGroupCount)} grupos ativos</small>
      </button>
      <button class="admin-management-card" id="admin-open-config" type="button">
        <span>Bancos</span>
        <strong>${bankCount ? numberFormatter.format(bankCount) : '-'}</strong>
        <small>${currentAdminConfig.pluggy.allowNewConnections ? 'Novas conexoes liberadas' : 'Novas conexoes bloqueadas'}</small>
      </button>
      <button class="admin-management-card" id="admin-open-rules" type="button">
        <span>Regras automaticas</span>
        <strong>${activeRules}/3</strong>
        <small>Assinaturas, categorias e preservacao</small>
      </button>
      <button class="admin-management-card" id="admin-open-global" type="button">
        <span>Configuracoes globais</span>
        <strong>${currentAdminConfig.globalSettings.maintenanceMode ? 'Manutencao' : 'Normal'}</strong>
        <small>${currentAdminConfig.globalSettings.supportEmail || 'Sem e-mail de suporte'}</small>
      </button>
    </div>
    <div class="admin-section-actions">
      <button id="admin-edit-config" class="admin-secondary-btn" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
        Editar configs
      </button>
    </div>
  `;

  document.getElementById('admin-open-categories')?.addEventListener('click', openCategoriesModal);
  document.getElementById('admin-open-config')?.addEventListener('click', openConfigModal);
  document.getElementById('admin-open-rules')?.addEventListener('click', openConfigModal);
  document.getElementById('admin-open-global')?.addEventListener('click', openConfigModal);
  document.getElementById('admin-edit-config')?.addEventListener('click', openConfigModal);
}

function renderUserTable(users: AdminUserItem[]): string {
  if (users.length === 0) {
    return `<div class="admin-empty-state">Nenhum usuario encontrado.</div>`;
  }

  return `
    <div class="admin-user-summary">
      <span>${numberFormatter.format(users.length)} usuarios</span>
      <span>${numberFormatter.format(users.filter((u) => u.isAdmin).length)} admins</span>
      <span>${numberFormatter.format(users.filter((u) => u.disabled || u.isBlocked).length)} bloqueados</span>
      <span>${numberFormatter.format(users.filter((u) => String(u.plan).toLowerCase() === 'pro').length)} Pro</span>
    </div>
    <div class="admin-table-scroll admin-table-scroll-users">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Plano</th>
            <th>Acesso</th>
            <th>Ultimo login</th>
            <th style="text-align:right;">Acoes</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(renderUserRow).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderUserRow(userItem: AdminUserItem): string {
  const blocked = Boolean(userItem.disabled || userItem.isBlocked);
  return `
    <tr>
      <td>
        <div class="admin-user-cell">
          <strong>${escapeHtml(userItem.name || userItem.email || userItem.uid)}</strong>
          <span>${escapeHtml(userItem.email || userItem.uid)}</span>
        </div>
      </td>
      <td>
        <div class="admin-plan-cell">
          <strong>${escapeHtml(planLabel(userItem.plan))}</strong>
          <span>${escapeHtml(providerLabel(userItem.provider))} / ${escapeHtml(userItem.status || 'unknown')}</span>
        </div>
      </td>
      <td>${renderAccessPill(userItem)}</td>
      <td>
        <div class="admin-date-cell">
          <strong>${escapeHtml(formatRelative(userItem.lastLogin))}</strong>
          <span>${escapeHtml(formatDateTime(userItem.lastLogin))}</span>
        </div>
      </td>
      <td>
        <div class="admin-row-actions">
          ${userActionButton(userItem.uid, 'view', 'Ver perfil', '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>')}
          ${userActionButton(userItem.uid, 'plan', 'Alterar plano', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h.01M11 15h2"/>')}
          ${userActionButton(userItem.uid, 'reset', 'Resetar acesso', '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3"/>')}
          ${userActionButton(userItem.uid, 'block', blocked ? 'Desbloquear' : 'Bloquear', blocked
            ? '<path d="M7 11V7a5 5 0 0 1 9.9-1"/><rect x="5" y="11" width="14" height="10" rx="2"/>'
            : '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
          )}
        </div>
      </td>
    </tr>
  `;
}

function userActionButton(uid: string, action: string, title: string, icon: string): string {
  return `
    <button class="admin-icon-btn" type="button" data-admin-user-action="${action}" data-uid="${escapeHtml(uid)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
    </button>
  `;
}

function attachUserActionListeners(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-admin-user-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const uid = button.dataset.uid || '';
      const action = button.dataset.adminUserAction || '';
      const userItem = currentUsers.find((u) => u.uid === uid);
      if (!userItem) return;

      if (action === 'view') showUserProfile(userItem);
      if (action === 'plan') openPlanModal(userItem);
      if (action === 'reset') await resetUserAccess(userItem);
      if (action === 'block') await toggleUserBlock(userItem);
    });
  });
}

function showUserProfile(userItem: AdminUserItem): void {
  const blocked = Boolean(userItem.disabled || userItem.isBlocked);
  Modal({
    title: 'Perfil do usuario',
    maxWidth: 'max-w-xl',
    showFooter: false,
    fieldsPadding: 'p-0',
    content: `
      <div class="admin-profile-head">
        <div class="admin-profile-avatar">${escapeHtml((userItem.name || userItem.email || '?').slice(0, 1).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(userItem.name || userItem.email || userItem.uid)}</strong>
          <span>${escapeHtml(userItem.email || 'Sem e-mail')}</span>
        </div>
      </div>
      <div class="admin-profile-list">
        ${profileLine('UID', userItem.uid)}
        ${profileLine('Plano', `${planLabel(userItem.plan)} / ${userItem.status || 'unknown'}`)}
        ${profileLine('Provedor', providerLabel(userItem.provider))}
        ${profileLine('Acesso', blocked ? 'Bloqueado' : userItem.isAdmin ? 'Administrador' : 'Padrao')}
        ${profileLine('Criado em', formatDateTime(userItem.createdAt))}
        ${profileLine('Ultimo login', formatDateTime(userItem.lastLogin))}
        ${profileLine('Dias ativos', numberFormatter.format(Number(userItem.activeDaysCount || 0)))}
      </div>
    `,
  });
}

function profileLine(label: string, value: string): string {
  return `
    <div class="admin-profile-line">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function openPlanModal(userItem: AdminUserItem): void {
  const currentPlan = String(userItem.plan || 'free').toLowerCase() === 'pro' ? 'pro' : 'free';
  const currentStatus = String(userItem.status || (currentPlan === 'pro' ? 'active' : 'inactive')).toLowerCase();

  Modal({
    title: 'Alterar plano',
    maxWidth: 'max-w-md',
    showCancel: true,
    confirmText: 'Salvar',
    content: `
      <div class="admin-form-grid">
        <label class="admin-field-label" for="admin-plan-select">Plano</label>
        <select id="admin-plan-select" name="plan" class="admin-field">
          <option value="free" ${currentPlan === 'free' ? 'selected' : ''}>Free</option>
          <option value="pro" ${currentPlan === 'pro' ? 'selected' : ''}>Pro</option>
        </select>

        <label class="admin-field-label" for="admin-status-select">Status</label>
        <select id="admin-status-select" name="status" class="admin-field">
          ${['active', 'inactive', 'overdue', 'trialing', 'canceled'].map((status) => `
            <option value="${status}" ${currentStatus === status ? 'selected' : ''}>${status}</option>
          `).join('')}
        </select>
      </div>
    `,
    onConfirm: async (data) => {
      try {
        await adminFetch(`/api/admin/users/${encodeURIComponent(userItem.uid)}/plan`, {
          method: 'PATCH',
          body: JSON.stringify({
            plan: data.plan,
            status: data.status,
          }),
        });
        toaster.create({ title: 'Plano atualizado', description: userItem.email, type: 'success' });
        await loadUsers();
      } catch (error: any) {
        toaster.create({ title: 'Erro ao alterar plano', description: error.message, type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
    },
  });
}

async function toggleUserBlock(userItem: AdminUserItem): Promise<void> {
  const nextBlocked = !(userItem.disabled || userItem.isBlocked);
  const action = nextBlocked ? 'bloquear' : 'desbloquear';
  const ok = window.confirm(`Deseja ${action} o acesso de ${userItem.email || userItem.uid}?`);
  if (!ok) return;

  try {
    await adminFetch(`/api/admin/users/${encodeURIComponent(userItem.uid)}/access`, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: nextBlocked }),
    });
    toaster.create({
      title: nextBlocked ? 'Usuario bloqueado' : 'Usuario desbloqueado',
      description: userItem.email,
      type: 'success',
    });
    await loadUsers();
  } catch (error: any) {
    toaster.create({ title: 'Erro ao atualizar acesso', description: error.message, type: 'error' });
  }
}

async function resetUserAccess(userItem: AdminUserItem): Promise<void> {
  const ok = window.confirm(`Gerar link de reset de acesso para ${userItem.email || userItem.uid}?`);
  if (!ok) return;

  try {
    const data = await adminFetch<{ email: string; passwordResetLink: string }>(
      `/api/admin/users/${encodeURIComponent(userItem.uid)}/reset-access`,
      { method: 'POST' }
    );

    try {
      await navigator.clipboard.writeText(data.passwordResetLink);
    } catch {
      // Clipboard can be blocked by the browser; the link is still shown below.
    }

    Modal({
      title: 'Reset de acesso',
      maxWidth: 'max-w-xl',
      showFooter: false,
      content: `
        <div class="admin-reset-box">
          <span>E-mail</span>
          <strong>${escapeHtml(data.email)}</strong>
        </div>
        <label class="admin-field-label" for="admin-reset-link">Link gerado</label>
        <textarea id="admin-reset-link" class="admin-field admin-textarea" readonly>${escapeHtml(data.passwordResetLink)}</textarea>
      `,
    });

    toaster.create({ title: 'Link de reset gerado', description: 'Copiado para a area de transferencia quando permitido.', type: 'success' });
  } catch (error: any) {
    toaster.create({ title: 'Erro ao resetar acesso', description: error.message, type: 'error' });
  }
}

function openCategoriesModal(): void {
  Modal({
    title: 'Categorias padrao',
    maxWidth: 'max-w-3xl',
    showFooter: false,
    content: `
      <div class="admin-category-summary">
        <strong>${numberFormatter.format(defaultCategoryItemCount)} categorias</strong>
        <span>${numberFormatter.format(defaultCategoryGroupCount)} grupos</span>
      </div>
      <div class="admin-category-grid">
        ${DEFAULT_CATEGORIES.map((group) => `
          <div class="admin-category-group">
            <div>
              <strong>${escapeHtml(group.title)}</strong>
              <span>${numberFormatter.format(group.items.length)}</span>
            </div>
            <p>${escapeHtml(group.items.map((item) => item.label).join(', '))}</p>
          </div>
        `).join('')}
      </div>
    `,
  });
}

function openPluggyUsersModal(): void {
  Modal({
    title: 'Usuarios com sincronizacao Pluggy',
    maxWidth: 'max-w-5xl',
    showFooter: false,
    content: `
      <div class="admin-modal-summary">
        <strong>${numberFormatter.format(currentPluggyRows.length)} conexoes</strong>
        <span>${numberFormatter.format(new Set(currentPluggyRows.map((row) => row.uid)).size)} usuarios</span>
        <span>${numberFormatter.format(currentPluggyRows.reduce((sum, row) => sum + row.accountCount, 0))} contas</span>
      </div>
      ${renderPluggyTable(currentPluggyRows, { className: 'admin-table-scroll-modal' })}
    `,
  });
}

function openConfigModal(): void {
  const config = currentAdminConfig;
  if (!config) return;

  Modal({
    title: 'Configuracoes globais',
    maxWidth: 'max-w-2xl',
    showCancel: true,
    confirmText: 'Salvar',
    content: `
      <div class="admin-form-grid">
        ${checkboxField('allowNewConnections', 'Novas conexoes bancarias', config.pluggy.allowNewConnections)}
        ${checkboxField('showSandboxConnectors', 'Mostrar conectores sandbox', config.pluggy.showSandboxConnectors)}

        <label class="admin-field-label" for="syncStatusWindowHours">Alerta de sync atrasada (horas)</label>
        <input id="syncStatusWindowHours" name="syncStatusWindowHours" class="admin-field" type="number" min="1" max="720" value="${escapeHtml(config.pluggy.syncStatusWindowHours)}" />

        ${checkboxField('detectSubscriptionsFromPluggy', 'Detectar recorrencias via Pluggy', config.automaticRules.detectSubscriptionsFromPluggy)}
        ${checkboxField('categorizeTransactions', 'Categorizar transacoes automaticamente', config.automaticRules.categorizeTransactions)}
        ${checkboxField('preserveCustomCategories', 'Preservar categorias customizadas', config.automaticRules.preserveCustomCategories)}
        ${checkboxField('maintenanceMode', 'Modo manutencao', config.globalSettings.maintenanceMode)}

        <label class="admin-field-label" for="supportEmail">E-mail de suporte</label>
        <input id="supportEmail" name="supportEmail" class="admin-field" type="email" value="${escapeHtml(config.globalSettings.supportEmail || '')}" />

        <label class="admin-field-label" for="adminNotice">Aviso global</label>
        <textarea id="adminNotice" name="adminNotice" class="admin-field admin-textarea">${escapeHtml(config.globalSettings.adminNotice || '')}</textarea>
      </div>
    `,
    onConfirm: async (data) => {
      try {
        const result = await adminFetch<{ config: AdminConfig }>('/api/admin/config', {
          method: 'PATCH',
          body: JSON.stringify({
            pluggy: {
              allowNewConnections: data.allowNewConnections === 'on',
              showSandboxConnectors: data.showSandboxConnectors === 'on',
              syncStatusWindowHours: Number(data.syncStatusWindowHours),
            },
            automaticRules: {
              detectSubscriptionsFromPluggy: data.detectSubscriptionsFromPluggy === 'on',
              categorizeTransactions: data.categorizeTransactions === 'on',
              preserveCustomCategories: data.preserveCustomCategories === 'on',
            },
            globalSettings: {
              maintenanceMode: data.maintenanceMode === 'on',
              supportEmail: data.supportEmail,
              adminNotice: data.adminNotice,
            },
          }),
        });
        currentAdminConfig = result.config;
        renderAdminConfig();
        toaster.create({ title: 'Configuracoes salvas', type: 'success' });
        await loadPluggySync();
      } catch (error: any) {
        toaster.create({ title: 'Erro ao salvar', description: error.message, type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
    },
  });
}

function checkboxField(name: string, label: string, checked: boolean): string {
  return `
    <label class="admin-check-row">
      <span>${escapeHtml(label)}</span>
      <input type="checkbox" name="${escapeHtml(name)}" ${checked ? 'checked' : ''} />
    </label>
  `;
}

async function loadStats(): Promise<void> {
  try {
    const data = await adminFetch<AdminStats>('/api/admin/stats');
    const partialHint = providerErrorHint(data.providerErrors);

    setKpiValue(
      'kpi-active-subs',
      numberFormatter.format(data.activeSubscribersCount),
      partialHint || `${numberFormatter.format(data.totalUsers)} usuarios no total`
    );
    setKpiValue(
      'kpi-mrr',
      moneyFormatter.format(data.mrr),
      partialHint || (data.canceledStripeInMrrCount && data.canceledStripeInMrrCount > 0
        ? `Inclui ${numberFormatter.format(data.canceledStripeInMrrCount)} cancelamento${data.canceledStripeInMrrCount === 1 ? '' : 's'} Stripe`
        : 'Soma das mensalidades reais')
    );

    const avg = data.avgActiveDaysOfPaying;
    setKpiValue(
      'kpi-avg-days',
      `${numberFormatter.format(Math.round(avg))} dia${Math.round(avg) === 1 ? '' : 's'}`,
      partialHint || (data.activeSubscribersCount > 0
        ? `Media entre ${numberFormatter.format(data.activeSubscribersCount)} assinante${data.activeSubscribersCount === 1 ? '' : 's'}`
        : 'Sem assinantes ativos')
    );
  } catch (err: any) {
    console.error('[Admin] Falha ao carregar stats:', err);
    setKpiError('kpi-active-subs');
    setKpiError('kpi-mrr');
    setKpiError('kpi-avg-days');
  }
}

async function loadPluggySync(): Promise<void> {
  const summaryEl = document.getElementById('admin-pluggy-summary');
  const tableEl = document.getElementById('admin-pluggy-table');
  if (summaryEl) summaryEl.innerHTML = sectionSkeleton('Carregando Pluggy...');
  if (tableEl) tableEl.innerHTML = '';

  try {
    const data = await adminFetch<{ summary: PluggySyncSummary; rows: PluggySyncRow[] }>('/api/admin/pluggy-sync');
    currentPluggyRows = data.rows || [];
    if (summaryEl) summaryEl.innerHTML = renderPluggySummary(data.summary);
    if (tableEl) tableEl.innerHTML = renderPluggyTable(currentPluggyRows, { limit: 5, className: 'admin-table-scroll-compact' });
    renderAdminConfig();
  } catch (error: any) {
    if (summaryEl) summaryEl.innerHTML = `<div class="admin-empty-state is-error">${escapeHtml(error.message)}</div>`;
  }
}

async function loadAdminConfig(): Promise<void> {
  const container = document.getElementById('admin-config-area');
  if (container) container.innerHTML = sectionSkeleton('Carregando configuracoes...');

  try {
    const data = await adminFetch<{ config: AdminConfig }>('/api/admin/config');
    currentAdminConfig = data.config;
    renderAdminConfig();
  } catch (error: any) {
    if (container) container.innerHTML = `<div class="admin-empty-state is-error">${escapeHtml(error.message)}</div>`;
  }
}

async function loadUsers(): Promise<void> {
  const container = document.getElementById('admin-users-area');
  if (container) container.innerHTML = sectionSkeleton('Carregando usuarios...');

  try {
    const data = await adminFetch<{ users: AdminUserItem[] }>('/api/admin/users');
    currentUsers = data.users || [];
    if (container) {
      container.innerHTML = renderUserTable(currentUsers);
      attachUserActionListeners();
    }
  } catch (error: any) {
    if (container) container.innerHTML = `<div class="admin-empty-state is-error">${escapeHtml(error.message)}</div>`;
  }
}

async function loadDashboardData(): Promise<void> {
  await Promise.all([
    loadStats(),
    loadPluggySync(),
    loadAdminConfig(),
    loadUsers(),
  ]);
}

export function renderAdmin(user: any) {
  if (user?.isAdmin !== true) {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard' } }));
    return;
  }
  const app = document.querySelector<HTMLDivElement>('#app')!;

  app.innerHTML = `
    <div id="admin-shell" class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        @keyframes fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes admin-pulse {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.85; }
        }
        @keyframes admin-spin {
          to { transform: rotate(360deg); }
        }
        .animate-fadein { animation: fadein 0.25s ease forwards; }

        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 900px) {
          .admin-kpi-grid { grid-template-columns: 1fr; }
        }

        .admin-kpi-card,
        .admin-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 16px;
        }
        .admin-kpi-card {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.2s, background 0.2s;
        }
        .admin-kpi-card:hover,
        .admin-section:hover {
          background: var(--color-surface-hover);
        }
        .admin-kpi-head {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-kpi-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: var(--color-surface-hover);
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }
        .admin-kpi-label,
        .admin-section-eyebrow,
        .admin-mini-card span,
        .admin-management-card span {
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--color-text-secondary);
        }
        .admin-kpi-value-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          min-height: 32px;
        }
        .admin-kpi-value {
          font-size: 26px;
          font-weight: 600;
          color: var(--color-text);
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .admin-kpi-hint {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .admin-kpi-skeleton {
          display: inline-block;
          width: 110px;
          height: 22px;
          border-radius: 6px;
          background: var(--color-surface-hover);
          animation: admin-pulse 1.2s ease-in-out infinite;
        }

        .admin-refresh-btn,
        .admin-secondary-btn,
        .admin-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .admin-refresh-btn,
        .admin-secondary-btn {
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 500;
        }
        .admin-icon-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: transparent;
        }
        .admin-refresh-btn:hover,
        .admin-secondary-btn:hover,
        .admin-icon-btn:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
        }
        .admin-refresh-btn.is-loading svg {
          animation: admin-spin 0.8s linear infinite;
        }

        .admin-dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
          gap: 16px;
          margin-top: 16px;
        }
        .admin-section {
          padding: 16px;
          min-width: 0;
        }
        .admin-section-wide {
          grid-column: span 1;
        }
        .admin-section-full {
          grid-column: 1 / -1;
        }
        .admin-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
        }
        .admin-section-title {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .admin-section-title h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 650;
          color: var(--color-text);
        }
        .admin-section-title p,
        .admin-section-footnote,
        .admin-row-note {
          margin: 0;
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .admin-section-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 14px;
        }

        .admin-mini-grid,
        .admin-management-grid {
          display: grid;
          gap: 10px;
        }
        .admin-mini-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 10px;
        }
        .admin-management-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .admin-mini-card,
        .admin-management-card {
          border: 1px solid var(--color-border);
          background: color-mix(in srgb, var(--color-surface) 86%, transparent);
          border-radius: 12px;
          padding: 10px;
          min-width: 0;
        }
        .admin-management-card {
          text-align: left;
          cursor: pointer;
          color: inherit;
        }
        .admin-management-card:hover {
          border-color: color-mix(in srgb, var(--color-text-secondary) 40%, var(--color-border));
        }
        .admin-mini-card strong,
        .admin-management-card strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text);
          line-height: 1.1;
        }
        .admin-management-card small {
          display: block;
          min-height: 28px;
          margin-top: 6px;
          font-size: 11.5px;
          color: var(--color-text-secondary);
          line-height: 1.25;
        }

        .admin-table-scroll {
          overflow: auto;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          max-height: 320px;
        }
        .admin-table-scroll-compact {
          max-height: 245px;
        }
        .admin-table-scroll-users {
          max-height: 360px;
        }
        .admin-table-scroll-modal {
          max-height: min(65vh, 680px);
        }
        .admin-table {
          width: 100%;
          min-width: 720px;
          border-collapse: collapse;
        }
        .admin-table th {
          position: sticky;
          top: 0;
          z-index: 1;
          padding: 10px 12px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
          background: var(--color-surface);
          text-align: left;
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }
        .admin-table td {
          padding: 12px;
          font-size: 13px;
          border-bottom: 1px solid var(--color-border-light, rgba(255,255,255,0.04));
          vertical-align: middle;
        }
        .admin-table tbody tr:last-child td {
          border-bottom: none;
        }
        .admin-user-cell,
        .admin-date-cell,
        .admin-plan-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .admin-user-cell strong,
        .admin-date-cell strong,
        .admin-plan-cell strong {
          color: var(--color-text);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 240px;
        }
        .admin-user-cell span,
        .admin-date-cell span,
        .admin-plan-cell span,
        .admin-bank-list span {
          color: var(--color-text-secondary);
          font-size: 11.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 260px;
        }
        .admin-bank-list {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text);
          max-width: 270px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-row-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }
        .admin-user-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
        .admin-user-summary span {
          border: 1px solid var(--color-border);
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11.5px;
          color: var(--color-text-secondary);
        }
        .admin-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 72px;
          height: 24px;
          padding: 0 8px;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          font-size: 11px;
          font-weight: 650;
          white-space: nowrap;
        }
        .admin-pill-ok { color: #22c55e; background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.18); }
        .admin-pill-warn { color: #f59e0b; background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.18); }
        .admin-pill-error { color: #ef4444; background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.18); }
        .admin-pill-info { color: #38bdf8; background: rgba(56,189,248,0.08); border-color: rgba(56,189,248,0.18); }
        .admin-pill-muted { color: var(--color-text-secondary); }

        .admin-section-loading,
        .admin-empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 120px;
          color: var(--color-text-secondary);
          font-size: 13px;
          border: 1px dashed var(--color-border);
          border-radius: 12px;
        }
        .admin-empty-state.is-error {
          color: #ef4444;
        }
        .admin-table-footnote {
          margin-top: 8px;
        }
        .admin-mini-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-text-secondary);
          border-radius: 999px;
          animation: admin-spin 0.75s linear infinite;
        }

        .admin-profile-head {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
          border-bottom: 1px solid var(--color-border);
        }
        .admin-profile-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: var(--color-surface-hover);
          color: var(--color-text);
          font-weight: 700;
        }
        .admin-profile-head strong,
        .admin-profile-head span {
          display: block;
        }
        .admin-profile-head span {
          color: var(--color-text-secondary);
          font-size: 13px;
          margin-top: 2px;
        }
        .admin-profile-list {
          display: flex;
          flex-direction: column;
        }
        .admin-profile-line {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--color-border-light, rgba(255,255,255,0.05));
          font-size: 13px;
        }
        .admin-profile-line:last-child {
          border-bottom: none;
        }
        .admin-profile-line span {
          color: var(--color-text-secondary);
        }
        .admin-profile-line strong {
          color: var(--color-text);
          text-align: right;
          overflow-wrap: anywhere;
        }
        .admin-form-grid {
          display: grid;
          gap: 10px;
        }
        .admin-field-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
        }
        .admin-field {
          width: 100%;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-surface);
          color: var(--color-text);
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
        }
        .admin-textarea {
          min-height: 88px;
          resize: vertical;
        }
        .admin-check-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 10px 12px;
          color: var(--color-text);
          font-size: 13px;
        }
        .admin-check-row input {
          width: 18px;
          height: 18px;
          accent-color: #D97757;
          flex-shrink: 0;
        }
        .admin-reset-box,
        .admin-category-summary,
        .admin-modal-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .admin-reset-box span,
        .admin-category-summary span,
        .admin-modal-summary span {
          color: var(--color-text-secondary);
          font-size: 12px;
        }
        .admin-modal-summary strong {
          color: var(--color-text);
          font-size: 13px;
        }
        .admin-category-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          max-height: 55vh;
          overflow-y: auto;
          padding-right: 4px;
        }
        .admin-category-group {
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px;
        }
        .admin-category-group div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .admin-category-group p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 12px;
          line-height: 1.45;
        }

        @media (max-width: 1024px) {
          .admin-dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .admin-mini-grid,
          .admin-management-grid,
          .admin-category-grid {
            grid-template-columns: 1fr;
          }
          .admin-section-header {
            flex-direction: column;
          }
          .admin-table {
            min-width: 680px;
          }
        }
      </style>

      <main class="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="w-full animate-fadein">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Painel Administrativo</h2>
              <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Visao geral, operacao e controle do sistema.</p>
            </div>
            <div class="flex items-center gap-3">
              <button id="admin-stats-refresh" class="admin-refresh-btn" title="Atualizar painel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Atualizar
              </button>
            </div>
          </div>

          <div class="admin-kpi-grid">
            ${kpiCard({
              id: 'kpi-active-subs',
              label: 'Assinantes ativos',
              hint: 'Carregando...',
              icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>`,
            })}
            ${kpiCard({
              id: 'kpi-mrr',
              label: 'MRR',
              hint: 'Carregando...',
              icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
            })}
            ${kpiCard({
              id: 'kpi-avg-days',
              label: 'Media de dias de uso',
              hint: 'Carregando...',
              icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
            })}
          </div>

          <div class="admin-dashboard-grid">
            <section class="admin-section admin-section-wide">
              <div class="admin-section-header">
                <div class="admin-section-title">
                  <span class="admin-section-eyebrow">Pluggy</span>
                  <h3>Monitoramento de sincronizacao bancaria</h3>
                  <p>Contas conectadas, ultima sincronizacao, erros e status por usuario.</p>
                </div>
                <button id="admin-open-pluggy-modal" class="admin-secondary-btn" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  </svg>
                  Ver todos
                </button>
              </div>
              <div id="admin-pluggy-summary">${sectionSkeleton('Carregando Pluggy...')}</div>
              <div id="admin-pluggy-table"></div>
            </section>

            <section class="admin-section">
              <div class="admin-section-header">
                <div class="admin-section-title">
                  <span class="admin-section-eyebrow">Base global</span>
                  <h3>Categorias, bancos e regras</h3>
                  <p>Configuracoes padrao e controles que afetam a operacao.</p>
                </div>
              </div>
              <div id="admin-config-area">${sectionSkeleton('Carregando configuracoes...')}</div>
            </section>

            <section class="admin-section admin-section-full">
              <div class="admin-section-header">
                <div class="admin-section-title">
                  <span class="admin-section-eyebrow">Usuarios</span>
                  <h3>Gestão de usuários</h3>
                  <p>Perfil, bloqueio, plano e reset de acesso.</p>
                </div>
                <button id="admin-open-users-page" class="admin-secondary-btn" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  </svg>
                  Ver completo
                </button>
              </div>
              <div id="admin-users-area">${sectionSkeleton('Carregando usuarios...')}</div>
            </section>
          </div>
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();

  document.getElementById('admin-open-pluggy-modal')?.addEventListener('click', openPluggyUsersModal);

  document.getElementById('admin-open-users-page')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-subscriptions' } }));
  });

  const refreshBtn = document.getElementById('admin-stats-refresh');
  const runLoad = async () => {
    refreshBtn?.classList.add('is-loading');
    await loadDashboardData();
    refreshBtn?.classList.remove('is-loading');
  };
  refreshBtn?.addEventListener('click', runLoad);

  if (auth.currentUser) {
    runLoad();
  } else {
    const unsubscribe = auth.onAuthStateChanged((u: any) => {
      unsubscribe();
      if (u) runLoad();
    });
  }
}
