import gsap from 'gsap';
import { hideAllTooltips } from './Tooltip';

const activeDropdowns: Set<{ close: () => void }> = new Set();

export function closeAllGenericDropdowns() {
  activeDropdowns.forEach(d => d.close());
}

export interface DropdownItem {
    label: string;
    sublabel?: string;
    icon: string;
    onClick?: () => void;
    id?: string;
    variant?: 'default' | 'danger';
}

export function GenericDropdown({ id, items = [], customContent, width = '160px' }: { id: string, items?: DropdownItem[], customContent?: string, width?: string }): string {
    const renderItem = (item: DropdownItem) => {
        const isDanger = item.variant === 'danger';
        const base = `
            relative w-full text-left px-3 py-2.5 rounded-[11px] text-[13px] flex items-center gap-3 group dropdown-item
            transition-colors duration-150 cursor-pointer select-none
            outline-none focus-visible:ring-2 focus-visible:ring-white/20
        `;
        const color = isDanger ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : '';
        const iconColor = isDanger ? 'text-red-400 group-hover:text-red-300' : 'text-white/40 group-hover:text-white/80';

        return `
            <button
                ${item.id ? `id="${item.id}"` : ''}
                class="${base} ${color} justify-between"
            >
                <div class="flex items-center gap-3">
                    <span class="${iconColor} transition-colors duration-150 shrink-0 w-4 h-4 flex items-center justify-center">
                        ${item.icon}
                    </span>
                    <span class="font-medium tracking-[-0.01em] leading-none">${item.label}</span>
                </div>
                ${item.sublabel ? `<span class="text-[11px] text-[var(--color-text-secondary)] font-medium whitespace-nowrap ml-4">${item.sublabel}</span>` : ''}
            </button>
        `;
    };

    return `
        <div
            id="${id}-menu"
            class="
                absolute right-0 top-full mt-1 z-[150]
                bg-[#111111]
                border border-[#1C1C1C]
                rounded-[18px] overflow-hidden
                flex flex-col
                will-change-transform
                dropdown-menu-container
            "
            style="display: none; opacity: 0; transform-origin: top right; width: ${width}; max-width: calc(100vw - 24px);"
        >
            <div
                class="pointer-events-none absolute inset-x-0 top-0 h-px"
                style="background: linear-gradient(90deg, transparent 10%, var(--dropdown-glow) 50%, transparent 90%);"
            ></div>

            <div id="${id}-content-wrapper" class="p-1.5 space-y-px">
                ${customContent || items.map(renderItem).join('')}
            </div>
        </div>
    `;
}

