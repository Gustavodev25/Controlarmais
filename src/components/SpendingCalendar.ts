import gsap from 'gsap';
// Assumindo que você exportou as funções do DynamicIsland do seu arquivo
import { animateDynamicIslandTransition } from './DynamicIsland';
import { Modal } from './Modal';
import { initEmptyStateLotties } from './EmptyState';

export function SpendingCalendar(): string {
    return `
    <style>
      /* Esconde a scrollbar mas mantém a rolagem */
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      /* Classe para evitar seleção de texto durante o drag */
      .no-select {
        user-select: none;
        -webkit-user-select: none;
      }
    </style>
<div class="overview-card spending-calendar-card relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-col overflow-hidden z-10 h-full" style="will-change:transform; transform-origin:center center;">
<div class="overview-card-header px-4 py-2.5 border-b border-[var(--color-border-light)] bg-[var(--color-surface-hover)] rounded-t-2xl flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" class="text-[var(--color-text-secondary)] opacity-70">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p class="text-[9px] font-bold tracking-[0.14em] uppercase text-[var(--color-text-secondary)]">Gastos por dia</p>
        </div>
        <div class="flex items-center gap-3">
        </div>
      </div>
      <div id="spending-calendar-content" class="p-5 h-full min-h-[200px] flex flex-col items-center justify-center">
        <div class="flex items-center gap-3 animate-pulse opacity-30">
            <div class="w-2 h-2 rounded-full bg-white/20"></div>
            <span class="text-[12px] text-[var(--color-text-secondary)]">Sincronizando calendário...</span>
        </div>
      </div>
    </div>
  `;
}

