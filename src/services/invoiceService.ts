import { deleteField, setDoc } from 'firebase/firestore';
import { getPluggyCanonicalDocRef } from '../lib/pluggyFirestore';

export interface MoveTransactionOptions {
  userId: string;
  transactionId: string;
  targetMonthKey?: string;
  sourceMonthKey?: string;
  isRemoveOverride?: boolean;
  collectionHint?: 'transactions' | 'creditCardTransactions';
  transactionData?: Record<string, any> | null;
}

export interface InvoiceOption {
  monthKey: string;
  label: string;
  isCurrent: boolean;
}

const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const BR_DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

const MONTH_NAMES_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MONTH_NAMES_LONG = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const normalizeMonthKey = (monthKey?: unknown): string | null => {
  if (typeof monthKey !== 'string') return null;
  const trimmed = monthKey.trim();
  return MONTH_KEY_REGEX.test(trimmed) ? trimmed : null;
};

export const hasManualInvoiceOverride = (transaction?: Record<string, any> | null): boolean => {
  if (!transaction) return false;
  if (transaction.invoiceMonthKeyManual === true) return true;
  return normalizeMonthKey(transaction.manualInvoiceMonth) !== null;
};

export const getTransactionInvoiceMonthKey = (transaction?: Record<string, any> | null): string | null => {
  if (!transaction) return null;

  const manualMonth = normalizeMonthKey(transaction.manualInvoiceMonth);
  if (manualMonth) {
    return manualMonth;
  }

  const storedMonth = normalizeMonthKey(transaction.invoiceMonthKey);
  if (storedMonth) {
    return storedMonth;
  }

  const computedMonth = normalizeMonthKey(transaction.computedInvoiceMonthKey);
  if (computedMonth) {
    return computedMonth;
  }

  return null;
};

