import gsap from 'gsap';

// ═══════════════════════════════════════════════════════════════════════════════
//  DynamicIsland – Componente Reutilizável de Container Animado
// ═══════════════════════════════════════════════════════════════════════════════
//
//  Encapsula o container estilo "Dynamic Island" da Apple com:
//    • Background + border + border-radius consistentes via CSS vars
//    • Animação elástica de entrada (squeeze/stretch) via GSAP
//    • Efeito de transição direcional (prev/next/reset)
//    • Estilos auto-injetados — só usar, sem precisar colar CSS em lugar nenhum
//
//  Uso:
//    HTML:   ${DynamicIsland({ id: 'meu-container', content: '<span>Olá</span>' })}
//    JS:     animateDynamicIslandEntrance('meu-container');
//    JS:     animateDynamicIslandTransition({ containerId: '...', direction: 'next' });
//
//    Não precisa incluir estilos manualmente — eles são injetados sozinhos!
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Auto-inject de estilos (roda UMA vez) ───────────────────────────────────

const STYLE_ID = 'dynamic-island-styles';

const CSS = `
  .dynamic-island {
    display: flex;
    align-items: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    position: relative;
    transform-origin: center center;
    overflow: hidden;
    user-select: none;
    will-change: transform;
  }
  .dynamic-island--hidden {
    display: none;
  }
  .dynamic-island__content {
    display: flex;
    align-items: center;
    width: 100%;
    position: relative;
    overflow: visible;
  }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;          // já injetou
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type DynamicDirection = 'next' | 'prev' | 'reset';

export interface DynamicIslandOptions {
  /** ID único do container */
  id: string;
  /** HTML interno */
  content?: string;
  /** Classes extras no container */
  className?: string;
  /** ID do wrapper de conteúdo interno (para animar o conteúdo separado) */
  contentWrapperId?: string;
  /** Se true, inicia hidden */
  hidden?: boolean;
  /** Estilo inline extra */
  style?: string;
  /** Direção padrão de animação ao clicar (next, prev, reset) - se definido, ativa clique automático */
  defaultClickDirection?: DynamicDirection;
  /** Callback executado quando o container é clicado */
  onClickAnimation?: () => void;
}

// ─── HTML Render ─────────────────────────────────────────────────────────────

export function DynamicIsland(opts: DynamicIslandOptions): string {
  ensureStyles();   // ← auto-injeta CSS na primeira chamada

  const {
    id,
    content = '',
    className = '',
    contentWrapperId,
    hidden = false,
    style = '',
  } = opts;

  const hiddenClass = hidden ? ' dynamic-island--hidden' : '';
  const wrapId = contentWrapperId || `${id}-di-content`;

  return `
    <div id="${id}" class="dynamic-island ${className}${hiddenClass}" style="${style}">
      <div id="${wrapId}" class="dynamic-island__content">
        ${content}
      </div>
    </div>
  `;
}

// ─── Animação: Entrada Elástica Inicial ──────────────────────────────────────

export function animateDynamicIslandEntrance(
  containerId: string,
  contentWrapperId?: string
): void {
  ensureStyles();

  const container = document.getElementById(containerId);
  const wrapId = contentWrapperId || `${containerId}-di-content`;
  const content = document.getElementById(wrapId);
  if (!container) return;

  gsap.killTweensOf(container);
  if (content) gsap.killTweensOf(content);

  gsap.fromTo(
    container,
    { scaleX: 0.85, scaleY: 1.15, borderRadius: '24px' },
    {
      scaleX: 1,
      scaleY: 1,
      borderRadius: '12px',
      duration: 0.8,
      ease: 'elastic.out(1.2, 0.4)',
      clearProps: 'transform',
    }
  );

  if (content) {
    gsap.fromTo(
      content,
      { opacity: 0, filter: 'blur(4px)', scale: 0.95 },
      {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
        delay: 0.05,
        clearProps: 'filter',
      }
    );
  }
}

// ─── Setup: Listener de Clique Automático ───────────────────────────────────

export interface DynamicIslandClickOptions {
  /** ID do container */
  containerId: string;
  /** Direção da animação ao clicar */
  direction: DynamicDirection;
  /** ID do wrapper de conteúdo interno */
  contentWrapperId?: string;
  /** Callback executado ao clicar (opcional) */
  onClickAnimation?: () => void;
}

export function enableDynamicIslandClick(opts: DynamicIslandClickOptions): void {
  ensureStyles();

  const { containerId, direction, onClickAnimation } = opts;
  const contentWrapperId = opts.contentWrapperId || `${containerId}-di-content`;
  const container = document.getElementById(containerId);

  if (!container) return;

  container.style.cursor = 'pointer';

  container.addEventListener('click', () => {
    animateDynamicIslandTransition({
      containerId,
      contentWrapperId,
      direction,
    });

    if (onClickAnimation) onClickAnimation();
  });
}

// ─── Animação: Transição Direcional ──────────────────────────────────────────

export interface DynamicIslandTransitionOptions {
  /** ID do container externo */
  containerId: string;
  /** ID do wrapper de conteúdo interno */
  contentWrapperId?: string;
  /** Direção da animação */
  direction: DynamicDirection;
  /** Callback chamado no meio da animação (quando conteúdo está invisível)
   *  → Use para trocar dados */
  onMidpoint?: () => void;
  /** Distância (px) do deslize do conteúdo (default: 30) */
  slideDistance?: number;
  /** Puxão lateral do container (px) (default: 14) */
  tugDistance?: number;
}

export function animateDynamicIslandTransition(opts: DynamicIslandTransitionOptions): void {
  ensureStyles();

  const {
    containerId,
    direction,
    onMidpoint,
    slideDistance = 30,
    tugDistance = 14,
  } = opts;
  const contentWrapperId = opts.contentWrapperId || `${containerId}-di-content`;

  const container = document.getElementById(containerId);
  const contentWrapper = document.getElementById(contentWrapperId);
  if (!container) return;

  gsap.killTweensOf(container);
  if (contentWrapper) gsap.killTweensOf(contentWrapper);

  const tl = gsap.timeline();

  // ── Configurações do Puxão Líquido ──
  const tugX = direction === 'next' ? tugDistance : (direction === 'prev' ? -tugDistance : 0);
  const tugY = direction === 'reset' ? 6 : 0;

  const xExit = direction === 'next' ? -slideDistance : (direction === 'prev' ? slideDistance : 0);
  const xEnter = direction === 'next' ? slideDistance : (direction === 'prev' ? -slideDistance : 0);

  // ── FASE 1: Puxão (container estica na direção) ──
  tl.to(container, {
    scaleX: direction === 'reset' ? 0.9 : 1.12,
    scaleY: direction === 'reset' ? 1.1 : 0.88,
    x: tugX,
    y: tugY,
    borderRadius: '20px',
    duration: 0.15,
    ease: 'power1.out',
  }, 0);

  // Conteúdo antigo sai
  if (contentWrapper) {
    tl.to(contentWrapper, {
      opacity: 0,
      x: xExit,
      filter: 'blur(4px)',
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        // Callback de midpoint – troca dados aqui
        if (onMidpoint) onMidpoint();

        // Prepara novo conteúdo do lado oposto
        gsap.set(contentWrapper, {
          x: xEnter,
          y: direction === 'reset' ? -8 : 0,
        });
      },
    }, 0);
  } else {
    // Sem contentWrapper, ainda chama midpoint
    tl.call(() => { if (onMidpoint) onMidpoint(); }, [], 0.15);
  }

  // ── FASE 2: Soltada (container quica pro lugar) ──
  tl.to(container, {
    scaleX: 1,
    scaleY: 1,
    x: 0,
    y: 0,
    borderRadius: '12px',
    duration: 0.8,
    ease: 'elastic.out(1.2, 0.4)',
    clearProps: 'transform',
  }, 0.15);

  // Conteúdo novo entra deslizando
  if (contentWrapper) {
    tl.to(contentWrapper, {
      opacity: 1,
      x: 0,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.35,
      ease: 'power2.out',
      clearProps: 'filter',
    }, 0.18);
  }
}
