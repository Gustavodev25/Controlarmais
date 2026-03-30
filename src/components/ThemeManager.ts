// import gsap from 'gsap';

export type Theme = 'dark' | 'light';

interface ThemeColors {
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  border: string;
  borderLight: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
}

const themeColors: Record<Theme, ThemeColors> = {
  dark: {
    background: '#0C0C0C',
    surface: '#111111',
    surfaceHover: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    border: 'rgba(255, 255, 255, 0.07)',
    borderLight: 'rgba(255, 255, 255, 0.04)',
    inputBg: '#161616',
    inputBorder: '#1C1C1C',
    inputText: '#E5E7EB',
    inputPlaceholder: '#6B7280',
  },
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceHover: '#EBEBEB',
    text: '#000000',
    textSecondary: '#1F2937',
    border: 'rgba(0, 0, 0, 0.10)',
    borderLight: 'rgba(0, 0, 0, 0.05)',
    inputBg: '#F5F5F5',
    inputBorder: '#E5E7EB',
    inputText: '#000000',
    inputPlaceholder: '#6B7280',
  },
};

// Inject the View Transition CSS once when this module loads
function injectViewTransitionStyles() {
  const id = '__theme-transition-styles__';
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    /* New page state: circle expands from the icon origin */
    @keyframes theme-circle-expand {
      from {
        clip-path: circle(0px at var(--theme-origin-x, 50%) var(--theme-origin-y, 50%));
      }
      to {
        clip-path: circle(200vmax at var(--theme-origin-x, 50%) var(--theme-origin-y, 50%));
      }
    }

    /* Old page state: stays still underneath */
    @keyframes theme-no-anim {
      from { opacity: 1; }
      to   { opacity: 1; }
    }

    ::view-transition-new(root) {
      animation: theme-circle-expand 0.6s cubic-bezier(0.76, 0, 0.24, 1) forwards;
      z-index: 2;
    }

    ::view-transition-old(root) {
      animation: theme-no-anim 0.6s forwards;
      z-index: 1;
    }
  `;

  document.head.appendChild(style);
}

class ThemeManager {
  private currentTheme: Theme = 'dark';
  private listeners: Array<(theme: Theme) => void> = [];
  private isAnimating = false;

  constructor() {
    this.loadTheme();
    // Inject styles as early as possible
    if (typeof document !== 'undefined') {
      injectViewTransitionStyles();
    }
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    this.applyTheme(this.currentTheme, false);
  }

  public getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  public toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Toggle theme with a circle that EXPANDS from the origin element,
   * revealing the real new-themed page content — using the View Transitions API.
   *
   * How it works:
   *  1. Set --theme-origin-x/y CSS vars to the icon's center position
   *  2. Call document.startViewTransition() — browser snapshots the current state
   *  3. Inside the callback, apply the new theme (CSS vars + data-theme)
   *  4. Browser animates old snapshot → new live page using our clip-path keyframes
   *  → Circle expands from the icon revealing real content, nothing is hidden
   */
  public toggleThemeWithCircle(originElement?: HTMLElement) {
    if (this.isAnimating) return;

    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';

    // Determine origin coordinates
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (originElement) {
      const rect = originElement.getBoundingClientRect();
      x = Math.round(rect.left + rect.width / 2);
      y = Math.round(rect.top + rect.height / 2);
    }

    // Pass origin to CSS so the keyframe animation knows where to start
    document.documentElement.style.setProperty('--theme-origin-x', `${x}px`);
    document.documentElement.style.setProperty('--theme-origin-y', `${y}px`);

    // Fallback for browsers without View Transitions support
    if (!document.startViewTransition) {
      this.applyTheme(newTheme, false);
      return;
    }

    this.isAnimating = true;

    const transition = document.startViewTransition(() => {
      this.applyTheme(newTheme, false);
    });

    transition.finished.finally(() => {
      this.isAnimating = false;
    });
  }

  public setTheme(theme: Theme) {
    this.applyTheme(theme, true);
  }

  /**
   * Force dark theme visually without overwriting the user's localStorage preference.
   * Use on auth/landing pages to keep them always dark.
   */
  public forceDark() {
    this.currentTheme = 'dark';
    this.updateCSSVariables('dark');
    const root = document.documentElement;
    root.style.colorScheme = 'dark';
    root.setAttribute('data-theme', 'dark');
  }

  /**
   * Release forced theme and re-apply the user's saved preference.
   * Call this when navigating to authenticated app pages.
   */
  public releaseDark() {
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark';
    this.applyTheme(savedTheme, false);
  }

  private applyTheme(theme: Theme, _animate: boolean = true) {
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);
    this.updateCSSVariables(theme);

    const root = document.documentElement;
    root.style.colorScheme = theme;
    root.setAttribute('data-theme', theme);

    this.listeners.forEach((listener) => listener(theme));
  }

  private updateCSSVariables(theme: Theme) {
    const colors = themeColors[theme];
    const root = document.documentElement;

    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-surface-hover', colors.surfaceHover);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-border-light', colors.borderLight);
    root.style.setProperty('--color-input-bg', colors.inputBg);
    root.style.setProperty('--color-input-border', colors.inputBorder);
    root.style.setProperty('--color-input-text', colors.inputText);
    root.style.setProperty('--color-input-placeholder', colors.inputPlaceholder);
  }

  public subscribe(callback: (theme: Theme) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public getColors(): ThemeColors {
    return themeColors[this.currentTheme];
  }
}

export const themeManager = new ThemeManager();

export function useTheme() {
  return {
    current: themeManager.getCurrentTheme(),
    toggle: () => themeManager.toggleTheme(),
    toggleWithCircle: (el?: HTMLElement) => themeManager.toggleThemeWithCircle(el),
    set: (theme: Theme) => themeManager.setTheme(theme),
    subscribe: (callback: (theme: Theme) => void) => themeManager.subscribe(callback),
    colors: themeManager.getColors(),
  };
}