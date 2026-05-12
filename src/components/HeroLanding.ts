import gsap from 'gsap';
import { animateDynamicIslandTransition } from './DynamicIsland';

let textFlipIntervalId: number | null = null;
let heroCleanupFns: Array<() => void> = [];

const HERO_WORDS = [
  'organizar finanças',
  'controlar gastos',
  'planejar patrimônio',
  'acompanhar cartões',
];

export function HeroLanding(): string {
  return `
    <style>
      #landing-hero {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 180px 24px 0;
        overflow: visible;
      }

      #landing-headline {
        font-size: clamp(32px, 7vw, 76px);
        font-weight: 700;
        color: #ffffff;
        line-height: 1.12;
        letter-spacing: -0.035em;
        max-width: 1050px;
        margin: 0;
        text-wrap: balance;

        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .headline-part {
        display: block;
        white-space: nowrap;
      }

      .text-flip-container {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        border-radius: 16px;
        padding: 4px 22px 8px;
        color: #ffffff;
        background: #161616;
        border: 1px solid #242424;
        overflow: hidden;
        white-space: nowrap;
        vertical-align: middle;
        margin-top: 0;
        transform-origin: center center;
        box-shadow: 0 14px 42px rgba(0, 0, 0, 0.35);
        will-change: transform, border-radius, filter;
      }

      .text-flip-word-wrapper {
        display: inline-block;
        position: relative;
        z-index: 1;
        white-space: nowrap;
        line-height: 1;
        will-change: transform, opacity, filter;
      }

      #landing-hero-description {
        max-width: 620px;
        margin: 26px auto 0;
        font-size: clamp(15px, 2vw, 18px);
        line-height: 1.65;
        font-weight: 400;
        color: rgba(255,255,255,0.5);
        text-wrap: balance;
      }

      #landing-ctas {
        margin-top: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      #landing-hero-ios {
        height: 48px;
        padding: 0 24px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.12);
        background: #ffffff;
        color: #111111;
        font-size: 14px;
        font-weight: 650;
        font-family: inherit;
        cursor: pointer;
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        transform-origin: center center;
        will-change: transform, border-radius, box-shadow;
        -webkit-tap-highlight-color: transparent;
        text-decoration: none;
      }

      #landing-hero-pricing {
        height: 48px;
        padding: 0 36px;
        border-radius: 14px;
        border: 1px solid #242424;
        background: #161616;
        color: #ffffff;
        font-size: 14px;
        font-weight: 650;
        font-family: inherit;
        cursor: pointer;
        position: relative;
        z-index: 1;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        transform-origin: center center;
        will-change: transform, border-radius, box-shadow;
        -webkit-tap-highlight-color: transparent;
      }

      #landing-hero-pricing span {
        position: relative;
        z-index: 1;
      }

      .landing-seo-visually-hidden {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      @media (max-width: 768px) {
        #landing-hero {
          padding: 150px 20px 0;
        }

        #landing-headline {
          font-size: clamp(28px, 9vw, 46px);
          line-height: 1.1;
          gap: 10px;
        }

        .headline-part {
          white-space: nowrap;
          font-size: clamp(24px, 7vw, 38px);
          letter-spacing: -0.035em;
        }

        .text-flip-container {
          padding: 3px 16px 7px;
          border-radius: 13px;
          max-width: calc(100vw - 32px);
        }

        .text-flip-word-wrapper {
          font-size: clamp(32px, 10vw, 46px);
        }

        #landing-hero-description {
          margin-top: 22px;
          font-size: 15px;
          max-width: 360px;
        }

        #landing-ctas {
          width: 100%;
          max-width: 320px;
          margin-top: 30px;
        }

        #landing-hero-pricing {
          width: auto;
          height: 50px;
          font-size: 15px;
        }

        #landing-hero-ios {
          height: 50px;
          font-size: 15px;
        }
      }

      @media (max-width: 380px) {
        .headline-part {
          font-size: clamp(22px, 6.8vw, 30px);
        }

        .text-flip-word-wrapper {
          font-size: clamp(30px, 9.5vw, 40px);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .text-flip-container,
        .text-flip-word-wrapper,
        #landing-hero-pricing {
          transform: none !important;
          filter: none !important;
          animation: none !important;
        }
      }
    </style>

    <section
      id="landing-hero"
      aria-labelledby="landing-headline"
      aria-describedby="landing-hero-description"
    >
      <h1
        id="landing-headline"
        aria-label="Controlar Plus: gestão financeira pessoal para organizar finanças, controlar gastos, acompanhar cartões de crédito e planejar patrimônio."
      >
        <span class="headline-part">A gestão definitiva para</span>

        <span
          id="landing-text-flip-container"
          class="text-flip-container"
          aria-hidden="true"
        >
          <span id="landing-text-flip-wrapper" class="text-flip-word-wrapper">
            organizar finanças
          </span>
        </span>

        <span class="landing-seo-visually-hidden">
          controle financeiro pessoal, organização de gastos, cartões de crédito,
          contas a pagar, patrimônio, receitas, despesas e planejamento financeiro.
        </span>
      </h1>

      <p id="landing-hero-description">
        Controle receitas, despesas, cartões de crédito e patrimônio em uma plataforma simples,
        visual e feita para dar clareza sobre sua vida financeira.
      </p>

      <div id="landing-ctas">
        <button
          id="landing-hero-pricing"
          class="btn-secondary"
          type="button"
          aria-label="Ver plano do Controlar Plus"
        >
          <span>Ver plano</span>
        </button>
        <a
          id="landing-hero-ios"
          href="https://apps.apple.com/br/app/controlar/id6759493317?l=en-GB"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Baixar na App Store"
        >
          <svg width="16" height="19" viewBox="0 0 384 512" fill="currentColor">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
          </svg>
          App Store
        </a>
      </div>
    </section>
  `;
}

