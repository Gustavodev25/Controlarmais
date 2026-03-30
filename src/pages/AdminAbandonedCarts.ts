import { BrilhoHeader } from '../components/BrilhoHeader';
import { Header, attachHeaderListeners } from '../components/Header';
import { toaster } from '../components/Toast';
import { auth } from '../lib/firebase';
import { API_BASE } from '../lib/apiConfig';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Avvvatars from 'avvvatars-react';
import { Tooltip, initAllTooltips } from '../components/Tooltip';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { GenericDropdown, attachGenericDropdownListeners } from '../components/GenericDropdown';

function fmtDate(dateStr: string | null): string {
  if (!dateStr || dateStr === 'N/A' || dateStr === '—') return 'Data não disponível';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtRelativeTime(dateStr: string | null): { text: string; color: string } {
  if (!dateStr) return { text: 'Nunca entrou', color: 'var(--color-text-secondary)' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: 'Nunca entrou', color: 'var(--color-text-secondary)' };
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  let text: string;
  let color: string;

  if (diffSec < 60) {
    text = `Há ${diffSec}s`;
    color = 'var(--color-text)';
  } else if (diffMin < 60) {
    text = `Há ${diffMin} min`;
    color = 'var(--color-text)';
  } else if (diffHr < 24) {
    text = `Há ${diffHr}h`;
    color = 'var(--color-text-secondary)';
  } else if (diffDay < 7) {
    text = `Há ${diffDay} dia${diffDay !== 1 ? 's' : ''}`;
    color = 'var(--color-text-secondary)';
  } else {
    text = `Há ${diffDay} dias`;
    color = 'var(--color-text-secondary)';
  }

  return { text, color };
}

function getHoursPassed(dateStr: string | null): number {
  if (!dateStr || dateStr === 'N/A' || dateStr === '—') return 0;
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60));
}

function getRemarketingStage(hours: number): { day: number; label: string; color: string } {
  if (hours < 24) return { day: 0, label: 'Aguardando', color: 'var(--color-text-secondary)' };
  if (hours < 48) return { day: 1, label: 'D+1 · Lembrete', color: 'var(--color-text)' };
  if (hours < 72) return { day: 2, label: 'D+2 · Cupom', color: 'var(--color-text)' };
  return { day: 3, label: 'D+3 · Última Chance', color: '#ef4444' };
}

