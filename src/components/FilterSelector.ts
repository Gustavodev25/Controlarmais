import {
  DynamicIsland,
  animateDynamicIslandEntrance,
  animateDynamicIslandTransition,
  type DynamicDirection,
} from './DynamicIsland';

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterSelectorOptions {
  id: string;
  filters: FilterOption[];
  initialFilterId?: string;
  onFilterChange: (filterId: string) => void;
  className?: string;
}

const STYLE_ID = 'filter-selector-styles';

const CSS = `
  .filter-selector-container {
    flex-shrink: 0;
    min-width: fit-content;
  }
  .filter-selector-container .dynamic-island__content {
    gap: 0px;
    justify-content: center;
    overflow: visible;
  }

  .filter-nav-btn {
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
  .filter-nav-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
  .filter-nav-btn:active { transform: scale(0.92); }

  .filter-selector-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--color-text);
    white-space: nowrap;
    padding: 0 8px;
    text-align: center;
  }
`;

function ensureFilterSelectorStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

export function FilterSelector({ id, className = '' }: { id: string, className?: string }): string {
  ensureFilterSelectorStyles();

  const innerContent = `
    <button id="${id}-prev" class="filter-nav-btn relative z-10" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    
    <span id="${id}-label" class="filter-selector-label"></span>
    
    <button id="${id}-next" class="filter-nav-btn relative z-10" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  `;

  return DynamicIsland({
    id,
    content: innerContent,
    contentWrapperId: `${id}-content-wrapper`,
    className: `filter-selector-container ${className}`,
    hidden: true,
    style: 'padding: 2px; gap: 0px; border-radius: 12px; height: 32px;',
  });
}

export function attachFilterSelectorListeners(options: FilterSelectorOptions) {
  ensureFilterSelectorStyles();

  const { id, filters, initialFilterId, onFilterChange } = options;
  let currentIndex = filters.findIndex(f => f.id === initialFilterId);
  if (currentIndex === -1) currentIndex = 0;

  const container = document.getElementById(id);
  const label = document.getElementById(`${id}-label`);
  const prevBtn = document.getElementById(`${id}-prev`);
  const nextBtn = document.getElementById(`${id}-next`);

  if (!container || !label || !prevBtn || !nextBtn) return;

  // Limpar listeners antigos clonando os botões (abordagem robusta para Vanilla JS)
  const newPrev = prevBtn.cloneNode(true);
  const newNext = nextBtn.cloneNode(true);
  prevBtn.parentNode?.replaceChild(newPrev, prevBtn);
  nextBtn.parentNode?.replaceChild(newNext, nextBtn);

  const updateLabel = () => {
    label.textContent = filters[currentIndex].label;
  };

  const animateTransition = (direction: DynamicDirection) => {
    animateDynamicIslandTransition({
      containerId: id,
      contentWrapperId: `${id}-content-wrapper`,
      direction,
      onMidpoint: () => {
        updateLabel();
        onFilterChange(filters[currentIndex].id);
      },
    });
  };

  newPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + filters.length) % filters.length;
    animateTransition('prev');
  });

  newNext.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % filters.length;
    animateTransition('next');
  });

  // Initial update
  updateLabel();

  // Show container
  container.classList.remove('dynamic-island--hidden');
  animateDynamicIslandEntrance(id, `${id}-content-wrapper`);

  return {
    getCurrentFilterId: () => filters[currentIndex].id,
    setFilterId: (filterId: string) => {
      const idx = filters.findIndex(f => f.id === filterId);
      if (idx !== -1) {
        currentIndex = idx;
        updateLabel();
      }
    }
  };
}
