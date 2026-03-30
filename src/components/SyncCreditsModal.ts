import { Modal } from './Modal';
import { openSyncCreditsCheckout } from './SyncCreditsCheckout';
import { getSyncCredits } from '../lib/syncCredits';

export interface SyncCombo {
  id: string;
  name: string;
  amount: number;
  credits: number;
  description: string;
}

export const SYNC_COMBOS: SyncCombo[] = [
  {
    id: 'combo_light',
    name: 'Light',
    amount: 4.90,
    credits: 7,
    description: '7 Coins'
  },
  {
    id: 'combo_performance',
    name: 'Performance',
    amount: 14.90,
    credits: 28,
    description: '28 Coins'
  },
  {
    id: 'combo_full',
    name: 'Full',
    amount: 49.90,
    credits: 9999,
    description: 'Ilimitado'
  }
];

export async function openSyncCreditsModal(user: any) {
  const balance = await getSyncCredits(user.uid);
  const content = `
    <style>
      .balance-indicator {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 10px 16px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: var(--color-text-secondary);
        font-size: 13px;
        font-weight: 500;
      }
      .balance-value {
        color: var(--color-text);
        font-weight: 700;
        font-family: var(--font-mono);
      }
      .combo-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .combo-card:hover {
        border-color: var(--color-border-light);
        transform: translateY(-2px);
        background: var(--color-surface-hover);
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      }
      .combo-card.active {
        border-color: #D97757;
        background: var(--color-surface-hover);
      }
      .combo-card.active::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        border: 2px solid #D97757;
        border-radius: 16px;
        pointer-events: none;
        opacity: 0.3;
      }
      
      .combo-card-header {
        padding: 10px 16px;
        border-bottom: 1px solid var(--color-border-light);
      }
      .combo-card-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--color-text-secondary);
        opacity: 0.8;
      }

      .combo-card-body {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .combo-price-unit {
        font-size: 11px;
        color: var(--color-text-secondary);
        font-weight: 500;
        opacity: 0.7;
      }
      .combo-price-main {
        font-size: 24px;
        font-weight: 800;
        color: var(--color-text);
        letter-spacing: -0.5px;
        line-height: 1;
      }
      .combo-price-cents {
        font-size: 14px;
        color: var(--color-text-secondary);
        font-weight: 600;
      }
    </style>

    <div class="balance-indicator">
      <img src="/assets/logo/coinzinha.png" style="width: 20px; height: 20px; object-fit: contain;" />
      <span>Você tem <span class="balance-value">${balance.extra >= 9999 ? '∞' : balance.extra}</span> Coins</span>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px;" id="combo-selection-grid">
      ${SYNC_COMBOS.map(combo => {
        const [reais, centavos] = combo.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(',');
        const isUnlimited = combo.credits === 9999;
        return `
        <div
          data-combo-id="${combo.id}"
          class="combo-card"
        >
          <div class="combo-card-header">
            <span class="combo-card-label">${combo.name}</span>
          </div>
          
          <div class="combo-card-body">
            <div>
              <p style="font-size:11px;color:var(--color-text-secondary);font-weight:450;">
                ${isUnlimited ? 'Acesso ilimitado' : combo.credits + ' Coins disponíveis'}
              </p>
            </div>
            <div style="display:flex;align-items:baseline;gap:2px;flex-shrink:0;">
              <span class="combo-price-unit">R$</span>
              <span class="combo-price-main">${reais}</span>
              <span class="combo-price-cents">,${centavos}</span>
            </div>
          </div>
        </div>
      `}).join('')}
    </div>
  `;

  let selectedCombo: SyncCombo | null = null;

  Modal({
    title: 'Comprar Atualizações',
    content,
    confirmText: 'Continuar',
    onConfirm: async () => {
      if (!selectedCombo) return;
      import('./Toast').then(({ toaster }) => toaster.create({ title: "Aguarde", description: "Preparando pagamento...", type: "message" }));
      await openSyncCreditsCheckout(user, selectedCombo);
    }
  });

  setTimeout(() => {
    const cards = document.querySelectorAll<HTMLElement>('.combo-card');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const comboId = card.getAttribute('data-combo-id');
        selectedCombo = SYNC_COMBOS.find(c => c.id === comboId) || null;
      });
    });

    if (cards.length > 0) cards[0].click();
  }, 100);
}