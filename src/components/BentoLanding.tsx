import gsap from 'gsap';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import NumberFlow from '@number-flow/react';

let bentoAnimationCleanupFns: Array<() => void> = [];
let bentoTimelines: gsap.core.Animation[] = [];

type MayDay = {
  week: string;
  day: number;
  kind?: 'income' | 'expense' | 'both';
};

const MAY_DAYS: MayDay[] = [
  { week: 'SEX', day: 1 },
  { week: 'SAB', day: 2 },
  { week: 'DOM', day: 3, kind: 'expense' },
  { week: 'SEG', day: 4 },
  { week: 'TER', day: 5, kind: 'income' },
  { week: 'QUA', day: 6 },
  { week: 'QUI', day: 7 },
  { week: 'SEX', day: 8 },
  { week: 'SAB', day: 9, kind: 'expense' },
  { week: 'DOM', day: 10, kind: 'both' },
  { week: 'SEG', day: 11 },
  { week: 'TER', day: 12, kind: 'income' },
  { week: 'QUA', day: 13 },
  { week: 'QUI', day: 14 },
  { week: 'SEX', day: 15, kind: 'expense' },
  { week: 'SAB', day: 16 },
  { week: 'DOM', day: 17 },
  { week: 'SEG', day: 18 },
  { week: 'TER', day: 19, kind: 'income' },
  { week: 'QUA', day: 20 },
  { week: 'QUI', day: 21, kind: 'both' },
  { week: 'SEX', day: 22, kind: 'expense' },
  { week: 'SAB', day: 23 },
  { week: 'DOM', day: 24 },
  { week: 'SEG', day: 25 },
  { week: 'TER', day: 26 },
  { week: 'QUA', day: 27, kind: 'income' },
  { week: 'QUI', day: 28 },
  { week: 'SEX', day: 29, kind: 'expense' },
  { week: 'SAB', day: 30 },
  { week: 'DOM', day: 31 },
];

const CREDIT_CARDS = [
  {
    id: 'inter',
    name: 'Inter',
    initial: 'I',
    amount: '860',
    cents: ',20',
    status: 'Aberta',
    available: 'R$ 3.140,00',
    limit: 'R$ 4.000,00',
    progress: 38,
    bg: '#111827',
    hasChevron: false,
  },
  {
    id: 'c6',
    name: 'C6 Bank',
    initial: 'C6',
    amount: '2.180',
    cents: ',75',
    status: 'Atual',
    available: 'R$ 820,00',
    limit: 'R$ 3.000,00',
    progress: 72,
    bg: '#1f2937',
    hasChevron: false,
  },
  {
    id: 'nubank',
    name: 'Nubank',
    initial: 'N',
    amount: '1.240',
    cents: ',50',
    status: 'Atual',
    available: 'R$ 6.760,00',
    limit: 'R$ 8.000,00',
    progress: 65,
    bg: '#8B5CF6',
    hasChevron: true,
  },
];

function renderMayDay(day: MayDay) {
  const dots = day.kind === 'both'
    ? '<div class="bento-dot-i"></div><div class="bento-dot-e"></div>'
    : day.kind === 'income'
      ? '<div class="bento-dot-i"></div>'
      : day.kind === 'expense'
        ? '<div class="bento-dot-e"></div>'
        : '';

  return `
    <div class="bento-day" data-day="${day.day}">
      <span class="bento-day-wd">${day.week}</span>
      <span class="bento-day-num">${day.day}</span>
      <div class="bento-day-dots">${dots}</div>
    </div>
  `;
}

function renderMayCalendarCarousel() {
  return [...MAY_DAYS, ...MAY_DAYS].map(renderMayDay).join('');
}

