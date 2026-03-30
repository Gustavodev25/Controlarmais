import gsap from 'gsap';

export interface SwitchProps {
  id?: string;
  isActive?: boolean;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
}

export function Switch({
  id,
  isActive = false,
  className = '',
  trackClassName = 'bg-white/10',
  thumbClassName = 'bg-white',
}: SwitchProps): string {
  return `
    <div
      ${id ? `id="${id}"` : ''}
      class="switch-container relative w-8 h-[18px] rounded-full cursor-pointer flex items-center shrink-0 transition-colors duration-300 shadow-inner ${trackClassName} ${className}"
      data-active="${isActive}"
      role="switch"
      aria-checked="${isActive}"
      tabindex="0"
      style="background-color: ${isActive ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'}"
    >
      <div class="switch-thumb w-3.5 h-3.5 ${thumbClassName} rounded-full absolute transition-transform duration-300" style="left: ${isActive ? '14px' : '2px'};"></div>
    </div>
  `;
}

export function attachSwitchListeners(
  containerId: string,
  onChange?: (isActive: boolean) => void
): () => void {
  const container = document.getElementById(containerId);
  if (!container) return () => {};

  const switchTrack = container as HTMLElement;
  const switchThumb = container.querySelector('.switch-thumb') as HTMLElement;

  let isActive = container.dataset.active === 'true';

  const updateUI = (active: boolean) => {
    isActive = active;
    container.dataset.active = String(active);
    container.setAttribute('aria-checked', String(active));

    const direction = active ? 1 : -1;
    const tl = gsap.timeline();

    // Phase 1: Anticipation — thumb pulls back slightly
    tl.to(switchThumb, {
      x: active ? -2 : 16,
      scaleX: 0.85, scaleY: 1.15,
      duration: 0.08, ease: 'power2.in',
    }, 0);

    // Phase 2: Liquid stretch — thumb elongates in travel direction
    tl.to(switchThumb, {
      x: active ? 8 : 6,
      scaleX: 1.35, scaleY: 0.78,
      borderRadius: active ? '40% 55% 55% 40%' : '55% 40% 40% 55%',
      duration: 0.1, ease: 'power3.out',
    });

    // Phase 3: Overshoot landing
    tl.to(switchThumb, {
      x: active ? 15 : -1,
      scaleX: 0.88, scaleY: 1.12,
      borderRadius: '50%',
      duration: 0.1, ease: 'power2.out',
    });

    // Phase 4: Elastic settle
    tl.to(switchThumb, {
      x: active ? 14 : 0,
      scaleX: 1, scaleY: 1,
      duration: 0.5, ease: 'elastic.out(1.2, 0.4)',
      clearProps: 'scaleX,scaleY,borderRadius',
    });

    // Track color morph
    tl.to(switchTrack, {
      backgroundColor: active ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)',
      duration: 0.3, ease: 'power2.out',
    }, 0);

    // Thumb glow pulse
    tl.to(switchThumb, {
      boxShadow: active
        ? '0 0 10px rgba(255, 255, 255, 0.5), 0 0 3px rgba(255, 255, 255, 0.3)'
        : '0 0 6px rgba(255, 255, 255, 0.2)',
      duration: 0.25, ease: 'power2.out',
    }, 0.12);
    tl.to(switchThumb, {
      boxShadow: active
        ? '0 0 8px rgba(255, 255, 255, 0.4)'
        : '0 0 8px rgba(255, 255, 255, 0.2)',
      duration: 0.35, ease: 'power2.out',
    });

    if (onChange) {
      onChange(active);
    }
  };

  const handleClick = (e: Event) => {
    e.stopPropagation();
    updateUI(!isActive);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick(e);
    }
  };

  switchTrack.addEventListener('click', handleClick);
  switchTrack.addEventListener('keydown', handleKeydown);

  // Return cleanup function
  return () => {
    switchTrack.removeEventListener('click', handleClick);
    switchTrack.removeEventListener('keydown', handleKeydown);
  };
}
