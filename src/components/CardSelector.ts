import {
  DynamicIsland,
  animateDynamicIslandEntrance,
  animateDynamicIslandTransition,
  type DynamicDirection,
} from './DynamicIsland';
import { GenericDropdown, attachGenericDropdownListeners } from './GenericDropdown';

// ═══════════════════════════════════════════════════════════════════════════════
// CARD SELECTOR (Lógica e Renderização)
// ═══════════════════════════════════════════════════════════════════════════════

const CARD_SELECTOR_TRIGGER_ID = 'card-selector-trigger';
const DYNAMIC_ISLAND_CONTAINER_ID = 'dynamic-island-container';
const CONTENT_WRAPPER_ID = `${DYNAMIC_ISLAND_CONTAINER_ID}-di-content`;
const CARD_STYLE_ID = 'card-selector-styles';

export interface CardSelectorConfig {
  slotId: string;
  accounts: any[];
  selectedAccount: any;
  onPrevCard: (accountId: string) => void;
  onNextCard: (accountId: string) => void;
  onSelectCard?: (accountId: string) => void;
  getAccountDisplayName: (account: any) => string;
}

const CARD_CSS = `
  .cc-card-selector-trigger {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    color: var(--color-text);
    font-size: 13px;
    font-weight: 600;
    min-width: 220px;
    justify-content: space-between;
  }
  .cc-card-selector-icon {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-secondary);
  }
  .cc-card-selector-label {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-selector-island {
    width: 100%;
    padding: 0 8px;
  }
  .card-selector-island .dynamic-island__content {
    overflow: hidden;
  }
  .card-selector-island #btn-prev-card,
  .card-selector-island #btn-next-card {
    display: none !important;
  }
  .cc-card-selector-trigger[aria-expanded="true"] {
    color: var(--color-text);
  }
  .cc-card-selector-chevron {
    opacity: 0.45;
    transition: transform 0.18s ease, opacity 0.18s ease;
  }
  .cc-card-selector-trigger:hover .cc-card-selector-chevron {
    opacity: 0.8;
  }
`;

export function ensureCardSelectorStyles(): void {
  if (document.getElementById(CARD_STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = CARD_STYLE_ID;
  tag.textContent = CARD_CSS;
  document.head.appendChild(tag);
}

export function CardSelectorStyles(): string {
  return CARD_CSS;
}

function cardOptionIcon(account: any): string {
  const logoUrl = account?.institution?.imageUrl || '/assets/logo/logo.png';
  return `<img src="${logoUrl}" onerror="this.src='/assets/logo/logo.png'" alt="" style="width: 18px; height: 18px; object-fit: contain; border-radius: 4px; background: white; padding: 2px;" />`;
}

function generateInnerContent(config: CardSelectorConfig, hasMultiple: boolean, currentAccountName: string, selectedAccount: any): string {
  const logoUrl = selectedAccount?.institution?.imageUrl || '/assets/logo/logo.png';
  const cardIcon = `
    <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: white; padding: 2px; flex-shrink: 0;">
      <img src="${logoUrl}" onerror="this.src='/assets/logo/logo.png'" alt="Bank Logo" style="width: 100%; height: 100%; object-fit: contain;" />
    </div>
  `;
  const selectorItems = config.accounts.map((account, index) => ({
    id: `card-selector-option-${index}`,
    label: config.getAccountDisplayName(account),
    sublabel: account?.isManual === true || account?.provider === 'manual' ? 'Manual' : undefined,
    icon: cardOptionIcon(account)
  }));

  return `
    ${hasMultiple ? `
    <button id="btn-prev-card" class="flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors flex-shrink-0 relative z-10" title="Cartão Anterior">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    ` : ''}

    <div class="relative flex-1 min-w-[120px]" style="overflow: hidden;">
      <button
        id="${CARD_SELECTOR_TRIGGER_ID}"
        type="button"
        class="cc-card-selector-trigger"
        style="min-width: unset; width: 100%; justify-content: center; margin: 0; cursor: ${hasMultiple ? 'pointer' : 'default'};"
        ${hasMultiple ? 'aria-haspopup="menu" aria-expanded="false"' : 'disabled'}
        title="${hasMultiple ? 'Escolher cartao' : currentAccountName}"
      >
        <span class="cc-card-selector-icon">${cardIcon}</span>
        <span class="cc-card-selector-label" style="flex: 0 auto; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; font-weight: 500; letter-spacing: 0.02em;">${currentAccountName}</span>
        ${hasMultiple ? `
          <svg class="cc-card-selector-chevron" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        ` : ''}
      </button>
      ${hasMultiple ? GenericDropdown({
    id: 'card-selector-dropdown',
    width: '240px',
    items: selectorItems
  }) : ''}
    </div>

    ${hasMultiple ? `
    <button id="btn-next-card" class="flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors flex-shrink-0 relative z-10" title="Próximo Cartão">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
    ` : ''}
  `;
}

export function renderCardSelector(config: CardSelectorConfig, direction: DynamicDirection = 'reset'): void {
  ensureCardSelectorStyles();

  const slot = document.getElementById(config.slotId);
  if (!slot) return;

  const { accounts, selectedAccount } = config;
  if (accounts.length === 0) {
    slot.innerHTML = '';
    return;
  }

  const currentAccountName = config.getAccountDisplayName(selectedAccount);
  const currentIndex = accounts.findIndex(a => a.id === selectedAccount.id);
  const hasMultiple = accounts.length > 1;

  const prevAccount = accounts[(currentIndex - 1 + accounts.length) % accounts.length];
  const nextAccount = accounts[(currentIndex + 1) % accounts.length];

  const existingIsland = document.getElementById(DYNAMIC_ISLAND_CONTAINER_ID);

  if (existingIsland) {
    animateDynamicIslandTransition({
      containerId: DYNAMIC_ISLAND_CONTAINER_ID,
      contentWrapperId: CONTENT_WRAPPER_ID,
      direction: direction,
      onMidpoint: () => {
        const wrapper = document.getElementById(CONTENT_WRAPPER_ID);
        if (wrapper) {
          wrapper.innerHTML = generateInnerContent(config, hasMultiple, currentAccountName, selectedAccount);
          attachCardSelectorListeners(config, prevAccount, nextAccount);
        }
      }
    });
    return;
  }

  slot.innerHTML = DynamicIsland({
    id: DYNAMIC_ISLAND_CONTAINER_ID,
    content: generateInnerContent(config, hasMultiple, currentAccountName, selectedAccount),
    contentWrapperId: CONTENT_WRAPPER_ID,
    className: 'card-selector-island',
  });

  animateDynamicIslandEntrance(DYNAMIC_ISLAND_CONTAINER_ID, CONTENT_WRAPPER_ID);
  attachCardSelectorListeners(config, prevAccount, nextAccount);
}

export function attachCardSelectorListeners(
  config: CardSelectorConfig,
  prevAccount: any,
  nextAccount: any
): void {
  const { accounts } = config;
  const hasMultiple = accounts.length > 1;

  if (hasMultiple) {
    attachGenericDropdownListeners(CARD_SELECTOR_TRIGGER_ID, 'card-selector-dropdown');

    config.accounts.forEach((account, index) => {
      document.getElementById(`card-selector-option-${index}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        config.onSelectCard?.(account.id);
      });
    });

    document.getElementById('btn-prev-card')?.addEventListener('click', (e) => {
      e.stopPropagation();
      config.onPrevCard(prevAccount.id);
    });

    document.getElementById('btn-next-card')?.addEventListener('click', (e) => {
      e.stopPropagation();
      config.onNextCard(nextAccount.id);
    });
  }
}
