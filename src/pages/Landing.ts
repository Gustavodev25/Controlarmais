import gsap from 'gsap';
import { authManager } from './Auth';
import { animateDynamicIslandEntrance, animateDynamicIslandTransition } from '../components/DynamicIsland';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { TopbarLanding, attachTopbarLandingListeners } from '../components/TopbarLanding';
import { themeManager } from '../components/ThemeManager';

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
      text-transform: uppercase;
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
      text-transform: uppercase;
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
      padding: 0 24px 120px;
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
      gap: 0;
    }

    #pricing-visible-features {
      display: flex;
      flex-direction: column;
    }

    #pricing-visible-wrap {
      position: relative;
    }

    #pricing-blur-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 72px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 4px;
      cursor: pointer;
      background: linear-gradient(to bottom, transparent 0%, #111111 100%);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }

    #pricing-expand-text {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.02em;
    }

    #pricing-hidden-features {
      overflow: hidden;
      max-height: 0;
    }

    #pricing-hidden-wrapper {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-top: 14px;
    }

    .pricing-feature {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 5px 28px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .pricing-feature:last-child {
      border-bottom: none;
    }

    .pricing-feature-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #4ade80;
      flex-shrink: 0;
      box-shadow: 0 0 10px rgba(74, 222, 128, 0.2);
    }

    .pricing-feature-text {
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(255,255,255,0.65);
      letter-spacing: -0.01em;
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
      transition: opacity 0.15s;
    }

    #landing-pricing-signup-btn:hover {
      opacity: 0.88;
    }

    /* ── Testimonials ── */
    #landing-testimonials-section {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 0 0 120px;
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
      max-width: 680px;
      margin: 0 auto;
      padding: 0 24px 120px;
    }

    #landing-faq-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #D97757;
      margin: 0 0 14px;
      text-align: center;
    }

    #landing-faq-heading {
      font-size: clamp(22px, 3vw, 34px);
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0 0 48px;
      text-align: center;
    }

    .faq-item {
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    .faq-question {
      width: 100%;
      padding: 24px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      gap: 16px;
    }

    .faq-question:hover {
      color: rgba(255,255,255,0.8);
    }

    .faq-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.3s ease, color 0.3s;
      color: rgba(255,255,255,0.4);
    }

    .faq-item.active .faq-icon {
      transform: rotate(180deg);
      color: #D97757;
    }

    .faq-answer-wrapper {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.35s ease;
    }

    .faq-answer {
      padding-bottom: 24px;
      color: rgba(255,255,255,0.55);
      font-size: 15px;
      line-height: 1.6;
    }

    /* ── Footer ── */
    #landing-footer {
      width: 100%;
      padding: 48px 24px 32px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    #landing-footer-logo {
      display: inline-flex;
    }

    #landing-footer-logo img {
      height: 24px;
      width: auto;
      object-fit: contain;
      filter: grayscale(100%) opacity(0.5);
      transition: filter 0.3s ease;
    }

    #landing-footer-logo:hover img {
      filter: grayscale(0%) opacity(0.9);
    }

    #landing-footer-text {
      font-size: 13px;
      color: rgba(255,255,255,0.35);
      font-weight: 400;
      letter-spacing: -0.01em;
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
      #landing-ctas button {
        width: 100% !important;
        height: 50px !important;
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
        padding: 0 20px 80px;
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
         padding-bottom: 80px;
      }
      .testimonial-card {
        width: 280px;
        padding: 20px;
      }

      /* FAQ Mobile */
      #landing-faq-section {
        padding: 0 20px 80px;
      }
      .faq-question {
        padding: 20px 0;
        font-size: 15px;
      }
    }
  `;
  document.head.appendChild(style);
}

function heroHTML(): string {
  return `
    <section id="landing-hero">
      <h1 id="landing-headline">
        <span class="headline-part">A gestão definitiva para</span>
        <span id="landing-text-flip-container" class="text-flip-container">
          <span id="landing-text-flip-wrapper" class="text-flip-word-wrapper"></span>
        </span>
      </h1>
      </h1>

      <div id="landing-ctas" style="margin-top: 32px; display: flex; flex-direction: column; align-items: center; gap: 0;">

        <button id="landing-hero-pricing" class="btn-secondary" style="
          height: 48px; padding: 0 36px; border-radius: 12px;
          border: 1px solid #1C1C1C; background: #111111;
          color: #ffffff; font-size: 14px; font-weight: 600;
          font-family: inherit; cursor: pointer; transition: all 0.2s;
          position: relative;
          z-index: 1;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        "
          onmouseover="this.style.background='#1A1A1A'; this.style.borderColor='#2A2A2A';"
          onmouseout="this.style.background='#111111'; this.style.borderColor='#1C1C1C';"
        >Ver plano</button>
      </div>

      <div id="landing-mockup-wrap">
        <div id="landing-mockup-frame">
          <!-- Desktop mockup -->
          <img
            class="mockup-desktop"
            src="/assets/visaogeral.png"
            alt="Visão geral do ControlarMais"
            draggable="false"
          />
          <!-- Mobile mockup -->
          <img
            class="mockup-mobile"
            src="/assets/celular.png"
            alt="App ControlarMais no celular"
            draggable="false"
          />
          <div id="landing-mockup-line"></div>
        </div>
        <div id="landing-mockup-fade"></div>
      </div>
    </section>
  `;
}



function bentoGridHTML(): string {
  return `
    <section id="landing-bento-section">
      <p id="landing-bento-label">Funcionalidades</p>
      <h2 id="landing-bento-heading">Tudo que você precisa,<br/>num só lugar.</h2>

      <div id="landing-bento-grid">

        <!-- A: Dashboard mockup animado -->
        <div class="bento-card bento-card-a">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Dashboard inteligente</p>
            <p class="bento-card-desc" style="margin:0;">Saldo, entradas e saídas em tempo real.</p>
          </div>

          <div class="bento-mockup-perspective">
            <div class="bento-mockup-inner">

              <div style="padding:0;font-family:inherit;display:flex;flex-direction:column;gap:5px;">

                <!-- Linha 1: card principal + 2×2 pequenos -->
                <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:5px;">

                  <!-- Card principal: Saldo Livre Previsto -->
                  <div style="background:#111111;border-radius:10px;border:1px solid #1C1C1C;overflow:hidden;display:flex;flex-direction:column;">
                    <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                      <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Saldo Livre Previsto</span>
                    </div>
                    <div style="padding:7px 10px;flex:1;display:flex;flex-direction:column;justify-content:center;">
                      <div style="display:flex;align-items:baseline;gap:2px;margin-bottom:2px;">
                        <span style="font-size:7px;font-weight:500;color:rgba(255,255,255,0.35);">R$</span>
                        <span style="font-size:15px;font-weight:700;color:#ffffff;line-height:1;letter-spacing:-0.02em;">4.820</span>
                        <span style="font-size:9px;font-weight:500;color:rgba(255,255,255,0.35);">,00</span>
                      </div>
                      <div style="font-size:6.5px;color:rgba(255,255,255,0.22);">Previsão de saldo livre este mês</div>
                    </div>
                  </div>

                  <!-- 2×2 cards pequenos -->
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">

                    <div style="background:#111111;border-radius:8px;border:1px solid #1C1C1C;overflow:hidden;">
                      <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                        <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Valor Hora</span>
                      </div>
                      <div style="padding:7px 8px;display:flex;align-items:baseline;gap:2px;">
                        <span style="font-size:7px;color:rgba(255,255,255,0.35);">R$</span>
                        <span style="font-size:12px;font-weight:700;color:#fff;letter-spacing:-0.01em;">28,50</span>
                      </div>
                    </div>

                    <div style="background:#111111;border-radius:8px;border:1px solid #1C1C1C;overflow:hidden;">
                      <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                        <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Próx. Pgto</span>
                      </div>
                      <div style="padding:7px 8px;">
                        <div style="font-size:12px;font-weight:700;color:#fff;line-height:1;letter-spacing:-0.01em;">25/03</div>
                        <div style="font-size:6px;color:rgba(255,255,255,0.28);margin-top:2px;">em 4 dias</div>
                      </div>
                    </div>

                    <div style="background:#111111;border-radius:8px;border:1px solid #1C1C1C;overflow:hidden;">
                      <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                        <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Sal. Bruto</span>
                      </div>
                      <div style="padding:7px 8px;display:flex;align-items:baseline;gap:2px;">
                        <span style="font-size:7px;color:rgba(255,255,255,0.35);">R$</span>
                        <span style="font-size:12px;font-weight:700;color:#fff;letter-spacing:-0.01em;">8.500</span>
                      </div>
                    </div>

                    <div style="background:#111111;border-radius:8px;border:1px solid #1C1C1C;overflow:hidden;">
                      <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                        <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Desp. Fixas</span>
                      </div>
                      <div style="padding:7px 8px;display:flex;align-items:baseline;gap:2px;">
                        <span style="font-size:7px;color:rgba(255,255,255,0.35);">R$</span>
                        <span style="font-size:12px;font-weight:700;color:#fff;letter-spacing:-0.01em;">2.340</span>
                      </div>
                    </div>

                  </div>
                </div>


              </div>

            </div>

          </div>
        </div>

        <!-- B: Categorias -->
        <div class="bento-card bento-card-b">
          <p class="bento-card-title">Categorias personalizadas</p>
          <p class="bento-card-desc">Organize cada gasto do jeito que faz sentido para você.</p>
          <div>
            <div style="font-size:clamp(52px,8vw,72px);font-weight:700;color:#fff;line-height:1;letter-spacing:-0.04em;">61</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:6px;font-weight:500;">categorias prontas para usar</div>
          </div>
        </div>

        <!-- C: Calendário de gastos -->
        <div class="bento-card bento-card-c">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Calendário de gastos</p>
            <p class="bento-card-desc" style="margin:0;">Navegue pelos seus gastos dia a dia e entenda seus padrões.</p>
          </div>

          <div class="bento-cal-wrap">
            <div class="bento-cal-head">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.38)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
              </svg>
              <span style="font-size:8px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Gastos por dia</span>
            </div>
            <div class="bento-cal-body">
              <div class="bento-cal-month-label">Março 2026</div>
              <div class="bento-cal-cells">

                <div class="bento-day">
                  <span class="bento-day-wd">SEG</span>
                  <span class="bento-day-num">17</span>
                  <div class="bento-day-dots"></div>
                </div>

                <div class="bento-day">
                  <span class="bento-day-wd">TER</span>
                  <span class="bento-day-num">18</span>
                  <div class="bento-day-dots"><div class="bento-dot-e"></div></div>
                </div>

                <div class="bento-day">
                  <span class="bento-day-wd">QUA</span>
                  <span class="bento-day-num">19</span>
                  <div class="bento-day-dots"><div class="bento-dot-i"></div></div>
                </div>

                <div class="bento-day">
                  <span class="bento-day-wd">QUI</span>
                  <span class="bento-day-num">20</span>
                  <div class="bento-day-dots"><div class="bento-dot-i"></div><div class="bento-dot-e"></div></div>
                </div>

                <div class="bento-day bento-today">
                  <span class="bento-day-wd">SEX</span>
                  <span class="bento-day-num">21</span>
                  <div class="bento-day-dots"></div>
                </div>

                <div class="bento-day">
                  <span class="bento-day-wd">SAB</span>
                  <span class="bento-day-num">22</span>
                  <div class="bento-day-dots"><div class="bento-dot-e"></div></div>
                </div>

                <div class="bento-day">
                  <span class="bento-day-wd">DOM</span>
                  <span class="bento-day-num">23</span>
                  <div class="bento-day-dots"></div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- D: Patrimônio -->
        <div class="bento-card bento-card-d">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Controle de patrimônio</p>
            <p class="bento-card-desc" style="margin:0;">Registre imóveis, veículos, investimentos e muito mais.</p>
          </div>

          <div class="bento-pat-grid">

            <!-- Apartamento (Imóvel) -->
            <div class="bento-pat-card">
              <div class="bento-pat-tag-row">
                <span class="bento-pat-dot" style="background:#60a5fa;"></span>
                <span class="bento-pat-tag" style="color:#60a5fa;">Imóvel</span>
              </div>
              <div class="bento-pat-name">Apartamento</div>
              <div class="bento-pat-sub">Casa · Centro</div>
              <hr class="bento-pat-divider"/>
              <div class="bento-pat-label">Valor de Mercado</div>
              <div class="bento-pat-value">
                <span class="bento-pat-curr">R$</span>
                <span class="bento-pat-num">480.000</span>
                <span class="bento-pat-dec">,00</span>
              </div>
            </div>

            <!-- Fundo DI (Caixinha) -->
            <div class="bento-pat-card">
              <div class="bento-pat-tag-row">
                <span class="bento-pat-dot" style="background:#60a5fa;"></span>
                <span class="bento-pat-tag" style="color:#60a5fa;">Caixinha</span>
              </div>
              <div class="bento-pat-name">Fundo DI</div>
              <div class="bento-pat-sub">Meta: R$ 100.000,00</div>
              <hr class="bento-pat-divider"/>
              <div class="bento-pat-label">Economia Atual</div>
              <div class="bento-pat-value">
                <span class="bento-pat-curr">R$</span>
                <span class="bento-pat-num">52.000</span>
                <span class="bento-pat-dec">,00</span>
              </div>
            </div>

            <!-- Honda Civic (Veículo) -->
            <div class="bento-pat-card">
              <div class="bento-pat-tag-row">
                <span class="bento-pat-dot" style="background:#fbbf24;"></span>
                <span class="bento-pat-tag" style="color:#fbbf24;">Veículo</span>
              </div>
              <div class="bento-pat-name">Honda Civic</div>
              <div class="bento-pat-sub">Veículo · 2022</div>
              <hr class="bento-pat-divider"/>
              <div class="bento-pat-label">Valor FIPE</div>
              <div class="bento-pat-value">
                <span class="bento-pat-curr">R$</span>
                <span class="bento-pat-num">38.000</span>
                <span class="bento-pat-dec">,00</span>
              </div>
            </div>

          </div>
        </div>

        <!-- E: Cartões de crédito -->
        <div class="bento-card bento-card-e">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Cartões de crédito</p>
            <p class="bento-card-desc" style="margin:0;">Acompanhe faturas, limite disponível e vencimentos de todos os seus cartões.</p>
          </div>

          <div class="bento-cc-wrap">

            <!-- d2: mais fundo -->
            <div class="bento-cc-item" style="transform:translateY(36px) scale(0.84);opacity:0.4;z-index:17;">
              <div class="bento-cc-inner"></div>
            </div>

            <!-- d1: meio -->
            <div class="bento-cc-item" style="transform:translateY(18px) scale(0.92);opacity:0.75;z-index:18;">
              <div class="bento-cc-inner"></div>
            </div>

            <!-- d0: ativo -->
            <div class="bento-cc-item" style="z-index:20;">
              <div class="bento-cc-inner">

                <div>
                  <!-- Topo: logo + nome + valor + pill filtro -->
                  <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <!-- Bank logo -->
                      <div style="width:22px;height:22px;border-radius:50%;background:#8B5CF6;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(0,0,0,0.15);">
                        <span style="font-size:8px;font-weight:700;color:#fff;">N</span>
                      </div>
                      <div>
                        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.05em;line-height:1;margin-bottom:4px;">Nubank</div>
                        <div style="display:flex;align-items:baseline;gap:2px;">
                          <span style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.4);line-height:1;">R$</span>
                          <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.03em;line-height:1;">1.240</span>
                          <span style="font-size:11px;font-weight:500;color:rgba(255,255,255,0.4);">,50</span>
                        </div>
                      </div>
                    </div>
                    <!-- Pill filtro -->
                    <div style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);">
                      <span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;">Atual</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>
                  <!-- Meta: label fatura -->
                  <div style="margin-top:8px;">
                    <span style="font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Fatura atual</span>
                  </div>
                </div>

                <!-- Progress bar + labels -->
                <div>
                  <div style="height:6px;background:rgba(255,255,255,0.04);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:65%;border-radius:99px;background:linear-gradient(90deg,#C96A3A 0%,#E08050 100%);box-shadow:0 0 6px rgba(217,119,87,0.45);"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:8.5px;font-weight:500;color:rgba(255,255,255,0.3);margin-top:4px;">
                    <span>Disponível R$ 6.760,00</span>
                    <span>Limite R$ 8.000,00</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        <!-- F: Tema claro/escuro -->
        <div class="bento-card bento-card-f">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Modo claro e escuro</p>
            <p class="bento-card-desc" style="margin:0;">Escolha o tema que combina com você e mude quando quiser.</p>
          </div>

          <!-- Dropdown mockup: 100% fiel ao UserDropdown -->
          <div style="background:#111111;border:1px solid #1C1C1C;border-radius:18px;overflow:hidden;position:relative;width:100%;">

            <!-- Glow topo -->
            <div style="position:absolute;inset-x:0;top:0;height:1px;background:linear-gradient(90deg,transparent 10%,rgba(217,119,87,0.28) 50%,transparent 90%);pointer-events:none;z-index:1;"></div>

            <div style="display:flex;flex-direction:column;">

              <!-- Default items: p-1.5 = 6px -->
              <div style="padding:6px;">

                <!-- Meu Perfil -->
                <div style="display:flex;align-items:center;gap:12px;padding:6px 12px;border-radius:11px;">
                  <span style="width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:0.7;color:rgba(255,255,255,0.4);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <span style="font-size:13px;font-weight:500;letter-spacing:-0.01em;color:rgba(255,255,255,0.65);">Meu Perfil</span>
                  <span style="margin-left:auto;font-size:11px;color:rgba(255,255,255,0.3);font-weight:500;white-space:nowrap;">João Silva</span>
                </div>

                <!-- Suporte -->
                <div style="display:flex;align-items:center;gap:12px;padding:6px 12px;border-radius:11px;">
                  <span style="width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:0.7;color:rgba(255,255,255,0.4);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </span>
                  <span style="font-size:13px;font-weight:500;letter-spacing:-0.01em;color:rgba(255,255,255,0.65);">Suporte</span>
                </div>

                <!-- ThemeSwitcher: Modo Escuro ON -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 12px;border-radius:11px;">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <span style="width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:0.7;color:rgba(255,255,255,0.4);">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    </span>
                    <span style="font-size:13px;font-weight:500;letter-spacing:-0.01em;color:rgba(255,255,255,0.65);">Modo Escuro</span>
                  </div>
                  <!-- Switch ativo (dark ON): thumb à direita, track laranja -->
                  <div style="width:32px;height:18px;border-radius:999px;background:#D97757;position:relative;flex-shrink:0;display:flex;align-items:center;">
                    <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;left:16px;box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>
                  </div>
                </div>

              </div>

              <!-- Divider: mx-3 h-px -->
              <div style="height:1px;margin:0 12px;background:rgba(255,255,255,0.06);"></div>

              <!-- Danger: Sair da conta -->
              <div style="padding:6px;">
                <div style="display:flex;align-items:center;gap:12px;padding:6px 12px;border-radius:11px;">
                  <span style="width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#f87171;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </span>
                  <span style="font-size:13px;font-weight:500;letter-spacing:-0.01em;color:#f87171;">Sair da conta</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  `;
}

function pricingHTML(): string {
  const visibleFeatures = [
    'Dashboard financeiro inteligente',
    'Controle de cartões de crédito',
    'Controle de patrimônio',
    'Calendário de gastos',
    'Conexões Open Finance',
    'Lembretes de pagamentos',
    'App Mobile (iOS e Android) em breve',
  ];

  const hiddenFeatures = [
    'Controle de transações',
    'Sincronização em tempo real',
  ];


  const featureItem = (f: string) => `
    <div class="pricing-feature">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="pricing-feature-dot"></div>
        <span class="pricing-feature-text">${f}</span>
      </div>
    </div>
  `;

  return `
    <section id="landing-pricing-section">
      <p id="landing-pricing-label">Plano</p>
      <h2 id="landing-pricing-heading">PROMOÇÃO DE LANÇAMENTO</h2>

      <div style="display:flex; flex-direction:column; align-items:center; gap:14px; margin: 0 0 32px 0; max-width: 400px; margin-left: auto; margin-right: auto;">
        <div style="display:flex; align-items:center; gap:10px;">
          <!-- Apple logo -->
          <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.55)"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          <!-- Google Play logo -->
          <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.55)"><path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/></svg>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.45); margin: 0; font-weight: 400; text-align: center;">
          Nosso app está prestes a chegar na Google Play Store e App Store, por isso estamos dando <strong style="color:#fff;">50% OFF</strong> para quem garantir antes do lançamento.
        </p>
      </div>

      <div id="pricing-timer-wrap">
        <p id="pricing-timer-tag"><span></span>A oferta de lançamento termina em:</p>
        <div id="pricing-timer">
          <div class="pricing-timer-block">
            <span class="pricing-timer-num" id="pricing-timer-days">10</span>
            <span class="pricing-timer-unit">dias</span>
          </div>
          <span class="pricing-timer-sep">:</span>
          <div class="pricing-timer-block">
            <span class="pricing-timer-num" id="pricing-timer-hours">00</span>
            <span class="pricing-timer-unit">horas</span>
          </div>
          <span class="pricing-timer-sep">:</span>
          <div class="pricing-timer-block">
            <span class="pricing-timer-num" id="pricing-timer-mins">00</span>
            <span class="pricing-timer-unit">min</span>
          </div>
          <span class="pricing-timer-sep">:</span>
          <div class="pricing-timer-block">
            <span class="pricing-timer-num" id="pricing-timer-secs">00</span>
            <span class="pricing-timer-unit">seg</span>
          </div>
        </div>
      </div>

      <div id="pricing-card-banner">
        <lottie-player
          src="/assets/lottie/confetti.json"
          background="transparent"
          speed="1"
          style="width:20px;height:20px;"
          autoplay
          loop
        ></lottie-player>
        <span class="pricing-banner-text">
          Cupom de desconto <strong>LANCAMENTO50</strong> ativado com sucesso!
        </span>
        <lottie-player
          src="/assets/lottie/confetti.json"
          background="transparent"
          speed="1"
          style="width:20px;height:20px;transform:scaleX(-1);"
          autoplay
          loop
        ></lottie-player>
      </div>

      <div id="landing-pricing-card" style="border-top: none; border-top-left-radius: 0; border-top-right-radius: 0;">

        <div id="landing-pricing-card-top">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <p class="pricing-plan-name" style="margin:0;">Pro</p>
          </div>
          <div id="landing-pricing-price" style="display:flex; flex-direction:column; gap:2px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
               <span style="
                font-size: 14px;
                color: rgba(255,255,255,0.4);
                text-decoration: line-through;
                text-decoration-color: rgba(255,255,255,0.4);
              ">De R$ 35,90</span>
            </div>
            <div style="display:flex; align-items:baseline; gap:4px;">
              <span class="pricing-curr" style="font-size:20px; font-weight:600; color:rgba(255,255,255,0.6);">R$</span>
              <span class="pricing-amount" style="font-size:56px; font-weight:800; color:#fff; letter-spacing:-0.04em; line-height:1;">17</span>
              <span class="pricing-dec" style="font-size:24px; font-weight:700; color:#fff;">,95</span>
              <span class="pricing-period" style="font-size:14px; color:rgba(255,255,255,0.4); margin-left:4px;">/mês</span>
            </div>
          </div>
        </div>

        <div id="landing-pricing-features">
          <div id="pricing-visible-features" style="display:flex; flex-direction:column; gap:14px;">
            ${[...visibleFeatures, ...hiddenFeatures].map(featureItem).join('')}
          </div>
        </div>

        <div id="landing-pricing-cta">
          <button id="landing-pricing-signup-btn">Começar agora</button>
        </div>

      </div>


    </section>
  `;
}

function testimonialsHTML(): string {
  const testimonials = [
    {
      name: "Mariana Costa",
      role: "Empreendedora",
      image: "https://randomuser.me/api/portraits/women/47.jpg",
      text: "O Controlar+ mudou completamente como vejo o meu negócio. Finalmente parei de usar planilhas complexas e agora tenho tudo na palma da mão."
    },
    {
      name: "Rafael Lima",
      role: "Desenvolvedor",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
      text: "Design absurdo e muito rápido. A funcionalidade de controle de patrimônio me ajudou a organizar meus investimentos de forma clara."
    },
    {
      name: "Juliana Mendes",
      role: "Designer Autônoma",
      image: "https://randomuser.me/api/portraits/women/32.jpg",
      text: "Simplesmente incrível! A interface no modo escuro é um show à parte. Nunca foi tão fácil acompanhar minhas faturas e categorias."
    },
    {
      name: "Carlos Eduardo",
      role: "Médico",
      image: "https://randomuser.me/api/portraits/men/46.jpg",
      text: "Testei vários apps, mas a clareza deste dashboard não tem igual. Consigo prever meu saldo do mês em dois cliques."
    },
    {
      name: "Fernanda Silva",
      role: "Estudante",
      image: "https://randomuser.me/api/portraits/women/44.jpg",
      text: "Adorei a facilidade de uso. Controlar meus gastos semanais se tornou um hábito natural depois que comecei a usar."
    }
  ];

  const renderCard = (t: any) => `
    <div class="testimonial-card">
      <div class="testimonial-user">
        <img src="${t.image}" alt="${t.name}" class="testimonial-avatar" loading="lazy" />
        <div class="testimonial-info">
          <span class="testimonial-name">${t.name}</span>
          <span class="testimonial-role">${t.role}</span>
        </div>
      </div>
      <p class="testimonial-text">"${t.text}"</p>
    </div>
  `;

  // Duplicar a lista para o scroll infinito (vertical marquee)
  const allCards = [...testimonials, ...testimonials];

  return `
    <section id="landing-testimonials-section">
      <p id="landing-testimonials-label">Depoimentos</p>
      <h2 id="landing-testimonials-heading">Amado por quem usa</h2>

      <div id="landing-testimonials-wrapper">
        <div id="landing-testimonials-track">
          ${allCards.map(renderCard).join('')}
        </div>
      </div>
    </section>
  `;
}

function footerHTML(): string {
  const currentYear = new Date().getFullYear();
  return `
    <footer id="landing-footer">
      <a href="#" id="landing-footer-logo" aria-label="Voltar ao topo">
        <img src="/assets/logo/logo.png" alt="Controlar Mais" loading="lazy" />
      </a>
      <p id="landing-footer-text">© ${currentYear} Controlar+. Todos os direitos reservados.</p>
    </footer>
  `;
}

function faqHTML(): string {
  const faqs = [
    {
      q: "Como o Controlar+ garante a segurança dos meus dados?",
      a: "Utilizamos criptografia de ponta a ponta e padrões de segurança bancária para proteger suas informações. Seus dados são somente seus e nunca são compartilhados com terceiros."
    },
    {
      q: "Posso conectar contas de qualquer banco?",
      a: "Atualmente suportamos a maioria dos grandes bancos nacionais e diversas instituições financeiras através do Open Finance. A lista é atualizada constantemente."
    },
    {
      q: "Existe versão do aplicativo para celular?",
      a: "Sim, nosso aplicativo completo para dispositivos iOS e Android já está em desenvolvimento e entrará em fase beta em breve. Você terá todo controle na palma da sua mão."
    },
    {
      q: "Posso cancelar minha assinatura quando quiser?",
      a: "Com certeza. Não possuímos fidelidade ou taxas ocultas. Você pode cancelar sua assinatura a qualquer momento e continuar usando o plano até o fim do ciclo vigente."
    }
  ];

  return `
    <section id="landing-faq-section">
      <p id="landing-faq-label">Dúvidas Frequentes</p>
      <h2 id="landing-faq-heading">Perguntas comuns</h2>
      <div id="landing-faq-list">
        ${faqs.map((faq) => `
          <div class="faq-item">
            <button class="faq-question">
              ${faq.q}
              <span class="faq-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </button>
            <div class="faq-answer-wrapper">
              <div class="faq-answer">${faq.a}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function setupFAQ() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-question');
    const wrapper = item.querySelector('.faq-answer-wrapper') as HTMLElement;
    if (!btn || !wrapper) return;

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Fecha todos os outros
      items.forEach(otherItem => {
        otherItem.classList.remove('active');
        const otherWrapper = otherItem.querySelector('.faq-answer-wrapper') as HTMLElement;
        if (otherWrapper) otherWrapper.style.maxHeight = '0px';
      });

      // Se não estava ativo, abre
      if (!isActive) {
        item.classList.add('active');
        wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
      }
    });
  });
}

function setupPricingTimer() {
  const STORAGE_KEY = 'controlarmais-pricing-timer-end-v2';
  let endTime = localStorage.getItem(STORAGE_KEY);

  if (!endTime) {
    // Definimos 10 dias a partir do primeiro acesso para criar urgência
    const target = Date.now() + (10 * 24 * 60 * 60 * 1000) - (15 * 60 * 1000); // 10 dias menos 15 min para não ver o 10 cravado
    localStorage.setItem(STORAGE_KEY, String(target));
    endTime = String(target);
  }

  const target = parseInt(endTime, 10);

  function tick() {
    const daysEl = document.getElementById('pricing-timer-days');
    const hoursEl = document.getElementById('pricing-timer-hours');
    const minsEl = document.getElementById('pricing-timer-mins');
    const secsEl = document.getElementById('pricing-timer-secs');

    if (!daysEl || !hoursEl || !minsEl || !secsEl) return false;

    const remaining = target - Date.now();

    if (remaining <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      return false;
    }

    const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

    const days = Math.floor(remaining / 864e5);
    const hours = Math.floor((remaining % 864e5) / 36e5);
    const mins = Math.floor((remaining % 36e5) / 6e4);
    const secs = Math.floor((remaining % 6e4) / 1e3);

    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minsEl.textContent = pad(mins);
    secsEl.textContent = pad(secs);

    return true;
  }

  // Primeira execução
  tick();

  // O intervalo agora busca os elementos a cada segundo para garantir que 
  // funcione mesmo que o HTML seja reinjetado ou algo mude.
  const timerId = setInterval(() => {
    const isRunning = tick();
    // Se os elementos sumiram do DOM, paramos o intervalo para evitar erros
    if (!isRunning && !document.getElementById('pricing-timer-days')) {
      clearInterval(timerId);
    }
  }, 1000);
}


function animateTextFlip() {
  const words = ["organizar rotinas", "potencializar lucros", "alcançar liberdade", "realizar sonhos"];
  const container = document.getElementById('landing-text-flip-container');
  const textWrapper = document.getElementById('landing-text-flip-wrapper');
  if (!container || !textWrapper) return;

  let currentIndex = 0;

  // Render inicial sem animação
  textWrapper.textContent = words[0];

  const intervalId = setInterval(() => {
    if (!document.body.contains(container)) {
      clearInterval(intervalId);
      return;
    }
    const nextIndex = (currentIndex + 1) % words.length;

    animateDynamicIslandTransition({
      containerId: 'landing-text-flip-container',
      contentWrapperId: 'landing-text-flip-wrapper',
      direction: 'next',
      onMidpoint: () => {
        currentIndex = nextIndex;
        textWrapper.textContent = words[currentIndex];
      },
    });
  }, 3000);
}

function animateHero() {
  const tl = gsap.timeline({ delay: 0.2, onComplete: animateTextFlip });

  tl.fromTo('#landing-headline',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
  );
  tl.fromTo('#landing-ctas',
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    '-=0.3'
  );
  tl.fromTo('#landing-mockup-wrap',
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' },
    '-=0.2'
  );
}

// Scroll: mockup vai de deitado (rotateX 18°) para em pé (0°)

function setupMockupScroll() {
  const frame = document.getElementById('landing-mockup-frame');
  if (!frame) return;

  const MAX_SCROLL = 500; // px até endireitar completamente

  function onScroll() {
    if (!frame) return;
    const progress = Math.min(window.scrollY / MAX_SCROLL, 1);
    const rotateX = 18 * (1 - progress);
    frame.style.transform = `rotateX(${rotateX}deg)`;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

export function cleanupLanding() {
  document.getElementById(BRILHO_ID)?.remove();
  document.getElementById('landing-styles')?.remove();
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
      ${heroHTML()}
      ${bentoGridHTML()}
      ${pricingHTML()}
      ${testimonialsHTML()}
      ${faqHTML()}
      ${footerHTML()}
    </div>
  `;

  attachTopbarLandingListeners();
  animateHero();
  setupMockupScroll();
  document.getElementById('landing-hero-pricing')?.addEventListener('click', () => {
    const section = document.getElementById('landing-pricing-section');
    if (!section) return;
    const offset = window.innerWidth < 820 ? 70 : 85;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
  document.getElementById('landing-pricing-signup-btn')?.addEventListener('click', () => {
    // Save the launch promotion code so it's automatically applied at Stripe checkout
    sessionStorage.setItem('landingPromotionCode', 'LANCAMENTO50');
    authManager.showSignup();
  });

  // Entrada elástica do card de plano — mesmo feel do MonthSelector

  gsap.fromTo('#landing-pricing-card',
    { scaleX: 0.88, scaleY: 1.06, opacity: 0 },
    { scaleX: 1, scaleY: 1, opacity: 1, duration: 0.85, ease: 'elastic.out(1.2, 0.4)', clearProps: 'transform', delay: 0.4 }
  );

  setupPricingTimer();
  setupFAQ();
}
