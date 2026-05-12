import gsap from 'gsap';
import { authManager } from '../pages/Auth';

const VISIBLE_COUNT = 4;

let pricingCleanupFns: Array<() => void> = [];
let pricingTimelines: gsap.core.Animation[] = [];

export function PricingLanding(): string {
  const allFeatures = [
    'Dashboard financeiro inteligente',
    'Controle de cartões de crédito',
    'Controle de patrimônio',
    'Calendário de gastos',
    'Conexões Open Finance',
    'Lembretes de pagamentos',
    'App Mobile (iOS e Android) em breve',
    'Controle de transações',
    'Sincronização em tempo real',
  ];

  const featureItem = (feature: string, hidden = false) => `
    <div class="pricing-feature${hidden ? ' pricing-feature-hidden' : ''}">
      <div class="pricing-feature-content">
        <span class="pricing-feature-check" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="pricing-feature-text">${feature}</span>
      </div>
    </div>
  `;

  return `
    <style>
      #landing-pricing-section {
        position: relative;
        z-index: 1;
        width: 100%;
        padding: 96px 20px 96px;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: visible;
      }

      #landing-pricing-label {
        margin: 0 0 12px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.34);
      }

      #landing-pricing-heading {
        margin: 0 0 28px;
        max-width: 620px;
        text-align: center;
        font-size: clamp(32px, 5.6vw, 58px);
        line-height: 1;
        letter-spacing: -0.055em;
        color: #ffffff;
        font-weight: 760;
        text-wrap: balance;
      }

      #landing-pricing-card {
        position: relative;
        width: min(100%, 420px);
        margin: 0 auto;
        padding: 0;
        border-radius: 24px;
        background: #101010;
        border: 1px solid #242424;
        box-shadow:
          0 24px 72px rgba(0,0,0,0.38),
          inset 0 1px 0 rgba(255,255,255,0.035);
        overflow: hidden;
        transform-origin: center center;
        will-change: transform, opacity, filter, border-radius;
      }

      #landing-pricing-card::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(
          circle at 50% 0%,
          rgba(255,255,255,0.045),
          transparent 40%
        );
        opacity: 0.9;
      }

      #landing-pricing-card > * {
        position: relative;
        z-index: 1;
      }

      #landing-pricing-card-top {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 20px 20px 16px;
      }

      .pricing-plan-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .pricing-plan-name {
        margin: 0;
        font-size: 19px;
        line-height: 1;
        color: #ffffff;
        font-weight: 760;
        letter-spacing: -0.035em;
      }

      .pricing-plan-badge {
        height: 28px;
        padding: 0 11px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #161616;
        border: 1px solid #282828;
        color: rgba(255,255,255,0.72);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: -0.01em;
        transform-origin: center center;
        will-change: transform, border-radius, opacity;
      }

      #landing-pricing-price {
        display: flex;
        flex-direction: column;
        gap: 5px;
        transform-origin: left center;
        will-change: transform, opacity, filter;
      }

      .pricing-old-price {
        font-size: 13px;
        color: rgba(255,255,255,0.34);
        text-decoration: line-through;
        text-decoration-color: rgba(255,255,255,0.34);
        font-weight: 550;
      }

      .pricing-price-main {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }

      .pricing-curr {
        font-size: 18px;
        font-weight: 650;
        color: rgba(255,255,255,0.58);
      }

      .pricing-amount {
        font-size: clamp(50px, 10vw, 66px);
        font-weight: 820;
        color: #ffffff;
        letter-spacing: -0.07em;
        line-height: 0.92;
        font-variant-numeric: tabular-nums;
      }

      .pricing-dec {
        font-size: 23px;
        font-weight: 760;
        color: #ffffff;
      }

      .pricing-period {
        font-size: 13px;
        color: rgba(255,255,255,0.38);
        margin-left: 3px;
        font-weight: 550;
      }

      .pricing-save-text {
        margin: 0;
        color: rgba(255,255,255,0.42);
        font-size: 12.5px;
        line-height: 1.45;
        font-weight: 500;
      }

      #landing-pricing-features {
        padding: 12px 20px 16px;
      }

      #pricing-visible-features,
      #pricing-hidden-features {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      #pricing-hidden-features {
        display: none;
        overflow: hidden;
        transform-origin: 50% 0%;
        will-change: transform, opacity, filter, max-height;
      }

      .pricing-feature {
        min-height: 28px;
        display: flex;
        align-items: center;
        border: 0;
        border-radius: 12px;
        transform-origin: left center;
        will-change: transform, opacity, filter;
      }

      .pricing-feature-content {
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
      }

      .pricing-feature-check {
        width: 17px;
        height: 17px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: #ffffff;
        background: rgba(255,255,255,0.055);
        border: 1px solid rgba(255,255,255,0.075);
      }

      .pricing-feature-text {
        color: rgba(255,255,255,0.66);
        font-size: 13.5px;
        line-height: 1.35;
        font-weight: 520;
        letter-spacing: -0.01em;
      }

      #pricing-expand-btn {
        width: 100%;
        height: 38px;
        margin-top: 12px;
        padding: 0 12px;
        border: 1px solid #242424;
        border-radius: 14px;
        background: #161616;
        color: rgba(255,255,255,0.66);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-size: 12.5px;
        font-weight: 650;
        font-family: inherit;
        cursor: pointer;
        transform-origin: center center;
        will-change: transform, border-radius, background, color;
        -webkit-tap-highlight-color: transparent;
      }

      #pricing-expand-icon {
        width: 15px;
        height: 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transform-origin: center center;
        will-change: transform;
      }

      #landing-pricing-cta {
        position: relative;
        padding: 16px 20px 20px;
      }

      #landing-pricing-cta::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        height: 1px;
        background: rgba(255,255,255,0.075);
        pointer-events: none;
      }

      #landing-pricing-signup-btn {
        width: 100%;
        height: 48px;
        border: 0;
        border-radius: 15px;
        background: #ffffff;
        color: #050505;
        font-size: 14.5px;
        font-weight: 760;
        font-family: inherit;
        letter-spacing: -0.015em;
        cursor: pointer;
        box-shadow: 0 14px 38px rgba(255,255,255,0.1);
        transform-origin: center center;
        will-change: transform, border-radius, box-shadow;
        -webkit-tap-highlight-color: transparent;
      }

      @media (max-width: 640px) {
        #landing-pricing-section {
          padding: 82px 18px 82px;
        }

        #landing-pricing-heading {
          margin-bottom: 24px;
        }

        #landing-pricing-card {
          width: 100%;
          border-radius: 22px;
        }

        #landing-pricing-card-top {
          padding: 18px 18px 14px;
        }

        #landing-pricing-features {
          padding: 10px 18px 14px;
        }

        #landing-pricing-cta {
          padding: 15px 18px 18px;
        }

        .pricing-amount {
          font-size: 58px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #landing-pricing-card,
        #landing-pricing-price,
        .pricing-plan-badge,
        .pricing-feature,
        #pricing-hidden-features,
        #pricing-expand-btn,
        #pricing-expand-icon,
        #landing-pricing-signup-btn {
          transform: none !important;
          filter: none !important;
          animation: none !important;
        }
      }
    </style>

    <section id="landing-pricing-section">
      <p id="landing-pricing-label">Plano</p>
      <h2 id="landing-pricing-heading">O plano ideal para você</h2>

      <div id="landing-pricing-card">

        <div id="landing-pricing-card-top">
          <div class="pricing-plan-row">
            <p class="pricing-plan-name">Pro</p>
            <span class="pricing-plan-badge">50% OFF</span>
          </div>

          <div id="landing-pricing-price">
            <span class="pricing-old-price">De R$ 35,90</span>

            <div class="pricing-price-main">
              <span class="pricing-curr">R$</span>
              <span class="pricing-amount">17</span>
              <span class="pricing-dec">,95</span>
              <span class="pricing-period">/mês</span>
            </div>

            <p class="pricing-save-text">
              Acesso completo ao Controlar+ por metade do preço.
            </p>
          </div>
        </div>

        <div id="landing-pricing-features">
          <div id="pricing-visible-features">
            ${allFeatures.slice(0, VISIBLE_COUNT).map(feature => featureItem(feature)).join('')}
          </div>

          <div id="pricing-hidden-features">
            ${allFeatures.slice(VISIBLE_COUNT).map(feature => featureItem(feature, true)).join('')}
          </div>

          <button id="pricing-expand-btn" type="button" aria-expanded="false">
            <span id="pricing-expand-text">Ver todos os recursos</span>
            <span id="pricing-expand-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>
        </div>

        <div id="landing-pricing-cta">
          <button id="landing-pricing-signup-btn" type="button">Começar agora</button>
        </div>

      </div>
    </section>
  `;
}

