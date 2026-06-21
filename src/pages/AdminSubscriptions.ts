import gsap from 'gsap';
import { DateRangePicker, attachDateRangePickerListeners } from '../components/DateRangePicker';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { Header, attachHeaderListeners } from '../components/Header';
import { toaster } from '../components/Toast';
import { Modal } from '../components/Modal';
import { auth } from '../lib/firebase';
import { API_BASE } from '../lib/apiConfig';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Avvvatars from 'avvvatars-react';
import { FilterSelector, attachFilterSelectorListeners, type FilterOption } from '../components/FilterSelector';
import { Tooltip, initAllTooltips } from '../components/Tooltip';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { GenericDropdown, attachGenericDropdownListeners } from '../components/GenericDropdown';

const verifiedIconStripe = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#6faf6e" class="shrink-0" title="Stripe: Assinatura Verificada e Ativa"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697 -.698a3.2 3.2 0 0 1 -.147 -4.382l.145 -.154l.698 -.698a1.2 1.2 0 0 0 .341 -.71l.008 -.135v-1l.005 -.182a3.2 3.2 0 0 1 3.013 -3.013l.182 -.005h1a1.2 1.2 0 0 0 .743 -.258l.1 -.09l.698 -.697a3.2 3.2 0 0 1 2.269 -.944zm3.697 7.282a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" /></svg>`;
const verifiedIconAsaas = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#2869d2" class="shrink-0" title="Asaas: Assinatura Verificada e Ativa"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697 -.698a3.2 3.2 0 0 1 -.147 -4.382l.145 -.154l.698 -.698a1.2 1.2 0 0 0 .341 -.71l.008 -.135v-1l.005 -.182a3.2 3.2 0 0 1 3.013 -3.013l.182 -.005h1a1.2 1.2 0 0 0 .743 -.258l.1 -.09l.698 -.697a3.2 3.2 0 0 1 2.269 -.944zm3.697 7.282a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" /></svg>`;
const verifiedIconApple = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8" class="shrink-0" title="Apple IAP: Assinatura Verificada e Ativa"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697-.698a3.2 3.2 0 0 1-.147-4.382l.145-.154l.698-.698a1.2 1.2 0 0 0 .341-.71l.008-.135v-1l.005-.182a3.2 3.2 0 0 1 3.013-3.013l.182-.005h1a1.2 1.2 0 0 0 .743-.258l.1-.09l.698-.697a3.2 3.2 0 0 1 2.269-.944zm3.697 7.282a1 1 0 0 0-1.414 0l-3.293 3.292l-1.293-1.292l-.094-.083a1 1 0 0 0-1.32 1.497l2 2l.094.083a1 1 0 0 0 1.32-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32z"/></svg>`;
const verifiedIconAndroid = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#22c55e" class="shrink-0" title="Google Play: Assinatura Verificada e Ativa"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697-.698a3.2 3.2 0 0 1-.147-4.382l.145-.154l.698-.698a1.2 1.2 0 0 0 .341-.71l.008-.135v-1l.005-.182a3.2 3.2 0 0 1 3.013-3.013l.182-.005h1a1.2 1.2 0 0 0 .743-.258l.1-.09l.698-.697a3.2 3.2 0 0 1 2.269-.944zm3.697 7.282a1 1 0 0 0-1.414 0l-3.293 3.292l-1.293-1.292l-.094-.083a1 1 0 0 0-1.32 1.497l2 2l.094.083a1 1 0 0 0 1.32-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32z"/></svg>`;
const loaderIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" title="Verificando assinatura..."><style>@keyframes spinner_qM83{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}@keyframes spinner_8Q3b{100%{transform:rotate(360deg)}}.spi{transform-origin:center;animation:spinner_8Q3b 2s linear infinite}.spi circle{stroke-linecap:round;animation:spinner_qM83 1.5s ease-in-out infinite}</style><g class="spi"><circle cx="12" cy="12" r="9.5" fill="none" /></g></svg>`;
const warningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" title="Verificacao indisponivel"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimalFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

type ProviderError = {
  provider: string;
  status?: number | null;
  message?: string;
};

// ====================== HELPERS ======================

function normalizeValue(value: any): string {
  return String(value ?? '').trim().toLowerCase();
}

function providerName(provider: string): string {
  const normalized = normalizeValue(provider);
  if (normalized === 'asaas') return 'Asaas';
  if (normalized === 'stripe') return 'Stripe';
  if (['apple', 'app_store', 'appstore', 'ios', 'iphone', 'storekit'].includes(normalized)) return 'Apple IAP';
  if (['android', 'google_play', 'googleplay', 'play_store', 'playstore', 'google'].includes(normalized)) return 'Google Play';
  return provider || 'provedor';
}

function normalizeProviderKey(provider: any): string {
  const normalized = normalizeValue(provider);
  if (['apple', 'app_store', 'appstore', 'ios', 'iphone', 'storekit'].includes(normalized)) return 'apple';
  if (['android', 'google_play', 'googleplay', 'play_store', 'playstore', 'google'].includes(normalized)) return 'android';
  return normalized;
}

function isVerifiableProvider(provider: any): boolean {
  return ['stripe', 'asaas', 'apple', 'android'].includes(normalizeProviderKey(provider));
}

function hasProviderError(errors: ProviderError[], provider: string): boolean {
  const normalized = normalizeProviderKey(provider);
  return Boolean(normalized && errors.some((error) => normalizeProviderKey(error.provider) === normalized));
}

function providerErrorsText(errors: ProviderError[]): string {
  const names = Array.from(new Set(errors.map((error) => providerName(error.provider))));
  return names.length ? names.join(', ') : 'provedores';
}

function parseMoneyValue(value: any): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined) return 0;

  let normalized = String(value).trim().replace(/[^\d,.-]/g, '');
  if (!normalized) return 0;

  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isAnnualBillingCycle(value: any): boolean {
  return ['annual', 'year', 'yearly', 'anual'].includes(normalizeValue(value));
}

function getProviderStatus(userItem: any): string {
  return normalizeValue(userItem.providerStatus || userItem.stripeStatus || userItem.appleStatus || userItem.googlePlayStatus || userItem.status || userItem.trialStatus);
}

function isTrialClient(userItem: any): boolean {
  return userItem.isVerified === true && (
    getProviderStatus(userItem) === 'trialing' ||
    normalizeValue(userItem.trialStatus) === 'trialing'
  );
}

function isActiveClient(userItem: any): boolean {
  return userItem.isVerified === true;
}

function isPayingClient(userItem: any): boolean {
  if (userItem.isVerified !== true) return false;
  if (isTrialClient(userItem)) return false;
  const p = normalizeProviderKey(userItem.provider);
  if (p !== 'asaas' && p !== 'stripe') return false;
  const status = getProviderStatus(userItem);
  return status === 'active';
}

function getMonthlyRevenue(userItem: any): number {
  if (!isPayingClient(userItem)) return 0;

  const verifiedAmount = parseMoneyValue(userItem.verifiedMonthlyAmount);
  if (verifiedAmount > 0) return verifiedAmount;

  const monthlyAmount = parseMoneyValue(userItem.subscriptionMonthlyAmount);
  if (monthlyAmount > 0) return monthlyAmount;

  const rawAmount = parseMoneyValue(
    userItem.subscriptionAmount ?? userItem.subscriptionPrice ?? userItem.nextAmount ?? userItem.price
  );

  if (rawAmount > 0) {
    return isAnnualBillingCycle(userItem.billingCycle) ? rawAmount / 12 : rawAmount;
  }

  return 0;
}

function getActiveClientSummary(users: any[]): { count: number; revenue: number } {
  return users.reduce((acc, userItem) => {
    if (!isPayingClient(userItem)) return acc;

    acc.count += 1;
    acc.revenue += getMonthlyRevenue(userItem);
    return acc;
  }, { count: 0, revenue: 0 });
}

function updateTableSummary(users: any[]): void {
  const summary = getActiveClientSummary(users);
  const trialCount = users.filter(isTrialClient).length;
  const canceledStripeCount = users.filter(hasStripeCancellation).length;
  const activeCountEl = document.querySelector('.cc-active-client-count');
  const trialCountEl = document.querySelector('.cc-trial-client-count');
  const revenueEl = document.querySelector('.cc-active-revenue');
  const canceledEl = document.querySelector('.cc-stripe-cancel-count');

  if (activeCountEl) {
    activeCountEl.textContent = `${summary.count} cliente${summary.count !== 1 ? 's' : ''}`;
  }

  if (trialCountEl) {
    trialCountEl.textContent = `${trialCount} trial${trialCount !== 1 ? 's' : ''}`;
  }

  if (revenueEl) {
    revenueEl.textContent = moneyFormatter.format(summary.revenue);
  }

  if (canceledEl) {
    canceledEl.textContent = `${canceledStripeCount} usuario${canceledStripeCount !== 1 ? 's' : ''}`;
  }
}

function statusBadge(status: string, verified: string | null): string {
  const s = (verified || status || '').toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Ativo', cls: 'cc-badge-paid' },
    overdue: { label: 'Inadimpl.', cls: 'cc-badge-pending' },
    past_due: { label: 'Inadimpl.', cls: 'cc-badge-pending' },
    trialing: { label: 'Trial', cls: 'cc-badge-pending' },
    inactive: { label: 'Inativo', cls: 'cc-badge-inactive' },
    canceled: { label: 'Cancelado', cls: 'cc-badge-inactive' },
    unpaid: { label: 'Não Pago', cls: 'cc-badge-charge' },
    error: { label: 'Erro API', cls: 'cc-badge-charge' },
  };
  const entry = map[s] ?? { label: status || '—', cls: 'cc-badge-inactive' };
  return `<span class="cc-badge ${entry.cls}">${entry.label}</span>`;
}

function providerBadge(provider: string): string {
  if (provider === 'asaas') {
    return `<span class="cc-category cc-category-asaas">Asaas</span>`;
  }
  if (provider === 'stripe') {
    return `<span class="cc-category cc-category-stripe">Stripe</span>`;
  }
  return `<span class="cc-category">—</span>`;
}

function normalizeSignupPlatformCandidate(value: any, isUserAgent = false): string {
  let raw = normalizeValue(value);
  if (!raw) return 'unknown';
  if (isUserAgent) {
    raw = raw.replace(/applewebkit/gi, '').replace(/safari/gi, '');
  }
  if (raw.includes('android')) return 'android';
  if (raw.includes('iphone') || raw.includes('ipad') || raw.includes('ipod') || /(^|\W)ios(\W|$)/.test(raw) || raw.includes('apple')) return 'iphone';
  if (raw.includes('mobile') || raw.includes('mobi') || raw.includes('celular')) return 'mobile';
  if (raw === 'pc' || raw.includes('desktop') || raw.includes('web') || raw.includes('windows') || raw.includes('macintosh') || raw.includes('macbook') || raw.includes('linux')) return 'web';
  return raw;
}

function pickFirstKnownSignupPlatform(values: any[], isUserAgent = false): string {
  for (const value of values) {
    const platform = normalizeSignupPlatformCandidate(value, isUserAgent);
    if (platform !== 'unknown') return platform;
  }
  return 'unknown';
}

function pickPreciseSignupPlatform(values: any[]): string {
  const platforms = values.map((value) => normalizeSignupPlatformCandidate(value));
  return platforms.find((platform) => platform === 'android' || platform === 'iphone') || 'unknown';
}

function getSignupPlatform(userItem: any): string {
  const device = userItem.signupDevice || userItem.device || userItem.deviceInfo || {};
  const topLevelPlatform = pickFirstKnownSignupPlatform([userItem.signupPlatform]);
  if (topLevelPlatform !== 'unknown') return topLevelPlatform;

  const source = normalizeValue(userItem.signupSource || device.signupSource);
  const createdFromMobile = userItem.createdFromMobile ?? device.createdFromMobile;
  if (createdFromMobile === false || ['desktop', 'web', 'pc', 'computer'].includes(source)) return 'web';

  const deviceSignupPlatform = pickFirstKnownSignupPlatform([device.signupPlatform]);
  if (deviceSignupPlatform !== 'unknown') return deviceSignupPlatform;

  const userAgent = normalizeSignupPlatformCandidate(
    userItem.signupUserAgent || userItem.userAgent || device.userAgent,
    true
  );
  if (['android', 'iphone'].includes(userAgent)) return userAgent;

  if (createdFromMobile === true || source === 'mobile' || source === 'app') {
    const preciseMobile = pickPreciseSignupPlatform([
      userItem.platform,
      device.platform,
      device.os,
      userItem.os,
      userItem.operatingSystem,
      userItem.deviceName,
      device.deviceName,
      userItem.deviceType,
      device.deviceType,
      device.name,
      device.type,
    ]);
    return preciseMobile !== 'unknown' ? preciseMobile : 'mobile';
  }

  if (['mobile', 'web'].includes(userAgent)) return userAgent;

  // Fallback: infer platform from subscription provider (IAP trial users)
  const providerKey = normalizeProviderKey(userItem.provider);
  if (providerKey === 'apple') return 'apple_iap';
  if (providerKey === 'android') return 'android';

  const fallback = pickFirstKnownSignupPlatform([
    userItem.platform,
    device.platform,
    device.os,
    userItem.os,
    userItem.operatingSystem,
    userItem.deviceName,
    device.deviceName,
    userItem.deviceType,
    device.deviceType,
    device.name,
    device.type,
  ]);
  if (fallback === 'unknown') {
    const createdDate = parseDateValue(userItem.createdAt || userItem.createdDate || userItem.dateCreated);
    if (createdDate && createdDate.getTime() < new Date('2026-06-15T00:00:00Z').getTime()) {
      return 'web';
    }
  }
  return fallback;
}

function isMobileSignup(userItem: any): boolean {
  const platform = getSignupPlatform(userItem);
  if (['android', 'iphone', 'apple_iap', 'mobile'].includes(platform)) return true;
  if (userItem.createdFromMobile === true) return true;
  const source = normalizeValue(userItem.signupSource);
  return source === 'mobile' || source === 'app';
}

function hasStoreTrialSignal(userItem: any): boolean {
  const provider = normalizeProviderKey(userItem.provider);
  const platform = getSignupPlatform(userItem);
  return provider === 'apple' ||
    provider === 'android' ||
    ['android', 'iphone', 'apple_iap'].includes(platform) ||
    Boolean(
      userItem.appleOriginalTransactionId ||
      userItem.appStoreOriginalTransactionId ||
      userItem.googlePlayPurchaseToken ||
      userItem.androidPurchaseToken
    );
}

