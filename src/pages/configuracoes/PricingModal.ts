import { Modal } from '../../components/Modal';

export function openPricingModal() {
    const content = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Free Plan -->
      <div class="p-6 rounded-2xl bg-[var(--color-surface-hover)] border border-[var(--color-border-light)] flex flex-col">
        <div class="mb-4">
          <span class="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-secondary)] opacity-50">Iniciante</span>
          <h3 class="text-[20px] font-bold text-[var(--color-text)] mt-1">Gratuito</h3>
        </div>
        
        <div class="flex items-baseline gap-1 mb-6">
          <span class="text-[14px] text-[var(--color-text-secondary)] font-mono">R$</span>
          <span class="text-[32px] font-bold text-[var(--color-text)] font-mono">0,00</span>
          <span class="text-[12px] text-[var(--color-text-secondary)]">/mês</span>
        </div>

        <ul class="space-y-3 mb-8 flex-1">
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2dd4a0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Controle básico de gastos
          </li>
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2dd4a0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            1 conta bancária conectada
          </li>
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2dd4a0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Relatórios semanais
          </li>
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)] opacity-40">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Inteligência Artificial (IA)
          </li>
        </ul>

        <button type="button" class="w-full py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] text-[12px] font-semibold hover:bg-[var(--color-surface)] transition-all cursor-not-allowed" disabled>
          Plano Atual
        </button>
      </div>

      <!-- Pro Plan -->
      <div class="p-6 rounded-2xl bg-[var(--pt-accent-dim)] border border-[#D97757]/30 flex flex-col relative overflow-hidden">
        <div class="absolute -right-8 -top-8 w-24 h-24 bg-[#D97757]/10 blur-3xl rounded-full"></div>
        
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold tracking-widest uppercase text-[#D97757]">Recomendado</span>
          </div>
          <h3 class="text-[20px] font-bold text-[var(--color-text)] mt-1">Pro</h3>
        </div>
        
        <div class="flex items-baseline gap-1 mb-6">
          <span class="text-[14px] text-[var(--color-text-secondary)] font-mono">R$</span>
          <span class="text-[32px] font-bold text-[var(--color-text)] font-mono">35,90</span>
          <span class="text-[12px] text-[var(--color-text-secondary)]">/mês</span>
        </div>

        <ul class="space-y-3 mb-8 flex-1">
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97757" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            IA Integrada ilimitada
          </li>
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97757" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Lançamentos por Texto
          </li>
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97757" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Consultor Financeiro IA
          </li>
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97757" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Metas e Lembretes
          </li>
          <li class="flex items-center gap-2 text-[12px] text-[var(--color-text)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97757" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Contas Bancárias Ilimitadas
          </li>
        </ul>

        <button type="button" class="w-full py-2.5 rounded-xl bg-[#D97757] text-white text-[12px] font-bold hover:bg-[#E2886A] transition-all shadow-lg shadow-[#D97757]/20">
          Mudar para Pro
        </button>
      </div>
    </div>
  `;

    Modal({
        title: 'Escolha seu plano',
        content: content,
        maxWidth: 'max-w-2xl',
        confirmText: 'Fechar',
        showCancel: false
    });
}
