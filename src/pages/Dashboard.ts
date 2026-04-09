import { Header, attachHeaderListeners } from '../components/Header';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { initEmptyStateLotties } from '../components/EmptyState';
import { openBankConnectModal } from '../components/BankConnectModal';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { type FinanceiroConfig, calcularPrevisaoFinanceira, getProximoPagamento } from '../lib/financeiroUtils';
import { loadPluggyRecords } from '../lib/pluggyFirestore';
import { BillConstructor } from '../lib/BillConstructor';
import { getAccountDisplayName } from './CreditCards';
import {
  CreditCardStack,
  renderEmptyCard,
  type CardInfo,
  type CreditCardSelectionType,
  type WebCrediCardSummary,
  type DragState,
  renderCardItem,
  applyDragTransform,
  snapBack,
  animateCardThrow,
  animateCardEnter,
  animateStackReorder,
  attachCreditCardFilterListeners,
  getIncludedCreditCardExpenseTotal,
  DRAG_THRESHOLD,
  VELOCITY_THRESHOLD
} from '../components/CreditCardStack';
import { AccountsBalance, attachAccountsListeners, animateAccountsCardEntrance, animateBalanceChange, BankDotsStack, animateBankDotsEntrance, attachBankDotsHover } from '../components/AccountsBalance';
import { CategorySpentChartSummary, attachCategorySpentChartListeners } from '../components/CategorySpentChart';
import { CategoryService } from '../services/categoryService';
import { getCategoryName } from '../lib/categoryUtils';
import { SpendingCalendar, attachSpendingCalendarListeners } from '../components/SpendingCalendar';
import { openWelcomeModal } from '../components/WelcomeModal';



import gsap from 'gsap';
import { toMonthKey } from '../components/MonthSelector';
import {
  OverviewConfigDropdown,
  attachOverviewConfigListeners,
  loadOverviewToggles,
  saveOverviewToggles,
  type OverviewToggleState
} from '../components/OverviewConfigDropdown';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type StoredCreditCardExpenseConfig = {
  selectedType: CreditCardSelectionType;
  hiddenCardIds: string[];
};

const CREDIT_CARD_EXPENSE_STORAGE_KEY = 'dashboard-credit-card-expense-config';

function isCreditCardSelectionType(value: unknown): value is CreditCardSelectionType {
  return value === 'current' || value === 'last' || value === 'history';
}

