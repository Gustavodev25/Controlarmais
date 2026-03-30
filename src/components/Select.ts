import gsap from 'gsap';

export interface SelectOption {
    label: string;
    value: string;
}

export interface SelectProps {
    id: string;
    label: string;
    value: string;
    options: string[] | SelectOption[];
    placeholder?: string;
    labelClass?: string;
    containerClass?: string;
}

export function Select({
    id,
    label,
    value,
    options,
    placeholder = 'Selecione...',
    labelClass = 'text-[13px] text-[var(--color-text-secondary)]',
    containerClass = 'flex flex-col gap-1.5',
}: SelectProps): string {
    const normalizedOptions: SelectOption[] = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    const selectedOption = normalizedOptions.find(opt => opt.value === value) || normalizedOptions[0];
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    // The floating portal menu is injected into <body> by attachSelectListeners()
    // so it's never clipped by ancestor overflow:hidden containers (e.g. modals).

    // We store the options as JSON in a data attribute on the hidden input.
    // Important: escape HTML entities to avoid breaking the input tag.
    const escapedOptions = JSON.stringify(normalizedOptions).replace(/"/g, '&quot;');

    return `
    <div class="${containerClass}" id="${id}-container">
      ${label ? `<label class="${labelClass}">${label}</label>` : ''}
      <div class="relative w-full">
        <input type="hidden" id="${id}" name="${id}" value="${value}" data-options="${escapedOptions}">
        <button type="button" id="${id}-trigger"
          class="w-full px-4 py-3 bg-[var(--color-input-bg)] border border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] rounded-xl text-[13px] text-[var(--color-text)] focus:outline-none focus:border-[#D97757]/40 focus:ring-4 focus:ring-[#D97757]/5 transition-all duration-300 flex items-center justify-between gap-2">
          <span id="${id}-trigger-text">${displayLabel}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-40 shrink-0 transform group-hover:translate-y-0.5 transition-transform"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
    </div>
    `;
}

export function attachSelectListeners(id: string, onSelect?: (value: string) => void) {
    const trigger = document.getElementById(`${id}-trigger`);
    const input = document.getElementById(id) as HTMLInputElement;
    const textSpan = document.getElementById(`${id}-trigger-text`);

    if (!trigger) return;

    // Build the portal menu and inject into <body> so it escapes any overflow:hidden ancestor
    const existingPortal = document.getElementById(`${id}-menu-portal`);
    if (existingPortal) existingPortal.remove();

    // We'll inject the portal HTML from scratch using the options stored on the hidden input.
    const rawOptions = input?.dataset.options;
    let normalizedOptions: SelectOption[] = [];
    if (rawOptions) {
        try { normalizedOptions = JSON.parse(rawOptions); } catch { /* ignore */ }
    }

    const portalHtml = `
      <div id="${id}-menu-portal"
        class="fixed z-[9999] shadow-2xl rounded-[22px] overflow-hidden bg-[var(--dropdown-bg)] border border-[var(--color-border-light)]"
        style="display: none; opacity: 0; max-height: 260px;">
        <div id="${id}-content-wrapper"
          class="p-2 space-y-px overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style="max-height: 260px;">
          ${normalizedOptions.map(opt => `
            <button type="button"
              class="select-item w-full text-left px-3 py-2.5 rounded-[11px] text-[13px] flex items-center gap-3 transition-colors duration-150 cursor-pointer hover:bg-[var(--color-surface-hover)]"
              data-value="${opt.value}">
              <span class="font-medium text-[var(--color-text)]">${opt.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', portalHtml);

    const menu = document.getElementById(`${id}-menu-portal`)!;
    const content = document.getElementById(`${id}-content-wrapper`)!;

    let isOpen = false;
    let animation: gsap.core.Timeline | null = null;
    let currentOrigin = 'top center';

    const positionMenu = () => {
        const rect = trigger.getBoundingClientRect();
        const menuWidth = Math.max(rect.width, 160);
        menu.style.top = `${rect.bottom + 6}px`;
        menu.style.width = `${menuWidth}px`;

        // Se estiver muito à direita da tela, alinha pela direita
        if (rect.right > window.innerWidth - 40) {
            menu.style.left = `${rect.right - menuWidth}px`;
            currentOrigin = 'top right';
        } else {
            menu.style.left = `${rect.left}px`;
            currentOrigin = 'top left';
        }
        menu.style.transformOrigin = currentOrigin;
    };

    const open = () => {
        if (isOpen) return;
        isOpen = true;
        if (animation) animation.kill();

        positionMenu();

        const items = menu.querySelectorAll('.select-item');

        // Initial pill state
        gsap.set(menu, {
            display: 'flex', flexDirection: 'column', opacity: 1,
            scaleX: 0.12, scaleY: 0.04, y: -10,
            borderRadius: '100px', transformOrigin: currentOrigin,
            boxShadow: '0 0 0 0px rgba(0,0,0,0)',
        });
        gsap.set(content, { opacity: 0, scale: 0.9, y: -8, filter: 'blur(8px)' });
        gsap.set(items, { opacity: 0, y: 14, scaleX: 0.95, scaleY: 1.05, filter: 'blur(6px)' });

        animation = gsap.timeline();

        // Phase A: pill stretches horizontal (blob)
        animation.to(menu, {
            scaleX: 1.06, scaleY: 0.5, borderRadius: '28px', y: -4,
            duration: 0.13, ease: 'power3.out',
        }, 0);

        // Phase B: resolve vertical with overshoot
        animation.to(menu, {
            scaleX: 0.97, scaleY: 1.04, borderRadius: '20px', y: 2,
            duration: 0.18, ease: 'power3.out',
        });

        // Phase C: elastic settle
        animation.to(menu, {
            scaleX: 1, scaleY: 1, borderRadius: '18px', y: 0,
            duration: 0.55, ease: 'elastic.out(1.12, 0.42)',
            clearProps: 'transform,borderRadius',
        });

        // Shadow pump
        animation.to(menu, {
            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.4), 0 6px 14px -3px rgba(0,0,0,0.2)',
            duration: 0.4, ease: 'power2.out', clearProps: 'boxShadow',
        }, 0.06);

        // Content wrapper materialize
        animation.to(content, {
            opacity: 1, scale: 1, y: 0, filter: 'blur(0px)',
            duration: 0.28, ease: 'power3.out',
        }, 0.14);

        // Items cascade with squash-stretch
        if (items.length > 0) {
            // Phase A: decompress + slide
            animation.to(items, {
                opacity: 1, y: -2, scaleX: 1.01, scaleY: 0.99, filter: 'blur(0px)',
                duration: 0.24, stagger: { each: 0.035, ease: 'power1.in' }, ease: 'power3.out',
            }, 0.16);
            // Phase B: elastic settle
            animation.to(items, {
                y: 0, scaleX: 1, scaleY: 1,
                duration: 0.4, stagger: { each: 0.025, ease: 'power1.in' },
                ease: 'elastic.out(1.08, 0.48)', clearProps: 'all',
            }, 0.3);
        }

        trigger.classList.add('border-[#D97757]/40', 'ring-4', 'ring-[#D97757]/5');
    };

    const close = () => {
        if (!isOpen) return;
        isOpen = false;
        if (animation) animation.kill();

        animation = gsap.timeline({ onComplete: () => { gsap.set(menu, { display: 'none' }); } });

        // Content + items dissolve simultaneously
        animation.to(content, {
            opacity: 0, scale: 0.94, y: -4, filter: 'blur(4px)',
            duration: 0.1, ease: 'power2.in',
        }, 0);

        // Menu collapses to pill quickly
        animation.to(menu, {
            scaleX: 0.15, scaleY: 0.05, y: -8, borderRadius: '100px', opacity: 0,
            duration: 0.2, ease: 'back.in(2)',
        }, 0.04);

        trigger.classList.remove('border-[#D97757]/40', 'ring-4', 'ring-[#D97757]/5');
    };

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isOpen) close(); else open();
    });

    menu.querySelectorAll('.select-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = (item as HTMLElement).dataset.value;
            const label = (item as HTMLElement).querySelector('span')?.textContent?.trim();
            if (val && input && textSpan && label) {
                input.value = val;
                textSpan.textContent = label;
                if (onSelect) onSelect(val);
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            close();
        });
    });

    const outsideClick = (e: MouseEvent) => {
        if (isOpen && !menu.contains(e.target as Node) && !trigger.contains(e.target as Node)) {
            close();
        }
    };
    document.addEventListener('click', outsideClick);

    // Cleanup portal when the trigger is removed from DOM (e.g. modal closed)
    const observer = new MutationObserver(() => {
        if (!document.getElementById(`${id}-trigger`)) {
            menu.remove();
            document.removeEventListener('click', outsideClick);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}