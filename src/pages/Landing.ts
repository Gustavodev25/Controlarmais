import gsap from 'gsap';
import { authManager } from './Auth';
import { animateDynamicIslandEntrance, animateDynamicIslandTransition } from '../components/DynamicIsland';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { TopbarLanding, attachTopbarLandingListeners } from '../components/TopbarLanding';
import { themeManager } from '../components/ThemeManager';
import { BentoLanding, attachBentoLandingListeners, cleanupBentoLanding } from '../components/BentoLanding';
import { PricingLanding, attachPricingLandingListeners } from '../components/PricingLanding';
import { TestimonialsLanding, attachTestimonialsLandingListeners } from '../components/TestimonialsLanding';
import { FaqLanding, attachFaqListeners } from '../components/FaqLanding';
import { HeroLanding, attachHeroLandingListeners } from '../components/HeroLanding';
import { BankCarouselLanding, attachBankCarouselListeners, cleanupBankCarousel } from '../components/BankCarouselLanding';

const BRILHO_ID = 'landing-brilho-root';

// Injeta o brilho direto no body — fora do #app — para garantir position:fixed real
function mountBrilho() {
  document.getElementById(BRILHO_ID)?.remove();
  const host = document.createElement('div');
  host.id = BRILHO_ID;
  host.innerHTML = BrilhoHeader();
  document.body.appendChild(host);
}

