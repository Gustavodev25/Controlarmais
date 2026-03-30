import { GenericDropdown } from './GenericDropdown';
import { gsap } from 'gsap';
import { hideAllTooltips } from './Tooltip';

/* ─────────────────────────────────────────────────────────────────────────────
   Interfaces
───────────────────────────────────────────────────────────────────────────── */

export interface CardInfo {
  id: string;
  name: string;
  brand: string;
  faturaAtual: number;
  faturaUltima: number;
  faturaHistorico: number;
  includeInExpenses: boolean;
  disponivel: number;
  limite: number;
  percentualUso: number;
  institution?: any;
}

export type CreditCardSelectionType = 'current' | 'last' | 'history';

export interface WebCrediCardSummary {
  cards: CardInfo[];
  activeCardIndex: number;
  faturaSelecionada: CreditCardSelectionType;
  totFatura: number;
  totUltima: number;
  totHistorico: number;
  isLoading?: boolean;
}

export interface DragState {
  active: boolean;
  startX: number;
  lastX: number;
  velocityX: number;
  lastTime: number;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Constants & CSS (EMPILHAMENTO PREMIUM & MINIMALISTA)
───────────────────────────────────────────────────────────────────────────── */

// Distâncias aumentadas para criar um empilhamento em cascata bem definido
const STACK = {
  d1: { y: 18, scale: 0.92, opacity: 0.75 },  // 2º Cartão bem mais para baixo e contido
  d2: { y: 36, scale: 0.84, opacity: 0.4 },  // 3º Cartão quase como uma sombra suave
} as const;

// Constantes ajustadas para um arrasto mais curto e pesado
const DRAG_TENSION = 55;
const DRAG_ROTATION = 0.035;
export const DRAG_THRESHOLD = 35;
export const VELOCITY_THRESHOLD = 0.38;

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getCardValueBySelection(card: CardInfo, selection: CreditCardSelectionType): number {
  if (selection === 'current') return card.faturaAtual;
  if (selection === 'last') return card.faturaUltima;
  return card.faturaHistorico;
}

export function getIncludedCreditCardExpenseTotal(
  ccSummary: WebCrediCardSummary,
  selection: CreditCardSelectionType = ccSummary.faturaSelecionada
): number {
  return ccSummary.cards
    .filter(card => card.includeInExpenses)
    .reduce((sum, card) => sum + getCardValueBySelection(card, selection), 0);
}

export const CARD_STACK_CSS = `
  <style id="card-stack-style">
    /* ── Wrapper ─────────────────────────────────────────────── */
    .cc-stack-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 145px;
      overflow: visible;
      perspective: 1200px;
      perspective-origin: 50% -20%;
    }

    /* ── Card base ───────────────────────────────────────────── */
    .cc-card-item {
      position: absolute;
      inset: 0;
      border-radius: 16px;
      will-change: transform, opacity, filter;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      transform-origin: 50% 0%;
      -webkit-tap-highlight-color: transparent;
      touch-action: none; 
    }
    .cc-card-item:active { cursor: grabbing; }

    /* Profundidades iniciais calibradas */
    .cc-card-item[data-depth="1"] {
      transform: translateY(${STACK.d1.y}px) scale(${STACK.d1.scale});
      opacity: ${STACK.d1.opacity};
      pointer-events: none;
      z-index: 18;
    }
    .cc-card-item[data-depth="2"] {
      transform: translateY(${STACK.d2.y}px) scale(${STACK.d2.scale});
      opacity: ${STACK.d2.opacity};
      pointer-events: none;
      z-index: 17;
    }
    .cc-card-item[data-depth="3+"] {
      transform: translateY(70px) scale(0.70);
      opacity: 0;
      pointer-events: none;
      z-index: 16;
    }

    /* ── Superfície do card ──────────────────────────────────── */
    .cc-card-inner {
      width: 100%;
      height: 100%;
      border-radius: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      backdrop-filter: none;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      padding: 12px 14px 10px;
      position: relative;
      transform: translateZ(0);
      transform-origin: center;
      transition: border-color 0.25s ease;
    }

    .cc-card-item.is-dragging .cc-card-inner {
      transition: none;
      will-change: transform, border-radius, box-shadow;
    }

    /* Hover breathing — só no card ativo */
    .cc-card-item[data-depth="0"]:not(.is-dragging) .cc-card-inner {
      transition: border-color 0.35s ease;
    }
    .cc-card-item[data-depth="0"]:not(.is-dragging):hover .cc-card-inner {
      border-color: var(--color-border-light);
    }

    /* ── Bank Logo ───────────────────────────────────────────── */
    .cc-bank-logo {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: white;
      border: 1px solid rgba(0,0,0,0.1);
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .cc-bank-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* ── Conteúdo ────────────────────────────────────────────── */
    .cc-card-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }

    .cc-amount-row {
      display: flex;
      align-items: baseline;
      gap: 3px;
    }

    .cc-amount-currency { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); line-height: 1; }
    .cc-amount-integer { font-size: 26px; font-weight: 700; color: var(--color-text); letter-spacing: -0.03em; line-height: 1; }
    .cc-amount-decimal { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }

    .cc-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
    .cc-label { font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-secondary); }

    /* ── Progress bar ────────────────────────────────────────── */
    .cc-progress-wrap { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
    .cc-progress-track { height: 6px; background: var(--color-border); border-radius: 99px; overflow: hidden; }
    .cc-progress-fill {
      height: 100%; border-radius: 99px; background: linear-gradient(90deg, #C96A3A 0%, #E08050 100%);
      box-shadow: 0 0 6px rgba(217,119,87,0.45); transition: width 0.7s cubic-bezier(0.16,1,0.3,1); transform-origin: left center;
    }
    .cc-progress-labels { display: flex; justify-content: space-between; font-size: 10px; font-weight: 500; color: var(--color-text-secondary); }


    /* ── Loader & Empty State ───────────────────────────────── */
    .cc-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; height: 100%; animation: cc-fade-in 0.4s ease forwards; }
    .cc-spinner { width: 24px; height: 24px; border: 2px solid var(--color-border); border-top-color: var(--color-text-secondary); border-radius: 50%; animation: cc-spin 0.8s linear infinite; }
    
    @keyframes cc-spin { to { transform: rotate(360deg); } }
    @keyframes cc-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  </style>
`;

/* ─────────────────────────────────────────────────────────────────────────────
   Render helpers
───────────────────────────────────────────────────────────────────────────── */

export function renderCardItem(
  card: CardInfo,
  idx: number,
  activeIdx: number,
  ccSummary: WebCrediCardSummary
): string {
  const depth = idx - activeIdx;
  if (depth < 0 || depth > 3) return '';

  const depthAttr = depth === 0 ? '0' : depth === 1 ? '1' : depth === 2 ? '2' : '3+';
  const isActive = depth === 0;

  const { faturaSelecionada } = ccSummary;
  const cardValor = getCardValueBySelection(card, faturaSelecionada);
  const currentExpenseTotal = getIncludedCreditCardExpenseTotal(ccSummary, 'current');
  const lastExpenseTotal = getIncludedCreditCardExpenseTotal(ccSummary, 'last');
  const historyExpenseTotal = getIncludedCreditCardExpenseTotal(ccSummary, 'history');

  const [resReais, resCentavos] = formatCurrency(Math.abs(cardValor)).split(',');

  const labelFatura =
    faturaSelecionada === 'current' ? 'Fatura atual' :
      faturaSelecionada === 'last' ? 'Última fatura' :
        'Limite utilizado';

  const selectionLabel =
    faturaSelecionada === 'current' ? 'Atual' :
      faturaSelecionada === 'last' ? 'Última' :
        'Histórico';

  const expenseToggleLabel = card.includeInExpenses ? 'Ocultar em Despesa' : 'Incluir em Despesa';
  const expenseToggleIcon = card.includeInExpenses
    ? '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-7 0-1.151.934-2.808 2.485-4.26m3.02-2.064A9.956 9.956 0 0112 5c5.523 0 10 4.477 10 7 0 1.537-1.65 3.473-4.147 4.76M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 9L3 3"/></svg>'
    : '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.27 2.943 9.543 7-1.273 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';

  const dotsHTML = '';

  return `
    <div class="cc-card-item"
         data-card-index="${idx}"
         data-depth="${depthAttr}"
         data-last-expense-total="${lastExpenseTotal}"
         style="z-index: ${20 - depth}; ${isActive ? '' : 'pointer-events: none;'}">
      <div class="cc-card-inner">
        <div class="cc-card-content" style="opacity: ${isActive ? 1 : 0.1}; will-change: opacity;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2.5">
                  ${card.institution?.imageUrl ? `
                    <div class="cc-bank-logo">
                      <img src="${card.institution.imageUrl}" alt="${card.institution.name || 'Banco'}" />
                    </div>
                  ` : ''}
                  <span class="text-[12px] font-bold text-white opacity-60 uppercase tracking-tight leading-none">${card.name}</span>
                </div>
                <div class="cc-amount-row mt-0.5">
                  <span class="cc-amount-currency">R$</span>
                  <span class="cc-amount-integer">${resReais}</span>
                  <span class="cc-amount-decimal">,${resCentavos}</span>
                </div>
              </div>
              ${isActive ? `
                <div class="relative inline-block text-left" style="z-index:50; pointer-events: auto;">
                  <button id="dashboard-cc-filter-trigger"
                    class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-[9px] font-bold text-white/50 uppercase tracking-wider">
                    <span>${selectionLabel}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  ${GenericDropdown({
    id: 'dashboard-cc-filter',
    width: '230px',
    items: [
      { id: 'filter-cc-current', label: 'Fatura Atual', sublabel: `Total: R$ ${formatCurrency(card.faturaAtual)}`, icon: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
      { id: 'filter-cc-last', label: 'Última Fatura', sublabel: `Total: R$ ${formatCurrency(card.faturaUltima)}`, icon: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>' },
      { id: 'filter-cc-history', label: 'Limite Usado', sublabel: `Total: R$ ${formatCurrency(card.faturaHistorico)}`, icon: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>' },
      { id: 'filter-cc-toggle-expense', label: expenseToggleLabel, icon: expenseToggleIcon },
    ],
  })}
                </div>
              ` : ''}
            </div>
            <div class="cc-meta" style="margin-top:8px;">
              <span class="cc-label">${labelFatura}</span>
              ${!card.includeInExpenses ? '<span class="text-[8px] font-semibold uppercase tracking-[0.08em] text-white/35">Oculto da despesa</span>' : '<span></span>'}
            </div>
          </div>
          <div class="cc-progress-wrap">
            <div class="cc-progress-track">
              <div class="cc-progress-fill" style="width:${card.percentualUso}%;"></div>
            </div>
            <div class="cc-progress-labels">
              <span>Disponível R$ ${formatCurrency(card.disponivel)}</span>
              <span>Limite R$ ${formatCurrency(card.limite)}</span>
            </div>
          </div>
          ${dotsHTML} 
        </div>
      </div>
    </div>
  `;
}

export function renderEmptyCard(): string {
  const zeroCard: CardInfo = {
    id: '__empty__',
    name: 'Nenhum cartão',
    brand: '',
    faturaAtual: 0,
    faturaUltima: 0,
    faturaHistorico: 0,
    includeInExpenses: false,
    disponivel: 0,
    limite: 0,
    percentualUso: 0,
  };
  const zeroSummary: WebCrediCardSummary = {
    cards: [zeroCard],
    activeCardIndex: 0,
    faturaSelecionada: 'current',
    totFatura: 0,
    totUltima: 0,
    totHistorico: 0,
  };
  return renderCardItem(zeroCard, 0, 0, zeroSummary);
}

export function CreditCardStack(ccSummary: WebCrediCardSummary): string {
  const cardStackHTML = ccSummary.isLoading
    ? `<div class="cc-empty-state"><div class="cc-spinner"></div><p class="text-[12px] text-[var(--color-text-secondary)] font-medium">Carregando cartões...</p></div>`
    : ccSummary.cards.length === 0
      ? renderEmptyCard()
      : ccSummary.cards.map((card, idx) => renderCardItem(card, idx, ccSummary.activeCardIndex, ccSummary)).join('');

  return `
    <div id="cc-draggable-zone" class="flex flex-col relative h-full" style="min-height:165px;">
      ${CARD_STACK_CSS}
      <div class="flex-1 flex flex-col relative z-10" style="min-height:inherit;">
        <div class="cc-stack-wrapper" id="cc-stack-container" style="height:100%;">
          ${cardStackHTML}
        </div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Animações de card  ── FÍSICA LÍQUIDA DINÂMICA
───────────────────────────────────────────────────────────────────────────── */

export function animateCardExit(
  cardEl: HTMLElement,
  direction: 'left' | 'right',
  onComplete?: () => void
) {
  const sign = direction === 'left' ? -1 : 1;
  const inner = cardEl.querySelector<HTMLElement>('.cc-card-inner')!;
  const content = cardEl.querySelector<HTMLElement>('.cc-card-content');

  gsap.set(cardEl, { pointerEvents: 'none', zIndex: 0 });

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(cardEl, { display: 'none' });
      gsap.set(inner, { clearProps: 'all' });
      onComplete?.();
    }
  });

  // Fase 0: Anticipação — recua na direção oposta antes de lançar
  tl.to(inner, {
    x: sign * -6,
    scaleX: 1.03,
    scaleY: 0.97,
    rotationY: sign * -3,
    duration: 0.06,
    ease: 'power2.in'
  });

  // Fase 1: Compressão líquida — o card "amassa" na direção do swipe
  tl.to(inner, {
    x: sign * 18,
    scaleX: 0.9,
    scaleY: 1.07,
    rotationY: sign * 6,
    borderRadius: '20px',
    duration: 0.07,
    ease: 'power3.in'
  });

  // Fase 2: Desprendimento — estica e acelera para o lado como fluido com 3D
  tl.to(inner, {
    x: sign * 220,
    y: 12,
    scaleX: 0.68,
    scaleY: 1.14,
    rotationZ: sign * 6,
    rotationY: sign * 12,
    opacity: 0.35,
    borderRadius: sign > 0 ? '14px 24px 24px 14px' : '24px 14px 14px 24px',
    duration: 0.24,
    ease: 'power3.out'
  });

  // Conteúdo dissolve com blur — cascade reverso nos elementos internos
  if (content) {
    const amount = content.querySelector('.cc-amount-row');
    const meta = content.querySelector('.cc-meta');
    const progress = content.querySelector('.cc-progress-wrap');
    const els = [progress, meta, amount].filter(Boolean);

    if (els.length) {
      tl.to(els, {
        opacity: 0, filter: 'blur(6px)', y: -4,
        duration: 0.1, stagger: 0.02, ease: 'power2.in'
      }, 0);
    } else {
      tl.to(content, {
        opacity: 0, filter: 'blur(8px)', scale: 0.95,
        duration: 0.12, ease: 'power2.in'
      }, 0);
    }
  }

  // Fase 3: Colapso — encolhe e desce por trás da pilha
  tl.to(cardEl, {
    x: 0, y: 70, scale: 0.70, rotationZ: 0,
    opacity: 0, filter: 'blur(6px)',
    duration: 0.28, ease: 'power2.inOut'
  }, '-=0.1');

  // Inner retorna ao formato original enquanto colapsa
  tl.to(inner, {
    x: 0, y: 0, scaleX: 1, scaleY: 1,
    rotationZ: 0, rotationY: 0, borderRadius: '16px',
    duration: 0.22, ease: 'power2.inOut'
  }, '-=0.22');

  return tl;
}

export function animateCardEnter(cardEl: HTMLElement, direction?: 'left' | 'right') {
  const inner = cardEl.querySelector<HTMLElement>('.cc-card-inner');
  const content = cardEl.querySelector<HTMLElement>('.cc-card-content');

  if (!inner || !content) return;

  gsap.killTweensOf([cardEl, inner, content]);
  const tl = gsap.timeline();

  gsap.set(cardEl, { opacity: 1, zIndex: 20, pointerEvents: 'auto', display: 'block', filter: 'blur(0px)' });

  const fromDir = direction === 'left' ? 1 : (direction === 'right' ? -1 : 0);

  // 1. Inner surge de baixo com deformação líquida — achatado e largo
  tl.fromTo(inner,
    {
      y: STACK.d1.y + 10,
      scaleX: 1.07,
      scaleY: 0.86,
      opacity: STACK.d1.opacity,
      rotationY: fromDir * -4,
      borderRadius: '20px',
    },
    {
      y: -5,
      scaleX: 0.96,
      scaleY: 1.05,
      opacity: 1,
      rotationY: fromDir * 2,
      borderRadius: '14px',
      duration: 0.32,
      ease: 'power3.out',
    },
    0
  );

  // 2. Settle elástico — mola resolve para a posição final
  tl.to(inner, {
    y: 0, scaleX: 1, scaleY: 1, rotationY: 0, borderRadius: '16px',
    duration: 0.7, ease: 'elastic.out(1.25, 0.38)',
    clearProps: 'transform,opacity,borderRadius'
  });

  // 3. Deslocamento lateral com 3D
  if (direction === 'left' || direction === 'right') {
    tl.fromTo(cardEl,
      { x: fromDir * 45 },
      { x: 0, duration: 0.7, ease: 'elastic.out(1.1, 0.42)', clearProps: 'transform' },
      0
    );
  }

  // 4. Content cascade — cada elemento interno surge individualmente
  const amountRow = content.querySelector('.cc-amount-row');
  const meta = content.querySelector('.cc-meta');
  const progressWrap = content.querySelector('.cc-progress-wrap');
  const progressFill = content.querySelector<HTMLElement>('.cc-progress-fill');

  // Esconde todo conteúdo primeiro
  gsap.set(content, { opacity: 1 });

  const cascadeEls = [amountRow, meta, progressWrap].filter(Boolean);
  if (cascadeEls.length) {
    gsap.set(cascadeEls, { opacity: 0, y: 8, filter: 'blur(6px)' });

    // Stagger cascade com timing apertado
    tl.to(cascadeEls, {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: 0.32, stagger: 0.06,
      ease: 'power2.out', clearProps: 'all'
    }, 0.14);
  } else {
    // Fallback para conteúdo simples
    const xContentStart = fromDir * 12;
    tl.fromTo(content,
      { opacity: 0, x: xContentStart, y: 6, filter: 'blur(8px)', scale: 0.97 },
      { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', scale: 1, duration: 0.35, ease: 'power2.out', clearProps: 'all' },
      0.12
    );
  }

  // 5. Progress bar — liquid fill animation
  if (progressFill) {
    const targetWidth = progressFill.style.width;
    gsap.fromTo(progressFill,
      { width: '0%', scaleY: 1.4, opacity: 0.6 },
      { width: targetWidth, scaleY: 1, opacity: 1, duration: 0.8, delay: 0.3, ease: 'power2.out', clearProps: 'scaleY,opacity' }
    );
  }

  // 6. Shadow pump — sombra sobe junto com o card
  tl.fromTo(inner,
    { boxShadow: '0 2px 6px -2px rgba(0,0,0,0.1), 0 1px 3px -1px rgba(0,0,0,0.08)' },
    { boxShadow: '0 12px 24px -6px rgba(0,0,0,0.4), 0 4px 8px -2px rgba(0,0,0,0.2)', duration: 0.45, ease: 'power2.out', clearProps: 'boxShadow' },
    0.08
  );

  // 7. Border glow sutil — flash de acento na borda
  tl.fromTo(inner,
    { borderColor: 'rgba(217,119,87,0.2)' },
    { borderColor: 'rgba(255,255,255,0.06)', duration: 0.6, ease: 'power1.out', clearProps: 'borderColor' },
    0.15
  );

  return tl;
}

export function animateStackReorder(container: HTMLElement, activeIdx: number) {
  const depthSlots = [
    { offset: 1, ...STACK.d1 },
    { offset: 2, ...STACK.d2 },
    { offset: 3, y: 70, scale: 0.70, opacity: 0 },
  ];

  depthSlots.forEach(({ offset, y, scale, opacity }, i) => {
    const card = container.querySelector<HTMLElement>(`[data-card-index="${activeIdx + offset}"]`);
    if (!card) return;

    const inner = card.querySelector<HTMLElement>('.cc-card-inner');
    const content = card.querySelector<HTMLElement>('.cc-card-content');

    const tl = gsap.timeline({ delay: i * 0.04 });

    // Anticipação sutil — empurra para baixo antes de subir
    tl.to(card, {
      y: (card as any)._gsap?.y + 3 || y + 3,
      scale: scale * 0.995,
      duration: 0.08,
      ease: 'power2.in',
      overwrite: 'auto',
    });

    // Sobe com overshoot
    tl.to(card, {
      y: y - 4,
      scale: scale * 1.012,
      opacity,
      rotationZ: 0, rotationY: 0, x: 0, filter: 'blur(0px)',
      duration: 0.35,
      ease: 'power3.out',
      overwrite: 'auto',
    });

    // Settle elástico
    tl.to(card, {
      y, scale,
      duration: 0.5,
      ease: 'elastic.out(1.08, 0.52)',
      overwrite: 'auto',
    });

    // Inner squash-stretch — largo durante subida, volta ao normal
    if (inner) {
      tl.fromTo(inner,
        { scaleY: 0.96, scaleX: 1.025 },
        { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1.06, 0.48)', clearProps: 'transform' },
        0.08
      );
    }

    // Conteúdo do card traseiro: opacidade resolve suavemente
    if (content && offset === 1) {
      tl.to(content, {
        opacity: 0.1,
        duration: 0.3,
        ease: 'power2.out',
      }, 0);
    }
  });
}

export const animateCardThrow = animateCardExit;

/* ─────────────────────────────────────────────────────────────────────────────
   Drag state & física do toque/mouse (SQUASH AND STRETCH CURTO E PESADO)
───────────────────────────────────────────────────────────────────────────── */

export function applyDragTransform(diffX: number, activeCardIndex: number) {
  const container = document.getElementById('cc-stack-container');
  if (!container) return;

  const activeCard = container.querySelector<HTMLElement>(`[data-card-index="${activeCardIndex}"]`);
  if (!activeCard) return;

  const inner = activeCard.querySelector<HTMLElement>('.cc-card-inner');
  activeCard.classList.add('is-dragging');

  const sign = Math.sign(diffX) || 1;
  const abs = Math.abs(diffX);

  // Rubber-band não linear — mais fluido, resiste progressivamente
  const rubberX = sign * DRAG_TENSION * (1 - Math.exp(-abs / DRAG_TENSION));
  const progress = Math.min(abs / DRAG_THRESHOLD, 1);
  // Curva cúbica para deformação mais suave
  const smoothProgress = progress * progress * (3 - 2 * progress);

  const tiltZ = rubberX * DRAG_ROTATION;

  // Deformação líquida assimétrica — estica na direção do arraste
  const stretchX = 1 + smoothProgress * 0.07;
  const squashY = 1 - smoothProgress * 0.04;

  // 3D perspective tilt — inclina para longe da direção do arraste
  const tiltY = sign * smoothProgress * 8;

  gsap.set(activeCard, {
    x: rubberX,
    rotationZ: tiltZ,
    rotationY: tiltY,
    scaleX: stretchX,
    scaleY: squashY,
    overwrite: 'auto',
  });

  // Inner deforma inversamente para efeito de "gelatina" interna
  if (inner) {
    const innerSkew = sign * smoothProgress * 2.5;
    // Border-radius assimétrico líquido — leading edge comprime, trailing edge expande
    const leadR = Math.round(16 - smoothProgress * 4);
    const trailR = Math.round(16 + smoothProgress * 6);
    const br = sign > 0
      ? `${leadR}px ${trailR}px ${trailR}px ${leadR}px`
      : `${trailR}px ${leadR}px ${leadR}px ${trailR}px`;

    gsap.set(inner, {
      skewX: innerSkew,
      borderRadius: br,
      boxShadow: `${sign * smoothProgress * -10}px ${8 + smoothProgress * 14}px ${24 + smoothProgress * 18}px -6px rgba(0,0,0,${0.4 + smoothProgress * 0.25})`,
      overwrite: 'auto',
    });
  }

  // Próximo card sobe com curva suavizada
  const nextIdx = diffX < 0 ? activeCardIndex + 1 : activeCardIndex - 1;
  const nextCard = container.querySelector<HTMLElement>(`[data-card-index="${nextIdx}"]`);

  if (nextCard) {
    const easedProgress = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const nextInner = nextCard.querySelector<HTMLElement>('.cc-card-inner');

    gsap.set(nextCard, {
      y: lerp(STACK.d1.y, 2, easedProgress * 0.7),
      scale: lerp(STACK.d1.scale, 0.99, easedProgress * 0.7),
      opacity: lerp(STACK.d1.opacity, 1, easedProgress),
      overwrite: 'auto',
    });

    // Deformação sutil no próximo card — "respira" enquanto sobe
    if (nextInner) {
      gsap.set(nextInner, {
        scaleX: lerp(1, 1.015, easedProgress),
        scaleY: lerp(1, 0.99, easedProgress),
        overwrite: 'auto',
      });
    }
  }

  const d2Card = container.querySelector<HTMLElement>(`[data-card-index="${activeCardIndex + (diffX < 0 ? 2 : -2)}"]`);
  if (d2Card) {
    gsap.set(d2Card, {
      y: lerp(STACK.d2.y, STACK.d1.y, smoothProgress * 0.5),
      scale: lerp(STACK.d2.scale, STACK.d1.scale, smoothProgress * 0.5),
      opacity: lerp(STACK.d2.opacity, STACK.d1.opacity, smoothProgress * 0.5),
      overwrite: 'auto',
    });
  }
}

export function snapBack(activeCardIndex: number) {
  const container = document.getElementById('cc-stack-container');
  if (!container) return;

  const activeCard = container.querySelector<HTMLElement>(`[data-card-index="${activeCardIndex}"]`);
  if (activeCard) {
    activeCard.classList.remove('is-dragging');

    const inner = activeCard.querySelector<HTMLElement>('.cc-card-inner');

    // Card volta com mola líquida — anticipa + overshoot
    const tl = gsap.timeline();
    tl.to(activeCard, {
      x: 0, rotationZ: 0, rotationY: 0, scaleX: 1, scaleY: 1,
      duration: 0.8,
      ease: 'elastic.out(1.2, 0.36)',
      overwrite: 'auto'
    });

    // Inner resolve skew e border-radius com mola suave
    if (inner) {
      gsap.to(inner, {
        skewX: 0,
        borderRadius: '16px',
        boxShadow: '0 12px 24px -6px rgba(0,0,0,0.4), 0 4px 8px -2px rgba(0,0,0,0.2)',
        scaleX: 1, scaleY: 1,
        duration: 0.7,
        ease: 'elastic.out(1.2, 0.45)',
        overwrite: 'auto',
        clearProps: 'skewX,borderRadius,boxShadow,scaleX,scaleY'
      });
    }
  }

  [activeCardIndex + 1, activeCardIndex - 1].forEach(idx => {
    const card = container.querySelector<HTMLElement>(`[data-card-index="${idx}"]`);
    if (!card) return;

    const cardInner = card.querySelector<HTMLElement>('.cc-card-inner');

    gsap.to(card, {
      y: STACK.d1.y, scale: STACK.d1.scale, opacity: STACK.d1.opacity,
      duration: 0.7,
      ease: 'elastic.out(1.1, 0.5)',
      overwrite: 'auto'
    });

    // Limpa deformação do inner do próximo card
    if (cardInner) {
      gsap.to(cardInner, {
        scaleX: 1, scaleY: 1,
        duration: 0.5,
        ease: 'elastic.out(1.05, 0.5)',
        overwrite: 'auto',
        clearProps: 'transform'
      });
    }
  });

  const d2Card = container.querySelector<HTMLElement>(`[data-card-index="${activeCardIndex + 2}"]`);
  if (d2Card) {
    gsap.to(d2Card, { y: STACK.d2.y, scale: STACK.d2.scale, opacity: STACK.d2.opacity, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Lógica Dinâmica: Arrasto (Drag & Flick) e Eventos
───────────────────────────────────────────────────────────────────────────── */

export function initDynamicCardDrag(
  activeCardIndex: number,
  totalCards: number,
  onCardChange: (newIndex: number) => void
) {
  const container = document.getElementById('cc-stack-container');
  if (!container) return;

  const dragState: DragState = { active: false, startX: 0, lastX: 0, velocityX: 0, lastTime: 0 };

  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    const cardEl = target.closest('.cc-card-item') as HTMLElement;

    if (target.closest('.relative.inline-block')) return;
    if (!cardEl || cardEl.getAttribute('data-depth') !== '0') return;

    dragState.active = true;
    dragState.startX = e.clientX;
    dragState.lastX = e.clientX;
    dragState.lastTime = Date.now();
    cardEl.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragState.active) return;

    const currentX = e.clientX;
    const diffX = currentX - dragState.startX;

    const now = Date.now();
    const dt = now - dragState.lastTime;
    if (dt > 0) dragState.velocityX = (currentX - dragState.lastX) / dt;

    dragState.lastX = currentX;
    dragState.lastTime = now;
    applyDragTransform(diffX, activeCardIndex);
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!dragState.active) return;
    dragState.active = false;

    const cardEl = container.querySelector<HTMLElement>(`[data-card-index="${activeCardIndex}"]`);
    if (cardEl) cardEl.releasePointerCapture(e.pointerId);

    const diffX = dragState.lastX - dragState.startX;
    const absDiff = Math.abs(diffX);
    const absVel = Math.abs(dragState.velocityX);

    if (absDiff > DRAG_THRESHOLD || absVel > VELOCITY_THRESHOLD) {
      const direction = diffX > 0 ? 'right' : 'left';
      if (cardEl) {
        animateCardThrow(cardEl, direction, () => {
          const nextIndex = (activeCardIndex + 1) % totalCards;
          onCardChange(nextIndex);
        });
      }
    } else {
      snapBack(activeCardIndex);
    }
  };

  const controller = new AbortController();
  container.addEventListener('pointerdown', handlePointerDown, { signal: controller.signal });
  container.addEventListener('pointermove', handlePointerMove, { signal: controller.signal });
  container.addEventListener('pointerup', handlePointerUp, { signal: controller.signal });
  container.addEventListener('pointercancel', handlePointerUp, { signal: controller.signal });

  return () => controller.abort();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Dropdown do filtro — "pill morph" refinado (LIQUID UI)
───────────────────────────────────────────────────────────────────────────── */

export function attachCreditCardFilterListeners(
  onSelect: (type: CreditCardSelectionType) => void,
  onToggleExpenseVisibility?: () => void
) {
  const trigger = document.getElementById('dashboard-cc-filter-trigger');
  if (!trigger) return;

  const menu = trigger.parentElement?.querySelector<HTMLElement>('#dashboard-cc-filter-menu')
    ?? document.getElementById('dashboard-cc-filter-menu');
  const content = menu?.querySelector<HTMLElement>('#dashboard-cc-filter-content-wrapper')
    ?? document.getElementById('dashboard-cc-filter-content-wrapper');

  if (!menu || !content) return;

  document.querySelectorAll<HTMLElement>('body > #dashboard-cc-filter-menu').forEach(existingMenu => {
    if (existingMenu !== menu) existingMenu.remove();
  });

  const menuWidth = Number.parseFloat(menu.style.width || '') || 220;
  const viewportPadding = 12;
  const viewportGap = 6;
  const card = trigger.closest('.cc-card-item') as HTMLElement | null;

  let isOpen = false;
  let animation: gsap.core.Timeline | null = null;
  let currentOrigin = 'top right';

  const syncMenuPosition = (anchor: HTMLElement) => {
    if (!anchor.isConnected || !menu.isConnected) return;

    const rect = anchor.getBoundingClientRect();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
    const desiredLeft = rect.right - menuWidth;
    const left = Math.min(Math.max(desiredLeft, viewportPadding), maxLeft);

    currentOrigin = left <= viewportPadding ? 'top left' : 'top right';
    menu.style.top = `${rect.bottom + viewportGap}px`;
    menu.style.left = `${left}px`;
    menu.style.width = `${menuWidth}px`;
    menu.style.transformOrigin = currentOrigin;
  };

  const handleViewportChange = () => {
    const liveTrigger = document.getElementById('dashboard-cc-filter-trigger');
    if (isOpen && liveTrigger) syncMenuPosition(liveTrigger);
  };

  menu.classList.remove('absolute', 'right-0', 'top-full', 'mt-1');
  menu.classList.add('fixed');
  menu.style.position = 'fixed';
  menu.style.right = 'auto';
  menu.style.bottom = 'auto';
  menu.style.marginTop = '0px';
  menu.style.zIndex = '99999';
  menu.style.setProperty('z-index', '99999', 'important');
  menu.style.isolation = 'isolate';
  document.body.appendChild(menu);

  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);

  const open = (anchor: HTMLElement) => {
    if (isOpen) return;
    hideAllTooltips();
    isOpen = true;
    animation?.kill();

    const items = menu.querySelectorAll<HTMLElement>('.dropdown-item');
    syncMenuPosition(anchor);

    gsap.set(menu, {
      display: 'flex',
      opacity: 1,
      scaleX: 0.15,
      scaleY: 0.05,
      y: -8,
      borderRadius: '100px',
      transformOrigin: currentOrigin,
    });
    gsap.set(content, { opacity: 0, y: -6, scale: 0.92, filter: 'blur(6px)' });
    gsap.set(items, { opacity: 0, y: 10, x: -4, scale: 0.94, filter: 'blur(4px)' });

    if (card) {
      card.dataset.oldZ = card.style.zIndex;
      card.style.zIndex = '120';
    }

    animation = gsap.timeline({ defaults: { overwrite: 'auto' } });

    animation.to(menu, { scaleX: 1, scaleY: 1, y: 0, borderRadius: '16px', duration: 0.8, ease: 'elastic.out(1.2, 0.4)' });
    animation.to(content, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.28, ease: 'power3.out' }, '-=0.55');
    animation.to(items, { opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'power4.out', stagger: { each: 0.045, ease: 'power1.in' } }, '-=0.45');

    anchor.classList.add('active');
  };

  const close = (anchor?: HTMLElement | null) => {
    if (!isOpen) return;
    isOpen = false;
    animation?.kill();

    animation = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => {
        gsap.set(menu, { display: 'none' });
        if (card) card.style.zIndex = card.dataset.oldZ || '';
      },
    });

    animation.to(content, { opacity: 0, y: -4, scale: 0.94, filter: 'blur(5px)', duration: 0.13, ease: 'power2.in' });
    animation.to(menu, { scaleX: 0.15, scaleY: 0.05, y: -8, borderRadius: '100px', opacity: 0, duration: 0.35, ease: 'back.in(1.5)' }, '-=0.05');

    anchor?.classList.remove('active');
  };

  trigger.replaceWith(trigger.cloneNode(true));
  const newTrigger = document.getElementById('dashboard-cc-filter-trigger') as HTMLElement | null;
  if (!newTrigger) return;

  newTrigger.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    isOpen ? close(newTrigger) : open(newTrigger);
  });

  const bindAction = (id: string, callback: (event: MouseEvent) => void) => {
    const item = menu.querySelector<HTMLElement>(`#${id}`);
    if (!item) return;

    item.replaceWith(item.cloneNode(true));
    menu.querySelector<HTMLElement>(`#${id}`)?.addEventListener('click', callback);
  };

  bindAction('filter-cc-current', (e) => {
    e.stopPropagation();
    onSelect('current');
    close(newTrigger);
  });
  bindAction('filter-cc-last', (e) => {
    e.stopPropagation();
    onSelect('last');
    close(newTrigger);
  });
  bindAction('filter-cc-history', (e) => {
    e.stopPropagation();
    onSelect('history');
    close(newTrigger);
  });
  bindAction('filter-cc-toggle-expense', (e) => {
    e.stopPropagation();
    onToggleExpenseVisibility?.();
    close(newTrigger);
  });

  const outsideClick = (e: MouseEvent) => {
    if (isOpen && !menu.contains(e.target as Node) && !newTrigger.contains(e.target as Node)) {
      close(newTrigger);
    }
  };
  document.addEventListener('click', outsideClick);

  const observer = new MutationObserver(() => {
    if (newTrigger.isConnected) return;

    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('scroll', handleViewportChange, true);
    document.removeEventListener('click', outsideClick);
    if (menu.isConnected) menu.remove();
    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Utilitários internos
───────────────────────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