function renderCreditCards() {
  return CREDIT_CARDS.map((card) => `
    <div class="bento-cc-item" data-card="${card.id}">
      <div class="bento-cc-inner">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:22px;height:22px;border-radius:50%;background:${card.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(255,255,255,0.08);">
                <span style="font-size:8px;font-weight:700;color:#fff;">${card.initial}</span>
              </div>

              <div>
                <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.05em;line-height:1;margin-bottom:4px;">${card.name}</div>
                <div style="display:flex;align-items:baseline;gap:2px;">
                  <span style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.4);line-height:1;">R$</span>
                  <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.03em;line-height:1;">${card.amount}</span>
                  <span style="font-size:11px;font-weight:500;color:rgba(255,255,255,0.4);">${card.cents}</span>
                </div>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);">
              <span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;">${card.status}</span>
              ${card.hasChevron
      ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
      : ''
    }
            </div>
          </div>

          <div style="margin-top:8px;">
            <span style="font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Fatura atual</span>
          </div>
        </div>

        <div>
          <div style="height:6px;background:rgba(255,255,255,0.04);border-radius:99px;overflow:hidden;">
            <div class="bento-limit-fill" style="height:100%;width:${card.progress}%;border-radius:99px;background:linear-gradient(90deg,#C96A3A 0%,#E08050 100%);box-shadow:0 0 6px rgba(217,119,87,0.45);"></div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:8.5px;font-weight:500;color:rgba(255,255,255,0.3);margin-top:4px;">
            <span>Disponível ${card.available}</span>
            <span>Limite ${card.limit}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

export function BentoLanding(): string {
  return `
    <style>
      #landing-bento-section {
        perspective: 1400px;
      }

      #landing-bento-grid {
        transform-style: preserve-3d;
      }

      .bento-card {
        transform-origin: 50% 50%;
        will-change: transform, opacity, filter, border-radius;
      }

      .bento-card-title,
      .bento-card-desc {
        will-change: transform, opacity, filter;
      }

      .bento-mockup-inner,
      .bento-cal-wrap,
      .bento-pat-card,
      .bento-cc-item,
      .bento-cc-inner,
      .bento-card-f > div:nth-of-type(2) {
        transform-origin: 50% 50%;
        will-change: transform, opacity, filter, border-radius;
      }

      .bento-card-a .bento-metric-card {
        transform-origin: 50% 50%;
        will-change: transform, opacity, border-radius;
      }

      .bento-card-c .bento-cal-body {
        overflow: hidden;
        position: relative;
      }

      .bento-card-c .bento-cal-cells {
        display: flex !important;
        grid-template-columns: none !important;
        align-items: center;
        gap: 7px;
        width: max-content;
        padding: 8px 0;
        transform-origin: center center;
        will-change: transform;
      }

      .bento-card-c .bento-day {
        flex: 0 0 44px;
        min-width: 44px;
        transform-origin: 50% 55%;
        will-change: transform, opacity, filter, border-radius;
      }

      .bento-card-c .bento-day-wd,
      .bento-card-c .bento-day-num,
      .bento-card-c .bento-day-dots {
        will-change: transform, opacity, filter;
      }

      .bento-day,
      .bento-dot-i,
      .bento-dot-e,
      .bento-pat-value,
      .bento-pat-tag-row,
      .bento-pat-name,
      .bento-pat-sub,
      .bento-pat-divider,
      .bento-pat-label {
        will-change: transform, opacity, filter;
      }

      .bento-pat-card {
        position: relative;
        overflow: hidden;
      }

      .bento-pat-card::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        opacity: 0;
        background: radial-gradient(
          circle at 50% 0%,
          rgba(255, 255, 255, 0.055),
          transparent 58%
        );
        transition: opacity 0.55s ease;
        will-change: opacity, transform;
      }

      .bento-pat-card.is-pat-active::after {
        opacity: 1;
      }

      .bento-card-e .bento-cc-wrap {
        perspective: 1100px;
        transform-style: preserve-3d;
      }

      .bento-card-e .bento-cc-item {
        transform-origin: 50% 80%;
        will-change: transform, opacity, filter, z-index;
      }

      .bento-card-e .bento-cc-inner {
        transform-origin: 50% 50%;
        will-change: transform, opacity, filter, border-radius;
      }

      .bento-card-e .bento-limit-fill {
        transform-origin: left center;
        will-change: transform, filter;
      }

      .bento-card-f .bento-theme-row,
      .bento-card-f .bento-theme-switch,
      .bento-card-f .bento-theme-knob {
        will-change: transform, opacity, filter;
      }

      @media (max-width: 768px) {
        .bento-card-c .bento-cal-cells {
          gap: 6px;
        }

        .bento-card-c .bento-day {
          flex-basis: 38px;
          min-width: 38px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .bento-card,
        .bento-card *,
        .bento-mockup-inner,
        .bento-cal-wrap,
        .bento-pat-card,
        .bento-cc-item,
        .bento-cc-inner {
          transform: none !important;
          filter: none !important;
          animation: none !important;
        }
      }
    </style>

    <section id="landing-bento-section">
      <p id="landing-bento-label">Funcionalidades</p>
      <h2 id="landing-bento-heading">Tudo para seu controle financeiro e patrimônio,<br/>num só lugar.</h2>

      <div id="landing-bento-grid">

        <div class="bento-card bento-card-a">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Dashboard inteligente</p>
            <p class="bento-card-desc" style="margin:0;">Saldo, entradas e saídas em tempo real.</p>
          </div>

          <div class="bento-mockup-perspective">
            <div class="bento-mockup-inner">
              <div style="padding:0;font-family:inherit;display:flex;flex-direction:column;gap:5px;">
                <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:5px;">

                  <div class="bento-metric-card bento-metric-main" style="background:#111111;border-radius:10px;border:1px solid #1C1C1C;overflow:hidden;display:flex;flex-direction:column;">
                    <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                      <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Saldo Livre Previsto</span>
                    </div>

                    <div style="padding:7px 10px;flex:1;display:flex;flex-direction:column;justify-content:center;">
                      <div style="display:flex;align-items:baseline;gap:2px;margin-bottom:2px;">
                        <span style="font-size:7px;font-weight:500;color:rgba(255,255,255,0.35);">R$</span>
                        <span id="bento-val-saldo" style="font-size:15px;font-weight:700;color:#ffffff;line-height:1;letter-spacing:-0.02em;">4.820</span>
                        <span style="font-size:9px;font-weight:500;color:rgba(255,255,255,0.35);">,00</span>
                      </div>
                      <div style="font-size:6.5px;color:rgba(255,255,255,0.22);">Previsão de saldo livre este mês</div>
                    </div>
                  </div>

                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
                    <div class="bento-metric-card" style="background:#111111;border-radius:8px;border:1px solid #1C1C1C;overflow:hidden;">
                      <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                        <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Valor Hora</span>
                      </div>
                      <div style="padding:7px 8px;display:flex;align-items:baseline;gap:2px;">
                        <span style="font-size:7px;color:rgba(255,255,255,0.35);">R$</span>
                        <span id="bento-val-hora" style="font-size:12px;font-weight:700;color:#fff;letter-spacing:-0.01em;">28,50</span>
                      </div>
                    </div>

                    <div class="bento-metric-card" style="background:#111111;border-radius:8px;border:1px solid #1C1C1C;overflow:hidden;">
                      <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                        <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Próx. Pgto</span>
                      </div>
                      <div style="padding:7px 8px;">
                        <div style="font-size:12px;font-weight:700;color:#fff;line-height:1;letter-spacing:-0.01em;">25/03</div>
                        <div style="font-size:6px;color:rgba(255,255,255,0.28);margin-top:2px;">em 4 dias</div>
                      </div>
                    </div>

                    <div class="bento-metric-card" style="background:#111111;border-radius:8px;border:1px solid #1C1C1C;overflow:hidden;">
                      <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                        <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Sal. Bruto</span>
                      </div>
                      <div style="padding:7px 8px;display:flex;align-items:baseline;gap:2px;">
                        <span style="font-size:7px;color:rgba(255,255,255,0.35);">R$</span>
                        <span style="font-size:12px;font-weight:700;color:#fff;letter-spacing:-0.01em;">8.500</span>
                      </div>
                    </div>

                    <div class="bento-metric-card" style="background:#111111;border-radius:8px;border:1px solid #1C1C1C;overflow:hidden;">
                      <div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);background:#141414;">
                        <span style="font-size:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.28);">Desp. Fixas</span>
                      </div>
                      <div style="padding:7px 8px;display:flex;align-items:baseline;gap:2px;">
                        <span style="font-size:7px;color:rgba(255,255,255,0.35);">R$</span>
                        <span id="bento-val-fixas" style="font-size:12px;font-weight:700;color:#fff;letter-spacing:-0.01em;">2.340</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bento-card bento-card-b">
          <p class="bento-card-title">Categorias personalizadas</p>
          <p class="bento-card-desc">Organize cada gasto do jeito que faz sentido para você.</p>
          <div class="bento-category-visual">
            <div id="bento-val-categorias" style="font-size:clamp(52px,8vw,72px);font-weight:700;color:#fff;line-height:1;letter-spacing:-0.04em;">0</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:6px;font-weight:500;">categorias prontas para usar</div>
          </div>
        </div>

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
              <div class="bento-cal-month-label">Maio 2026</div>
              <div class="bento-cal-cells">
                ${renderMayCalendarCarousel()}
              </div>
            </div>
          </div>
        </div>

        <div class="bento-card bento-card-d">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Controle de patrimônio</p>
            <p class="bento-card-desc" style="margin:0;">Registre imóveis, veículos, investimentos e muito mais.</p>
          </div>

          <div class="bento-pat-grid">
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

        <div class="bento-card bento-card-e">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Cartões de crédito</p>
            <p class="bento-card-desc" style="margin:0;">Acompanhe faturas, limite disponível e vencimentos de todos os seus cartões.</p>
          </div>

          <div class="bento-cc-wrap">
            ${renderCreditCards()}
          </div>
        </div>

        <div class="bento-card bento-card-f">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <p class="bento-card-title" style="margin:0;">Modo claro e escuro</p>
            <p class="bento-card-desc" style="margin:0;">Escolha o tema que combina com você e mude quando quiser.</p>
          </div>

          <div style="background:#111111;border:1px solid #1C1C1C;border-radius:18px;overflow:hidden;position:relative;width:100%;">
            <div style="position:absolute;inset-x:0;top:0;height:1px;background:linear-gradient(90deg,transparent 10%,rgba(217,119,87,0.28) 50%,transparent 90%);pointer-events:none;z-index:1;"></div>

            <div style="display:flex;flex-direction:column;">
              <div style="padding:6px;">
                <div class="bento-theme-row" style="display:flex;align-items:center;gap:12px;padding:6px 12px;border-radius:11px;">
                  <span style="width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:0.7;color:rgba(255,255,255,0.4);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <span style="font-size:13px;font-weight:500;letter-spacing:-0.01em;color:rgba(255,255,255,0.65);">Meu Perfil</span>
                  <span style="margin-left:auto;font-size:11px;color:rgba(255,255,255,0.3);font-weight:500;white-space:nowrap;">João Silva</span>
                </div>

                <div class="bento-theme-row" style="display:flex;align-items:center;gap:12px;padding:6px 12px;border-radius:11px;">
                  <span style="width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:0.7;color:rgba(255,255,255,0.4);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </span>
                  <span style="font-size:13px;font-weight:500;letter-spacing:-0.01em;color:rgba(255,255,255,0.65);">Suporte</span>
                </div>

                <div class="bento-theme-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 12px;border-radius:11px;">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <span style="width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:0.7;color:rgba(255,255,255,0.4);">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    </span>
                    <span style="font-size:13px;font-weight:500;letter-spacing:-0.01em;color:rgba(255,255,255,0.65);">Modo Escuro</span>
                  </div>
                  <div class="bento-theme-switch" style="width:32px;height:18px;border-radius:999px;background:#D97757;position:relative;flex-shrink:0;display:flex;align-items:center;">
                    <div class="bento-theme-knob" style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;left:16px;box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>
                  </div>
                </div>
              </div>

              <div style="height:1px;margin:0 12px;background:rgba(255,255,255,0.06);"></div>

              <div style="padding:6px;">
                <div class="bento-theme-row" style="display:flex;align-items:center;gap:12px;padding:6px 12px;border-radius:11px;">
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

