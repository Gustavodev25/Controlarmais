import gsap from 'gsap';

export interface NavDropdownConfig {
    [key: string]: {
        items: {
            label: string;
            icon?: string;
            lottie?: string;
            lottieLight?: string;
            lottieDark?: string;
            id: string;
            onClick: () => void;
        }[];
    };
}

export function NavSharedDropdown(): string {
    return `
        <div
            id="nav-shared-dropdown"
            class="
                absolute top-full mt-[-2px] z-[110]
                w-[224px]
                rounded-[18px] overflow-hidden
                flex flex-col
                will-change-transform
                dropdown-menu-container
                bg-[#111111]
                border border-[#1C1C1C]
            "
            style="display: none; opacity: 0; pointer-events: none;"
        >
            <!-- Subtle inner glow at top -->
            <div
                class="pointer-events-none absolute inset-x-0 top-0 h-px"
                style="background: linear-gradient(90deg, transparent 10%, var(--dropdown-glow) 50%, transparent 90%);"
            ></div>
            <div id="nav-shared-content" class="p-1.5 space-y-px">
                <!-- Content injected here -->
            </div>
        </div>
    `;
}

export function attachNavSharedDropdownListeners(navId: string, config: NavDropdownConfig) {
    const nav = document.getElementById(navId);
    const dropdown = document.getElementById('nav-shared-dropdown');
    const content = document.getElementById('nav-shared-content');

    if (!nav || !dropdown || !content) return;

    // ─── State ───────────────────────────────────────────────────────────────
    type Phase = 'closed' | 'opening' | 'open' | 'transitioning' | 'closing';

    let phase: Phase = 'closed';
    let activeKey: string | null = null;
    let activeTrigger: HTMLElement | null = null;

    let closeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let lottieTimeoutIds: ReturnType<typeof setTimeout>[] = [];
    let masterTimeline: gsap.core.Timeline | null = null;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const clearCloseTimeout = () => {
        if (closeTimeoutId !== null) {
            clearTimeout(closeTimeoutId);
            closeTimeoutId = null;
        }
    };

    const clearLottieTimeouts = () => {
        lottieTimeoutIds.forEach(clearTimeout);
        lottieTimeoutIds = [];
    };

    const killTimeline = () => {
        if (masterTimeline) {
            masterTimeline.kill();
            masterTimeline = null;
        }
    };

    const setTriggerActive = (trigger: HTMLElement | null) => {
        nav.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-dropdown'));
        trigger?.classList.add('active-dropdown');
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    const renderItems = (key: string): string => {
        const data = config[key];
        if (!data) return '';

        const isLight = localStorage.getItem('theme') === 'light';

        return data.items.map(item => {
            const currentLottie = isLight ? (item.lottieLight || item.lottie) : (item.lottieDark || item.lottie);
            const lottieFilter = isLight
                ? 'saturate(0.9) brightness(0.85)'
                : 'brightness(1.8) saturate(0.8)';

            return `
            <button
                data-item-id="${item.id}"
                class="relative w-full text-left px-3 py-2.5 rounded-[11px] text-[13px] flex items-center gap-3 group dropdown-item
                       transition-colors duration-150 cursor-pointer select-none outline-none"
            >
                <span class="text-white/40 group-hover:text-white/80 transition-colors duration-150 shrink-0 w-4 h-4 flex items-center justify-center overflow-hidden" style="opacity: 0.7;">
                    ${currentLottie ? `
                        <lottie-player
                            src="${currentLottie}"
                            background="transparent"
                            speed="0.8"
                            autoplay
                            style="width: 14px; height: 14px; transform: scale(1.1); filter: ${lottieFilter};"
                        ></lottie-player>
                    ` : (item.icon || '')}
                </span>
                <span class="font-medium tracking-[-0.01em] leading-none">${item.label}</span>
            </button>
        `}).join('');
    };

    // ─── Lottie ───────────────────────────────────────────────────────────────

    const setupLottieInterval = () => {
        clearLottieTimeouts();

        const players = content.querySelectorAll('lottie-player');
        players.forEach((player: any) => {
            const schedulePlay = () => {
                // Bail if dropdown is no longer open or player detached
                if (phase === 'closed' || phase === 'closing' || !player.isConnected) return;

                if (typeof player.stop === 'function') player.stop();
                if (typeof player.play === 'function') player.play();

                const id = setTimeout(schedulePlay, 4000);
                lottieTimeoutIds.push(id);
            };

            const initId = setTimeout(schedulePlay, 100);
            lottieTimeoutIds.push(initId);
        });
    };

    // ─── Event delegation for items (no per-render listener leak) ────────────

    const handleContentClick = (e: MouseEvent) => {
        const button = (e.target as HTMLElement).closest<HTMLElement>('[data-item-id]');
        if (!button || !activeKey) return;

        e.stopPropagation();

        const itemId = button.dataset.itemId!;
        const item = config[activeKey]?.items.find(i => i.id === itemId);
        if (item) {
            item.onClick();
            close();
        }
    };

    content.addEventListener('click', handleContentClick);

    // ─── Position ─────────────────────────────────────────────────────────────

    const getLeftForTrigger = (trigger: HTMLElement): number => {
        const navRect = nav.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        return triggerRect.left - navRect.left + triggerRect.width / 2 - 112;
    };

    // ─── Open ─────────────────────────────────────────────────────────────────

    const open = (trigger: HTMLElement, key: string) => {
        clearCloseTimeout();

        // Already fully open on same trigger — nothing to do
        if (phase === 'open' && activeKey === key) return;

        const prevTrigger = activeTrigger;
        const isTransition = (phase === 'open' || phase === 'transitioning' || phase === 'opening') && activeKey !== key;

        activeTrigger = trigger;
        activeKey = key;
        setTriggerActive(trigger);

        const left = getLeftForTrigger(trigger);

        // ── Fresh open ───────────────────────────────────────────────────────
        if (phase === 'closed' || phase === 'closing') {
            killTimeline();
            clearLottieTimeouts();

            phase = 'opening';
            dropdown.style.display = 'flex';
            dropdown.style.pointerEvents = 'none';

            content.innerHTML = renderItems(key);
            setupLottieInterval();

            gsap.set(dropdown, {
                opacity: 0,
                scaleX: 0.18,
                scaleY: 0.06,
                y: -12,
                left,
                borderRadius: '100px',
                transformOrigin: '50% -8px',
            });
            gsap.set(content, { opacity: 0, scale: 0.88, filter: 'blur(8px)', x: 0 });

            masterTimeline = gsap.timeline({
                onComplete: () => {
                    phase = 'open';
                    dropdown.style.pointerEvents = 'auto';
                },
            });

            masterTimeline
                .to(dropdown, {
                    opacity: 1,
                    scaleX: 1,
                    scaleY: 1,
                    y: 0,
                    borderRadius: '18px',
                    duration: 0.5,
                    ease: 'expo.out',
                })
                .to(content, {
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                    duration: 0.3,
                    ease: 'power3.out',
                }, '-=0.35');

            return;
        }

        // ── Transition between triggers ───────────────────────────────────────
        if (isTransition) {
            killTimeline();
            clearLottieTimeouts();

            phase = 'transitioning';
            dropdown.style.pointerEvents = 'none';

            const goingRight = trigger.getBoundingClientRect().left > (prevTrigger?.getBoundingClientRect().left ?? 0);
            const newContent = renderItems(key);

            masterTimeline = gsap.timeline({
                onComplete: () => {
                    phase = 'open';
                    dropdown.style.pointerEvents = 'auto';
                },
            });

            // Move the card
            masterTimeline.to(dropdown, {
                left,
                duration: 0.4,
                ease: 'expo.out',
            }, 0);

            // Fade out old content
            masterTimeline.to(content, {
                opacity: 0,
                x: goingRight ? -15 : 15,
                filter: 'blur(4px)',
                duration: 0.15,
                ease: 'power2.in',
                onComplete: () => {
                    content.innerHTML = newContent;
                    setupLottieInterval();
                    gsap.set(content, { x: goingRight ? 15 : -15 });
                },
            }, 0);

            // Fade in new content
            masterTimeline.to(content, {
                opacity: 1,
                x: 0,
                filter: 'blur(0px)',
                duration: 0.25,
                ease: 'power2.out',
            });

            return;
        }

        // ── Mid-open transition (still animating, same key) ───────────────────
        // Just let the current animation finish; left position already correct.
    };

    // ─── Close ────────────────────────────────────────────────────────────────

    const close = () => {
        clearCloseTimeout();

        if (phase === 'closed' || phase === 'closing') return;

        phase = 'closing';
        activeKey = null;
        activeTrigger = null;
        dropdown.style.pointerEvents = 'none';

        killTimeline();
        clearLottieTimeouts();

        masterTimeline = gsap.timeline({
            onComplete: () => {
                phase = 'closed';
                gsap.set(dropdown, { display: 'none' });
                setTriggerActive(null);
                masterTimeline = null;
            },
        });

        masterTimeline
            .to(content, {
                opacity: 0,
                scale: 0.95,
                filter: 'blur(6px)',
                duration: 0.15,
            })
            .to(dropdown, {
                scaleX: 0.18,
                scaleY: 0.06,
                y: -12,
                borderRadius: '100px',
                opacity: 0,
                duration: 0.3,
                ease: 'back.in(2)',
            }, '-=0.1');
    };

    // ─── Trigger mouse listeners ───────────────────────────────────────────────

Object.keys(config).forEach(key => {
  const trigger = document.getElementById(key);
  if (!trigger) return;

  trigger.addEventListener('mouseenter', () => open(trigger, key));

  trigger.addEventListener('mouseleave', (e: MouseEvent) => {
    const to = e.relatedTarget as HTMLElement | null;
    if (dropdown.contains(to) || to?.closest('.nav-link')) return;
    closeTimeoutId = setTimeout(close, 250);
  });
});

// ─── Dropdown mouse listeners ─────────────────────────────────────────────

dropdown.addEventListener('mouseenter', clearCloseTimeout);

dropdown.addEventListener('mouseleave', (e: MouseEvent) => {
  const to = e.relatedTarget as HTMLElement | null;
  if (to?.closest('.nav-link')) return;
  closeTimeoutId = setTimeout(close, 250);
});

}