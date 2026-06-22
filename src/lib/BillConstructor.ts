import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface ClosingDateMonthOverride {
    closingDay?: number;
    exactDate?: string;
}

export interface ClosingDateSettings {
    closingDay?: number;
    applyToAll?: boolean;
    lastClosingDate?: string;
    monthOverrides?: Record<string, ClosingDateMonthOverride>;
    updatedAt?: string;
}

export interface LegacyClosingDateConfig {
    atrasada: number;
    anterior: number;
    atual: number;
    proxima: number;
    seguinte: number;
}

export type BillTypeKey = 'beforeLast' | 'last' | 'current' | 'next' | 'following';

export interface InvoicePeriodDates {
    closingDay: number;
    dueDay: number;
    beforeLastClosingDate: Date;
    lastClosingDate: Date;
    currentClosingDate: Date;
    nextClosingDate: Date;
    followingClosingDate: Date;
    beforeLastInvoiceStart: Date;
    lastInvoiceStart: Date;
    currentInvoiceStart: Date;
    nextInvoiceStart: Date;
    followingInvoiceStart: Date;
    beforeLastDueDate: Date;
    lastDueDate: Date;
    currentDueDate: Date;
    nextDueDate: Date;
    followingDueDate: Date;
    beforeLastMonthKey: string;
    lastMonthKey: string;
    currentMonthKey: string;
    nextMonthKey: string;
    followingMonthKey: string;
}

export interface ComputedFinanceCharge {
    id: string;
    type: string;
    amount: number;
    currencyCode: string | null;
    additionalInfo: string | null;
}

export interface ComputedBill {
    id: string;
    accountId: string;
    name: string;
    month: number;
    year: number;
    isCurrent: boolean;
    periodEnd: Date | null;
    periodStart: Date | null;
    dueDate: Date | null;
    closeDate: Date | null;
    total: number;
    pluggyTotal: number | null;
    financeCharges: ComputedFinanceCharge[];
    financeChargesTotal: number;
    minimumPaymentAmount: number | null;
    allowsInstallments: boolean | null;
    isClosed: boolean;
    transactions: any[];
    referenceMonth: string;
    typeKey: BillTypeKey;
    status: 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE';
    _pluggyBillIds?: string[];
}

const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateParts = (year: number, month: number, day: number): boolean => {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return false;
    }

    const parsed = new Date(year, month - 1, day, 12, 0, 0);
    return parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day;
};

const clampClosingDay = (year: number, monthIndex: number, day: number): number => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(day, lastDay);
};

const normalizeMonthKey = (rawMonthKey?: string | null): string | null => {
    if (typeof rawMonthKey !== 'string') return null;
    const trimmed = rawMonthKey.trim();
    return MONTH_KEY_REGEX.test(trimmed) ? trimmed : null;
};

const normalizeExactDateForMonth = (monthKey: string, day: number): string | null => {
    const normalizedMonth = normalizeMonthKey(monthKey);
    if (!normalizedMonth) return null;

    const [year, month] = normalizedMonth.split('-').map(Number);
    const safeDay = clampClosingDay(year, month - 1, day);
    return `${normalizedMonth}-${String(safeDay).padStart(2, '0')}`;
};

const getClosingDate = (year: number, monthIndex: number, day: number): Date => {
    const safeDay = clampClosingDay(year, monthIndex, day);
    return new Date(year, monthIndex, safeDay, 23, 59, 59);
};

const getClosingDateWithOverride = (
    year: number,
    monthIndex: number,
    baseClosingDay: number,
    overrides?: Record<string, ClosingDateMonthOverride>
): Date => {
    const tentative = getClosingDate(year, monthIndex, baseClosingDay);
    const key = BillConstructor.toMonthKey(tentative);

    const override = overrides?.[key];
    if (!override) {
        return tentative;
    }

    if (typeof override.exactDate === 'string') {
        const normalizedExactDate = BillConstructor.normalizePluggyDate(override.exactDate);
        const exactDate = normalizedExactDate ? BillConstructor.parseDate(normalizedExactDate) : null;
        if (exactDate) {
            return new Date(exactDate.getFullYear(), exactDate.getMonth(), exactDate.getDate(), 23, 59, 59);
        }
    }

    if (typeof override.closingDay === 'number' && Number.isInteger(override.closingDay)) {
        return getClosingDate(year, monthIndex, override.closingDay);
    }

    return tentative;
};

const pickNormalizedBillDate = (bill: any, fields: string[]): string | null => {
    for (const field of fields) {
        const normalized = BillConstructor.normalizePluggyDate(bill?.[field]);
        if (normalized) {
            return normalized;
        }
    }
    return null;
};

const getBillReferenceDate = (bill: any): Date | null => {
    const normalizedCloseDate = pickNormalizedBillDate(bill, ['periodEnd', 'closeDate']);
    if (normalizedCloseDate) {
        return BillConstructor.parseDate(normalizedCloseDate);
    }

    const normalizedDueDate = BillConstructor.normalizePluggyDate(bill?.dueDate);
    if (normalizedDueDate) {
        const referenceDate = BillConstructor.parseDate(normalizedDueDate);
        if (referenceDate) {
            referenceDate.setDate(referenceDate.getDate() - 10);
            return referenceDate;
        }
    }

    const normalizedStartDate = pickNormalizedBillDate(bill, ['periodStart']);
    if (normalizedStartDate) {
        return BillConstructor.parseDate(normalizedStartDate);
    }

    return null;
};

const getBillReferenceMonthKey = (bill: any): string | null => {
    const referenceDate = getBillReferenceDate(bill);
    return referenceDate ? BillConstructor.toMonthKey(referenceDate) : null;
};

const safeDateTime = (value: any): number => {
    const parsed = BillConstructor.parseDate(value);
    return parsed ? parsed.getTime() : 0;
};

const normalizeAmount = (value: any): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeFinanceCharges = (rawFinanceCharges: any[] | undefined, baseId: string): ComputedFinanceCharge[] => {
    if (!Array.isArray(rawFinanceCharges) || rawFinanceCharges.length === 0) {
        return [];
    }

    const aggregatedCharges = new Map<string, ComputedFinanceCharge>();

    rawFinanceCharges.forEach((rawCharge, index) => {
        const type = typeof rawCharge?.type === 'string' && rawCharge.type.trim()
            ? rawCharge.type.trim().toUpperCase()
            : 'OTHER';
        const amount = normalizeAmount(rawCharge?.amount);
        const currencyCode = typeof rawCharge?.currencyCode === 'string' && rawCharge.currencyCode.trim()
            ? rawCharge.currencyCode.trim().toUpperCase()
            : null;
        const additionalInfo = typeof rawCharge?.additionalInfo === 'string' && rawCharge.additionalInfo.trim()
            ? rawCharge.additionalInfo.trim()
            : null;
        const aggregationKey = `${type}::${currencyCode || ''}::${additionalInfo || ''}`;
        const existing = aggregatedCharges.get(aggregationKey);

        if (existing) {
            existing.amount += amount;
            return;
        }

        aggregatedCharges.set(aggregationKey, {
            id: `${baseId}-${type}-${index}`,
            type,
            amount,
            currencyCode,
            additionalInfo
        });
    });

    return Array.from(aggregatedCharges.values());
};

