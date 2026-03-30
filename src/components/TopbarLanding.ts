import gsap from 'gsap';
import { authManager } from '../pages/Auth';
import { animateDynamicIslandEntrance } from './DynamicIsland';

export const TOPBAR_ID = 'landing-topbar';

export function TopbarLanding(): string {
  return `
    <style>
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      #landing-topbar-outer {
        position: fixed;
        top: 16px;
        /* Usando left:0/right:0 + margin:auto para centralizar de forma segura */
        left: 0;
        right: 0;
        z-index: 1000;
        width: 100%;
        max-width: 940px;
        padding: 0 20px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        will-change: max-width;
        /* Garante que nada dentro transborde para fora */
        overflow: visible;
      }

      #${TOPBAR_ID} {
        width: 100%;
        height: 62px;
        border-radius: 999px;
        background: #111111;
        border: 1px solid #222222;
        display: flex;
        align-items: center;
        position: relative;
        z-index: 60;
        box-shadow: 0 4px 30px rgba(0,0,0,0.5);
        /* Impede que conteúdo interno quebre o layout */
        min-width: 0;
        overflow: hidden;
      }

      #landing-topbar-content {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 10px 0 24px;
        height: 100%;
        min-width: 0;
      }

      #landing-logo {
        flex-shrink: 0;
      }

      #landing-desktop-nav {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      #landing-topbar-actions {
        flex-shrink: 0;
      }

      #landing-mobile-toggle {
        display: none;
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(18, 18, 18, 0.4);
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #fff;
        margin-right: 8px;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      #landing-mobile-toggle:active {
        transform: scale(0.9);
      }

      /* ── Mobile Menu ── */
      #landing-mobile-menu {
        position: absolute;
        top: 74px;
        left: 20px;
        right: 20px;
        width: auto;
        background: #141414;
        border: 1px solid #2B2B2B;
        border-radius: 20px;
        padding: 16px 10px 10px 10px;
        display: none;
        flex-direction: column;
        gap: 4px;
        transform-origin: top center;
        z-index: 50;
        box-shadow: 0 15px 35px rgba(0,0,0,0.5);
        overflow: hidden;
      }

      .mobile-nav-link {
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        color: rgba(255,255,255,0.4);
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        transition: all 0.2s;
        -webkit-tap-highlight-color: transparent;
      }

      #landing-mobile-menu .mobile-nav-link:hover,
      #landing-mobile-menu .mobile-nav-link:active {
        background: rgba(255,255,255,0.06);
        color: #fff !important;
      }

      /* ── V2 Banner ── */
      #landing-v2-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px 6px 12px;
        border-radius: 0 0 14px 14px;
        background: #1c283a;
        border: 1px solid rgba(147, 197, 253, 0.12);
        border-top: none;
        white-space: nowrap;
        font-size: 11px;
        font-weight: 500;
        color: rgba(160, 200, 245, 0.95);
        letter-spacing: 0.02em;
        pointer-events: none;
        transform-origin: top center;
        /* Nunca ultrapassa o pai */
        max-width: 100%;
        width: fit-content;
        margin: 0 auto;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        overflow: hidden;
      }

      #landing-v2-banner lottie-player {
        flex-shrink: 0;
      }

      /* ── Responsive ── */
      @media (max-width: 820px) {
        #landing-desktop-nav,
        #landing-topbar-actions {
          display: none !important;
        }

        #landing-mobile-toggle {
          display: flex !important;
        }
        
        #landing-mobile-menu {
          left: 16px;
          right: 16px;
          top: 68px;
        }

        #landing-topbar-outer {
          top: 8px;
          left: 0;
          right: 0;
          width: 100%;
          max-width: 100vw;
          padding: 0 16px;
          margin: 0;
          box-sizing: border-box;
          overflow: visible;
        }

        #${TOPBAR_ID} {
          height: 56px;
          border-radius: 999px;
          width: 100%;
          box-sizing: border-box;
        }

        #landing-topbar-content {
          padding: 0 8px 0 16px;
          width: 100%;
          box-sizing: border-box;
        }

        #landing-v2-banner {
          white-space: normal;
          text-align: center;
          line-height: 1.3;
          max-width: 100%;
          width: 90%;
          border-radius: 0 0 16px 16px;
          justify-content: center;
          padding: 8px 12px;
          box-sizing: border-box;
        }

        #landing-v2-banner span {
          display: inline-block;
          max-width: calc(100% - 44px);
          word-break: break-word;
          white-space: normal;
        }
      }

      @media (max-width: 480px) {
        #landing-topbar-outer {
          padding: 0 12px;
        }

        #landing-mobile-menu {
          left: 12px;
          right: 12px;
        }
        
        #landing-v2-banner {
          width: 95%;
          padding: 6px 8px;
          font-size: 10.5px;
          gap: 6px;
        }
        
        #landing-v2-banner span {
          max-width: calc(100% - 36px);
        }

        #landing-v2-banner lottie-player {
          width: 16px !important;
          height: 16px !important;
          flex-shrink: 0;
        }
      }

      /* ── Section Scroll Adjust ── */
      #landing-hero,
      #landing-bento-section,
      #landing-pricing-section,
      #landing-testimonials-section,
      #landing-faq-section {
        scroll-margin-top: 110px;
      }
    </style>

    <div id="landing-topbar-outer">
      <!-- Backdrop que desfoca o fundo da página ao abrir o menu -->
      <div id="landing-mobile-backdrop" style="
        position: fixed;
        inset: -100vw;
        background: rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: -1;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      "></div>

      <div id="${TOPBAR_ID}">
        <div id="landing-topbar-content">

          <div id="landing-logo" style="display: flex; align-items: center; cursor: pointer;" onclick="window.scrollTo({top:0, behavior:'smooth'})">
            <img src="/assets/logo/logo.png" alt="ControlarMais" style="height: 32px; width: auto; object-fit: contain;" />
          </div>

          <nav id="landing-desktop-nav">
            ${[
      { label: 'Início', target: 'landing-hero' },
      { label: 'Funcionalidades', target: 'landing-bento-section' },
      { label: 'Preço', target: 'landing-pricing-section' },
      { label: 'Depoimentos', target: 'landing-testimonials-section' },
    ].map(({ label, target }) => `
              <a href="#${target}" data-nav-link data-target="${target}" style="
                padding: 8px 16px;
                border-radius: 999px;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.5);
                text-decoration: none;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              "
                onmouseover="this.style.color='#fff';this.style.background='rgba(255,255,255,0.06)'"
                onmouseout="this.style.color='rgba(255,255,255,0.5)';this.style.background='transparent'"
              >${label}</a>
            `).join('')}
          </nav>

          <div id="landing-topbar-actions">
            <button id="landing-signup-btn" style="
              height: 40px; padding: 0 24px; border-radius: 12px;
              border: 1px solid #1C1C1C; background: #111111; color: #ffffff;
              font-size: 13px; font-weight: 600; font-family: inherit;
              cursor: pointer; transition: all 0.2s;
              box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            "
              onmouseover="this.style.background='#1A1A1A';this.style.borderColor='#2A2A2A'"
              onmouseout="this.style.background='#111111';this.style.borderColor='#1C1C1C'"
            >Aproveitar oferta</button>
          </div>

          <button id="landing-mobile-toggle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>

        </div>
      </div>

      <div id="landing-v2-banner" style="position: relative; z-index: 40;">
        <lottie-player
          src="/assets/lottie/confetti.json"
          background="transparent"
          speed="1"
          style="width:24px;height:24px;"
          id="v2-confetti-left"
        ></lottie-player>
        <span>Bem-vindo ao <strong style="color:rgba(180,215,255,0.95);font-weight:600;">Controlar+</strong></span>
        <lottie-player
          src="/assets/lottie/confetti.json"
          background="transparent"
          speed="1"
          style="width:24px;height:24px;transform:scaleX(-1);"
          id="v2-confetti-right"
        ></lottie-player>
      </div>

      <nav id="landing-mobile-menu">
        ${[
      { label: 'Início', target: 'landing-hero' },
      { label: 'Funcionalidades', target: 'landing-bento-section' },
      { label: 'Preço', target: 'landing-pricing-section' },
      { label: 'Depoimentos', target: 'landing-testimonials-section' },
    ].map(({ label, target }) => `
          <a href="#${target}" class="mobile-nav-link" data-nav-link data-target="${target}">${label}</a>
        `).join('')}
        <div style="height: 1px; background: rgba(255,255,255,0.04); margin: 12px 0;"></div>
        
        <div style="padding-bottom: 4px;">
          <div id="landing-mobile-actions">
          <button id="landing-mobile-signup" style="
            width: 100%; height: 48px; border-radius: 12px; 
            border: 1px solid #1C1C1C; background: #111111; color: #fff; 
            font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          "
            onmouseover="this.style.background='#1A1A1A';this.style.borderColor='#2A2A2A'"
            onmouseout="this.style.background='#111111';this.style.borderColor='#1C1C1C'"
          >Aproveitar oferta</button>
        </div>
      </nav>
    </div>
  `;
}

