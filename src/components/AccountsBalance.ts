import { gsap } from 'gsap';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Bank dots animation ───────────────────────────────────────
const DOT_SIZE = 36;
const OVERLAP = 11;
const SPREAD_GAP = 6;
let _dotsExpanded = false;

function stackLeft(i: number) { return i * (DOT_SIZE - OVERLAP); }
function spreadLeft(i: number) { return i * (DOT_SIZE + SPREAD_GAP); }
function stackWidth(n: number) { return n > 0 ? (n - 1) * (DOT_SIZE - OVERLAP) + DOT_SIZE : 0; }
function spreadWidth(n: number) { return n > 0 ? (n - 1) * (DOT_SIZE + SPREAD_GAP) + DOT_SIZE : 0; }

function expandDots(wrap: HTMLElement) {
  if (_dotsExpanded) return;
  _dotsExpanded = true;

  const dots = wrap.querySelectorAll<HTMLElement>('.bank-dot');
  const count = dots.length;

  gsap.to(wrap, { width: spreadWidth(count), duration: 0.4, ease: 'expo.out' });

  dots.forEach((d, i) => {
    gsap.set(d, { zIndex: 10 + i });
    gsap.to(d, {
      left: spreadLeft(i),
      y: -4,
      scale: 1.07,
      boxShadow: '0 6px 20px rgba(0,0,0,.65)',
      duration: 0.45,
      delay: i * 0.035,
      ease: 'expo.out',
    });
    const tip = d.querySelector<HTMLElement>('.bank-dot-tip');
    if (tip) {
      gsap.to(tip, {
        opacity: 1,
        y: 0,
        duration: 0.22,
        delay: 0.1 + i * 0.04,
        ease: 'power2.out',
      });
    }
  });
}

function collapseDots(wrap: HTMLElement) {
  if (!_dotsExpanded) return;
  _dotsExpanded = false;

  const dots = wrap.querySelectorAll<HTMLElement>('.bank-dot');
  const count = dots.length;

  gsap.to(wrap, { width: stackWidth(count), duration: 0.38, delay: 0.05, ease: 'expo.out' });

  dots.forEach((d, i) => {
    d.style.zIndex = String(count - i);
    const tip = d.querySelector<HTMLElement>('.bank-dot-tip');
    if (tip) gsap.to(tip, { opacity: 0, duration: 0.1 });
    gsap.to(d, {
      left: stackLeft(i),
      y: 0,
      scale: 1,
      boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
      duration: 0.38,
      delay: (dots.length - 1 - i) * 0.03,
      ease: 'expo.out',
    });
  });
}

function attachDotHovers(wrap: HTMLElement) {
  wrap.querySelectorAll<HTMLElement>('.bank-dot').forEach(dot => {
    dot.addEventListener('mouseenter', () => {
      if (!_dotsExpanded) return;
      gsap.to(dot, { y: -8, scale: 1.14, duration: 0.25, ease: 'power3.out', overwrite: 'auto' });
    });
    dot.addEventListener('mouseleave', () => {
      if (!_dotsExpanded) return;
      gsap.to(dot, { y: -4, scale: 1.07, duration: 0.4, ease: 'elastic.out(1,.5)', overwrite: 'auto' });
    });
  });
}