function getSignupPlatformLabel(userItem: any): string {
  const platform = getSignupPlatform(userItem);
  if (platform === 'android') return 'Android';
  if (platform === 'apple_iap') return 'Apple';
  if (platform === 'iphone') return 'Apple';
  if (platform === 'mobile') return 'Celular';
  if (platform === 'web') return 'Web';
  return 'Indefinido';
}

function getSignupOriginClass(userItem: any): string {
  const platform = getSignupPlatform(userItem);
  const isMobile = isMobileSignup(userItem);
  if (platform === 'android') return 'cc-origin-android';
  if (platform === 'apple_iap') return 'cc-origin-iphone';
  if (platform === 'iphone') return 'cc-origin-iphone';
  if (isMobile) return 'cc-origin-mobile';
  if (platform === 'web') return 'cc-origin-desktop';
  return 'cc-origin-unknown';
}

function getSignupOriginSourceLabel(userItem: any): string {
  const platform = getSignupPlatform(userItem);
  const isMobile = isMobileSignup(userItem);
  if (platform === 'android') return 'Criada no Android';
  if (platform === 'apple_iap') return 'Criada no Apple';
  if (platform === 'iphone') return 'Criada na Apple';
  if (isMobile) return 'Criada pelo celular';
  if (platform === 'web') return 'Criada na web';
  return 'Origem indefinida: sem IAP ou Google Play';
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr || dateStr === 'N/A' || dateStr === '—') return 'Data não disponível';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtShortDate(dateStr: string | null): string {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'â€”') return '';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getStripeCancellationInfo(userItem: any): null | {
  requestedAt: string | null;
  effectiveAt: string | null;
  endedAt: string | null;
  isInMrr: boolean;
} {
  if (userItem.provider !== 'stripe') return null;

  const status = normalizeValue(userItem.providerStatus || userItem.status);
  const requestedAt = userItem.canceledAt || userItem.canceledAtDate || null;
  const endedAt = userItem.endedAt || userItem.endedAtDate || null;
  const effectiveAt = userItem.cancelAt || userItem.cancelAtDate || endedAt || userItem.currentPeriodEnd || userItem.nextBillingDate || null;
  const hasCancellation = Boolean(
    userItem.cancelAtPeriodEnd ||
    requestedAt ||
    endedAt ||
    userItem.cancelAt ||
    userItem.cancelAtDate ||
    status === 'canceled'
  );

  if (!hasCancellation) return null;

  return {
    requestedAt,
    effectiveAt,
    endedAt,
    isInMrr: userItem.isVerified === true && status === 'active',
  };
}

function hasStripeCancellation(userItem: any): boolean {
  return getStripeCancellationInfo(userItem) !== null;
}

function renderCancellationNote(userItem: any): string {
  const info = getStripeCancellationInfo(userItem);
  if (!info) return '';

  const requestedLabel = info.requestedAt ? fmtDate(info.requestedAt) : 'data nao disponivel';
  const effectiveLabel = info.effectiveAt ? fmtDate(info.effectiveAt) : null;
  const requestedShort = info.requestedAt ? fmtShortDate(info.requestedAt) : '--/--';
  const effectiveShort = info.effectiveAt ? fmtShortDate(info.effectiveAt) : null;
  const titleParts = [`Cancelou em ${requestedLabel}`];
  if (effectiveLabel) titleParts.push(`${info.endedAt ? 'Encerrada em' : 'Encerra em'} ${effectiveLabel}`);
  if (info.isInMrr && effectiveLabel) titleParts.push(`Conta no MRR ate ${effectiveLabel}`);

  return `
    <span class="cc-cancel-chip" title="${titleParts.join(' | ')}">
      <span class="cc-cancel-dot"></span>
      <span class="cc-cancel-main">Cancelou ${requestedShort}</span>
      ${effectiveShort ? `<span class="cc-cancel-sep"></span><span class="cc-cancel-meta">${info.isInMrr ? 'MRR' : (info.endedAt ? 'Fim' : 'Ate')} ${effectiveShort}</span>` : ''}
    </span>
  `;
}

function renderSubscriptionTimelineNote(userItem: any): string {
  const trialEnd = userItem.trialEndsAt || userItem.trialEndsDate || null;
  const paidAt = userItem.firstPaidAt || userItem.convertedToPaidAt || null;

  if (isTrialClient(userItem) && trialEnd) {
    const trialDuration = getTrialDurationDays(userItem) || 7;
    return `
      <span class="cc-timeline-chip cc-timeline-trial" title="Trial de ${trialDuration} dias">
        <span class="cc-timeline-dot"></span>
        <span>Trial ate ${fmtShortDate(trialEnd) || fmtDate(trialEnd)}</span>
      </span>
    `;
  }

  if (paidAt) {
    return `
      <span class="cc-timeline-chip cc-timeline-paid" title="Virou pagante em ${fmtDate(paidAt)}">
        <span class="cc-timeline-dot"></span>
        <span>Pagou ${fmtShortDate(paidAt) || fmtDate(paidAt)}</span>
      </span>
    `;
  }

  return '';
}

function renderCancellationModalRows(userItem: any): string {
  const info = getStripeCancellationInfo(userItem);
  if (!info) return '';

  const requestedLabel = info.requestedAt ? fmtDate(info.requestedAt) : 'Data nao disponivel';
  const effectiveLabel = info.effectiveAt ? fmtDate(info.effectiveAt) : 'Data nao disponivel';
  const mrrLabel = info.isInMrr
    ? `Sim, ate ${effectiveLabel}`
    : 'Nao, assinatura ja encerrada/inativa';

  return `
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Cancelou no Stripe</span>
        <span class="font-medium">${requestedLabel}</span>
      </div>
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">${info.endedAt ? 'Encerrada em' : 'Encerra em'}</span>
        <span class="font-medium">${effectiveLabel}</span>
      </div>
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Conta no MRR</span>
        <span class="font-medium">${mrrLabel}</span>
      </div>
  `;
}

function renderSubscriptionModalTimelineRows(userItem: any): string {
  const rows: string[] = [];
  const trialStartedAt = userItem.trialStartedAt || userItem.trialStartedDate || null;
  const trialEndsAt = userItem.trialEndsAt || userItem.trialEndsDate || null;
  const paidAt = userItem.firstPaidAt || userItem.convertedToPaidAt || null;

  if (hasTrialHistory(userItem) || isTrialClient(userItem)) {
    rows.push(`
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Trial</span>
        <span class="font-medium">${getTrialDurationDays(userItem) || userItem.trialDays || 7} dias</span>
      </div>
    `);
  }

  if (trialStartedAt) {
    rows.push(`
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Inicio do trial</span>
        <span class="font-medium">${fmtDate(trialStartedAt)}</span>
      </div>
    `);
  }

  if (trialEndsAt) {
    rows.push(`
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Fim do trial</span>
        <span class="font-medium">${fmtDate(trialEndsAt)}</span>
      </div>
    `);
  }

  if (paidAt) {
    rows.push(`
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Pagante desde</span>
        <span class="font-medium">${fmtDate(paidAt)}</span>
      </div>
    `);
  }

  return rows.join('');
}

function fmtRelativeTime(dateStr: string | null): { text: string; color: string } {
  if (!dateStr) return { text: 'Nunca entrou', color: 'var(--color-text-secondary)' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: 'Nunca entrou', color: 'var(--color-text-secondary)' };
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  let text: string;
  let color: string;

  if (diffSec < 60) {
    text = `Há ${diffSec}s`;
    color = '#22c55e';
  } else if (diffMin < 60) {
    text = `Há ${diffMin} min`;
    color = '#22c55e';
  } else if (diffHr < 24) {
    text = `Há ${diffHr}h`;
    color = diffHr < 6 ? '#22c55e' : '#f59e0b';
  } else if (diffDay < 7) {
    text = `Há ${diffDay} dia${diffDay !== 1 ? 's' : ''}`;
    color = '#f59e0b';
  } else {
    text = `Há ${diffDay} dias`;
    color = 'var(--color-text-secondary)';
  }

  return { text, color };
}

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeJsonAttr(value: any): string {
  return escapeHtml(JSON.stringify(value));
}

function parseDateValue(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCreatedDateValue(userItem: any): string | null {
  return userItem.createdAt || userItem.createdDate || userItem.dateCreated || null;
}

function getCreatedDateFormatted(userItem: any): string {
  const raw = getCreatedDateValue(userItem);
  if (!raw) return '';
  const d = parseDateValue(raw);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getTrialStartValue(userItem: any): string | null {
  return userItem.trialStartedAt || userItem.trialStartedDate || userItem.trialStart || null;
}

function getTrialEndValue(userItem: any): string | null {
  return userItem.trialEndsAt || userItem.trialEndsDate || userItem.trialEnd || null;
}

const ACTIVE_TRIAL_STATUSES = new Set(['trial', 'trialing']);
const FINISHED_TRIAL_STATUSES = new Set(['ended', 'expired', 'trial_ended', 'trial-ended', 'trial_expired', 'trial-expired']);

function getTrialLifecycleStatus(userItem: any): string {
  return normalizeValue(userItem.trialStatus);
}

function hasTrialHistory(userItem: any): boolean {
  if (!hasStoreTrialSignal(userItem)) return false;
  const status = getTrialLifecycleStatus(userItem);
  return Boolean(getTrialStartValue(userItem) || getTrialEndValue(userItem)) ||
    ACTIVE_TRIAL_STATUSES.has(status) ||
    FINISHED_TRIAL_STATUSES.has(status) ||
    status === 'converted';
}

function getTrialDaysRemaining(userItem: any): number | null {
  if (!hasStoreTrialSignal(userItem)) return null;
  const rawEnd = getTrialEndValue(userItem);
  const endDate = parseDateValue(rawEnd);
  if (!endDate) return null;

  const endOfDay = new Date(endDate);
  if (typeof rawEnd === 'string' && !rawEnd.includes('T')) {
    endOfDay.setHours(23, 59, 59, 999);
  }

  return Math.ceil((endOfDay.getTime() - Date.now()) / 86400000);
}

function getTrialDurationDays(userItem: any): number | null {
  if (!hasStoreTrialSignal(userItem)) return null;
  const startDate = parseDateValue(getTrialStartValue(userItem));
  const endDate = parseDateValue(getTrialEndValue(userItem));
  if (startDate && endDate) {
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
    return diffDays > 0 ? diffDays : null;
  }

  const rawTrialDays = Number(userItem.trialDays);
  if ((hasTrialHistory(userItem) || isTrialClient(userItem)) && Number.isFinite(rawTrialDays) && rawTrialDays > 0) {
    return Math.round(rawTrialDays);
  }
  return null;
}

function isSevenDayTrial(userItem: any): boolean {
  return hasStoreTrialSignal(userItem) &&
    (hasTrialHistory(userItem) || isTrialClient(userItem)) &&
    getTrialDurationDays(userItem) === 7;
}

function isConvertedClient(userItem: any): boolean {
  if (isPayingClient(userItem)) return true;
  if (userItem.firstPaidAt || userItem.firstPaidDate || userItem.convertedToPaidAt || userItem.convertedToPaidDate) return true;

  const plan = normalizeValue(userItem.plan);
  const status = getProviderStatus(userItem);
  return plan === 'pro' && ['active', 'overdue', 'past_due', 'canceled', 'cancelled', 'unpaid'].includes(status);
}

function isConvertedCanceledClient(userItem: any): boolean {
  if (!isConvertedClient(userItem)) return false;
  const status = getProviderStatus(userItem);
  return hasStripeCancellation(userItem) ||
    ['canceled', 'cancelled'].includes(status) ||
    Boolean(userItem.canceledAt || userItem.canceledAtDate || userItem.endedAt || userItem.endedAtDate);
}

function getTrialStatusKey(userItem: any): 'active' | 'canceled_active' | 'expired' | 'converted' | 'none' {
  if (!hasStoreTrialSignal(userItem)) return 'none';
  const trialStatus = getTrialLifecycleStatus(userItem);
  if (isConvertedClient(userItem)) return 'converted';

  const daysRemaining = getTrialDaysRemaining(userItem);
  const isCanceled = userItem.cancelAtPeriodEnd === true || userItem.autoRenewStatus === 'disabled';

  if (isTrialClient(userItem) || ACTIVE_TRIAL_STATUSES.has(trialStatus)) {
    if (isCanceled && daysRemaining !== null && daysRemaining >= 0) return 'canceled_active';
    return 'active';
  }

  if (daysRemaining !== null) {
    if (daysRemaining >= 0) return isCanceled ? 'canceled_active' : 'active';
    return 'expired';
  }

  if (FINISHED_TRIAL_STATUSES.has(trialStatus)) return 'expired';
  return 'none';
}

function trialStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Ativo',
    canceled_active: 'Cancela no fim',
    expired: 'Expirado',
    converted: 'Convertido',
    none: 'Sem trial',
  };
  return map[status] || 'Sem trial';
}

type SubscriptionStatusKey = 'active' | 'trialing' | 'inactive' | 'pending' | 'error' | 'canceled';

function getSubscriptionStatusKey(userItem: any): SubscriptionStatusKey {
  const providerStatus = getProviderStatus(userItem);
  if (providerStatus === 'error') return 'error';
  if (['pending', 'incomplete'].includes(providerStatus)) return 'pending';
  if (['canceled', 'cancelled'].includes(providerStatus)) return 'canceled';
  if (isTrialClient(userItem) || providerStatus === 'trialing') return 'trialing';
  if (isPayingClient(userItem) || (normalizeValue(userItem.plan) === 'pro' && providerStatus === 'active')) return 'active';
  return 'inactive';
}

function subscriptionStatusLabel(status: string): string {
  if (status === 'active' || status === 'trialing') return 'Ativo';
  return 'Inativo';
}

function renderTrialStatusMiniBadge(userItem: any): string {
  const status = getTrialStatusKey(userItem);
  const cls = status === 'active'
    ? 'cc-status-good'
    : status === 'canceled_active'
      ? 'cc-status-warn'
      : status === 'expired'
        ? 'cc-status-warn'
        : status === 'converted'
          ? 'cc-status-info'
          : 'cc-status-muted';
  return `<span class="cc-status-pill cc-status-pill-mini ${cls}"><span class="cc-status-context">Trial</span>${trialStatusLabel(status).toLowerCase()}</span>`;
}