let saldoRoot: Root | null = null;
let horaRoot: Root | null = null;
let fixasRoot: Root | null = null;
let categoriasRoot: Root | null = null;

function NumberFlowWrapper({
  values,
  isDecimal,
  delay,
}: {
  values: number[];
  isDecimal?: boolean;
  delay?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let timeout: number;

    const update = () => {
      setCurrentIndex(prev => (prev + 1) % values.length);
      timeout = window.setTimeout(update, 3500);
    };

    timeout = window.setTimeout(update, delay || 2000);

    return () => clearTimeout(timeout);
  }, [values.length, delay]);

  return (
    <NumberFlow
      value={values[currentIndex]}
      locales="pt-BR"
      format={isDecimal ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { useGrouping: true }}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    />
  );
}

function NumberFlowOnce({
  from,
  to,
  delay = 350,
}: {
  from: number;
  to: number;
  delay?: number;
}) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setValue(to);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [to, delay]);

  return (
    <NumberFlow
      value={value}
      locales="pt-BR"
      format={{ useGrouping: true }}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    />
  );
}

function addBentoTimeline<T extends gsap.core.Animation>(tl: T) {
  bentoTimelines.push(tl);
  return tl;
}

function setupBentoEntranceMotion() {
  const section = document.getElementById('landing-bento-section');
  const cards = gsap.utils.toArray<HTMLElement>('.bento-card');
  const heading = gsap.utils.toArray<HTMLElement>('#landing-bento-label, #landing-bento-heading');

  if (!section || cards.length === 0) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    gsap.set([...heading, ...cards], {
      opacity: 1,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'none',
    });
    return;
  }

  gsap.set(heading, {
    opacity: 0,
    y: 18,
    filter: 'blur(8px)',
  });

  gsap.set(cards, {
    opacity: 0,
    y: 42,
    scaleX: 0.92,
    scaleY: 1.06,
    filter: 'blur(14px)',
    borderRadius: 28,
  });

  const entrance = gsap.timeline({ paused: true });

  entrance.to(heading, {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    duration: 0.62,
    ease: 'power3.out',
    stagger: 0.08,
  });

  entrance.to(cards, {
    opacity: 1,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    filter: 'blur(0px)',
    borderRadius: 20,
    duration: 0.95,
    ease: 'elastic.out(0.9, 0.52)',
    stagger: {
      each: 0.07,
      from: 'start',
    },
    clearProps: 'filter',
  }, '-=0.28');

  const observer = new IntersectionObserver((entries) => {
    if (!entries[0]?.isIntersecting) return;
    entrance.play(0);
    observer.disconnect();
  }, {
    threshold: 0.22,
    rootMargin: '0px 0px -8% 0px',
  });

  observer.observe(section);

  bentoAnimationCleanupFns.push(() => {
    observer.disconnect();
    entrance.kill();
  });
}