export function animateBankDotsEntrance() {
  const dots = document.querySelectorAll<HTMLElement>('.bank-dot');
  if (!dots.length) return;
  dots.forEach((d, i) => {
    gsap.set(d, { y: 18, opacity: 0, scale: 0.6, rotation: -8 });

    const tl = gsap.timeline({ delay: 0.15 + i * 0.06 });

    // Fase 1: Surge de baixo com deformação líquida
    tl.to(d, {
      y: -5,
      opacity: 1,
      scale: 1.12,
      scaleX: 0.92,
      scaleY: 1.1,
      rotation: 3,
      duration: 0.3,
      ease: 'power3.out',
    });

    // Fase 2: Settle elástico com squash
    tl.to(d, {
      y: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      duration: 0.6,
      ease: 'elastic.out(1.3, 0.4)',
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Animação de Entrada Líquida do Card Saldo em Contas
───────────────────────────────────────────────────────────────────────────── */

export function animateAccountsCardEntrance() {
  const card = document.querySelector<HTMLElement>('.accounts-balance-card');
  if (!card) return;

  // Inject hover CSS once
  if (!document.getElementById('accounts-hover-style')) {
    const style = document.createElement('style');
    style.id = 'accounts-hover-style';
    style.textContent = `
      .accounts-balance-inner {
        transition: border-color 0.35s ease;
      }
      .accounts-balance-card:hover .accounts-balance-inner {
        border-color: rgba(255,255,255,0.1);
      }
    `;
    document.head.appendChild(style);
  }

  const inner = card.querySelector<HTMLElement>('.accounts-balance-inner');
  const balanceRow = card.querySelector<HTMLElement>('.accounts-balance-amount');
  const subtitle = card.querySelector<HTMLElement>('.accounts-balance-subtitle');
  const header = card.querySelector<HTMLElement>('.accounts-balance-header');

  gsap.killTweensOf([card, inner, balanceRow, subtitle, header].filter(Boolean));

  const tl = gsap.timeline();

  // 1. Card surge com deformação líquida
  if (inner) {
    tl.fromTo(inner,
      { scaleX: 1.04, scaleY: 0.87, opacity: 0, y: 22, borderRadius: '20px' },
      { scaleX: 0.97, scaleY: 1.04, opacity: 1, y: -4, borderRadius: '14px', duration: 0.28, ease: 'power3.out' },
      0
    );
    tl.to(inner, {
      scaleX: 1, scaleY: 1, y: 0, borderRadius: '16px',
      duration: 0.6, ease: 'elastic.out(1.2, 0.4)', clearProps: 'transform,borderRadius'
    });
  }

  // 2. Header desliza
  if (header) {
    tl.fromTo(header,
      { opacity: 0, y: -6, filter: 'blur(5px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.26, ease: 'power2.out', clearProps: 'all' },
      0.06
    );
  }

  // 3. Valor — R$ e dígitos surgem separados com cascade
  if (balanceRow) {
    const currency = balanceRow.querySelector('span:first-child');
    const digits = balanceRow.querySelector('#total-accounts-balance');
    const els = [currency, digits].filter(Boolean);

    if (els.length >= 2) {
      gsap.set(els, { opacity: 0, y: 10, filter: 'blur(8px)' });
      tl.to(els, {
        opacity: 1, y: 0, filter: 'blur(0px)',
        duration: 0.3, stagger: 0.05, ease: 'power2.out', clearProps: 'all'
      }, 0.1);
      tl.fromTo(balanceRow,
        { scaleX: 0.91, scaleY: 1.09 },
        { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.15, 0.42)', clearProps: 'all' },
        0.1
      );
    } else {
      tl.fromTo(balanceRow,
        { opacity: 0, y: 12, scaleX: 0.9, scaleY: 1.1, filter: 'blur(8px)' },
        { opacity: 1, y: -2, scaleX: 1.02, scaleY: 0.98, filter: 'blur(0px)', duration: 0.28, ease: 'power3.out' },
        0.12
      );
      tl.to(balanceRow, { y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.15, 0.42)', clearProps: 'all' });
    }
  }

  // 4. Subtítulo
  if (subtitle) {
    tl.fromTo(subtitle,
      { opacity: 0, y: 5, filter: 'blur(3px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.25, ease: 'power2.out', clearProps: 'all' },
      0.2
    );
  }

  // 5. Border glow flash + shadow pump
  if (inner) {
    tl.fromTo(inner,
      { boxShadow: '0 1px 3px -1px rgba(0,0,0,0.05)', borderColor: 'rgba(217,119,87,0.15)' },
      { boxShadow: '0 8px 24px -4px rgba(0,0,0,0.3), 0 2px 8px -2px rgba(0,0,0,0.15)', borderColor: 'rgba(28,28,28,1)', duration: 0.45, ease: 'power2.out', clearProps: 'boxShadow,borderColor' },
      0.05
    );
  }

  return tl;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Animação Líquida de Troca de Saldo (quando toggle de contas muda)
───────────────────────────────────────────────────────────────────────────── */

export function animateBalanceChange(newBalance: number) {
  const balanceEl = document.getElementById('total-accounts-balance');
  const card = document.querySelector<HTMLElement>('.accounts-balance-inner');
  if (!balanceEl) return;

  const currentText = balanceEl.innerText.replace(/\./g, '').replace(',', '.');
  const currentValue = parseFloat(currentText) || 0;
  const targetValue = newBalance;
  const isIncrease = targetValue > currentValue;

  const counter = { value: currentValue };

  const tl = gsap.timeline();

  // 1. Card micro-pulse — direção depende se aumentou ou diminuiu
  if (card) {
    const pulseX = isIncrease ? 1.006 : 0.994;
    const pulseY = isIncrease ? 0.996 : 1.004;
    tl.to(card, { scaleX: pulseX, scaleY: pulseY, duration: 0.12, ease: 'power2.out' }, 0);
    tl.to(card, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.08, 0.48)', clearProps: 'transform' });
  }

  // 2. Número squash — comprime antes de rolar
  tl.to(balanceEl, {
    scaleX: 0.94, scaleY: 1.08, filter: 'blur(1.5px)', opacity: 0.75,
    duration: 0.1, ease: 'power2.in',
  }, 0);

  // 3. Counter rola suave — desaceleração natural
  tl.to(counter, {
    value: targetValue,
    duration: 0.55,
    ease: 'power3.out',
    onUpdate: () => { balanceEl.innerText = formatCurrency(counter.value); }
  }, 0.06);

  // 4. Número overshoot → settle
  tl.to(balanceEl, {
    scaleX: 1.03, scaleY: 0.96, filter: 'blur(0px)', opacity: 1,
    duration: 0.18, ease: 'power3.out',
  }, 0.1);
  tl.to(balanceEl, {
    scaleX: 1, scaleY: 1,
    duration: 0.5, ease: 'elastic.out(1.15, 0.4)', clearProps: 'all'
  });

  return tl;
}

export function attachBankDotsHover() {
  _dotsExpanded = false;
  const wrap = document.getElementById('bank-dots-stack');
  if (!wrap) return;

  const count = wrap.querySelectorAll('.bank-dot').length;
  wrap.style.width = stackWidth(count) + 'px';

  // Evita adicionar múltiplos listeners se a função for chamada novamente
  if (wrap.dataset.listenersAttached === 'true') return;
  wrap.dataset.listenersAttached = 'true';

  wrap.addEventListener('mouseenter', () => {
    expandDots(wrap);
    setTimeout(() => attachDotHovers(wrap), 50);
  });
  wrap.addEventListener('mouseleave', (e) => {
    if (!wrap.contains(e.relatedTarget as Node)) collapseDots(wrap);
  });
}

// ─── Dropdown ─────────────────────────────────────────────────
export function AccountsDropdown(accounts: any[], activeIds: Set<string>): string {
  const items = accounts.map(acc => {
    const isActive = activeIds.has(acc.id);
    const institutionName = acc.institution?.name || 'Banco';
    const institutionLogo = acc.institution?.imageUrl || '/assets/logo/logo.png';
    const accountName = acc.name || (acc.type === 'SAVINGS' ? 'Poupança' : 'Conta Corrente');

    return `
      <div class="account-select-item flex items-center justify-between px-3 py-2 rounded-[14px] hover:bg-white/5 cursor-pointer transition-all group" data-account-id="${acc.id}">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 border border-white/10 transition-transform group-hover:scale-105">
            <img src="${institutionLogo}" onerror="this.src='/assets/logo/logo.png'" class="w-full h-full object-contain" />
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-[12px] font-semibold ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'} group-hover:text-[var(--color-text)] transition-colors truncate">${institutionName}</span>
            <span class="text-[10px] text-[var(--color-text-secondary)] opacity-40 truncate">${accountName}${acc.type === 'SAVINGS' && acc.number ? ` · ${acc.number}` : ''}</span>
          </div>
        </div>
        <div class="flex items-center gap-2.5 shrink-0 ml-3">
          <span class="text-[11px] font-bold ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'} transition-colors">R$ ${formatCurrency(acc.balance || 0)}</span>
          <div class="w-1.5 h-1.5 rounded-full transition-all ${isActive ? 'bg-[#D97757] scale-100' : 'bg-white/10 scale-0'}"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div id="accounts-dropdown-menu" class="absolute right-0 top-full mt-1 z-[9999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[22px] overflow-hidden flex flex-col will-change-transform shadow-2xl hidden opacity-0" style="transform-origin: top right; width: 280px; max-width: calc(100vw - 24px);">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px" style="background: linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%);"></div>
      <div id="accounts-dropdown-content" class="p-1.5 max-h-[380px] overflow-y-auto no-scrollbar space-y-0.5">
        ${items.length > 0 ? items : '<p class="text-[11px] text-center py-8 text-[var(--color-text-secondary)] opacity-50">Nenhuma conta encontrada</p>'}
      </div>
    </div>
  `;
}

export function BankDotsStack(cashAccounts: any[], activeAccountIds: Set<string>): string {
  const activeAccounts = cashAccounts.filter(acc => activeAccountIds.has(acc.id));
  const uniqueBanks = Array.from(
    new Map(activeAccounts.map(acc => [acc.institution?.id || acc.institution?.name, acc.institution])).values()
  );

  return uniqueBanks.map((bank, i) => `
    <div
      class="bank-dot"
      style="
        position: absolute;
        left: ${stackLeft(i)}px;
        top: 1px;
        width: ${DOT_SIZE}px;
        height: ${DOT_SIZE}px;
        border-radius: 50%;
        border: 2px solid var(--color-surface);
        box-sizing: border-box; /* IMPEDE que a borda deforme o tamanho da bolinha */
        z-index: ${uniqueBanks.length - i};
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        will-change: transform;
        cursor: pointer; /* Pointer indica que há interação */
      "
    >
      <div style="
        width: 100%; height: 100%; border-radius: 50%;
        background: #FFFFFF;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden; position: relative;
      ">
        <img
          src="${bank?.imageUrl || '/assets/logo/logo.png'}"
          onerror="this.src='/assets/logo/logo.png'"
          style="
            width: 60%; 
            height: 60%; 
            object-fit: contain; 
            pointer-events: none; /* Evita ghosting ao clicar e arrastar */
            user-select: none;
          "
        />
        <div style="
          position: absolute; inset: 0; border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%, rgba(0,0,0,0.05) 100%);
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.15);
          pointer-events: none;
        "></div>
      </div>
      
      <div
        class="bank-dot-tip"
        style="
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: rgba(20,20,20,0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 500;
          color: #FFFFFF;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        "
      >${bank?.name || 'Banco'}</div>
    </div>
  `).join('');
}

// ─── AccountsBalance ──────────────────────────────────────────
export function AccountsBalance(
  cashAccounts: any[] = [],
  activeAccountIds: Set<string> = new Set(),
  totalBalance: number = 0
): string {
  const activeAccounts = cashAccounts.filter(acc => activeAccountIds.has(acc.id));
  const uniqueBanksCount = new Set(activeAccounts.map(acc => acc.institution?.id || acc.institution?.name)).size;

  return `
    <div class="accounts-balance-card h-full" style="position:relative; overflow:visible; z-index: 10;">
    <div class="accounts-balance-inner bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-col h-full min-h-[145px] overflow-visible" style="will-change:transform; transform-origin:center center;">
      <div class="accounts-balance-header px-3.5 py-2 border-b border-[var(--color-border-light)] bg-[var(--color-surface-hover)] rounded-t-2xl flex items-center justify-between">
        <p class="text-[9px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Saldo em Contas</p>
        <div class="relative">
          <button id="dashboard-accounts-filter-trigger" class="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors group">
            <span class="text-[10px] font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)] transition-colors">
              ${activeAccountIds.size} ${activeAccountIds.size === 1 ? 'conta' : 'contas'}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)] transition-colors"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          ${AccountsDropdown(cashAccounts, activeAccountIds)}
        </div>
      </div>
      <div class="px-3.5 py-4 flex flex-col justify-center flex-1 overflow-visible">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col min-w-0">
            <div class="accounts-balance-amount flex items-baseline gap-1" style="will-change:transform; transform-origin:left center;">
              <span class="text-[12px] md:text-[14px] font-medium text-[var(--color-text-secondary)]">R$</span>
              <span id="total-accounts-balance" class="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[var(--color-text)] truncate" style="will-change:transform; display:inline-block; transform-origin:left center;">${formatCurrency(totalBalance)}</span>
            </div>
            <p class="accounts-balance-subtitle text-[11px] md:text-[12px] text-[var(--color-text-secondary)] mt-1 truncate">Saldo total disponível consolidado</p>
          </div>
          <div
            id="bank-dots-stack"
            class="shrink-0"
            style="
              position: relative;
              height: ${DOT_SIZE + 2}px;
              width: ${stackWidth(uniqueBanksCount)}px;
            "
          >
            ${BankDotsStack(cashAccounts, activeAccountIds)}
          </div>
        </div>
      </div>
    </div>
    </div>
  `;
}


// ─── attachAccountsListeners ──────────────────────────────────
export function attachAccountsListeners(
  userUid: string,
  activeAccountIds: Set<string>,
  updateView: () => void
) {
  const trigger = document.getElementById('dashboard-accounts-filter-trigger');
  const menu = trigger?.parentElement?.querySelector<HTMLElement>('#accounts-dropdown-menu');
  if (!trigger || !menu) return;

  document.querySelectorAll<HTMLElement>('body > #accounts-dropdown-menu').forEach(existingMenu => {
    if (existingMenu !== menu) existingMenu.remove();
  });

  const card = trigger.closest('.accounts-balance-card') as HTMLElement | null;
  const menuWidth = Number.parseFloat(menu.style.width || '') || 280;
  const viewportPadding = 12;
  const viewportGap = 6;

  const syncMenuPosition = () => {
    if (!trigger.isConnected || !menu.isConnected) return;

    const rect = trigger.getBoundingClientRect();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
    const desiredLeft = rect.right - menuWidth;
    const left = Math.min(Math.max(desiredLeft, viewportPadding), maxLeft);
    const origin = left <= viewportPadding ? 'top left' : 'top right';

    menu.style.top = `${rect.bottom + viewportGap}px`;
    menu.style.left = `${left}px`;
    menu.style.width = `${menuWidth}px`;
    menu.style.transformOrigin = origin;
  };

  const handleViewportChange = () => {
    if (isOpen) syncMenuPosition();
  };

  menu.classList.remove('absolute', 'right-0', 'top-full', 'mt-1');
  menu.classList.add('fixed');
  menu.style.position = 'fixed';
  menu.style.right = 'auto';
  menu.style.bottom = 'auto';
  menu.style.marginTop = '0px';
  menu.style.zIndex = '9999';
  document.body.appendChild(menu);

  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);

  // ── bank dots ──
  attachBankDotsHover();        // registra wrap primeiro
  animateBankDotsEntrance();    // aí anima (opacity 0 → 1)

  // ── dropdown ──
  let isOpen = false;
  let animation: gsap.core.Timeline | null = null;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    if (animation) animation.kill();

    const items = menu.querySelectorAll('.account-select-item');
    const content = document.getElementById('accounts-dropdown-content');

    syncMenuPosition();

    gsap.set(menu, {
      display: 'flex',
      opacity: 1,
      scaleX: 0.12,
      scaleY: 0.04,
      y: -10,
      borderRadius: '100px',
      transformOrigin: menu.style.transformOrigin || 'top right',
    });
    if (content) gsap.set(content, { opacity: 0, scale: 0.85, y: -10, filter: 'blur(10px)' });
    gsap.set(items, { opacity: 0, y: 16, x: -8, scale: 0.88, filter: 'blur(10px)' });

    if (card) {
      card.dataset.oldZ = card.style.zIndex;
      card.style.zIndex = '120';
    }

    animation = gsap.timeline();

    // Fase 1: Bolha expande — primeiro estica na horizontal (blob-like)
    animation.to(menu, { scaleX: 1.04, scaleY: 0.6, y: -4, borderRadius: '28px', duration: 0.18, ease: 'power3.out' });
    // Fase 2: Resolve com elastic na vertical
    animation.to(menu, { scaleX: 1, scaleY: 1, y: 0, borderRadius: '18px', duration: 0.6, ease: 'elastic.out(1.15, 0.5)' });

    if (content) animation.to(content, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.3, ease: 'power3.out' }, '-=0.55');

    // Items surgem com wave stagger
    animation.to(items, {
      opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)',
      stagger: { each: 0.04, ease: 'power1.in' },
      duration: 0.5,
      ease: 'power4.out'
    }, '-=0.45');

    trigger.classList.add('bg-white/10');
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    if (animation) animation.kill();

    const content = document.getElementById('accounts-dropdown-content');

    animation = gsap.timeline({
      onComplete: () => {
        gsap.set(menu, { display: 'none' });
        if (card) card.style.zIndex = card.dataset.oldZ || '10';
      }
    });

    // Conteúdo dissolve primeiro
    if (content) {
      animation.to(content, { opacity: 0, y: -6, scale: 0.94, filter: 'blur(6px)', duration: 0.12, ease: 'power2.in' }, 0);
    }

    // Menu colapsa com efeito líquido — primeiro comprime vertical, depois encolhe
    animation.to(menu, { scaleY: 0.5, borderRadius: '28px', duration: 0.12, ease: 'power2.in' }, 0.04);
    animation.to(menu, { scaleX: 0.12, scaleY: 0.04, y: -10, borderRadius: '100px', opacity: 0, duration: 0.22, ease: 'back.in(1.8)' });

    trigger.classList.remove('bg-white/10');
  };

  trigger.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    isOpen ? close() : open();
  });

  document.querySelectorAll('.account-select-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = item.getAttribute('data-account-id');
      if (!id) return;

      // Liquid pulse no item clicado
      const el = item as HTMLElement;
      gsap.timeline()
        .to(el, { scaleX: 0.96, scaleY: 1.03, duration: 0.1, ease: 'power2.in' })
        .to(el, { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.4)' });

      if (activeAccountIds.has(id)) activeAccountIds.delete(id);
      else activeAccountIds.add(id);
      localStorage.setItem(`active-accounts-${userUid}`, JSON.stringify(Array.from(activeAccountIds)));
      updateView();
    });
  });

  const closeMenu = (e: MouseEvent) => {
    if (isOpen && !menu.contains(e.target as Node) && !trigger.contains(e.target as Node)) close();
  };
  document.addEventListener('click', closeMenu);

  const observer = new MutationObserver(() => {
    if (trigger.isConnected) return;

    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('scroll', handleViewportChange, true);
    document.removeEventListener('click', closeMenu);
    if (menu.isConnected) menu.remove();
    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}