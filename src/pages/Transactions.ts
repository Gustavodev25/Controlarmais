import { Header, attachHeaderListeners } from '../components/Header';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { EmptyState, initEmptyStateLotties } from '../components/EmptyState';
import { CategoryService } from '../services/categoryService';
import { getCategoryName } from '../lib/categoryUtils';



import { toaster } from '../components/Toast';
import gsap from 'gsap';
import { loadPluggyRecords } from '../lib/pluggyFirestore';
import { 
  DynamicIsland, 
  animateDynamicIslandEntrance, 
  animateDynamicIslandTransition 
} from '../components/DynamicIsland';
import { GenericDropdown, attachGenericDropdownListeners } from '../components/GenericDropdown';

let cachedTransactions: Transaction[] = [];
let cachedAccounts: any[] = [];
let cachedAccountsById: Map<string, any> = new Map();
let categoryMap: Map<string, string> = new Map(); // originalKey -> name
let currentTypeFilter = 'ALL';
let currentSearchQuery = '';
let selectedAccountId = 'ALL';
let startDate = 'ALL';
let endDate = 'ALL';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  status: string;
  accountId: string;
  accountType?: string;
  categoryId?: string;
  category?: string;
}

const EXCLUDED_ACCOUNT_TYPES = new Set([
  'CREDIT',
  'CREDIT_CARD',
  'SAVINGS',
  'SAVINGS_ACCOUNT',
  'INVESTMENT',
  'INVESTMENT_ACCOUNT',
  'LOAN',
  'LOAN_ACCOUNT',
]);

const EXCLUDED_TRANSACTION_CATEGORY_TERMS = [
  'poupanca',
  'investimento',
  'investimentos',
  'investment income',
  'proceeds interests and dividends',
  'transf propria',
  'same person transfer',
];

const EXCLUDED_TRANSACTION_DESCRIPTION_TERMS = [
  'resg pou',
  'resgate',
  'poupanca',
  'conta poupanca',
  'transferencia para conta poupanca',
  'transferencia de conta corrente',
  'aplicacao automatica',
  'remuneracao aplicacao',
  'remuneracao basica',
  'rentab invest',
  'juros taxa',
  'facilcred',
];

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeTypeKey(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, '_');
}

function isCurrentAccount(account?: any, tx?: Transaction): boolean {
  const typeKeys = [account?.type, account?.subtype, tx?.accountType]
    .map(normalizeTypeKey)
    .filter(Boolean);

  if (typeKeys.some((typeKey) => EXCLUDED_ACCOUNT_TYPES.has(typeKey))) {
    return false;
  }

  const accountName = normalizeText(account?.name);
  return !(
    accountName.includes('poupanca') ||
    accountName.includes('investimento') ||
    accountName.includes('emprestimo')
  );
}

function shouldHideSavingsOrInvestmentMovement(tx: Transaction): boolean {
  const description = normalizeText(tx.description);
  const categoryText = [
    normalizeText(tx.category),
    normalizeText(getCategoryName(tx, categoryMap)),
  ].filter(Boolean).join(' ');

  return (
    EXCLUDED_TRANSACTION_CATEGORY_TERMS.some((term) => categoryText.includes(term)) ||
    EXCLUDED_TRANSACTION_DESCRIPTION_TERMS.some((term) => description.includes(term))
  );
}

function shouldShowTransactionInMovements(tx: Transaction): boolean {
  const account = cachedAccountsById.get(tx.accountId);
  return isCurrentAccount(account, tx) && !shouldHideSavingsOrInvestmentMovement(tx);
}

function getEligibleAccounts() {
  return cachedAccounts.filter((account) => isCurrentAccount(account));
}

