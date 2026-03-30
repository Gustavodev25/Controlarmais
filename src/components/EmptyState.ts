export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionButton?: {
    label: string;
    onClickId: string;
  };
}

const EMPTY_STATE_STYLES = `
  @keyframes es-fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes es-float-a {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50%       { transform: translateY(-8px) rotate(4deg); }
  }
  @keyframes es-float-b {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50%       { transform: translateY(7px) rotate(-5deg); }
  }
  @keyframes es-float-c {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%       { transform: translateY(-5px) rotate(6deg); }
    66%       { transform: translateY(4px) rotate(-3deg); }
  }
  @keyframes es-float-d {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50%       { transform: translateY(9px) rotate(-6deg); }
  }
  @keyframes es-icon-pulse {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-5px); }
  }
  @keyframes es-dot-blink {
    0%, 100% { opacity: 0.15; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.5); }
  }

  .es-root {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 32px;
    text-align: center;
  }

  /* ── Floating decorative icons ── */
  .es-deco {
    position: absolute;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary, #94a3b8);
    opacity: 0;
  }
  .es-deco svg { display: block; }

  .es-deco-1 {
    top: 14%;  left: 8%;
    animation: es-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.30s forwards,
               es-float-a 5.0s ease-in-out 0.80s infinite;
  }
  .es-deco-2 {
    top: 10%;  right: 10%;
    animation: es-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.45s forwards,
               es-float-b 6.0s ease-in-out 0.95s infinite;
  }
  .es-deco-3 {
    bottom: 18%; left: 12%;
    animation: es-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.55s forwards,
               es-float-c 7.0s ease-in-out 1.05s infinite;
  }
  .es-deco-4 {
    bottom: 16%; right: 8%;
    animation: es-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.65s forwards,
               es-float-d 5.5s ease-in-out 1.15s infinite;
  }
  .es-deco-5 {
    top: 42%;  left: 3%;
    animation: es-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.50s forwards,
               es-float-b 8.0s ease-in-out 1.00s infinite;
  }
  .es-deco-6 {
    top: 38%;  right: 4%;
    animation: es-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.60s forwards,
               es-float-a 6.5s ease-in-out 1.10s infinite;
  }

  /* small ambient dots */
  .es-dot {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--color-text-secondary, #94a3b8);
    pointer-events: none;
  }
  .es-dot-1 { top: 28%;    left: 22%;   animation: es-dot-blink 3.0s ease-in-out 0.2s infinite; }
  .es-dot-2 { top: 22%;    right: 24%;  animation: es-dot-blink 3.0s ease-in-out 1.1s infinite; }
  .es-dot-3 { bottom: 28%; left: 26%;   animation: es-dot-blink 3.0s ease-in-out 0.6s infinite; }
  .es-dot-4 { bottom: 24%; right: 20%;  animation: es-dot-blink 3.0s ease-in-out 1.5s infinite; }

  /* ── Main icon ── */
  .es-icon-wrap {
    position: relative;
    z-index: 1;
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border-light, var(--color-border));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    animation:
      es-fade-up    0.5s cubic-bezier(0.22, 1, 0.36, 1) both,
      es-icon-pulse 3.5s ease-in-out 0.5s infinite;
  }

  .es-title {
    position: relative;
    z-index: 1;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: -0.01em;
    margin: 0 0 6px;
    animation: es-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
  }

  .es-description {
    position: relative;
    z-index: 1;
    font-size: 13px;
    color: var(--color-text-secondary);
    max-width: 280px;
    line-height: 1.65;
    margin: 0 0 20px;
    animation: es-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both;
  }

  .es-btn {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #D97757;
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
    box-shadow: 0 2px 10px rgba(217,119,87,0.25);
    animation: es-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.26s both;
  }
  .es-btn:hover {
    background: #c6684b;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(217,119,87,0.35);
  }
  .es-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(217,119,87,0.2);
  }
`;

let _stylesInjected = false;
function injectStyles(): void {
  if (typeof document === "undefined" || _stylesInjected) return;
  const tag = document.createElement("style");
  tag.id = "empty-state-styles";
  tag.textContent = EMPTY_STATE_STYLES;
  document.head.appendChild(tag);
  _stylesInjected = true;
}

// ── SVG helpers ────────────────────────────────────────────────
const lottiePlayer = (src: string, size: number, opacity: number) => `
  <lottie-player
    src="${src}"
    background="transparent"
    speed="0.8"
    class="es-lottie-bg"
    style="width: ${size}px; height: ${size}px; opacity: ${opacity}; filter: brightness(1.5) saturate(0);"
  ></lottie-player>
`;

export function initEmptyStateLotties() {
  const players = document.querySelectorAll<HTMLElement & { stop: () => void, play: () => void }>('.es-lottie-bg');
  players.forEach(player => {
    if (player.dataset.lottieInit === 'true') return;
    player.dataset.lottieInit = 'true';

    const schedulePlay = () => {
      if (!player.isConnected) return;
      if (typeof player.stop === 'function') player.stop();
      if (typeof player.play === 'function') player.play();
      
      // Toca de novo entre 3 e 5 segundos
      const delay = 3000 + Math.random() * 2000;
      setTimeout(schedulePlay, delay);
    };

    // Delay inicial aleatório para não tocarem todos juntos
    setTimeout(schedulePlay, 500 + Math.random() * 1000);
  });
}

const DECO_ICONS = [
  lottiePlayer('/assets/lottie/carteirabranca.json', 28, 0.35),
  lottiePlayer('/assets/lottie/cartaobranco.json', 24, 0.4),
  lottiePlayer('/assets/lottie/assinaturabranco.json', 26, 0.3),
  lottiePlayer('/assets/lottie/lembretebranco.json', 24, 0.35),
  lottiePlayer('/assets/lottie/banco.json', 26, 0.3),
  lottiePlayer('/assets/lottie/carteirabranca.json', 22, 0.25),
];

const defaultIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--color-text-secondary)">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`;

export function EmptyState({
  title,
  description,
  icon,
  actionButton,
}: EmptyStateProps): string {
  injectStyles();

  return `
    <div class="es-root">

      <!-- Floating decorative icons -->
      <span class="es-deco es-deco-1">${DECO_ICONS[0]}</span>
      <span class="es-deco es-deco-2">${DECO_ICONS[1]}</span>
      <span class="es-deco es-deco-3">${DECO_ICONS[2]}</span>
      <span class="es-deco es-deco-4">${DECO_ICONS[3]}</span>
      <span class="es-deco es-deco-5">${DECO_ICONS[4]}</span>
      <span class="es-deco es-deco-6">${DECO_ICONS[5]}</span>

      <!-- Ambient dots -->
      <span class="es-dot es-dot-1"></span>
      <span class="es-dot es-dot-2"></span>
      <span class="es-dot es-dot-3"></span>
      <span class="es-dot es-dot-4"></span>

      <!-- Main content -->
      ${icon !== '' ? `
      <div class="es-icon-wrap">
        ${icon ?? defaultIcon}
      </div>
      ` : ''}

      <h3 class="es-title">${title}</h3>
      <p class="es-description">${description}</p>

      ${actionButton
      ? `<button id="${actionButton.onClickId}" class="es-btn">
               ${actionButton.label}
             </button>`
      : ""
    }
    </div>
  `;
}