export function attachPricingLandingListeners() {
  cleanupPricingLandingListeners();

  const signupButton = document.getElementById('landing-pricing-signup-btn');

  const onSignup = () => {
    sessionStorage.setItem('landingPromotionCode', 'LANCAMENTO50');
    authManager.showSignup();
  };

  signupButton?.addEventListener('click', onSignup);

  if (signupButton) {
    pricingCleanupFns.push(() => {
      signupButton.removeEventListener('click', onSignup);
    });

    setupPricingButtonMorph(signupButton);
  }

  setupExpandableFeatures();
  animatePricingEntrance();
  setupPricingLoop();
}

export function cleanupPricingLandingListeners() {
  pricingCleanupFns.forEach(cleanup => cleanup());
  pricingCleanupFns = [];

  pricingTimelines.forEach(animation => animation.kill());
  pricingTimelines = [];

  gsap.killTweensOf([
    '#landing-pricing-label',
    '#landing-pricing-heading',
    '#landing-pricing-card',
    '#landing-pricing-price',
    '.pricing-plan-badge',
    '.pricing-feature',
    '.pricing-feature-hidden',
    '#pricing-hidden-features',
    '#pricing-expand-btn',
    '#pricing-expand-icon',
    '#landing-pricing-signup-btn',
  ]);
}