export function attachSpendingCalendarListeners(transactions: any[]) {
    const container = document.getElementById('spending-calendar-content');
    if (!container) return;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    const transactionsByDay: Record<number, { incomes: number, expenses: number, hasReminder: boolean }> = {};

    transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const day = d.getDate();
            if (!transactionsByDay[day]) transactionsByDay[day] = { incomes: 0, expenses: 0, hasReminder: false };

            const amount = Math.abs(t.amount || 0);
            if (t.type === 'CREDIT') {
                transactionsByDay[day].incomes += amount;
            } else {
                transactionsByDay[day].expenses += amount;
            }

            if ((t as any).isReminder) {
                transactionsByDay[day].hasReminder = true;
            }
        }
    });

    const monthTitle = firstDay.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

    // HTML do calendário (sem Snap e sem fundo laranja)
    let html = `
        <div class="w-full flex flex-col h-full justify-center">
            <div class="flex items-center mb-4 px-1 justify-between w-full">
                <h3 class="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-[0.25em] opacity-80">
                    ${capitalizedMonth}
                </h3>
                <div class="opacity-30 select-none pointer-events-none">
                    <lottie-player
                        src="${localStorage.getItem('theme') === 'light' ? '/assets/lottie/swipepreto.json' : '/assets/lottie/swipe.json'}"
                        background="transparent"
                        speed="1"
                        style="width: 22px; height: 22px;"
                        class="es-lottie-bg"
                        direction="1"
                        mode="normal"
                    ></lottie-player>
                </div>
            </div>

            <div id="horizontal-calendar-scroll" class="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 pt-1 px-1 w-full cursor-grab active:cursor-grabbing no-select">
                
                ${Array(daysInMonth).fill(0).map((_, i) => {
        const day = i + 1;
        const dateObj = new Date(currentYear, currentMonth, day);
        const weekDayName = weekDays[dateObj.getDay()];
        const data = transactionsByDay[day];
        const isToday = day === today.getDate() && currentMonth === today.getMonth();

        const hasIncome = data && data.incomes > 0;
        const hasExpense = data && data.expenses > 0;

        // Removido o bg laranja (agora sempre bg-[#1A1A1A]), mas mantive a borda e texto
        return `
                        <div id="day-card-${day}" class="calendar-day-cell flex-shrink-0 w-16 h-20 rounded-xl border ${isToday ? 'border-[#D97757]/60 bg-[var(--color-surface-hover)]' : 'border-[var(--color-border-light)] bg-[var(--color-surface-hover)]'} flex flex-col items-center justify-center gap-1.5 group hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border)] transition-colors cursor-pointer" style="will-change: transform;">
                            
                            <div id="day-card-${day}-content" class="flex flex-col items-center justify-center w-full h-full pointer-events-none">
                                <span class="text-[8px] font-bold tracking-wider ${isToday ? 'text-[#D97757]' : 'text-[var(--color-text-secondary)] opacity-50'}">
                                    ${weekDayName}
                                </span>
                                
                                <span class="text-[16px] font-medium leading-none ${isToday ? 'text-[#D97757]' : 'text-[var(--color-text)] opacity-80 group-hover:opacity-100'} transition-opacity mt-1">
                                    ${day}
                                </span>
                                
                                <div class="flex gap-1 h-1 items-center justify-center mt-1.5">
                                    ${hasIncome ? `<div class="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_4px_rgba(16,185,129,0.3)]"></div>` : ''}
                                    ${hasExpense ? `<div class="w-1.5 h-1.5 rounded-full bg-red-500/80 shadow-[0_0_4px_rgba(239,68,68,0.3)]"></div>` : ''}
                                    ${data?.hasReminder ? `<div class="w-1.5 h-1.5 rounded-full bg-[#D97757] shadow-[0_0_4px_rgba(217,119,87,0.4)]"></div>` : ''}
                                </div>
                            </div>

                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Inicializar animação periódica do swipe
    setTimeout(() => initEmptyStateLotties(), 100);

    const scrollContainer = document.getElementById('horizontal-calendar-scroll');
    if (!scrollContainer) return;

    // 1. Animação de Entrada GSAP
    const cells = container.querySelectorAll('.calendar-day-cell');
    gsap.fromTo(cells,
        { opacity: 0, x: 20, scale: 0.9, filter: 'blur(4px)' },
        {
            opacity: 1, x: 0, scale: 1, filter: 'blur(0px)',
            duration: 0.6, stagger: 0.05, ease: 'back.out(1.2)', clearProps: 'all'
        }
    );

    // 2. Lógica de Drag to Scroll (Arrastar com o mouse)
    let isDown = false;
    let startX: number;
    let scrollLeft: number;
    let isDragging = false;

    scrollContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        isDragging = false;
        startX = e.pageX - scrollContainer.offsetLeft;
        scrollLeft = scrollContainer.scrollLeft;
    });

    scrollContainer.addEventListener('mouseleave', () => { isDown = false; });
    scrollContainer.addEventListener('mouseup', () => { isDown = false; });

    scrollContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - scrollContainer.offsetLeft;
        const walk = (x - startX) * 1.5; // Velocidade do arraste

        if (Math.abs(walk) > 3) isDragging = true; // Diferencia clique de arraste

        scrollContainer.scrollLeft = scrollLeft - walk;
    });

    // 3. Adicionando a animação Dynamic Island nos cards!
    cells.forEach((cell) => {
        cell.addEventListener('click', () => {
            // Se o usuário estava arrastando, não dispara o clique/animação
            if (isDragging) return;

            // Extrair o dia do ID
            const dayMatch = cell.id.match(/\d+$/);
            if (!dayMatch) return;
            const day = parseInt(dayMatch[0]);

            // Chama a animação elástica do seu componente usando a direção 'reset' (puxão vertical)
            animateDynamicIslandTransition({
                containerId: cell.id,
                contentWrapperId: `${cell.id}-content`,
                direction: 'reset', // 'reset' dá aquele quique esticado bonito!
                onMidpoint: () => {
                    // Filtrar as transações por este dia
                    const dayTransactions = transactions.filter(t => {
                        const d = new Date(t.date);
                        return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    });

                    // Formatador de moeda
                    const formatCurrency = (amount: number) => {
                        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
                    };

                    // Formatar o mês para o título
                    const monthName = new Date(currentYear, currentMonth, day).toLocaleString('pt-BR', { month: 'long' });
                    const formattedDate = `${day} de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

                    // Conteúdo do Modal com estética premium
                    const modalContent = `
                        <div class="space-y-4">
                            <!-- Lista de Transações -->
                            <div class="flex flex-col gap-2.5">
                                <div class="flex items-center justify-between px-1 mb-1">
                                    <h4 class="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-[0.2em] opacity-40">Movimentações</h4>
                                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-[var(--color-text-secondary)] opacity-40">${dayTransactions.length} itens</span>
                                </div>
                                <div class="max-h-[400px] overflow-y-auto pr-1 flex flex-col gap-2 hide-scrollbar">
                                    ${dayTransactions.length === 0 ? `
                                        <div class="flex flex-col items-center justify-center py-8">
                                            <div class="w-full h-[120px] flex items-center justify-center opacity-80 mb-2">
                                                <lottie-player
                                                    src="${localStorage.getItem('theme') === 'light' ? '/assets/lottie/calendariopreto.json' : '/assets/lottie/calendario.json'}"
                                                    background="transparent"
                                                    speed="1"
                                                    style="width: 100px; height: 100px;"
                                                    class="es-lottie-bg"
                                                    direction="1"
                                                    mode="normal"
                                                ></lottie-player>
                                            </div>
                                            <div class="text-center mt-4 space-y-1.5">
                                                <h3 class="text-[14px] font-bold text-[var(--color-text)] tracking-tight">Tudo tranquilo por aqui</h3>
                                                <p class="text-[11px] text-[var(--color-text-secondary)] opacity-60 max-w-[220px]">Não encontramos nenhuma transação registrada neste dia específico.</p>
                                            </div>
                                        </div>
                                    ` : dayTransactions.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).map(t => {
                        const isIncome = t.type === 'CREDIT';
                        const amountStr = formatCurrency(Math.abs(t.amount || 0));

                        return `
                                            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border)] transition-all group cursor-default">
                                                <div class="flex items-center gap-3.5">
                                                    <div class="w-9 h-9 rounded-[14px] flex items-center justify-center ${t.isReminder ? 'bg-orange-500/10 text-orange-400' : (isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')} shadow-sm">
                                                        ${isIncome ?
                                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17l9.2-9.2M17 17V7H7" /></svg>` :
                                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 7l9.2 9.2M7 17h10V7" /></svg>`
                            }
                                                    </div>
                                                    <div class="flex flex-col gap-0.5">
                                                        <div class="flex items-center gap-2">
                                                            <span class="text-[13px] font-semibold text-[var(--color-text)] opacity-90 group-hover:opacity-100 transition-opacity">${t.description || t.title || 'Transação'}</span>
                                                            ${t.isPaid ? `<span class="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">Pago</span>` : ''}
                                                        </div>
                                                        <span class="text-[10px] font-medium text-[var(--color-text-secondary)] opacity-40 uppercase tracking-wider">${t.category || 'Outros'}</span>
                                                    </div>
                                                </div>
                                                <div class="flex flex-col items-end">
                                                    <span class="text-[13px] font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'} tracking-tight">
                                                        ${isIncome ? '+' : '-'} ${amountStr}
                                                    </span>
                                                </div>
                                            </div>
                                        `;
                    }).join('')}
                                </div>
                            </div>
                        </div>
                    `;

                    Modal({
                        title: formattedDate,
                        content: modalContent,
                        showConfirm: false,
                        showCancel: false,
                        showFooter: false,
                        showCloseButton: true,
                        maxWidth: 'max-w-md',
                        fieldsPadding: 'p-6'
                    });

                    // Inicia a animação periódica para o Lottie que acabamos de renderizar no modal
                    setTimeout(() => {
                        initEmptyStateLotties();
                    }, 100);
                }
            });
        });
    });

    // 4. Auto-scroll suave para o dia de hoje
    const todayCell = document.getElementById(`day-card-${today.getDate()}`);
    if (todayCell && currentMonth === today.getMonth()) {
        setTimeout(() => {
            const scrollPos = todayCell.offsetLeft - scrollContainer.offsetLeft - (scrollContainer.clientWidth / 2) + (todayCell.clientWidth / 2);
            scrollContainer.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
        }, 500);
    }
}