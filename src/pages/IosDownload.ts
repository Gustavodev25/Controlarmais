import gsap from 'gsap';
import { TopbarLanding, attachTopbarLandingListeners } from '../components/TopbarLanding';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { themeManager } from '../components/ThemeManager';

const BRILHO_ID = 'ios-brilho-root';

function mountBrilho() {
  document.getElementById(BRILHO_ID)?.remove();
  const host = document.createElement('div');
  host.id = BRILHO_ID;
  host.innerHTML = BrilhoHeader();
  document.body.appendChild(host);
}

export function renderIosDownloadPage() {
  themeManager.forceDark();
  document.getElementById('landing-brilho-root')?.remove();
  document.getElementById('landing-styles')?.remove();
  mountBrilho();

  const app = document.getElementById('app')!;
  document.title = "Baixar para iOS | Controlar+";
  document.documentElement.lang = 'pt-BR';

  // Configuração de scroll
  document.documentElement.style.overflowX = 'hidden';
  document.documentElement.style.overflowY = 'auto';
  document.body.style.overflowX = 'hidden';
  document.body.style.overflowY = 'visible';
  document.body.style.width = '100%';
  document.body.style.height = 'auto';
  app.style.height = 'auto';
  app.style.overflow = 'visible';
  app.style.width = '100%';

  app.innerHTML = `
    <style>
      #ios-download-wrapper {
        min-height: 100vh;
        width: 100%;
        background-color: #0C0C0C;
        position: relative;
        overflow-x: hidden;
        color: #ffffff;
        display: flex;
        flex-direction: column;
      }

      #ios-content-container {
        flex: 1;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 140px 24px 80px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 60px;
        align-items: center;
        position: relative;
        z-index: 10;
      }

      #ios-left-col {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
      }

      #ios-phone-wrapper {
        position: relative;
        width: 100%;
        max-width: 360px;
        transform-style: preserve-3d;
        perspective: 1000px;
      }

      #ios-phone-shadow {
        position: absolute;
        bottom: -30px;
        left: 10%;
        width: 80%;
        height: 20px;
        background: radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%);
        filter: blur(8px);
        z-index: 1;
        pointer-events: none;
      }



      #ios-phone-img {
        width: 100%;
        height: auto;
        display: block;
        position: relative;
        z-index: 3;
        filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.55));
      }

      #ios-right-col {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }

      .ios-badge {
        display: inline-flex;
        align-items: center;
        gap: 0;
        padding: 0;
        color: rgba(255, 255, 255, 0.35);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin-bottom: 20px;
      }

      .ios-title {
        font-size: clamp(32px, 4.5vw, 52px);
        font-weight: 750;
        line-height: 1.12;
        letter-spacing: -0.02em;
        color: #ffffff;
        margin: 0 0 20px;
      }



      .ios-desc {
        font-size: clamp(15px, 1.8vw, 17px);
        line-height: 1.65;
        color: rgba(255, 255, 255, 0.55);
        margin: 0 0 36px;
        max-width: 490px;
      }

      #ios-download-btn {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        height: 52px;
        padding: 0 32px;
        border-radius: 14px;
        background: #ffffff;
        color: #0C0C0C;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        box-shadow: 0 15px 35px rgba(255, 255, 255, 0.1);
        transform-origin: center center;
        will-change: transform, border-radius, box-shadow, background-color;
        transition: box-shadow 0.3s ease;
      }

      #ios-download-btn:hover {
        box-shadow: 0 18px 40px rgba(255, 255, 255, 0.18);
      }


      #ios-back-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: rgba(255, 255, 255, 0.4);
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        margin-top: 32px;
        cursor: pointer;
        transition: color 0.2s ease, transform 0.2s ease;
      }

      #ios-back-link:hover {
        color: #ffffff;
        transform: translateX(-3px);
      }

      @media (max-width: 820px) {
        #ios-content-container {
          grid-template-columns: 1fr;
          gap: 40px;
          padding: 110px 24px 60px;
          text-align: center;
        }

        #ios-right-col {
          align-items: center;
          text-align: center;
        }

        .ios-desc {
          margin: 0 auto 30px;
        }


      }
    </style>

    <div id="ios-download-wrapper">
      ${TopbarLanding()}

      <main id="ios-content-container">
        <!-- Coluna da Esquerda: Celular com animação de flutuação -->
        <div id="ios-left-col">
          <div id="ios-phone-wrapper">
            <img id="ios-phone-img" src="/assets/celular.png" alt="Controlar+ no iPhone" />
            <div id="ios-phone-shadow"></div>
          </div>
        </div>

        <!-- Coluna da Direita: Conteúdo de Chamada -->
        <div id="ios-right-col">
          <div class="ios-badge">Disponível na App Store</div>

          <h1 class="ios-title">
            O Controlar+ já está<br/>
            disponível no iOS
          </h1>

          <p class="ios-desc">
            Organize suas finanças de forma simples e intuitiva. Sincronize suas contas bancárias automaticamente, acompanhe suas faturas e tome decisões inteligentes em tempo real.
          </p>

          <a id="ios-download-btn" href="https://apps.apple.com/br/app/controlar/id6759493317?l=en-GB" target="_blank" rel="noopener noreferrer">
            <!-- Ícone da Apple em SVG -->
            <svg width="18" height="22" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            Baixar na App Store
          </a>


          <a id="ios-back-link" href="#">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Voltar para o site
          </a>
        </div>
      </main>
    </div>
  `;

  // Animação e listeners
  attachTopbarLandingListeners();
  
  // Customização dos links da Topbar para que, se clicados na página de iOS,
  // primeiro voltemos para a home, e então rolem até a seção correspondente
  document.querySelectorAll<HTMLAnchorElement>('#ios-download-wrapper [data-nav-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.dataset.target;
      if (!targetId) return;

      // Altera o hash para a home e salva no sessionStorage o target para onde ir
      sessionStorage.setItem('scrollTargetAfterHome', targetId);
      window.location.hash = ''; // vai disparar o hashchange que renderiza a home
    });
  });

  // Listener para voltar ao topo ou home quando clicar no Logo
  const logo = document.querySelector('#ios-download-wrapper #landing-logo');
  if (logo) {
    logo.removeAttribute('onclick');
    logo.addEventListener('click', () => {
      window.location.hash = '';
    });
  }

  // Listener de voltar no link abaixo do formulário
  document.getElementById('ios-back-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '';
  });

  // 1. Animação de entrada dos textos e botão com GSAP
  gsap.from('.ios-badge', {
    opacity: 0,
    y: -15,
    duration: 0.6,
    ease: 'power3.out',
  });

  gsap.from('.ios-title', {
    opacity: 0,
    y: 20,
    duration: 0.8,
    delay: 0.1,
    ease: 'power3.out',
  });

  gsap.from('.ios-desc', {
    opacity: 0,
    y: 15,
    duration: 0.8,
    delay: 0.2,
    ease: 'power3.out',
  });

  const downloadBtn = document.getElementById('ios-download-btn');
  if (downloadBtn) {
    gsap.from(downloadBtn, {
      opacity: 0,
      scale: 0.9,
      y: 10,
      duration: 0.8,
      delay: 0.3,
      ease: 'elastic.out(1, 0.5)',
    });
    setupIosButtonMorph(downloadBtn);
  }



  gsap.from('#ios-back-link', {
    opacity: 0,
    y: 10,
    duration: 0.6,
    delay: 0.7,
    ease: 'power3.out',
  });

  // 2. Animação 3D de Flutuação e Entrada do Celular
  const phoneWrapper = document.getElementById('ios-phone-wrapper');
  if (phoneWrapper) {
    // Entrada elegante do celular
    gsap.from(phoneWrapper, {
      opacity: 0,
      x: 50,
      rotationY: -15,
      duration: 1.2,
      delay: 0.1,
      ease: 'power4.out',
    });

    // Loop infinito de flutuação e rotação 3D bem sutil
    gsap.to(phoneWrapper, {
      y: -12,
      rotation: 1,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
    });

    // Sincroniza a sombra do celular para crescer/encolher conforme flutua
    const phoneShadow = document.getElementById('ios-phone-shadow');
    if (phoneShadow) {
      gsap.to(phoneShadow, {
        scale: 0.88,
        opacity: 0.45,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
    }
  }
}

// Morphismo elástico para o botão "Baixar na App Store"
function setupIosButtonMorph(button: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const onEnter = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      scaleX: 1.05,
      scaleY: 0.95,
      y: -2,
      borderRadius: 18,
      backgroundColor: '#f6f6f6',
      boxShadow: '0 20px 45px rgba(255, 255, 255, 0.15)',
      duration: 0.44,
      ease: 'elastic.out(0.9, 0.46)',
    });
  };

  const onLeave = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      scaleX: 1,
      scaleY: 1,
      y: 0,
      borderRadius: 14,
      backgroundColor: '#ffffff',
      boxShadow: '0 15px 35px rgba(255, 255, 255, 0.1)',
      duration: 0.68,
      ease: 'elastic.out(0.85, 0.5)',
    });
  };

  const onPointerDown = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      scaleX: 0.96,
      scaleY: 1.04,
      y: 0,
      borderRadius: 20,
      backgroundColor: '#e6e6e6',
      boxShadow: '0 8px 20px rgba(255, 255, 255, 0.08)',
      duration: 0.14,
      ease: 'power3.out',
    });
  };

  const onPointerUp = () => {
    onEnter();
  };

  button.addEventListener('mouseenter', onEnter);
  button.addEventListener('mouseleave', onLeave);
  button.addEventListener('pointerdown', onPointerDown);
  button.addEventListener('pointerup', onPointerUp);
  button.addEventListener('pointercancel', onLeave);
}