export function attachHeroLandingListeners() {
  cleanupHeroLandingListeners();

  const pricingButton = document.getElementById('landing-hero-pricing');

  const onPricingClick = () => {
    const section = document.getElementById('landing-pricing-section');
    if (!section) return;

    const offset = window.innerWidth < 820 ? 70 : 85;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({ top, behavior: 'smooth' });
  };

  pricingButton?.addEventListener('click', onPricingClick);

  if (pricingButton) {
    heroCleanupFns.push(() => {
      pricingButton.removeEventListener('click', onPricingClick);
    });

    setupHeroButtonMorph(pricingButton);
  }

  // iOS App Store button morph
  const iosHeroBtn = document.getElementById('landing-hero-ios');
  if (iosHeroBtn) {
    setupHeroWhiteButtonMorph(iosHeroBtn);
  }

  animateHero();
}

export function cleanupHeroLandingListeners() {
  if (textFlipIntervalId !== null) {
    window.clearInterval(textFlipIntervalId);
    textFlipIntervalId = null;
  }

  heroCleanupFns.forEach(cleanup => cleanup());
  heroCleanupFns = [];

  gsap.killTweensOf([
    '#landing-headline',
    '#landing-hero-description',
    '#landing-ctas',
    '#landing-text-flip-container',
    '#landing-text-flip-wrapper',
    '#landing-hero-pricing',
    '#landing-hero-ios',
  ]);
}

function setupHeroButtonMorph(button: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const onEnter = () => {
    gsap.killTweensOf(button);

    gsap.to(button, {
      scaleX: 1.045,
      scaleY: 0.965,
      y: -2,
      borderRadius: 18,
      backgroundColor: '#161616',
      boxShadow: '0 18px 54px rgba(0,0,0,0.5)',
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
      backgroundColor: '#161616',
      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
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
      borderRadius: 20,
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

  heroCleanupFns.push(() => {
    button.removeEventListener('mouseenter', onEnter);
    button.removeEventListener('mouseleave', onLeave);
    button.removeEventListener('pointerdown', onPointerDown);
    button.removeEventListener('pointerup', onPointerUp);
    button.removeEventListener('pointercancel', onLeave);
  });
}

function setupHeroWhiteButtonMorph(button: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const onEnter = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      scaleX: 1.045, scaleY: 0.965, y: -2, borderRadius: 18,
      backgroundColor: '#ececec', boxShadow: '0 18px 54px rgba(0,0,0,0.3)',
      duration: 0.44, ease: 'elastic.out(0.9, 0.46)',
    });
  };

  const onLeave = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      scaleX: 1, scaleY: 1, y: 0, borderRadius: 14,
      backgroundColor: '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      duration: 0.68, ease: 'elastic.out(0.85, 0.5)',
    });
  };

  const onPointerDown = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      scaleX: 0.97, scaleY: 1.06, y: 0, borderRadius: 20,
      duration: 0.14, ease: 'power3.out',
    });
  };

  button.addEventListener('mouseenter', onEnter);
  button.addEventListener('mouseleave', onLeave);
  button.addEventListener('pointerdown', onPointerDown);
  button.addEventListener('pointerup', () => onEnter());
  button.addEventListener('pointercancel', onLeave);

  heroCleanupFns.push(() => {
    button.removeEventListener('mouseenter', onEnter);
    button.removeEventListener('mouseleave', onLeave);
    button.removeEventListener('pointerdown', onPointerDown);
    button.removeEventListener('pointercancel', onLeave);
  });
}

