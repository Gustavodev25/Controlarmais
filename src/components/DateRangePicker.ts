import gsap from 'gsap';
// Remove GenericDropdown dependency

export interface DateRangePickerOptions {
  id: string;
  initialStart?: string;
  initialEnd?: string;
  onChange: (start: string, end: string) => void;
}

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const PT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STYLE_ID = 'date-range-picker-styles';
const CSS = `
  .date-range-day {
    width: 28px;
    height: 28px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text);
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    cursor: pointer;
    transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease, opacity 0.14s ease;
  }
  .date-range-day:hover {
    background: var(--color-surface-hover);
  }
  .date-range-day.is-muted {
    color: var(--color-text-secondary);
    opacity: 0.5;
  }
  .date-range-day.is-selected {
    background: var(--color-primary);
    color: #fff;
    font-weight: 700;
    opacity: 1;
  }
  .date-range-day.is-in-range {
    background: color-mix(in srgb, var(--color-primary) 20%, transparent);
    color: var(--color-text);
    font-weight: 600;
    opacity: 1;
  }
  .date-range-day.is-today:not(.is-selected):not(.is-in-range) {
    border-color: var(--color-border);
  }
  .date-range-actions {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .date-range-ghost-btn {
    height: 30px;
    padding: 0 11px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease, transform 0.14s ease;
  }
  .date-range-ghost-btn:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-border);
    color: var(--color-text);
  }
  .date-range-ghost-btn:active {
    transform: scale(0.96);
  }
`;

function ensureDateRangePickerStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function DateRangePicker({ id }: { id: string }): string {
  ensureDateRangePickerStyles();

  const customContent = `
    <div class="p-3 w-[260px] select-none" id="${id}-calendar-container">
      <div class="flex items-center justify-between mb-3">
        <button id="${id}-prev-month" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div id="${id}-current-month" class="text-[13px] font-bold tracking-tight text-[var(--color-text)]"></div>
        <button id="${id}-next-month" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 mb-2 text-center">
        ${PT_WEEKDAYS.map(day => `<div class="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">${day}</div>`).join('')}
      </div>
      <div id="${id}-days-grid" class="grid grid-cols-7 gap-y-1 text-center"></div>
      
      <div class="date-range-actions">
        <button id="${id}-clear-btn" type="button" class="date-range-ghost-btn">Limpar</button>
        <button id="${id}-apply-btn" type="button" class="date-range-ghost-btn">Aplicar</button>
      </div>
    </div>
  `;

  return `
    <div class="relative flex-shrink-0" id="${id}-wrap">
      <button id="${id}-trigger" type="button" class="date-range-trigger flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 h-[34px] cursor-pointer transition-colors hover:border-[var(--color-text-secondary)] select-none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span class="text-[11.5px] font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">Criação:</span>
        <span id="${id}-display" class="text-[12px] font-medium text-[var(--color-text-secondary)] min-w-[125px] whitespace-nowrap">Selecionar período</span>
      </button>
      <div id="${id}-menu" class="fixed flex-col bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl overflow-hidden" style="display: none; opacity: 0; transform-origin: top center; width: 280px; z-index: 999999; border-radius: 20px;">
        ${customContent}
      </div>
    </div>
  `;
}