function renderSubscriptionStatusMiniBadge(userItem: any): string {
  const status = getSubscriptionStatusKey(userItem);
  const cls = (status === 'active' || status === 'trialing')
    ? 'cc-status-good'
    : 'cc-status-muted';
  return `<span class="cc-status-pill cc-status-pill-mini ${cls}"><span class="cc-status-context">Ass.</span>${subscriptionStatusLabel(status).toLowerCase()}</span>`;
}

function getTrialDaysCompactInfo(userItem: any): { label: string; detail: string; cls: string } {
  const status = getTrialStatusKey(userItem);
  const daysRemaining = getTrialDaysRemaining(userItem);
  const durationDays = getTrialDurationDays(userItem);

  if (isConvertedClient(userItem)) {
    const convertedDate = userItem.convertedToPaidAt || userItem.firstPaidAt || userItem.convertedToPaidDate || userItem.firstPaidDate || null;
    return {
      label: 'Pago',
      detail: convertedDate ? `Convertido ${fmtShortDate(convertedDate) || fmtDate(convertedDate)}` : 'Cliente convertido',
      cls: 'cc-funnel-good',
    };
  }

  if (daysRemaining === null) {
    return {
      label: hasTrialHistory(userItem) ? 'Sem prazo' : 'Sem trial',
      detail: hasTrialHistory(userItem) ? 'Trial sem data final' : 'Nenhum trial registrado',
      cls: 'cc-funnel-muted',
    };
  }

  if (status === 'canceled_active' && daysRemaining >= 0) {
    return {
      label: 'Cancela no fim',
      detail: `Teste cancelado - acesso ate ${fmtDate(getTrialEndValue(userItem))}`,
      cls: 'cc-funnel-warn',
    };
  }

  if (daysRemaining < 0) {
    const absDays = Math.abs(daysRemaining);
    return {
      label: `Expirou ha ${absDays}d`,
      detail: `Trial vencido ha ${absDays} dia${absDays !== 1 ? 's' : ''}`,
      cls: 'cc-funnel-warn',
    };
  }

  if (daysRemaining === 0) {
    return {
      label: 'Vence hoje',
      detail: 'Acompanhar hoje',
      cls: 'cc-funnel-warn',
    };
  }

  return {
    label: `${daysRemaining}d restantes`,
    detail: durationDays ? `Trial de ${durationDays} dias` : (daysRemaining <= 3 ? 'Acompanhar de perto' : 'Dentro do prazo'),
    cls: daysRemaining <= 3 ? 'cc-funnel-warn' : 'cc-funnel-neutral',
  };
}

function getTrialDateCompactLabel(userItem: any): string {
  const start = getTrialStartValue(userItem);
  const end = getTrialEndValue(userItem);

  if (isConvertedClient(userItem)) {
    const convertedDate = userItem.convertedToPaidAt || userItem.firstPaidAt || userItem.convertedToPaidDate || userItem.firstPaidDate || null;
    return convertedDate ? `Convertido ${fmtShortDate(convertedDate) || fmtDate(convertedDate)}` : 'Convertido';
  }
  if (!hasTrialHistory(userItem)) return 'Sem trial';
  if (start && end) return `Trial ${fmtShortDate(start) || fmtDate(start)} - ${fmtShortDate(end) || fmtDate(end)}`;
  if (start) return `Inicio ${fmtShortDate(start) || fmtDate(start)}`;
  if (end) return `Fim ${fmtShortDate(end) || fmtDate(end)}`;
  return 'Trial sem datas';
}