function addPricingAnimation<T extends gsap.core.Animation>(animation: T) {
  pricingTimelines.push(animation);
  return animation;
}

function animatePricingEntrance() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    gsap.set([
      '#landing-pricing-label',
      '#landing-pricing-heading',
      '#landing-pricing-card',
      '#landing-pricing-price',
      '.pricing-feature',
      '#pricing-expand-btn',
      '#landing-pricing-signup-btn',
    ], {
      opacity: 1,
      y: 0,
      x: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'none',
    });

    return;
  }

  gsap.set('#landing-pricing-label, #landing-pricing-heading', {
    opacity: 0,
    y: 16,
    filter: 'blur(8px)',
  });

  gsap.set('#landing-pricing-card', {
    opacity: 0,
    y: 28,
    scaleX: 0.91,
    scaleY: 1.065,
    filter: 'blur(14px)',
    borderRadius: 34,
  });

  gsap.set('#landing-pricing-price', {
    opacity: 0,
    y: 12,
    scaleX: 0.95,
    scaleY: 1.035,
    filter: 'blur(8px)',
  });

  gsap.set('.pricing-plan-badge', {
    opacity: 0,
    scaleX: 0.82,
    scaleY: 1.14,
    filter: 'blur(6px)',
  });

  gsap.set('.pricing-feature', {
    opacity: 0,
    x: -8,
    scaleX: 0.97,
    scaleY: 1.02,
    filter: 'blur(5px)',
  });

  gsap.set('#pricing-expand-btn, #landing-pricing-signup-btn', {
    opacity: 0,
    y: 10,
    scaleX: 0.94,
    scaleY: 1.05,
    filter: 'blur(7px)',
  });

  const tl = gsap.timeline({
    delay: 0.12,
    defaults: {
      overwrite: 'auto',
    },
  });

  tl.to('#landing-pricing-label, #landing-pricing-heading', {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    duration: 0.54,
    ease: 'power3.out',
    stagger: 0.08,
  });

  tl.to('#landing-pricing-card', {
    opacity: 1,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    filter: 'blur(0px)',
    borderRadius: 24,
    duration: 0.86,
    ease: 'elastic.out(0.86, 0.5)',
  }, '-=0.24');

  tl.to('#landing-pricing-price', {
    opacity: 1,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    filter: 'blur(0px)',
    duration: 0.66,
    ease: 'elastic.out(0.9, 0.52)',
  }, '-=0.58');

  tl.to('.pricing-plan-badge', {
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    filter: 'blur(0px)',
    duration: 0.54,
    ease: 'elastic.out(0.9, 0.48)',
  }, '-=0.58');

  tl.to('.pricing-feature', {
    opacity: 1,
    x: 0,
    scaleX: 1,
    scaleY: 1,
    filter: 'blur(0px)',
    duration: 0.42,
    ease: 'power3.out',
    stagger: 0.035,
    clearProps: 'filter',
  }, '-=0.38');

  tl.to('#pricing-expand-btn, #landing-pricing-signup-btn', {
    opacity: 1,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    filter: 'blur(0px)',
    duration: 0.58,
    ease: 'elastic.out(0.88, 0.5)',
    stagger: 0.07,
  }, '-=0.28');

  addPricingAnimation(tl);
}