function injectLandingStyles() {
  if (document.getElementById('landing-styles')) return;
  const style = document.createElement('style');
  style.id = 'landing-styles';
  style.textContent = `
    #${BRILHO_ID} .brilho-header-glow {
      position: absolute !important;
    }

    html, body {
      overflow-x: hidden !important;
      max-width: 100vw;
      width: 100%;
      position: relative;
    }

    #landing-main-wrapper {
      overflow-x: hidden;
      width: 100%;
      position: relative;
    }

    /* ── Hero ── */

    #landing-hero {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 180px 24px 0;
    }

    #landing-headline {
      font-size: clamp(32px, 7vw, 76px);
      font-weight: 700;
      color: #ffffff;
      line-height: 1.12;
      letter-spacing: -0.03em;
      max-width: 1000px;
      margin: 0 0 20px;
    }

    .text-flip-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-radius: 12px;
      padding: 4px 20px 8px;
      color: var(--color-text, #ffffff);
      background: var(--color-surface, #111111);
      border: 1px solid var(--color-border, rgba(255, 255, 255, 0.07));
      overflow: hidden;
      white-space: nowrap;
      vertical-align: middle;
      margin-top: 12px;
      transform-origin: center center;
      will-change: transform;
    }

    .text-flip-word-wrapper {
      display: inline-block;
      white-space: nowrap;
      line-height: 1;
    }



    #landing-subheadline {
      font-size: clamp(15px, 2vw, 18px);
      font-weight: 400;
      color: rgba(255,255,255,0.45);
      line-height: 1.6;
      max-width: 480px;
      margin: 0 0 36px;
    }

    #landing-ctas {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 72px;
    }

    /* ── Mockup ── */
    #landing-mockup-wrap {
      position: relative;
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 24px;
      /* perspectiva aplicada no wrapper para o rotateX funcionar em 3D */
      perspective: 1400px;
    }

    #landing-mockup-frame {
      position: relative;
      border-radius: 14px 14px 0 0;
      border: none;
      overflow: hidden;
      transform: rotateX(18deg);
      transform-origin: center top;
      will-change: transform;
    }

    #landing-mockup-frame img {
      width: 100%;
      display: block;
      border-radius: 12px 12px 0 0;
      mask-image: linear-gradient(to bottom, #000 0%, #000 58%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 58%, transparent 100%);
    }

    .mockup-desktop {
      display: block !important;
    }

    .mockup-mobile {
      display: none !important;
    }

    /* Linha sutil no ponto de corte */
    #landing-mockup-line {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(
        to right,
        transparent 0%,
        rgba(255,255,255,0.05) 15%,
        rgba(255,255,255,0.10) 50%,
        rgba(255,255,255,0.05) 85%,
        transparent 100%
      );
    }

    /* Fade que funde com o fundo da página */
    #landing-mockup-fade {
      position: absolute;
      bottom: 0;
      left: 24px;
      right: 24px;
      height: 220px;
      background: linear-gradient(to bottom, transparent 0%, #0C0C0C 100%);
      pointer-events: none;
    }

    /* ── Pricing Banner ── */
    #pricing-card-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 8px 20px;
      background: #022c22;
      border: 1px solid rgba(52, 211, 153, 0.2);
      border-bottom: none;
      border-radius: 16px 16px 0 0;
      width: 100%;
      position: relative;
      z-index: 10;
      transform: translateY(1px);
      box-shadow: 0 -4px 15px rgba(0,0,0,0.2);
    }

    .pricing-banner-text {
      font-size: 11px;
      font-weight: 650;
      color: rgba(187, 247, 208, 0.95);
      letter-spacing: 0.03em;
      white-space: nowrap;
    }

    .pricing-banner-text strong {
      color: #fff;
      font-weight: 800;
    }

    @media (max-width: 480px) {
      #pricing-card-banner {
        padding: 6px 14px;
        width: 90%;
      }
      .pricing-banner-text {
        font-size: 10px;
        white-space: normal;
        text-align: center;
        line-height: 1.2;
      }
    }

    /* ── Mobile App Section ── */
    #landing-mobile-section {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      padding: 100px 48px 80px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 64px;
    }

    #landing-mobile-text {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    #landing-mobile-heading {
      font-size: clamp(26px, 4vw, 42px);
      font-weight: 700;
      color: #ffffff;
      line-height: 1.18;
      letter-spacing: -0.025em;
      margin: 0;
    }

    #landing-mobile-heading span {
      color: #D97757;
    }

    #landing-mobile-desc {
      font-size: 16px;
      font-weight: 400;
      color: rgba(255,255,255,0.45);
      line-height: 1.65;
      margin: 0;
      max-width: 420px;
    }

    #landing-mobile-store-btns {
      display: flex;
      flex-direction: row;
      gap: 10px;
      margin-top: 8px;
    }

    .landing-store-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      cursor: not-allowed;
      opacity: 0.6;
    }

    .landing-store-btn-icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .landing-store-btn-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
      text-align: left;
    }

    .landing-store-btn-soon {
      font-size: 9px;
      font-weight: 600;
      color: rgba(255,255,255,0.35);
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .landing-store-btn-name {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
    }

    #landing-mobile-phone {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      position: relative;
    }

    #landing-mobile-phone img {
      width: 100%;
      max-width: 280px;
      height: auto;
      display: block;
      filter: drop-shadow(0 32px 64px rgba(0,0,0,0.6));
    }

    @media (max-width: 768px) {
      #landing-mobile-section {
        grid-template-columns: 1fr;
        padding: 72px 24px 60px;
        gap: 48px;
        text-align: center;
      }
      #landing-mobile-tag,
      #landing-mobile-desc,
      .landing-store-btn {
        margin-left: auto;
        margin-right: auto;
      }
      #landing-mobile-store-btns {
        align-items: center;
      }
      #landing-mobile-phone {
        order: -1;
      }
    }

    /* ── Bento Grid ── */
    #landing-bento-section {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      padding: 180px 48px 100px;
    }

    #landing-bento-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: #D97757;
      margin: 0 0 14px;
    }

    #landing-bento-heading {
      font-size: clamp(24px, 3.5vw, 40px);
      font-weight: 700;
      color: #ffffff;
      line-height: 1.18;
      letter-spacing: -0.025em;
      margin: 0 0 48px;
    }

    #landing-bento-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: auto;
      gap: 14px;
      grid-template-areas:
        "a a b"
        "c d d"
        "e e f";
    }

    .bento-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: hidden;
      position: relative;
      transition: border-color 0.2s, background 0.2s;
    }

    .bento-card:hover {
      border-color: rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.045);
    }

    .bento-card-a { grid-area: a; padding-bottom: 0; gap: 8px; }
    .bento-card-b { grid-area: b; align-self: start; }
    .bento-card-c { grid-area: c; min-height: 240px; }
    .bento-card-d { grid-area: d; min-height: 240px; }
    .bento-card-e { grid-area: e; min-height: 200px; overflow: visible; }
    .bento-card-f { grid-area: f; min-height: 200px; }

    /* ── Card A: Dashboard mockup ── */
    .bento-mockup-perspective {
      margin-top: 0;
      overflow: hidden;
      border-radius: 10px;
      position: relative;
    }

    .bento-mockup-inner {
      /* flat, sem 3D */
    }



    .bento-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(217,119,87,0.12);
      border: 1px solid rgba(217,119,87,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .bento-card-title {
      font-size: 16px;
      font-weight: 650;
      color: #ffffff;
      line-height: 1.3;
      margin: 0;
    }

    .bento-card-desc {
      font-size: 13.5px;
      color: rgba(255,255,255,0.4);
      line-height: 1.6;
      margin: 0;
    }

    .bento-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(217,119,87,0.12);
      color: #D97757;
      border: 1px solid rgba(217,119,87,0.2);
      width: fit-content;
    }

    .bento-visual {
      margin-top: auto;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
    }



    /* card e: lottie row */
    .bento-lottie-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: auto;
    }

    /* card f: theme toggle mockup */
    .bento-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      padding: 10px 14px;
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
    }

    .bento-toggle-switch {
      width: 38px;
      height: 22px;
      border-radius: 999px;
      background: #D97757;
      position: relative;
    }

    .bento-toggle-knob {
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      top: 3px;
      right: 3px;
    }

    /* ── Credit card stack mockup (card E) ── */
    .bento-cc-wrap {
      position: relative;
      width: 100%;
      height: 132px;
      overflow: visible;
      perspective: 1200px;
      perspective-origin: 50% -20%;
    }

    .bento-cc-item {
      position: absolute;
      inset: 0;
      border-radius: 16px;
      transform-origin: 50% 0%;
    }

    .bento-cc-inner {
      width: 100%;
      height: 100%;
      border-radius: 16px;
      background: #111111;
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 12px 24px -6px rgba(0,0,0,0.4), 0 4px 8px -2px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 14px 18px 12px;
    }

    /* ── Patrimony mockup (card D) ── */
    .bento-pat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .bento-pat-card {
      background: #111111;
      border: 1px solid #1C1C1C;
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
    }

    .bento-pat-tag-row {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 6px;
    }

    .bento-pat-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      flex-shrink: 0;
      opacity: 0.7;
    }

    .bento-pat-tag {
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.8;
    }

    .bento-pat-name {
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bento-pat-sub {
      font-size: 9px;
      color: rgba(255,255,255,0.35);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bento-pat-divider {
      border: none;
      border-top: 1px solid #1C1C1C;
      margin: 10px -14px;
    }

    .bento-pat-label {
      font-size: 7.5px;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }

    .bento-pat-value {
      display: flex;
      align-items: baseline;
      gap: 2px;
      margin-top: auto;
    }

    .bento-pat-curr { font-size: 9px; font-weight: 500; color: rgba(255,255,255,0.4); }
    .bento-pat-num  { font-size: 17px; font-weight: 600; color: #fff; letter-spacing: -0.02em; line-height: 1; }
    .bento-pat-dec  { font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.4); }

    /* ── Calendar mockup (card C) ── */
    .bento-cal-wrap {
      background: #111111;
      border-radius: 12px;
      border: 1px solid #1C1C1C;
      overflow: hidden;
    }

    .bento-cal-head {
      padding: 6px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      background: #141414;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .bento-cal-body {
      padding: 10px 12px 12px;
    }

    .bento-cal-month-label {
      font-size: 8px;
      font-weight: 700;
      color: rgba(255,255,255,0.55);
      text-transform: uppercase;
      letter-spacing: 0.22em;
      margin-bottom: 8px;
    }

    .bento-cal-cells {
      display: flex;
      gap: 5px;
      overflow: visible;
      position: relative;
    }

    .bento-cal-cells::after {
      content: '';
      position: absolute;
      right: 0; top: 0; bottom: 0;
      width: 32px;
      background: linear-gradient(to right, transparent, #111111);
      pointer-events: none;
    }

    .bento-day {
      flex-shrink: 0;
      width: 44px;
      height: 60px;
      border-radius: 9px;
      border: 1px solid rgba(255,255,255,0.05);
      background: #1A1A1A;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .bento-day.bento-today {
      border-color: rgba(217,119,87,0.55);
    }

    .bento-day-wd {
      font-size: 6.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.28);
    }

    .bento-today .bento-day-wd { color: #D97757; }

    .bento-day-num {
      font-size: 15px;
      font-weight: 500;
      color: rgba(255,255,255,0.75);
      line-height: 1;
    }

    .bento-today .bento-day-num { color: #D97757; }

    .bento-day-dots {
      display: flex;
      gap: 3px;
      height: 5px;
      align-items: center;
    }

    .bento-dot-i { width:5px;height:5px;border-radius:50%;background:rgba(16,185,129,0.8); }
    .bento-dot-e { width:5px;height:5px;border-radius:50%;background:rgba(239,68,68,0.8); }

    @media (max-width: 768px) {
      #landing-hero {
        padding: 130px 20px 0;
      }
      #landing-headline {
        font-size: clamp(28px, 9vw, 42px);
        margin: 0 0 16px;
      }
      #landing-subheadline {
        font-size: 15px;
        margin: 0 0 28px;
        padding: 0 10px;
      }
      #landing-ctas {
        flex-direction: column;
        width: 100%;
        max-width: 320px;
        gap: 10px;
        margin-bottom: 60px;
      }
      #landing-ctas button {
        width: 100%;
        height: 50px !important;
        font-size: 16px !important;
      }
      #landing-mockup-fade {
        height: 120px;
      }
      .text-flip-container {
        padding: 2px 14px 6px;
        margin-top: 8px;
        border-radius: 10px;
      }
    }

    /* ── Bento Grid ── */
    #landing-bento-section {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      padding: 100px 48px 100px;
    }

    #landing-bento-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: #D97757;
      margin: 0 0 14px;
    }

    #landing-bento-heading {
      font-size: clamp(24px, 3.5vw, 40px);
      font-weight: 700;
      color: #ffffff;
      line-height: 1.18;
      letter-spacing: -0.025em;
      margin: 0 0 48px;
    }

    #landing-bento-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: auto;
      gap: 14px;
      grid-template-areas:
        "a a b"
        "c d d"
        "e e f";
    }

    .bento-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: hidden;
      position: relative;
      transition: border-color 0.2s, background 0.2s;
    }

    .bento-card:hover {
      border-color: rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.045);
    }

    .bento-card-a { grid-area: a; padding-bottom: 0; gap: 8px; }
    .bento-card-b { grid-area: b; align-self: start; }
    .bento-card-c { grid-area: c; min-height: 240px; }
    .bento-card-d { grid-area: d; min-height: 240px; }
    .bento-card-e { grid-area: e; min-height: 200px; overflow: visible; }
    .bento-card-f { grid-area: f; min-height: 200px; }

    /* ── Card A: Dashboard mockup ── */
    .bento-mockup-perspective {
      margin-top: 0;
      overflow: hidden;
      border-radius: 10px;
      position: relative;
    }

    .bento-mockup-inner {
      /* flat, sem 3D */
    }

    .bento-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(217,119,87,0.12);
      border: 1px solid rgba(217,119,87,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .bento-card-title {
      font-size: 16px;
      font-weight: 650;
      color: #ffffff;
      line-height: 1.3;
      margin: 0;
    }

    .bento-card-desc {
      font-size: 13.5px;
      color: rgba(255,255,255,0.4);
      line-height: 1.6;
      margin: 0;
    }

    .bento-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(217,119,87,0.12);
      color: #D97757;
      border: 1px solid rgba(217,119,87,0.2);
      width: fit-content;
    }

    .bento-visual {
      margin-top: auto;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
    }

    /* card e: lottie row */
    .bento-lottie-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: auto;
    }

    /* card f: theme toggle mockup */
    .bento-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      padding: 10px 14px;
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
    }

    .bento-toggle-switch {
      width: 38px;
      height: 22px;
      border-radius: 999px;
      background: #D97757;
      position: relative;
    }

    .bento-toggle-knob {
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      top: 3px;
      right: 3px;
    }

    /* ── Credit card stack mockup (card E) ── */
    .bento-cc-wrap {
      position: relative;
      width: 100%;
      height: 132px;
      overflow: visible;
      perspective: 1200px;
      perspective-origin: 50% -20%;
    }

    .bento-cc-item {
      position: absolute;
      inset: 0;
      border-radius: 16px;
      transform-origin: 50% 0%;
    }

    .bento-cc-inner {
      width: 100%;
      height: 100%;
      border-radius: 16px;
      background: #111111;
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 12px 24px -6px rgba(0,0,0,0.4), 0 4px 8px -2px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 14px 18px 12px;
    }

    /* ── Patrimony mockup (card D) ── */
    .bento-pat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    @media (max-width: 640px) {
      .bento-pat-grid {
        grid-template-columns: 1fr;
      }
    }

    .bento-pat-card {
      background: #111111;
      border: 1px solid #1C1C1C;
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
    }

    .bento-pat-tag-row {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 6px;
    }

    .bento-pat-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      flex-shrink: 0;
      opacity: 0.7;
    }

    .bento-pat-tag {
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.8;
    }

    .bento-pat-name {
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bento-pat-sub {
      font-size: 9px;
      color: rgba(255,255,255,0.35);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bento-pat-divider {
      border: none;
      border-top: 1px solid #1C1C1C;
      margin: 10px -14px;
    }

    .bento-pat-label {
      font-size: 7.5px;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }

    .bento-pat-value {
      display: flex;
      align-items: baseline;
      gap: 2px;
      margin-top: auto;
    }

    .bento-pat-curr { font-size: 9px; font-weight: 500; color: rgba(255,255,255,0.4); }
    .bento-pat-num  { font-size: 17px; font-weight: 600; color: #fff; letter-spacing: -0.02em; line-height: 1; }
    .bento-pat-dec  { font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.4); }

    /* ── Calendar mockup (card C) ── */
    .bento-cal-wrap {
      background: #111111;
      border-radius: 12px;
      border: 1px solid #1C1C1C;
      overflow: hidden;
    }

    .bento-cal-head {
      padding: 6px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      background: #141414;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .bento-cal-body {
      padding: 10px 12px 12px;
    }

    .bento-cal-month-label {
      font-size: 8px;
      font-weight: 700;
      color: rgba(255,255,255,0.55);
      text-transform: uppercase;
      letter-spacing: 0.22em;
      margin-bottom: 8px;
    }

    .bento-cal-cells {
      display: flex;
      gap: 5px;
      overflow: hidden;
      position: relative;
    }

    .bento-cal-cells::after {
      content: '';
      position: absolute;
      right: 0; top: 0; bottom: 0;
      width: 32px;
      background: linear-gradient(to right, transparent, #111111);
      pointer-events: none;
    }

    .bento-day {
      flex-shrink: 0;
      width: 44px;
      height: 60px;
      border-radius: 9px;
      border: 1px solid rgba(255,255,255,0.05);
      background: #1A1A1A;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .bento-day.bento-today {
      border-color: rgba(217,119,87,0.55);
    }

    .bento-day-wd {
      font-size: 6.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.28);
    }

    .bento-today .bento-day-wd { color: #D97757; }

    .bento-day-num {
      font-size: 15px;
      font-weight: 500;
      color: rgba(255,255,255,0.75);
      line-height: 1;
    }

    .bento-today .bento-day-num { color: #D97757; }

    .bento-day-dots {
      display: flex;
      gap: 3px;
      height: 5px;
      align-items: center;
    }

    .bento-dot-i { width:5px;height:5px;border-radius:50%;background:rgba(16,185,129,0.8); }
    .bento-dot-e { width:5px;height:5px;border-radius:50%;background:rgba(239,68,68,0.8); }

    @media (max-width: 900px) {
      #landing-bento-grid {
        grid-template-columns: repeat(2, 1fr);
        grid-template-areas:
          "a a"
          "b c"
          "d d"
          "e f";
      }
      #landing-bento-section {
        padding: 0 24px 80px;
      }
    }

    @media (max-width: 600px) {
      #landing-bento-grid {
        grid-template-columns: 1fr;
        grid-template-areas:
          "a" "b" "c" "d" "e" "f";
      }
      .bento-card {
        padding: 24px;
      }
    }

    /* ── Mobile App Section ── */
    #landing-mobile-section {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      padding: 120px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 60px;
    }

    #landing-mobile-content {
      flex: 1;
      max-width: 540px;
    }

    #landing-mobile-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #D97757;
      margin: 0 0 14px;
    }

    #landing-mobile-heading {
      font-size: clamp(24px, 3.5vw, 40px);
      font-weight: 700;
      color: #ffffff;
      line-height: 1.18;
      letter-spacing: -0.025em;
      margin: 0 0 24px;
    }

    #landing-mobile-desc {
      font-size: 17px;
      line-height: 1.6;
      color: rgba(255,255,255,0.5);
      margin-bottom: 32px;
    }

    #landing-mobile-phone {
      flex: 1;
      display: flex;
      justify-content: center;
      max-width: 320px;
    }

    #landing-mobile-phone img {
      width: 100%;
      height: auto;
      border-radius: 32px;
    }

    /* ── Pricing ── */
    #landing-pricing-section {
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
      padding: 80px 24px 120px;
      text-align: center;
    }

    #landing-pricing-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #D97757;
      margin: 0 0 14px;
    }

    #landing-pricing-heading {
      font-size: clamp(22px, 3vw, 34px);
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0 0 48px;
    }

    #pricing-timer-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      margin-bottom: 56px;
    }

    #pricing-timer-tag {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.45);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #pricing-timer-tag span {
      width: 6px;
      height: 6px;
      background: #D97757;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(217,119,87,0.5);
    }

    #pricing-timer {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pricing-timer-block {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      min-width: 64px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .pricing-timer-num {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      font-family: monospace;
      line-height: 1;
    }

    .pricing-timer-unit {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.3);
    }

    .pricing-timer-sep {
      font-size: 20px;
      font-weight: 700;
      color: rgba(255,255,255,0.15);
      padding-bottom: 14px;
    }

    #landing-pricing-card {
      background: #111111;
      border: 1px solid #1C1C1C;
      border-radius: 20px;
      overflow: hidden;
      text-align: left;
    }

    #landing-pricing-card-top {
      padding: 16px 28px 12px;
      border-bottom: 1px solid #1C1C1C;
    }

    .pricing-plan-name {
      font-size: 28px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      letter-spacing: -0.03em;
      margin: 0 0 16px;
    }

    #landing-pricing-price {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 8px;
    }

    .pricing-curr {
      font-size: 18px;
      font-weight: 600;
      color: rgba(255,255,255,0.45);
    }

    @media (max-width: 480px) {
       #landing-pricing-section {
         padding-bottom: 80px;
       }
       #landing-pricing-heading {
         font-size: 26px !important;
       }
       .pricing-amount {
         font-size: 48px !important;
       }
       .pricing-timer-block {
         min-width: 54px !important;
         padding: 8px 10px !important;
       }
       .pricing-timer-num {
         font-size: 20px !important;
       }
    }
    .pricing-amount {
      font-size: 56px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .pricing-dec {
      font-size: 24px;
      font-weight: 600;
      color: rgba(255,255,255,0.65);
      letter-spacing: -0.02em;
    }

    .pricing-period {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.3);
      margin-left: 4px;
    }

    .pricing-desc {
      font-size: 13px;
      color: rgba(255,255,255,0.35);
      margin: 0;
    }

    #landing-pricing-features {
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    #pricing-hidden-features {
      display: none;
      flex-direction: column;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
    }

    .pricing-feature {
      display: flex;
      align-items: center;
      margin: 0;
      padding: 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      width: 100%;
    }

    .pricing-feature:last-child {
      border-bottom: none;
    }

    .pricing-feature-hidden {
      will-change: transform, opacity;
    }

    .pricing-feature-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 28px;
      width: 100%;
    }

    .pricing-feature-text {
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(255,255,255,0.65);
      letter-spacing: -0.01em;
    }

    #pricing-expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 12px 28px;
      background: rgba(255,255,255,0.02);
      border: none;
      border-top: 1px solid rgba(255,255,255,0.05);
      cursor: pointer;
      transform-origin: center center;
      will-change: transform, background;
    }

    #pricing-expand-text {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.35);
      letter-spacing: 0.01em;
    }

    #pricing-expand-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.3);
      will-change: transform;
    }

    #landing-pricing-cta {
      padding: 16px 28px 22px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    #landing-pricing-signup-btn {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      background: #D97757;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: -0.01em;
      transform-origin: center center;
      will-change: transform, border-radius, box-shadow, background;
    }

    /* ── Testimonials ── */
    #landing-testimonials-section {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 80px 0 120px;
      text-align: center;
      overflow: hidden;
    }

    #landing-testimonials-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #D97757;
      margin: 0 0 14px;
    }

    #landing-testimonials-heading {
      font-size: clamp(22px, 3vw, 34px);
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0 0 48px;
    }

    #landing-testimonials-wrapper {
      position: relative;
      width: 100%;
      overflow: hidden;
      /* Blur nas bordas (fading) superior e inferior usando mask-image */
      mask-image: linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%);
      -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%);
    }

    #landing-testimonials-track {
      display: flex;
      flex-direction: row;
      width: max-content;
      gap: 16px;
      animation: horizontal-marquee 40s linear infinite;
      padding: 10px 0;
    }
    
    #landing-testimonials-track:hover {
      animation-play-state: paused;
    }

    @keyframes horizontal-marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    .testimonial-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      text-align: left;
      /* specific width to keep horizontal size constant */
      width: 340px;
      flex-shrink: 0;
      /* Minimalist look with backdrop blur */
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .testimonial-user {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .testimonial-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .testimonial-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .testimonial-name {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      line-height: 1;
    }

    .testimonial-role {
      font-size: 12px;
      color: rgba(255,255,255,0.45);
      font-weight: 500;
      line-height: 1;
    }

    .testimonial-text {
      font-size: 14px;
      color: rgba(255,255,255,0.7);
      line-height: 1.6;
      margin: 0;
    }

    /* ── FAQ ── */
    #landing-faq-section {
      width: 100%;
      max-width: 640px;
      margin: 0 auto;
      padding: 0 24px 120px;
    }

    #landing-faq-heading {
      font-size: clamp(22px, 3vw, 32px);
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.025em;
      line-height: 1.15;
      margin: 0 0 32px;
      text-align: center;
    }

    #landing-faq-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .faq-item {
      background: rgba(255,255,255,0.015);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 16px;
      overflow: hidden;
      transform-origin: center center;
      will-change: transform, background, border-color, border-radius;
    }

    .faq-question {
      width: 100%;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.85);
      font-size: 14.5px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      gap: 16px;
      letter-spacing: -0.01em;
    }

    .faq-q-text {
      flex: 1;
    }

    .faq-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: rgba(255,255,255,0.25);
      will-change: transform;
    }

    .faq-answer-wrapper {
      max-height: 0;
      overflow: hidden;
      opacity: 0;
    }

    .faq-answer {
      padding: 0 20px 18px;
      color: rgba(255,255,255,0.45);
      font-size: 14px;
      line-height: 1.65;
    }

    /* ── Footer ── */
    #landing-footer-wrapper {
      width: 100%;
      background: rgba(0,0,0,0.25);
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    #landing-footer {
      max-width: 1100px;
      width: 100%;
      margin: 0 auto;
      padding: 28px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #landing-footer-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    #landing-footer-logo {
      display: inline-flex;
    }

    #landing-footer-logo img {
      height: 20px;
      width: auto;
      object-fit: contain;
      filter: grayscale(100%) opacity(0.4);
      transition: filter 0.3s ease;
    }

    #landing-footer-logo:hover img {
      filter: grayscale(0%) opacity(0.8);
    }

    #landing-footer-copy {
      font-size: 12.5px;
      color: rgba(255,255,255,0.25);
      font-weight: 400;
      letter-spacing: -0.01em;
    }

    #landing-footer-right {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12.5px;
      color: rgba(255,255,255,0.25);
      font-weight: 400;
    }

    #landing-footer-heart {
      color: #e25555;
      font-size: 13px;
      line-height: 1;
    }

    /* ── Responsive Overrides ── */

    @media (max-width: 768px) {
      #landing-hero {
        padding: 160px 20px 0;
      }
      #landing-headline {
        font-size: clamp(32px, 10vw, 44px);
        margin-bottom: 16px;
      }
      #landing-subheadline {
        font-size: 15px;
        margin-bottom: 32px;
        padding: 0 10px;
      }
      #landing-ctas {
        flex-direction: column;
        width: 100%;
        max-width: 320px;
        gap: 12px;
        margin-bottom: 60px;
      }
      #landing-ctas button,
      #landing-ctas a {
        width: 100% !important;
        height: 50px !important;
        justify-content: center;
      }
      #landing-mockup-wrap {
        padding: 0;
      }
      .mockup-desktop {
        display: none !important;
      }
      .mockup-mobile {
        display: block !important;
        border-radius: 20px;
        max-width: 300px;
        margin: 0 auto;
        mask-image: none !important;
        -webkit-mask-image: none !important;
      }
      #landing-mockup-frame {
        display: flex;
        justify-content: center;
        border-radius: 20px;
      }
      #landing-mockup-frame img {
        border-radius: 20px;
      }
      #landing-mockup-fade {
        height: 80px;
      }

      /* Bento Grid Mobile */
      #landing-bento-section {
        padding: 80px 20px 80px;
      }
      #landing-bento-grid {
        grid-template-columns: 1fr;
        grid-template-areas: "a" "b" "c" "d" "e" "f";
        gap: 16px;
      }
      .bento-card {
        padding: 24px;
      }

      /* Mobile App Section */
      #landing-mobile-section {
        flex-direction: column;
        padding: 80px 20px;
        text-align: center;
      }
      #landing-mobile-phone {
        max-width: 280px;
      }

      /* Pricing Mobile */
      #landing-pricing-section {
        padding: 60px 20px 80px;
      }
      .pricing-amount {
        font-size: 48px !important;
      }
      .pricing-timer-block {
        min-width: 50px !important;
        padding: 8px 6px !important;
      }

      /* Testimonials Mobile */
      #landing-testimonials-section {
         padding: 60px 0 80px;
      }
      .testimonial-card {
        width: 280px;
        padding: 20px;
      }

      /* FAQ Mobile */
      #landing-faq-section {
        padding: 0 16px 80px;
      }

      /* Footer Mobile */
      #landing-footer {
        flex-direction: column;
        gap: 10px;
        padding: 24px 20px;
        text-align: center;
      }
      #landing-footer-left {
        flex-direction: column;
        gap: 8px;
      }
    }
  `;
  document.head.appendChild(style);
}