export function renderTransactions(user: any) {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  
  sessionStorage.setItem('currentPage', 'transactions');
  sessionStorage.removeItem('currentTab');

  app.innerHTML = `
    <div class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        .animate-cascade { opacity: 0; transform: translateY(10px); }
        .tx-category-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tx-description {
          font-weight: 600;
          display: inline-block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 250px;
        }

        @media (max-width: 640px) {
          .tx-description {
            display: block;
            max-width: none;
            width: 100%;
          }
        }

        /* Tabela igual de Cartões */
        .cc-table-wrapper {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          overflow: visible;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .cc-table-header {
          padding: 14px 20px;
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .cc-table-header-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--color-text-secondary);
        }
        .cc-table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .cc-table {
          width: 100%;
          min-width: 820px;
          border-collapse: separate;
          border-spacing: 0;
        }
        .cc-table thead tr {
          border-bottom: 1px solid var(--color-border);
        }
        .cc-table th {
          padding: 11px 16px;
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--color-text-secondary);
          text-align: left;
          white-space: nowrap;
        }
        .cc-table th:last-child { text-align: right; }
        .cc-table td {
          padding: 13px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--color-border-light);
          vertical-align: middle;
          color: var(--color-text);
          transition: all 0.2s;
        }

        .tx-cell-date {
          color: var(--color-text-secondary);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .tx-cell-amount { white-space: nowrap; text-align: right; }
        .tx-cell-status { text-align: right; }

        .cc-table tbody tr:last-child td { border-bottom: none; }
        .cc-table tbody tr {
          transition: background 0.15s;
        }
        .cc-table tbody tr:hover {
          background: var(--color-surface-hover);
        }
        .cc-category {
          display: inline-block;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 6px;
          background: var(--color-surface-hover);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
          white-space: nowrap;
        }
        .cc-amount {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
        }
        .cc-amount .num-currency { font-size: 11px; }
        .cc-amount .num-integer  { font-size: 14px; font-weight: 700; }
        .cc-amount .num-cents    { font-size: 11px; }
        
        /* Elevate the z-index of the row/cell when dropdown is open */
        .cc-table td:has(.active) {
          z-index: 100 !important;
        }

        /* Status badge */
        .cc-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }
        .cc-badge::before {
          content: '';
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cc-badge-paid    { background: rgba(16,185,129,0.08); color: #10b981; }
        .cc-badge-paid::before    { background: #10b981; }
        .cc-badge-pending { background: rgba(245,158,11,0.08); color: #f59e0b; }
        .cc-badge-pending::before { background: #f59e0b; }

        /* ── Mobile: layout responsivo para celulares ── */
        @media (max-width: 640px) {
          /* Header da página: empilha verticalmente */
          .flex.items-center.justify-between.mb-6 {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
           .shrink-0.flex.items-center.justify-end.gap-3 {
             width: 100%;
             flex-wrap: nowrap !important;
             gap: 8px !important;
           }

           .tx-search-container {
             flex: 1 !important;
             width: auto !important;
             margin-right: 0 !important;
             min-width: 0;
           }

            /* Tabela: layout de cartões */
            .cc-table-wrapper {
              overflow: hidden;
            }
            .cc-table {
              display: block;
              min-width: 0;
              width: 100%;
            }
            .cc-table thead {
              display: none;
            }
            .cc-table tbody {
              display: block;
            }

            /* Cada linha vira um grid de 2 colunas */
            .cc-table tbody tr {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) auto !important;
              grid-template-rows: auto auto !important; /* Reduzindo rows de 3 para 2 */
              column-gap: 16px !important;
              row-gap: 6px !important;
              padding: 16px 20px !important;
              border-bottom: 1px solid var(--color-border-light) !important;
            }
            .cc-table tbody tr:last-child {
              border-bottom: none !important;
            }
            .cc-table tbody tr td {
              display: block !important;
              padding: 0 !important;
              border: none !important;
              font-size: 13px !important;
              text-align: left !important;
              min-width: 0 !important;
            }

            /* td 1: Data → linha 2, col 2 (alinhado à direita) como subtítulo do valor ou abaixo */
            .tx-cell-date {
              grid-column: 2;
              grid-row: 2;
              font-size: 11px !important;
              opacity: 0.6;
              text-align: right !important;
            }
            /* td 2: Descrição → linha 1, col 1 */
            .tx-cell-desc {
              grid-column: 1;
              grid-row: 1;
              overflow: hidden;
            }
            /* td 3: Categoria → linha 2, col 1 */
            .tx-cell-cat {
              grid-column: 1;
              grid-row: 2;
            }
            /* td 4: Valor → linha 1, col 2 (alinhado à direita) */
            .tx-cell-amount {
              grid-column: 2;
              grid-row: 1;
              text-align: right !important;
            }
          }

          .tx-filters-left { display: flex; align-items: center; gap: 8px; }
          .tx-filters-right { display: flex; align-items: center; gap: 12px; }

          @media (max-width: 640px) {
            .tx-filters-toolbar {
              display: flex;
              flex-direction: column;
              gap: 12px;
              width: 100%;
              align-items: stretch !important;
            }
            .tx-search-container { flex: 1; width: 100% !important; }
          }

          /* Dropdown Pulse effect for active filters */
          .filter-active-dot {
            position: absolute;
            top: -4px;
            right: -4px;
            width: 8px;
            height: 8px;
            background: #D97757;
            border-radius: 50%;
            border: 2px solid var(--color-surface);
          }

          .tx-filter-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 16px;
            height: 40px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 12px;
            color: var(--color-text);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            position: relative;
          }
          .tx-filter-btn:hover { background: var(--color-surface-hover); border-color: rgba(217, 119, 87, 0.4); }
          .tx-filter-btn svg { opacity: 0.7; }


          .tx-dropdown-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .tx-dropdown-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 700;
            color: var(--color-text-secondary);
            margin-left: 4px;
          }

          /* General Filter Styles */
          .tx-date-input {
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 12px;
            color: var(--color-text);
            padding: 0 12px;
            font-size: 13px;
            outline: none;
            transition: all 0.2s;
            cursor: pointer;
            height: 40px;
            width: 100%; /* Largura total da coluna */
          }
          .tx-date-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--color-text-secondary);
            text-transform: uppercase;
            opacity: 0.7;
          }
          .tx-date-input:focus {
            border-color: rgba(217, 119, 87, 0.4);
            box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.08);
          }

          /* Styles for MonthSelector-like component for Accounts */
          .account-selector-container .dynamic-island {
            height: 40px !important; /* Padronizado */
            min-height: 40px !important;
            border-radius: 12px !important; /* Bordas consistentes com Pesquisa/Data */
          }
          .account-selector-container .dynamic-island__content {
            gap: 0px;
            justify-content: center;
            height: 100%;
          }
          .account-nav-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px; /* Um pouco maior */
            height: 32px;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: var(--color-text-secondary);
            cursor: pointer;
            transition: background 0.2s;
          }
          .account-nav-btn:hover { background: var(--color-surface-hover); color: var(--color-text); }
          .account-selector-label {
            font-size: 13px;
            font-weight: 700;
            color: var(--color-text);
            padding: 0 8px;
            min-width: 100px;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

        /* Search styles */
        .tx-search-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 240px;
          margin-right: 12px;
        }
        .tx-search-icon {
          position: absolute;
          left: 12px;
          color: var(--color-text-secondary);
          opacity: 0.5;
          pointer-events: none;
        }
        .tx-search-input {
          width: 100%;
          height: 40px; /* Padronizado */
          padding: 0 36px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          font-size: 13px;
          line-height: normal;
          outline: none;
          transition: all 0.2s;
        }
        .tx-search-input:focus {
          border-color: rgba(217, 119, 87, 0.4);
          box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.08);
          background: var(--color-surface-hover);
        }
        .tx-search-clear {
          position: absolute;
          right: 10px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-secondary);
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s;
          padding: 0;
        }
        .tx-search-clear.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .tx-search-clear:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-text);
        }

        }
      </style>

      <main class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 py-8 pt-24 md:pt-32 overflow-y-auto min-w-0">
        <div class="w-full px-2 md:px-0">
          <!-- Header row -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Movimentações</h2>
              <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Acompanhe as transações das suas contas correntes, como PIX, compras e pagamentos.</p>
            </div>
            <div class="tx-filters-toolbar shrink-0 flex items-center justify-end gap-3">
                <div class="tx-search-container">
                  <svg class="tx-search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input type="text" id="tx-search-input" class="tx-search-input" placeholder="Pesquisar..." value="${currentSearchQuery}">
                  <button id="tx-search-clear" class="tx-search-clear ${currentSearchQuery ? 'visible' : ''}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x1="18" y2="18" y2="6"></line>
                    </svg>
                  </button>
                </div>

                <div class="relative">
                  <button id="tx-filter-toggle" class="tx-filter-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span>Filtrar</span>
                    <div id="filter-active-indicator" class="filter-active-dot hidden"></div>
                  </button>

                  ${GenericDropdown({
                    id: 'tx-filter',
                    width: '340px',
                    customContent: `
                      <div class="flex flex-col gap-5 p-3">
                        <div class="grid grid-cols-2 gap-3">
                          <div class="tx-dropdown-item">
                            <label class="tx-dropdown-label">Conta</label>
                            <div id="tx-account-selector"></div>
                          </div>
                          
                          <div class="tx-dropdown-item">
                            <label class="tx-dropdown-label">Tipo</label>
                            <div id="tx-type-selector">
                              ${TypeSelector({ id: 'tx-type-filter', initialValue: currentTypeFilter })}
                            </div>
                          </div>
                        </div>

                        <div class="tx-dropdown-item">
                          <label class="tx-dropdown-label">Período</label>
                          <div id="tx-date-filter" class="grid grid-cols-2 gap-2">
                             <div class="flex flex-col gap-1.5">
                                <span class="tx-date-label">De</span>
                                <input type="date" id="tx-date-start" class="tx-date-input" title="Data inicial" value="${startDate === 'ALL' ? '' : startDate}">
                             </div>
                             <div class="flex flex-col gap-1.5">
                                <span class="tx-date-label">Até</span>
                                <input type="date" id="tx-date-end" class="tx-date-input" title="Data final" value="${endDate === 'ALL' ? '' : endDate}">
                             </div>
                          </div>
                        </div>

                        <button id="tx-filters-reset" class="text-[11px] text-[#D97757] font-bold hover:opacity-80 transition-opacity self-end mt-2 uppercase tracking-wider">
                          Limpar Filtros
                        </button>
                      </div>
                    `
                  })}
                </div>
            </div>
          </div>
          </div>

          <div id="transactions-container" class="space-y-4">
            <!-- Loading state -->
            <div class="flex flex-col gap-3">
              ${Array(6).fill(0).map(() => `
                <div class="h-[72px] w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse opacity-20"></div>
              `).join('')}
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();
  attachGenericDropdownListeners('tx-filter-toggle', 'tx-filter');
  attachTypeSelectorListeners({
    id: 'tx-type-filter',
    initialValue: currentTypeFilter,
    onTypeChange: (value) => {
      currentTypeFilter = value;
      renderFilteredTransactions(value);
    }
  });

  // Search listeners (outside table container)
  const searchInput = document.getElementById('tx-search-input') as HTMLInputElement;
  const searchClear = document.getElementById('tx-search-clear');

  if (searchInput && searchClear) {
    searchInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      currentSearchQuery = val;
      searchClear.classList.toggle('visible', !!val);
      renderFilteredTransactions(currentTypeFilter);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      currentSearchQuery = '';
      searchClear.classList.remove('visible');
      searchInput.focus();
      renderFilteredTransactions(currentTypeFilter);
    });
  }

  const resetBtn = document.getElementById('tx-filters-reset');

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      startDate = 'ALL';
      endDate = 'ALL';
      selectedAccountId = 'ALL';
      currentTypeFilter = 'ALL';
      
      // Update UI elements
      const startInput = document.getElementById('tx-date-start') as HTMLInputElement;
      const endInput = document.getElementById('tx-date-end') as HTMLInputElement;
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      
      renderAccountSelector();
      renderFilteredTransactions('ALL');
    });
  }

  loadTransactions(user.uid);
}

// ─── Componente de Seletor de Tipo (Todas/Entradas/Saídas) ───────────────────

function ensureTypeSelectorStyles() {
  const id = 'type-selector-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .month-selector-container .dynamic-island {
      height: 40px !important; /* Padronizado p/ Seletor de Tipo */
      min-height: 40px !important;
      border-radius: 12px !important;
    }
    .month-selector-container .dynamic-island__content {
      height: 100%;
    }
    .month-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      flex-shrink: 0;
    }
    .month-nav-btn:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
    .month-nav-btn:active { transform: scale(0.92); }

    .month-selector-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text);
      white-space: nowrap;
      letter-spacing: -0.01em;
      padding: 0 4px;
      min-width: auto;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

function TypeSelector({ id, initialValue = 'ALL' }: { id: string, initialValue?: string }): string {
  ensureTypeSelectorStyles();
  const options = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Entradas', value: 'CREDIT' },
    { label: 'Saídas', value: 'DEBIT' },
  ];
  
  const currentIndex = options.findIndex(opt => opt.value === initialValue);
  const currentLabel = options[currentIndex !== -1 ? currentIndex : 0].label;

  const innerContent = `
    <button id="${id}-prev" class="month-nav-btn relative z-10" type="button" aria-label="Anterior">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    
    <span id="${id}-label" class="month-selector-label" style="min-width: 70px; text-align: center;">${currentLabel}</span>
    
    <button id="${id}-next" class="month-nav-btn relative z-10" type="button" aria-label="Próximo">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  `;

  return DynamicIsland({
    id,
    content: innerContent,
    contentWrapperId: `${id}-content-wrapper`,
    className: 'month-selector-container', // Reutiliza estilo do MonthSelector
    style: 'padding: 2px 2px; gap: 0px;',
  });
}

function attachTypeSelectorListeners({ id, initialValue, onTypeChange }: { id: string, initialValue: string, onTypeChange: (val: string) => void }) {
  ensureTypeSelectorStyles();
  const options = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Entradas', value: 'CREDIT' },
    { label: 'Saídas', value: 'DEBIT' },
  ];
  
  let currentIndex = options.findIndex(opt => opt.value === initialValue);
  if (currentIndex === -1) currentIndex = 0;

  const label = document.getElementById(`${id}-label`);
  const prevBtn = document.getElementById(`${id}-prev`);
  const nextBtn = document.getElementById(`${id}-next`);

  if (!label || !prevBtn || !nextBtn) return;

  const updateType = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      currentIndex = (currentIndex + 1) % options.length;
    } else {
      currentIndex = (currentIndex - 1 + options.length) % options.length;
    }

    animateDynamicIslandTransition({
      containerId: id,
      contentWrapperId: `${id}-content-wrapper`,
      direction,
      onMidpoint: () => {
        const option = options[currentIndex];
        label.textContent = option.label;
        onTypeChange(option.value);
      },
    });
  };

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateType('prev');
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateType('next');
  });

  // Entrada inicial
  animateDynamicIslandEntrance(id, `${id}-content-wrapper`);
}

function formatBRL(value: number): string {
  const formatted = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [reais, centavos] = formatted.split(',');
  return `<span class="num-currency">R$</span><span class="num-integer">${reais}</span><span class="num-cents">,${centavos}</span>`;
}




async function loadCategories(userId: string) {
  try {
    const mappings = await CategoryService.ensureCategoryMappings(userId);
    categoryMap = CategoryService.buildCategoryMap(mappings);
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
  }
}

async function loadTransactions(userId: string) {
  const container = document.getElementById('transactions-container');
  if (!container) return;

  try {
    // Load categories, transactions and accounts in parallel
    const [, transactions, accounts] = await Promise.all([
      loadCategories(userId),
      loadPluggyRecords<Transaction>(userId, 'transactions', {
        orderBy: [{ field: 'date', direction: 'desc' }]
      }),
      loadPluggyRecords<any>(userId, 'accounts')
    ]);

    cachedTransactions = transactions;
    cachedAccounts = accounts;
    cachedAccountsById = new Map(accounts.map((account) => [account.id, account]));

    renderAccountSelector();
    renderFilteredTransactions('ALL');

    // Date Range Listeners
    const startPicker = document.getElementById('tx-date-start') as HTMLInputElement;
    const endPicker = document.getElementById('tx-date-end') as HTMLInputElement;
    
    if (startPicker) {
      startPicker.addEventListener('change', (e) => {
        startDate = (e.target as HTMLInputElement).value || 'ALL';
        renderFilteredTransactions(currentTypeFilter);
      });
    }
    if (endPicker) {
      endPicker.addEventListener('change', (e) => {
        endDate = (e.target as HTMLInputElement).value || 'ALL';
        renderFilteredTransactions(currentTypeFilter);
      });
    }

  } catch (error) {
    console.error('Erro ao carregar transações:', error);
    toaster.create({ title: 'Erro', description: 'Não foi possível carregar as movimentações.', type: 'error' });
    if (container) container.innerHTML = `<div class="p-8 text-center text-[var(--color-text-secondary)] text-[13px]">Falha ao buscar dados.</div>`;
  }
}

function renderFilteredTransactions(filter: string) {
  const container = document.getElementById('transactions-container');
  if (!container) return;

  const transactions = cachedTransactions.filter(tx => {
    if (!shouldShowTransactionInMovements(tx)) return false;

    const matchesType = filter === 'ALL' || tx.type === filter;
    
    // Filtro de Busca (Descrição ou Categoria)
    const matchesSearch = !currentSearchQuery || 
      (tx.description || '').toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
      (getCategoryName(tx, categoryMap) || '').toLowerCase().includes(currentSearchQuery.toLowerCase());

    const matchesAccount = selectedAccountId === 'ALL' || tx.accountId === selectedAccountId;

    // Filtro de Data (Intervalo)
    let matchesDate = true;
    if (startDate !== 'ALL' || endDate !== 'ALL') {
      const txDate = tx.date.split('T')[0];
      if (startDate !== 'ALL' && txDate < startDate) matchesDate = false;
      if (endDate !== 'ALL' && txDate > endDate) matchesDate = false;
    }

    return matchesType && matchesSearch && matchesAccount && matchesDate;
  });

  // Atualizar indicador de filtros ativos
  const indicator = document.getElementById('filter-active-indicator');
  const hasActiveFilters = selectedAccountId !== 'ALL' || startDate !== 'ALL' || endDate !== 'ALL' || currentTypeFilter !== 'ALL';
  if (indicator) {
    indicator.classList.toggle('hidden', !hasActiveFilters);
  }

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="mt-8">
        ${EmptyState({
          title: 'Nenhuma transação encontrada',
          description: currentSearchQuery 
            ? `Não encontramos resultados para "${currentSearchQuery}".`
            : (filter === 'ALL'
                ? 'Conecte sua conta corrente e sincronize os dados para visualizar suas movimentações.'
                : `Não há ${filter === 'CREDIT' ? 'entradas' : 'saídas'} registradas.`),
          icon: ''
        })}
      </div>
    `;
    initEmptyStateLotties();
    return;
  }

  // Ordenar transações por data decrescente
  const sortedTransactions = [...transactions].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da; // mais recentes primeiro
  });

  const filterLabel = filter === 'ALL' ? 'Todas as Movimentações' :
                      filter === 'CREDIT' ? 'Entradas' : 'Saídas';

  const totalAmount = transactions.reduce((sum, tx) => {
    return sum + (tx.type === 'CREDIT' ? Math.abs(tx.amount) : -Math.abs(tx.amount));
  }, 0);
  const totalColor = totalAmount >= 0 ? 'text-emerald-400' : 'text-red-500';
  const totalSign = totalAmount >= 0 ? '+' : '-';

  container.innerHTML = `
      <div class="cc-table-wrapper animate-cascade">
          <div class="cc-table-header">
              <div class="cc-table-header-left flex items-center gap-4">
                <span class="cc-table-header-title">${filterLabel}</span>
              </div>

              <div class="cc-table-header-right hidden sm:flex items-center gap-4">
                 <div class="flex items-center gap-1.5">
                   <span class="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-secondary)] opacity-60">Total:</span>
                   <span class="cc-amount ${totalColor} !text-[15px]">${totalSign}${formatBRL(Math.abs(totalAmount))}</span>
                 </div>
              </div>
          </div>
          <div class="cc-table-scroll">
              <table class="cc-table">
                  <thead>
                      <tr>
                          <th style="width: 120px;">Data</th>
                          <th>Descrição / Estabelecimento</th>
                          <th style="width: 150px;">Categoria</th>
                          <th style="width: 140px; text-align: right;">Valor</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${sortedTransactions.map(tx => {
                        const isCredit = tx.type === 'CREDIT';
                        const displayAmount = isCredit ? Math.abs(tx.amount) : -Math.abs(tx.amount);
                        const amountColor = isCredit ? 'text-emerald-400' : 'text-red-500';
                        const sign = isCredit ? '+' : '';
                        const catName = getCategoryName(tx, categoryMap);
                        const dateObj = new Date(tx.date);
                        const displayDate = dateObj.toLocaleDateString('pt-BR');

                        return `
                          <tr class="cc-row" data-tx-id="${tx.id}">
                            <td class="tx-cell-date">
                              ${displayDate}
                            </td>
                            <td class="tx-cell-desc">
                              <span class="tx-description" title="${tx.description || ''}">
                                ${tx.description || 'Transação'}
                              </span>
                            </td>
                            <td class="tx-cell-cat">
                              <span class="cc-category">${catName}</span>
                            </td>
                            <td class="tx-cell-amount">
                              <span class="cc-amount ${amountColor}">${sign}${formatBRL(Math.abs(displayAmount))}</span>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                  </tbody>
              </table>
          </div>
      </div>
  `;

  gsap.fromTo(
    '.cc-table-wrapper',
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
  );
}

function renderAccountSelector() {
  const container = document.getElementById('tx-account-selector');
  if (!container) return;

  const filteredAccounts = getEligibleAccounts();
  
  const accountsList = [{ id: 'ALL', name: 'Todas as Contas' }, ...filteredAccounts];
  let currentIndex = accountsList.findIndex(a => a.id === selectedAccountId);
  if (currentIndex === -1) {
    currentIndex = 0;
    selectedAccountId = 'ALL';
  }

  const currentAccount = accountsList[currentIndex];

  const content = `
    <button id="tx-acc-prev" class="account-nav-btn" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <span class="account-selector-label">${currentAccount.name || 'Conta'}</span>
    <button id="tx-acc-next" class="account-nav-btn" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  `;

  container.innerHTML = DynamicIsland({
    id: 'tx-acc-selector-island',
    content,
    contentWrapperId: 'tx-acc-content',
    className: 'account-selector-container',
    hidden: false
  });

  // Listeners
  const prevBtn = document.getElementById('tx-acc-prev');
  const nextBtn = document.getElementById('tx-acc-next');

  prevBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + accountsList.length) % accountsList.length;
    selectedAccountId = accountsList[currentIndex].id;
    updateAccountSelectorUI(accountsList[currentIndex].name, 'prev');
  });

  nextBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % accountsList.length;
    selectedAccountId = accountsList[currentIndex].id;
    updateAccountSelectorUI(accountsList[currentIndex].name, 'next');
  });
}

function updateAccountSelectorUI(name: string, direction: any) {
  const label = document.querySelector('.account-selector-label');
  if (label) label.textContent = name;

  animateDynamicIslandTransition({
    containerId: 'tx-acc-selector-island',
    contentWrapperId: 'tx-acc-content',
    direction,
    onMidpoint: () => {
      renderFilteredTransactions(currentTypeFilter);
    }
  });
}