function setupBentoCardHoverMorph() {
  const cards = gsap.utils.toArray<HTMLElement>('.bento-card');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) return;

  cards.forEach((card) => {
    const onEnter = () => {
      gsap.killTweensOf(card);

      gsap.to(card, {
        y: -5,
        scaleX: 1.012,
        scaleY: 0.992,
        borderRadius: 24,
        duration: 0.46,
        ease: 'elastic.out(0.9, 0.46)',
      });
    };

    const onLeave = () => {
      gsap.killTweensOf(card);

      gsap.to(card, {
        y: 0,
        scaleX: 1,
        scaleY: 1,
        borderRadius: 20,
        duration: 0.72,
        ease: 'elastic.out(0.82, 0.52)',
      });
    };

    const onPointerDown = () => {
      gsap.to(card, {
        scaleX: 0.99,
        scaleY: 1.012,
        duration: 0.14,
        ease: 'power3.out',
      });
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('pointerdown', onPointerDown);
    card.addEventListener('pointerup', onEnter);
    card.addEventListener('pointercancel', onLeave);

    bentoAnimationCleanupFns.push(() => {
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mouseleave', onLeave);
      card.removeEventListener('pointerdown', onPointerDown);
      card.removeEventListener('pointerup', onEnter);
      card.removeEventListener('pointercancel', onLeave);
    });
  });
}

