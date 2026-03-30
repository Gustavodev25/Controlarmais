import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Avvvatars from 'avvvatars-react';
import { openChangePasswordModal } from './ChangePasswordModal';
import { openDeleteAccountModal } from './DeleteAccountModal';

export function ProfileTab(user: any) {
  const displayName = user.displayName || user.name || user.profile?.name || '';
  const displayEmail = user.email || user.profile?.email || '';
  return `
    <div class="w-full animate-fadein">
      <!-- Header row -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <p class="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#D97757]/70 mb-1">Conta</p>
          <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Meu Perfil</h2>
        </div>
      </div>

      <!-- Identity card -->
      <div class="relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden mb-4" style="isolation: isolate;">
        <div class="p-4 sm:p-8 flex items-center gap-4 sm:gap-6">
          <div
            id="settings-profile-avatar-root"
            data-value="${displayEmail || displayName || 'tim@apple.com'}"
            class="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
            style="filter: saturate(0.55) brightness(1.15);"
          ></div>
          <div class="flex flex-col gap-1 min-w-0">
            <h3 class="text-[17px] sm:text-[20px] font-semibold text-[var(--color-text)] tracking-tight truncate">${displayName || displayEmail.split('@')[0] || 'Usuário'}</h3>
            <p class="text-[12px] sm:text-[13px] text-[var(--color-text-secondary)] font-mono truncate">${displayEmail}</p>
          </div>
        </div>
      </div>

      <!-- Info rows -->
      <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden" style="isolation: isolate;">
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
          <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Informações da Conta</p>
          <button id="btn-edit-profile" class="text-[11px] font-medium text-[#D97757]/80 hover:text-[#D97757] transition-colors uppercase tracking-wider">Editar Perfil</button>
        </div>

        <div class="divide-y divide-[var(--color-border-light)]">
          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3 group">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-secondary)]"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <span class="text-[13px] text-[var(--color-text-secondary)] shrink-0">Nome completo</span>
            </div>
            <span class="text-[13px] text-[var(--color-text)] font-medium text-right truncate max-w-[140px] sm:max-w-none">${displayName || displayEmail.split('@')[0] || 'Usuário'}</span>
          </div>

          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3 group">
            <div class="flex items-center gap-3 shrink-0">
              <div class="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-secondary)]"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              </div>
              <span class="text-[13px] text-[var(--color-text-secondary)]">E-mail</span>
            </div>
            <span class="text-[12px] sm:text-[13px] text-[var(--color-text)] font-mono truncate max-w-[150px] sm:max-w-none">${displayEmail}</span>
          </div>

          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3 group">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-secondary)]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <span class="text-[13px] text-[var(--color-text-secondary)] shrink-0">Telefone</span>
            </div>
            <span class="text-[13px] text-[var(--color-text)] font-medium text-right truncate max-w-[140px] sm:max-w-none">${user.phone || user.profile?.phone || 'Não informado'}</span>
          </div>

          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3 group">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-secondary)]"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <span class="text-[13px] text-[var(--color-text-secondary)] shrink-0">CEP</span>
            </div>
            <span class="text-[13px] text-[var(--color-text)] font-medium text-right truncate max-w-[140px] sm:max-w-none">${user.profile?.address?.cep || 'Não informado'}</span>
          </div>

          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3 group">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-secondary)]"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <span class="text-[13px] text-[var(--color-text-secondary)]">Senha</span>
            </div>
            <button id="btn-change-password" class="text-[12px] font-medium text-[#D97757]/80 hover:text-[#D97757] transition-colors whitespace-nowrap">Alterar senha →</button>
          </div>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="mt-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden" style="isolation: isolate;">
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-light)]">
          <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Zona de Perigo</p>
        </div>
        <div class="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[13px] text-[var(--color-text)] font-medium">Encerrar conta</p>
            <p class="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Esta ação é permanente e irreversível.</p>
          </div>
          <button id="btn-delete-account" class="shrink-0 px-3 sm:px-4 py-2 rounded-xl text-[12px] font-medium text-red-400/70 border border-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all">
            Encerrar
          </button>
        </div>
      </div>
    </div>
  `;
}

export function attachProfileListeners(user: any) {
  const profileAvatarRoot = document.getElementById('settings-profile-avatar-root');
  if (profileAvatarRoot && !profileAvatarRoot.dataset.mounted) {
    profileAvatarRoot.dataset.mounted = 'true';
    const val = profileAvatarRoot.getAttribute('data-value') || 'tim@apple.com';
    const rootAv = createRoot(profileAvatarRoot);
    rootAv.render(createElement(Avvvatars, { value: val, size: 72, style: 'shape' }));
  }

  const btnEditProfile = document.getElementById('btn-edit-profile');
  if (btnEditProfile && !btnEditProfile.dataset.listener) {
    btnEditProfile.dataset.listener = 'true';
    btnEditProfile.addEventListener('click', () => {
      import('../../components/CompleteProfileModal').then(m => m.openCompleteProfileModal(user));
    });
  }

  const btnChangePassword = document.getElementById('btn-change-password');
  if (btnChangePassword && !btnChangePassword.dataset.listener) {
    btnChangePassword.dataset.listener = 'true';
    btnChangePassword.addEventListener('click', () => {
      openChangePasswordModal();
    });
  }

  const btnDeleteAccount = document.getElementById('btn-delete-account');
  if (btnDeleteAccount && !btnDeleteAccount.dataset.listener) {
    btnDeleteAccount.dataset.listener = 'true';
    btnDeleteAccount.addEventListener('click', () => {
      openDeleteAccountModal();
    });
  }

}
