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
        overflow: visible;
        will-change: max-width, transform;
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
        min-width: 0;
        overflow: visible;
        will-change: height, border-radius, transform, box-shadow;
      }

      #landing-topbar-content {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 10px 0 24px;
        height: 100%;
        min-width: 0;
        will-change: padding;
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
        -webkit-tap-highlight-color: transparent;
        will-change: transform;
      }

      #landing-mobile-toggle:active {
        transform: scale(0.9);
      }

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
        will-change: transform, opacity, filter, border-radius;
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
        transform-origin: center center;
        will-change: transform, border-radius, background-color, color;
        -webkit-tap-highlight-color: transparent;
      }



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


      }

      @media (max-width: 480px) {
        #landing-topbar-outer {
          padding: 0 12px;
        }

        #landing-mobile-menu {
          left: 12px;
          right: 12px;
        }
        

      }

      #landing-hero,
      #landing-bento-section,
      #landing-pricing-section,
      #landing-testimonials-section,
      #landing-faq-section {
        scroll-margin-top: 110px;
      }

      /* iOS Dropdown */
      .ios-dd {
        position: fixed;
        z-index: 99999;
        min-width: 240px;
        background: #111111;
        border: 1px solid #1C1C1C;
        border-radius: 16px;
        padding: 6px;
        display: none;
        opacity: 0;
      }

      .ios-dd-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        color: #ffffff;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
        transition: background 0.15s ease;
        cursor: pointer;
      }

      .ios-dd-item:hover {
        background: rgba(255,255,255,0.06);
      }

      .ios-dd-item svg {
        flex-shrink: 0;
        opacity: 0.5;
      }

      .ios-dd-sub {
        font-size: 11px;
        color: rgba(255,255,255,0.35);
        font-weight: 500;
        margin-top: 2px;
      }
    </style>

    <div id="landing-topbar-outer">
      <div id="landing-mobile-backdrop" style="
        position: fixed;
        inset: -100vw;
        background: rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: -1;
        opacity: 0;
        pointer-events: none;
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
              <a href="#${target}" class="desktop-nav-link" data-nav-link data-target="${target}" style="
                padding: 8px 16px;
                border-radius: 999px;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.5);
                text-decoration: none;
                display: inline-block;
                transform-origin: center center;
                will-change: transform, border-radius, background-color, color;
              ">${label}</a>
            `).join('')}
          </nav>

          <div id="landing-topbar-actions" style="display: flex; align-items: center; gap: 10px;">
            <div style="position: relative;">
              <button id="landing-ios-btn" style="
                height: 40px;
                padding: 0 18px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.12);
                background: #ffffff;
                color: #111111;
                font-size: 13px;
                font-weight: 600;
                font-family: inherit;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.25);
                transform-origin: center center;
                will-change: transform, border-radius, box-shadow, background, border-color;
              ">
                <svg width="14" height="17" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </svg>
                Baixar iOS
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div id="landing-ios-dropdown" class="ios-dd">
                <a class="ios-dd-item" href="https://apps.apple.com/br/app/controlar/id6759493317?l=en-GB" target="_blank" rel="noopener noreferrer">
                  <svg width="16" height="20" viewBox="0 0 384 512" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                  <div style="display:flex;flex-direction:column;gap:2px">
                    <span>Disponível na App Store</span>
                    <span class="ios-dd-sub">Lançamento oficial para iPhone</span>
                  </div>
                </a>
              </div>
            </div>
            <button id="landing-login-btn" style="
              height: 40px;
              padding: 0 24px;
              border-radius: 12px;
              border: 1px solid #1C1C1C;
              background: #111111;
              color: #ffffff;
              font-size: 13px;
              font-weight: 600;
              font-family: inherit;
              cursor: pointer;
              box-shadow: 0 4px 15px rgba(0,0,0,0.3);
              transform-origin: center center;
              will-change: transform, border-radius, box-shadow, background, border-color;
            ">Entrar/Cadastro</button>
          </div>
          <button id="landing-mobile-toggle" aria-label="Abrir menu" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>



      <nav id="landing-mobile-menu" aria-label="Menu mobile">
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
          <div id="landing-mobile-actions" style="display: flex; flex-direction: column; gap: 10px;">
            <a id="landing-mobile-ios" href="https://apps.apple.com/br/app/controlar/id6759493317?l=en-GB" target="_blank" rel="noopener noreferrer" style="
              width: 100%;
              height: 48px;
              border-radius: 12px;
              border: none;
              background: #ffffff;
              color: #111111;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              text-decoration: none;
              box-shadow: 0 4px 15px rgba(0,0,0,0.25);
              transform-origin: center center;
              will-change: transform, border-radius, box-shadow, background, border-color;
            ">
              <svg width="15" height="18" viewBox="0 0 384 512" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              Baixar iOS
            </a>
            <button id="landing-mobile-login" style="
              width: 100%;
              height: 48px;
              border-radius: 12px;
              border: 1px solid #1C1C1C;
              background: #111111;
              color: #fff;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 4px 15px rgba(0,0,0,0.3);
              transform-origin: center center;
              will-change: transform, border-radius, box-shadow, background, border-color;
            ">Login</button>
          </div>
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

  let isMenuOpen = false;

  const toggleMenu = (open: boolean) => {
    isMenuOpen = open;

    const menuItems = menu.querySelectorAll<HTMLElement>(
      '.mobile-nav-link, #landing-mobile-actions'
    );

    gsap.killTweensOf([menu, toggle, backdrop, menuItems]);

    if (open) {
      toggle.setAttribute('aria-label', 'Fechar menu');

      if (backdrop) {
        gsap.to(backdrop, {
          opacity: 1,
          duration: 0.35,
          ease: 'power3.out',
          onStart: () => {
            backdrop.style.pointerEvents = 'auto';
          },
        });
      }

      menu.style.display = 'flex';

      gsap.set(menuItems, {
        opacity: 0,
        y: -8,
        filter: 'blur(6px)',
      });

      gsap.fromTo(
        menu,
        {
          opacity: 0,
          y: -18,
          scaleX: 0.72,
          scaleY: 0.18,
          borderRadius: 999,
          filter: 'blur(12px)',
          transformOrigin: '50% 0%',
        },
        {
          opacity: 1,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          borderRadius: 20,
          filter: 'blur(0px)',
          duration: 0.86,
          ease: 'elastic.out(0.92, 0.52)',
        }
      );

      gsap.to(menuItems, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.42,
        ease: 'power3.out',
        stagger: 0.045,
        delay: 0.08,
      });

      gsap.fromTo(
        toggle,
        { scale: 0.92, rotate: -8 },
        {
          scale: 1,
          rotate: 0,
          duration: 0.55,
          ease: 'elastic.out(0.9, 0.45)',
        }
      );

      toggle.innerHTML = '<svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      toggle.setAttribute('aria-label', 'Abrir menu');

      if (backdrop) {
        gsap.to(backdrop, {
          opacity: 0,
          duration: 0.28,
          ease: 'power2.out',
          onComplete: () => {
            backdrop.style.pointerEvents = 'none';
          },
        });
      }

      gsap.to(menuItems, {
        opacity: 0,
        y: -6,
        filter: 'blur(5px)',
        duration: 0.16,
        ease: 'power2.in',
        stagger: {
          each: 0.025,
          from: 'end',
        },
      });

      gsap.to(menu, {
        opacity: 0,
        y: -14,
        scaleX: 0.78,
        scaleY: 0.16,
        borderRadius: 999,
        filter: 'blur(10px)',
        duration: 0.32,
        ease: 'power3.inOut',
        delay: 0.04,
        onComplete: () => {
          menu.style.display = 'none';

          gsap.set(menu, {
            clearProps: 'opacity,y,scaleX,scaleY,borderRadius,filter,transformOrigin',
          });

          gsap.set(menuItems, {
            clearProps: 'opacity,y,filter',
          });
        },
      });

      gsap.fromTo(
        toggle,
        { scale: 0.92, rotate: 8 },
        {
          scale: 1,
          rotate: 0,
          duration: 0.45,
          ease: 'elastic.out(0.85, 0.45)',
        }
      );

      toggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    }
  };

  toggle.addEventListener('click', () => toggleMenu(!isMenuOpen));
  backdrop?.addEventListener('click', () => toggleMenu(false));

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  animateDynamicIslandEntrance(TOPBAR_ID);

  const closeMobileMenuIfNeeded = () => {
    if (isMenuOpen) toggleMenu(false);
  };

  const showLogin = () => {
    closeMobileMenuIfNeeded();
    authManager.showLogin();
  };

  const showSignup = () => {
    closeMobileMenuIfNeeded();
    sessionStorage.setItem('landingPromotionCode', 'LANCAMENTO50');
    authManager.showSignup();
  };

  const loginBtn = document.getElementById('landing-login-btn');
  const mobileLoginBtn = document.getElementById('landing-mobile-login');

  loginBtn?.addEventListener('click', showLogin);
  mobileLoginBtn?.addEventListener('click', showLogin);

  if (loginBtn) setupTopbarButtonMorph(loginBtn);
  if (mobileLoginBtn) setupTopbarButtonMorph(mobileLoginBtn);

  // === iOS Dropdown (Desktop) ===
  const iosBtn = document.getElementById('landing-ios-btn');
  const iosDropdown = document.getElementById('landing-ios-dropdown');
  if (iosBtn && iosDropdown) {
    setupWhiteButtonMorph(iosBtn);
    let iosOpen = false;

    // Move to body as fixed for proper z-index
    iosDropdown.style.position = 'fixed';
    document.body.appendChild(iosDropdown);

    const syncPos = () => {
      const r = iosBtn.getBoundingClientRect();
      iosDropdown.style.top = `${r.bottom + 8}px`;
      iosDropdown.style.left = `${Math.max(12, r.right - 240)}px`;
    };

    let iosAnim: gsap.core.Timeline | null = null;
    const iosItem = iosDropdown.querySelector('.ios-dd-item') as HTMLElement | null;

    const openIos = () => {
      if (iosOpen) return;
      iosOpen = true;
      syncPos();

      if (iosAnim) iosAnim.kill();
      gsap.set(iosDropdown, { display: 'block' });

      iosAnim = gsap.timeline();

      // 1. Container: elastic scale + borderRadius
      iosAnim.fromTo(iosDropdown,
        { scaleX: 0.8, scaleY: 0.5, y: -15, opacity: 0, borderRadius: '35px', transformOrigin: 'top right' },
        { scaleX: 1, scaleY: 1, y: 0, opacity: 1, borderRadius: '16px', duration: 0.8, ease: 'elastic.out(1.15, 0.4)', clearProps: 'transform' },
        0
      );

      // 2. Content: deblur
      if (iosItem) {
        iosAnim.fromTo(iosItem,
          { opacity: 0, filter: 'blur(6px)', scale: 0.95 },
          { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 0.35, ease: 'power2.out' },
          0.05
        );
      }
    };

    const closeIos = () => {
      if (!iosOpen) return;
      iosOpen = false;

      if (iosAnim) iosAnim.kill();

      iosAnim = gsap.timeline({
        onComplete: () => { gsap.set(iosDropdown, { display: 'none' }); },
      });

      if (iosItem) {
        iosAnim.to(iosItem, { opacity: 0, filter: 'blur(4px)', duration: 0.15, ease: 'power2.in' }, 0);
      }

      iosAnim.to(iosDropdown,
        { scaleX: 0.85, scaleY: 0.5, y: -10, opacity: 0, borderRadius: '30px', duration: 0.22, ease: 'power3.in' },
        0.05
      );
    };

    iosBtn.addEventListener('click', (e) => { e.stopPropagation(); iosOpen ? closeIos() : openIos(); });
    document.addEventListener('click', (e) => {
      if (iosOpen && !iosDropdown.contains(e.target as Node) && !iosBtn.contains(e.target as Node)) closeIos();
    });
    window.addEventListener('scroll', () => { if (iosOpen) syncPos(); }, true);
    window.addEventListener('resize', () => { if (iosOpen) syncPos(); });
  }

  // === iOS (Mobile) — direct link, no dropdown ===
  const mobileIosBtn = document.getElementById('landing-mobile-ios');
  if (mobileIosBtn) setupTopbarButtonMorph(mobileIosBtn as HTMLElement);

  document.querySelectorAll<HTMLAnchorElement>('.desktop-nav-link').forEach(link => {
    setupNavLinkMorph(link, false);
  });

  document.querySelectorAll<HTMLAnchorElement>('.mobile-nav-link').forEach(link => {
    setupNavLinkMorph(link, true);
  });

  document.querySelectorAll<HTMLAnchorElement>('[data-nav-link][data-target]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      const targetId = link.dataset.target;
      if (!targetId) return;

      const section = document.getElementById(targetId);
      if (!section) return;

      const offset = window.innerWidth < 820 ? 70 : 85;
      const top = section.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  setupTopbarScroll();
}

function setupTopbarScroll() {
  const outer = document.getElementById('landing-topbar-outer') as HTMLElement | null;
  const bar = document.getElementById(TOPBAR_ID) as HTMLElement | null;
  const content = document.getElementById('landing-topbar-content') as HTMLElement | null;

  if (!outer || !bar || !content) return;

  const THRESHOLD = 60;
  const isDesktop = () => window.innerWidth > 820;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let isScrolled = window.scrollY > THRESHOLD;
  let raf = 0;
  let morphTl: ReturnType<typeof gsap.timeline> | null = null;

  const state = {
    expanded: {
      maxWidth: 940,
      height: 62,
      paddingLeft: 24,
      paddingRight: 10,
      radius: 999,
      y: 0,
      shadow: '0 4px 30px rgba(0,0,0,0.5)',
    },
    compact: {
      maxWidth: 820,
      height: 56,
      paddingLeft: 20,
      paddingRight: 8,
      radius: 24,
      y: -2,
      shadow: '0 10px 34px rgba(0,0,0,0.58)',
    },
  };

  function applyInstant(scrolled: boolean) {
    const target = scrolled ? state.compact : state.expanded;

    gsap.set(outer, {
      maxWidth: target.maxWidth,
      y: target.y,
      scaleX: 1,
      scaleY: 1,
    });

    gsap.set(bar, {
      height: target.height,
      borderRadius: target.radius,
      scaleX: 1,
      scaleY: 1,
      boxShadow: target.shadow,
    });

    gsap.set(content, {
      paddingLeft: target.paddingLeft,
      paddingRight: target.paddingRight,
    });


  }

  function resetMobile() {
    morphTl?.kill();
    gsap.killTweensOf([outer, bar, content]);

    gsap.set(outer, {
      clearProps: 'maxWidth,y,scaleX,scaleY',
    });

    gsap.set(bar, {
      clearProps: 'height,borderRadius,scaleX,scaleY,boxShadow',
    });

    gsap.set(content, {
      clearProps: 'paddingLeft,paddingRight',
    });
  }

  function morph(scrolled: boolean) {
    if (!isDesktop()) {
      resetMobile();
      return;
    }

    const target = scrolled ? state.compact : state.expanded;

    if (reduceMotion) {
      applyInstant(scrolled);
      return;
    }

    morphTl?.kill();

    morphTl = gsap.timeline({
      defaults: {
        overwrite: 'auto',
      },
    });

    morphTl.to(
      outer,
      {
        maxWidth: scrolled ? 770 : 975,
        y: scrolled ? -4 : 1,
        scaleX: scrolled ? 0.985 : 1.012,
        scaleY: scrolled ? 0.975 : 1.015,
        duration: 0.18,
        ease: 'power3.inOut',
      },
      0
    );

    morphTl.to(
      bar,
      {
        height: scrolled ? 54 : 64,
        borderRadius: scrolled ? 22 : 999,
        scaleX: scrolled ? 0.992 : 1.01,
        scaleY: scrolled ? 0.965 : 1.018,
        duration: 0.18,
        ease: 'power3.inOut',
      },
      0
    );

    morphTl.to(
      outer,
      {
        maxWidth: target.maxWidth,
        y: target.y,
        scaleX: 1,
        scaleY: 1,
        duration: 0.82,
        ease: 'elastic.out(0.9, 0.52)',
      },
      0.12
    );

    morphTl.to(
      bar,
      {
        height: target.height,
        borderRadius: target.radius,
        scaleX: 1,
        scaleY: 1,
        boxShadow: target.shadow,
        duration: 0.82,
        ease: 'elastic.out(0.9, 0.52)',
      },
      0.12
    );

    morphTl.to(
      content,
      {
        paddingLeft: target.paddingLeft,
        paddingRight: target.paddingRight,
        duration: 0.55,
        ease: 'expo.out',
      },
      0.08
    );


  }

  function onScroll() {
    if (raf) return;

    raf = window.requestAnimationFrame(() => {
      raf = 0;

      if (!isDesktop()) {
        resetMobile();
        return;
      }

      const shouldShrink = window.scrollY > THRESHOLD;
      if (shouldShrink === isScrolled) return;

      isScrolled = shouldShrink;
      morph(shouldShrink);
    });
  }

  function onResize() {
    if (!isDesktop()) {
      resetMobile();
      return;
    }

    isScrolled = window.scrollY > THRESHOLD;
    applyInstant(isScrolled);
  }

  applyInstant(isScrolled);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
}

function setupTopbarButtonMorph(button: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    const onEnter = () => {
      button.style.backgroundColor = '#1A1A1A';
      button.style.borderColor = '#2A2A2A';
    };
    const onLeave = () => {
      button.style.backgroundColor = '#111111';
      button.style.borderColor = '#1C1C1C';
    };
    button.addEventListener('mouseenter', onEnter);
    button.addEventListener('mouseleave', onLeave);
    return;
  }

  const onEnter = () => {
    gsap.killTweensOf(button);

    gsap.to(button, {
      scaleX: 1.045,
      scaleY: 0.965,
      y: -2,
      borderRadius: 16,
      backgroundColor: '#1A1A1A',
      borderColor: '#2A2A2A',
      boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
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
      borderRadius: 12,
      backgroundColor: '#111111',
      borderColor: '#1C1C1C',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      duration: 0.68,
      ease: 'elastic.out(0.85, 0.5)',
    });
  };

  const onPointerDown = () => {
    gsap.killTweensOf(button);

    gsap.to(button, {
      scaleX: 0.97,
      scaleY: 1.06,
      y: 0,
      borderRadius: 18,
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

function setupWhiteButtonMorph(button: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#e8e8e8';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#ffffff';
    });
    return;
  }

  const onEnter = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      scaleX: 1.045,
      scaleY: 0.965,
      y: -2,
      borderRadius: 16,
      backgroundColor: '#ececec',
      borderColor: 'rgba(0,0,0,0.08)',
      boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
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
      borderRadius: 12,
      backgroundColor: '#ffffff',
      borderColor: 'rgba(255,255,255,0.12)',
      boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
      duration: 0.68,
      ease: 'elastic.out(0.85, 0.5)',
    });
  };

  const onPointerDown = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      scaleX: 0.97,
      scaleY: 1.06,
      y: 0,
      borderRadius: 18,
      duration: 0.14,
      ease: 'power3.out',
    });
  };

  button.addEventListener('mouseenter', onEnter);
  button.addEventListener('mouseleave', onLeave);
  button.addEventListener('pointerdown', onPointerDown);
  button.addEventListener('pointerup', () => onEnter());
  button.addEventListener('pointercancel', onLeave);
}

function setupNavLinkMorph(link: HTMLElement, isMobile: boolean = false) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const hoverBg = 'rgba(255,255,255,0.06)';
  const defaultBg = 'transparent';
  const hoverColor = '#fff';
  const defaultColor = isMobile ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)';
  const hoverRadius = isMobile ? 12 : 16;
  const defaultRadius = isMobile ? 10 : 999;

  if (reduceMotion) {
    const onEnter = () => {
      link.style.color = hoverColor;
      link.style.backgroundColor = hoverBg;
    };
    const onLeave = () => {
      link.style.color = defaultColor;
      link.style.backgroundColor = defaultBg;
    };
    link.addEventListener('mouseenter', onEnter);
    link.addEventListener('mouseleave', onLeave);
    return;
  }

  const onEnter = () => {
    gsap.killTweensOf(link);

    gsap.to(link, {
      scaleX: 1.045,
      scaleY: 0.965,
      y: -2,
      borderRadius: hoverRadius,
      backgroundColor: hoverBg,
      color: hoverColor,
      duration: 0.44,
      ease: 'elastic.out(0.9, 0.46)',
    });
  };

  const onLeave = () => {
    gsap.killTweensOf(link);

    gsap.to(link, {
      scaleX: 1,
      scaleY: 1,
      y: 0,
      borderRadius: defaultRadius,
      backgroundColor: defaultBg,
      color: defaultColor,
      duration: 0.68,
      ease: 'elastic.out(0.85, 0.5)',
    });
  };

  const onPointerDown = () => {
    gsap.killTweensOf(link);

    gsap.to(link, {
      scaleX: 0.97,
      scaleY: 1.06,
      y: 0,
      borderRadius: hoverRadius + 2,
      duration: 0.14,
      ease: 'power3.out',
    });
  };

  const onPointerUp = () => {
    onEnter();
  };

  link.addEventListener('mouseenter', onEnter);
  link.addEventListener('mouseleave', onLeave);
  link.addEventListener('pointerdown', onPointerDown);
  link.addEventListener('pointerup', onPointerUp);
  link.addEventListener('pointercancel', onLeave);
}