const normalizeDateLike = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof (value as any)?.toDate === 'function') {
    const parsed = (value as any).toDate();
    if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  const isoDatePart = raw.includes('T') ? raw.split('T')[0] : raw;
  if (ISO_DATE_REGEX.test(isoDatePart)) {
    return isoDatePart;
  }

  if (BR_DATE_REGEX.test(raw)) {
    const [day, month, year] = raw.split('/').map(Number);
    const parsed = new Date(year, month - 1, day, 12, 0, 0);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

const shiftDateToTargetMonth = (currentDate: string, targetMonthKey: string): string | null => {
  if (!ISO_DATE_REGEX.test(currentDate)) return null;

  const normalizedTarget = normalizeMonthKey(targetMonthKey);
  if (!normalizedTarget) return null;

  const [origYear, origMonth, origDay] = currentDate.split('-').map(Number);
  const [targetYear, targetMonth] = normalizedTarget.split('-').map(Number);
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const safeDay = Math.min(origDay, lastDay);

  if (!Number.isInteger(origYear) || !Number.isInteger(origMonth) || !Number.isInteger(origDay)) {
    return null;
  }

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
};

const shiftDateByInvoiceDelta = (
  currentDate: string,
  sourceMonthKey: string,
  targetMonthKey: string
): string | null => {
  if (!ISO_DATE_REGEX.test(currentDate)) return null;

  const normalizedSource = normalizeMonthKey(sourceMonthKey);
  const normalizedTarget = normalizeMonthKey(targetMonthKey);
  if (!normalizedSource || !normalizedTarget) return null;

  const [currYear, currMonth, currDay] = currentDate.split('-').map(Number);
  const [sourceYear, sourceMonth] = normalizedSource.split('-').map(Number);
  const [targetYear, targetMonth] = normalizedTarget.split('-').map(Number);

  const sourceIndex = sourceYear * 12 + (sourceMonth - 1);
  const targetIndex = targetYear * 12 + (targetMonth - 1);
  const deltaMonths = targetIndex - sourceIndex;

  if (deltaMonths === 0) {
    return currentDate;
  }

  const shiftedDate = new Date(currYear, currMonth - 1, 1, 12, 0, 0);
  shiftedDate.setMonth(shiftedDate.getMonth() + deltaMonths);

  const lastDay = new Date(shiftedDate.getFullYear(), shiftedDate.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(currDay, lastDay);

  return `${shiftedDate.getFullYear()}-${String(shiftedDate.getMonth() + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
};

const sanitizeTransactionData = (transactionData?: Record<string, any> | null): Record<string, any> => {
  if (!transactionData) return {};

  const {
    computedBillName,
    computedInvoiceType,
    computedInvoiceMonthKey,
    __pluggyDocRef,
    __pluggyCanonicalRef,
    __pluggySource,
    ...persistable
  } = transactionData;

  return persistable;
};

export const formatMonthKey = (monthKey: string): string => {
  const normalized = normalizeMonthKey(monthKey);
  if (!normalized) return monthKey || '';

  const [year, month] = normalized.split('-');
  const monthIndex = Number(month) - 1;
  return `${MONTH_NAMES_SHORT[monthIndex]}/${year.slice(2)}`;
};

export const generateInvoiceOptions = (
  currentMonthKey: string,
  monthsBack: number = 2,
  monthsForward: number = 4
): InvoiceOption[] => {
  const normalizedCurrent = normalizeMonthKey(currentMonthKey);
  if (!normalizedCurrent) return [];

  const [year, month] = normalizedCurrent.split('-').map(Number);
  const options: InvoiceOption[] = [];

  for (let offset = -monthsBack; offset <= monthsForward; offset += 1) {
    const targetDate = new Date(year, month - 1 + offset, 1, 12, 0, 0);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const monthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    let suffix = 'Futura';
    if (offset < 0) suffix = 'Fechada';
    if (offset === 0) suffix = 'Atual';

    options.push({
      monthKey,
      label: `${MONTH_NAMES_LONG[targetMonth - 1]} ${targetYear} (${suffix})`,
      isCurrent: offset === 0
    });
  }

  return options;
};

export const moveTransactionToInvoice = async (
  options: MoveTransactionOptions
): Promise<{ success: boolean; error?: string }> => {
  const {
    userId,
    transactionId,
    targetMonthKey,
    sourceMonthKey,
    isRemoveOverride = false,
    collectionHint = 'creditCardTransactions',
    transactionData
  } = options;

  const normalizedTargetMonth = normalizeMonthKey(targetMonthKey);
  if (!isRemoveOverride && !normalizedTargetMonth) {
    return { success: false, error: 'Chave de fatura invalida' };
  }

  const sanitizedTransaction = sanitizeTransactionData(transactionData);
  const resolvedSourceMonth = normalizeMonthKey(sourceMonthKey) || getTransactionInvoiceMonthKey(transactionData);
  const currentIsoDate = normalizeDateLike(sanitizedTransaction.date);
  const shiftedDate = !isRemoveOverride && currentIsoDate && normalizedTargetMonth
    ? (
      (resolvedSourceMonth
        ? shiftDateByInvoiceDelta(currentIsoDate, resolvedSourceMonth, normalizedTargetMonth)
        : null)
      || shiftDateToTargetMonth(currentIsoDate, normalizedTargetMonth)
    )
    : null;

  const docRef = getPluggyCanonicalDocRef(userId, collectionHint, transactionId);

  try {
    if (isRemoveOverride) {
      await setDoc(docRef, {
        ...sanitizedTransaction,
        invoiceMonthKey: deleteField(),
        invoiceMonthKeyManual: deleteField(),
        manualInvoiceMonth: deleteField(),
        creditCardMetadata: {
          ...(sanitizedTransaction.creditCardMetadata || {}),
          billId: null
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return { success: true };
    }

    await setDoc(docRef, {
      ...sanitizedTransaction,
      invoiceMonthKey: normalizedTargetMonth,
      invoiceMonthKeyManual: true,
      manualInvoiceMonth: normalizedTargetMonth,
      creditCardMetadata: {
        ...(sanitizedTransaction.creditCardMetadata || {}),
        billId: null
      },
      ...(shiftedDate ? { date: shiftedDate } : {}),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error('[invoiceService] Erro ao sincronizar fatura:', error);
    return { success: false, error: error?.message || 'Erro desconhecido' };
  }
};