function setupDashboardCardAnimation() {
  const mockup = document.querySelector<HTMLElement>('.bento-card-a .bento-mockup-inner');
  const metricCards = gsap.utils.toArray<HTMLElement>('.bento-card-a .bento-metric-card');

  if (!mockup || metricCards.length === 0) return;

  metricCards.forEach((metric, index) => {
    const tl = gsap.timeline({
      repeat: -1,
      yoyo: true,
      delay: index * 0.18,
    });

    tl.to(metric, {
      scaleX: index === 0 ? 1.012 : 1.018,
      scaleY: index === 0 ? 0.994 : 0.988,
      borderRadius: index === 0 ? 14 : 12,
      opacity: index === 0 ? 1 : 0.94,
      duration: 2.6 + index * 0.12,
      ease: 'sine.inOut',
    });

    addBentoTimeline(tl);
  });

  addBentoTimeline(
    gsap.timeline({ repeat: -1, yoyo: true })
      .to(mockup, {
        scaleX: 1.006,
        scaleY: 0.996,
        duration: 4.2,
        ease: 'sine.inOut',
      })
  );
}

function setupCategoryCardAnimation() {
  // Sem animação extra.
}

function updateDateCarouselMorph(viewport: HTMLElement, days: HTMLElement[]) {
  const viewportRect = viewport.getBoundingClientRect();
  const centerX = viewportRect.left + viewportRect.width / 2;
  const maxDistance = Math.max(92, viewportRect.width * 0.38);

  let closestDay: HTMLElement | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  days.forEach((day) => {
    const rect = day.getBoundingClientRect();
    const dayCenter = rect.left + rect.width / 2;
    const distance = Math.abs(centerX - dayCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestDay = day;
    }
  });

  days.forEach((day) => {
    const rect = day.getBoundingClientRect();
    const dayCenter = rect.left + rect.width / 2;
    const distance = Math.abs(centerX - dayCenter);
    const progress = Math.max(0, 1 - distance / maxDistance);

    const week = day.querySelector<HTMLElement>('.bento-day-wd');
    const num = day.querySelector<HTMLElement>('.bento-day-num');
    const dots = day.querySelector<HTMLElement>('.bento-day-dots');

    const isClosest = day === closestDay;
    const blur = Math.max(0, 1.15 - progress * 1.15);

    gsap.set(day, {
      opacity: 0.34 + progress * 0.66,
      y: -progress * 5,
      scaleX: 0.92 + progress * 0.16,
      scaleY: 0.98 + progress * 0.08,
      borderRadius: 10 + progress * 8,
      filter: `blur(${blur}px)`,
      zIndex: isClosest ? 12 : Math.round(progress * 10),
      force3D: true,
    });

    if (week) {
      gsap.set(week, {
        opacity: 0.45 + progress * 0.55,
        y: -progress * 1.5,
        force3D: true,
      });
    }

    if (num) {
      gsap.set(num, {
        opacity: 0.58 + progress * 0.42,
        scaleX: 0.98 + progress * 0.06,
        scaleY: 1,
        force3D: true,
      });
    }

    if (dots) {
      gsap.set(dots, {
        opacity: 0.45 + progress * 0.55,
        y: progress * 1.5,
        force3D: true,
      });
    }
  });
}

function setupCalendarCardAnimation() {
  const viewport = document.querySelector<HTMLElement>('.bento-card-c .bento-cal-body');
  const cells = document.querySelector<HTMLElement>('.bento-card-c .bento-cal-cells');
  const days = gsap.utils.toArray<HTMLElement>('.bento-card-c .bento-day');
  const dots = gsap.utils.toArray<HTMLElement>('.bento-card-c .bento-dot-i, .bento-card-c .bento-dot-e');

  if (!viewport || !cells || days.length === 0) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const originalCount = MAY_DAYS.length;

  let loopWidth = 0;

  const measure = () => {
    const first = days[0];
    const secondSetFirst = days[originalCount];

    if (!first || !secondSetFirst) return;

    loopWidth = secondSetFirst.offsetLeft - first.offsetLeft;

    gsap.set(cells, {
      x: 0,
      scaleX: 1,
      scaleY: 1,
      force3D: true,
    });

    updateDateCarouselMorph(viewport, days);
  };

  requestAnimationFrame(measure);

  if (reduceMotion) {
    updateDateCarouselMorph(viewport, days);
    return;
  }

  gsap.set(days, {
    opacity: 0.42,
    scaleX: 0.94,
    scaleY: 1,
    filter: 'blur(1px)',
    transformOrigin: '50% 55%',
  });

  const carouselTween = gsap.to(cells, {
    x: () => -loopWidth,
    duration: 24,
    ease: 'none',
    repeat: -1,
    invalidateOnRefresh: true,
    onUpdate: () => updateDateCarouselMorph(viewport, days),
    onRepeat: () => updateDateCarouselMorph(viewport, days),
  });

  addBentoTimeline(carouselTween);

  const breatheTween = gsap.timeline({
    repeat: -1,
    yoyo: true,
  }).to(cells, {
    scaleX: 1.006,
    scaleY: 0.998,
    duration: 3.2,
    ease: 'sine.inOut',
  });

  addBentoTimeline(breatheTween);

  dots.forEach((dot, index) => {
    addBentoTimeline(
      gsap.timeline({
        repeat: -1,
        yoyo: true,
        delay: index * 0.13,
      }).to(dot, {
        scale: 1.42,
        opacity: 0.46,
        duration: 1.05,
        ease: 'sine.inOut',
      })
    );
  });

  const onEnter = () => {
    carouselTween.timeScale(0.28);
  };

  const onLeave = () => {
    carouselTween.timeScale(1);
  };

  const onResize = () => {
    measure();
    carouselTween.invalidate();
  };

  viewport.addEventListener('mouseenter', onEnter);
  viewport.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', onResize);

  bentoAnimationCleanupFns.push(() => {
    viewport.removeEventListener('mouseenter', onEnter);
    viewport.removeEventListener('mouseleave', onLeave);
    window.removeEventListener('resize', onResize);
  });
}