export function attachTopbarLandingListeners() {
  const outer = document.getElementById('landing-topbar-outer');
  const toggle = document.getElementById('landing-mobile-toggle');
  const menu = document.getElementById('landing-mobile-menu');
  const backdrop = document.getElementById('landing-mobile-backdrop');
  if (!outer || !toggle || !menu) return;

  // 1. Mobile Toggle
  let isMenuOpen = false;
  const toggleMenu = (open: boolean) => {
    isMenuOpen = open;
    gsap.killTweensOf(menu);

    if (open) {
      if (backdrop) {
        backdrop.style.opacity = '1';
        backdrop.style.pointerEvents = 'auto';
      }
      menu.style.display = 'flex';
      gsap.fromTo(menu,
        { opacity: 0, y: -20, scale: 0.9, filter: 'blur(8px)' },
        {
          opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
          duration: 0.6,
          ease: 'elastic.out(1.2, 0.6)'
        }
      );
      toggle.innerHTML = '<svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      if (backdrop) {
        backdrop.style.opacity = '0';
        backdrop.style.pointerEvents = 'none';
      }
      gsap.to(menu, {
        opacity: 0, y: -10, scale: 0.95, filter: 'blur(4px)',
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => { menu.style.display = 'none'; }
      });
      toggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    }
  };

  toggle.addEventListener('click', () => toggleMenu(!isMenuOpen));
  backdrop?.addEventListener('click', () => toggleMenu(false));

  // Close menu on link click
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // 2. Entrance Animation
  animateDynamicIslandEntrance(TOPBAR_ID);

  // 3. Auth Listeners
  const showLogin = () => { authManager.showLogin(); menu.classList.remove('active'); };
  const showSignup = () => { 
    sessionStorage.setItem('landingPromotionCode', 'LANCAMENTO50');
    authManager.showSignup(); 
    menu.classList.remove('active'); 
  };

  document.getElementById('landing-login-btn')?.addEventListener('click', showLogin);
  document.getElementById('landing-signup-btn')?.addEventListener('click', showSignup);
  document.getElementById('landing-mobile-login')?.addEventListener('click', showLogin);
  document.getElementById('landing-mobile-signup')?.addEventListener('click', showSignup);

  // 4. Smooth scroll nos links do topbar
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-link][data-target]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.dataset.target!;
      const section = document.getElementById(targetId);
      if (!section) return;
      const offset = window.innerWidth < 820 ? 70 : 85;
      const top = section.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // 4. Shrink effect on scroll
  setupTopbarScroll();

  // 5. Confetti Interval
  setupConfettiInterval();
}

