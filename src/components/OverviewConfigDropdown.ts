import gsap from 'gsap';

export interface OverviewToggleState {
  salario: boolean;
  vale: boolean;
  assinatura: boolean;
  lembretes: boolean;
}

const STORAGE_KEY = 'overview-config';

export function loadOverviewToggles(userId: string): OverviewToggleState {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { salario: false, vale: false, assinatura: false, lembretes: false };
}

export function saveOverviewToggles(userId: string, state: OverviewToggleState) {
  localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(state));
}

function switchItem(id: string, label: string, checked: boolean, icon: string): string {
  return `
    <label class="ov-cfg-item flex items-center justify-between w-full px-3 py-2.5 rounded-[11px] cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors duration-150 group">
      <div class="flex items-center gap-3">
        <span class="text-[var(--color-text-secondary)] group-hover:opacity-100 transition-colors duration-150 shrink-0 w-4 h-4 flex items-center justify-center">${icon}</span>
        <span class="text-[13px] font-medium text-[var(--color-text)] tracking-[-0.01em] leading-none">${label}</span>
      </div>
      <input type="checkbox" class="ov-toggle sr-only" data-key="${id}" ${checked ? 'checked' : ''} />
      <div class="ov-switch relative w-[34px] h-[18px] rounded-[9px] transition-[background-color] duration-200 shrink-0 cursor-pointer">
        <div class="ov-switch-thumb absolute top-[2px] w-[14px] h-[14px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-[left,background-color] duration-200"></div>
      </div>
    </label>
  `;
}

export function OverviewConfigDropdown(toggles: OverviewToggleState): string {
  const icons = {
    salario: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    vale: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
    assinatura: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>',
    lembretes: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>'
  };

  return `
    <div id="overview-config-menu"
      class="absolute right-0 top-full mt-1 z-[150] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[18px] overflow-hidden flex flex-col will-change-transform"
      style="display:none;opacity:0;transform-origin:top right;width:240px;">
      <div id="overview-config-content" class="p-1.5">
        <div class="px-3 pt-2 pb-1">
          <p class="text-[8px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Previsão</p>
        </div>
        ${switchItem('salario', 'Salário', toggles.salario, icons.salario)}
        ${switchItem('vale', 'Vale', toggles.vale, icons.vale)}
        <div class="mx-3 my-1.5 border-t border-[var(--color-border-light)]"></div>
        <div class="px-3 pt-1 pb-1">
          <p class="text-[8px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Recorrências</p>
        </div>
        ${switchItem('assinatura', 'Assinaturas', toggles.assinatura, icons.assinatura)}
        ${switchItem('lembretes', 'Lembretes', toggles.lembretes, icons.lembretes)}
        <div class="mx-3 my-1.5 border-t border-[var(--color-border-light)]"></div>
        <button id="btn-goto-financeiro" class="flex items-center gap-3 w-full px-3 py-2.5 rounded-[11px] cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors duration-150 group text-left">
          <span class="text-[var(--color-text-secondary)] group-hover:text-[#D97757] transition-colors duration-150 shrink-0 w-4 h-4 flex items-center justify-center">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </span>
          <span class="text-[13px] font-medium text-[var(--color-text)] tracking-[-0.01em] leading-none group-hover:text-[#D97757] transition-colors duration-150">Financeiro</span>
          <svg class="ml-auto text-[var(--color-text-secondary)]/40 group-hover:text-[#D97757]/60 group-hover:translate-x-0.5 transition-all duration-150" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  `;
}

export function attachOverviewConfigListeners(
  onToggle: (key: string, value: boolean) => void
) {
  const trigger = document.getElementById('overview-config-trigger');
  const menu = document.getElementById('overview-config-menu');
  const content = document.getElementById('overview-config-content');
  if (!trigger || !menu || !content) return;

  let isOpen = false;
  let animation: gsap.core.Timeline | null = null;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    if (animation) animation.kill();

    const items = menu.querySelectorAll('.ov-cfg-item');
    gsap.set(menu, { display: 'flex' });

    const card = trigger.closest('.overview-card') as HTMLElement;
    if (card) card.style.zIndex = '50';

    animation = gsap.timeline();

    animation.fromTo(menu,
      { scaleX: 0.8, scaleY: 0.5, y: -15, opacity: 0, borderRadius: '35px' },
      { scaleX: 1, scaleY: 1, y: 0, opacity: 1, borderRadius: '18px', duration: 0.8, ease: 'elastic.out(1.15, 0.4)', clearProps: 'transform' },
      0
    );

    animation.fromTo(content,
      { opacity: 0, filter: 'blur(6px)', scale: 0.95 },
      { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 0.35, ease: 'power2.out' },
      0.05
    );

    animation.fromTo(items,
      { opacity: 0, x: 10 },
      { opacity: 1, x: 0, stagger: 0.03, duration: 0.35, ease: 'power3.out', clearProps: 'all' },
      0.1
    );

    trigger.classList.add('active');
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    if (animation) animation.kill();

    animation = gsap.timeline({
      onComplete: () => { 
        gsap.set(menu, { display: 'none' }); 
        const card = trigger.closest('.overview-card') as HTMLElement;
        if (card) card.style.zIndex = '10';
      }
    });

    animation.to(content, { opacity: 0, filter: 'blur(4px)', duration: 0.15, ease: 'power2.in' }, 0);
    animation.to(menu,
      { scaleX: 0.85, scaleY: 0.5, y: -10, opacity: 0, borderRadius: '30px', duration: 0.22, ease: 'power3.in' },
      0.05
    );

    trigger.classList.remove('active');
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) close(); else open();
  });

  // Toggle switch listeners — do NOT close the dropdown
  menu.querySelectorAll<HTMLInputElement>('.ov-toggle').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.key;
      if (!key) return;
      onToggle(key, input.checked);
    });
  });

  // Shortcut button: navigate to Financeiro settings
  const btnGotoFinanceiro = document.getElementById('btn-goto-financeiro');
  btnGotoFinanceiro?.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'settings', tab: 'financeiro' } }));
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !menu.contains(e.target as Node) && !trigger.contains(e.target as Node)) {
      close();
    }
  });
}
