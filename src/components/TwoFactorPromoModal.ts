import { Modal } from './Modal';
import fatoresImg from '../assets/fatores.png';

export function openTwoFactorPromoModal() {
  const { closeModal } = Modal({
    title: '',
    showHeader: false,
    showCancel: false,
    showFooter: false,
    maxWidth: 'max-w-[480px]',
    fieldsPadding: 'p-0',
    content: `
      <div style="display:flex;flex-direction:column;overflow:hidden;border-radius:12px;">

        <!-- Imagem topo + botão X -->
        <div style="position:relative;flex-shrink:0;">
          <img
            src="${fatoresImg}"
            alt=""
            style="width:100%;height:155px;object-fit:cover;display:block;"
          />
          <button
            id="2fa-promo-close-x"
            type="button"
            style="position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:background 0.2s;"
            onmouseover="this.style.background='rgba(0,0,0,0.55)'"
            onmouseout="this.style.background='rgba(0,0,0,0.35)'"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Conteúdo -->
        <div style="padding:16px 20px 18px;display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;flex-direction:column;gap:5px;">
            <h2 style="font-size:16px;font-weight:700;color:var(--color-text);letter-spacing:-0.03em;line-height:1.2;margin:0;">
              Ative a Autenticação em 2 Fatores
            </h2>
            <p style="font-size:12px;color:var(--color-text-secondary);line-height:1.6;margin:0;">
              Adicione uma <strong style="color:var(--color-text);font-weight:600;">camada extra de segurança</strong> à sua conta.
              Com o 2FA ativo, mesmo que alguém descubra sua senha, não conseguirá acessar sem o código enviado ao seu e-mail.
            </p>
          </div>

          <button
            id="2fa-promo-later"
            type="button"
            style="display:flex;align-items:center;justify-content:center;padding:6px 20px;border-radius:10px;background:transparent;color:var(--color-text-secondary);font-size:12px;font-weight:400;letter-spacing:-0.01em;transition:opacity 0.2s;border:none;cursor:pointer;width:100%;opacity:0.55;"
            onmouseover="this.style.opacity='1'"
            onmouseout="this.style.opacity='0.55'"
          >
            Talvez depois
          </button>

          <button
            id="2fa-promo-activate"
            type="button"
            style="display:flex;align-items:center;justify-content:center;padding:10px 20px;border-radius:10px;background:#D97757;color:#fff;font-size:13px;font-weight:600;letter-spacing:-0.01em;transition:background 0.2s;border:none;cursor:pointer;width:100%;"
            onmouseover="this.style.background='#E2886A'"
            onmouseout="this.style.background='#D97757'"
          >
            Ativar agora
          </button>
        </div>

      </div>
    `,
  });

  setTimeout(() => {
    document.getElementById('2fa-promo-close-x')?.addEventListener('click', () => closeModal());
    document.getElementById('2fa-promo-later')?.addEventListener('click', () => closeModal());
    document.getElementById('2fa-promo-activate')?.addEventListener('click', () => {
      closeModal();
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'settings', tab: 'security' } }));
    });
  }, 100);
}