export function attachDateRangePickerListeners(options: DateRangePickerOptions) {
  ensureDateRangePickerStyles();

  const { id, initialStart, initialEnd, onChange } = options;
  
  let startDate: Date | null = initialStart ? new Date(initialStart + 'T00:00:00') : null;
  let endDate: Date | null = initialEnd ? new Date(initialEnd + 'T00:00:00') : null;
  
  if (startDate && isNaN(startDate.getTime())) startDate = null;
  if (endDate && isNaN(endDate.getTime())) endDate = null;

  let currentViewDate = startDate || new Date();
  let hoverDate: Date | null = null;
  let isSelecting = false;

  let displayEl = document.getElementById(`${id}-display`);
  const monthEl = document.getElementById(`${id}-current-month`);
  const daysGrid = document.getElementById(`${id}-days-grid`);
  const prevBtn = document.getElementById(`${id}-prev-month`);
  const nextBtn = document.getElementById(`${id}-next-month`);
  const clearBtn = document.getElementById(`${id}-clear-btn`);
  const applyBtn = document.getElementById(`${id}-apply-btn`);

  const triggerEl = document.getElementById(`${id}-trigger`);
  const menuEl = document.getElementById(`${id}-menu`);

  let isOpen = false;

  const closeMenu = () => {
    if (!isOpen || !menuEl) return;
    isOpen = false;
    gsap.to(menuEl, { opacity: 0, y: -10, scale: 0.95, duration: 0.2, ease: 'power2.in', onComplete: () => {
      menuEl.style.display = 'none';
    }});
  };

  if (triggerEl && menuEl) {
    const newTrigger = triggerEl.cloneNode(true) as HTMLElement;
    triggerEl.parentNode?.replaceChild(newTrigger, triggerEl);
    displayEl = newTrigger.querySelector<HTMLElement>(`#${id}-display`) || displayEl;

    const positionMenu = () => {
      const rect = newTrigger.getBoundingClientRect();
      menuEl.style.top = `${rect.bottom + 6}px`;
      
      let left = rect.left;
      if (left + 280 > window.innerWidth) left = window.innerWidth - 290;
      menuEl.style.left = `${Math.max(10, left)}px`;
    };

    newTrigger.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    
    newTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isOpen) {
        closeMenu();
      } else {
        if (menuEl.parentElement !== document.body) {
          document.body.appendChild(menuEl);
        }
        isOpen = true;
        menuEl.style.display = 'flex';
        positionMenu();
        
        gsap.fromTo(menuEl, 
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'elastic.out(1.15, 0.4)' }
        );
      }
    });

    document.addEventListener('click', (e) => {
      if (isOpen && !menuEl.contains(e.target as Node) && !newTrigger.contains(e.target as Node)) {
        closeMenu();
      }
    });

    window.addEventListener('resize', () => {
      if (isOpen) positionMenu();
    });
    window.addEventListener('scroll', () => {
      if (isOpen) positionMenu();
    }, true);
  }

  function formatDateDisplay(d: Date) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function updateDisplay() {
    if (displayEl) {
      if (startDate && endDate) {
        displayEl.textContent = `${formatDateDisplay(startDate)} até ${formatDateDisplay(endDate)}`;
        displayEl.classList.remove('text-[var(--color-text-secondary)]');
        displayEl.classList.add('text-[var(--color-text)]');
      } else if (startDate) {
        displayEl.textContent = `${formatDateDisplay(startDate)} ...`;
        displayEl.classList.remove('text-[var(--color-text-secondary)]');
        displayEl.classList.add('text-[var(--color-text)]');
      } else {
        displayEl.textContent = 'Selecionar período';
        displayEl.classList.remove('text-[var(--color-text)]');
        displayEl.classList.add('text-[var(--color-text-secondary)]');
      }
    }
  }

  function renderCalendar() {
    if (!monthEl || !daysGrid) return;
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    monthEl.textContent = `${PT_MONTHS[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayIndex = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    let html = '';
    
    // Prev month days
    for (let i = firstDayIndex; i > 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i + 1);
      html += buildDayHtml(d, true);
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      html += buildDayHtml(d, false);
    }
    
    // Next month days
    const totalRendered = firstDayIndex + daysInMonth;
    const remainingSlots = totalRendered % 7 === 0 ? 0 : 7 - (totalRendered % 7);
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      html += buildDayHtml(d, true);
    }
    
    daysGrid.innerHTML = html;
    attachDayListeners();
  }

  function getDayClasses(date: Date, isMuted: boolean): string[] {
    const time = date.getTime();
    const isStart = startDate && time === startDate.getTime();
    const isEnd = endDate && time === endDate.getTime();
    
    let inRange = false;
    let isHoverRange = false;
    
    if (startDate && endDate) {
      inRange = time > startDate.getTime() && time < endDate.getTime();
    } else if (startDate && isSelecting && hoverDate) {
      if (startDate.getTime() < hoverDate.getTime()) {
        isHoverRange = time > startDate.getTime() && time <= hoverDate.getTime();
      } else {
        isHoverRange = time >= hoverDate.getTime() && time < startDate.getTime();
      }
    }

    const classes = ['date-range-day', 'cal-day-btn'];
    
    if (isStart || isEnd) {
      classes.push('is-selected');
    } else if (inRange || isHoverRange) {
      classes.push('is-in-range');
    } else {
      if (isMuted) classes.push('is-muted');
    }
    
    const today = new Date();
    if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      classes.push('is-today');
    }

    return classes;
  }

  function buildDayHtml(date: Date, isMuted: boolean) {
    const time = date.getTime();
    const classes = getDayClasses(date, isMuted);
    return `<button type="button" class="${classes.join(' ')}" data-time="${time}" data-muted="${isMuted ? '1' : '0'}">${date.getDate()}</button>`;
  }

  function updateDayStates() {
    if (!daysGrid) return;
    daysGrid.querySelectorAll<HTMLElement>('.cal-day-btn').forEach((button) => {
      const time = Number(button.dataset.time || 0);
      if (!time) return;
      const date = new Date(time);
      const isMuted = button.dataset.muted === '1';
      button.className = getDayClasses(date, isMuted).join(' ');
    });
  }

  function attachDayListeners() {
    if (!daysGrid) return;
    const buttons = daysGrid.querySelectorAll('.cal-day-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const time = parseInt((btn as HTMLElement).dataset.time || '0');
        const clickedDate = new Date(time);
        
        if (!isSelecting) {
          startDate = clickedDate;
          endDate = null;
          isSelecting = true;
        } else {
          if (startDate && clickedDate < startDate) {
            endDate = startDate;
            startDate = clickedDate;
          } else {
            endDate = clickedDate;
          }
          isSelecting = false;
        }
        
        updateDisplay();
        renderCalendar();
      });
      
      btn.addEventListener('mouseenter', () => {
        if (isSelecting) {
          const time = parseInt((btn as HTMLElement).dataset.time || '0');
          if (hoverDate?.getTime() === time) return;
          hoverDate = new Date(time);
          updateDayStates();
        }
      });
    });

    daysGrid.onmouseleave = () => {
      if (!isSelecting || !hoverDate) return;
      hoverDate = null;
      updateDayStates();
    };
  }

  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderCalendar();
  });

  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderCalendar();
  });

  clearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    startDate = null;
    endDate = null;
    isSelecting = false;
    hoverDate = null;
    updateDisplay();
    renderCalendar();
    
    // Auto apply on clear
    onChange('', '');
    closeMenu();
  });

  applyBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (startDate) {
      // If end date is null, use start date as end date
      const finalEnd = endDate || startDate;
      
      const fmtStart = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const fmtEnd = `${finalEnd.getFullYear()}-${String(finalEnd.getMonth() + 1).padStart(2, '0')}-${String(finalEnd.getDate()).padStart(2, '0')}`;
      
      onChange(fmtStart, fmtEnd);
      updateDisplay();
      closeMenu();
    }
  });

  updateDisplay();
  renderCalendar();
}