function setupTopbarScroll() {
  const outer = document.getElementById('landing-topbar-outer');
  if (!outer) return;

  const THRESHOLD = 60;
  let isScrolled = false;

  function shrink() {
    gsap.killTweensOf(outer);
    const tl = gsap.timeline();
    tl.to(outer, {
      maxWidth: 640,
      duration: 0.16,
      ease: 'power2.in',
    });
    tl.to(outer, {
      maxWidth: 700,
      duration: 0.75,
      ease: 'elastic.out(1.2, 0.4)',
    });
  }

  function expand() {
    gsap.killTweensOf(outer);
    const tl = gsap.timeline();
    tl.to(outer, {
      maxWidth: 960, // Sutil overshoot
      duration: 0.16,
      ease: 'power2.in',
    });
    tl.to(outer, {
      maxWidth: 900,
      duration: 0.75,
      ease: 'elastic.out(1.2, 0.4)',
      clearProps: 'maxWidth',
    });
  }

  function onScroll() {
    if (window.innerWidth <= 820) return;
    const shouldShrink = window.scrollY > THRESHOLD;
    if (shouldShrink === isScrolled) return;
    isScrolled = shouldShrink;
    if (shouldShrink) shrink(); else expand();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

function setupConfettiInterval() {
  type LottieEl = HTMLElement & { play: () => void; stop: () => void };

  function playOnce() {
    const left = document.getElementById('v2-confetti-left') as LottieEl | null;
    const right = document.getElementById('v2-confetti-right') as LottieEl | null;
    if (!left || !right) return;
    left.stop(); right.stop();
    left.play(); right.play();
  }

  setTimeout(playOnce, 600);
  const id = setInterval(() => {
    if (!document.getElementById('v2-confetti-left')) { clearInterval(id); return; }
    playOnce();
  }, 4000);
}
