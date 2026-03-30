import { Modal } from './Modal';
import confetti from 'canvas-confetti';

// ─── CONFETE ─────────────────────────────────────────────────────────────────

const COLORS = [
  '#D97757', '#E2886A', '#F4A460',
  '#FFD166', '#06D6A0', '#118AB2',
  '#EF476F', '#A8DADC', '#C084B4', '#FFB347',
];

const BASE: confetti.Options = {
  colors:  COLORS,
  shapes:  ['square', 'circle'],
  disableForReducedMotion: true,
};

function launchConfetti(): () => void {
  const pop: confetti.Options = {
    ...BASE,
    ticks:         180,
    gravity:       1.1,
    startVelocity: 48,
    spread:        58,
    scalar:        1.05,
  };

  const COUNT = 48;

  // Pop simultâneo dos 4 cantos em direção ao centro
  confetti({ ...pop, particleCount: COUNT, angle: 315, origin: { x: 0, y: 0 } });
  confetti({ ...pop, particleCount: COUNT, angle: 225, origin: { x: 1, y: 0 } });
  confetti({ ...pop, particleCount: COUNT, angle:  45, origin: { x: 0, y: 1 } });
  confetti({ ...pop, particleCount: COUNT, angle: 135, origin: { x: 1, y: 1 } });

  // Micro-burst central
  setTimeout(() =>
    confetti({ ...pop, particleCount: 35, spread: 360, startVelocity: 22, origin: { x: 0.5, y: 0.5 } }),
  120);

  // Garante que o canvas do canvas-confetti fica acima do modal (z-9999)
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLCanvasElement>('canvas').forEach(c => {
      if (c.style.position === 'fixed') c.style.zIndex = '99999';
    });
  });

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;

    const cvs = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas'))
      .find(c => c.style.position === 'fixed');

    if (!cvs) { confetti.reset(); return; }
    let alpha = 1;
    const fade = () => {
      alpha -= 0.06;
      if (alpha <= 0) { confetti.reset(); return; }
      cvs.style.opacity = String(alpha);
      requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
  };
}

// ─── MODAL ───────────────────────────────────────────────────────────────────

export function openWelcomeModal(name: string, onContinue: () => void) {
  // Guard: evita abrir dois modais simultâneos
  if (document.getElementById('welcome-close-x')) return;

  const firstName = name.split(' ')[0] || 'por aqui';

  const { closeModal } = Modal({
    title: '',
    showHeader: false,
    showCancel: false,
    showFooter: false,
    maxWidth: 'max-w-[560px]',
    fieldsPadding: 'p-0',
    content: `
      <div style="display:flex;flex-direction:column;overflow:hidden;border-radius:12px;">

        <!-- Imagem topo + botão X -->
        <div style="position:relative;flex-shrink:0;">
          <img
            src="/assets/welcome.png"
            alt=""
            style="width:100%;height:185px;object-fit:cover;display:block;"
          />
          <button
            id="welcome-close-x"
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
        <div style="padding:22px 22px 26px;">
          <h2 style="font-size:19px;font-weight:700;color:var(--color-text);letter-spacing:-0.03em;line-height:1.2;margin:0 0 14px;">
            Olá, ${firstName}!
          </h2>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;margin:0;">
              Bem-vindo ao <strong style="color:var(--color-text);font-weight:600;">Controlar+</strong>, sua plataforma completa de gestão financeira pessoal. Aqui você tem uma visão clara e em tempo real de tudo que envolve o seu dinheiro: receitas, despesas, investimentos e muito mais.
            </p>
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;margin:0;">
              Conecte suas contas bancárias e cartões de crédito para sincronização automática de transações. Crie categorias personalizadas, defina metas de gastos e acompanhe sua evolução mês a mês com gráficos detalhados.
            </p>
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;margin:0;">
              Gerencie seu patrimônio com poupanças, caixinhas e registro de bens materiais como imóveis e veículos. Controle assinaturas recorrentes, configure lembretes de pagamento e nunca mais perca um vencimento.
            </p>
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;margin:0;">
              Tudo pensado para ser simples, bonito e poderoso. <strong style="color:var(--color-text);font-weight:600;">Seu controle financeiro começa agora.</strong>
            </p>
          </div>
        </div>

      </div>
    `,
  });

  // Remove glow do card
  setTimeout(() => {
    document.getElementById('welcome-close-x')
      ?.closest<HTMLElement>('.dynamic-island')
      ?.style.setProperty('box-shadow', 'none');
  }, 0);

  const stopConfetti = launchConfetti();

  setTimeout(() => {
    document.getElementById('welcome-close-x')?.addEventListener('click', () => {
      stopConfetti();
      closeModal();
      setTimeout(onContinue, 300);
    });
  }, 100);
}

// ─── DEV HELPER ──────────────────────────────────────────────────────────────
// Console: testWelcome()  |  testWelcome("Ana Lima")
if (import.meta.env.DEV) {
  (window as any).testWelcome = (name = 'Teste') =>
    openWelcomeModal(name, () => console.log('[WelcomeModal] onContinue disparado'));
}