export function attachGenericDropdownListeners(triggerId: string, menuId: string) {
    const trigger = document.getElementById(triggerId);
    const menu = trigger?.parentElement?.querySelector<HTMLElement>(`#${menuId}-menu`)
        ?? document.getElementById(`${menuId}-menu`);
    const content = menu?.querySelector<HTMLElement>(`#${menuId}-content-wrapper`)
        ?? document.getElementById(`${menuId}-content-wrapper`);

    if (!trigger || !menu || !content) return;

    const existingPortal = document.querySelector<HTMLElement>(`body > #${menuId}-menu`);
    if (existingPortal && existingPortal !== menu) existingPortal.remove();

    const menuWidth = Number.parseFloat(menu.style.width || '') || 160;
    const viewportPadding = 12;
    const viewportGap = 6;
    const items = menu.querySelectorAll('.dropdown-item');
    const card = trigger.closest('.overview-card, .cc-card-item, .accounts-balance-card') as HTMLElement | null;

let isOpen = false;
  let animation: gsap.core.Timeline | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let currentOrigin = 'top right';

  const dropdownInstance = { close: () => close() };
  activeDropdowns.add(dropdownInstance);

    const syncMenuPosition = () => {
        if (!trigger.isConnected || !menu.isConnected) return;

        const rect = trigger.getBoundingClientRect();
        const actualWidth = Math.min(menuWidth, window.innerWidth - (viewportPadding * 2));
        const maxLeft = Math.max(viewportPadding, window.innerWidth - actualWidth - viewportPadding);
        const desiredLeft = rect.right - actualWidth;
        const left = Math.min(Math.max(desiredLeft, viewportPadding), maxLeft);

        currentOrigin = left <= viewportPadding ? 'top left' : 'top right';
        menu.style.top = `${rect.bottom + viewportGap}px`;
        menu.style.left = `${left}px`;
        menu.style.width = `${actualWidth}px`;
        menu.style.transformOrigin = currentOrigin;
    };

    const handleViewportChange = () => {
        if (isOpen) syncMenuPosition();
    };

    menu.classList.remove('absolute', 'right-0', 'top-full', 'mt-1');
    menu.classList.add('fixed');
    menu.style.position = 'fixed';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
    menu.style.marginTop = '0px';
    menu.style.zIndex = '99999';
    menu.style.setProperty('z-index', '99999', 'important');
    menu.style.isolation = 'isolate';
    document.body.appendChild(menu);

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    const open = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (isOpen) return;

        hideAllTooltips();
        isOpen = true;
        if (animation) animation.kill();

        syncMenuPosition();

        // Garante que o menu esteja visível para a animação começar.
        gsap.set(menu, { display: 'flex' });

        if (card) {
            card.dataset.oldZ = card.style.zIndex;
            card.style.zIndex = '120';
        }

        animation = gsap.timeline();

        // 1. Container: nasce do canto superior direito espremido e estica elasticamente.
        animation.fromTo(
            menu,
            {
                scaleX: 0.8,
                scaleY: 0.5,
                y: -15,
                opacity: 0,
                borderRadius: '35px',
                transformOrigin: currentOrigin,
            },
            {
                scaleX: 1,
                scaleY: 1,
                y: 0,
                opacity: 1,
                borderRadius: '18px',
                duration: 0.8,
                ease: 'elastic.out(1.15, 0.4)',
                clearProps: 'transform',
            },
            0
        );

        // 2. Conteúdo: desembaça e cresce suavemente.
        animation.fromTo(
            content,
            { opacity: 0, filter: 'blur(6px)', scale: 0.95 },
            { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 0.35, ease: 'power2.out' },
            0.05
        );

        // 3. Cascata sutil dos itens deslizando da direita para a esquerda.
        animation.fromTo(
            items,
            { opacity: 0, x: 10 },
            {
                opacity: 1,
                x: 0,
                stagger: 0.03,
                duration: 0.35,
                ease: 'power3.out',
                clearProps: 'all',
            },
            0.1
        );

        trigger.classList.add('active');
    };

    const close = () => {
        if (!isOpen) return;
        isOpen = false;

        if (animation) animation.kill();

        animation = gsap.timeline({
            onComplete: () => {
                gsap.set(menu, { display: 'none' });
                if (card) {
                    card.style.zIndex = card.dataset.oldZ || '';
                }
            }
        });

        animation.to(content, { opacity: 0, filter: 'blur(4px)', duration: 0.15, ease: 'power2.in' }, 0);
        animation.to(items, { opacity: 0, x: -5, duration: 0.1, ease: 'power2.in' }, 0);

        animation.to(
            menu,
            {
                scaleX: 0.85,
                scaleY: 0.5,
                y: -10,
                opacity: 0,
                borderRadius: '30px',
                duration: 0.22,
                ease: 'power3.in',
            },
            0.05
        );

        trigger.classList.remove('active');
    };

    const toggle = (e: MouseEvent) => {
        e.stopPropagation();
        if (isOpen) close();
        else open();
    };

    trigger.addEventListener('click', toggle);

    items.forEach(item => {
        item.addEventListener('click', () => {
            close();
        });
    });

    const outsideClick = (e: MouseEvent) => {
        if (isOpen && !menu.contains(e.target as Node) && !trigger.contains(e.target as Node)) {
            close();
        }
    };
    document.addEventListener('click', outsideClick);

    const observer = new MutationObserver(() => {
        if (trigger.isConnected) return;

        window.removeEventListener('resize', handleViewportChange);
        window.removeEventListener('scroll', handleViewportChange, true);
        document.removeEventListener('click', outsideClick);
        if (menu.isConnected) menu.remove();
        observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });

  const cleanup = () => {
    activeDropdowns.delete(dropdownInstance);
    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('scroll', handleViewportChange, true);
    document.removeEventListener('click', outsideClick);
    observer.disconnect();
  };

  return cleanup;
}
