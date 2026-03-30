import { Modal } from './Modal';

const WHATSAPP_NUMBER = '5511947595786';
const WHATSAPP_MESSAGE = encodeURIComponent('Olá! Preciso de suporte no Controlar Mais. 😊');

export function openSupportModal() {
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
            src="/assets/suporte.png"
            alt=""
            style="width:100%;height:185px;object-fit:cover;display:block;"
          />
          <button
            id="support-close-x"
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
        <div style="padding:22px 22px 26px;display:flex;flex-direction:column;gap:16px;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <h2 style="font-size:18px;font-weight:700;color:var(--color-text);letter-spacing:-0.03em;line-height:1.2;margin:0;">
              Suporte via WhatsApp
            </h2>
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;margin:0;">
              Nosso suporte é feito <strong style="color:var(--color-text);font-weight:600;">100% via WhatsApp</strong>.
              Estamos prontos para te ajudar com qualquer dúvida ou problema!
            </p>
          </div>

          <a
            href="https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}"
            target="_blank"
            rel="noopener noreferrer"
            style="display:flex;align-items:center;justify-content:center;padding:12px 24px;border-radius:12px;background:#D97757;color:#fff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:-0.01em;transition:background 0.2s;"
            onmouseover="this.style.background='#E2886A'"
            onmouseout="this.style.background='#D97757'"
          >
            Abrir conversa no WhatsApp
          </a>
        </div>

      </div>
    `,
  });

  setTimeout(() => {
    document.getElementById('support-close-x')?.addEventListener('click', () => closeModal());
  }, 100);
}
