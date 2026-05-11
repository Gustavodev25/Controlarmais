import { BrilhoHeader } from '../components/BrilhoHeader';
import { Header, attachHeaderListeners } from '../components/Header';
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
  generatedAt: string;
};

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
  if (v) v.textContent = '—';
  const h = root.querySelector<HTMLElement>('[data-role="hint"]');
  if (h) h.textContent = 'Erro ao carregar';
}

async function loadStats() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Não autenticado.');
    const token = await user.getIdToken();

    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Erro desconhecido');
    }
    const data: AdminStats = await res.json();

    setKpiValue(
      'kpi-active-subs',
      numberFormatter.format(data.activeSubscribersCount),
      `${numberFormatter.format(data.totalUsers)} usuários no total`
    );
    setKpiValue(
      'kpi-mrr',
      moneyFormatter.format(data.mrr),
      data.canceledStripeInMrrCount && data.canceledStripeInMrrCount > 0
        ? `Inclui ${numberFormatter.format(data.canceledStripeInMrrCount)} cancelamento${data.canceledStripeInMrrCount === 1 ? '' : 's'} Stripe ate o fim do periodo`
        : 'Soma das mensalidades reais'
    );

    const avg = data.avgActiveDaysOfPaying;
    setKpiValue(
      'kpi-avg-days',
      `${numberFormatter.format(Math.round(avg))} dia${Math.round(avg) === 1 ? '' : 's'}`,
      data.activeSubscribersCount > 0
        ? `Média entre ${numberFormatter.format(data.activeSubscribersCount)} assinante${data.activeSubscribersCount === 1 ? '' : 's'}`
        : 'Sem assinantes ativos'
    );
  } catch (err: any) {
    console.error('[Admin] Falha ao carregar stats:', err);
    setKpiError('kpi-active-subs');
    setKpiError('kpi-mrr');
    setKpiError('kpi-avg-days');
  }
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

        .admin-kpi-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.2s, background 0.2s;
        }
        .admin-kpi-card:hover {
          border-color: var(--color-border);
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
        .admin-kpi-label {
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
          font-family: 'IBM Plex Mono', monospace;
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

        .admin-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .admin-refresh-btn:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
        }
        .admin-refresh-btn.is-loading svg {
          animation: admin-spin 0.8s linear infinite;
        }
      </style>

      <main class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="w-full animate-fadein">
          <!-- Header row -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Painel Administrativo</h2>
              <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Visão geral e controle do sistema.</p>
            </div>
            <div class="flex items-center gap-3">
              <button id="admin-stats-refresh" class="admin-refresh-btn" title="Atualizar métricas">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Atualizar
              </button>
            </div>
          </div>

          <!-- Stats Grid -->
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
              label: 'Média de dias de uso',
              hint: 'Carregando...',
              icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
            })}
          </div>
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();

  const refreshBtn = document.getElementById('admin-stats-refresh');
  const runLoad = async () => {
    refreshBtn?.classList.add('is-loading');
    await loadStats();
    refreshBtn?.classList.remove('is-loading');
  };
  refreshBtn?.addEventListener('click', runLoad);

  if (auth.currentUser) {
    runLoad();
  } else {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      unsubscribe();
      if (u) runLoad();
    });
  }
}
