import { BrilhoHeader } from '../components/BrilhoHeader';
import { Header, attachHeaderListeners } from '../components/Header';

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
        .animate-fadein { animation: fadein 0.25s ease forwards; }
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
               <!-- Espaço para botões de ação futuros -->
            </div>
          </div>

          <!-- Content Area -->
          <div id="admin-content-area" class="mt-8">
             <!-- Admin content will be rendered here -->
          </div>
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();
}