function showFunnelModal(userItem: any) {
  const originLabel = getSignupPlatformLabel(userItem);
  const originSourceLabel = getSignupOriginSourceLabel(userItem);
  const trialStatus = getTrialStatusKey(userItem);
  const subStatus = getSubscriptionStatusKey(userItem);

  let dotOrIconModal = '';
  if (originLabel === 'Indefinido') {
    dotOrIconModal = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-right:6px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
  } else if (originLabel === 'Apple' || originLabel === 'Android' || originLabel === 'Celular') {
    dotOrIconModal = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-right:6px;"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18h.01"/></svg>`;
  }

  const trialLabel = trialStatus === 'active' ? 'Trial ativo' : trialStatus === 'canceled_active' ? 'Cancela no fim' : trialStatus === 'expired' ? 'Trial expirado' : trialStatus === 'converted' ? 'Convertido' : 'Sem trial';
  const trialClass = trialStatus === 'active' ? 'cc-fbg-good' : trialStatus === 'canceled_active' ? 'cc-fbg-warn' : trialStatus === 'expired' ? 'cc-fbg-warn' : trialStatus === 'converted' ? 'cc-fbg-info' : 'cc-fbg-muted';

  const clientLabel = subStatus === 'active' ? 'Pagante' : subStatus === 'trialing' ? 'Trial ativo' : 'Inativo';
  const clientClass = subStatus === 'active' ? 'cc-fbg-good' : subStatus === 'trialing' ? 'cc-fbg-info' : 'cc-fbg-muted';

  const isVerified = userItem.isVerified === true;
  const provider = normalizeProviderKey(userItem.provider);
  const verifiedLabel = isVerified && isVerifiableProvider(provider) ? providerName(provider) : 'N/A';
  const verifiedClass = isVerified && isVerifiableProvider(provider) ? 'cc-fbg-good' : 'cc-fbg-muted';

  const content = `
    <div class="w-full flex flex-col items-center justify-center py-6 bg-[var(--color-background)]">

      <div class="flex flex-col w-full max-w-[420px] mx-auto relative pt-2">

        <!-- Row 1 -->
        <div class="flex w-full items-stretch" style="height: 40px;">
          <div class="w-[120px] flex justify-end items-center pr-4">
            <span class="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">1. Origem</span>
          </div>
          <div class="w-[24px] flex flex-col items-center justify-center relative">
            <div class="absolute top-1/2 bottom-0 w-[2px] bg-[var(--color-border)]"></div>
            <div class="w-[6px] h-[6px] rounded-full bg-[var(--color-text-secondary)] ring-4 ring-[var(--color-background)] relative z-10"></div>
          </div>
          <div class="flex-1 flex justify-center items-center pl-2">
            <div class="cc-fbg-origin flex items-center justify-center text-white text-[11px] font-bold uppercase rounded-lg w-full h-[40px]" title="${escapeHtml(originSourceLabel)}">
              ${dotOrIconModal}
              ${escapeHtml(originLabel)}
            </div>
          </div>
        </div>

        <!-- Row 2 -->
        <div class="flex w-full items-stretch" style="height: 40px;">
          <div class="w-[120px] flex justify-end items-center pr-4">
            <span class="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">2. Status Trial</span>
          </div>
          <div class="w-[24px] flex flex-col items-center justify-center relative">
            <div class="absolute top-0 bottom-0 w-[2px] bg-[var(--color-border)]"></div>
            <div class="w-[6px] h-[6px] rounded-full bg-[var(--color-text-secondary)] ring-4 ring-[var(--color-background)] relative z-10"></div>
          </div>
          <div class="flex-1 flex justify-center items-center pl-2">
            <div class="${trialClass} flex items-center justify-center text-white text-[11px] font-bold uppercase rounded-lg w-[86%] h-[40px]">
              ${escapeHtml(trialLabel)}
            </div>
          </div>
        </div>

        <!-- Row 3 -->
        <div class="flex w-full items-stretch" style="height: 40px;">
          <div class="w-[120px] flex justify-end items-center pr-4">
            <span class="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">3. Cliente</span>
          </div>
          <div class="w-[24px] flex flex-col items-center justify-center relative">
            <div class="absolute top-0 bottom-0 w-[2px] bg-[var(--color-border)]"></div>
            <div class="w-[6px] h-[6px] rounded-full bg-[var(--color-text-secondary)] ring-4 ring-[var(--color-background)] relative z-10"></div>
          </div>
          <div class="flex-1 flex justify-center items-center pl-2">
            <div class="${clientClass} flex items-center justify-center text-white text-[11px] font-bold uppercase rounded-lg w-[73%] h-[40px]">
              ${escapeHtml(clientLabel)}
            </div>
          </div>
        </div>

        <!-- Row 4 -->
        <div class="flex w-full items-stretch" style="height: 40px;">
          <div class="w-[120px] flex justify-end items-center pr-4">
            <span class="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">4. Gateway</span>
          </div>
          <div class="w-[24px] flex flex-col items-center justify-center relative">
            <div class="absolute top-0 bottom-1/2 w-[2px] bg-[var(--color-border)]"></div>
            <div class="w-[6px] h-[6px] rounded-full bg-[var(--color-text-secondary)] ring-4 ring-[var(--color-background)] relative z-10"></div>
          </div>
          <div class="flex-1 flex justify-center items-center pl-2">
            <div class="${verifiedClass} flex items-center justify-center text-white text-[11px] font-bold uppercase rounded-lg w-[60%] h-[40px]">
              ${escapeHtml(verifiedLabel)}
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  Modal({
    title: 'Visualização do Funil',
    content,
    showFooter: false,
    fieldsPadding: 'p-0',
    maxWidth: 'max-w-md'
  });
}

function renderFunnelCell(userItem: any): string {
  const originLabel = getSignupPlatformLabel(userItem);
  const originClass = getSignupOriginClass(userItem);
  const originSourceLabel = getSignupOriginSourceLabel(userItem);

  let dotOrIcon = `<span class="cc-funnel-dot"></span>`;
  if (originLabel === 'Indefinido') {
    dotOrIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:-1px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
  } else if (originLabel === 'Apple' || originLabel === 'Android' || originLabel === 'Celular') {
    dotOrIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:-1px;"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18h.01"/></svg>`;
  }

  return `
    <div class="cc-funnel-cell">
      <span class="cc-funnel-origin ${originClass}" title="${escapeHtml(originSourceLabel)}">
        ${dotOrIcon}
        <span>${escapeHtml(originLabel)}</span>
      </span>
      <button type="button" class="cc-action-btn user-btn-funnel hover:bg-[var(--color-surface-hover)]" data-user='${safeJsonAttr(userItem)}' title="Abrir Funil" style="padding: 6px 10px; border: 1px solid var(--color-border); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); transition: all 0.15s; white-space: nowrap; width: max-content;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        <span>Ver Funil</span>
      </button>
    </div>
  `;
}

function getConnectedBankCount(userItem: any): number {
  return Number(userItem.connectedBankCount || 0);
}

function hasConnectedBank(userItem: any): boolean {
  return userItem.bankDataUnavailable !== true && getConnectedBankCount(userItem) > 0;
}

function renderBankCell(userItem: any): string {
  if (userItem.bankDataUnavailable === true) {
    return `
      <div class="cc-cell-stack">
        <strong>Sem dados</strong>
        <span>Pluggy indisponivel</span>
      </div>
    `;
  }

  const bankCount = getConnectedBankCount(userItem);
  const lastSync = userItem.lastBankSync || null;
  const rel = fmtRelativeTime(lastSync);

  if (bankCount === 0) {
    return `
      <div class="cc-cell-stack cc-cell-muted">
        <strong>0 bancos</strong>
        <span>${lastSync ? `Sync ${rel.text.toLowerCase()}` : 'Nunca sincronizou'}</span>
      </div>
    `;
  }

  const bankData = Array.isArray(userItem.connectedBankData) ? userItem.connectedBankData : [];
  const names = bankData.map((b: any) => b.name);
  if (names.length === 0 && Array.isArray(userItem.connectedBankNames)) {
    names.push(...userItem.connectedBankNames);
  }
  const label = names.slice(0, 2).join(', ') || 'Banco conectado';
  const hidden = names.length > 2 ? ` +${names.length - 2}` : '';
  const accounts = Number(userItem.connectedAccountCount || 0);

  const bankIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="opacity-60"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`;

  return `
    <div class="cc-cell-stack" title="${escapeHtml(names.join(', '))}">
      <strong style="display:flex;align-items:center;gap:6px;">
        ${bankIcon}
        <span>${bankCount} banco${bankCount !== 1 ? 's' : ''}${accounts ? ` / ${accounts} conta${accounts !== 1 ? 's' : ''}` : ''}</span>
      </strong>
      <span>${escapeHtml(label)}${hidden} • <span style="color:${rel.color};font-weight:500;">sync ${rel.text.toLowerCase()}</span></span>
    </div>
  `;
}

function renderLastAccessCell(userItem: any): string {
  const rel = fmtRelativeTime(userItem.lastLogin);
  const days = userItem.activeDaysCount || 0;
  return `
    <div class="cc-date-cell">
      <strong style="color:${rel.color};">${rel.text}</strong>
      <span>${days > 0 ? `${days} dia${days !== 1 ? 's' : ''} de uso` : 'Sem registros'}</span>
    </div>
  `;
}

function getLastAccessDays(userItem: any): number | null {
  const lastAccess = parseDateValue(userItem.lastLogin);
  if (!lastAccess) return null;
  return Math.floor((Date.now() - lastAccess.getTime()) / 86400000);
}

function mergePluggyRowsIntoUsers(users: any[], rows: any[], unavailable = false): void {
  const byUid = new Map<string, {
    bankDataMap: Map<string, string | null>;
    connectionCount: number;
    accountCount: number;
    lastSync: string | null;
    statuses: Set<string>;
  }>();

  rows.forEach((row) => {
    if (!row?.uid) return;
    const current = byUid.get(row.uid) || {
      bankDataMap: new Map<string, string | null>(),
      connectionCount: 0,
      accountCount: 0,
      lastSync: null,
      statuses: new Set<string>(),
    };

    current.connectionCount += 1;
    current.accountCount += Number(row.accountCount || 0);
    
    if (Array.isArray(row.bankDataList)) {
      row.bankDataList.forEach((b: any) => {
        if (b.name) {
          if (!current.bankDataMap.has(b.name) || b.logo) {
            current.bankDataMap.set(b.name, b.logo);
          }
        }
      });
    } else {
      (row.banks || []).forEach((bank: string) => {
        if (bank && !current.bankDataMap.has(bank)) current.bankDataMap.set(bank, null);
      });
    }

    if (row.status) current.statuses.add(row.status);
    if (row.lastSync && (!current.lastSync || new Date(row.lastSync).getTime() > new Date(current.lastSync).getTime())) {
      current.lastSync = row.lastSync;
    }
    byUid.set(row.uid, current);
  });

  users.forEach((userItem) => {
    const summary = byUid.get(userItem.uid);
    userItem.bankDataUnavailable = unavailable;
    userItem.connectedBankData = summary ? Array.from(summary.bankDataMap.entries()).map(([name, logo]) => ({name, logo})) : [];
    userItem.connectedBankNames = summary ? Array.from(summary.bankDataMap.keys()) : [];
    userItem.connectedBankCount = summary ? Math.max(summary.bankDataMap.size, summary.connectionCount) : 0;
    userItem.connectedAccountCount = summary?.accountCount || 0;
    userItem.lastBankSync = summary?.lastSync || null;
    userItem.bankConnectionStatuses = summary ? Array.from(summary.statuses) : [];
  });
}

function getGrowthMetrics(users: any[]) {
  const mobileSignups = users.filter(isMobileSignup).length;
  const androidSignups = users.filter((u) => getSignupPlatform(u) === 'android').length;
  const iphoneSignups = users.filter((u) => getSignupPlatform(u) === 'iphone').length;
  const appleSignups = users.filter((u) => getSignupPlatform(u) === 'apple_iap').length;
  const activeTrials = users.filter((u) => {
    const st = getTrialStatusKey(u);
    return st === 'active' || st === 'canceled_active';
  }).length;
  const sevenDayTrials = users.filter(isSevenDayTrial).length;
  const expiredTrials = users.filter((u) => getTrialStatusKey(u) === 'expired').length;
  const convertedClients = users.filter(isConvertedClient).length;
  const conversionBase = users.filter((u) => hasTrialHistory(u) || isConvertedClient(u)).length;
  const activeSummary = getActiveClientSummary(users);

  const activeUsers = users.filter((u) => {
    const s = getSubscriptionStatusKey(u);
    return s === 'active' || s === 'trialing';
  });

  const knownBankActiveUsers = activeUsers.filter((u) => u.bankDataUnavailable !== true);
  const totalBanksOfActiveUsers = knownBankActiveUsers.reduce((sum, u) => sum + getConnectedBankCount(u), 0);
  
  const averageBanks = activeUsers.length > 0
    ? totalBanksOfActiveUsers / activeUsers.length
    : null;

  return {
    mobileSignups,
    androidSignups,
    iphoneSignups,
    appleSignups,
    activeTrials,
    sevenDayTrials,
    expiredTrials,
    convertedClients,
    conversionRate: conversionBase ? convertedClients / conversionBase : 0,
    averageBanks,
    activeSubscriptions: activeSummary.count,
    mrr: activeSummary.revenue,
    canceledConverted: users.filter(isConvertedCanceledClient).length,
  };
}

function growthKpiCard(label: string, value: string, hint: string, icon: string): string {
  return `
    <div class="growth-kpi-card">
      <div class="growth-kpi-head">
        <span class="growth-kpi-icon">${icon}</span>
        <span>${label}</span>
      </div>
      <strong>${value}</strong>
      <small>${hint}</small>
    </div>
  `;
}

function renderGrowthKpis(users: any[]): string {
  const metrics = getGrowthMetrics(users);
  const bankValue = metrics.averageBanks === null ? '-' : decimalFormatter.format(metrics.averageBanks);
  const appleTotal = metrics.iphoneSignups + metrics.appleSignups;

  const totalUsuariosCadastrados = users.length;
  const totalUsuariosAtivos = users.filter((u) => {
    const s = getSubscriptionStatusKey(u);
    return s === 'active' || s === 'trialing';
  }).length;

  const mrrCalculado = metrics.activeSubscriptions * 35.90;

  const totalApp = metrics.androidSignups + appleTotal;
  const appBreakdown = `${metrics.androidSignups} Android / ${appleTotal} Apple`;

  const iconUsers = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const iconActive = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  const iconTrial = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M10 15h4"/></svg>`;
  const iconPaying = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h.01M11 15h2"/></svg>`;
  const iconMRR = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  const iconApp = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`;
  const iconBank = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`;

  return `
    <div class="growth-kpi-grid" id="growth-kpi-grid">
      ${growthKpiCard('Total de usuarios cadastrados', String(totalUsuariosCadastrados), 'Usuários na base', iconUsers)}
      ${growthKpiCard('Total de usuários ativos', String(totalUsuariosAtivos), 'Assinantes e Trials em andamento', iconActive)}
      ${growthKpiCard('Clientes ativos no Trial', String(metrics.activeTrials), 'Em período de teste', iconTrial)}
      ${growthKpiCard('Total de pagantes verificados', String(metrics.activeSubscriptions), 'Assinaturas ativas', iconPaying)}
      ${growthKpiCard('MRR', moneyFormatter.format(mrrCalculado), 'Pagantes * R$ 35,90', iconMRR)}
      ${growthKpiCard('Clientes APP', String(totalApp), appBreakdown, iconApp)}
      ${growthKpiCard('Media de bancos conectados', bankValue, metrics.averageBanks === null ? 'Dados Pluggy indisponiveis' : 'Media por usuario ativo', iconBank)}
    </div>
  `;
}

function updateGrowthKpis(users: any[]): void {
  const grid = document.getElementById('growth-kpi-grid');
  if (!grid) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderGrowthKpis(users);
  const nextGrid = wrapper.firstElementChild;
  if (nextGrid) grid.replaceWith(nextGrid);
}

function renderUserVerificationBadge(userItem: any, tooltipId = `v-t-${userItem.uid}`): string {
  const provider = normalizeProviderKey(userItem.provider);
  if (!isVerifiableProvider(provider)) return '';

  const providerLabel = providerName(provider);
  const icon = provider === 'asaas'
    ? verifiedIconAsaas
    : provider === 'stripe'
      ? verifiedIconStripe
      : provider === 'apple'
        ? verifiedIconApple
        : verifiedIconAndroid;

  if (userItem.isVerified === true) {
    return Tooltip({
      id: tooltipId,
      className: `cc-user-verify-tooltip cc-user-verify-${provider}`,
      content: icon,
      text: `Verificado ${providerLabel}\nAssinatura ativa confirmada pela API ${provider === 'apple' ? 'da App Store' : provider === 'android' ? 'do Google Play' : 'do provedor'}.`
    });
  }

  if (userItem.verificationUnavailable === true) {
    return Tooltip({
      id: tooltipId,
      className: 'cc-user-verify-tooltip cc-user-verify-pending',
      content: warningIcon,
      text: `Verificacao ${providerLabel} indisponivel\nNao foi possivel confirmar agora.`
    });
  }

  if (userItem.isVerified === undefined) {
    return Tooltip({
      id: tooltipId,
      className: 'cc-user-verify-tooltip cc-user-verify-loading',
      content: loaderIcon,
      text: `Verificando ${providerLabel}\nConsultando status da assinatura.`
    });
  }

  return '';
}

function renderProviderLabel(userItem: any): string {
  const provider = normalizeProviderKey(userItem.provider);
  if (provider === 'asaas') return `<img src="/assets/logo/assas.png" class="cc-provider-img" /> <span class="font-medium">Asaas</span>`;
  if (provider === 'stripe') return `<img src="/assets/logo/stripe.png" class="cc-provider-img" /> <span class="font-medium">Stripe</span>`;
  if (provider === 'apple') return `<span class="font-medium">Apple IAP</span>`;
  if (provider === 'android') return `<span class="font-medium">Google Play</span>`;
  return `<span class="capitalize font-medium">Sistema / Base</span>`;
}

function renderRow(userItem: any): string {
  const verifiedBadgeHtml = renderUserVerificationBadge(userItem);

  return `
    <tr>
      <td>
        <div class="cc-user-main">
          <div class="avvvatar-target shrink-0" data-val="${escapeHtml(userItem.email || userItem.uid)}" style="width:32px;height:32px;border-radius:12px;overflow:hidden;"></div>
          <div class="cc-user-copy">
            <div class="cc-user-name" title="${escapeHtml(userItem.name)}">
              <span>${escapeHtml(userItem.name || userItem.email || userItem.uid)}</span>
              ${verifiedBadgeHtml}
            </div>
            <div class="cc-user-email" title="${escapeHtml(userItem.email)}">${escapeHtml(userItem.email || userItem.uid)}</div>
          </div>
        </div>
      </td>
      <td>${renderFunnelCell(userItem)}</td>
      <td style="white-space:nowrap;font-size:12px;color:var(--color-text-secondary);">${getCreatedDateFormatted(userItem) || '<span style="opacity:0.5;">—</span>'}</td>
      <td>${renderBankCell(userItem)}</td>
      <td>${renderLastAccessCell(userItem)}</td>
      <td style="text-align:right;">
        <div class="flex items-center justify-end gap-2 cc-desktop-actions">
          <button class="cc-action-btn user-btn-info" data-user='${safeJsonAttr(userItem)}' title="Ver Informações">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
             </svg>
          </button>
          <button class="cc-action-btn user-btn-admin" data-uid="${escapeHtml(userItem.uid)}" data-is-admin="${userItem.isAdmin}" title="${userItem.isAdmin ? 'Remover Admin' : 'Tornar Admin'}">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${userItem.isAdmin ? '#D97757' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
             </svg>
          </button>
          <button class="cc-action-btn user-btn-delete" data-uid="${escapeHtml(userItem.uid)}" title="Excluir Usuário">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
             </svg>
          </button>
        </div>
        <div class="cc-mobile-actions" style="position:relative;">
          <button id="user-mob-${escapeHtml(userItem.uid)}" class="cc-action-btn user-mob-trigger"
                  data-user='${safeJsonAttr(userItem)}'
                  data-uid="${escapeHtml(userItem.uid)}" data-is-admin="${userItem.isAdmin}" title="Opções">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
          ${GenericDropdown({
    id: `user-mob-${userItem.uid}`,
    width: '180px',
    items: [
      {
        id: `user-mi-info-${userItem.uid}`,
        label: 'Ver Informações',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
      },
      {
        id: `user-mi-adm-${userItem.uid}`,
        label: userItem.isAdmin ? 'Remover Admin' : 'Tornar Admin',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${userItem.isAdmin ? '#D97757' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      },
      {
        id: `user-mi-del-${userItem.uid}`,
        label: 'Excluir Usuário',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>',
        variant: 'danger',
      },
    ],
  })}
        </div>
      </td>
    </tr>
  `;
}

function renderTableContent(users: any[]): string {
  if (users.length === 0) {
    return `
      <tr>
        <td colspan="6" style="padding:60px 0;text-align:center;border:none;color:var(--color-text-secondary);font-size:13px;">
          Nenhum usuário encontrado com este filtro.
        </td>
      </tr>
    `;
  }
  return users.map((u) => renderRow(u)).join('');
}

let allUsersGlobal: any[] = [];
let filteredUsersGlobal: any[] = [];

const originFilters: FilterOption[] = [
  { id: 'all_origins', label: 'Todos' },
  { id: 'mobile', label: 'Celular' },
  { id: 'android', label: 'Android' },
  { id: 'apple', label: 'Apple' },
  { id: 'web', label: 'Web' },
  { id: 'unknown', label: 'Indefinido' },
];

const trialStatusFilters: FilterOption[] = [
  { id: 'all_trial_status', label: 'Todos trials' },
  { id: 'trial_active', label: 'Trial ativo' },
  { id: 'trial_expired', label: 'Trial expirado' },
  { id: 'trial_converted', label: 'Convertido' },
  { id: 'trial_none', label: 'Sem trial' },
];

const subscriptionStatusFilters: FilterOption[] = [
  { id: 'all_subscription_status', label: 'Todos' },
  { id: 'subscription_active', label: 'Ativos' },
  { id: 'subscription_inactive', label: 'Inativos' },
];

const trialDaysFilters: FilterOption[] = [
  { id: 'all_trial_days', label: 'Todos' },
  { id: 'trial_days_7', label: '7 dias' },
  { id: 'trial_days_3', label: '3 dias' },
  { id: 'trial_days_expired', label: 'Expirado' },
  { id: 'trial_days_none', label: 'Sem trial' },
];

const lastAccessFilters: FilterOption[] = [
  { id: 'all_last_access', label: 'Todos' },
  { id: 'last_access_7', label: '7 dias' },
  { id: 'last_access_30', label: '30 dias' },
  { id: 'last_access_old', label: '+30 dias' },
  { id: 'last_access_never', label: 'Nunca entrou' },
];

const bankFilters: FilterOption[] = [
  { id: 'all_bank_status', label: 'Todos bancos' },
  { id: 'without_bank', label: 'Sem conexão' },
  { id: 'with_bank', label: 'Com conexão' },
];

const activeSubscriptionFilters: FilterOption[] = [
  { id: 'all_active_subscription', label: 'Todos' },
  { id: 'only_active_subscription', label: 'Pagantes' },
  { id: 'without_active_subscription', label: 'Outros' },
];

let activeOriginFilter = localStorage.getItem('admin_growth_filter_origin') || 'all_origins';
let activeTrialStatusFilter = localStorage.getItem('admin_growth_filter_trial_status') || 'all_trial_status';
let activeSubscriptionStatusFilter = localStorage.getItem('admin_growth_filter_subscription_status') || 'all_subscription_status';
let activeTrialDaysFilter = localStorage.getItem('admin_growth_filter_trial_days') || 'all_trial_days';
let activeLastAccessFilter = localStorage.getItem('admin_growth_filter_last_access') || 'all_last_access';
let activeBankFilter = localStorage.getItem('admin_growth_filter_bank') || 'all_bank_status';
let activeSubscriptionActiveFilter = localStorage.getItem('admin_growth_filter_active_subscription') || 'all_active_subscription';
let activeDateStartFilter = localStorage.getItem('admin_growth_filter_date_start') || '';
let activeDateEndFilter = localStorage.getItem('admin_growth_filter_date_end') || '';
let activeUserSearch = localStorage.getItem('admin_growth_user_search') || '';
let filterSelectorControls: Record<string, { setFilterId: (filterId: string) => void }> = {};

function resetGrowthFilters(): void {
  const defaults = {
    origin: 'all_origins',
    trialStatus: 'all_trial_status',
    subscriptionStatus: 'all_subscription_status',
    trialDays: 'all_trial_days',
    lastAccess: 'all_last_access',
    bank: 'all_bank_status',
    activeSubscription: 'all_active_subscription',
  };

  activeOriginFilter = defaults.origin;
  activeTrialStatusFilter = defaults.trialStatus;
  activeSubscriptionStatusFilter = defaults.subscriptionStatus;
  activeTrialDaysFilter = defaults.trialDays;
  activeLastAccessFilter = defaults.lastAccess;
  activeBankFilter = defaults.bank;
  activeSubscriptionActiveFilter = defaults.activeSubscription;
  activeDateStartFilter = '';
  activeDateEndFilter = '';
  activeUserSearch = '';

  filterSelectorControls.origin?.setFilterId(defaults.origin);
  filterSelectorControls.trialStatus?.setFilterId(defaults.trialStatus);
  filterSelectorControls.subscriptionStatus?.setFilterId(defaults.subscriptionStatus);
  filterSelectorControls.trialDays?.setFilterId(defaults.trialDays);
  filterSelectorControls.lastAccess?.setFilterId(defaults.lastAccess);
  filterSelectorControls.bank?.setFilterId(defaults.bank);
  filterSelectorControls.activeSubscription?.setFilterId(defaults.activeSubscription);

  const dateStartInput = document.getElementById('filter-date-start') as HTMLInputElement | null;
  const dateEndInput = document.getElementById('filter-date-end') as HTMLInputElement | null;
  const userSearchInput = document.getElementById('admin-user-search') as HTMLInputElement | null;
  if (dateStartInput) dateStartInput.value = '';
  if (dateEndInput) dateEndInput.value = '';
  if (userSearchInput) userSearchInput.value = '';

  applyFilterAndRender();
}

function normalizeSearchText(value: any): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function userMatchesSearch(userItem: any, searchTerm: string): boolean {
  const term = normalizeSearchText(searchTerm);
  if (!term) return true;

  const searchable = [
    userItem.name,
    userItem.email,
    userItem.uid,
    userItem.plan,
    userItem.provider,
    userItem.status,
    userItem.providerStatus,
    getSignupPlatformLabel(userItem),
    trialStatusLabel(getTrialStatusKey(userItem)),
    subscriptionStatusLabel(getSubscriptionStatusKey(userItem)),
    getBankExportText(userItem),
  ].map(normalizeSearchText).join(' ');

  return searchable.includes(term);
}

function exportText(value: any): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formatExportDate(value: string | null | undefined): string {
  if (!value) return '';
  const formatted = fmtDate(value);
  return formatted === 'Data não disponível' ? '' : formatted;
}

function getTrialDaysExportText(userItem: any): string {
  const daysRemaining = getTrialDaysRemaining(userItem);

  if (isConvertedClient(userItem)) return 'Pago';
  if (daysRemaining === null) return '';
  if (daysRemaining < 0) {
    const absDays = Math.abs(daysRemaining);
    return `Expirado ha ${absDays} dia${absDays !== 1 ? 's' : ''}`;
  }

  return `${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}`;
}

function getTrialDurationExportText(userItem: any): string {
  const duration = getTrialDurationDays(userItem);
  return duration ? `${duration} dia${duration !== 1 ? 's' : ''}` : '';
}

function getBankExportText(userItem: any): string {
  if (userItem.bankDataUnavailable === true) return 'Sem dados';
  const bankCount = getConnectedBankCount(userItem);
  if (bankCount === 0) return '0 bancos';

  const names = Array.isArray(userItem.connectedBankNames) ? userItem.connectedBankNames : [];
  const accounts = Number(userItem.connectedAccountCount || 0);
  const bankNames = names.length ? names.join(', ') : `${bankCount} banco${bankCount !== 1 ? 's' : ''}`;
  return accounts ? `${bankNames} / ${accounts} conta${accounts !== 1 ? 's' : ''}` : bankNames;
}

function getLastAccessExportText(userItem: any): string {
  const relative = fmtRelativeTime(userItem.lastLogin).text;
  const date = formatExportDate(userItem.lastLogin);
  return date ? `${relative} (${date})` : relative;
}

function getGatewayVerificationExportText(userItem: any): string {
  const provider = normalizeProviderKey(userItem.provider);
  if (!isVerifiableProvider(provider)) return 'Não aplicável';
  if (userItem.isVerified === true) return `Verificado (${providerName(provider)})`;
  if (userItem.verificationUnavailable === true) return 'Indisponível';
  if (userItem.isVerified === undefined) return 'Pendente';
  return 'Não verificado';
}

function buildGrowthExportRows(users: any[]): string[][] {
  return users.map((userItem) => [
    exportText(userItem.name || userItem.email || userItem.uid),
    exportText(userItem.email || ''),
    getCreatedDateFormatted(userItem),
    exportText(getSignupPlatformLabel(userItem)),
    trialStatusLabel(getTrialStatusKey(userItem)),
    subscriptionStatusLabel(getSubscriptionStatusKey(userItem)),
    getTrialDaysExportText(userItem),
    getLastAccessExportText(userItem),
    getBankExportText(userItem),
    getGatewayVerificationExportText(userItem),
  ]);
}

function exportGrowthTableToExcel(): void {
  const rows = filteredUsersGlobal;
  if (!rows.length) {
    toaster.create({
      title: 'Nada para exportar',
      description: 'Nenhum usuário encontrado com os filtros atuais.',
      type: 'message'
    });
    return;
  }

  const headers = [
    'Nome',
    'Email',
    'Criado em',
    'Origem',
    'Status trial',
    'Status cliente',
    'Dias restantes trial',
    'Segmentação de acesso',
    'Segmentação de conexões',
    'Verificados Gateway',
  ];

  const tableRows = buildGrowthExportRows(rows);
  const csvRows = [headers, ...tableRows].map(row =>
    row.map(cell => {
      const escaped = String(cell).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(';')
  );

  const csvContent = "\ufeff" + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const date = new Date().toISOString().slice(0, 10);
  link.download = `gestao-de-usuarios-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  toaster.create({
    title: 'Exportado',
    description: `${rows.length} usuário${rows.length !== 1 ? 's' : ''} exportado${rows.length !== 1 ? 's' : ''} para CSV.`,
    type: 'success'
  });
}

function applyFilterAndRender() {
  localStorage.setItem('admin_growth_filter_origin', activeOriginFilter);
  localStorage.setItem('admin_growth_filter_trial_status', activeTrialStatusFilter);
  localStorage.setItem('admin_growth_filter_subscription_status', activeSubscriptionStatusFilter);
  localStorage.setItem('admin_growth_filter_trial_days', activeTrialDaysFilter);
  localStorage.setItem('admin_growth_filter_last_access', activeLastAccessFilter);
  localStorage.setItem('admin_growth_filter_bank', activeBankFilter);
  localStorage.setItem('admin_growth_filter_active_subscription', activeSubscriptionActiveFilter);
  localStorage.setItem('admin_growth_filter_date_start', activeDateStartFilter);
  localStorage.setItem('admin_growth_filter_date_end', activeDateEndFilter);
  localStorage.setItem('admin_growth_user_search', activeUserSearch);

  const tbody = document.querySelector('.cc-table tbody');
  const countSpan = document.querySelector('.cc-table-count');
  if (!tbody) return;

  filteredUsersGlobal = allUsersGlobal.filter((u: any) => {
    const platform = getSignupPlatform(u);
    const trialStatus = getTrialStatusKey(u);
    const subscriptionStatus = getSubscriptionStatusKey(u);
    const trialDays = getTrialDaysRemaining(u);
    const trialDuration = getTrialDurationDays(u);
    const accessDays = getLastAccessDays(u);
    const bankDataUnavailable = u.bankDataUnavailable === true;
    const matchSearch = userMatchesSearch(u, activeUserSearch);

    const rawCreatedAt = getCreatedDateValue(u);
    const createdAt = parseDateValue(rawCreatedAt);
    let matchDateRange = true;
    if (activeDateStartFilter || activeDateEndFilter) {
      if (!createdAt) {
        matchDateRange = false;
      } else {
        const start = activeDateStartFilter ? new Date(activeDateStartFilter + 'T00:00:00') : null;
        const end = activeDateEndFilter ? new Date(activeDateEndFilter + 'T23:59:59.999') : null;
        if (start && createdAt < start) matchDateRange = false;
        if (end && createdAt > end) matchDateRange = false;
      }
    }

    const matchOrigin = activeOriginFilter === 'all_origins' ||
      (activeOriginFilter === 'mobile' && isMobileSignup(u)) ||
      (activeOriginFilter === 'unknown' && platform === 'unknown' && !isMobileSignup(u)) ||
      (activeOriginFilter === 'apple' && (platform === 'iphone' || platform === 'apple_iap')) ||
      platform === activeOriginFilter;

    const matchTrialStatus = activeTrialStatusFilter === 'all_trial_status' ||
      (activeTrialStatusFilter === 'trial_active' && trialStatus === 'active') ||
      (activeTrialStatusFilter === 'trial_expired' && trialStatus === 'expired') ||
      (activeTrialStatusFilter === 'trial_converted' && trialStatus === 'converted') ||
      (activeTrialStatusFilter === 'trial_none' && trialStatus === 'none');

    const isActiveOrTrial = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
    const matchSubscriptionStatus = activeSubscriptionStatusFilter === 'all_subscription_status' ||
      (activeSubscriptionStatusFilter === 'subscription_active' && isActiveOrTrial) ||
      (activeSubscriptionStatusFilter === 'subscription_inactive' && !isActiveOrTrial);

    const matchTrialDays = activeTrialDaysFilter === 'all_trial_days' ||
      (activeTrialDaysFilter === 'trial_days_3' && trialStatus === 'active' && trialDays !== null && trialDays >= 0 && trialDays <= 3) ||
      (activeTrialDaysFilter === 'trial_days_7' && trialDuration === 7) ||
      (activeTrialDaysFilter === 'trial_days_expired' && trialStatus === 'expired' && trialDays !== null && trialDays < 0) ||
      (activeTrialDaysFilter === 'trial_days_none' && !hasTrialHistory(u));

    const matchLastAccess = activeLastAccessFilter === 'all_last_access' ||
      (activeLastAccessFilter === 'last_access_7' && accessDays !== null && accessDays <= 7) ||
      (activeLastAccessFilter === 'last_access_30' && accessDays !== null && accessDays <= 30) ||
      (activeLastAccessFilter === 'last_access_old' && accessDays !== null && accessDays > 30) ||
      (activeLastAccessFilter === 'last_access_never' && accessDays === null);

    const matchBank = activeBankFilter === 'all_bank_status' ||
      bankDataUnavailable ||
      (activeBankFilter === 'without_bank' && !hasConnectedBank(u)) ||
      (activeBankFilter === 'with_bank' && hasConnectedBank(u));

    const matchActiveSubscription = activeSubscriptionActiveFilter === 'all_active_subscription' ||
      subscriptionStatus === 'error' ||
      (activeSubscriptionActiveFilter === 'only_active_subscription' && isPayingClient(u)) ||
      (activeSubscriptionActiveFilter === 'without_active_subscription' && !isPayingClient(u));

    return matchOrigin &&
      matchTrialStatus &&
      matchSubscriptionStatus &&
      matchTrialDays &&
      matchLastAccess &&
      matchBank &&
      matchActiveSubscription &&
      matchSearch &&
      matchDateRange;
  });

  tbody.innerHTML = renderTableContent(filteredUsersGlobal);
  if (countSpan) {
    countSpan.textContent = `${filteredUsersGlobal.length} usuário${filteredUsersGlobal.length !== 1 ? 's' : ''}`;
  }
  updateGrowthKpis(filteredUsersGlobal);

  // Re-render Avvvatars
  document.querySelectorAll('.avvvatar-target').forEach(el => {
    const val = el.getAttribute('data-val') || 'User';
    const root = createRoot(el);
    root.render(createElement(Avvvatars, { value: val, size: 32, style: 'shape' }));
  });

  attachUserActionListeners();
  initAllTooltips();
}

function attachUserActionListeners() {
  document.querySelectorAll('.user-btn-info').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = JSON.parse(btn.getAttribute('data-user') || '{}');
      showUserModal(u);
    });
  });

  document.querySelectorAll('.user-btn-funnel').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = JSON.parse(btn.getAttribute('data-user') || '{}');
      showFunnelModal(u);
    });
  });

  document.querySelectorAll('.user-btn-admin').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      const currentState = btn.getAttribute('data-is-admin') === 'true';
      const action = currentState ? 'Remover Admin' : 'Tornar Admin';
      DeleteConfirmationModal({
        title: action,
        description: currentState
          ? 'Tem certeza que deseja remover a permissão de administrador deste usuário?'
          : 'Tem certeza que deseja conceder permissão de administrador a este usuário?',
        onConfirm: async () => {
          const uState = auth.currentUser;
          if (!uState) throw new Error('Não autenticado.');
          const t = await uState.getIdToken();
          const r = await fetch(`${API_BASE}/api/admin/users/${uid}/toggle-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
            body: JSON.stringify({ isAdmin: !currentState })
          });
          if (!r.ok) throw new Error('Falha ao alterar perfil de admin.');
          toaster.create({ title: 'Sucesso', description: 'Permissão de administrador atualizada.', type: 'success' });
          loadSubscriptions();
        }
      });
    });
  });

  document.querySelectorAll('.user-btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      DeleteConfirmationModal({
        title: 'Excluir Usuário',
        description: 'Esta ação é irreversível. O usuário será removido do banco de dados e do authentication.',
        onConfirm: async () => {
          const uState = auth.currentUser;
          if (!uState) throw new Error('Não autenticado.');
          const t = await uState.getIdToken();
          const r = await fetch(`${API_BASE}/api/admin/users/${uid}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${t}` }
          });
          const ans = await r.json();
          if (!r.ok) throw new Error(ans.error || 'Falha ao excluir o usuário.');
          toaster.create({ title: 'Sucesso', description: 'Usuário excluído definitivamente.', type: 'success' });
          loadSubscriptions();
        }
      });
    });
  });

  // Mobile: menu 3 pontos
  document.querySelectorAll('.user-mob-trigger').forEach(trigBtn => {
    const uid = trigBtn.getAttribute('data-uid');
    if (!uid) return;

    attachGenericDropdownListeners(`user-mob-${uid}`, `user-mob-${uid}`);

    document.getElementById(`user-mi-info-${uid}`)?.addEventListener('click', () => {
      const u = JSON.parse(trigBtn.getAttribute('data-user') || '{}');
      showUserModal(u);
    });

    document.getElementById(`user-mi-adm-${uid}`)?.addEventListener('click', () => {
      const currentState = trigBtn.getAttribute('data-is-admin') === 'true';
      const action = currentState ? 'Remover Admin' : 'Tornar Admin';
      DeleteConfirmationModal({
        title: action,
        description: currentState
          ? 'Tem certeza que deseja remover a permissão de administrador deste usuário?'
          : 'Tem certeza que deseja conceder permissão de administrador a este usuário?',
        onConfirm: async () => {
          const uState = auth.currentUser;
          if (!uState) throw new Error('Não autenticado.');
          const t = await uState.getIdToken();
          const r = await fetch(`${API_BASE}/api/admin/users/${uid}/toggle-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
            body: JSON.stringify({ isAdmin: !currentState })
          });
          if (!r.ok) throw new Error('Falha ao alterar perfil de admin.');
          toaster.create({ title: 'Sucesso', description: 'Permissão de administrador atualizada.', type: 'success' });
          loadSubscriptions();
        }
      });
    });

    document.getElementById(`user-mi-del-${uid}`)?.addEventListener('click', () => {
      DeleteConfirmationModal({
        title: 'Excluir Usuário',
        description: 'Esta ação é irreversível. O usuário será removido do banco de dados e do authentication.',
        onConfirm: async () => {
          const uState = auth.currentUser;
          if (!uState) throw new Error('Não autenticado.');
          const t = await uState.getIdToken();
          const r = await fetch(`${API_BASE}/api/admin/users/${uid}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${t}` }
          });
          const ans = await r.json();
          if (!r.ok) throw new Error(ans.error || 'Falha ao excluir o usuário.');
          toaster.create({ title: 'Sucesso', description: 'Usuário excluído definitivamente.', type: 'success' });
          loadSubscriptions();
        }
      });
    });
  });
}

function renderNonPayingProRows(candidates: any[]): string {
  if (candidates.length === 0) {
    return `
      <tr>
        <td colspan="5" style="padding:32px 0;text-align:center;color:var(--color-text-secondary);font-size:13px;">
          Nenhum usuário PRO sem assinatura ativa.
        </td>
      </tr>
    `;
  }
  return candidates.map((c: any) => {
    const provider = c.provider === 'asaas'
      ? `<img src="/assets/logo/assas.png" class="cc-provider-img" title="Asaas" />`
      : c.provider === 'stripe'
        ? `<img src="/assets/logo/stripe.png" class="cc-provider-img" title="Stripe" />`
        : `<span class="cc-badge cc-badge-inactive">Sistema</span>`;
    const days = Number(c.activeDaysCount) || 0;
    const rel = fmtRelativeTime(c.lastLogin);
    const name = c.name || c.email || c.uid;
    const email = c.email || '—';
    return `
      <tr data-uid="${c.uid}">
        <td style="width:36px;padding-right:0;">
          <label class="np-checkbox-wrap" style="display:inline-flex;align-items:center;cursor:pointer;">
            <input type="checkbox" class="np-row-check" data-uid="${c.uid}" checked
              style="width:16px;height:16px;cursor:pointer;accent-color:#ef4444;" />
          </label>
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
            <span style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;" title="${name}">${name}</span>
            <span style="font-size:11.5px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;" title="${email}">${email}</span>
          </div>
        </td>
        <td>${provider}</td>
        <td style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap;">
          ${days > 0 ? `${days} dia${days !== 1 ? 's' : ''}` : 'Sem registros'}
        </td>
        <td style="font-size:12px;color:${rel.color};white-space:nowrap;">${rel.text}</td>
      </tr>
    `;
  }).join('');
}

async function handleDowngradeNonPaying(): Promise<void> {
  let triggerBtn: HTMLButtonElement | null = null;
  try {
    triggerBtn = document.getElementById('btn-downgrade-non-paying') as HTMLButtonElement | null;
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.style.opacity = '0.5';
    }

    const user = auth.currentUser;
    if (!user) throw new Error('Não autenticado.');
    const token = await user.getIdToken();

    const dryRes = await fetch(`${API_BASE}/api/admin/downgrade-non-paying?dryRun=1`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!dryRes.ok) {
      const err = await dryRes.json().catch(() => ({ error: dryRes.statusText }));
      throw new Error(err.error || 'Falha ao calcular candidatos.');
    }
    const dryData = await dryRes.json();
    const count = dryData.wouldDowngrade || 0;
    const candidates: any[] = dryData.candidates || [];

    // Selecionados (default: todos marcados)
    const selectedUids = new Set<string>(candidates.map(c => c.uid));

    const content = `
      <style>
        .np-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border-light);
          flex-shrink: 0;
        }
        .np-modal-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          border-bottom: 1px solid var(--color-border-light);
          background: var(--color-surface);
          flex-shrink: 0;
        }
        .np-modal-toolbar-left {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .np-toolbar-btn {
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11.5px;
          font-weight: 500;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .np-toolbar-btn:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
        }
        .np-modal-scroll {
          overflow-y: auto;
          overflow-x: auto;
          max-height: min(50vh, 420px);
        }
        .np-modal-scroll .cc-table {
          min-width: 0;
        }
        .np-modal-scroll .cc-table thead th {
          position: sticky;
          top: 0;
          background: var(--color-surface);
          z-index: 1;
          box-shadow: inset 0 -1px 0 var(--color-border);
        }
        .np-modal-shell {
          display: block;
        }
      </style>
      <div class="np-modal-shell">
        <div class="np-modal-header">
          <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin:0;">
            ${count === 0
        ? 'Nenhum usuário PRO sem assinatura ativa encontrado.'
        : `<strong style="color:var(--color-text);">${count}</strong> usuário${count !== 1 ? 's' : ''} com plano PRO no Firestore <strong>sem assinatura ativa</strong> no Stripe/Asaas. Desmarque quem você quer preservar. Admins já são preservados automaticamente.`}
          </p>
        </div>
        ${count > 0 ? `
        <div class="np-modal-toolbar">
          <div class="np-modal-toolbar-left">
            <span id="np-selected-count">${count} selecionado${count !== 1 ? 's' : ''}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button type="button" class="np-toolbar-btn" id="np-select-all">Marcar todos</button>
            <button type="button" class="np-toolbar-btn" id="np-select-none">Desmarcar todos</button>
          </div>
        </div>
        ` : ''}
        <div class="np-modal-scroll">
          <table class="cc-table" style="width:100%;">
            <thead>
              <tr>
                <th style="width:36px;padding-right:0;">
                  ${count > 0 ? `<input type="checkbox" id="np-header-check" checked style="width:16px;height:16px;cursor:pointer;accent-color:#ef4444;" />` : ''}
                </th>
                <th>Usuário</th>
                <th>Provedor</th>
                <th>Dias de uso</th>
                <th>Último acesso</th>
              </tr>
            </thead>
            <tbody id="np-table-body">
              ${renderNonPayingProRows(candidates)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    Modal({
      title: 'PROs não pagantes',
      content,
      maxWidth: 'max-w-2xl',
      fieldsPadding: 'p-0',
      showCancel: true,
      cancelText: 'Fechar',
      showConfirm: count > 0,
      confirmText: count > 0 ? `Rebaixar ${count} para Free` : 'Rebaixar',
      onConfirm: async () => {
        const uids = Array.from(selectedUids);
        if (uids.length === 0) {
          toaster.create({ title: 'Nada selecionado', description: 'Marque ao menos um usuário.', type: 'message' });
          throw new Error('Nada selecionado');
        }
        const u2 = auth.currentUser;
        if (!u2) throw new Error('Não autenticado.');
        const t2 = await u2.getIdToken();
        const r = await fetch(`${API_BASE}/api/admin/downgrade-non-paying`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${t2}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uids })
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: r.statusText }));
          throw new Error(err.error || 'Falha no rebaixamento.');
        }
        const data = await r.json();
        const n = data.downgraded || 0;
        toaster.create({
          title: 'Concluído',
          description: `${n} usuário${n !== 1 ? 's' : ''} rebaixado${n !== 1 ? 's' : ''} para Free.`,
          type: 'success'
        });
        loadSubscriptions();
      }
    });

    // Listeners de selecao (rodam apos o modal estar no DOM)
    setTimeout(() => {
      const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
      const countEl = document.getElementById('np-selected-count');
      const headerCheck = document.getElementById('np-header-check') as HTMLInputElement | null;

      const updateUi = () => {
        const n = selectedUids.size;
        if (countEl) countEl.textContent = `${n} selecionado${n !== 1 ? 's' : ''}`;
        if (submitBtn) {
          submitBtn.textContent = n > 0 ? `Rebaixar ${n} para Free` : 'Rebaixar';
          submitBtn.disabled = n === 0;
          submitBtn.style.opacity = n === 0 ? '0.5' : '';
        }
        if (headerCheck) {
          headerCheck.checked = n === candidates.length && candidates.length > 0;
          headerCheck.indeterminate = n > 0 && n < candidates.length;
        }
      };

      document.querySelectorAll<HTMLInputElement>('.np-row-check').forEach(cb => {
        cb.addEventListener('change', () => {
          const uid = cb.dataset.uid!;
          if (cb.checked) selectedUids.add(uid);
          else selectedUids.delete(uid);
          updateUi();
        });
      });

      headerCheck?.addEventListener('change', () => {
        const checked = headerCheck.checked;
        document.querySelectorAll<HTMLInputElement>('.np-row-check').forEach(cb => {
          cb.checked = checked;
          const uid = cb.dataset.uid!;
          if (checked) selectedUids.add(uid);
          else selectedUids.delete(uid);
        });
        updateUi();
      });

      document.getElementById('np-select-all')?.addEventListener('click', () => {
        document.querySelectorAll<HTMLInputElement>('.np-row-check').forEach(cb => {
          cb.checked = true;
          selectedUids.add(cb.dataset.uid!);
        });
        updateUi();
      });

      document.getElementById('np-select-none')?.addEventListener('click', () => {
        document.querySelectorAll<HTMLInputElement>('.np-row-check').forEach(cb => {
          cb.checked = false;
        });
        selectedUids.clear();
        updateUi();
      });
    }, 50);
  } catch (err: any) {
    if (err?.message !== 'Nada selecionado') {
      toaster.create({
        title: 'Erro',
        description: err?.message || 'Falha ao listar não pagantes.',
        type: 'error'
      });
    }
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.style.opacity = '';
    }
  }
}