function setupPatrimonyCardAnimation() {
  const cards = gsap.utils.toArray<HTMLElement>('.bento-pat-card');

  if (cards.length < 3) return;

  let activeIndex = 0;

  const resetCard = (card: HTMLElement) => {
    const tag = card.querySelector<HTMLElement>('.bento-pat-tag-row');
    const name = card.querySelector<HTMLElement>('.bento-pat-name');
    const sub = card.querySelector<HTMLElement>('.bento-pat-sub');
    const label = card.querySelector<HTMLElement>('.bento-pat-label');
    const value = card.querySelector<HTMLElement>('.bento-pat-value');
    const divider = card.querySelector<HTMLElement>('.bento-pat-divider');

    card.classList.remove('is-pat-active');

    gsap.to(card, {
      y: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.72,
      borderRadius: 14,
      filter: 'brightness(0.92)',
      duration: 0.72,
      ease: 'elastic.out(0.82, 0.52)',
    });

    gsap.to([tag, name, sub, label, value, divider], {
      y: 0,
      opacity: 0.68,
      scaleX: 1,
      scaleY: 1,
      filter: 'blur(0px)',
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.015,
    });
  };

  const activateCard = (card: HTMLElement) => {
    const tag = card.querySelector<HTMLElement>('.bento-pat-tag-row');
    const name = card.querySelector<HTMLElement>('.bento-pat-name');
    const sub = card.querySelector<HTMLElement>('.bento-pat-sub');
    const label = card.querySelector<HTMLElement>('.bento-pat-label');
    const value = card.querySelector<HTMLElement>('.bento-pat-value');
    const divider = card.querySelector<HTMLElement>('.bento-pat-divider');

    card.classList.add('is-pat-active');

    gsap.fromTo(
      card,
      {
        scaleX: 0.985,
        scaleY: 1.018,
        y: 2,
      },
      {
        y: -5,
        scaleX: 1.035,
        scaleY: 0.985,
        opacity: 1,
        borderRadius: 20,
        filter: 'brightness(1.08)',
        duration: 0.82,
        ease: 'elastic.out(0.88, 0.5)',
      }
    );

    gsap.fromTo(
      [tag, name, sub, label, value, divider],
      {
        y: 5,
        opacity: 0.42,
        scaleX: 0.985,
        scaleY: 1.01,
        filter: 'blur(4px)',
      },
      {
        y: 0,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        filter: 'blur(0px)',
        duration: 0.52,
        ease: 'power3.out',
        stagger: 0.035,
      }
    );

    if (value) {
      gsap.fromTo(
        value,
        {
          scaleX: 0.96,
          scaleY: 1.08,
        },
        {
          scaleX: 1.04,
          scaleY: 0.985,
          duration: 0.42,
          ease: 'power3.out',
        }
      );

      gsap.to(value, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.72,
        delay: 0.28,
        ease: 'elastic.out(0.82, 0.52)',
      });
    }
  };

  const setActive = (index: number) => {
    cards.forEach((card, cardIndex) => {
      if (cardIndex === index) {
        activateCard(card);
      } else {
        resetCard(card);
      }
    });
  };

  gsap.set(cards, {
    opacity: 0.72,
    filter: 'brightness(0.92)',
    transformOrigin: '50% 50%',
  });

  setActive(activeIndex);

  const tl = gsap.timeline({
    repeat: -1,
    repeatDelay: 0.4,
  });

  tl.to({}, { duration: 1.8 });
  tl.add(() => {
    activeIndex = (activeIndex + 1) % cards.length;
    setActive(activeIndex);
  });

  tl.to({}, { duration: 1.8 });
  tl.add(() => {
    activeIndex = (activeIndex + 1) % cards.length;
    setActive(activeIndex);
  });

  tl.to({}, { duration: 1.8 });
  tl.add(() => {
    activeIndex = (activeIndex + 1) % cards.length;
    setActive(activeIndex);
  });

  addBentoTimeline(tl);
}

