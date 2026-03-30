import { setDoc } from 'firebase/firestore';
import { BillConstructor, normalizeExactDateForMonth } from '../lib/BillConstructor';
import type { ClosingDateSettings, ComputedBill } from '../lib/BillConstructor';
import { getPluggyCanonicalDocRef } from '../lib/pluggyFirestore';
import { formatMonthKey } from '../services/invoiceService';
import { Modal } from './Modal';
import { toaster } from './Toast';

interface ClosingDateModalProps {
  userId: string;
  accountId: string;
  accountName?: string;
  bankName?: string;
  suggestedDay: number;
  bills: ComputedBill[];
  closingDateSettings?: ClosingDateSettings;
  originalCloseDate?: string | null;
  originalDueDate?: string | null;
}

const ORDERED_TYPES: Array<{ key: ComputedBill['typeKey']; label: string }> = [
  { key: 'beforeLast', label: 'Fatura atrasada' },
  { key: 'last', label: 'Fatura anterior' },
  { key: 'current', label: 'Fatura atual' },
  { key: 'next', label: 'Proxima fatura' },
  { key: 'following', label: 'Fatura seguinte' }
];

const labelMap = ORDERED_TYPES.reduce<Record<string, string>>((accumulator, item) => {
  accumulator[item.key] = item.label;
  return accumulator;
}, {});

const formatDateLabel = (date: Date | null | undefined): string => {
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const resolveInputDate = (
  bill: ComputedBill,
  suggestedDay: number,
  settings?: ClosingDateSettings
): string => {
  const override = settings?.monthOverrides?.[bill.referenceMonth];
  if (override?.exactDate) {
    const normalized = BillConstructor.normalizePluggyDate(override.exactDate);
    if (normalized) return normalized;
  }

  if (bill.closeDate) {
    return BillConstructor.toDateStr(bill.closeDate);
  }

  return normalizeExactDateForMonth(bill.referenceMonth, suggestedDay) || '';
};

const resolveInputDay = (
  bill: ComputedBill,
  suggestedDay: number,
  settings?: ClosingDateSettings
): string => {
  const resolvedDate = resolveInputDate(bill, suggestedDay, settings);
  return resolvedDate ? resolvedDate.slice(-2) : '';
};

const buildMonthOverrides = (
  bills: ComputedBill[],
  valuesByType: Record<string, string>
): Record<string, { closingDay?: number; exactDate?: string }> => {
  const overrides: Record<string, { closingDay?: number; exactDate?: string }> = {};

  bills.forEach((bill) => {
    const rawValue = valuesByType[bill.typeKey];
    const parsedDay = Number.parseInt(rawValue, 10);
    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      return;
    }

    const exactDate = normalizeExactDateForMonth(bill.referenceMonth, parsedDay);
    if (!exactDate) {
      return;
    }

    overrides[bill.referenceMonth] = {
      exactDate,
      closingDay: parsedDay
    };
  });

  return overrides;
};

const buildClosingDateSettings = (
  bills: ComputedBill[],
  valuesByType: Record<string, string>,
  existingSettings?: ClosingDateSettings
): ClosingDateSettings => {
  const overrides = buildMonthOverrides(bills, valuesByType);
  const days = Object.values(overrides)
    .map((override) => override.closingDay)
    .filter((day): day is number => typeof day === 'number');
  const uniqueDays = new Set(days);
  const currentBill = bills.find((bill) => bill.typeKey === 'current');
  const lastBill = bills.find((bill) => bill.typeKey === 'last');
  const currentOverride = currentBill ? overrides[currentBill.referenceMonth] : undefined;

  return {
    ...existingSettings,
    closingDay: currentOverride?.closingDay || days[0] || existingSettings?.closingDay || 10,
    applyToAll: uniqueDays.size === 1,
    lastClosingDate: lastBill
      ? overrides[lastBill.referenceMonth]?.exactDate || existingSettings?.lastClosingDate
      : existingSettings?.lastClosingDate,
    monthOverrides: {
      ...(existingSettings?.monthOverrides || {}),
      ...overrides
    },
    updatedAt: new Date().toISOString()
  };
};

const saveAccountClosingSettings = async (
  userId: string,
  accountId: string,
  settings: ClosingDateSettings
) => {
  await setDoc(getPluggyCanonicalDocRef(userId, 'accounts', accountId), {
    userId,
    closingDateSettings: settings
  }, { merge: true });
};