async function fetchAdminJson(path: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Erro desconhecido');
  }

  return res.json();
}

function attachAdminFilterScroller(): void {
  const scroller = document.querySelector<HTMLElement>('.admin-filters-scroller');
  if (!scroller) return;

  let isPointerDown = false;
  let hasMoved = false;
  let startX = 0;
  let startScrollLeft = 0;
  let suppressClickUntil = 0;

  const endDrag = () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    scroller.classList.remove('is-grabbing');

    if (hasMoved) {
      suppressClickUntil = Date.now() + 120;
    }
    scroller.classList.remove('is-dragging');
  };

  scroller.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.filter-nav-btn')) return;
    if (target?.closest('.date-range-trigger')) return;

    isPointerDown = true;
    hasMoved = false;
    startX = event.clientX;
    startScrollLeft = scroller.scrollLeft;
    scroller.classList.add('is-grabbing');
    scroller.setPointerCapture?.(event.pointerId);
  });

  scroller.addEventListener('pointermove', (event) => {
    if (!isPointerDown) return;
    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) <= 4) return;

    hasMoved = true;
    scroller.classList.add('is-dragging');
    scroller.scrollLeft = startScrollLeft - deltaX;
    event.preventDefault();
  });

  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointercancel', endDrag);
  scroller.addEventListener('lostpointercapture', endDrag);

  scroller.addEventListener('click', (event) => {
    if (Date.now() > suppressClickUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  scroller.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    scroller.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });
}