function loadCreditCardExpenseConfig(userId: string): StoredCreditCardExpenseConfig {
  try {
    const raw = localStorage.getItem(`${CREDIT_CARD_EXPENSE_STORAGE_KEY}-${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredCreditCardExpenseConfig>;
      return {
        selectedType: isCreditCardSelectionType(parsed.selectedType) ? parsed.selectedType : 'current',
        hiddenCardIds: Array.isArray(parsed.hiddenCardIds)
          ? parsed.hiddenCardIds.filter((id): id is string => typeof id === 'string')
          : [],
      };
    }
  } catch {}

  return { selectedType: 'current', hiddenCardIds: [] };
}

function saveCreditCardExpenseConfig(userId: string, config: StoredCreditCardExpenseConfig) {
  localStorage.setItem(`${CREDIT_CARD_EXPENSE_STORAGE_KEY}-${userId}`, JSON.stringify(config));
}

function calculateOverviewTotals(
  config: FinanceiroConfig,
  ccSummary: WebCrediCardSummary,
  totalAccountsBalance: number,
  overviewToggles: OverviewToggleState,
  recurrenceData: {
    subsPending: number;
    subsPaid: number;
    remsIncomePending: number;
    remsIncomePaid: number;
    remsExpensePending: number;
    remsExpensePaid: number;
  }
) {
  const previsao = calcularPrevisaoFinanceira(config);

  // Forecast Math (What remains to happen)
  let pendingReceitas = 0;
  if (overviewToggles.salario) pendingReceitas += previsao.salarioLiquido;
  if (overviewToggles.vale && config.habilitarVale) pendingReceitas += previsao.vale;
  if (overviewToggles.lembretes) pendingReceitas += recurrenceData.remsIncomePending;

  let pendingDespesas = getIncludedCreditCardExpenseTotal(ccSummary);
  if (overviewToggles.assinatura) pendingDespesas += recurrenceData.subsPending;
  if (overviewToggles.lembretes) pendingDespesas += recurrenceData.remsExpensePending;

  // Display Cards Math (Total for the month)
  let displayReceitas = 0;
  if (overviewToggles.salario) displayReceitas += previsao.salarioLiquido;
  if (overviewToggles.vale && config.habilitarVale) displayReceitas += previsao.vale;
  if (overviewToggles.lembretes) displayReceitas += (recurrenceData.remsIncomePending + recurrenceData.remsIncomePaid);

  let displayDespesas = getIncludedCreditCardExpenseTotal(ccSummary);
  if (overviewToggles.assinatura) displayDespesas += (recurrenceData.subsPending + recurrenceData.subsPaid);
  if (overviewToggles.lembretes) displayDespesas += (recurrenceData.remsExpensePending + recurrenceData.remsExpensePaid);

  const hasActiveProjection =
    overviewToggles.salario ||
    overviewToggles.vale ||
    overviewToggles.assinatura ||
    overviewToggles.lembretes ||
    ccSummary.cards.some(card => card.includeInExpenses);

  return {
    displayReceitas,
    displayDespesas,
    saldoPrevisto: totalAccountsBalance + pendingReceitas - pendingDespesas,
    hasActiveProjection,
    pendingRemindersTotal: recurrenceData.remsExpensePending,
    pendingReminderIncomeTotal: recurrenceData.remsIncomePending,
    pendingSubscriptionsTotal: recurrenceData.subsPending
  };
}



// AccountsDropdown moved to AccountsBalance.ts

/* ─────────────────────────────────────────────────────────────────────────────
   Animação Líquida dos Cards de Visão Geral
───────────────────────────────────────────────────────────────────────────── */

function animateOverviewCardsEntrance() {
  // ── Inject hover CSS once ──
  if (!document.getElementById('overview-hover-style')) {
    const style = document.createElement('style');
    style.id = 'overview-hover-style';
    style.textContent = ``;
    document.head.appendChild(style);
  }

  // ── Card principal (Saldo Livre Previsto) ──
  const mainCard = document.querySelector<HTMLElement>('.overview-card-main');
  if (mainCard) {
    const header = mainCard.querySelector<HTMLElement>('.overview-card-header');
    const value = mainCard.querySelector<HTMLElement>('.overview-card-value');
    const subtitle = mainCard.querySelector<HTMLElement>('.overview-card-subtitle');

    gsap.killTweensOf([mainCard, header, value, subtitle].filter(Boolean));

    const tl = gsap.timeline();

    // Anticipação + surge líquido
    tl.fromTo(mainCard,
      { scaleX: 1.04, scaleY: 0.86, opacity: 0, y: 28, borderRadius: '22px' },
      { scaleX: 0.97, scaleY: 1.04, opacity: 1, y: -5, borderRadius: '13px', duration: 0.3, ease: 'power3.out' },
      0
    );
    tl.to(mainCard, {
      scaleX: 1, scaleY: 1, y: 0, borderRadius: '16px',
      duration: 0.65, ease: 'elastic.out(1.2, 0.4)', clearProps: 'transform,borderRadius'
    });

    // Header desliza com blur
    if (header) {
      tl.fromTo(header,
        { opacity: 0, y: -8, filter: 'blur(5px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power2.out', clearProps: 'all' },
        0.06
      );
    }

    // Valor — R$ e dígitos surgem separados
    if (value) {
      const currency = value.querySelector('span:first-child');
      const digits = value.querySelector('span:nth-child(2)');
      const els = [currency, digits].filter(Boolean);

      if (els.length >= 2) {
        gsap.set(els, { opacity: 0, y: 12, filter: 'blur(8px)' });
        tl.to(els, {
          opacity: 1, y: 0, filter: 'blur(0px)',
          duration: 0.32, stagger: 0.05, ease: 'power2.out', clearProps: 'all'
        }, 0.1);
        // Elastic settle no container
        tl.fromTo(value,
          { scaleX: 0.92, scaleY: 1.08 },
          { scaleX: 1, scaleY: 1, duration: 0.55, ease: 'elastic.out(1.15, 0.45)', clearProps: 'all' },
          0.1
        );
      } else {
        tl.fromTo(value,
          { opacity: 0, y: 14, scaleX: 0.88, scaleY: 1.12, filter: 'blur(10px)' },
          { opacity: 1, y: -3, scaleX: 1.03, scaleY: 0.97, filter: 'blur(0px)', duration: 0.3, ease: 'power3.out' },
          0.1
        );
        tl.to(value, { y: 0, scaleX: 1, scaleY: 1, duration: 0.55, ease: 'elastic.out(1.15, 0.45)', clearProps: 'all' });
      }
    }

    // Subtítulo
    if (subtitle) {
      tl.fromTo(subtitle,
        { opacity: 0, y: 6, filter: 'blur(4px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power2.out', clearProps: 'all' },
        0.2
      );
    }

    // Border glow flash + shadow pump
    tl.fromTo(mainCard,
      { boxShadow: '0 1px 3px -1px rgba(0,0,0,0.05)', borderColor: 'rgba(217,119,87,0.15)' },
      { boxShadow: '0 8px 24px -4px rgba(0,0,0,0.25)', borderColor: 'rgba(28,28,28,1)', duration: 0.5, ease: 'power2.out', clearProps: 'boxShadow,borderColor' },
      0.04
    );
  }

  // ── Cards pequenos — stagger por posição na grid (diagonal wave) ──
  const smallCards = document.querySelectorAll<HTMLElement>('.overview-card-small');
  // Ordem: [0]=top-left, [1]=top-right, [2]=bottom-left, [3]=bottom-right
  // Diagonal wave: 0 → 1,2 → 3
  const diagonalOrder = [0, 1, 2, 3];
  const diagonalDelay = [0, 0.06, 0.06, 0.12];

  smallCards.forEach((card, idx) => {
    const header = card.querySelector<HTMLElement>('.overview-card-header');
    const value = card.querySelector<HTMLElement>('.overview-card-value');
    const i = diagonalOrder[idx] ?? idx;

    gsap.killTweensOf([card, header, value].filter(Boolean));

    const baseDelay = 0.05 + (diagonalDelay[i] ?? i * 0.06);
    const tl = gsap.timeline({ delay: baseDelay });

    // Anticipação micro + surge
    tl.fromTo(card,
      { scaleX: 1.05, scaleY: 0.84, opacity: 0, y: 22, borderRadius: '20px' },
      { scaleX: 0.97, scaleY: 1.04, opacity: 1, y: -3, borderRadius: '13px', duration: 0.26, ease: 'power3.out' },
      0
    );
    tl.to(card, {
      scaleX: 1, scaleY: 1, y: 0, borderRadius: '16px',
      duration: 0.55, ease: 'elastic.out(1.15, 0.42)', clearProps: 'transform,borderRadius'
    });

    // Header blur-in
    if (header) {
      tl.fromTo(header,
        { opacity: 0, y: -5, filter: 'blur(4px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.22, ease: 'power2.out', clearProps: 'all' },
        0.05
      );
    }

    // Valor — R$ e dígitos separados quando possível
    if (value) {
      const currency = value.querySelector('span:first-child');
      const digits = value.querySelector('span:nth-child(2), #overview-pagamento-data');
      const sub = value.querySelector('#overview-pagamento-relativo');
      const els = [currency, digits, sub].filter(Boolean);

      if (els.length >= 2) {
        gsap.set(els, { opacity: 0, y: 8, filter: 'blur(6px)' });
        tl.to(els, {
          opacity: 1, y: 0, filter: 'blur(0px)',
          duration: 0.28, stagger: 0.04, ease: 'power2.out', clearProps: 'all'
        }, 0.08);
        tl.fromTo(value,
          { scaleX: 0.93, scaleY: 1.07 },
          { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1.1, 0.45)', clearProps: 'all' },
          0.08
        );
      } else {
        tl.fromTo(value,
          { opacity: 0, y: 10, scaleX: 0.9, scaleY: 1.1, filter: 'blur(8px)' },
          { opacity: 1, y: -2, scaleX: 1.02, scaleY: 0.98, filter: 'blur(0px)', duration: 0.25, ease: 'power3.out' },
          0.08
        );
        tl.to(value, { y: 0, scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1.1, 0.45)', clearProps: 'all' });
      }
    }

    // Border glow flash + shadow pump
    tl.fromTo(card,
      { boxShadow: '0 1px 2px -1px rgba(0,0,0,0.03)', borderColor: 'rgba(217,119,87,0.12)' },
      { boxShadow: '0 6px 16px -3px rgba(0,0,0,0.2)', borderColor: 'rgba(28,28,28,1)', duration: 0.4, ease: 'power2.out', clearProps: 'boxShadow,borderColor' },
      0.03
    );
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Animação Líquida dos Cards de Resumo (Receitas, Despesas, Saldo Total)
───────────────────────────────────────────────────────────────────────────── */

function initSummaryLotties() {
  const players = document.querySelectorAll<HTMLElement & { stop: () => void, play: () => void }>('.summary-lottie-icon');
  players.forEach(player => {
    if (player.dataset.lottieInit === 'true') return;
    player.dataset.lottieInit = 'true';

    const schedulePlay = () => {
      if (!player.isConnected) return;
      if (typeof player.stop === 'function') player.stop();
      if (typeof player.play === 'function') player.play();
      const delay = 3000 + Math.random() * 2000;
      setTimeout(schedulePlay, delay);
    };

    setTimeout(schedulePlay, 500 + Math.random() * 800);
  });
}

function animateSummaryCardsEntrance() {
  const summaryCards = document.querySelectorAll<HTMLElement>('.overview-card-summary');
  if (!summaryCards.length) return;

  // Stagger: esquerda → direita
  const staggerDelays = [0, 0.08];

  summaryCards.forEach((card, idx) => {
    const header = card.querySelector<HTMLElement>('.overview-card-header');
    const lottieIcon = header?.querySelector<HTMLElement>('lottie-player');
    const value = card.querySelector<HTMLElement>('.overview-card-value');

    gsap.killTweensOf([card, header, lottieIcon, value].filter(Boolean));

    const baseDelay = 0.12 + (staggerDelays[idx] ?? idx * 0.07);
    const tl = gsap.timeline({ delay: baseDelay });

    // 1. Card surge com deformação líquida — squash horizontal + stretch vertical
    tl.fromTo(card,
      { scaleX: 1.06, scaleY: 0.82, opacity: 0, y: 26, borderRadius: '22px' },
      { scaleX: 0.96, scaleY: 1.05, opacity: 1, y: -4, borderRadius: '13px', duration: 0.28, ease: 'power3.out' },
      0
    );
    tl.to(card, {
      scaleX: 1, scaleY: 1, y: 0, borderRadius: '16px',
      duration: 0.6, ease: 'elastic.out(1.2, 0.4)', clearProps: 'transform,borderRadius'
    });

    // 2. Header desliza com blur
    if (header) {
      tl.fromTo(header,
        { opacity: 0, y: -6, filter: 'blur(5px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.24, ease: 'power2.out', clearProps: 'all' },
        0.06
      );
    }

    // 3. Lottie icon surge com rotação e scale
    if (lottieIcon) {
      tl.fromTo(lottieIcon,
        { opacity: 0, scale: 0.4, rotation: -45, filter: 'blur(4px)' },
        { opacity: 1, scale: 1, rotation: 0, filter: 'blur(0px)', duration: 0.4, ease: 'back.out(2.5)', clearProps: 'all' },
        0.1
      );
    }

    // 4. Valor — R$ e dígitos surgem separados com cascade líquido
    if (value) {
      const currency = value.querySelector('span:first-child');
      const digits = value.querySelector('span:nth-child(2)');
      const els = [currency, digits].filter(Boolean);

      if (els.length >= 2) {
        gsap.set(els, { opacity: 0, y: 10, filter: 'blur(8px)' });
        tl.to(els, {
          opacity: 1, y: 0, filter: 'blur(0px)',
          duration: 0.3, stagger: 0.05, ease: 'power2.out', clearProps: 'all'
        }, 0.12);
        // Elastic settle no container do valor
        tl.fromTo(value,
          { scaleX: 0.9, scaleY: 1.1 },
          { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.15, 0.42)', clearProps: 'all' },
          0.12
        );
      } else {
        tl.fromTo(value,
          { opacity: 0, y: 12, scaleX: 0.88, scaleY: 1.12, filter: 'blur(10px)' },
          { opacity: 1, y: -2, scaleX: 1.03, scaleY: 0.97, filter: 'blur(0px)', duration: 0.28, ease: 'power3.out' },
          0.12
        );
        tl.to(value, { y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.15, 0.42)', clearProps: 'all' });
      }
    }

    // 5. Border glow flash + shadow pump
    tl.fromTo(card,
      { boxShadow: '0 1px 2px -1px rgba(0,0,0,0.03)', borderColor: 'rgba(217,119,87,0.12)' },
      { boxShadow: '0 8px 20px -4px rgba(0,0,0,0.25)', borderColor: 'rgba(28,28,28,1)', duration: 0.45, ease: 'power2.out', clearProps: 'boxShadow,borderColor' },
      0.04
    );
  });

  // Inicializa os Lottie players dos cards de resumo
  initSummaryLotties();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Animação Líquida dos Cards Inferiores (Categoria e Calendário)
───────────────────────────────────────────────────────────────────────────── */

function animateBottomCardsEntrance() {
  const bottomCards = document.querySelectorAll<HTMLElement>('.category-spent-card, .spending-calendar-card');
  if (!bottomCards.length) return;

  // Stagger: esquerda → direita
  const staggerDelays = [0, 0.08];

  bottomCards.forEach((card, idx) => {
    const header = card.querySelector<HTMLElement>('.overview-card-header');
    
    gsap.killTweensOf([card, header].filter(Boolean));

    const baseDelay = 0.15 + (staggerDelays[idx] ?? idx * 0.07);
    const tl = gsap.timeline({ delay: baseDelay });

    // 1. Card surge com deformação líquida
    tl.fromTo(card,
      { scaleX: 1.04, scaleY: 0.86, opacity: 0, y: 30, borderRadius: '22px' },
      { scaleX: 0.97, scaleY: 1.04, opacity: 1, y: -5, borderRadius: '13px', duration: 0.3, ease: 'power3.out' },
      0
    );
    tl.to(card, {
      scaleX: 1, scaleY: 1, y: 0, borderRadius: '16px',
      duration: 0.65, ease: 'elastic.out(1.2, 0.4)', clearProps: 'transform,borderRadius'
    });

    // 2. Header desliza com blur
    if (header) {
      tl.fromTo(header,
        { opacity: 0, y: -6, filter: 'blur(5px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power2.out', clearProps: 'all' },
        0.06
      );
    }

    // 3. Border glow flash + shadow pump
    tl.fromTo(card,
      { boxShadow: '0 1px 2px -1px rgba(0,0,0,0.03)', borderColor: 'rgba(217,119,87,0.12)' },
      { boxShadow: '0 8px 24px -4px rgba(0,0,0,0.25)', borderColor: 'rgba(28,28,28,1)', duration: 0.5, ease: 'power2.out', clearProps: 'boxShadow,borderColor' },
      0.04
    );
  });
}

// ─── Interfaces moved to CreditCardStack.ts ───────────────────────────────────

function DashboardContent(
  userName: string,
  config: FinanceiroConfig,
  ccSummary: WebCrediCardSummary,
  cashAccounts: any[] = [],
  activeAccountIds: Set<string> = new Set(),
  totalAccountsBalance: number = 0,
  overviewToggles: OverviewToggleState = { salario: false, vale: false, assinatura: false, lembretes: false },
  pendingSubscriptionsTotal: number = 0,
  paidSubscriptionsTotal: number = 0,
  pendingRemindersTotal: number = 0,
  paidRemindersTotal: number = 0,
  pendingReminderIncomeTotal: number = 0,
  paidReminderIncomeTotal: number = 0
): string {
  const pagamento = getProximoPagamento(config.diaPagamento || 5);
  const [reais, centavos] = formatCurrency(config.salarioBase || 0).split(',');

  // Cálculo dos cards de resumo (baseado nos toggles da previsão)
  const totals = calculateOverviewTotals(
    config,
    ccSummary,
    totalAccountsBalance,
    overviewToggles,
    {
      subsPending: pendingSubscriptionsTotal,
      subsPaid: paidSubscriptionsTotal,
      remsIncomePending: pendingReminderIncomeTotal,
      remsIncomePaid: paidReminderIncomeTotal,
      remsExpensePending: pendingRemindersTotal,
      remsExpensePaid: paidRemindersTotal
    }
  );
  const { displayReceitas, displayDespesas, saldoPrevisto, hasActiveProjection, pendingRemindersTotal: remsPending, pendingSubscriptionsTotal: subsPending } = totals;
  const [saldoReais, saldoCentavos] = formatCurrency(saldoPrevisto).split(',');
  const valorHora = formatCurrency((config.salarioBase || 0) / 220);
  const hasActiveToggles = hasActiveProjection;
  const activeToggleCount = [overviewToggles.salario, overviewToggles.vale, overviewToggles.assinatura, overviewToggles.lembretes].filter(Boolean).length;



  return `
    <div class="w-full animate-fadein px-4 md:px-6">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Olá, ${userName}</h2>
          <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Resumo das suas finanças e previsões.</p>
        </div>
        <div class="relative">
          <button id="overview-config-trigger" class="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-all duration-200 text-[13px] font-medium text-[var(--color-text)]">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="hidden sm:inline">Configuração</span>
            <svg width="10" height="10" class="hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          ${OverviewConfigDropdown(overviewToggles)}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5" id="overview-grid">
        <div class="overview-card overview-card-main lg:col-span-12 xl:col-span-7 relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-visible flex flex-col min-h-[120px] z-10" style="will-change:transform; transform-origin:center center;">
          <div class="overview-card-header px-3.5 py-2 border-b border-[var(--color-border-light)] bg-[var(--color-surface-hover)] rounded-t-2xl">
            <p class="text-[9px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Saldo Livre Previsto</p>
          </div>
          <div class="overview-card-body p-4 md:p-5 flex flex-col gap-0.5 justify-center flex-1">
            <div class="overview-card-value flex items-baseline gap-1" style="will-change:transform; transform-origin:left center;">
              <span class="text-[12px] font-medium text-[var(--color-text-secondary)]">R$</span>
              <span id="overview-saldo-previsto" class="text-[26px] sm:text-[28px] md:text-[32px] font-bold text-[var(--color-text)] tracking-tight leading-none">${saldoReais}<span class="text-[14px] md:text-[18px] font-medium text-[var(--color-text-secondary)]">,${saldoCentavos}</span></span>
            </div>
            <p id="overview-subtitle" class="overview-card-subtitle text-[11px] text-[var(--color-text-secondary)]">${hasActiveToggles ? 'Previsão de saldo livre este mês' : 'Salário líquido estimado este mês'}</p>
          </div>
        </div>

        <div class="lg:col-span-12 xl:col-span-5 grid grid-cols-2 gap-3">
          <!-- Salário Bruto -->
          <div class="overview-card overview-card-small relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-col overflow-visible min-h-[85px] z-10" style="will-change:transform; transform-origin:center center;">
            <div class="overview-card-header px-3 py-1.5 border-b border-[var(--color-border-light)] bg-[var(--color-surface-hover)] rounded-t-2xl">
              <p class="text-[8px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Salário Bruto</p>
            </div>
            <div class="overview-card-body p-3 flex flex-col justify-center flex-1">
              <div class="overview-card-value flex items-baseline gap-1" style="will-change:transform; transform-origin:left center;">
                <span class="text-[11px] font-medium text-[var(--color-text-secondary)]">R$</span>
                <span id="overview-salario-bruto" class="text-[18px] font-bold text-[var(--color-text)] tracking-tight">${reais}<span class="text-[13px] font-medium text-[var(--color-text-secondary)]">,${centavos}</span></span>
              </div>
            </div>
          </div>

          <!-- Próx. Pagamento -->
          <div class="overview-card overview-card-small relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-col overflow-visible min-h-[85px] z-10" style="will-change:transform; transform-origin:center center;">
            <div class="overview-card-header px-3 py-1.5 border-b border-[var(--color-border-light)] bg-[var(--color-surface-hover)] rounded-t-2xl">
              <p class="text-[8px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Próx. Pagamento</p>
            </div>
            <div class="overview-card-body p-3 flex flex-col justify-center flex-1">
              <div class="overview-card-value">
                <span id="overview-pagamento-data" class="text-[18px] font-bold text-[var(--color-text)] tracking-tight leading-none">${pagamento.dataFormatada}</span>
                <span id="overview-pagamento-relativo" class="text-[9px] text-[var(--color-text-secondary)] mt-0.5 block">${pagamento.textoRelativo}</span>
              </div>
            </div>
          </div>

          <!-- Receitas -->
          <div class="overview-card overview-card-small relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-col overflow-visible min-h-[85px] z-10" style="will-change:transform; transform-origin:center center;">
            <div class="overview-card-header px-3 py-1.5 border-b border-[var(--color-border-light)] bg-[var(--color-surface-hover)] rounded-t-2xl">
              <div class="flex items-center gap-2">
                <div style="width:14px;height:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <lottie-player src="/assets/lottie/receita.json" background="transparent" speed="0.8" width="14" height="14" class="summary-lottie-icon" style="width:14px !important;height:14px !important;"></lottie-player>
                </div>
                <p class="text-[8px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Receitas</p>
              </div>
            </div>
            <div class="overview-card-body p-3 flex flex-col justify-center flex-1">
              <div class="overview-card-value flex items-baseline gap-1" style="will-change:transform; transform-origin:left center;">
                <span class="text-[11px] font-medium text-[var(--color-text-secondary)]">R$</span>
                <span id="overview-receitas" class="text-[18px] font-bold text-emerald-400 tracking-tight">${formatCurrency(displayReceitas)}</span>
              </div>
            </div>
          </div>

          <!-- Despesas -->
          <div class="overview-card overview-card-small relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-col overflow-visible min-h-[85px] z-10" style="will-change:transform; transform-origin:center center;">
            <div class="overview-card-header px-3 py-1.5 border-b border-[var(--color-border-light)] bg-[var(--color-surface-hover)] rounded-t-2xl">
              <div class="flex items-center gap-2">
                <div style="width:14px;height:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <lottie-player src="/assets/lottie/despesa.json" background="transparent" speed="0.8" width="14" height="14" class="summary-lottie-icon" style="width:14px !important;height:14px !important;"></lottie-player>
                </div>
                <p class="text-[8px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Despesas</p>
              </div>
            </div>
            <div class="overview-card-body p-3 flex flex-col justify-center flex-1">
              <!-- Apenas assinatura ativa -->
              <div id="overview-subs-row" class="${(overviewToggles.assinatura && !overviewToggles.lembretes) ? '' : 'hidden'}">
                <span class="text-[8px] text-[var(--color-text-secondary)] block mb-0.5">Assinatura a pagar</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-[10px] font-medium text-[var(--color-text-secondary)]">R$</span>
                  <span id="overview-subs-pending" class="text-[18px] font-bold text-orange-400 tracking-tight">${formatCurrency(subsPending)}</span>
                </div>
              </div>
              <!-- Apenas lembretes ativo -->
              <div id="overview-rems-row" class="${(overviewToggles.lembretes && !overviewToggles.assinatura) ? '' : 'hidden'}">
                <span class="text-[8px] text-[var(--color-text-secondary)] block mb-0.5">Lembretes a pagar</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-[10px] font-medium text-[var(--color-text-secondary)]">R$</span>
                  <span id="overview-rems-pending" class="text-[18px] font-bold text-orange-400 tracking-tight">${formatCurrency(remsPending)}</span>
                </div>
              </div>
              <!-- Ambos ativos → soma em vermelho -->
              <div id="overview-combined-row" class="${(overviewToggles.assinatura && overviewToggles.lembretes) ? '' : 'hidden'}">
                <span class="text-[8px] text-[var(--color-text-secondary)] block mb-0.5">A pagar</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-[10px] font-medium text-[var(--color-text-secondary)]">R$</span>
                  <span id="overview-combined-pending" class="text-[18px] font-bold text-red-400 tracking-tight">${formatCurrency(subsPending + remsPending)}</span>
                </div>
              </div>
              <!-- Nenhum ativo → despesas totais -->
              <div id="overview-despesas-row" class="${(!overviewToggles.assinatura && !overviewToggles.lembretes) ? '' : 'hidden'} overview-card-value flex items-baseline gap-1" style="will-change:transform; transform-origin:left center;">
                <span class="text-[11px] font-medium text-[var(--color-text-secondary)]">R$</span>
                <span id="overview-despesas" class="text-[18px] font-bold text-red-400 tracking-tight">${formatCurrency(displayDespesas)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        ${AccountsBalance(cashAccounts, activeAccountIds, totalAccountsBalance)}

        ${CreditCardStack(ccSummary)}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        ${CategorySpentChartSummary()}
        ${SpendingCalendar()}
      </div>
    </div>
  `;
}



export function renderDashboard(user: any, tab?: string) {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  const currentTab = tab || sessionStorage.getItem('currentTab') || 'overview';
  sessionStorage.setItem('currentTab', currentTab);
  sessionStorage.setItem('currentPage', 'dashboard');
  const pendingWelcomeUid = sessionStorage.getItem('stripeSignupWelcomePendingUid');

  let userData: any = null;
  let listenersAttached = false;
  let welcomeModalHandled = false;
  let financeiroConfig: FinanceiroConfig = {
    salarioBase: 0, diaPagamento: 5, isentarDesconto: false, habilitarVale: false, porcentagemVale: 40, diaVale: 15, descontosPersonalizados: []
  };
  const storedCreditCardExpenseConfig = loadCreditCardExpenseConfig(user.uid);
  let hiddenExpenseCardIds = new Set(storedCreditCardExpenseConfig.hiddenCardIds);
  let ccSummary: WebCrediCardSummary = {
    cards: [],
    activeCardIndex: 0,
    faturaSelecionada: storedCreditCardExpenseConfig.selectedType,
    totFatura: 0,
    totUltima: 0,
    totHistorico: 0,
    isLoading: true
  };
  let globalFinance = {
    totalAccountsBalance: 0,
    totalFixedExpenses: 0,
    isLoading: true
  };

  let overviewToggles = loadOverviewToggles(user.uid);
  let pendingSubscriptionsTotal = 0;
  let paidSubscriptionsTotal = 0;
  let pendingRemindersTotal = 0;
  let paidRemindersTotal = 0;
  let pendingReminderIncomeTotal = 0;
  let paidReminderIncomeTotal = 0;


  let categorySpentData: any[] = [];
  let allCurrentTransactions: any[] = [];

  let allCashAccounts: any[] = [];

  const savedActive = localStorage.getItem(`active-accounts-${user.uid}`);
  let activeAccountIds: Set<string> = savedActive ? new Set(JSON.parse(savedActive)) : new Set();

  const persistCreditCardExpenseConfig = () => {
    saveCreditCardExpenseConfig(user.uid, {
      selectedType: ccSummary.faturaSelecionada,
      hiddenCardIds: Array.from(hiddenExpenseCardIds),
    });
  };

  const maybeOpenPendingWelcomeModal = () => {
    if (welcomeModalHandled || pendingWelcomeUid !== user.uid) return;

    welcomeModalHandled = true;
    sessionStorage.removeItem('stripeSignupWelcomePendingUid');

    const welcomeName = userData?.name || userData?.profile?.name || user.displayName || user.email?.split('@')[0] || 'Usuário';
    window.setTimeout(() => {
      openWelcomeModal(welcomeName, () => {});
    }, 250);
  };

  const recalculateBalance = () => {
    globalFinance.totalAccountsBalance = allCashAccounts
      .filter(acc => activeAccountIds.has(acc.id))
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);
  };

  const updateAccountsViewOnly = () => {
    recalculateBalance();
    
    // 1. Update the filter trigger text (e.g., "3 contas")
    const triggerText = document.querySelector('#dashboard-accounts-filter-trigger span');
    if (triggerText) {
      triggerText.textContent = `${activeAccountIds.size} ${activeAccountIds.size === 1 ? 'conta' : 'contas'}`;
    }

    // 2. Update dropdown items state
    document.querySelectorAll('.account-select-item').forEach(el => {
      const id = el.getAttribute('data-account-id');
      if (!id) return;
      
      const isActive = activeAccountIds.has(id);
      const dot = el.querySelector('.rounded-full');
      const textMain = el.querySelector('.font-semibold');
      const textVal = el.querySelector('.font-bold');

      if (dot) {
        if (isActive) {
          dot.classList.remove('bg-white/10', 'scale-0');
          dot.classList.add('bg-[#D97757]', 'scale-100');
        } else {
          dot.classList.remove('bg-[#D97757]', 'scale-100');
          dot.classList.add('bg-white/10', 'scale-0');
        }
      }
      
      if (textMain) {
        if (isActive) {
          textMain.classList.remove('text-[var(--color-text-secondary)]');
          textMain.classList.add('text-[var(--color-text)]');
        } else {
          textMain.classList.remove('text-[var(--color-text)]');
          textMain.classList.add('text-[var(--color-text-secondary)]');
        }
      }
      
      if (textVal) {
        if (isActive) {
          textVal.classList.remove('text-[var(--color-text-secondary)]');
          textVal.classList.add('text-[var(--color-text)]');
        } else {
          textVal.classList.remove('text-[var(--color-text)]');
          textVal.classList.add('text-[var(--color-text-secondary)]');
        }
      }
    });

    // 3. Update Bank Dots
    const dotsStack = document.getElementById('bank-dots-stack');
    if (dotsStack) {
      dotsStack.innerHTML = BankDotsStack(allCashAccounts, activeAccountIds);
      // Re-trigger entrance animation and hover listeners for new dots
      attachBankDotsHover();
      animateBankDotsEntrance();
    }

    // 4. Update the Numbers with Animations
    animateBalanceChange(globalFinance.totalAccountsBalance);

    // 5. Update Overview Totals
    const { displayReceitas: totalReceitas, displayDespesas: totalDespesas, saldoPrevisto } = calculateOverviewTotals(
      financeiroConfig,
      ccSummary,
      globalFinance.totalAccountsBalance,
      overviewToggles,
      {
        subsPending: pendingSubscriptionsTotal,
        subsPaid: paidSubscriptionsTotal,
        remsIncomePending: pendingReminderIncomeTotal,
        remsIncomePaid: paidReminderIncomeTotal,
        remsExpensePending: pendingRemindersTotal,
        remsExpensePaid: paidRemindersTotal
      }
    );
    
    const overviewSaldoEl = document.getElementById('overview-saldo-previsto');
    if (overviewSaldoEl) {
       const [reais, centavos] = formatCurrency(saldoPrevisto).split(',');
       overviewSaldoEl.innerHTML = `${reais}<span class="text-[14px] md:text-[18px] font-medium text-[var(--color-text-secondary)]">,${centavos}</span>`;
    }

    const overviewReceitasEl = document.getElementById('overview-receitas');
    if (overviewReceitasEl) {
      overviewReceitasEl.innerText = formatCurrency(totalReceitas);
    }
  };

  const updateView = () => {
    const userName = userData?.displayName || user.displayName || user.email?.split('@')[0] || 'Usuário';
    const shell = document.getElementById('dashboard-shell');

    // Recalculate preview whenever config changes or view updates
    const previsao = calcularPrevisaoFinanceira(financeiroConfig);
    globalFinance.totalFixedExpenses = previsao.totalDescontos;

    if (shell) {
      const content = document.getElementById('dashboard-dynamic-content');
      if (content) {
        recalculateBalance();

        content.innerHTML = DashboardContent(
          userName, 
          financeiroConfig, 
          ccSummary, 
          allCashAccounts, 
          activeAccountIds, 
          globalFinance.totalAccountsBalance, 
          overviewToggles, 
          pendingSubscriptionsTotal, 
          paidSubscriptionsTotal,
          pendingRemindersTotal, 
          paidRemindersTotal,
          pendingReminderIncomeTotal,
          paidReminderIncomeTotal
        );

        // Animate balance with liquid effect
        animateBalanceChange(globalFinance.totalAccountsBalance);

        // Animate card entrance with liquid physics
        animateAccountsCardEntrance();

        // Animate overview cards with liquid entrance
        animateOverviewCardsEntrance();

        // Animate summary cards (Receitas, Despesas, Saldo Total)
        animateSummaryCardsEntrance();

        // Animate bottom cards (Categoria e Dia)
        animateBottomCardsEntrance();

        // Initialize category spent chart
        attachCategorySpentChartListeners(categorySpentData);

        // Initialize spending calendar
        attachSpendingCalendarListeners(allCurrentTransactions);

        const fixedExpEl = document.getElementById('total-fixed-expenses');

        if (fixedExpEl) fixedExpEl.innerText = formatCurrency(globalFinance.totalFixedExpenses);

        const stackContainer = document.getElementById('cc-stack-container');
        if (stackContainer) {
          if (ccSummary.isLoading) {
            stackContainer.innerHTML = `<div class="cc-empty-state"><div class="cc-spinner"></div><p class="text-[12px] text-[var(--color-text-secondary)] font-medium">Carregando cartões...</p></div>`;
          } else if (ccSummary.cards.length === 0) {
            stackContainer.innerHTML = renderEmptyCard();
          } else {
            stackContainer.innerHTML = ccSummary.cards.map((card, idx) => renderCardItem(card, idx, ccSummary.activeCardIndex, ccSummary)).join('');
          }
        }
        bindStackListeners();
        attachAccountsListeners(user.uid, activeAccountIds, updateAccountsViewOnly);
        bindConfigListeners();
        maybeOpenPendingWelcomeModal();
      }
      return;
    }

    listenersAttached = false;
    recalculateBalance();
    app.innerHTML = `
      <div id="dashboard-shell" class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
        ${BrilhoHeader()}
        ${Header({ user: { ...user, ...userData } })}
        <main class="flex-1 w-full max-w-6xl mx-auto px-6 md:px-10 p-4 md:p-8 pt-20 md:pt-24 min-w-0">
          <div class="w-full" id="dashboard-dynamic-content">
            ${DashboardContent(
              userName, 
              financeiroConfig, 
              ccSummary, 
              allCashAccounts, 
              activeAccountIds, 
              globalFinance.totalAccountsBalance, 
              overviewToggles, 
              pendingSubscriptionsTotal, 
              paidSubscriptionsTotal,
              pendingRemindersTotal, 
              paidRemindersTotal,
              pendingReminderIncomeTotal,
              paidReminderIncomeTotal
            )}
          </div>
        </main>
      </div>
    `;

    // Ensure values are correct on first render
    const balanceEl = document.getElementById('total-accounts-balance');
    if (balanceEl) balanceEl.innerText = formatCurrency(globalFinance.totalAccountsBalance);
    const fixedExpEl = document.getElementById('total-fixed-expenses');
    if (fixedExpEl) fixedExpEl.innerText = formatCurrency(globalFinance.totalFixedExpenses);

    // Liquid entrance animations
    animateAccountsCardEntrance();
    animateOverviewCardsEntrance();
    animateSummaryCardsEntrance();
    animateBottomCardsEntrance();
    attachCategorySpentChartListeners(categorySpentData);
    attachSpendingCalendarListeners(allCurrentTransactions);

    attachHeaderListeners();

    attachInternalListeners();
    maybeOpenPendingWelcomeModal();
  };

  // ─── Targeted update: only re-render credit card stack (no overview/accounts reload) ──
  const updateCreditCardStackOnly = () => {
    const stackContainer = document.getElementById('cc-stack-container');
    if (!stackContainer) return;

    if (ccSummary.isLoading) {
      stackContainer.innerHTML = `<div class="cc-empty-state"><div class="cc-spinner"></div><p class="text-[12px] text-[var(--color-text-secondary)] font-medium">Carregando cartões...</p></div>`;
    } else if (ccSummary.cards.length === 0) {
      stackContainer.innerHTML = `<div class="cc-empty-state"><p class="text-[12px] text-[var(--color-text-secondary)]">Nenhum cartão conectado.</p></div>`;
    } else {
      stackContainer.innerHTML = ccSummary.cards.map((card, idx) => renderCardItem(card, idx, ccSummary.activeCardIndex, ccSummary)).join('');
    }
    bindStackListeners();
  };

  let dragState: DragState = { active: false, startX: 0, lastX: 0, velocityX: 0, lastTime: 0 };

  function commitSwipe(direction: 'left' | 'right') {
    const container = document.getElementById('cc-stack-container');
    if (!container) return;
    const activeCard = container.querySelector<HTMLElement>(`[data-card-index="${ccSummary.activeCardIndex}"]`);
    const canGo = direction === 'left' ? ccSummary.activeCardIndex < ccSummary.cards.length - 1 : ccSummary.activeCardIndex > 0;
    if (!canGo) { snapBack(ccSummary.activeCardIndex); return; }
    animateCardThrow(activeCard!, direction, () => {
      if (direction === 'left') ccSummary.activeCardIndex++; else ccSummary.activeCardIndex--;
      updateCreditCardStackOnly();
      const nextContainer = document.getElementById('cc-stack-container');
      const nextActive = nextContainer?.querySelector<HTMLElement>(`[data-card-index="${ccSummary.activeCardIndex}"]`);
      if (nextActive) {
        animateCardEnter(nextActive, direction === 'left' ? 'right' : 'left');
        animateStackReorder(nextContainer!, ccSummary.activeCardIndex);
      }
    });
  }

  const onStart = (x: number) => {
    if (ccSummary.cards.length <= 1) return;
    dragState = { active: true, startX: x, lastX: x, velocityX: 0, lastTime: performance.now() };
  };

  const onMove = (x: number) => {
    if (!dragState.active) return;
    const now = performance.now();
    const dt = now - dragState.lastTime;
    if (dt > 0) dragState.velocityX = (x - dragState.lastX) / dt;
    dragState.lastX = x; dragState.lastTime = now;
    applyDragTransform(x - dragState.startX, ccSummary.activeCardIndex);
  };

  const onEnd = (x: number) => {
    if (!dragState.active) return;
    dragState.active = false;
    const dx = x - dragState.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dragState.velocityX) > VELOCITY_THRESHOLD) {
      commitSwipe(dx < 0 ? 'left' : 'right');
    } else {
      snapBack(ccSummary.activeCardIndex);
    }
  };

  const mm = (e: MouseEvent) => onMove(e.clientX);
  const mu = (e: MouseEvent) => onEnd(e.clientX);

  const bindStackListeners = () => {
    // Filter Dropdown
    attachCreditCardFilterListeners((type) => {
      ccSummary.faturaSelecionada = type;
      persistCreditCardExpenseConfig();
      updateCreditCardStackOnly();
      updateOverviewForecast();
    }, () => {
      const activeCard = ccSummary.cards[ccSummary.activeCardIndex];
      if (!activeCard) return;

      activeCard.includeInExpenses = !activeCard.includeInExpenses;
      if (activeCard.includeInExpenses) hiddenExpenseCardIds.delete(activeCard.id);
      else hiddenExpenseCardIds.add(activeCard.id);

      persistCreditCardExpenseConfig();
      updateCreditCardStackOnly();
      updateOverviewForecast();
    });

    // 3. Drag Gesture Listeners
    const stack = document.getElementById('cc-draggable-zone');
    if (stack && stack.dataset.dragListenersBound !== 'true') {
      stack.dataset.dragListenersBound = 'true';

      // Mouse events
      stack.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).closest('#dashboard-cc-filter-trigger') || (e.target as HTMLElement).closest('.generic-dropdown')) return;
        e.preventDefault();
        onStart(e.clientX);
      });

      // Touch events (passive to avoid performance warnings)
      stack.addEventListener('touchstart', (e) => {
        if ((e.target as HTMLElement).closest('#dashboard-cc-filter-trigger') || (e.target as HTMLElement).closest('.generic-dropdown')) return;
        onStart(e.touches[0].clientX);
      }, { passive: true });

      stack.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
      stack.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientX));
    }
  };

  const attachInternalListeners = () => {
    if (listenersAttached) return;
    listenersAttached = true;

    // One-time initialization 
    initEmptyStateLotties();
    document.getElementById('btn-connect-bank-header')?.addEventListener('click', openBankConnectModal);
    document.getElementById('btn-connect-first-bank')?.addEventListener('click', openBankConnectModal);

    // Initial binding for elements that exist now
    bindStackListeners();
    attachAccountsListeners(user.uid, activeAccountIds, updateView);
    bindConfigListeners();

    // Global window listeners for the drag gesture
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);

    // Cleanup on navigation
    window.addEventListener('app-navigate', () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    }, { once: true });
  };


  // Moved to component

  const updateOverviewForecast = () => {
    const { displayReceitas, displayDespesas, saldoPrevisto, hasActiveProjection, pendingRemindersTotal: remsPendingVal, pendingSubscriptionsTotal: subsPendingVal } = calculateOverviewTotals(
      financeiroConfig,
      ccSummary,
      globalFinance.totalAccountsBalance,
      overviewToggles,
      {
        subsPending: pendingSubscriptionsTotal,
        subsPaid: paidSubscriptionsTotal,
        remsIncomePending: pendingReminderIncomeTotal,
        remsIncomePaid: paidReminderIncomeTotal,
        remsExpensePending: pendingRemindersTotal,
        remsExpensePaid: paidRemindersTotal
      }
    );

    const [r, c] = formatCurrency(saldoPrevisto).split(',');
    const valueEl = document.getElementById('overview-saldo-previsto');
    if (valueEl) {
      valueEl.innerHTML = `${r}<span class="text-[16px] md:text-[18px] font-medium text-[var(--color-text-secondary)]">,${c}</span>`;
      gsap.fromTo(valueEl, { scale: 1.05, filter: 'blur(2px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' });
    }

    const hasActive = hasActiveProjection;
    const subtitleEl = document.getElementById('overview-subtitle');
    if (subtitleEl) subtitleEl.textContent = hasActive ? 'Previsão de saldo livre este mês' : 'Salário líquido estimado este mês';

    const receitasEl = document.getElementById('overview-receitas');
    if (receitasEl) {
      receitasEl.textContent = formatCurrency(displayReceitas);
      gsap.fromTo(receitasEl, { scale: 1.05, filter: 'blur(2px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' });
    }

    const despesasEl = document.getElementById('overview-despesas');
    if (despesasEl) {
      despesasEl.textContent = formatCurrency(displayDespesas);
      gsap.fromTo(despesasEl, { scale: 1.05, filter: 'blur(2px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' });
    }

    const bothActive = overviewToggles.assinatura && overviewToggles.lembretes;
    const onlySubs = overviewToggles.assinatura && !overviewToggles.lembretes;
    const onlyRems = overviewToggles.lembretes && !overviewToggles.assinatura;
    const noneActive = !overviewToggles.assinatura && !overviewToggles.lembretes;

    const subsPendingEl = document.getElementById('overview-subs-pending');
    if (subsPendingEl) subsPendingEl.textContent = formatCurrency(subsPendingVal);
    const remsPendingEl = document.getElementById('overview-rems-pending');
    if (remsPendingEl) remsPendingEl.textContent = formatCurrency(remsPendingVal);
    const combinedEl = document.getElementById('overview-combined-pending');
    if (combinedEl) combinedEl.textContent = formatCurrency(subsPendingVal + remsPendingVal);

    document.getElementById('overview-subs-row')?.classList.toggle('hidden', !onlySubs);
    document.getElementById('overview-rems-row')?.classList.toggle('hidden', !onlyRems);
    document.getElementById('overview-combined-row')?.classList.toggle('hidden', !bothActive);
    document.getElementById('overview-despesas-row')?.classList.toggle('hidden', !noneActive);
  };

  const bindConfigListeners = () => {
    attachOverviewConfigListeners((key, value) => {
      (overviewToggles as any)[key] = value;
      saveOverviewToggles(user.uid, overviewToggles);
      updateOverviewForecast();
    });
  };

  const loadRecurrenceData = async () => {
    try {
      const monthKey = toMonthKey(new Date());
      const [subsSnap, billingsSnap, remsSnap, remBillingsSnap] = await Promise.all([
        getDocs(collection(db, `users/${user.uid}/subscriptions`)),
        getDocs(collection(db, `users/${user.uid}/billings`)),
        getDocs(collection(db, `users/${user.uid}/reminders`)),
        getDocs(collection(db, `users/${user.uid}/reminder_billings`)),
      ]);

      // Index subscription billings
      const billingsBySubId = new Map<string, any[]>();
      billingsSnap.docs.forEach(d => {
        const b = d.data();
        const arr = billingsBySubId.get(b.subscriptionId) || [];
        arr.push(b);
        billingsBySubId.set(b.subscriptionId, arr);
      });

      let subsPending = 0;
      let subsPaid = 0;
      const todayMonthKey = toMonthKey(new Date());
      subsSnap.docs.forEach(d => {
        const sub = { id: d.id, ...d.data() } as any;
        if (sub.source === 'pluggy-auto') return;

        // Same filter as Subscriptions page refreshSummaryCards
        const billings = billingsBySubId.get(sub.id) ?? [];
        const createdMonth = sub.createdAt?.toDate
          ? toMonthKey(sub.createdAt.toDate())
          : (sub.createdAt ? toMonthKey(new Date(sub.createdAt)) : monthKey);
        const isInMonth = billings.length === 0 ||
          billings.some((b: any) => b.month === monthKey) ||
          monthKey >= createdMonth;
        if (!isInMonth) return;

        const val = Number(sub.value ?? sub.amount ?? 0) || 0;
        const billing = billings.find((b: any) => b.month === monthKey);
        const isPaid = billing?.status === 'paid' || sub.status === 'paid' || sub.paid === true ||
          (Array.isArray(sub.paidMonths) && sub.paidMonths.includes(monthKey));

        if (isPaid) {
          subsPaid += val;
        } else {
          // Yearly subscriptions only count as pending in the current calendar month
          if (sub.frequency !== 'yearly' || monthKey === todayMonthKey) {
            subsPending += val;
          }
        }
      });

      // Index reminder billings
      const billingsByRemId = new Map<string, any[]>();
      remBillingsSnap.docs.forEach(d => {
        const b = d.data();
        const arr = billingsByRemId.get(b.reminderId) || [];
        arr.push(b);
        billingsByRemId.set(b.reminderId, arr);
      });

      let remsExpPending = 0;
      let remsExpPaid = 0;
      let remsIncPending = 0;
      let remsIncPaid = 0;
      
      remsSnap.docs.forEach(d => {
        const rem = { id: d.id, ...d.data() } as any;

        const val = Number(rem.value ?? rem.amount ?? 0) || 0;
        const isIncome = rem.type === 'income';

        // Same paid check as Reminders page refreshSummary
        const billing = (billingsByRemId.get(rem.id) || []).find((b: any) => b.month === monthKey);
        const isPaidThisMonth = billing?.status === 'paid' || rem.status === 'paid' || rem.paid === true ||
          (Array.isArray(rem.paidMonths) && rem.paidMonths.includes(monthKey));

        // Same filter as Reminders page refreshSummary
        let isActive = false;
        if (rem.dueDate) {
          const dueMonthKey = rem.dueDate.substring(0, 7);
          if (rem.frequency === 'yearly') {
            isActive = rem.dueDate.substring(5, 7) === monthKey.substring(5, 7);
          } else if (rem.frequency === 'once') {
            if (dueMonthKey === monthKey) isActive = true;
            else {
              const isDocPaid = rem.status === 'paid' || rem.paid === true ||
                (Array.isArray(rem.paidMonths) && rem.paidMonths.includes(dueMonthKey));
              if (dueMonthKey < monthKey && !isDocPaid) isActive = true;
            }
          } else {
            isActive = monthKey >= dueMonthKey;
          }
        } else {
          const remBillings = billingsByRemId.get(rem.id) || [];
          if (remBillings.some((b: any) => b.month === monthKey)) {
            isActive = true;
          } else {
            const created = rem.createdAt?.toDate ? toMonthKey(rem.createdAt.toDate()) : monthKey;
            isActive = monthKey >= created || rem.frequency === 'once';
          }
        }

        if (isActive) {
          if (isIncome) {
            if (isPaidThisMonth) remsIncPaid += val;
            else remsIncPending += val;
          } else {
            if (isPaidThisMonth) remsExpPaid += val;
            else remsExpPending += val;
          }
        }
      });

      pendingSubscriptionsTotal = subsPending;
      paidSubscriptionsTotal = subsPaid;
      pendingRemindersTotal = remsExpPending;
      paidRemindersTotal = remsExpPaid;
      pendingReminderIncomeTotal = remsIncPending;
      paidReminderIncomeTotal = remsIncPaid;

      // Atualiza os cards de resumo e a previsão
      updateView();
    } catch (err) {
      console.error('Error loading recurrence data:', err);
    }
  };

  const loadAllData = async () => {
    try {
      const [accounts, creditTransactions, bills, transactions, categoryMappings, remSnap, remBillSnap] = await Promise.all([
        loadPluggyRecords<any>(user.uid, 'accounts'),
        loadPluggyRecords<any>(user.uid, 'creditCardTransactions'),
        loadPluggyRecords<any>(user.uid, 'creditCardBills'),
        loadPluggyRecords<any>(user.uid, 'transactions'),
        CategoryService.ensureCategoryMappings(user.uid),
        getDocs(collection(db, `users/${user.uid}/reminders`)),
        getDocs(collection(db, `users/${user.uid}/reminder_billings`))
      ]);

      const reminders = remSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const reminderBillings = remBillSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));


      const isPluggySavings = (acc: any) => {
        const type = (acc.type || '').toUpperCase();
        const subtype = (acc.subtype || '').toUpperCase();
        const originalType = (acc.originalType || '').toUpperCase();
        const originalSubtype = (acc.originalSubtype || '').toUpperCase();
        const name = (acc.name || '').toLowerCase();
        return (
          type === 'SAVINGS' ||
          subtype === 'SAVINGS_ACCOUNT' || subtype === 'SAVINGS' ||
          originalType === 'SAVINGS_ACCOUNT' || originalType === 'SAVINGS' ||
          originalSubtype === 'SAVINGS_ACCOUNT' || originalSubtype === 'SAVINGS' ||
          name.includes('poupan') || name.includes('caixinha')
        );
      };

      // 1. Calculate Total Accounts Balance (All non-credit accounts with balance)
      allCashAccounts = accounts.filter(acc => acc.type !== 'CREDIT' && !isPluggySavings(acc) && (acc.balance || 0) > 0);

      // Sync activeAccountIds with current accounts (remove IDs that no longer exist)
      const currentIds = new Set(allCashAccounts.map(a => a.id));
      for (const id of activeAccountIds) {
        if (!currentIds.has(id)) activeAccountIds.delete(id);
      }

      // If nothing selected (or new user), select all
      if (activeAccountIds.size === 0 && allCashAccounts.length > 0) {
        allCashAccounts.forEach(acc => activeAccountIds.add(acc.id));
      }

      recalculateBalance();

      // 2. Initial Credit Card Logic
      const creditCards = accounts.filter(acc => acc.type === 'CREDIT');
      const availableCreditCardIds = new Set(creditCards.map(card => card.id));
      hiddenExpenseCardIds = new Set(Array.from(hiddenExpenseCardIds).filter(id => availableCreditCardIds.has(id)));
      const billConstructor = new BillConstructor();
      let tf = 0, tu = 0, tl = 0, td = 0;
      const summaries: CardInfo[] = creditCards.map(card => {
        const txs = creditTransactions.filter(t => t.accountId === card.id);
        const bls = bills.filter(b => b.accountId === card.id);
        const invs = billConstructor.buildInvoicesPluggyFirst(card, bls, txs);
        const cur = invs.find(i => i.typeKey === 'current');
        const lst = invs.find(i => i.typeKey === 'last');
        const cTotal = cur ? cur.transactions.reduce((acc, t) => acc + (t.amount || 0), 0) : 0;
        const lTotal = lst ? lst.transactions.reduce((acc, t) => acc + (t.amount || 0), 0) : 0;
        const lim = card.creditData?.creditLimit || 0;
        const dsp = card.creditData?.availableCreditLimit || 0;
        tf += cTotal; tu += lTotal; tl += lim; td += dsp;
        return {
          id: card.id, name: getAccountDisplayName(card), brand: card.creditData?.brand || 'VISA',
          faturaAtual: cTotal, faturaUltima: lTotal, faturaHistorico: lim - dsp, includeInExpenses: !hiddenExpenseCardIds.has(card.id), limite: lim, disponivel: dsp,
          percentualUso: Math.min(100, lim > 0 ? (Math.abs(cTotal) / lim) * 100 : 0),
          institution: card.institution
        };
      });

      ccSummary = {
        ...ccSummary,
        cards: summaries, totFatura: tf, totUltima: tu, totHistorico: tl - td,
        activeCardIndex: Math.min(ccSummary.activeCardIndex, Math.max(0, summaries.length - 1)),
        isLoading: false
      };
      persistCreditCardExpenseConfig();


      // 3. Process Category Spending for the current month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const catMap = CategoryService.buildCategoryMap(categoryMappings);

      const allSpending = [
        ...transactions.filter(t => t.type === 'DEBIT'),
        ...creditTransactions
      ].filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      // Prepare data for the calendar (includes income and reminders)
      const calendarReminders: any[] = [];
      const monthKey = toMonthKey(new Date());

      reminders.forEach(rem => {
        if (!rem.dueDate) return;

        let date: Date | null = null;
        if (rem.frequency === 'monthly') {
          const day = parseInt(rem.dueDate.substring(8, 10));
          date = new Date(currentYear, currentMonth, day);
        } else if (rem.frequency === 'yearly') {
          const monthDay = rem.dueDate.substring(5, 10); // MM-DD
          date = new Date(`${currentYear}-${monthDay}T12:00:00`);
        } else if (rem.frequency === 'once' || !rem.frequency) {
          const d = new Date(rem.dueDate + 'T12:00:00');
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            date = d;
          }
        }

        if (date && date.getMonth() === currentMonth) {
          // Check if paid
          const billing = reminderBillings.find((b: any) => b.reminderId === rem.id && b.month === monthKey);
          const isPaid = billing?.status === 'paid' || rem.status === 'paid' || rem.paid === true;

          calendarReminders.push({
            ...rem,
            id: `rem-${rem.id}`,
            date: date.toISOString(),
            amount: rem.type === 'income' ? Math.abs(rem.value || rem.amount || 0) : -Math.abs(rem.value || rem.amount || 0),
            type: rem.type === 'income' ? 'CREDIT' : 'DEBIT',
            description: rem.name || rem.description || 'Lembrete',
            isReminder: true,
            isPaid
          });
        }
      });

      // Map categories to display names
      const categoryMap = CategoryService.buildCategoryMap(categoryMappings);

      allCurrentTransactions = [
        ...transactions,
        ...creditTransactions,
        ...calendarReminders
      ].filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).map(t => {
        const displayName = getCategoryName(t, categoryMap);
        return { ...t, category: displayName };
      });

      const spentByCat = new Map<string, number>();
      allSpending.forEach(t => {
        const catName = getCategoryName(t, catMap);
        const val = Math.abs(t.amount || 0);
        spentByCat.set(catName, (spentByCat.get(catName) || 0) + val);
      });


      categorySpentData = Array.from(spentByCat.entries())
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);

      globalFinance.isLoading = false;

      updateView();
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      ccSummary.isLoading = false;
      globalFinance.isLoading = false;
      updateView();
    }
  };

  loadAllData();
  loadRecurrenceData();
  const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      userData = data;
      // Formato web legado
      const config = data.financeiro || data.financeiroConfig;
      if (config) {
        financeiroConfig = { ...financeiroConfig, ...config };
      }

      // Formato mobile (app iOS/Android): data.financial.salary / data.financial.advance
      const mSalary = data.financial?.salary;
      const mAdvance = data.financial?.advance;
      if (mSalary?.base !== undefined) {
        financeiroConfig.salarioBase = Number(mSalary.base);
      }
      if (mSalary?.payday !== undefined) {
        const p = mSalary.payday;
        if (typeof p === 'string') {
          const m = p.match(/^(\d+)/);
          if (m) financeiroConfig.diaPagamento = parseInt(m[1]);
        } else if (typeof p === 'number') {
          financeiroConfig.diaPagamento = p;
        }
      }
      if (mAdvance?.enabled !== undefined) {
        financeiroConfig.habilitarVale = Boolean(mAdvance.enabled);
      }
      if (mAdvance?.value !== undefined) {
        const rawVal = Number(mAdvance.value);
        const advType = mAdvance?.type ?? 'percentage';
        if (advType !== 'percentage' || rawVal > 100) {
          // Mobile saved as fixed BRL amount — convert to percentage
          if (financeiroConfig.salarioBase > 0) {
            financeiroConfig.porcentagemVale = Math.min(100, (rawVal / financeiroConfig.salarioBase) * 100);
          }
        } else {
          financeiroConfig.porcentagemVale = rawVal;
        }
      }
      if (mAdvance?.day !== undefined) {
        financeiroConfig.diaVale = Number(mAdvance.day);
      }
      if (mAdvance?.isExempt !== undefined || mSalary?.isExempt !== undefined) {
        financeiroConfig.isentarDesconto = Boolean(mAdvance?.isExempt ?? mSalary?.isExempt);
      }
      if (Array.isArray(data.financial?.discounts) && data.financial.discounts.length > 0) {
        financeiroConfig.descontosPersonalizados = data.financial.discounts.map((d: any) => ({
          id: d.id || Date.now().toString(),
          nome: d.nome || d.name || '',
          valor: Number(d.valor ?? d.value ?? 0),
          tipo: (d.tipo || d.type || 'fixo') as 'fixo' | 'percentual',
        }));
      }

      // Raiz: 'salario' / 'salarioBase' / 'diaPagamento' (prioridade menor — sobrescritos acima se mobile tiver dados)
      if (!mSalary && (data.salario !== undefined || data.salarioBase !== undefined)) {
        financeiroConfig.salarioBase = Number(data.salario ?? data.salarioBase ?? financeiroConfig.salarioBase);
      }
      if (!mSalary && data.diaPagamento !== undefined) {
        financeiroConfig.diaPagamento = Number(data.diaPagamento);
      }
      
      updateView();
    } else updateView();
  });
  window.addEventListener('app-navigate', () => unsub(), { once: true });
}