const buildBankInfoCopy = (
  bankName?: string,
  originalCloseDate?: string | null,
  originalDueDate?: string | null
): string => {
  const bankSuffix = bankName ? ` (${bankName})` : '';

  if (originalCloseDate && originalDueDate) {
    return `Obtivemos o fechamento <strong>${originalCloseDate}</strong> e o vencimento <strong>${originalDueDate}</strong> enviados pelo seu banco${bankSuffix}.`;
  }

  if (originalDueDate) {
    return `Obtivemos apenas o vencimento <strong>${originalDueDate}</strong>. O banco${bankSuffix} nao informou o fechamento, entao essas datas podem ser ajustadas manualmente.`;
  }

  return `Nao foi possivel obter as datas originais do banco${bankSuffix}. As datas abaixo foram projetadas e podem ser ajustadas.`;
};

export function openDetailedClosingDateModal({
  userId,
  accountId,
  accountName,
  bankName,
  suggestedDay,
  bills,
  closingDateSettings,
  originalCloseDate,
  originalDueDate
}: ClosingDateModalProps) {
  const orderedBills = ORDERED_TYPES
    .map(({ key, label }) => {
      const bill = bills.find((item) => item.typeKey === key);
      return bill ? { bill, label } : null;
    })
    .filter((entry): entry is { bill: ComputedBill; label: string } => Boolean(entry));

  Modal({
    title: `Editar fechamento${accountName ? ` - ${accountName}` : ''}`,
    confirmText: 'Salvar',
    showCancel: false,
    content: `
      <div class="closing-modal-lead">
        Defina o dia exato do fechamento para as faturas abaixo.
      </div>

      <div class="closing-modal-bank-copy" style="margin-bottom: 20px;">
        ${buildBankInfoCopy(bankName, originalCloseDate, originalDueDate)}
      </div>

      <div class="closing-modal-list closing-modal-list--app">
        ${orderedBills.map(({ bill, label }, index) => `
          <div class="closing-modal-list-item ${index !== orderedBills.length - 1 ? 'has-divider' : ''}">
            <div class="closing-modal-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
              </svg>
            </div>
            <div class="closing-modal-copy">
              <span class="closing-modal-label">${label}</span>
              <span class="closing-modal-sublabel">${formatMonthKey(bill.referenceMonth)} • fechamento atual ${formatDateLabel(bill.closeDate)}</span>
            </div>
            <div class="closing-modal-day-wrapper">
              <span class="closing-modal-day-label">Dia</span>
              <input
                id="close-day-${bill.typeKey}"
                class="closing-modal-input closing-modal-input--day"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                value="${resolveInputDay(bill, suggestedDay, closingDateSettings)}"
                placeholder="25"
              />
            </div>
          </div>
        `).join('')}
      </div>
    `,
    onConfirm: async () => {
      const valuesByType: Record<string, string> = {};

      for (const { bill } of orderedBills) {
        const input = document.getElementById(`close-day-${bill.typeKey}`) as HTMLInputElement | null;
        const value = String(input?.value || '').replace(/\D/g, '');
        const day = Number.parseInt(value, 10);

        if (!Number.isInteger(day) || day < 1 || day > 31) {
          toaster.create({
            title: 'Data invalida',
            description: `Informe um dia valido para ${labelMap[bill.typeKey] || bill.name}.`,
            type: 'error'
          });
          throw new Error('PREVENT_CLOSE');
        }

        valuesByType[bill.typeKey] = value;
      }

      try {
        const nextSettings = buildClosingDateSettings(
          orderedBills.map(({ bill }) => bill),
          valuesByType,
          closingDateSettings
        );

        await saveAccountClosingSettings(userId, accountId, nextSettings);

        const reminder = document.getElementById('closing-date-reminder-container');
        if (reminder) reminder.innerHTML = '';

        toaster.create({
          title: 'Sucesso',
          description: 'Datas de fechamento atualizadas para este cartao.',
          type: 'success'
        });

        window.dispatchEvent(new CustomEvent('app-closing-dates-saved'));
      } catch (error) {
        console.error('Erro ao salvar datas de fechamento:', error);
        toaster.create({
          title: 'Erro',
          description: 'Nao foi possivel salvar as configuracoes.',
          type: 'error'
        });
        throw new Error('PREVENT_CLOSE');
      }
    }
  });
}

export async function saveClosingDates(
  userId: string,
  accountId: string,
  day: number,
  bills: ComputedBill[],
  closingDateSettings?: ClosingDateSettings
) {
  const valuesByType: Record<string, string> = {};

  bills.forEach((bill) => {
    if (Number.isInteger(day) && day >= 1 && day <= 31) {
      valuesByType[bill.typeKey] = String(day);
    }
  });

  const nextSettings = buildClosingDateSettings(bills, valuesByType, closingDateSettings);
  await saveAccountClosingSettings(userId, accountId, nextSettings);
  window.dispatchEvent(new CustomEvent('app-closing-dates-saved'));
}

export {
  formatDateLabel
};
