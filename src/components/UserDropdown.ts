import gsap from 'gsap';
import { ThemeSwitcher, attachThemeSwitcherListeners } from './ThemeSwitcher';
import { Switch, attachSwitchListeners } from './Switch';

export interface DropdownItem {
    label: string;
    sublabel?: string;
    icon: string;
    onClick?: () => void;
    variant?: 'default' | 'danger';
    id?: string;
    isToggle?: boolean;
}

interface DropdownProps {
    items: DropdownItem[];
}

export function attachDropdownListeners() {
    const trigger = document.getElementById('topbar-avatar-container');
    const menu = document.getElementById('user-dropdown-menu');
    const contentWrapper = document.getElementById('dropdown-content-wrapper');

    if (trigger && menu && contentWrapper) {
        let isOpen = false;
        let animation: gsap.core.Timeline | null = null;

        const items = menu.querySelectorAll('.dropdown-item');
        const dividers = menu.querySelectorAll('.dropdown-divider');
        const header = menu.querySelector('.dropdown-header');

        const killAndReset = () => {
            if (animation) {
                animation.kill();
                animation = null;
            }
        };

        const openMenu = () => {
            isOpen = true;
            killAndReset();

            // Make menu visible for animation
            gsap.set(menu, { display: 'flex' });

            animation = gsap.timeline({
                onComplete: () => {
                    // Attach switch listeners and theme switcher after animation completes
                    const switches = menu.querySelectorAll('.switch-container');
                    switches.forEach((switchEl) => {
                        const switchId = switchEl.id;
                        if (switchId && !switchEl.hasAttribute('data-listener-attached')) {
                            switchEl.setAttribute('data-listener-attached', 'true');
                            attachSwitchListeners(switchId);
                        }
                    });

                    const themeSwitcher = menu.querySelector('.theme-switcher');
                    if (themeSwitcher && !themeSwitcher.hasAttribute('data-listener-attached')) {
                        themeSwitcher.setAttribute('data-listener-attached', 'true');
                        attachThemeSwitcherListeners('theme-toggle-dropdown');
                    }
                }
            });

            // 1. Container: elastic bounce from top right
            animation.fromTo(
                menu,
                {
                    scaleX: 0.8,
                    scaleY: 0.5,
                    y: -15,
                    opacity: 0,
                    borderRadius: '35px',
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

            // 2. Content wrapper: fade in with blur
            animation.fromTo(
                contentWrapper,
                { opacity: 0, filter: 'blur(6px)', scale: 0.95 },
                { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 0.35, ease: 'power2.out' },
                0.05
            );

            // 3. Items cascade from right
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
        };

        const closeMenu = () => {
            if (!isOpen) return;
            isOpen = false;
            killAndReset();

            animation = gsap.timeline({
                onComplete: () => {
                    gsap.set(menu, { display: 'none' });
                },
            });

            // 1. Content and items dissolve quickly
            animation.to(contentWrapper, { opacity: 0, filter: 'blur(4px)', duration: 0.15, ease: 'power2.in' }, 0);
            animation.to(items, { opacity: 0, x: -5, duration: 0.1, ease: 'power2.in' }, 0);

            // 2. Container shrinks back smoothly
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
        };

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isOpen) {
                openMenu();
            } else {
                closeMenu();
            }
        });

        // Item click ripple + close
        items.forEach((item) => {
            item.addEventListener('click', () => {
                const preventClose = item.hasAttribute('data-prevent-close');

                gsap.to(item, {
                    scale: 0.96,
                    duration: 0.08,
                    ease: 'power2.in',
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        if (!preventClose) closeMenu();
                    },
                });
            });
        });

        document.addEventListener('click', (e) => {
            if (
                menu &&
                !menu.contains(e.target as Node) &&
                trigger &&
                !trigger.contains(e.target as Node)
            ) {
                closeMenu();
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) closeMenu();
        });
    }
}

export function UserDropdown({ items }: DropdownProps): string {
    const renderItem = (item: DropdownItem) => {
        const isDanger = item.variant === 'danger';

        const base = `
      relative w-full text-left px-3 py-2.5 rounded-[11px] text-[13px] flex items-center gap-3 group dropdown-item
      transition-colors duration-150 cursor-pointer select-none
      outline-none focus-visible:ring-2 focus-visible:ring-white/20
    `;
        const color = isDanger
            ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
            : '';
        const iconColor = isDanger
            ? 'text-red-400 group-hover:text-red-300'
            : 'text-white/40 group-hover:text-white/80';

        if (item.isToggle) {
            const switchId = `switch-${item.id || 'toggle-' + Math.random().toString(36).substr(2, 9)}`;
            return `
      <div
        ${item.id ? `id="${item.id}"` : ''}
        class="${base} ${color} justify-between"
        data-prevent-close="true"
      >
        <div class="flex items-center gap-3">
            <span class="${iconColor} transition-colors duration-150 shrink-0 w-4 h-4 flex items-center justify-center"
              style="opacity: 0.7;">
              ${item.icon}
            </span>
            <span class="font-medium tracking-[-0.01em] leading-none">${item.label}</span>
        </div>
        ${Switch({ id: switchId, isActive: false })}
      </div>
    `;
        }

        return `
      <button
        ${item.id ? `id="${item.id}"` : ''}
        class="${base} ${color}"
      >
        <span class="${iconColor} transition-colors duration-150 shrink-0 w-4 h-4 flex items-center justify-center"
          style="opacity: 0.7;">
          ${item.icon}
        </span>
        <span class="font-medium tracking-[-0.01em] leading-none">${item.label}</span>
        ${item.sublabel
                ? `<span class="ml-auto text-[11px] text-[var(--color-text-secondary)] font-medium truncate max-w-[100px] text-right">${item.sublabel}</span>`
                : ''
            }
      </button>
    `;
    };

    const defaultItems = items.filter((i) => i.variant !== 'danger');
    const dangerItems = items.filter((i) => i.variant === 'danger');

    return `
        <div
      id="user-dropdown-menu"
      role="menu"
      aria-orientation="vertical"
      class="
        absolute right-0 top-full mt-[-2px] z-[110]
        w-[224px]
        rounded-[18px] overflow-hidden
        flex flex-col
        will-change-transform
        bg-[#111111]
        border border-[#1C1C1C]
      "
      style="display: none; opacity: 0; transform-origin: top right;"
    >
      <!-- Subtle inner glow at top -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-px"
        style="background: linear-gradient(90deg, transparent 10%, var(--dropdown-glow) 50%, transparent 90%);"
      ></div>

      <div id="dropdown-content-wrapper" class="flex flex-col">

        <!-- Default items -->
        <div class="p-1.5">
          <div class="space-y-px">
            ${defaultItems.map(renderItem).join('')}
          </div>
          <div class="space-y-px mt-px">
            ${ThemeSwitcher({ id: 'theme-toggle-dropdown' })}
          </div>
        </div>

        <!-- Danger items with divider -->
        ${dangerItems.length > 0
            ? `
          <div
            class="dropdown-divider mx-3 h-px"
          ></div>
          <div class="p-1.5 space-y-px">
            ${dangerItems.map(renderItem).join('')}
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;
}