async function loadSubscriptions(): Promise<void> {
  const container = document.getElementById('admin-subscriptions-content-area');
  if (!container) return;

  container.innerHTML = `
    <div class="cc-table-wrapper">
      <div class="cc-loading">
        <div class="cc-spinner"></div>
        <span class="cc-loading-text">Carregando assinaturas…</span>
      </div>
    </div>
  `;

  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Não autenticado.');
    const token = await user.getIdToken();

    const [data, pluggyData] = await Promise.all([
      fetchAdminJson('/api/admin/users', token),
      fetchAdminJson('/api/admin/pluggy-sync', token).catch((pluggyErr) => {
        console.warn('[AdminSubscriptions] erro ao buscar Pluggy:', pluggyErr);
        return null;
      })
    ]);

    allUsersGlobal = data.users || [];
    mergePluggyRowsIntoUsers(allUsersGlobal, pluggyData?.rows || [], !pluggyData);
    filteredUsersGlobal = [...allUsersGlobal];

    container.innerHTML = `
      ${renderGrowthKpis(allUsersGlobal)}
      <div class="cc-table-wrapper">
        <div class="cc-table-header">
          <div class="cc-table-header-left">
            <span class="cc-table-header-title">Funil trial → banco</span>
          </div>
          <div class="cc-table-header-right">
            <div id="verify-loading-indicator" style="display:none;align-items:center;gap:5px;">
              <div class="cc-spinner-xs"></div>
              <span style="font-size:11px;color:var(--color-text-secondary);">Buscando dados verificados…</span>
            </div>
            <span class="cc-table-count" style="font-size:12px;font-weight:600;color:var(--color-text-secondary);">
              ${allUsersGlobal.length} usuário${allUsersGlobal.length !== 1 ? 's' : ''}
            </span>
            <div class="cc-header-sep"></div>
            <button id="btn-downgrade-non-paying" class="cc-action-btn" title="Remover PRO de não pagantes (preserva admins)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
            <button id="btn-refresh-subs" class="cc-action-btn" title="Atualizar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="cc-table-scroll">
          <table class="cc-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Funil</th>
                <th>Criado em</th>
                <th>Bancos conectados</th>
                <th>Último acesso</th>
                <th style="text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableContent(allUsersGlobal)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btn-refresh-subs')?.addEventListener('click', loadSubscriptions);
    document.getElementById('btn-downgrade-non-paying')?.addEventListener('click', handleDowngradeNonPaying);

    // Apply current filters after load
    applyFilterAndRender();

    // Verificacao em lote via /api/admin/stats (fonte unica de verdade)
    const verifyIndicator = document.getElementById('verify-loading-indicator');
    if (verifyIndicator) verifyIndicator.style.display = 'flex';

    try {
      const statsRes = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) {
        const errPayload = await statsRes.json().catch(() => ({ error: 'Falha ao buscar stats.' }));
        throw new Error(errPayload.error || 'Falha ao buscar stats.');
      }
      const statsData = await statsRes.json();
      const providerErrors: ProviderError[] = Array.isArray(statsData.providerErrors) ? statsData.providerErrors : [];
      type PayingUserInfo = {
        uid: string;
        provider: string;
        status: string;
        monthlyAmount: number;
        cancelAtPeriodEnd?: boolean;
        canceledAt?: string | null;
        canceledAtDate?: string | null;
        cancelAt?: string | null;
        cancelAtDate?: string | null;
        endedAt?: string | null;
        endedAtDate?: string | null;
        currentPeriodEnd?: string | null;
        nextBillingDate?: string | null;
        stripeStatus?: string | null;
        appleStatus?: string | null;
        googlePlayStatus?: string | null;
        trialStatus?: string | null;
        trialDays?: number | null;
        trialStartedAt?: string | null;
        trialStartedDate?: string | null;
        trialEndsAt?: string | null;
        trialEndsDate?: string | null;
      };
      const payingUsers: Array<PayingUserInfo> = statsData.payingUsers || [];

      const payingByUid = new Map<string, PayingUserInfo>();
      payingUsers.forEach((p) => payingByUid.set(p.uid, p));

      if (providerErrors.length) {
        toaster.create({
          title: 'Verificacao parcial',
          description: `Nao foi possivel consultar ${providerErrorsText(providerErrors)} agora. Usuarios afetados estao marcados com "erro sync".`,
          type: 'warning',
          duration: 8000
        });
      }

      allUsersGlobal.forEach((u: any) => {
        const info = payingByUid.get(u.uid);
        if (info) {
          u.verificationUnavailable = false;
          u.isVerified = true;
          u.isPaying = normalizeValue(info.status) === 'active';
          u.providerStatus = info.status;
          u.verifiedMonthlyAmount = info.monthlyAmount;
          u.stripeStatus = info.stripeStatus ?? u.stripeStatus;
          u.appleStatus = info.appleStatus ?? u.appleStatus;
          u.googlePlayStatus = info.googlePlayStatus ?? u.googlePlayStatus;
          u.trialStatus = info.trialStatus ?? u.trialStatus;
          u.trialDays = info.trialDays ?? u.trialDays;
          u.trialStartedAt = info.trialStartedAt ?? u.trialStartedAt;
          u.trialStartedDate = info.trialStartedDate ?? u.trialStartedDate;
          u.trialEndsAt = info.trialEndsAt ?? u.trialEndsAt;
          u.trialEndsDate = info.trialEndsDate ?? u.trialEndsDate;
          u.cancelAtPeriodEnd = info.cancelAtPeriodEnd ?? u.cancelAtPeriodEnd;
          u.canceledAt = info.canceledAt ?? u.canceledAt;
          u.canceledAtDate = info.canceledAtDate ?? u.canceledAtDate;
          u.cancelAt = info.cancelAt ?? u.cancelAt;
          u.cancelAtDate = info.cancelAtDate ?? u.cancelAtDate;
          u.endedAt = info.endedAt ?? u.endedAt;
          u.endedAtDate = info.endedAtDate ?? u.endedAtDate;
          u.currentPeriodEnd = info.currentPeriodEnd ?? u.currentPeriodEnd;
          u.nextBillingDate = info.nextBillingDate ?? u.nextBillingDate;
          if (info.provider && u.provider !== info.provider) {
            u.provider = info.provider;
          }
        } else if (hasProviderError(providerErrors, u.provider)) {
          u.verificationUnavailable = true;
          u.isVerified = undefined;
          u.isPaying = false;
          u.providerStatus = 'error';
        } else {
          u.verificationUnavailable = false;
          u.isVerified = false;
          u.isPaying = false;
        }
      });

      // Re-render com os flags atualizados
      applyFilterAndRender();
    } catch (statsErr) {
      console.error('[AdminSubscriptions] erro ao buscar stats:', statsErr);
      // Marca provedores externos como verificacao pendente em caso de falha geral.
      allUsersGlobal.forEach((u: any) => {
        if (u.isVerified === undefined) {
          const isExternalProvider = isVerifiableProvider(u.provider);
          u.verificationUnavailable = isExternalProvider;
          u.isVerified = isExternalProvider ? undefined : false;
          u.isPaying = false;
        }
      });
      applyFilterAndRender();
    } finally {
      if (verifyIndicator) verifyIndicator.style.display = 'none';
    }

  } catch (err: any) {
    container.innerHTML = `
      <div class="cc-table-wrapper">
        <div class="cc-loading">
          <span class="cc-loading-text" style="color:#ef4444;">Erro: ${err.message}</span>
          <button id="btn-retry-subs" style="margin-top:12px;padding:6px 16px;border-radius:8px;background:var(--color-surface);border:1px solid var(--color-border);font-size:12px;cursor:pointer;color:var(--color-text-secondary);">
            Tentar novamente
          </button>
        </div>
      </div>
    `;
    document.getElementById('btn-retry-subs')?.addEventListener('click', loadSubscriptions);
  }
}

function showUserModal(userItem: any) {
  const modalAvContainerId = `modal-av-${Math.random().toString(36).substr(2, 9)}`;
  const modalTooltipId = `m-v-t-${userItem.uid}`;
  const modalVerifyHtml = renderUserVerificationBadge(userItem, modalTooltipId);

  const content = `
    <div class="px-4 sm:px-8 pt-6 pb-6 border-b border-[var(--color-border)]">
      <div class="flex items-center gap-4">
         <div id="${modalAvContainerId}" class="shrink-0" style="width:52px;height:52px;border-radius:16px;overflow:hidden;"></div>
         <div class="overflow-hidden">
           <div class="flex items-center gap-1.5 font-semibold text-[var(--color-text)] text-lg whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]" title="${userItem.name}">
             <span class="truncate">${userItem.name}</span>
             ${modalVerifyHtml}
           </div>
           <div class="text-[var(--color-text-secondary)] text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]" title="${userItem.email}">${userItem.email}</div>
         </div>
      </div>
    </div>
    
    <div class="flex flex-col text-sm text-[var(--color-text)] pb-4">
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">ID / UID</span>
        <div class="flex items-center gap-2">
           <span class="font-mono text-xs opacity-75 truncate max-w-[180px]" title="${userItem.uid}">${userItem.uid}</span>
           <button id="modal-btn-copy-uid" class="p-1 hover:bg-[var(--color-surface-hover)] rounded transition-colors text-[var(--color-text-secondary)]" title="Copiar ID">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
             </svg>
           </button>
        </div>
      </div>
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Criado em</span>
        <span>${fmtDate(userItem.createdAt)}</span>
      </div>
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Origem da conta</span>
        <span class="font-medium">${getSignupPlatformLabel(userItem)}${isMobileSignup(userItem) ? ' / Celular' : ''}</span>
      </div>
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Plano</span>
        <span class="capitalize font-medium">${isTrialClient(userItem) ? `Trial${isSevenDayTrial(userItem) ? ' 7 dias' : ''}` : (isPayingClient(userItem) ? 'Pagante' : 'Sem plano')}</span>
      </div>
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Acesso</span>
        <span class="font-medium">${userItem.isAdmin ? 'Administrador' : 'Padrão'}</span>
      </div>
      <div class="flex justify-between items-center px-4 sm:px-8 py-3 border-b border-[var(--color-border)]/50">
        <span class="text-[var(--color-text-secondary)]">Provedor</span>
        <div class="flex items-center gap-2">
          ${renderProviderLabel(userItem)}
        </div>
      </div>
      ${renderCancellationModalRows(userItem)}
      ${renderSubscriptionModalTimelineRows(userItem)}
      <div class="flex justify-between items-center px-4 sm:px-8 py-3">
        <span class="text-[var(--color-text-secondary)]">Status (Sistema de Pag.)</span>
        <span class="capitalize font-medium">${getProviderStatus(userItem) === 'unknown' ? 'Nao aplicavel' : getProviderStatus(userItem)}</span>
      </div>
    </div>
  `;

  Modal({
    title: 'Detalhes do Usuário',
    content,
    showFooter: false,
    fieldsPadding: 'p-0'
  });

  const avEl = document.getElementById(modalAvContainerId);
  if (avEl) {
    const root = createRoot(avEl);
    root.render(createElement(Avvvatars, { value: userItem.email || userItem.uid, size: 52, style: 'shape' }));
  }

  // Listener para o botão de cópia no modal
  const copyBtn = document.getElementById('modal-btn-copy-uid');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(userItem.uid).then(() => {
        toaster.create({ title: 'Copiado', description: 'ID do usuário copiado.', type: 'success' });
        copyBtn.style.color = 'var(--color-primary)';
        setTimeout(() => { copyBtn.style.color = ''; }, 1000);
      });
    });
  }

  // Inicializar tooltip do modal
  if (modalVerifyHtml) {
    import('../components/Tooltip').then(m => m.attachTooltipListeners(modalTooltipId));
  }
}

export function renderAdminSubscriptions(user: any) {
  if (user?.isAdmin !== true) {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard' } }));
    return;
  }
  const app = document.querySelector<HTMLDivElement>('#app')!;

  app.innerHTML = `
    <div id="admin-shell" class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        @keyframes fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-fadein { animation: fadein 0.25s ease forwards; }

        .growth-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .growth-kpi-card {
          min-width: 0;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-surface);
          padding: 14px;
        }
        .growth-kpi-head {
          display: flex;
          align-items: center;
          gap: 7px;
          min-height: 18px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
        }
        .growth-kpi-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text);
          opacity: 0.8;
          flex-shrink: 0;
        }
        .growth-kpi-card strong {
          display: block;
          margin-top: 10px;
          font-size: 24px;
          font-weight: 650;
          line-height: 1.05;
          color: var(--color-text);
          white-space: nowrap;
        }
        .growth-kpi-card small {
          display: block;
          margin-top: 7px;
          font-size: 11.5px;
          color: var(--color-text-secondary);
          line-height: 1.3;
        }

        /* Visual Funnel */
        .cc-visual-funnel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          width: 120px;
        }
        .cc-funnel-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 20px;
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          padding: 0 4px;
        }
        .cc-funnel-bar-1 { width: 100%; border-radius: 4px 4px 2px 2px; }
        .cc-funnel-bar-2 { width: 86%; border-radius: 2px; }
        .cc-funnel-bar-3 { width: 73%; border-radius: 2px; }
        .cc-funnel-bar-4 { width: 60%; border-radius: 2px 2px 4px 4px; }

        .cc-fbg-origin { background: #64748b; }
        .cc-fbg-good { background: #10b981; }
        .cc-fbg-warn { background: #f59e0b; }
        .cc-fbg-info { background: #3b82f6; }
        .cc-fbg-muted { background: #94a3b8; }

        /* Table wrapper */
        .cc-table-wrapper {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          overflow: visible;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* Table header */
        .cc-table-header {
          padding: 14px 20px;
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .cc-table-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cc-table-header-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: var(--color-text-secondary);
        }
        .cc-table-header-right {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }
        .cc-table-kpis {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .cc-table-kpi {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          white-space: nowrap;
        }
        .cc-table-kpi-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--color-text-secondary);
        }
        .cc-table-kpi-value {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text);
        }
        .cc-table-count {
          white-space: nowrap;
        }
        .cc-header-sep {
          width: 1px;
          height: 14px;
          background: var(--color-border);
          flex-shrink: 0;
        }

        /* Table scroll */
        .cc-table-scroll {
          overflow-x: auto;
        }

        /* Table */
        .cc-table {
          width: 100%;
          min-width: 960px;
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
          letter-spacing: 0.07em;
          color: var(--color-text-secondary);
          text-align: left;
          white-space: nowrap;
        }
        .cc-table th:last-child { text-align: right; }
        .cc-table td {
          padding: 13px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--color-border-light, rgba(255,255,255,0.04));
          vertical-align: middle;
          color: var(--color-text);
        }
        .cc-table tbody tr:last-child td { border-bottom: none; }
        .cc-table tbody tr { transition: background 0.15s; }
        .cc-table tbody tr:hover { background: var(--color-surface-hover); }

        .cc-user-main {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 210px;
        }
        .cc-user-copy,
        .cc-date-cell,
        .cc-cell-stack,
        .cc-bank-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .cc-user-name {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 13px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 210px;
        }
        .cc-user-name > span {
          min-width: 0;
          flex: 0 1 auto;
        }
        .cc-user-verify-tooltip {
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          align-items: center;
          justify-content: center;
        }
        .cc-user-verify-tooltip svg {
          width: 18px;
          height: 18px;
          display: block;
        }
        .cc-user-name span,
        .cc-user-email,
        .cc-date-cell span,
        .cc-cell-stack span,
        .cc-bank-cell span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cc-user-email,
        .cc-date-cell span,
        .cc-cell-stack span,
        .cc-bank-cell span {
          font-size: 11.5px;
          color: var(--color-text-secondary);
          max-width: 220px;
        }
        .cc-date-cell strong,
        .cc-cell-stack strong,
        .cc-bank-cell strong {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text);
          white-space: nowrap;
        }
        .cc-cell-warn strong {
          color: #f59e0b;
        }
        .cc-cell-muted strong {
          color: var(--color-text-secondary);
        }
        .cc-status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-width: 82px;
          height: 24px;
          padding: 0 9px;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }
        .cc-status-good { color: #22c55e; background: rgba(34, 197, 94, 0.08); border-color: rgba(34, 197, 94, 0.2); }
        .cc-status-info { color: #38bdf8; background: rgba(56, 189, 248, 0.08); border-color: rgba(56, 189, 248, 0.2); }
        .cc-status-warn { color: #f59e0b; background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.2); }
        .cc-status-danger { color: #ef4444; background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.2); }
        .cc-status-muted { color: var(--color-text-secondary); background: var(--color-surface-hover); }
        .cc-status-pill-mini {
          min-width: 0;
          height: 22px;
          padding: 0 8px;
          font-size: 10.5px;
          font-weight: 650;
        }
        .cc-status-context {
          opacity: 0.7;
          font-weight: 700;
        }

        .cc-funnel-cell {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          min-width: 240px;
          max-width: 360px;
        }
        .cc-funnel-origin {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          font-size: 11px;
          font-weight: 650;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 128px;
        }
        .cc-funnel-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: currentColor;
          opacity: 0.85;
          flex-shrink: 0;
        }

        /* Status badge */
        .cc-badge {
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          font-weight: 500;
        }
        .cc-badge-paid    { color: var(--color-text); }
        .cc-badge-pending { color: var(--color-text); }
        .cc-badge-charge  { color: var(--color-text); }
        .cc-badge-inactive { color: var(--color-text); opacity: 0.8; }

        .cc-plan-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          min-width: 112px;
        }
        .cc-cancel-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 172px;
          height: 24px;
          padding: 3px 8px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: color-mix(in srgb, var(--color-surface) 86%, transparent);
          color: var(--color-text-secondary);
          font-size: 10.5px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }
        .cc-cancel-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
          flex-shrink: 0;
        }
        .cc-cancel-main,
        .cc-cancel-meta {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cc-cancel-main {
          color: var(--color-text);
        }
        .cc-cancel-meta {
          color: var(--color-text-secondary);
        }
        .cc-cancel-sep {
          width: 1px;
          height: 10px;
          background: var(--color-border);
          flex-shrink: 0;
        }
        .cc-timeline-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 172px;
          height: 24px;
          padding: 3px 8px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: color-mix(in srgb, var(--color-surface) 86%, transparent);
          color: var(--color-text-secondary);
          font-size: 10.5px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
        }
        .cc-timeline-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .cc-timeline-trial .cc-timeline-dot {
          background: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14);
        }
        .cc-timeline-paid .cc-timeline-dot {
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.14);
        }
        .cc-origin-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          min-width: 104px;
        }
        .cc-origin-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 24px;
          padding: 3px 8px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }
        .cc-origin-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: currentColor;
          opacity: 0.85;
        }
        .cc-origin-source {
          font-size: 10.5px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }
        .cc-origin-android { color: #22c55e; background: rgba(34, 197, 94, 0.08); }
        .cc-origin-iphone { color: #38bdf8; background: rgba(56, 189, 248, 0.08); }
        .cc-origin-mobile { color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
        .cc-origin-desktop { color: var(--color-text-secondary); background: var(--color-surface-hover); }
        .cc-origin-unknown { color: var(--color-text-secondary); background: transparent; }

        /* Category / provider pill */
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
        .cc-category-asaas {
          background: rgba(99,102,241,0.1);
          color: #818cf8;
          border-color: rgba(99,102,241,0.2);
        }
        html[data-theme="light"] .cc-category-asaas {
          color: #4f46e5;
          background: rgba(99,102,241,0.08);
        }
        .cc-category-stripe {
          background: rgba(56,189,248,0.1);
          color: #38bdf8;
          border-color: rgba(56,189,248,0.2);
        }
        html[data-theme="light"] .cc-category-stripe {
          color: #0284c7;
          background: rgba(56,189,248,0.08);
        }

        .cc-provider-img {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          object-fit: contain;
          vertical-align: middle;
        }

        /* Action button */
        .cc-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          text-decoration: none;
        }
        .cc-action-btn:hover {
          color: var(--color-text);
          background: transparent;
        }
        .user-btn-delete:hover {
          color: #ef4444 !important;
        }
        .user-btn-admin:hover {
          color: #D97757 !important;
        }

        /* Loading */
        .cc-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 56px 24px;
          gap: 12px;
        }
        .cc-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-text-secondary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .cc-spinner-xs {
          width: 11px;
          height: 11px;
          border: 1.5px solid var(--color-border);
          border-top-color: var(--color-text-secondary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .cc-loading-text {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        /* Desktop vs mobile actions */
        .cc-desktop-actions { display: flex; }
        .cc-mobile-actions  { display: none; }

        /* Filter chips container */
        .admin-filters-scroller {
          display: flex;
          flex: 1 1 auto;
          gap: 8px;
          min-width: 0;
          max-width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 4px 2px;
          margin: -4px -2px;
          cursor: grab;
          user-select: none;
          touch-action: pan-x;
          -webkit-overflow-scrolling: touch;
        }
        .admin-filters-scroller::-webkit-scrollbar { display: none; }
        .admin-filters-scroller.is-grabbing {
          cursor: grabbing;
        }
        .admin-filters-scroller.is-dragging * {
          pointer-events: none;
        }
        .admin-filters-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1 1 auto;
          width: 100%;
        }
        .admin-growth-toolbar {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 18px;
        }
        .admin-growth-title h2 {
          margin: 0;
        }
        .admin-growth-title p {
          max-width: 620px;
        }
        .admin-reset-filters-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: color-mix(in srgb, var(--color-surface) 92%, transparent);
          color: var(--color-text-secondary);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
        }
        .admin-reset-filters-btn:hover {
          color: var(--color-text);
          border-color: color-mix(in srgb, var(--color-text-secondary) 42%, var(--color-border));
          background: var(--color-surface-hover);
        }
        .admin-reset-filters-btn:active {
          transform: scale(0.96) rotate(-12deg);
        }
        .admin-export-xls-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 34px;
          padding: 0 12px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: color-mix(in srgb, var(--color-surface) 92%, transparent);
          color: var(--color-text-secondary);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.16s ease, border-color 0.16s ease, transform 0.16s ease, background 0.16s ease;
        }
        .admin-export-xls-btn span {
          font-size: 11.5px;
          font-weight: 700;
          line-height: 1;
        }
        .admin-export-xls-btn:hover {
          color: var(--color-text);
          border-color: color-mix(in srgb, var(--color-text-secondary) 42%, var(--color-border));
          background: var(--color-surface-hover);
        }
        .admin-export-xls-btn:active {
          transform: scale(0.97);
        }
        .admin-user-search {
          position: relative;
          flex: 0 1 280px;
          min-width: 220px;
          height: 34px;
        }
        .admin-user-search svg {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-secondary);
          pointer-events: none;
        }
        .admin-user-search input {
          width: 100%;
          height: 100%;
          border: 1px solid var(--color-border);
          border-radius: 14px;
          background: color-mix(in srgb, var(--color-surface) 92%, transparent);
          color: var(--color-text);
          padding: 0 12px 0 34px;
          font-size: 12px;
          font-weight: 600;
          outline: none;
          transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }
        .admin-user-search input::placeholder {
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        .admin-user-search input:focus {
          border-color: color-mix(in srgb, var(--color-text-secondary) 48%, var(--color-border));
          background: var(--color-surface-hover);
        }

        /* Mobile responsiveness */
        @media (max-width: 1100px) {
          .growth-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 767px) {
          .growth-kpi-grid {
            grid-template-columns: 1fr;
          }
          .growth-kpi-card {
            padding: 12px;
          }
          .admin-filters-wrap {
            flex-wrap: wrap;
          }
          .admin-user-search {
            order: -1;
            flex: 1 1 100%;
            min-width: 0;
          }
          .admin-filters-scroller {
            flex: 1 1 100%;
          }
          .cc-table-header {
            padding: 12px 14px;
            gap: 8px;
            flex-wrap: wrap;
          }
          .cc-table-header-right {
            width: 100%;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .cc-table-header-left {
            flex: 1;
          }
          .cc-table-kpis {
            flex: 1 1 100%;
            gap: 10px;
          }
          .cc-table-kpi {
            flex: 1 1 auto;
          }
          .cc-table-kpi-value {
            font-size: 11.5px;
          }

          /* Card layout: converte tabela em lista de cards */
          .cc-table-scroll {
            overflow-x: visible;
          }
          .cc-table {
            min-width: 0;
            display: block;
          }
          .cc-table thead {
            display: none;
          }
          .cc-table tbody {
            display: block;
          }
          .cc-table tbody tr {
            position: relative;
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            padding: 16px 64px 16px 14px;
            gap: 6px 8px;
            border-bottom: 1px solid var(--color-border);
          }
          /* Mais espaço entre os botões de ação no mobile */
          .cc-table td:nth-child(5) .flex {
            gap: 14px;
          }
          .cc-table tbody tr:last-child {
            border-bottom: none;
          }
          .cc-table td {
            padding: 0;
            border-bottom: none;
            font-size: 13px;
          }

          /* Linha 1: info do usuário (largura total, restando espaço p/ ações absolutas) */
          .cc-table td:nth-child(1) {
            flex: 0 0 100%;
            min-width: 0;
            padding-bottom: 8px;
            order: 1;
          }

          /* Troca desktop → mobile actions */
          .cc-desktop-actions { display: none; }
          .cc-mobile-actions  { display: flex; align-items: center; }

          /* Ações: absoluto no canto superior direito, fora do fluxo flex */
          .cc-table td:nth-child(5) {
            position: absolute;
            top: 8px;
            right: 14px;
          }

          /* Linha 2: funil compacto */
          .cc-table td:nth-child(2) {
            flex: 0 0 100%;
            min-width: 0;
            order: 2;
          }
          .cc-funnel-cell {
            min-width: 0;
            max-width: none;
            width: 100%;
          }

          /* Linha 3: banco */
          .cc-table td:nth-child(3) {
            flex: 0 0 auto;
            order: 3;
          }

          /* Linha 4: datas e atividade */
          .cc-table td:nth-child(4) {
            flex: 0 0 100%;
            order: 4;
            padding-top: 2px;
          }
        }
      </style>

      <main class="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="w-full animate-fadein">
          <div class="admin-growth-toolbar">
            <div class="admin-growth-title">
              <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Gestão de usuários</h2>
              <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Funil trial → banco conectado → assinatura ativa.</p>
            </div>
            <div class="admin-filters-wrap">
              <button id="admin-reset-filters" class="admin-reset-filters-btn" type="button" title="Resetar filtros" aria-label="Resetar filtros">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7"/>
                  <path d="M3 4v6h6"/>
                </svg>
              </button>
              <button id="admin-export-excel" class="admin-export-xls-btn" type="button" title="Exportar tabela para Excel" aria-label="Exportar tabela para Excel">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"/>
                  <path d="M14 2v5h5"/>
                  <path d="m9 15-2-2-2-2"/>
                  <path d="m15 11-2 2 2 2"/>
                </svg>
                <span>Excel</span>
              </button>
              <label class="admin-user-search" for="admin-user-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input id="admin-user-search" type="search" placeholder="Buscar usuario" value="${escapeHtml(activeUserSearch)}" autocomplete="off" />
              </label>
              <div class="admin-filters-scroller">
                 ${DateRangePicker({ id: 'admin-date-range' })}
                 ${FilterSelector({ id: 'selector-origin' })}
                 ${FilterSelector({ id: 'selector-trial-status' })}
                 ${FilterSelector({ id: 'selector-subscription-status' })}
                 ${FilterSelector({ id: 'selector-trial-days' })}
                 ${FilterSelector({ id: 'selector-last-access' })}
                 ${FilterSelector({ id: 'selector-bank-status' })}
                 ${FilterSelector({ id: 'selector-active-subscription' })}
              </div>
            </div>
          </div>

          <div id="admin-subscriptions-content-area" class="mt-2">
            <!-- preenchido via JS -->
          </div>
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();
  attachAdminFilterScroller();
  document.getElementById('admin-reset-filters')?.addEventListener('click', resetGrowthFilters);
  document.getElementById('admin-export-excel')?.addEventListener('click', exportGrowthTableToExcel);
  document.getElementById('admin-user-search')?.addEventListener('input', (event) => {
    activeUserSearch = (event.target as HTMLInputElement).value;
    applyFilterAndRender();
  });

  attachDateRangePickerListeners({
    id: 'admin-date-range',
    initialStart: activeDateStartFilter,
    initialEnd: activeDateEndFilter,
    onChange: (start, end) => {
      activeDateStartFilter = start;
      activeDateEndFilter = end;
      applyFilterAndRender();
      
      if (start && end) {
        const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
        document.body.dispatchEvent(evt);
      }
    }
  });

  filterSelectorControls = {};
  const originSelectorControl = attachFilterSelectorListeners({
    id: 'selector-origin',
    filters: originFilters,
    initialFilterId: activeOriginFilter,
    onFilterChange: (id) => { activeOriginFilter = id; applyFilterAndRender(); }
  });
  if (originSelectorControl) filterSelectorControls.origin = originSelectorControl;

  const trialStatusSelectorControl = attachFilterSelectorListeners({
    id: 'selector-trial-status',
    filters: trialStatusFilters,
    initialFilterId: activeTrialStatusFilter,
    onFilterChange: (id) => { activeTrialStatusFilter = id; applyFilterAndRender(); }
  });
  if (trialStatusSelectorControl) filterSelectorControls.trialStatus = trialStatusSelectorControl;

  const subscriptionStatusSelectorControl = attachFilterSelectorListeners({
    id: 'selector-subscription-status',
    filters: subscriptionStatusFilters,
    initialFilterId: activeSubscriptionStatusFilter,
    onFilterChange: (id) => { activeSubscriptionStatusFilter = id; applyFilterAndRender(); }
  });
  if (subscriptionStatusSelectorControl) filterSelectorControls.subscriptionStatus = subscriptionStatusSelectorControl;

  const trialDaysSelectorControl = attachFilterSelectorListeners({
    id: 'selector-trial-days',
    filters: trialDaysFilters,
    initialFilterId: activeTrialDaysFilter,
    onFilterChange: (id) => { activeTrialDaysFilter = id; applyFilterAndRender(); }
  });
  if (trialDaysSelectorControl) filterSelectorControls.trialDays = trialDaysSelectorControl;

  const lastAccessSelectorControl = attachFilterSelectorListeners({
    id: 'selector-last-access',
    filters: lastAccessFilters,
    initialFilterId: activeLastAccessFilter,
    onFilterChange: (id) => { activeLastAccessFilter = id; applyFilterAndRender(); }
  });
  if (lastAccessSelectorControl) filterSelectorControls.lastAccess = lastAccessSelectorControl;

  const bankSelectorControl = attachFilterSelectorListeners({
    id: 'selector-bank-status',
    filters: bankFilters,
    initialFilterId: activeBankFilter,
    onFilterChange: (id) => { activeBankFilter = id; applyFilterAndRender(); }
  });
  if (bankSelectorControl) filterSelectorControls.bank = bankSelectorControl;

  const activeSubscriptionSelectorControl = attachFilterSelectorListeners({
    id: 'selector-active-subscription',
    filters: activeSubscriptionFilters,
    initialFilterId: activeSubscriptionActiveFilter,
    onFilterChange: (id) => { activeSubscriptionActiveFilter = id; applyFilterAndRender(); }
  });
  if (activeSubscriptionSelectorControl) filterSelectorControls.activeSubscription = activeSubscriptionSelectorControl;

  async function syncStripeAndLoad(user: any) {
    try {
      const token = await user.getIdToken();
      await fetch(`${API_BASE}/api/admin/stripe/sync-users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // sync silencioso — não bloqueia o carregamento
    }
    loadSubscriptions();
  }

  if (auth.currentUser) {
    syncStripeAndLoad(auth.currentUser);
  } else {
    const unsubscribe = auth.onAuthStateChanged((u: any) => {
      unsubscribe();
      if (u) syncStripeAndLoad(u);
    });
  }
}