function setupCreditCardAnimation() {
  const cards = gsap.utils.toArray<HTMLElement>('.bento-card-e .bento-cc-item');
  const fills = gsap.utils.toArray<HTMLElement>('.bento-card-e .bento-limit-fill');

  if (cards.length < 3) return;

  const frontLayout = {
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    opacity: 1,
    zIndex: 30,
    filter: 'brightness(1)',
  };

  const middleLayout = {
    y: 18,
    scaleX: 0.925,
    scaleY: 0.925,
    rotate: 0.35,
    opacity: 0.72,
    zIndex: 20,
    filter: 'brightness(0.92)',
  };

  const backLayout = {
    y: 36,
    scaleX: 0.84,
    scaleY: 0.84,
    rotate: -0.35,
    opacity: 0.42,
    zIndex: 10,
    filter: 'brightness(0.82)',
  };

  const applyStaticLayout = () => {
    gsap.set(cards[2], frontLayout);
    gsap.set(cards[1], middleLayout);
    gsap.set(cards[0], backLayout);

    cards.forEach((card, index) => {
      const inner = card.querySelector<HTMLElement>('.bento-cc-inner');

      gsap.set(inner, {
        scaleX: index === 2 ? 1 : index === 1 ? 0.985 : 0.965,
        scaleY: index === 2 ? 1 : index === 1 ? 0.995 : 1.01,
        borderRadius: index === 2 ? 18 : 16,
        filter: index === 2 ? 'blur(0px)' : 'blur(0.15px)',
      });
    });
  };

  applyStaticLayout();

  const morphTo = (
    front: HTMLElement,
    middle: HTMLElement,
    back: HTMLElement,
    currentFront: HTMLElement,
    rotateAmount: number
  ) => {
    const frontInner = front.querySelector<HTMLElement>('.bento-cc-inner');
    const middleInner = middle.querySelector<HTMLElement>('.bento-cc-inner');
    const backInner = back.querySelector<HTMLElement>('.bento-cc-inner');
    const currentInner = currentFront.querySelector<HTMLElement>('.bento-cc-inner');
    const frontFill = front.querySelector<HTMLElement>('.bento-limit-fill');

    const tl = gsap.timeline();

    tl.to(currentFront, {
      y: -18,
      scaleX: 1.045,
      scaleY: 0.985,
      rotate: rotateAmount,
      duration: 0.42,
      ease: 'power3.inOut',
    });

    if (currentInner) {
      tl.to(currentInner, {
        scaleX: 1.025,
        scaleY: 0.985,
        borderRadius: 22,
        duration: 0.42,
        ease: 'power3.inOut',
      }, '<');
    }

    tl.to(currentFront, {
      ...backLayout,
      duration: 0.78,
      ease: 'power3.inOut',
    });

    tl.to(front, {
      ...frontLayout,
      scaleX: 1.025,
      scaleY: 0.99,
      duration: 0.82,
      ease: 'elastic.out(0.86, 0.48)',
    }, '-=0.68');

    tl.to(middle, {
      ...middleLayout,
      duration: 0.82,
      ease: 'elastic.out(0.86, 0.48)',
    }, '<');

    tl.to(back, {
      ...backLayout,
      duration: 0.82,
      ease: 'elastic.out(0.86, 0.48)',
    }, '<');

    if (frontInner) {
      tl.fromTo(
        frontInner,
        {
          scaleX: 0.965,
          scaleY: 1.035,
          borderRadius: 24,
          filter: 'blur(0.8px)',
        },
        {
          scaleX: 1,
          scaleY: 1,
          borderRadius: 18,
          filter: 'blur(0px)',
          duration: 0.72,
          ease: 'elastic.out(0.82, 0.52)',
        },
        '-=0.74'
      );
    }

    if (middleInner) {
      tl.to(middleInner, {
        scaleX: 0.985,
        scaleY: 0.995,
        borderRadius: 16,
        filter: 'blur(0.15px)',
        duration: 0.62,
        ease: 'power3.out',
      }, '<');
    }

    if (backInner) {
      tl.to(backInner, {
        scaleX: 0.965,
        scaleY: 1.01,
        borderRadius: 16,
        filter: 'blur(0.25px)',
        duration: 0.62,
        ease: 'power3.out',
      }, '<');
    }

    if (frontFill) {
      tl.fromTo(
        frontFill,
        {
          scaleX: 0.72,
          filter: 'brightness(1)',
        },
        {
          scaleX: 1,
          filter: 'brightness(1.16)',
          duration: 0.76,
          ease: 'power3.out',
        },
        '-=0.6'
      );
    }

    tl.to(front, {
      scaleX: 1,
      scaleY: 1,
      duration: 0.58,
      ease: 'elastic.out(0.9, 0.5)',
    }, '-=0.3');

    return tl;
  };

  const mainTl = gsap.timeline({
    repeat: -1,
    repeatDelay: 0.65,
  });

  mainTl.add(morphTo(cards[1], cards[0], cards[2], cards[2], -1.1));
  mainTl.to({}, { duration: 0.9 });

  mainTl.add(morphTo(cards[0], cards[2], cards[1], cards[1], 1.1));
  mainTl.to({}, { duration: 0.9 });

  mainTl.add(morphTo(cards[2], cards[1], cards[0], cards[0], -0.8));
  mainTl.to({}, { duration: 0.9 });

  addBentoTimeline(mainTl);

  fills.forEach((fill, index) => {
    addBentoTimeline(
      gsap.timeline({
        repeat: -1,
        yoyo: true,
        delay: index * 0.25,
      }).to(fill, {
        filter: 'brightness(1.14)',
        duration: 2.4 + index * 0.22,
        ease: 'sine.inOut',
      })
    );
  });
}

