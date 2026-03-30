import gsap from 'gsap';

interface TooltipProps {
  content: string;
  text: string;
  id?: string;
  className?: string;
}

let _tooltipCounter = 0;

/**
 * Componente de Tooltip com animação GSAP pill→card idêntica ao GenericDropdown.
 * Requer attachTooltipListeners() após inserção no DOM.
 */
export function Tooltip({ content, text, id, className = '' }: TooltipProps): string {
  const tooltipId = id || `tooltip-${++_tooltipCounter}`;

  return `
    <div
      id="${tooltipId}"
      class="sync-tooltip ${className}"
      data-tooltip-text="${text}"
      style="position: relative; display: inline-flex;"
    >
      ${content}
    </div>
  `;
}

/**
 * Cria (ou reutiliza) o bubble global montado no body.
 * Um único elemento é reaproveitado por todos os tooltips.
 */
function getOrCreateBubble(): HTMLElement {
  const BUBBLE_ID = 'tooltip-global-bubble';
  let bubble = document.getElementById(BUBBLE_ID);
  if (bubble) return bubble;

  bubble = document.createElement('div');
  bubble.id = BUBBLE_ID;
  Object.assign(bubble.style, {
    position: 'fixed',
    zIndex: '99999',
    pointerEvents: 'none',
    display: 'none',
    padding: '10px 14px',
    borderRadius: '14px',
    background: 'var(--color-surface, #1a1a1a)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    color: 'var(--color-text, #fff)',
    fontSize: '11px',
    lineHeight: '1.5',
    fontWeight: '500',
    letterSpacing: '-0.01em',
    whiteSpace: 'pre-line',
    textAlign: 'start',
    border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
    width: 'max-content',
    maxWidth: '220px',
    willChange: 'transform',
    transformOrigin: 'top center',
  });

  document.body.appendChild(bubble);
  return bubble;
}

/**
 * Posiciona o bubble centrado abaixo do trigger usando coordenadas fixed.
 */
function positionBubble(trigger: HTMLElement, bubble: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();

  let left = rect.left + rect.width / 2 - bubbleRect.width / 2;
  const top = rect.bottom + 8;

  // Garante que não sai da viewport horizontalmente
  const vw = window.innerWidth;
  if (left < 8) left = 8;
  if (left + bubbleRect.width > vw - 8) left = vw - bubbleRect.width - 8;

  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
}

/**
 * Anexa os listeners de hover com animação GSAP ao tooltip.
 * Chamar após o HTML do tooltip ser inserido no DOM.
 */
export function attachTooltipListeners(id: string) {
  const trigger = document.getElementById(id);
  if (!trigger) return;

  const text = trigger.dataset.tooltipText ?? '';
  const bubble = getOrCreateBubble();

  let isOpen = false;
  let currentTrigger: HTMLElement | null = null;
  let animation: gsap.core.Timeline | null = null;

  const open = () => {
    if (isOpen && currentTrigger === trigger) return;

    isOpen = true;
    currentTrigger = trigger;
    if (animation) animation.kill();

    // 1. Reset text and show for measuring
    bubble.innerHTML = `<div class="tooltip-content-wrapper" style="opacity: 0;">${text}</div>`;
    
    // 2. IMPORTANT: Reset scale to 1 before measuring, otherwise getBoundingClientRect gives scaled size
    gsap.set(bubble, { display: 'block', scaleX: 1, scaleY: 1, opacity: 1 });

    // 3. Position now that we have real dimensions
    positionBubble(trigger, bubble);

    // 4. Set initial "pill" state
    gsap.set(bubble, {
      scaleX: 0.18,
      scaleY: 0.06,
      y: -10,
      borderRadius: '100px',
      transformOrigin: 'top center',
    });

    const content = bubble.querySelector('.tooltip-content-wrapper');

    animation = gsap.timeline();

    // Phase 1: Pill morphs into card
    animation.to(bubble, {
      scaleX: 1,
      scaleY: 1,
      y: 0,
      borderRadius: '14px',
      duration: 0.6,
      ease: 'elastic.out(1.05, 0.68)',
    });

    // Phase 2: Content fades in
    if (content) {
      animation.to(content, {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out'
      }, '-=0.45');
    }
  };

  const close = () => {
    if (!isOpen || currentTrigger !== trigger) return;
    isOpen = false;
    currentTrigger = null;
    if (animation) animation.kill();

    const content = bubble.querySelector('.tooltip-content-wrapper');

    animation = gsap.timeline({
      onComplete: () => { gsap.set(bubble, { display: 'none' }); },
    });

    if (content) {
      animation.to(content, {
        opacity: 0,
        duration: 0.12,
        ease: 'power2.in'
      });
    }

    animation.to(bubble, {
      scaleX: 0.18,
      scaleY: 0.06,
      y: -10,
      borderRadius: '100px',
      opacity: 0,
      duration: 0.25,
      ease: 'back.in(2.2)',
    }, content ? '-=0.05' : 0);
  };

  trigger.addEventListener('mouseenter', open);
  trigger.addEventListener('mouseleave', close);
}

/**
 * Inicializa todos os tooltips presentes no DOM de uma vez.
 */
export function initAllTooltips() {
  document.querySelectorAll<HTMLElement>('.sync-tooltip[id]').forEach((el) => {
    attachTooltipListeners(el.id);
  });
}

/**
 * Força o fechamento de todos os tooltips (útil quando um dropdown abre).
 */
export function hideAllTooltips() {
  const bubble = document.getElementById('tooltip-global-bubble');
  if (bubble && bubble.style.display !== 'none') {
    gsap.to(bubble, {
      opacity: 0,
      scaleX: 0.18,
      scaleY: 0.06,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => { gsap.set(bubble, { display: 'none' }); }
    });
  }
}

/**
 * Injeta estilos base mínimos (toda animação é via GSAP).
 */
export function injectTooltipStyles() {
  if (document.getElementById('tooltip-global-styles')) return;

  const style = document.createElement('style');
  style.id = 'tooltip-global-styles';
  style.textContent = `.sync-tooltip { position: relative; display: inline-flex; }`;
  document.head.appendChild(style);
}