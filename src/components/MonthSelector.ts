import {
  DynamicIsland,
  animateDynamicIslandEntrance,
  animateDynamicIslandTransition,
  type DynamicDirection,
} from './DynamicIsland';

export interface MonthSelectorOptions {
  id: string;
  initialDate?: Date;
  onMonthChange: (date: Date, monthKey: string) => void;
  className?: string;
}

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─── Auto-inject de estilos (roda UMA vez) ───────────────────────────────────

const STYLE_ID = 'month-selector-styles';

const CSS = `
  .month-selector-container .dynamic-island__content {
    gap: 0px;
    justify-content: center;
    overflow: visible;
  }

  .month-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    flex-shrink: 0;
  }
  .month-nav-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
  .month-nav-btn:active { transform: scale(0.92); }

  .month-selector-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text);
    white-space: nowrap;
    letter-spacing: -0.01em;
    padding: 0 4px;
    min-width: auto;
    text-align: center;
  }

  .month-today-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    flex-shrink: 0;
  }
  .month-today-btn:hover {
    background: transparent;
    transform: rotate(15deg);
  }
  .month-today-btn.hidden { display: none; }
`;

function ensureMonthSelectorStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [yearStr, monthStr] = key.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  const date = new Date(year, month, 1);
  date.setMonth(date.getMonth() + delta);

  return toMonthKey(date);
}

/** @deprecated Estilos agora são auto-injetados. Mantido para retrocompatibilidade. */
export const MonthSelectorStyles = '';

// ─── Render ──────────────────────────────────────────────────────────────────

export function MonthSelector({ id, className = '' }: { id: string, className?: string }): string {
  ensureMonthSelectorStyles();

  const todayLottie = '/assets/lottie/assinaturabranco.json';

  const innerContent = `
    <button id="${id}-prev" class="month-nav-btn relative z-10" type="button" aria-label="Mês anterior">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    
    <span id="${id}-label" class="month-selector-label"></span>
    <button id="${id}-today" class="month-today-btn hidden" type="button" aria-label="Voltar ao mês atual" title="Voltar para Hoje">
      <lottie-player src="${todayLottie}"
                     background="transparent" speed="1.2" loop autoplay
                     style="width: 18px; height: 18px;"></lottie-player>
    </button>
    
    <button id="${id}-next" class="month-nav-btn relative z-10" type="button" aria-label="Próximo mês">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  `;

  return DynamicIsland({
    id,
    content: innerContent,
    contentWrapperId: `${id}-content-wrapper`,
    className: `month-selector-container ${className}`,
    hidden: true,
    style: 'padding: 2px 2px; gap: 0px;',
  });
}

// ─── Listeners ───────────────────────────────────────────────────────────────

export function attachMonthSelectorListeners(options: MonthSelectorOptions) {
  ensureMonthSelectorStyles();

  const { id, initialDate = new Date(), onMonthChange } = options;
  let currentDate = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  const todayKey = toMonthKey(new Date());

  const container = document.getElementById(id);
  const contentWrapper = document.getElementById(`${id}-content-wrapper`);
  const label = document.getElementById(`${id}-label`);
  const prevBtn = document.getElementById(`${id}-prev`);
  const nextBtn = document.getElementById(`${id}-next`);
  const todayBtn = document.getElementById(`${id}-today`);

  if (!container || !label || !prevBtn || !nextBtn || !todayBtn || !contentWrapper) return;

  const animateTransition = (newDate: Date, direction: DynamicDirection) => {
    animateDynamicIslandTransition({
      containerId: id,
      contentWrapperId: `${id}-content-wrapper`,
      direction,
      onMidpoint: () => {
        currentDate = new Date(newDate);
        const monthName = PT_MONTHS[currentDate.getMonth()];
        const year = currentDate.getFullYear();
        label.textContent = `${monthName} ${year}`;

        const isToday = toMonthKey(currentDate) === todayKey;
        if (isToday) todayBtn.classList.add('hidden');
        else todayBtn.classList.remove('hidden');

        onMonthChange(new Date(currentDate), toMonthKey(currentDate));
      },
    });
  };

  prevBtn.addEventListener('click', () => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    animateTransition(nextDate, 'prev');
  });

  nextBtn.addEventListener('click', () => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    animateTransition(nextDate, 'next');
  });

  todayBtn.addEventListener('click', () => {
    const nextDate = new Date();
    animateTransition(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1), 'reset');
  });

  // Initial update without animation
  const monthName = PT_MONTHS[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  label.textContent = `${monthName} ${year}`;
  todayBtn.classList.toggle('hidden', toMonthKey(currentDate) === todayKey);

  // Show container with entrance animation
  container.classList.remove('dynamic-island--hidden');
  animateDynamicIslandEntrance(id, `${id}-content-wrapper`);

  return {
    getCurrentDate: () => new Date(currentDate),
    setCurrentDate: (d: Date) => {
      currentDate = new Date(d.getFullYear(), d.getMonth(), 1);
      const mName = PT_MONTHS[currentDate.getMonth()];
      const y = currentDate.getFullYear();
      label.textContent = `${mName} ${y}`;
      todayBtn.classList.toggle('hidden', toMonthKey(currentDate) === todayKey);
    }
  };
}