export class BillConstructor {
    static async loadLegacyConfig(userId: string): Promise<{ config: LegacyClosingDateConfig | null; userConfigured: boolean } | null> {
        try {
            const docRef = doc(db, 'userConfigs', userId);
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                return null;
            }

            const data = snap.data();
            return {
                config: data.closingDates || null,
                userConfigured: data.closingDateConfigured === true
            };
        } catch (error) {
            console.error('Erro ao carregar configuracao legada de fechamento:', error);
            return null;
        }
    }

    static async isLegacyConfigured(userId: string): Promise<boolean> {
        try {
            const docRef = doc(db, 'userConfigs', userId);
            const snap = await getDoc(docRef);
            return snap.exists() && snap.data()?.closingDateConfigured === true;
        } catch {
            return false;
        }
    }

    static normalizePluggyDate(rawDate?: any): string | null {
        if (!rawDate) return null;

        if (typeof rawDate?.toDate === 'function') {
            const date = rawDate.toDate();
            return this.toDateStr(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
        }

        if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
            return this.toDateStr(new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 12, 0, 0));
        }

        if (typeof rawDate !== 'string') {
            return null;
        }

        const trimmed = rawDate.trim();
        if (!trimmed) return null;

        if (ISO_DATE_REGEX.test(trimmed)) {
            const [year, month, day] = trimmed.split('-').map(Number);
            if (!isValidDateParts(year, month, day)) {
                return null;
            }
            return this.toDateStr(new Date(year, month - 1, day, 12, 0, 0));
        }

        if (trimmed.includes('T')) {
            const datePart = trimmed.split('T')[0];
            if (ISO_DATE_REGEX.test(datePart)) {
                const [year, month, day] = datePart.split('-').map(Number);
                if (!isValidDateParts(year, month, day)) {
                    return null;
                }
                return this.toDateStr(new Date(year, month - 1, day, 12, 0, 0));
            }
        }

        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
            return this.toDateStr(new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0));
        }

        return this.toDateStr(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0));
    }

    static parseDate(rawDate?: any): Date | null {
        const normalized = this.normalizePluggyDate(rawDate);
        if (!normalized) {
            return null;
        }

        const [year, month, day] = normalized.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
    }

    static toDateStr(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static toMonthKey(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    static formatBillName(date: Date): string {
        const formatted = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    static getClosingSettings(account: any): ClosingDateSettings {
        return account?.closingDateSettings || {};
    }

    static hasClosingSettings(account: any): boolean {
        const settings = this.getClosingSettings(account);
        return Boolean(
            settings?.lastClosingDate ||
            settings?.applyToAll ||
            settings?.closingDay ||
            Object.keys(settings?.monthOverrides || {}).length > 0
        );
    }

    static hasAutomaticBillingData(account: any): boolean {
        return Boolean(
            this.normalizePluggyDate(account?.creditData?.balanceCloseDate) ||
            this.normalizePluggyDate(account?.creditData?.balanceDueDate)
        );
    }

    static getSuggestedClosingDay(account: any): number {
        const settings = this.getClosingSettings(account);

        if (typeof settings.closingDay === 'number' && settings.closingDay >= 1 && settings.closingDay <= 31) {
            return settings.closingDay;
        }

        const balanceCloseDate = this.parseDate(account?.creditData?.balanceCloseDate);
        if (balanceCloseDate) {
            return balanceCloseDate.getDate();
        }

        const balanceDueDate = this.parseDate(account?.creditData?.balanceDueDate);
        if (balanceDueDate) {
            const inferred = balanceDueDate.getDate() - 10;
            return inferred > 0 ? inferred : 30 + inferred;
        }

        const manualLastClosingDate = this.parseDate(settings.lastClosingDate);
        if (manualLastClosingDate) {
            return manualLastClosingDate.getDate();
        }

        return 10;
    }

    /**
     * Sistema inteligente de detecção de pagamentos de fatura.
     * Identifica transações que representam pagamentos (não compras)
     * e que não devem ser somadas no total da fatura.
     * 
     * Padrões detectados:
     * - Pagamentos via PIX (antecipado, recebido, etc.)
     * - Pagamentos via boleto
     * - Pagamentos via TED/DOC
     * - Pagamentos parciais ou totais
     * - Créditos e estornos de pagamento
     * - Padrões específicos de bancos brasileiros
     */
    isInvoicePayment(tx: any): boolean {
        const description = String(tx?.description || '').toLowerCase().trim();
        const category = String(tx?.category || tx?.categoryId || '').toLowerCase().trim();
        const type = String(tx?.type || '').toLowerCase().trim();
        const amount = Number(tx?.amount || 0);

        // 1. Correspondência exata de descrições curtas comuns
        const EXACT_PAYMENT_DESCRIPTIONS = [
            'pgto',
            'pagamento',
            'pagto',
            'pag',
            'payment',
            'pgto débito',
            'pgto debito',
            'pagamento débito',
            'pagamento debito',
        ];
        if (EXACT_PAYMENT_DESCRIPTIONS.includes(description)) return true;

        // 2. Padrões de descrição que indicam pagamento de fatura
        const PAYMENT_DESCRIPTION_PATTERNS = [
            // Pagamento de fatura genérico
            'pagamento de fatura',
            'pagamento fatura',
            'pagamento da fatura',
            'pag fatura',
            'pgto fatura',
            'pgto de fatura',
            'pgto da fatura',
            'pag de fatura',
            'pag da fatura',
            'pagto fatura',
            'pagto de fatura',
            'pagto da fatura',

            // Pagamento antecipado (PIX, boleto, etc.)
            'pagto antecipado',
            'pagamento antecipado',
            'pag antecipado',
            'pgto antecipado',
            'pagto antecip',
            'pgto antecip',
            'pag antecip',

            // Pagamento via PIX
            'pagto pix',
            'pagamento pix',
            'pgto pix',
            'pag pix',
            'pagamento via pix',
            'pgto via pix',
            'pagto via pix',
            'pag via pix',
            'pagto antecipado pix',
            'pagamento antecipado pix',
            'pgto antecipado pix',
            'pix pagamento',
            'pix pgto',
            'pix pagto',
            'pix pag fatura',
            'pix pagamento fatura',

            // Pagamento recebido
            'pagamento recebido',
            'pagto recebido',
            'pgto recebido',
            'pag recebido',
            'credito recebido',
            'crédito recebido',

            // Pagamento via boleto
            'pagto boleto',
            'pagamento boleto',
            'pgto boleto',
            'pag boleto',
            'pagamento via boleto',
            'pgto via boleto',

            // Pagamento via TED/DOC
            'pagto ted',
            'pagamento ted',
            'pgto ted',
            'pagto doc',
            'pagamento doc',
            'pgto doc',
            'pagamento via ted',
            'pagamento via doc',

            // Pagamento parcial / mínimo
            'pagamento parcial',
            'pagto parcial',
            'pgto parcial',
            'pag parcial',
            'pagamento minimo',
            'pagamento mínimo',
            'pagto minimo',
            'pagto mínimo',
            'pgto minimo',
            'pgto mínimo',
            'pag minimo',
            'pag mínimo',

            // Padrões de débito automático
            'debito automatico fatura',
            'débito automático fatura',
            'deb auto fatura',
            'deb automatico',
            'débito automático',
            'debito automatico',

            // Padrões específicos de bancos
            'pagto cartao',
            'pagamento cartao',
            'pagamento cartão',
            'pagto cartão',
            'pgto cartao',
            'pgto cartão',
            'pag cartao',
            'pag cartão',
            'pagamento de cartao',
            'pagamento de cartão',

            // Crédito em fatura
            'credito em fatura',
            'crédito em fatura',
            'credito fatura',
            'crédito fatura',

            // Liquidação
            'liquidacao fatura',
            'liquidação fatura',
            'liquida fatura',

            // Pagamento total
            'pagamento total',
            'pagto total',
            'pgto total',
            'pag total',
        ];

        for (const pattern of PAYMENT_DESCRIPTION_PATTERNS) {
            if (description.includes(pattern)) return true;
        }

        // 3. Regex para padrões mais complexos
        // "PAGTO ANTECIPADO PIX" com variações de espaço/separadores
        if (/\b(pagto|pgto|pagamento|pagto\.|pgto\.)\s*(antecipado|antecip\.?)?\s*(pix|boleto|ted|doc|débito|debito)?\b/.test(description) &&
            /\b(pix|boleto|ted|doc|fatura|cartao|cartão|antecipado|antecip|recebido|parcial|total|minimo|mínimo)\b/.test(description)) {
            return true;
        }

        // Padrão: descrição começa com PAGTO/PGTO/PAG seguido de qualquer coisa
        if (/^(pagto|pgto|pagamento)\s+(antecipado|recebido|parcial|total|pix|boleto|ted|doc|fatura|cartao|cartão)/i.test(description)) {
            return true;
        }

        // 4. Checagem por categoria
        const PAYMENT_CATEGORIES = [
            'credit card payment',
            'pagamento de cartao',
            'pagamento de cartão',
            'pagamento cartao',
            'pagamento cartão',
            'pagamento de fatura',
            'pagamento fatura',
            'card payment',
            'bill payment',
            'payment',
        ];
        if (PAYMENT_CATEGORIES.includes(category)) return true;

        // Categorias que contêm padrão de pagamento
        if (category.includes('credit card payment') ||
            category.includes('card payment') ||
            category.includes('bill payment') ||
            category.includes('pagamento de cartao') ||
            category.includes('pagamento de cartão') ||
            category.includes('pagamento cartao') ||
            category.includes('pagamento cartão') ||
            category.includes('pagamento de fatura') ||
            category.includes('pagamento fatura')) {
            return true;
        }

        // 5. Checagem por tipo de transação (campo type da Pluggy)
        if (type === 'payment' || type === 'credit' || type === 'pagamento') {
            // Se tipo é pagamento E a descrição contém indícios de pagamento
            if (description.includes('pagto') ||
                description.includes('pgto') ||
                description.includes('pagamento') ||
                description.includes('pag ') ||
                description.includes('payment') ||
                description.includes('fatura') ||
                description.includes('antecipado')) {
                return true;
            }
        }

        // 6. Transação com valor negativo (crédito) + descrição com padrão de pagamento
        if (amount < 0) {
            if (description.includes('pagto') ||
                description.includes('pgto') ||
                description.includes('pagamento') ||
                description.includes('pag fatura') ||
                description.includes('fatura') ||
                description.includes('payment') ||
                description.includes('antecipado')) {
                return true;
            }
        }

        return false;
    }

    private findAnchorBill(pluggyBills: any[], today: Date): any | null {
        const sorted = [...pluggyBills].sort((left, right) => safeDateTime(left.dueDate || left.closeDate || left.periodEnd) - safeDateTime(right.dueDate || right.closeDate || right.periodEnd));

        const todayTime = today.getTime();
        const futureOrCurrent = sorted.find((bill) => {
            const dueDate = BillConstructor.parseDate(bill.dueDate || bill.closeDate || bill.periodEnd);
            return dueDate ? dueDate.getTime() >= todayTime : false;
        });

        return futureOrCurrent || sorted[sorted.length - 1] || null;
    }

    calculateInvoicePeriodDates(account: any, pluggyBills: any[], today: Date = new Date()): InvoicePeriodDates {
        const settings = BillConstructor.getClosingSettings(account);

        const normalizedBalanceCloseDate = BillConstructor.normalizePluggyDate(account?.creditData?.balanceCloseDate);
        const normalizedBalanceDueDate = BillConstructor.normalizePluggyDate(account?.creditData?.balanceDueDate);
        const anchorBill = this.findAnchorBill(pluggyBills, today);

        let baseClosingDay = BillConstructor.getSuggestedClosingDay(account);
        let closingDay = baseClosingDay;
        let dueDay = 10;

        let currentClosingDate: Date | null = null;
        let currentDueDate: Date | null = null;

        // Track logical month separately from actual closing date month.
        // Overrides can shift a closing date to a different calendar month
        // (e.g. February invoice closing on March 23). Using the actual date's
        // month to step to other periods causes duplicate month keys and
        // collapsed invoices. The logical month always represents the INPUT
        // month used in getClosingDateWithOverride, ensuring correct stepping.
        let logicalYear = today.getFullYear();
        let logicalMonth = today.getMonth();

        const stepMonth = (year: number, month: number, delta: number): [number, number] => {
            const d = new Date(year, month + delta, 1);
            return [d.getFullYear(), d.getMonth()];
        };

        const logicalMonthKey = (year: number, month: number): string => {
            const d = new Date(year, month, 15);
            return BillConstructor.toMonthKey(d);
        };

        const calculateDueDate = (closingDate: Date): Date => {
            let dueMonthIndex = closingDate.getMonth();
            let dueYear = closingDate.getFullYear();

            if (dueDay <= closingDay) {
                dueMonthIndex += 1;
                if (dueMonthIndex > 11) {
                    dueMonthIndex = 0;
                    dueYear += 1;
                }
            }

            const lastDay = new Date(dueYear, dueMonthIndex + 1, 0).getDate();
            return new Date(dueYear, dueMonthIndex, Math.min(dueDay, lastDay), 12, 0, 0);
        };

        if (normalizedBalanceCloseDate && normalizedBalanceDueDate) {
            currentClosingDate = BillConstructor.parseDate(normalizedBalanceCloseDate);
            currentDueDate = BillConstructor.parseDate(normalizedBalanceDueDate);

            if (currentClosingDate) {
                baseClosingDay = currentClosingDate.getDate();
                logicalYear = currentClosingDate.getFullYear();
                logicalMonth = currentClosingDate.getMonth();
                currentClosingDate = getClosingDateWithOverride(
                    logicalYear,
                    logicalMonth,
                    baseClosingDay,
                    settings.monthOverrides
                );
                closingDay = currentClosingDate.getDate();
            }

            if (currentDueDate) {
                dueDay = currentDueDate.getDate();
            }

            // Advance stale balanceCloseDate to current billing period
            if (currentClosingDate && currentClosingDate < today) {
                let advYear = logicalYear;
                let advMonth = logicalMonth;
                while (currentClosingDate < today) {
                    advMonth += 1;
                    if (advMonth > 11) {
                        advMonth = 0;
                        advYear += 1;
                    }
                    currentClosingDate = getClosingDateWithOverride(advYear, advMonth, baseClosingDay, settings.monthOverrides);
                    if (advYear > today.getFullYear() + 2) break;
                }
                logicalYear = advYear;
                logicalMonth = advMonth;
                closingDay = currentClosingDate.getDate();
                currentDueDate = calculateDueDate(currentClosingDate);
                dueDay = currentDueDate.getDate();
            }
        } else if (anchorBill) {
            const normalizedAnchorCloseDate = pickNormalizedBillDate(anchorBill, ['periodEnd', 'closeDate']);
            const normalizedAnchorDueDate = pickNormalizedBillDate(anchorBill, ['dueDate']);

            currentClosingDate = BillConstructor.parseDate(normalizedAnchorCloseDate);
            currentDueDate = BillConstructor.parseDate(normalizedAnchorDueDate);

            // If no closeDate available, infer from dueDate minus 10 days
            if (!currentClosingDate && currentDueDate) {
                const inferred = new Date(currentDueDate.getTime());
                inferred.setDate(inferred.getDate() - 10);
                currentClosingDate = new Date(inferred.getFullYear(), inferred.getMonth(), inferred.getDate(), 23, 59, 59);
            }

            if (currentClosingDate) {
                baseClosingDay = currentClosingDate.getDate();
                logicalYear = currentClosingDate.getFullYear();
                logicalMonth = currentClosingDate.getMonth();
                currentClosingDate = getClosingDateWithOverride(
                    logicalYear,
                    logicalMonth,
                    baseClosingDay,
                    settings.monthOverrides
                );
                closingDay = currentClosingDate.getDate();
            }

            if (currentDueDate) {
                dueDay = currentDueDate.getDate();
            }

            // Advance stale anchorBill date to current billing period
            if (currentClosingDate && currentClosingDate < today) {
                let advYear = logicalYear;
                let advMonth = logicalMonth;
                while (currentClosingDate < today) {
                    advMonth += 1;
                    if (advMonth > 11) {
                        advMonth = 0;
                        advYear += 1;
                    }
                    currentClosingDate = getClosingDateWithOverride(advYear, advMonth, baseClosingDay, settings.monthOverrides);
                    if (advYear > today.getFullYear() + 2) break;
                }
                logicalYear = advYear;
                logicalMonth = advMonth;
                closingDay = currentClosingDate.getDate();
                currentDueDate = calculateDueDate(currentClosingDate);
                dueDay = currentDueDate.getDate();
            }
        } else {
            if (settings.applyToAll && typeof settings.closingDay === 'number') {
                baseClosingDay = settings.closingDay;
                closingDay = settings.closingDay;
            }

            let anchorYear = today.getFullYear();
            let anchorMonthIndex = today.getMonth();

            const thisMonthClosingDate = getClosingDateWithOverride(
                anchorYear,
                anchorMonthIndex,
                baseClosingDay,
                settings.monthOverrides
            );

            if (today > thisMonthClosingDate || today > calculateDueDate(thisMonthClosingDate)) {
                anchorMonthIndex += 1;
                if (anchorMonthIndex > 11) {
                    anchorMonthIndex = 0;
                    anchorYear += 1;
                }
            }

            logicalYear = anchorYear;
            logicalMonth = anchorMonthIndex;

            currentClosingDate = getClosingDateWithOverride(
                logicalYear,
                logicalMonth,
                baseClosingDay,
                settings.monthOverrides
            );
            closingDay = currentClosingDate.getDate();
            currentDueDate = calculateDueDate(currentClosingDate);
            dueDay = currentDueDate.getDate();
        }

        if (!currentClosingDate) {
            logicalYear = today.getFullYear();
            logicalMonth = today.getMonth();
            currentClosingDate = getClosingDateWithOverride(
                logicalYear,
                logicalMonth,
                baseClosingDay,
                settings.monthOverrides
            );
            closingDay = currentClosingDate.getDate();
        }

        if (!currentDueDate) {
            currentDueDate = calculateDueDate(currentClosingDate);
            dueDay = currentDueDate.getDate();
        }

        // Cap logicalMonth at today's calendar month. The advance loops above
        // move to the NEXT billing cycle as soon as the closing date passes
        // (e.g. closing day 10, today March 29 → advances to April). But the
        // UX expectation is that "Fatura Atual" always shows the current
        // calendar month (March while we're in March, April once April starts).
        // When capped, extend currentClosingDate to end-of-today so all
        // transactions made since the previous closing date remain visible
        // as 'current' instead of spilling into 'next'.
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        if (logicalYear > todayYear || (logicalYear === todayYear && logicalMonth > todayMonth)) {
            logicalYear = todayYear;
            logicalMonth = todayMonth;
            currentClosingDate = new Date(todayYear, todayMonth, today.getDate(), 23, 59, 59);
            closingDay = currentClosingDate.getDate();
            currentDueDate = calculateDueDate(currentClosingDate);
            dueDay = currentDueDate.getDate();
        }

        // Use logical months for stepping to ensure unique month keys
        // even when overrides shift closing dates across calendar months.
        const [lastY, lastM] = stepMonth(logicalYear, logicalMonth, -1);
        const [beforeLastY, beforeLastM] = stepMonth(lastY, lastM, -1);
        const [nextY, nextM] = stepMonth(logicalYear, logicalMonth, +1);
        const [followingY, followingM] = stepMonth(nextY, nextM, +1);
        const [beforeLastPrevY, beforeLastPrevM] = stepMonth(beforeLastY, beforeLastM, -1);

        const lastClosingDate = getClosingDateWithOverride(lastY, lastM, baseClosingDay, settings.monthOverrides);
        const beforeLastClosingDate = getClosingDateWithOverride(beforeLastY, beforeLastM, baseClosingDay, settings.monthOverrides);
        const nextClosingDate = getClosingDateWithOverride(nextY, nextM, baseClosingDay, settings.monthOverrides);
        const followingClosingDate = getClosingDateWithOverride(followingY, followingM, baseClosingDay, settings.monthOverrides);

        const lastDueDate = calculateDueDate(lastClosingDate);
        const beforeLastDueDate = calculateDueDate(beforeLastClosingDate);
        const nextDueDate = calculateDueDate(nextClosingDate);
        const followingDueDate = calculateDueDate(followingClosingDate);

        const currentInvoiceStart = new Date(lastClosingDate.getTime() + 86400000);
        const lastInvoiceStart = new Date(beforeLastClosingDate.getTime() + 86400000);
        const beforeLastPreviousClosingDate = getClosingDateWithOverride(beforeLastPrevY, beforeLastPrevM, baseClosingDay, settings.monthOverrides);
        const beforeLastInvoiceStart = new Date(beforeLastPreviousClosingDate.getTime() + 86400000);
        const nextInvoiceStart = new Date(currentClosingDate.getTime() + 86400000);
        const followingInvoiceStart = new Date(nextClosingDate.getTime() + 86400000);

        return {
            closingDay,
            dueDay,
            beforeLastClosingDate,
            lastClosingDate,
            currentClosingDate,
            nextClosingDate,
            followingClosingDate,
            beforeLastInvoiceStart,
            lastInvoiceStart,
            currentInvoiceStart,
            nextInvoiceStart,
            followingInvoiceStart,
            beforeLastDueDate,
            lastDueDate,
            currentDueDate,
            nextDueDate,
            followingDueDate,
            beforeLastMonthKey: logicalMonthKey(beforeLastY, beforeLastM),
            lastMonthKey: logicalMonthKey(lastY, lastM),
            currentMonthKey: logicalMonthKey(logicalYear, logicalMonth),
            nextMonthKey: logicalMonthKey(nextY, nextM),
            followingMonthKey: logicalMonthKey(followingY, followingM)
        };
    }

    private mergeDuplicatePluggyBills(pluggyBills: any[]): { mergedBills: any[]; billIdMap: Map<string, string> } {
        const billIdMap = new Map<string, string>();
        if (pluggyBills.length <= 1) {
            pluggyBills.forEach((bill) => {
                if (bill?.id) {
                    billIdMap.set(bill.id, bill.id);
                }
            });
            return { mergedBills: pluggyBills, billIdMap };
        }

        const billsByMonth = new Map<string, any[]>();
        pluggyBills.forEach((bill) => {
            const monthKey = getBillReferenceMonthKey(bill) || '';
            if (!billsByMonth.has(monthKey)) {
                billsByMonth.set(monthKey, []);
            }
            billsByMonth.get(monthKey)!.push(bill);
        });

        const mergedBills: any[] = [];
        const processedMonths = new Set<string>();
        const billsSortedByDueDateDesc = [...pluggyBills].sort((left, right) => safeDateTime(right.dueDate || right.closeDate || right.periodEnd) - safeDateTime(left.dueDate || left.closeDate || left.periodEnd));

        billsSortedByDueDateDesc.forEach((bill) => {
            const monthKey = getBillReferenceMonthKey(bill) || '';
            if (processedMonths.has(monthKey)) {
                return;
            }

            processedMonths.add(monthKey);
            const billsInMonth = billsByMonth.get(monthKey) || [];
            if (billsInMonth.length === 0) {
                return;
            }

            if (billsInMonth.length === 1) {
                if (bill.id) {
                    billIdMap.set(bill.id, bill.id);
                }
                mergedBills.push({
                    ...billsInMonth[0],
                    financeCharges: normalizeFinanceCharges(billsInMonth[0].financeCharges, billsInMonth[0].id || `bill-${monthKey}`),
                    _mergedIds: [billsInMonth[0].id]
                });
                return;
            }

            const masterBill = {
                ...billsInMonth[0],
                financeCharges: normalizeFinanceCharges(billsInMonth[0].financeCharges, billsInMonth[0].id || `bill-${monthKey}`),
                _mergedIds: [billsInMonth[0].id]
            };
            let totalAmount = billsInMonth[0].totalAmount || 0;

            billsInMonth.forEach((innerBill) => {
                if (innerBill.id) {
                    billIdMap.set(innerBill.id, masterBill.id);
                }
            });

            for (let index = 1; index < billsInMonth.length; index += 1) {
                const currentBill = billsInMonth[index];
                const startDate = BillConstructor.parseDate(pickNormalizedBillDate(currentBill, ['periodStart', 'periodEnd', 'closeDate', 'dueDate']));
                const endDate = BillConstructor.parseDate(pickNormalizedBillDate(currentBill, ['periodEnd', 'closeDate', 'dueDate', 'periodStart']));
                const masterStartDate = BillConstructor.parseDate(masterBill.periodStart);
                const masterEndDate = BillConstructor.parseDate(masterBill.periodEnd || masterBill.closeDate);

                if (startDate && (!masterStartDate || startDate < masterStartDate)) {
                    masterBill.periodStart = BillConstructor.toDateStr(startDate);
                }

                if (endDate && (!masterEndDate || endDate > masterEndDate)) {
                    const normalizedEndDate = BillConstructor.toDateStr(endDate);
                    masterBill.periodEnd = normalizedEndDate;
                    masterBill.closeDate = normalizedEndDate;
                }

                masterBill._mergedIds.push(currentBill.id);
                masterBill.financeCharges = normalizeFinanceCharges(
                    [...(masterBill.financeCharges || []), ...(currentBill.financeCharges || [])],
                    masterBill.id || `bill-${monthKey}`
                );
                if (masterBill.minimumPaymentAmount == null && currentBill.minimumPaymentAmount != null) {
                    masterBill.minimumPaymentAmount = currentBill.minimumPaymentAmount;
                } else if (masterBill.minimumPaymentAmount != null && currentBill.minimumPaymentAmount != null) {
                    masterBill.minimumPaymentAmount = Math.max(masterBill.minimumPaymentAmount, currentBill.minimumPaymentAmount);
                }
                if (masterBill.allowsInstallments == null && typeof currentBill.allowsInstallments === 'boolean') {
                    masterBill.allowsInstallments = currentBill.allowsInstallments;
                }
                totalAmount += currentBill.totalAmount || 0;
            }

            masterBill.totalAmount = totalAmount;
            mergedBills.push(masterBill);
        });

        return { mergedBills, billIdMap };
    }

    private applyDateOverridesToBills(bills: any[], account: any): void {
        const settings = BillConstructor.getClosingSettings(account);
        if (!settings || bills.length === 0) {
            return;
        }

        const { monthOverrides, closingDay, applyToAll } = settings;
        const chronologicalBills = [...bills].sort((left, right) => safeDateTime(left.dueDate || left.closeDate || left.periodEnd) - safeDateTime(right.dueDate || right.closeDate || right.periodEnd));

        chronologicalBills.forEach((bill, index) => {
            const closeDateCandidate = pickNormalizedBillDate(bill, ['periodEnd', 'closeDate']);
            const dueDate = BillConstructor.normalizePluggyDate(bill.dueDate);

            let referenceDate: Date | null = null;
            if (closeDateCandidate) {
                referenceDate = BillConstructor.parseDate(closeDateCandidate);
            } else if (dueDate) {
                referenceDate = BillConstructor.parseDate(dueDate);
                if (referenceDate) {
                    referenceDate.setDate(referenceDate.getDate() - 10);
                }
            }

            if (!referenceDate) {
                return;
            }

            const referenceMonth = BillConstructor.toMonthKey(referenceDate);
            let nextCloseDate: Date | null = null;
            let nextClosingDay: number | undefined;

            const monthOverride = monthOverrides?.[referenceMonth];
            if (monthOverride) {
                if (typeof monthOverride.exactDate === 'string') {
                    nextCloseDate = BillConstructor.parseDate(monthOverride.exactDate);
                } else if (typeof monthOverride.closingDay === 'number') {
                    nextClosingDay = monthOverride.closingDay;
                }
            } else if (applyToAll && typeof closingDay === 'number') {
                nextClosingDay = closingDay;
            }

            // Safe month subtraction that avoids overflow (e.g. March 29 → Feb 29
            // in a non-leap year would overflow to March 1 with setMonth).
            const prevMonth = referenceDate.getMonth() - 1;
            const prevYear = prevMonth < 0 ? referenceDate.getFullYear() - 1 : referenceDate.getFullYear();
            const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
            const prevLastDay = new Date(prevYear, prevMonthIndex + 1, 0).getDate();
            const prevDay = Math.min(referenceDate.getDate(), prevLastDay);
            const previousReferenceDate = new Date(prevYear, prevMonthIndex, prevDay, 12, 0, 0);
            const previousMonthKey = BillConstructor.toMonthKey(previousReferenceDate);
            const previousOverride = monthOverrides?.[previousMonthKey];

            let previousCloseDate: Date | null = null;
            if (previousOverride?.exactDate) {
                previousCloseDate = BillConstructor.parseDate(previousOverride.exactDate);
            } else if (typeof previousOverride?.closingDay === 'number') {
                previousCloseDate = new Date(
                    previousReferenceDate.getFullYear(),
                    previousReferenceDate.getMonth(),
                    clampClosingDay(previousReferenceDate.getFullYear(), previousReferenceDate.getMonth(), previousOverride.closingDay),
                    12,
                    0,
                    0
                );
            } else if (applyToAll && typeof closingDay === 'number') {
                previousCloseDate = new Date(
                    previousReferenceDate.getFullYear(),
                    previousReferenceDate.getMonth(),
                    clampClosingDay(previousReferenceDate.getFullYear(), previousReferenceDate.getMonth(), closingDay),
                    12,
                    0,
                    0
                );
            }

            if (previousCloseDate) {
                const startDate = new Date(previousCloseDate);
                startDate.setDate(startDate.getDate() + 1);
                bill.periodStart = BillConstructor.toDateStr(startDate);
            }

            if (!nextCloseDate && typeof nextClosingDay === 'number') {
                nextCloseDate = new Date(
                    referenceDate.getFullYear(),
                    referenceDate.getMonth(),
                    clampClosingDay(referenceDate.getFullYear(), referenceDate.getMonth(), nextClosingDay),
                    12,
                    0,
                    0
                );
            }

            if (!nextCloseDate) {
                return;
            }

            const normalizedCloseDate = BillConstructor.toDateStr(nextCloseDate);
            if (closeDateCandidate === normalizedCloseDate) {
                return;
            }

            bill.closeDate = normalizedCloseDate;
            bill.periodEnd = normalizedCloseDate;

            const nextBill = chronologicalBills[index + 1];
            if (nextBill) {
                const nextStartDate = new Date(nextCloseDate);
                nextStartDate.setDate(nextStartDate.getDate() + 1);
                const nextBillEndDate = BillConstructor.parseDate(nextBill.periodEnd || nextBill.closeDate);

                // Only update next bill's periodStart if it doesn't create an
                // invalid period (start > end). When an override extends a bill's
                // close date past the next bill's close date, the next bill keeps
                // its original period to avoid losing transaction assignments.
                if (!nextBillEndDate || nextStartDate <= nextBillEndDate) {
                    nextBill.periodStart = BillConstructor.toDateStr(nextStartDate);
                }
            }
        });
    }

    private ensureBillPeriods(bills: any[]): void {
        const chronologicalBills = [...bills].sort((left, right) => safeDateTime(left.dueDate || left.closeDate || left.periodEnd) - safeDateTime(right.dueDate || right.closeDate || right.periodEnd));

        chronologicalBills.forEach((bill, index) => {
            if (!bill.periodEnd && bill.closeDate) {
                bill.periodEnd = BillConstructor.normalizePluggyDate(bill.closeDate);
            }

            if (!bill.periodEnd && bill.dueDate) {
                const dueDate = BillConstructor.parseDate(bill.dueDate);
                if (dueDate) {
                    dueDate.setDate(dueDate.getDate() - 10);
                    bill.periodEnd = BillConstructor.toDateStr(dueDate);
                    bill.closeDate = bill.periodEnd;
                }
            }

            if (!bill.periodStart) {
                if (index > 0 && chronologicalBills[index - 1].periodEnd) {
                    const startDate = BillConstructor.parseDate(chronologicalBills[index - 1].periodEnd);
                    if (startDate) {
                        startDate.setDate(startDate.getDate() + 1);
                        bill.periodStart = BillConstructor.toDateStr(startDate);
                    }
                } else if (bill.periodEnd) {
                    const endDate = BillConstructor.parseDate(bill.periodEnd);
                    if (endDate) {
                        // Safe month subtraction to avoid overflow
                        const pm = endDate.getMonth() - 1;
                        const py = pm < 0 ? endDate.getFullYear() - 1 : endDate.getFullYear();
                        const pmi = pm < 0 ? 11 : pm;
                        const pld = new Date(py, pmi + 1, 0).getDate();
                        const pd = Math.min(endDate.getDate(), pld);
                        const startDate = new Date(py, pmi, pd, 12, 0, 0);
                        startDate.setDate(startDate.getDate() + 1);
                        bill.periodStart = BillConstructor.toDateStr(startDate);
                    }
                }
            }
        });
    }

    private getEffectiveInvoiceMonthKey(tx: any): string | null {
        const manualMonth = normalizeMonthKey(tx?.manualInvoiceMonth);
        if (manualMonth) {
            return manualMonth;
        }

        const storedMonth = normalizeMonthKey(tx?.invoiceMonthKey);
        if (storedMonth) {
            const isGeneratedManualTransaction =
                tx?.isManual === true ||
                tx?.provider === 'manual' ||
                Boolean(tx?.manualPurchaseId);

            if (isGeneratedManualTransaction && tx?.invoiceMonthKeyManual !== true) {
                return null;
            }

            return storedMonth;
        }

        return null;
    }

    private hasManualInvoiceOverride(tx: any): boolean {
        if (tx?.invoiceMonthKeyManual === true) {
            return true;
        }

        return normalizeMonthKey(tx?.manualInvoiceMonth) !== null;
    }

    /**
     * Calculates the correct invoice month key for a transaction date,
     * taking into account the closing day. A transaction on 27/02 with
     * closing day 23 should go to March's invoice (2026-03), not February's.
     */
    private getInvoiceMonthKeyByClosingDay(transactionDate: Date, closingDay: number): string {
        const day = transactionDate.getDate();
        let year = transactionDate.getFullYear();
        let month = transactionDate.getMonth();

        // If the transaction date is AFTER the closing day, it belongs
        // to the NEXT month's invoice.
        if (day > closingDay) {
            month += 1;
            if (month > 11) {
                month = 0;
                year += 1;
            }
        }

        return `${year}-${String(month + 1).padStart(2, '0')}`;
    }

    private assignOrphanTransaction(tx: any, invoices: ComputedBill[], closingDay?: number): ComputedBill | undefined {
        const transactionDate = BillConstructor.parseDate(tx?.date);
        if (!transactionDate) {
            return undefined;
        }

        const transactionTime = transactionDate.getTime();

        // Step 1: Try to match by period range (most reliable)
        for (const invoice of invoices) {
            if (!invoice.periodStart || !invoice.periodEnd) {
                continue;
            }

            const periodStart = new Date(invoice.periodStart);
            const periodEnd = new Date(invoice.periodEnd);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd.setHours(23, 59, 59, 999);

            if (transactionTime >= periodStart.getTime() && transactionTime <= periodEnd.getTime()) {
                return invoice;
            }
        }

        // Step 2: If we have a closing day, use it to determine the correct
        // invoice month. E.g. transaction on 27/02 with closing day 23 → March.
        if (typeof closingDay === 'number' && closingDay >= 1 && closingDay <= 31) {
            const correctMonthKey = this.getInvoiceMonthKeyByClosingDay(transactionDate, closingDay);
            const matchByClosingDay = invoices.find((invoice) => invoice.referenceMonth === correctMonthKey);
            if (matchByClosingDay) {
                return matchByClosingDay;
            }
        }

        // Step 3: Final fallback — calendar month key
        const monthKey = BillConstructor.toMonthKey(transactionDate);
        return invoices.find((invoice) => invoice.referenceMonth === monthKey);
    }

    private recalculateTotals(invoices: ComputedBill[]): void {
        invoices.forEach((invoice) => {
            let computedTotal = 0;
            let hasInvoiceItems = false;
            invoice.financeCharges = normalizeFinanceCharges(invoice.financeCharges, invoice.id);
            invoice.financeChargesTotal = invoice.financeCharges.reduce((sum, charge) => sum + normalizeAmount(charge.amount), 0);

            invoice.transactions = invoice.transactions
                .filter((transaction) => !this.isInvoicePayment(transaction))
                .sort((left, right) => {
                    const leftDate = BillConstructor.normalizePluggyDate(left?.date) || '';
                    const rightDate = BillConstructor.normalizePluggyDate(right?.date) || '';
                    return rightDate.localeCompare(leftDate);
                });

            invoice.transactions.forEach((transaction) => {
                hasInvoiceItems = true;
                computedTotal += Number(transaction?.amount || 0);
            });

            const computedInvoiceTotal = computedTotal + invoice.financeChargesTotal;

            if (invoice.status === 'OPEN') {
                invoice.total = hasInvoiceItems || invoice.financeChargesTotal > 0
                    ? computedInvoiceTotal
                    : (invoice.pluggyTotal ?? computedInvoiceTotal);
                return;
            }

            if (invoice.pluggyTotal != null) {
                // Bug fix: apply manual refunds to pluggyTotal for closed invoices
                const manualRefundAdjustment = invoice.transactions
                    .filter((tx) => tx.isRefund === true)
                    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                invoice.total = invoice.pluggyTotal + manualRefundAdjustment;
                return;
            }

            invoice.total = computedInvoiceTotal;
        });
    }

    private toComputedBill(rawBill: any, accountId: string): ComputedBill {
        const normalizedCloseDate = pickNormalizedBillDate(rawBill, ['closeDate', 'periodEnd', 'dueDate']);
        const normalizedDueDate = pickNormalizedBillDate(rawBill, ['dueDate', 'closeDate', 'periodEnd']);
        const normalizedStartDate = pickNormalizedBillDate(rawBill, ['periodStart']);

        const closeDate = BillConstructor.parseDate(normalizedCloseDate);
        const dueDate = BillConstructor.parseDate(normalizedDueDate);
        const periodStart = BillConstructor.parseDate(normalizedStartDate);
        const referenceDate = closeDate || dueDate || periodStart || new Date();

        // Use logical month key if available (set by buildInvoicesPluggyFirst)
        // to avoid month mismatch when overrides shift close dates across months.
        const referenceMonth = rawBill._logicalMonthKey || BillConstructor.toMonthKey(referenceDate);
        const logicalDate = rawBill._logicalMonthKey
            ? BillConstructor.parseDate(rawBill._logicalMonthKey + '-15') || referenceDate
            : referenceDate;
        const financeCharges = normalizeFinanceCharges(rawBill.financeCharges, rawBill.id || `synthetic-${accountId}-${referenceMonth}`);

        return {
            id: rawBill.id || `synthetic-${accountId}-${referenceMonth}`,
            accountId,
            name: BillConstructor.formatBillName(logicalDate),
            month: logicalDate.getMonth(),
            year: logicalDate.getFullYear(),
            isCurrent: false,
            periodEnd: closeDate,
            periodStart,
            dueDate,
            closeDate,
            total: rawBill.totalAmount || 0,
            pluggyTotal: rawBill.totalAmount ?? null,
            financeCharges,
            financeChargesTotal: financeCharges.reduce((sum, charge) => sum + normalizeAmount(charge.amount), 0),
            minimumPaymentAmount: rawBill.minimumPaymentAmount ?? null,
            allowsInstallments: typeof rawBill.allowsInstallments === 'boolean' ? rawBill.allowsInstallments : null,
            isClosed: false,
            transactions: [],
            referenceMonth,
            typeKey: 'current',
            status: 'OPEN',
            _pluggyBillIds: rawBill._mergedIds || (rawBill.id ? [rawBill.id] : [])
        };
    }

    buildInvoicesPluggyFirst(account: any, pluggyBills: any[], transactions: any[]): ComputedBill[] {
        const accountId = String(account?.id || '');
        const uniqueTransactions = Array.from(new Map((transactions || []).map((transaction: any) => [transaction.id, transaction])).values());
        const periods = this.calculateInvoicePeriodDates(account, pluggyBills || []);

        const allBills = [...(pluggyBills || []).map((bill) => ({ ...bill }))];
        const requiredBills = [
            { key: periods.beforeLastMonthKey, closeDate: periods.beforeLastClosingDate, startDate: periods.beforeLastInvoiceStart, dueDate: periods.beforeLastDueDate },
            { key: periods.lastMonthKey, closeDate: periods.lastClosingDate, startDate: periods.lastInvoiceStart, dueDate: periods.lastDueDate },
            { key: periods.currentMonthKey, closeDate: periods.currentClosingDate, startDate: periods.currentInvoiceStart, dueDate: periods.currentDueDate },
            { key: periods.nextMonthKey, closeDate: periods.nextClosingDate, startDate: periods.nextInvoiceStart, dueDate: periods.nextDueDate },
            { key: periods.followingMonthKey, closeDate: periods.followingClosingDate, startDate: periods.followingInvoiceStart, dueDate: periods.followingDueDate }
        ];

        requiredBills.forEach((requiredBill) => {
            const alreadyPresent = allBills.find((bill) => {
                return getBillReferenceMonthKey(bill) === requiredBill.key;
            });

            if (!alreadyPresent) {
                const isCurrent = requiredBill.key === periods.currentMonthKey;
                const accountBalance = normalizeAmount(account?.balance ?? account?.creditData?.balance);
                allBills.push({
                    id: `synth_${accountId}_${requiredBill.key}`,
                    periodStart: BillConstructor.toDateStr(requiredBill.startDate),
                    periodEnd: BillConstructor.toDateStr(requiredBill.closeDate),
                    closeDate: BillConstructor.toDateStr(requiredBill.closeDate),
                    dueDate: BillConstructor.toDateStr(requiredBill.dueDate),
                    totalAmount: null,
                    financeCharges: [],
                    isSynthesized: true,
                    _logicalMonthKey: requiredBill.key
                });
            } else {
                // Tag existing Pluggy bill with logical month so overrides
                // that shift close dates across months don't break period matching.
                alreadyPresent._logicalMonthKey = requiredBill.key;
            }
        });

        allBills.sort((left, right) => safeDateTime(right.dueDate || right.closeDate || right.periodEnd) - safeDateTime(left.dueDate || left.closeDate || left.periodEnd));

        const { mergedBills, billIdMap } = this.mergeDuplicatePluggyBills(allBills);
        this.ensureBillPeriods(mergedBills);
        this.applyDateOverridesToBills(mergedBills, account);

        // Validate and fix inverted periods (periodStart >= periodEnd).
        // This can happen when date arithmetic overflows (e.g. March 29 - 1 month
        // = Feb 29, which overflows to March 1 in non-leap years).
        // Use the pre-calculated period dates as ground truth.
        const periodLookup = new Map<string, { start: Date; end: Date }>();
        requiredBills.forEach((rb) => {
            periodLookup.set(rb.key, { start: rb.startDate, end: rb.closeDate });
        });

        mergedBills.forEach((bill) => {
            const monthKey = bill._logicalMonthKey || getBillReferenceMonthKey(bill);
            if (!monthKey) return;

            const periodStart = BillConstructor.parseDate(bill.periodStart);
            const periodEnd = BillConstructor.parseDate(bill.periodEnd);

            if (periodStart && periodEnd && periodStart.getTime() >= periodEnd.getTime()) {
                const correctPeriod = periodLookup.get(monthKey);
                if (correctPeriod) {
                    bill.periodStart = BillConstructor.toDateStr(correctPeriod.start);
                    bill.periodEnd = BillConstructor.toDateStr(correctPeriod.end);
                    bill.closeDate = bill.periodEnd;
                    console.warn(`[BillConstructor] Fixed inverted period for ${monthKey}: ${BillConstructor.toDateStr(periodStart)} → ${BillConstructor.toDateStr(periodEnd)} corrected to ${bill.periodStart} → ${bill.periodEnd}`);
                }
            }
        });

        const invoices = mergedBills
            .map((bill) => this.toComputedBill(bill, accountId))
            .sort((left, right) => {
                // Sort by referenceMonth descending (most recent first).
                // Using dueDate is unreliable — Pluggy can return due dates that
                // don't reflect the actual billing cycle order (e.g. a February
                // invoice with a late April dueDate ends up above March, causing
                // March to be skipped as 'last' and February to appear instead).
                if (left.referenceMonth && right.referenceMonth) {
                    return right.referenceMonth.localeCompare(left.referenceMonth);
                }
                const rightTime = right.dueDate?.getTime() || right.closeDate?.getTime() || 0;
                const leftTime = left.dueDate?.getTime() || left.closeDate?.getTime() || 0;
                return rightTime - leftTime;
            });

        if (invoices.length === 0) {
            return [];
        }

        let currentIndex = invoices.findIndex((invoice) => invoice.referenceMonth === periods.currentMonthKey);
        if (currentIndex === -1) {
            currentIndex = invoices.findIndex((invoice) => invoice.referenceMonth === periods.lastMonthKey);
            currentIndex = currentIndex >= 0 ? Math.max(0, currentIndex - 1) : 0;
        }

        const typeForIndex = (index: number): BillTypeKey => {
            if (index === currentIndex) return 'current';
            if (index === currentIndex + 1) return 'last';
            if (index >= currentIndex + 2) return 'beforeLast';
            if (index === currentIndex - 1) return 'next';
            return 'following';
        };

        const today = new Date();
        invoices.forEach((invoice, index) => {
            invoice.typeKey = typeForIndex(index);
            invoice.isCurrent = invoice.typeKey === 'current';
            invoice.isClosed = index > currentIndex;

            if (invoice.typeKey === 'current' || invoice.typeKey === 'next' || invoice.typeKey === 'following') {
                invoice.status = 'OPEN';
            } else if (invoice.typeKey === 'last') {
                const dueTime = invoice.dueDate?.getTime() || 0;
                invoice.status = dueTime > 0 && dueTime < today.getTime() ? 'OVERDUE' : 'CLOSED';
            } else {
                invoice.status = 'PAID';
            }
        });

        let assignedCount = 0;
        let droppedCount = 0;
        let paymentCount = 0;
        let billIdOverrideCount = 0;

        /**
         * Validates whether a transaction date falls within an invoice's period.
         * Used to detect when Pluggy's billId assignment contradicts our calculated periods.
         */
        const isTransactionInPeriod = (tx: any, invoice: ComputedBill): boolean => {
            const txDate = BillConstructor.parseDate(tx?.date);
            if (!txDate || !invoice.periodStart || !invoice.periodEnd) {
                return true; // Can't validate — trust the assignment
            }
            const txTime = txDate.getTime();
            const start = new Date(invoice.periodStart);
            const end = new Date(invoice.periodEnd);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return txTime >= start.getTime() && txTime <= end.getTime();
        };

        uniqueTransactions.forEach((transaction) => {
            if (this.isInvoicePayment(transaction)) {
                paymentCount++;
                return;
            }

            const effectiveMonthKey = this.getEffectiveInvoiceMonthKey(transaction);
            const rawBillId = transaction?.creditCardMetadata?.billId;
            const mergedBillId = rawBillId && billIdMap.has(rawBillId) ? billIdMap.get(rawBillId)! : rawBillId;

            let assignedInvoice: ComputedBill | undefined;

            if (effectiveMonthKey) {
                assignedInvoice = invoices.find((invoice) => invoice.referenceMonth === effectiveMonthKey);
            }

            if (!assignedInvoice && mergedBillId) {
                const billIdInvoice = invoices.find((invoice) => invoice._pluggyBillIds?.includes(mergedBillId));
                if (billIdInvoice) {
                    // Validate: does the transaction date actually fall within this invoice's period?
                    if (isTransactionInPeriod(transaction, billIdInvoice)) {
                        assignedInvoice = billIdInvoice;
                    } else {
                        // Pluggy's billId contradicts our periods — use period-based assignment instead
                        billIdOverrideCount++;
                        assignedInvoice = this.assignOrphanTransaction(transaction, invoices, periods.closingDay);
                    }
                }
                if (!assignedInvoice) {
                    assignedInvoice = this.assignOrphanTransaction(transaction, invoices, periods.closingDay);
                }
            }

            if (!assignedInvoice) {
                assignedInvoice = this.assignOrphanTransaction(transaction, invoices, periods.closingDay);
            }

            if (assignedInvoice) {
                if (this.hasManualInvoiceOverride(transaction)) {
                    transaction.invoiceMonthKey = assignedInvoice.referenceMonth;
                }
                assignedInvoice.transactions.push(transaction);
                assignedCount++;
                return;
            }
            droppedCount++;
        });

        if (typeof console !== 'undefined') {
            console.log(`[BillConstructor] Account ${accountId}: ${uniqueTransactions.length} txs, ${assignedCount} assigned, ${droppedCount} dropped, ${paymentCount} payments, ${billIdOverrideCount} billId overrides`);
        }

        // Post-assignment validation: move transactions that are outside
        // their invoice's period to the correct invoice. This catches any
        // misassignment regardless of source (billId, effectiveMonthKey, etc.).
        let reassignedCount = 0;
        const closingDayForReassign = periods.closingDay;

        invoices.forEach((invoice) => {
            if (!invoice.periodStart || !invoice.periodEnd) return;

            const pStart = new Date(invoice.periodStart);
            const pEnd = new Date(invoice.periodEnd);
            pStart.setHours(0, 0, 0, 0);
            pEnd.setHours(23, 59, 59, 999);

            const toReassign: any[] = [];
            const toKeep: any[] = [];

            invoice.transactions.forEach((tx) => {
                // Skip manually assigned transactions
                if (this.hasManualInvoiceOverride(tx)) {
                    toKeep.push(tx);
                    return;
                }

                const txDate = BillConstructor.parseDate(tx?.date);
                if (!txDate) {
                    toKeep.push(tx);
                    return;
                }

                const txTime = txDate.getTime();
                if (txTime >= pStart.getTime() && txTime <= pEnd.getTime()) {
                    toKeep.push(tx);
                } else {
                    toReassign.push(tx);
                }
            });

            if (toReassign.length > 0) {
                invoice.transactions = toKeep;

                toReassign.forEach((tx) => {
                    const correctInvoice = this.assignOrphanTransaction(tx, invoices, closingDayForReassign);
                    if (correctInvoice && correctInvoice !== invoice) {
                        correctInvoice.transactions.push(tx);
                        reassignedCount++;
                    } else {
                        // No better match found — keep in original
                        invoice.transactions.push(tx);
                    }
                });
            }
        });

        if (typeof console !== 'undefined') {
            if (reassignedCount > 0) {
                console.warn(`[BillConstructor] Reassigned ${reassignedCount} transactions to correct invoices`);
            }
            invoices.forEach((inv) => {
                console.log(`  [${inv.typeKey}] ${inv.referenceMonth} "${inv.name}": ${inv.transactions.length} txs | period: ${inv.periodStart ? BillConstructor.toDateStr(inv.periodStart) : 'null'} → ${inv.periodEnd ? BillConstructor.toDateStr(inv.periodEnd) : 'null'} | pluggyTotal: ${inv.pluggyTotal}`);
            });
        }

        this.recalculateTotals(invoices);
        return invoices;
    }

    getBillByDate(account: any, transactionDate: any): { name: string; month: number; year: number; isCurrent: boolean } {
        const parsedTransactionDate = BillConstructor.parseDate(transactionDate) || new Date();
        const periods = this.calculateInvoicePeriodDates(account, []);

        let month = parsedTransactionDate.getMonth();
        let year = parsedTransactionDate.getFullYear();
        const day = parsedTransactionDate.getDate();

        if (day > periods.closingDay) {
            month += 1;
            if (month > 11) {
                month = 0;
                year += 1;
            }
        }

        const date = new Date(year, month, 1, 12, 0, 0);
        return {
            name: BillConstructor.formatBillName(date),
            month,
            year,
            isCurrent: BillConstructor.toMonthKey(date) === periods.currentMonthKey
        };
    }

    getCurrentBill() {
        const now = new Date();
        return {
            name: BillConstructor.formatBillName(new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0))
        };
    }

    getPreviousBill() {
        const now = new Date();
        return {
            name: BillConstructor.formatBillName(new Date(now.getFullYear(), now.getMonth() - 1, 1, 12, 0, 0))
        };
    }
}

export {
    normalizeExactDateForMonth
};
