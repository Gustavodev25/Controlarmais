import { auth } from './firebase';
import { API_BASE } from './apiConfig';

export interface StripeSessionStartResponse {
  success?: boolean;
  url?: string;
  sessionId?: string;
  alreadySubscribed?: boolean;
  portalUrl?: string;
  error?: string;
}

export interface StripeSessionStatusResponse {
  success?: boolean;
  sessionId?: string;
  kind?: string;
  paymentStatus?: string | null;
  checkoutStatus?: string | null;
  subscriptionStatus?: string | null;
  plan?: string | null;
  credited?: boolean;
  creditsAdded?: number;
  extraSyncCredits?: number | null;
  error?: string;
}

export function getApiBaseUrl() {
  return API_BASE;
}

async function getAuthHeaders() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Usuario nao autenticado.');
  }

  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function getErrorMessage(payload: { error?: string }) {
  return payload.error || 'Nao foi possivel iniciar a operacao no Stripe.';
}

export async function createStripeSubscriptionSession(origin = window.location.origin, promotionCode?: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/stripe/checkout/subscription-session`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ origin, promotionCode }),
  });

  const payload = await response.json() as StripeSessionStartResponse;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return payload;
}

export async function createStripeSyncCreditsSession(comboId: string, origin = window.location.origin) {
  const response = await fetch(`${getApiBaseUrl()}/api/stripe/checkout/sync-credits-session`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ comboId, origin }),
  });

  const payload = await response.json() as StripeSessionStartResponse;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return payload;
}

export async function createStripeCustomerPortalSession(origin = window.location.origin) {
  const response = await fetch(`${getApiBaseUrl()}/api/stripe/customer-portal/session`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ origin }),
  });

  const payload = await response.json() as StripeSessionStartResponse;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return payload;
}

export async function getStripeCheckoutSessionStatus(sessionId: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/stripe/checkout/session-status/${encodeURIComponent(sessionId)}`, {
    headers: await getAuthHeaders(),
  });

  const payload = await response.json() as StripeSessionStatusResponse;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return payload;
}

export async function syncStripeSubscription(): Promise<{ success: boolean; status?: string; nextBillingDate?: string; invoicesSynced?: number; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/api/stripe/sync-subscription`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return payload;
}

export async function migrateAsaasToStripe(origin = window.location.origin): Promise<{ success: boolean; url?: string; sessionId?: string; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/api/stripe/asaas-migrate`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ origin }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Nao foi possivel iniciar a migracao para o Stripe.');
  }

  return payload;
}

export async function syncAsaasSubscription(): Promise<{ success: boolean; synced?: boolean; status?: string; plan?: string; nextBillingDate?: string; asaasStatus?: string; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/api/asaas/sync-subscription`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Nao foi possivel sincronizar a assinatura Asaas.');
  }

  return payload;
}

export function clearStripeCheckoutQueryParams() {
  const url = new URL(window.location.href);
  const keys = ['checkout', 'syncCredits', 'session_id'];
  let changed = false;

  keys.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (!changed) return;
  window.history.replaceState({}, '', url.toString());
}