function setupThemeCardAnimation() {
  const dropdown = document.querySelector<HTMLElement>('.bento-card-f > div:nth-of-type(2)');
  const rows = gsap.utils.toArray<HTMLElement>('.bento-theme-row');
  const switchEl = document.querySelector<HTMLElement>('.bento-theme-switch');
  const knob = document.querySelector<HTMLElement>('.bento-theme-knob');

  if (dropdown) {
    addBentoTimeline(
      gsap.timeline({ repeat: -1, yoyo: true })
        .to(dropdown, {
          y: -5,
          scaleX: 1.012,
          scaleY: 0.992,
          borderRadius: 22,
          duration: 3.9,
          ease: 'sine.inOut',
        })
    );
  }

  rows.forEach((row, index) => {
    addBentoTimeline(
      gsap.timeline({
        repeat: -1,
        yoyo: true,
        delay: index * 0.12,
      }).to(row, {
        x: index % 2 === 0 ? 2 : -2,
        opacity: index === 2 ? 1 : 0.86,
        duration: 2.8 + index * 0.1,
        ease: 'sine.inOut',
      })
    );
  });

  if (switchEl) {
    addBentoTimeline(
      gsap.timeline({ repeat: -1, yoyo: true })
        .to(switchEl, {
          scaleX: 1.08,
          scaleY: 0.94,
          duration: 2.2,
          ease: 'sine.inOut',
        })
    );
  }

  if (knob) {
    addBentoTimeline(
      gsap.timeline({ repeat: -1, yoyo: true })
        .to(knob, {
          x: -10,
          scale: 0.96,
          duration: 2.2,
          ease: 'sine.inOut',
        })
    );
  }
}

function setupBentoAnimations() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  setupBentoEntranceMotion();
  setupBentoCardHoverMorph();

  setupDashboardCardAnimation();
  setupCategoryCardAnimation();
  setupCalendarCardAnimation();
  setupPatrimonyCardAnimation();
  setupCreditCardAnimation();
  setupThemeCardAnimation();
}

export function attachBentoLandingListeners() {
  cleanupBentoLanding();

  const elSaldo = document.getElementById('bento-val-saldo');
  if (elSaldo) {
    elSaldo.innerHTML = '';
    saldoRoot = createRoot(elSaldo);
    saldoRoot.render(<NumberFlowWrapper values={[4820, 5250, 6100, 4100]} delay={2000} />);
  }

  const elHora = document.getElementById('bento-val-hora');
  if (elHora) {
    elHora.innerHTML = '';
    horaRoot = createRoot(elHora);
    horaRoot.render(<NumberFlowWrapper values={[28.50, 32.00, 45.00, 28.50]} isDecimal delay={2500} />);
  }

  const elFixas = document.getElementById('bento-val-fixas');
  if (elFixas) {
    elFixas.innerHTML = '';
    fixasRoot = createRoot(elFixas);
    fixasRoot.render(<NumberFlowWrapper values={[2340, 2100, 1800, 2500]} delay={3000} />);
  }

  const elCategorias = document.getElementById('bento-val-categorias');
  if (elCategorias) {
    elCategorias.innerHTML = '';
    categoriasRoot = createRoot(elCategorias);
    categoriasRoot.render(<NumberFlowOnce from={0} to={61} delay={450} />);
  }

  setupBentoAnimations();
}

export function cleanupBentoLanding() {
  bentoTimelines.forEach((tl) => tl.kill());
  bentoTimelines = [];

  bentoAnimationCleanupFns.forEach((cleanup) => cleanup());
  bentoAnimationCleanupFns = [];

  gsap.killTweensOf([
    '#landing-bento-label',
    '#landing-bento-heading',
    '.bento-card',
    '.bento-card *',
    '.bento-mockup-inner',
    '.bento-metric-card',
    '.bento-category-visual',
    '.bento-cal-wrap',
    '.bento-cal-cells',
    '.bento-day',
    '.bento-day-wd',
    '.bento-day-num',
    '.bento-day-dots',
    '.bento-dot-i',
    '.bento-dot-e',
    '.bento-pat-card',
    '.bento-pat-value',
    '.bento-pat-tag-row',
    '.bento-pat-name',
    '.bento-pat-sub',
    '.bento-pat-divider',
    '.bento-pat-label',
    '.bento-cc-item',
    '.bento-cc-inner',
    '.bento-limit-fill',
    '.bento-theme-row',
    '.bento-theme-switch',
    '.bento-theme-knob',
  ]);

  if (saldoRoot) {
    saldoRoot.unmount();
    saldoRoot = null;
  }

  if (horaRoot) {
    horaRoot.unmount();
    horaRoot = null;
  }

  if (fixasRoot) {
    fixasRoot.unmount();
    fixasRoot = null;
  }

  if (categoriasRoot) {
    categoriasRoot.unmount();
    categoriasRoot = null;
  }
}