function renderRow(userItem: any): string {
  const hours = getHoursPassed(userItem.createdAt);
  const isReadyForRemarketing = hours >= 24;
  
  return `
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <div class="avvvatar-target-abandoned shrink-0" data-val="${userItem.email || userItem.uid}" style="width:32px;height:32px;border-radius:12px;overflow:hidden;"></div>
          <div class="overflow-hidden">
            <div class="flex items-center gap-1.5" style="font-weight:500;font-size:13px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;" title="${userItem.name}">
              <span class="truncate">${userItem.name}</span>
            </div>
            <div style="font-size:11.5px;color:var(--color-text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;" title="${userItem.email}">${userItem.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span style="font-size:12px;color:var(--color-text-secondary);">Pendente</span>
      </td>
      <td style="white-space:nowrap;">
        <div class="flex flex-col gap-1">
          <span style="font-size:12px;font-weight:500;color:var(--color-text);">
            ${hours}h <span style="color:var(--color-text-secondary);font-weight:400;">/ 72h</span>
          </span>
          <div style="width:100px;height:3px;background:var(--color-border);border-radius:2px;overflow:hidden;">
            <div style="width:${Math.min((hours / 72) * 100, 100)}%;height:100%;background:${hours >= 72 ? '#ef4444' : 'var(--color-text-secondary)'};opacity:${hours >= 72 ? '1' : '0.5'};"></div>
          </div>
        </div>
      </td>
      <td>
        ${(() => {
          const hours = getHoursPassed(userItem.createdAt);
          const stage = getRemarketingStage(hours);
          const sentStage = userItem.remarketingStage || 0;
          
          // Verificar se abriu ou clicou no estágio enviado
          const opened = sentStage > 0 && userItem[`remarketingOpenD${sentStage}`];
          const clicked = sentStage > 0 && userItem[`remarketingClickD${sentStage}`];

          return `
            <div class="flex flex-col gap-1">
              <span style="font-size:12px;font-weight:500;color:${stage.color};">
                ${stage.label}
              </span>
              ${sentStage > 0 ? `
                <div class="flex items-center gap-2" style="font-size:10px;font-weight:500;margin-top:2px;color:var(--color-text-secondary);">
                  <div class="flex items-center gap-1" title="E-mail Enviado">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span>Enviado</span>
                  </div>
                  ${opened ? `
                    <div class="flex items-center gap-1" title="E-mail Aberto">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>Aberto</span>
                    </div>
                  ` : ''}
                  ${clicked ? `
                    <div class="flex items-center gap-1" style="color:var(--color-text);" title="Link Clicado">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 4 3 3-7 7-3-3 7-7Z"/><path d="m20 11 2 2-5 5-2-2 5-5Z"/><path d="M7 11.5V14h2.5L17 6.5 14.5 4 7 11.5Z"/><path d="m21.5 5.5.06-.06a2.1 2.1 0 0 0-3-3l-.06.06a2.1 2.1 0 0 0 3 3Z"/><path d="m4.5 16.5-1.5 6 6-1.5L21.5 6.5l-4.5-4.5L4.5 16.5Z"/></svg>
                      <span>Clicado</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `;
        })()}
      </td>
      <td>
        ${(() => {
          const rel = fmtRelativeTime(userItem.lastLogin);
          return `<span style="font-size:13px;white-space:nowrap;color:${rel.color};">${rel.text}</span>`;
        })()}
      </td>
      <td style="text-align:right;">
        <!-- Desktop -->
        <div class="flex items-center justify-end gap-2 cc-desktop-actions">
          <button class="cc-action-btn user-btn-ignore" data-uid="${userItem.uid}" title="Remover da Lista (Ignorar)">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M18 6L6 18M6 6l12 12"></path>
             </svg>
          </button>
        </div>
        <!-- Mobile: menu 3 pontos -->
        <div class="cc-mobile-actions" style="position:relative;">
          <button id="cart-mob-${userItem.uid}" class="cc-action-btn cart-mob-trigger" data-uid="${userItem.uid}" title="Opções">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
          ${GenericDropdown({
            id: `cart-mob-${userItem.uid}`,
            width: '180px',
            items: [
              {
                id: `cart-mi-ign-${userItem.uid}`,
                label: 'Remover da Lista',
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
                variant: 'danger',
              },
            ],
          })}
        </div>
      </td>
    </tr>
  `;
}

function renderTableContent(users: any[]): string {
  if (users.length === 0) {
    return `
      <tr>
        <td colspan="6" style="padding:60px 0;text-align:center;border:none;color:var(--color-text-secondary);font-size:13px;">
          Nenhum carrinho abandonado encontrado.
        </td>
      </tr>
    `;
  }
  return users.map((u) => renderRow(u)).join('');
}

async function loadAbandonedCarts(): Promise<void> {
  const container = document.getElementById('admin-abandoned-content-area');
  if (!container) return;

  container.innerHTML = `
    <div class="cc-table-wrapper">
      <div class="cc-loading">
        <div class="cc-spinner"></div>
        <span class="cc-loading-text">Buscando carrinhos abandonados…</span>
      </div>
    </div>
  `;

  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Não autenticado.');
    const token = await user.getIdToken();

    const res = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Erro desconhecido');
    }

    const data = await res.json();
    const allUsers = data.users || [];
    // Filtrar apenas usuários com status 'pending' ou 'incomplete' que não são admins
    const abandonedCarts = allUsers.filter((u: any) => 
      (u.status === 'pending' || u.status === 'incomplete' || u.status === 'unpaid') && 
      !u.isAdmin && 
      !u.abandonedHandled
    );

    container.innerHTML = `
      <div class="cc-table-wrapper">
        <div class="cc-table-header">
          <div class="cc-table-header-left">
            <span class="cc-table-header-title">Listagem de Abandonos</span>
          </div>
          <div class="cc-table-header-right">
            <span class="cc-table-count" style="font-size:12px;font-weight:600;color:var(--color-text-secondary);">
              ${abandonedCarts.length} usuário${abandonedCarts.length !== 1 ? 's' : ''}
            </span>
            <div class="cc-header-sep"></div>
            <button id="btn-refresh-abandoned" class="cc-action-btn" title="Atualizar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="cc-table-scroll">
          <table class="cc-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Status</th>
                <th>Tempo p/ Remarketing</th>
                <th>Etapa Atual</th>
                <th>Última Atividade</th>
                <th style="text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableContent(abandonedCarts)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btn-refresh-abandoned')?.addEventListener('click', loadAbandonedCarts);

    // Render Avvvatars
    document.querySelectorAll('.avvvatar-target-abandoned').forEach(el => {
      const val = el.getAttribute('data-val') || 'User';
      const root = createRoot(el);
      root.render(createElement(Avvvatars, { value: val, size: 32, style: 'shape' }));
    });

    attachActionListeners();
    initAllTooltips();

  } catch (err: any) {
    container.innerHTML = `
      <div class="cc-table-wrapper">
        <div class="cc-loading">
          <span class="cc-loading-text" style="color:#ef4444;">Erro: ${err.message}</span>
          <button id="btn-retry-abandoned" style="margin-top:12px;padding:6px 16px;border-radius:8px;background:var(--color-surface);border:1px solid var(--color-border);font-size:12px;cursor:pointer;color:var(--color-text-secondary);">
            Tentar novamente
          </button>
        </div>
      </div>
    `;
    document.getElementById('btn-retry-abandoned')?.addEventListener('click', loadAbandonedCarts);
  }
}

function attachActionListeners() {
  // Expor função global no console para teste real com Resend
  (window as any).testRemarketing = async (targetEmail: string = 'gustavodev25@gmail.com', day: number = 1) => {
    console.log(`%c 🚀 DISPARANDO E-MAIL REAL D+${day} 🚀 `, 'background: #222; color: #bada55; padding: 5px; font-weight: bold;');
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Não autenticado.');
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE}/api/admin/test-remarketing`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          email: targetEmail, 
          name: 'Gustavo Teste',
          day: day
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao disparar e-mail.');
      }

      const data = await res.json();
      console.log(`%c ✅ Sucesso: ${data.message}`, 'color: #10b981; font-weight: bold;');
      toaster.create({ title: 'E-mail Enviado!', description: `Remarketing D+${day} enviado para ${targetEmail}`, type: 'success' });
    } catch (err: any) {
      console.error('❌ Falha no disparo:', err.message);
      toaster.create({ title: 'Erro no Envio', description: err.message, type: 'error' });
    }
  };

  document.querySelectorAll('.user-btn-ignore').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      DeleteConfirmationModal({
        title: 'Remover da Lista',
        description: 'Deseja remover este carrinho da lista de abandonos? O usuário NÃO será excluído do sistema.',
        onConfirm: async () => {
          const user = auth.currentUser;
          if (!user) throw new Error('Não autenticado.');
          const token = await user.getIdToken();
          const r = await fetch(`${API_BASE}/api/admin/users/${uid}/abandoned-handled`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!r.ok) {
              const ans = await r.json();
              throw new Error(ans.error || 'Falha ao remover.');
          }
          toaster.create({ title: 'Sucesso', description: 'Removido da visualização.', type: 'success' });
          loadAbandonedCarts();
        }
      });
    });
  });

  // Mobile: menu 3 pontos
  document.querySelectorAll('.cart-mob-trigger').forEach(trigBtn => {
    const uid = trigBtn.getAttribute('data-uid');
    if (!uid) return;

    attachGenericDropdownListeners(`cart-mob-${uid}`, `cart-mob-${uid}`);

    document.getElementById(`cart-mi-ign-${uid}`)?.addEventListener('click', () => {
      DeleteConfirmationModal({
        title: 'Remover da Lista',
        description: 'Deseja remover este carrinho da lista de abandonos? O usuário NÃO será excluído do sistema.',
        onConfirm: async () => {
          const user = auth.currentUser;
          if (!user) throw new Error('Não autenticado.');
          const token = await user.getIdToken();
          const r = await fetch(`${API_BASE}/api/admin/users/${uid}/abandoned-handled`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!r.ok) {
            const ans = await r.json();
            throw new Error(ans.error || 'Falha ao remover.');
          }
          toaster.create({ title: 'Sucesso', description: 'Removido da visualização.', type: 'success' });
          loadAbandonedCarts();
        }
      });
    });
  });
}