function setupPricingLoop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  addPricingAnimation(
    gsap.to('#landing-pricing-card', {
      scaleX: 1.003,
      scaleY: 0.998,
      duration: 4.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })
  );

  addPricingAnimation(
    gsap.to('.pricing-plan-badge', {
      scaleX: 1.025,
      scaleY: 0.972,
      duration: 2.8,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })
  );
}

function setupExpandableFeatures() {
  const expandButton = document.getElementById('pricing-expand-btn');
  const hiddenWrap = document.getElementById('pricing-hidden-features');
  const expandIcon = document.getElementById('pricing-expand-icon');
  const expandText = document.getElementById('pricing-expand-text');
  const card = document.getElementById('landing-pricing-card');

  if (!expandButton || !hiddenWrap || !card) return;

  let expanded = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onEnter = () => {
    if (reduceMotion) return;

    gsap.killTweensOf(expandButton);

    gsap.to(expandButton, {
      y: -1,
      scaleX: 1.018,
      scaleY: 0.975,
      borderRadius: 18,
      backgroundColor: '#1C1C1C',
      duration: 0.4,
      ease: 'elastic.out(0.9, 0.46)',
    });
  };

  const onLeave = () => {
    if (reduceMotion) return;

    gsap.killTweensOf(expandButton);

    gsap.to(expandButton, {
      y: 0,
      scaleX: 1,
      scaleY: 1,
      borderRadius: 14,
      backgroundColor: '#161616',
      duration: 0.62,
      ease: 'elastic.out(0.82, 0.52)',
    });
  };

  const onPointerDown = () => {
    if (reduceMotion) return;

    gsap.to(expandButton, {
      scaleX: 0.984,
      scaleY: 1.04,
      borderRadius: 20,
      duration: 0.13,
      ease: 'power3.out',
    });
  };

  const onClick = () => {
    expanded = !expanded;
    expandButton.setAttribute('aria-expanded', String(expanded));

    gsap.killTweensOf([hiddenWrap, expandIcon, card]);

    if (expanded) {
      hiddenWrap.style.display = 'flex';

      const targetHeight = hiddenWrap.scrollHeight;
      const hiddenItems = hiddenWrap.querySelectorAll<HTMLElement>('.pricing-feature-hidden');

      if (expandText) expandText.textContent = 'Ver menos';

      if (reduceMotion) {
        hiddenWrap.style.maxHeight = `${targetHeight}px`;
        hiddenWrap.style.opacity = '1';
        return;
      }

      gsap.set(hiddenWrap, {
        maxHeight: 0,
        opacity: 0,
        scaleX: 0.94,
        scaleY: 0.28,
        filter: 'blur(8px)',
        transformOrigin: '50% 0%',
      });

      gsap.set(hiddenItems, {
        opacity: 0,
        y: -7,
        scaleX: 0.97,
        scaleY: 1.025,
        filter: 'blur(5px)',
      });

      const tl = gsap.timeline({
        defaults: {
          overwrite: 'auto',
        },
      });

      tl.to(card, {
        scaleX: 1.012,
        scaleY: 0.994,
        borderRadius: 26,
        duration: 0.24,
        ease: 'power3.out',
      });

      tl.to(hiddenWrap, {
        maxHeight: targetHeight + 14,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        filter: 'blur(0px)',
        duration: 0.72,
        ease: 'elastic.out(0.9, 0.5)',
      }, '-=0.16');

      tl.to(hiddenItems, {
        opacity: 1,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        filter: 'blur(0px)',
        duration: 0.38,
        ease: 'power3.out',
        stagger: 0.035,
      }, '-=0.5');

      tl.to(card, {
        scaleX: 1,
        scaleY: 1,
        borderRadius: 24,
        duration: 0.62,
        ease: 'elastic.out(0.82, 0.52)',
      }, '-=0.22');

      if (expandIcon) {
        gsap.to(expandIcon, {
          rotation: 180,
          duration: 0.54,
          ease: 'elastic.out(0.9, 0.46)',
        });
      }
    } else {
      const hiddenItems = hiddenWrap.querySelectorAll<HTMLElement>('.pricing-feature-hidden');

      if (expandText) expandText.textContent = 'Ver todos os recursos';

      if (reduceMotion) {
        hiddenWrap.style.display = 'none';
        hiddenWrap.style.maxHeight = '0';
        hiddenWrap.style.opacity = '0';
        return;
      }

      const tl = gsap.timeline({
        defaults: {
          overwrite: 'auto',
        },
        onComplete: () => {
          hiddenWrap.style.display = 'none';

          gsap.set(hiddenWrap, {
            clearProps: 'opacity,scaleX,scaleY,filter,transformOrigin,maxHeight',
          });

          gsap.set(hiddenItems, {
            clearProps: 'opacity,y,scaleX,scaleY,filter',
          });
        },
      });

      tl.to(hiddenItems, {
        opacity: 0,
        y: -6,
        scaleX: 0.98,
        scaleY: 1.02,
        filter: 'blur(5px)',
        duration: 0.16,
        ease: 'power2.in',
        stagger: {
          each: 0.022,
          from: 'end',
        },
      });

      tl.to(hiddenWrap, {
        maxHeight: 0,
        opacity: 0,
        scaleX: 0.92,
        scaleY: 0.22,
        filter: 'blur(9px)',
        duration: 0.32,
        ease: 'power3.inOut',
      }, '-=0.08');

      tl.to(card, {
        scaleX: 0.994,
        scaleY: 1.01,
        borderRadius: 22,
        duration: 0.18,
        ease: 'power3.out',
      }, '-=0.3');

      tl.to(card, {
        scaleX: 1,
        scaleY: 1,
        borderRadius: 24,
        duration: 0.56,
        ease: 'elastic.out(0.82, 0.52)',
      }, '-=0.06');

      if (expandIcon) {
        gsap.to(expandIcon, {
          rotation: 0,
          duration: 0.46,
          ease: 'elastic.out(0.85, 0.45)',
        });
      }
    }
  };

  expandButton.addEventListener('mouseenter', onEnter);
  expandButton.addEventListener('mouseleave', onLeave);
  expandButton.addEventListener('pointerdown', onPointerDown);
  expandButton.addEventListener('pointerup', onEnter);
  expandButton.addEventListener('pointercancel', onLeave);
  expandButton.addEventListener('click', onClick);

  pricingCleanupFns.push(() => {
    expandButton.removeEventListener('mouseenter', onEnter);
    expandButton.removeEventListener('mouseleave', onLeave);
    expandButton.removeEventListener('pointerdown', onPointerDown);
    expandButton.removeEventListener('pointerup', onEnter);
    expandButton.removeEventListener('pointercancel', onLeave);
    expandButton.removeEventListener('click', onClick);
  });
}

