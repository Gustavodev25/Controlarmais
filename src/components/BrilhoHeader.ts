type BrilhoHeaderWindow = Window & {
  __brilhoHeaderScrollBound?: boolean;
  __brilhoHeaderScrollTicking?: boolean;
};

const BRILHO_SCROLL_FADE_DISTANCE = 240;

function getBrilhoHeaderScrollTop(): number {
  const pageScrollTop =
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0;

  let mainScrollTop = 0;
  document.querySelectorAll<HTMLElement>('main').forEach((main) => {
    if (main.scrollHeight > main.clientHeight) {
      mainScrollTop = Math.max(mainScrollTop, main.scrollTop);
    }
  });

  return Math.max(pageScrollTop, mainScrollTop);
}

function syncBrilhoHeaderGlow() {
  const scrollTop = getBrilhoHeaderScrollTop();
  const progress = Math.min(Math.max(scrollTop / BRILHO_SCROLL_FADE_DISTANCE, 0), 1);

  const opacity = 1 - progress * 0.38;
  const brightness = 1 - progress * 0.16;
  const scale = 1 - progress * 0.12;
  const blur = 60 - progress * 14;
  const shift = -progress * 10;

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--brilho-header-opacity', opacity.toFixed(3));
  rootStyle.setProperty('--brilho-header-brightness', brightness.toFixed(3));
  rootStyle.setProperty('--brilho-header-scale', scale.toFixed(3));
  rootStyle.setProperty('--brilho-header-blur', `${blur.toFixed(2)}px`);
  rootStyle.setProperty('--brilho-header-shift', `${shift.toFixed(2)}px`);
}

function scheduleBrilhoHeaderGlowSync() {
  const glowWindow = window as BrilhoHeaderWindow;
  if (glowWindow.__brilhoHeaderScrollTicking) return;

  glowWindow.__brilhoHeaderScrollTicking = true;
  window.requestAnimationFrame(() => {
    glowWindow.__brilhoHeaderScrollTicking = false;
    syncBrilhoHeaderGlow();
  });
}

function ensureBrilhoHeaderScrollEffect() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const glowWindow = window as BrilhoHeaderWindow;
  if (!glowWindow.__brilhoHeaderScrollBound) {
    glowWindow.__brilhoHeaderScrollBound = true;
    document.addEventListener('scroll', scheduleBrilhoHeaderGlowSync, { passive: true, capture: true });
    window.addEventListener('scroll', scheduleBrilhoHeaderGlowSync, { passive: true });
    window.addEventListener('resize', scheduleBrilhoHeaderGlowSync, { passive: true });
  }

  scheduleBrilhoHeaderGlowSync();
}

export function BrilhoHeader(): string {
  ensureBrilhoHeaderScrollEffect();

  return `
    <style>
      :root {
        --brilho-header-opacity: 1;
        --brilho-header-brightness: 1;
        --brilho-header-scale: 1;
        --brilho-header-blur: 60px;
        --brilho-header-shift: 0px;
      }

      @keyframes brilho-fadein {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(calc(var(--brilho-header-shift) - 16px)) scale(calc(var(--brilho-header-scale) * 0.96));
          filter: blur(calc(var(--brilho-header-blur) + 6px)) brightness(var(--brilho-header-brightness));
        }
        to {
          opacity: var(--brilho-header-opacity);
          transform: translateX(-50%) translateY(var(--brilho-header-shift)) scale(var(--brilho-header-scale));
          filter: blur(var(--brilho-header-blur)) brightness(var(--brilho-header-brightness));
        }
      }

      .brilho-header-glow {
        position: fixed;
        top: -132px;
        left: 50%;
        width: 920px;
        height: 340px;
        transform: translateX(-50%) translateY(var(--brilho-header-shift)) scale(var(--brilho-header-scale));
        transform-origin: center top;
        background: radial-gradient(
          circle at 50% 20%,
          var(--color-brilho-1, rgba(240, 95, 35, 1.0)) 0%,
          var(--color-brilho-2, rgba(230, 110, 55, 0.60)) 30%,
          rgba(220, 115, 70, 0.20) 60%,
          transparent 80%
        );
        opacity: var(--brilho-header-opacity);
        filter: blur(var(--brilho-header-blur)) brightness(var(--brilho-header-brightness));
        will-change: opacity, filter, transform;
        z-index: 0;
        pointer-events: none;
        animation: brilho-fadein 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
        transition:
          background 0.8s ease,
          opacity 0.28s ease,
          filter 0.28s ease,
          transform 0.28s ease;
      }

      html[data-theme="light"] .brilho-header-glow {
        background: radial-gradient(
          circle at 50% 20%,
          var(--color-brilho-1, rgba(240, 95, 35, 0.75)) 0%,
          var(--color-brilho-2, rgba(230, 110, 55, 0.35)) 35%,
          transparent 70%
        );
      }
    </style>
    <div class="brilho-header-glow"></div>
  `;
}