function animateTextFlip() {
  const container = document.getElementById('landing-text-flip-container');
  const textWrapper = document.getElementById('landing-text-flip-wrapper');

  if (!container || !textWrapper) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentIndex = 0;

  textWrapper.textContent = HERO_WORDS[0];

  if (textFlipIntervalId !== null) {
    window.clearInterval(textFlipIntervalId);
  }

  textFlipIntervalId = window.setInterval(() => {
    if (!document.body.contains(container)) {
      if (textFlipIntervalId !== null) {
        window.clearInterval(textFlipIntervalId);
        textFlipIntervalId = null;
      }
      return;
    }

    const nextIndex = (currentIndex + 1) % HERO_WORDS.length;

    if (reduceMotion) {
      currentIndex = nextIndex;
      textWrapper.textContent = HERO_WORDS[currentIndex];
      return;
    }

    const morphTl = gsap.timeline();

    morphTl.to(container, {
      scaleX: 0.93,
      scaleY: 1.09,
      borderRadius: 24,
      filter: 'blur(0.2px)',
      duration: 0.16,
      ease: 'power3.inOut',
    });

    morphTl.add(() => {
      animateDynamicIslandTransition({
        containerId: 'landing-text-flip-container',
        contentWrapperId: 'landing-text-flip-wrapper',
        direction: 'next',
        onMidpoint: () => {
          currentIndex = nextIndex;
          textWrapper.textContent = HERO_WORDS[currentIndex];
        },
      });
    }, 0.08);

    morphTl.to(
      container,
      {
        scaleX: 1.035,
        scaleY: 0.972,
        borderRadius: 18,
        filter: 'blur(0px)',
        duration: 0.24,
        ease: 'power3.out',
      },
      0.24
    );

    morphTl.to(
      container,
      {
        scaleX: 1,
        scaleY: 1,
        borderRadius: 16,
        backgroundColor: '#161616',
        duration: 0.72,
        ease: 'elastic.out(0.86, 0.52)',
      },
      0.38
    );
  }, 3000);
}

function animateHero() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    gsap.set(
      [
        '#landing-headline',
        '#landing-hero-description',
        '#landing-ctas',
      ],
      {
        opacity: 1,
        y: 0,
        filter: 'none',
      }
    );

    animateTextFlip();
    return;
  }

  const tl = gsap.timeline({
    delay: 0.18,
    onComplete: animateTextFlip,
  });

  tl.fromTo(
    '#landing-headline',
    {
      opacity: 0,
      y: 28,
      scaleX: 0.96,
      scaleY: 1.035,
      filter: 'blur(10px)',
    },
    {
      opacity: 1,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'blur(0px)',
      duration: 0.82,
      ease: 'elastic.out(0.9, 0.52)',
    }
  );

  tl.fromTo(
    '#landing-hero-description',
    {
      opacity: 0,
      y: 18,
      filter: 'blur(8px)',
    },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.62,
      ease: 'power3.out',
    },
    '-=0.42'
  );

  tl.fromTo(
    '#landing-ctas',
    {
      opacity: 0,
      y: 18,
      scaleX: 0.92,
      scaleY: 1.08,
      filter: 'blur(8px)',
    },
    {
      opacity: 1,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'blur(0px)',
      duration: 0.78,
      ease: 'elastic.out(0.95, 0.48)',
    },
    '-=0.36'
  );
}