function setupPricingButtonMorph(button: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const onEnter = () => {
    gsap.killTweensOf(button);

    gsap.to(button, {
      y: -2,
      scaleX: 1.016,
      scaleY: 0.984,
      borderRadius: 20,
      boxShadow: '0 20px 52px rgba(255,255,255,0.15)',
      duration: 0.4,
      ease: 'elastic.out(0.9, 0.46)',
    });
  };

  const onLeave = () => {
    gsap.killTweensOf(button);

    gsap.to(button, {
      y: 0,
      scaleX: 1,
      scaleY: 1,
      borderRadius: 15,
      boxShadow: '0 14px 38px rgba(255,255,255,0.1)',
      duration: 0.62,
      ease: 'elastic.out(0.82, 0.52)',
    });
  };

  const onPointerDown = () => {
    gsap.to(button, {
      y: 0,
      scaleX: 0.984,
      scaleY: 1.032,
      borderRadius: 22,
      duration: 0.12,
      ease: 'power3.out',
    });
  };

  button.addEventListener('mouseenter', onEnter);
  button.addEventListener('mouseleave', onLeave);
  button.addEventListener('pointerdown', onPointerDown);
  button.addEventListener('pointerup', onEnter);
  button.addEventListener('pointercancel', onLeave);

  pricingCleanupFns.push(() => {
    button.removeEventListener('mouseenter', onEnter);
    button.removeEventListener('mouseleave', onLeave);
    button.removeEventListener('pointerdown', onPointerDown);
    button.removeEventListener('pointerup', onEnter);
    button.removeEventListener('pointercancel', onLeave);
  });
}