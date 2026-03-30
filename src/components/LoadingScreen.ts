export function renderLoading() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <style>
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .shimmer {
        background: linear-gradient(
          90deg,
          var(--color-text-secondary) 0%,
          var(--color-text-secondary) 35%,
          var(--color-text) 50%,
          var(--color-text-secondary) 65%,
          var(--color-text-secondary) 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 2s linear infinite;
      }
      .spinner {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 1.5px solid var(--color-border);
        border-top-color: var(--color-text-secondary);
        animation: spin 0.8s linear infinite;
        flex-shrink: 0;
      }
    </style>

    <div class="min-h-screen w-full flex items-center justify-center">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="spinner"></div>
        <span class="shimmer text-sm tracking-widest uppercase">
          Autenticando acesso
        </span>
      </div>
    </div>
  `;
}