function footerHTML(): string {
  const currentYear = new Date().getFullYear();
  return `
    <div id="landing-footer-wrapper">
      <footer id="landing-footer">
        <div id="landing-footer-left">
          <a href="#" id="landing-footer-logo" aria-label="Voltar ao topo">
            <img src="/assets/logo/logo.png" alt="Controlar Mais" loading="lazy" />
          </a>
          <span id="landing-footer-copy">© ${currentYear} Controlar+</span>
        </div>
        <div id="landing-footer-right">
          Feito com <span id="landing-footer-heart">❤</span> no Brasil
        </div>
      </footer>
    </div>
  `;
}


export function cleanupLanding() {
  document.getElementById(BRILHO_ID)?.remove();
  document.getElementById('landing-styles')?.remove();
  cleanupBankCarousel();
  cleanupBentoLanding();
  // Restaura tudo para o layout normal do dashboard
  document.documentElement.style.overflowY = '';
  document.body.style.overflow = '';
  document.body.style.height = '';
  const app = document.getElementById('app');
  if (app) {
    app.style.height = '';
    app.style.overflow = '';
  }
}

export function renderLanding() {
  themeManager.forceDark();
  const app = document.getElementById('app')!;

  // Brilho no body — fora do #app — para position:fixed não ser afetado por ancestors
  mountBrilho();
  injectLandingStyles();

  // Força só o html como scroll container (body e #app ficam visíveis)
  // Sem isso, html + body com overflow-x:hidden viram 2 scroll containers
  // Manter overflow-x: hidden para evitar scroll horizontal
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
    <div id="landing-main-wrapper" style="min-height: 200vh; background-color: #0C0C0C; width: 100%; overflow-x: hidden; position: relative;">
      ${TopbarLanding()}
      ${HeroLanding()}
      ${BankCarouselLanding()}
      ${BentoLanding()}
      ${PricingLanding()}
      ${TestimonialsLanding()}
      ${FaqLanding()}
      ${footerHTML()}
    </div>
  `;

  attachTopbarLandingListeners();
  attachHeroLandingListeners();
  attachBankCarouselListeners();
  attachBentoLandingListeners();
  attachPricingLandingListeners();
  attachTestimonialsLandingListeners();
  attachFaqListeners();
}