export function renderAdminAbandonedCarts(user: any) {
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-fadein { animation: fadein 0.25s ease forwards; }

        .cc-table-wrapper {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          overflow: visible;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .cc-table-header {
          padding: 14px 20px;
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .cc-table-header-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--color-text-secondary);
        }
        .cc-table-header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .cc-header-sep {
          width: 1px;
          height: 14px;
          background: var(--color-border);
        }

        .cc-table-scroll {
          overflow-x: auto;
        }

        .cc-table {
          width: 100%;
          min-width: 600px;
          border-collapse: separate;
          border-spacing: 0;
        }
        .cc-table th {
          padding: 11px 16px;
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--color-text-secondary);
          text-align: left;
        }
        .cc-table td {
          padding: 13px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--color-border-light);
          vertical-align: middle;
        }
        .cc-table tbody tr:hover { background: var(--color-surface-hover); }

        .cc-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .cc-action-btn:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
        }
        .user-btn-delete:hover { color: #ef4444 !important; }

        /* Desktop vs mobile actions */
        .cc-desktop-actions { display: flex; }
        .cc-mobile-actions  { display: none; }

        .cc-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 56px 24px;
          gap: 12px;
        }
        .cc-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-text-secondary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .cc-loading-text { font-size: 13px; color: var(--color-text-secondary); }

        /* Mobile responsiveness */
        @media (max-width: 767px) {
          .cc-table-header {
            padding: 12px 14px;
            gap: 8px;
            flex-wrap: wrap;
          }
          .cc-table-header-right { gap: 10px; }
          .cc-table-header-left  { flex: 1; }

          /* Troca desktop → mobile actions */
          .cc-desktop-actions { display: none; }
          .cc-mobile-actions  { display: flex; align-items: center; }

          /* Card layout */
          .cc-table-scroll { overflow-x: visible; }
          .cc-table { min-width: 0; display: block; }
          .cc-table thead { display: none; }
          .cc-table tbody { display: block; }
          .cc-table tbody tr {
            position: relative;
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            padding: 16px 58px 16px 14px;
            gap: 6px 8px;
            border-bottom: 1px solid var(--color-border);
          }
          .cc-table tbody tr:last-child { border-bottom: none; }
          .cc-table td { padding: 0; border-bottom: none; font-size: 13px; }

          /* td 1: Usuário — linha 1, largura total */
          .cc-table td:nth-child(1) {
            flex: 0 0 100%; min-width: 0; padding-bottom: 8px; order: 1;
          }
          /* td 2: Status — oculto (sempre "Pendente") */
          .cc-table td:nth-child(2) { display: none; }
          /* td 3: Tempo p/ Remarketing — oculto */
          .cc-table td:nth-child(3) { display: none; }
          /* td 4: Etapa Atual — linha 2, largura total */
          .cc-table td:nth-child(4) { flex: 0 0 100%; order: 3; }
          /* td 5: Última Atividade — linha 3 */
          .cc-table td:nth-child(5) { flex: 0 0 auto; order: 4; }
          /* td 6: Ações — absoluto no canto superior direito */
          .cc-table td:nth-child(6) {
            position: absolute; top: 8px; right: 14px;
          }
        }
      </style>

      <main class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="w-full animate-fadein">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Carrinhos Abandonados</h2>
              <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Usuários que iniciaram o checkout mas não concluíram o pagamento.</p>
            </div>
          </div>

          <div id="admin-abandoned-content-area" class="mt-2">
            <!-- preenchido via JS -->
          </div>
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();
  loadAbandonedCarts();
}
