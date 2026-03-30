import { openChangePasswordModal } from './ChangePasswordModal';
import { openTwoFactorModal, openDisableTwoFactorModal } from './TwoFactorModal';
import type { UserSession } from '../../lib/sessions';
import { revokeSession } from '../../lib/sessions';
import { toaster } from '../../components/Toast';
import { auth } from '../../lib/firebase';

let isSessionsExpanded = false;

export function SecurityTab(userData: any, sessions: UserSession[] = []) {
  const is2FAEnabled = userData?.twoFactorEnabled === true;

  const renderSessionsList = () => {
    if (!isSessionsExpanded) return '';

    if (sessions.length === 0) {
      return `
        <div class="px-6 py-8 text-center bg-[var(--color-surface-hover)]/30 border-t border-[var(--color-border-light)]">
          <p class="text-[12px] text-[var(--color-text-secondary)]">Nenhuma sessão ativa encontrada.</p>
        </div>
      `;
    }

    return `
      <div class="border-t border-[var(--color-border-light)] divide-y divide-[var(--color-border-light)] bg-[var(--dropdown-bg-alpha)] backdrop-blur-2xl animate-dropdown-slide relative overflow-hidden">
        <!-- Subtle inner glow for consistency with dropdown -->
        <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--dropdown-glow)] to-transparent opacity-50"></div>
        
        ${sessions.map(session => `
          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3 animate-fadein">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text)] shrink-0 shadow-sm">
                ${session.deviceType === 'mobile'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#D97757]"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#D97757]"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`
      }
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-[13px] text-[var(--color-text)] font-semibold truncate">${session.deviceName}</p>
                  ${session.isCurrent ? '<span class="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-wider shrink-0">Este dispositivo</span>' : ''}
                </div>
                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                  <p class="text-[11px] text-[var(--color-text-secondary)] font-mono">${session.ip}</p>
                  <span class="w-0.5 h-0.5 rounded-full bg-[var(--color-border)]"></span>
                  <p class="text-[11px] text-[var(--color-text-secondary)]">Visto ${formatLastSeen(session.lastSeen)}</p>
                </div>
              </div>
            </div>
            ${!session.isCurrent ? `
              <button data-session-id="${session.id}" class="btn-revoke-session shrink-0 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-500/70 hover:text-red-500 hover:bg-red-500/5 transition-all">
                Encerrar
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  return `
    <style>
      @keyframes dropdown-slide {
        from {
          opacity: 0;
          transform: translateY(-12px) scale(0.99);
          filter: blur(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0px);
        }
      }
      .animate-dropdown-slide {
        animation: dropdown-slide 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      }
    </style>

    <div class="w-full animate-fadein">
      <div class="flex items-center justify-between mb-8">
        <div>
          <p class="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#D97757]/70 mb-1">Proteção</p>
          <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Segurança</h2>
        </div>
      </div>

      <!-- Password section -->
      <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden mb-4 shadow-sm" style="isolation: isolate;">
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-light)]">
          <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Acesso</p>
        </div>
        <div class="divide-y divide-[var(--color-border-light)]">
          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
            <div class="min-w-0">
              <p class="text-[13px] text-[var(--color-text)] font-medium">Senha da conta</p>
              <p class="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Atualize sua senha periodicamente</p>
            </div>
            <button id="btn-change-password-sec" class="shrink-0 px-3 sm:px-4 py-1.5 rounded-lg text-[12px] font-medium text-[#D97757] border border-[#D97757]/30 hover:border-[#D97757]/60 hover:bg-[#D97757]/5 transition-all">
              Alterar
            </button>
          </div>
        </div>
      </div>

      <!-- Security -->
      <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm" style="isolation: isolate;">
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-light)]">
          <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Segurança Avançada</p>
        </div>
        <div class="divide-y divide-[var(--color-border-light)]">
          <div class="flex items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-[13px] text-[var(--color-text)] font-medium">Autenticação em dois fatores</p>
                ${is2FAEnabled
      ? '<span class="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">Ativo</span>'
      : '<span class="px-1.5 py-0.5 rounded-md bg-white/5 text-[var(--color-text-secondary)] text-[10px] font-bold uppercase tracking-wider">Desativado</span>'
    }
              </div>
              <p class="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Proteção adicional via app de autenticação</p>
            </div>
            <div class="flex items-center gap-2">
              ${is2FAEnabled ? `
                <button id="btn-2fa-disable" class="shrink-0 px-3 sm:px-4 py-1.5 rounded-lg text-[12px] font-medium text-red-500/80 border border-red-500/20 hover:text-red-500 hover:bg-red-500/10 transition-all">
                  Desativar
                </button>
              ` : ''}
              <button id="btn-2fa-setup" class="shrink-0 px-3 sm:px-4 py-1.5 rounded-lg text-[12px] font-medium ${is2FAEnabled ? 'text-[#D97757] border border-[#D97757]/20 hover:bg-[#D97757]/5' : 'text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'} transition-all">
                ${is2FAEnabled ? 'Reconfigurar' : 'Configurar'}
              </button>
            </div>
          </div>

          <div class="flex flex-col">
            <div class="flex items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
              <div class="min-w-0">
                <p class="text-[13px] text-[var(--color-text)] font-medium">Sessões ativas</p>
                <p class="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Gerencie dispositivos conectados</p>
              </div>
              <button id="btn-manage-sessions" class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all">
                ${isSessionsExpanded ? 'Ocultar' : 'Gerenciar'}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 ${isSessionsExpanded ? 'rotate-180' : ''}">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            ${renderSessionsList()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatLastSeen(lastSeen: any) {
  if (!lastSeen) return 'agora mesmo';

  let date: Date;
  if (lastSeen.toDate) {
    date = lastSeen.toDate();
  } else if (lastSeen instanceof Date) {
    date = lastSeen;
  } else {
    date = new Date(lastSeen);
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} h`;
  if (days === 1) return 'ontem';
  return `em ${date.toLocaleDateString('pt-BR')}`;
}

export function attachSecurityListeners() {
  const btnChangePassword = document.getElementById('btn-change-password-sec');
  if (btnChangePassword && !btnChangePassword.dataset.listener) {
    btnChangePassword.dataset.listener = 'true';
    btnChangePassword.addEventListener('click', () => {
      openChangePasswordModal();
    });
  }

  const btn2FA = document.getElementById('btn-2fa-setup');
  if (btn2FA && !btn2FA.dataset.listener) {
    btn2FA.dataset.listener = 'true';
    btn2FA.addEventListener('click', () => {
      openTwoFactorModal();
    });
  }

  const btnDisable2FA = document.getElementById('btn-2fa-disable');
  if (btnDisable2FA && !btnDisable2FA.dataset.listener) {
    btnDisable2FA.dataset.listener = 'true';
    btnDisable2FA.addEventListener('click', () => {
      openDisableTwoFactorModal();
    });
  }

  const btnManageSessions = document.getElementById('btn-manage-sessions');
  if (btnManageSessions) {
    btnManageSessions.addEventListener('click', () => {
      isSessionsExpanded = !isSessionsExpanded;
      window.dispatchEvent(new CustomEvent('re-render-settings'));
    });
  }

  const revokeButtons = document.querySelectorAll('.btn-revoke-session');
  revokeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const sessionId = (btn as HTMLElement).dataset.sessionId;
      if (sessionId && auth.currentUser) {
        try {
          await revokeSession(auth.currentUser.uid, sessionId);
          toaster.create({ title: "Sessão encerrada", description: "O dispositivo foi desconectado.", type: "success" });
        } catch (e) {
          toaster.create({ title: "Erro", description: "Não foi possível encerrar a sessão.", type: "error" });
        }
      }
    });
  });
}
