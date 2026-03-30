import gsap from 'gsap';
import { themeManager } from './ThemeManager';
import type { Theme } from './ThemeManager';

interface ThemeSwitcherProps {
  id?: string;
}

export function ThemeSwitcher({ id = 'theme-switcher' }: ThemeSwitcherProps): string {
  const iconMoon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>`;

  return `
    <div
      id="${id}"
      class="theme-switcher relative flex items-center px-3 py-2.5 rounded-[11px] text-[13px] justify-between gap-3 group"
      data-prevent-close="true"
      role="button"
      tabindex="0"
    >
      <div class="flex items-center gap-3">
        <span class="theme-icon opacity-70 transition-colors duration-150 shrink-0 w-4 h-4 flex items-center justify-center text-white/40 group-hover:text-white/80">
          ${iconMoon}
        </span>
        <span class="theme-label font-medium tracking-[-0.01em] leading-none text-white/65 group-hover:text-white">Modo Escuro</span>
      </div>

      <!-- Animated Switch -->
      <div class="theme-switch-container w-8 h-[18px] rounded-full bg-white/10 relative transition-colors duration-300 shadow-inner flex items-center shrink-0 cursor-pointer">
        <div class="theme-switch-thumb w-3.5 h-3.5 bg-white rounded-full absolute left-[2px] transition-transform duration-300"></div>
      </div>
    </div>
  `;
}

export function attachThemeSwitcherListeners(containerId: string = 'theme-switcher') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const switchTrack = container.querySelector('.theme-switch-container') as HTMLElement;
  const switchThumb = container.querySelector('.theme-switch-thumb') as HTMLElement;
  const label = container.querySelector('.theme-label') as HTMLElement;
  const icon = container.querySelector('.theme-icon') as HTMLElement;

  const updateUI = (theme: Theme) => {
    const isDark = theme === 'dark';

    gsap.to(switchThumb, {
      x: isDark ? 14 : 0,
      duration: 0.4,
      ease: 'back.out(1.5)',
    });

    gsap.to(switchTrack, {
      backgroundColor: isDark ? '#141414' : 'rgba(0, 0, 0, 0.1)',
      duration: 0.3,
      ease: 'power2.out',
    });

    gsap.to(icon, {
      rotation: isDark ? 0 : 180,
      duration: 0.5,
      ease: 'back.out(1.2)',
    });

    gsap.to(switchThumb, {
      boxShadow: isDark
        ? '0 0 8px rgba(255, 255, 255, 0.4)'
        : '0 0 8px rgba(0, 0, 0, 0.2)',
      duration: 0.3,
    });

    label.textContent = isDark ? 'Modo Escuro' : 'Modo Claro';
  };

  updateUI(themeManager.getCurrentTheme());

  container.addEventListener('click', (e) => {
    e.stopPropagation();

    // Tactile bounce on thumb
    gsap.timeline()
      .to(switchThumb, { scale: 1.3, duration: 0.15, ease: 'power2.out' })
      .to(switchThumb, { scale: 1,   duration: 0.25, ease: 'back.out(2)' });

    // Circle expands from the switch container (most intuitive origin)
    themeManager.toggleThemeWithCircle(switchTrack);
  });

  const unsubscribe = themeManager.subscribe(updateUI);
  return unsubscribe;
}