import { auth } from '../lib/firebase';
import { clearStripeCheckoutQueryParams, createStripeSyncCreditsSession, getStripeCheckoutSessionStatus } from '../lib/stripe';
import { Modal } from './Modal';
import { toaster } from './Toast';
import type { SyncCombo } from './SyncCreditsModal';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

let syncCreditsReturnInFlight = false;

function isInvalidStripeSessionId(sessionId: string | null) {
  return !sessionId || sessionId === '{CHECKOUT_SESSION_ID}';
}

async function resolveSyncCreditsReturn(sessionId: string) {
  let lastResult: Awaited<ReturnType<typeof getStripeCheckoutSessionStatus>> | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    lastResult = await getStripeCheckoutSessionStatus(sessionId);
    if (lastResult.credited) {
      return lastResult;
    }
    await delay(1500);
  }

  return lastResult;
}

export async function handlePendingSyncCreditsCheckoutReturn() {
  if (syncCreditsReturnInFlight) return;
  if (!auth.currentUser) return;

  const params = new URLSearchParams(window.location.search);
  const state = params.get('syncCredits');
  const sessionId = params.get('session_id');

  if (state === 'cancelled') {
    syncCreditsReturnInFlight = true;
    toaster.create({
      title: 'Checkout cancelado',
      description: 'Nenhum credito extra foi comprado.',
      type: 'warning',
    });
    clearStripeCheckoutQueryParams();
    return;
  }

  if (state !== 'success') {
    return;
  }

  if (isInvalidStripeSessionId(sessionId)) {
    syncCreditsReturnInFlight = true;
    toaster.create({
      title: 'Retorno invalido do Stripe',
      description: 'O session_id da compra nao foi preenchido corretamente. Tente abrir o checkout novamente.',
      type: 'error',
    });
    clearStripeCheckoutQueryParams();
    return;
  }

  syncCreditsReturnInFlight = true;

  try {
    if (!sessionId) return;
    const result = await resolveSyncCreditsReturn(sessionId);

    if (result?.credited) {
      toaster.create({
        title: 'Coins liberados',
        description: `${result.creditsAdded || 0} Coin(s) adicionados com sucesso.`,
        type: 'success',
      });
      window.dispatchEvent(new CustomEvent('app-sync-completed'));
    } else {
      toaster.create({
        title: 'Pagamento confirmado',
        description: 'A compra foi recebida e ainda esta sincronizando os Coins.',
        type: 'message',
      });
    }
  } catch (error: any) {
    console.error('Stripe sync credits return error:', error);
    toaster.create({
      title: 'Falha ao confirmar compra',
      description: error.message || 'Nao foi possivel confirmar a compra dos Coins.',
      type: 'error',
    });
  } finally {
    clearStripeCheckoutQueryParams();
  }
}

export async function openSyncCreditsCheckout(_userAuth: any, combo: SyncCombo) {
  const isUnlimited = combo.credits === 9999;

  Modal({
    title: 'Finalizar Pagamento',
    showCancel: false,
    showCloseButton: true,
    confirmText: 'Pagar no Stripe',
    maxWidth: 'max-w-xl',
    content: `
      <div style="padding:28px;display:flex;flex-direction:column;gap:20px;">
        <div>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-secondary);opacity:0.7;">Etapa de pagamento</span>
          <h3 style="margin-top:8px;font-size:17px;font-weight:700;color:var(--color-text);letter-spacing:-0.02em;">${combo.name} — ${isUnlimited ? 'Acesso ilimitado' : `${combo.credits} Coins`}</h3>
        </div>
        <p style="font-size:13px;line-height:1.75;color:var(--color-text-secondary);">
          Voce sera redirecionado para o checkout hospedado do Stripe para concluir o pagamento de <strong style="color:var(--color-text);font-weight:600;">${formatMoney(combo.amount)}</strong>. Ao finalizar e retornar, as Coins serao creditadas automaticamente na sua conta.
        </p>
        <p style="font-size:12px;line-height:1.65;color:var(--color-text-secondary);opacity:0.7;">
          O ambiente de pagamento e gerenciado integralmente pelo Stripe. Nenhum dado de cartao e coletado ou armazenado por esta plataforma.
        </p>
      </div>
    `,
    onConfirm: async () => {
      try {
        toaster.create({
          title: 'Redirecionando',
          description: 'Abrindo checkout seguro do Stripe...',
          type: 'message',
        });

        const result = await createStripeSyncCreditsSession(combo.id, window.location.origin);
        if (!result.url) {
          throw new Error('Nao foi possivel iniciar o checkout no Stripe.');
        }

        window.location.assign(result.url);
      } catch (error: any) {
        console.error('Stripe sync checkout error:', error);
        toaster.create({
          title: 'Erro no pagamento',
          description: error.message || 'Nao foi possivel abrir o checkout do Stripe.',
          type: 'error',
        });
        throw new Error('PREVENT_CLOSE');
      }
    }
  });
}
