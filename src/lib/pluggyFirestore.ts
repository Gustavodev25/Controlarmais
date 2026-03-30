import { db } from './firebase';
import { setCacheRecords, getCacheRecords, isCacheFresh, formatCacheAge, type CacheEntry } from './indexedDBCache';
import {
  collection,
  doc,
  getDocs,
  limit as limitConstraint,
  orderBy as orderByConstraint,
  query,
  where,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type OrderByDirection,
  type QueryConstraint,
  type WhereFilterOp
} from 'firebase/firestore';

export type PluggyCollectionName =
  | 'accounts'
  | 'transactions'
  | 'creditCardTransactions'
  | 'creditCardBills';

export type PluggySource = 'canonical' | 'legacy';

export interface PluggyQueryFilter {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

export interface PluggyQueryOrderBy {
  field: string;
  direction?: OrderByDirection;
}

export interface LoadPluggyOptions {
  filters?: PluggyQueryFilter[];
  orderBy?: PluggyQueryOrderBy[];
  limit?: number;
  dedupe?: boolean;
}

const DOC_REF_KEY = '__pluggyDocRef';
const CANONICAL_REF_KEY = '__pluggyCanonicalRef';
const SOURCE_KEY = '__pluggySource';

export type PluggyRecord<T extends Record<string, any> = Record<string, any>> = T & {
  id: string;
  [DOC_REF_KEY]?: DocumentReference<DocumentData>;
  [CANONICAL_REF_KEY]?: DocumentReference<DocumentData>;
  [SOURCE_KEY]?: PluggySource;
};

const normalizeAccountType = (rawType?: unknown): string => {
  const type = String(rawType || '').trim().toUpperCase();
  if (!type) return '';

  if (type === 'CREDIT_CARD' || type === 'CREDIT') return 'CREDIT';
  if (type === 'CHECKING_ACCOUNT' || type === 'CHECKING') return 'CHECKING';
  if (type === 'SAVINGS_ACCOUNT' || type === 'SAVINGS') return 'SAVINGS';
  return type;
};

/** Resolve the best account type by checking both type and subtype fields */
const resolveAccountType = (record: Record<string, any>): string => {
  const rawType = String(record.type || '').trim().toUpperCase();
  const rawSubtype = String(record.subtype || '').trim().toUpperCase();

  // Try type first
  const fromType = normalizeAccountType(rawType);
  // If type resolved to a known category, use it
  if (['CREDIT', 'CHECKING', 'SAVINGS'].includes(fromType)) return fromType;

  // Otherwise try subtype
  const fromSubtype = normalizeAccountType(rawSubtype);
  if (['CREDIT', 'CHECKING', 'SAVINGS'].includes(fromSubtype)) return fromSubtype;

  // Also check name as last resort for savings
  const name = String(record.name || '').toLowerCase();
  if (name.includes('poupan') || name.includes('savings')) return 'SAVINGS';

  // Return whatever type was (even if unrecognized)
  return fromType || rawType || '';
};

const normalizeTransactionType = (rawType?: unknown): string => {
  const type = String(rawType || '').trim().toUpperCase();
  if (!type) return '';

  if (type === 'INCOME' || type === 'CREDIT') return 'CREDIT';
  if (type === 'EXPENSE' || type === 'DEBIT') return 'DEBIT';
  return type;
};

const normalizeStatus = (rawStatus?: unknown): string => {
  const status = String(rawStatus || '').trim().toUpperCase();
  if (!status) return '';
  if (status === 'COMPLETED') return 'CONFIRMED';
  return status;
};

const mergeInstitutionData = (record: Record<string, any>) => {
  const connector = record.connector && typeof record.connector === 'object' ? record.connector : {};
  const institution = record.institution && typeof record.institution === 'object' ? record.institution : {};
  const merged = { ...connector, ...institution };
  return Object.keys(merged).length > 0 ? merged : null;
};

const normalizeAccountRecord = <T extends Record<string, any>>(record: T): T => {
  const institution = mergeInstitutionData(record);
  const creditData =
    record.creditData ||
    (record.creditLimit != null ||
    record.availableCreditLimit != null ||
    record.balanceCloseDate != null ||
    record.balanceDueDate != null
      ? {
          creditLimit: record.creditLimit ?? null,
          availableCreditLimit: record.availableCreditLimit ?? null,
          balanceCloseDate: record.balanceCloseDate ?? null,
          balanceDueDate: record.balanceDueDate ?? null
        }
      : null);

  const lastSync =
    record.lastSync ||
    record.lastSyncedAt ||
    record.syncedAt ||
    record.updatedAt ||
    record.createdAt ||
    null;

  return {
    ...record,
    type: resolveAccountType(record),
    originalType: record.type || null,
    originalSubtype: record.subtype || null,
    institution,
    itemId: record.itemId || record.pluggyItemId || null,
    pluggyItemId: record.pluggyItemId || record.itemId || null,
    lastSync,
    lastSyncStartedAt: record.lastSyncStartedAt || lastSync,
    transactionsSyncCursorAt: record.transactionsSyncCursorAt || lastSync,
    creditData,
    balanceCloseDate: record.balanceCloseDate || creditData?.balanceCloseDate || null,
    balanceDueDate: record.balanceDueDate || creditData?.balanceDueDate || null
  };
};

const normalizeTransactionRecord = <T extends Record<string, any>>(record: T): T => ({
  ...record,
  type: normalizeTransactionType(record.type || record.pluggyRaw?.type),
  status: normalizeStatus(record.status),
  accountId: record.accountId || record.cardId || record.pluggyAccountId || null
});

const normalizePluggyRecord = <T extends Record<string, any>>(
  collectionName: PluggyCollectionName,
  record: T
): T => {
  if (collectionName === 'accounts') {
    return normalizeAccountRecord(record);
  }

  if (collectionName === 'transactions' || collectionName === 'creditCardTransactions') {
    return normalizeTransactionRecord(record);
  }

  return record;
};

const sanitizeFilters = (filters: PluggyQueryFilter[] = []) =>
  filters.filter((filter) => filter.field !== 'userId');

const getComparableValue = (value: unknown): number | string => {
  if (value == null) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof (value as any)?.toDate === 'function') {
    const converted = (value as any).toDate();
    return converted instanceof Date ? converted.getTime() : '';
  }
  return String(value);
};

const getFieldValue = (record: Record<string, any>, fieldPath: string): unknown =>
  fieldPath.split('.').reduce<unknown>((currentValue, segment) => {
    if (currentValue == null || typeof currentValue !== 'object') return undefined;
    return (currentValue as Record<string, unknown>)[segment];
  }, record);

const sortRecords = <T extends Record<string, any>>(
  records: PluggyRecord<T>[],
  orders: PluggyQueryOrderBy[] = []
): PluggyRecord<T>[] => {
  if (orders.length === 0) return records;

  return [...records].sort((left, right) => {
    for (const order of orders) {
      const direction = order.direction === 'desc' ? -1 : 1;
      const leftValue = getComparableValue(getFieldValue(left, order.field));
      const rightValue = getComparableValue(getFieldValue(right, order.field));

      if (leftValue < rightValue) return -1 * direction;
      if (leftValue > rightValue) return 1 * direction;
    }

    return 0;
  });
};

const buildConstraints = (
  userId: string,
  source: PluggySource,
  options: LoadPluggyOptions = {}
): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];
  const filters = sanitizeFilters(options.filters);

  if (source === 'legacy') {
    constraints.push(where('userId', '==', userId));
  }

  filters.forEach((filter) => {
    constraints.push(where(filter.field, filter.op, filter.value));
  });

  (options.orderBy || []).forEach((order) => {
    constraints.push(orderByConstraint(order.field, order.direction));
  });

  if (typeof options.limit === 'number') {
    constraints.push(limitConstraint(options.limit));
  }

  return constraints;
};

const withMetadata = <T extends Record<string, any>>(
  record: T,
  meta: {
    docRef: DocumentReference<DocumentData>;
    canonicalRef: DocumentReference<DocumentData>;
    source: PluggySource;
  }
): PluggyRecord<T> => {
  Object.defineProperties(record, {
    [DOC_REF_KEY]: {
      value: meta.docRef,
      enumerable: false
    },
    [CANONICAL_REF_KEY]: {
      value: meta.canonicalRef,
      enumerable: false
    },
    [SOURCE_KEY]: {
      value: meta.source,
      enumerable: false
    }
  });

  return record as PluggyRecord<T>;
};

export const getPluggyCanonicalCollectionPath = (userId: string, collectionName: PluggyCollectionName) =>
  `users/${userId}/${collectionName}`;

export const getPluggyCanonicalCollectionRef = (
  userId: string,
  collectionName: PluggyCollectionName
): CollectionReference<DocumentData> =>
  collection(db, getPluggyCanonicalCollectionPath(userId, collectionName));

export const getPluggyLegacyCollectionRef = (
  collectionName: PluggyCollectionName
): CollectionReference<DocumentData> =>
  collection(db, collectionName);

export const getPluggyCanonicalDocRef = (
  userId: string,
  collectionName: PluggyCollectionName,
  docId: string
): DocumentReference<DocumentData> =>
  doc(getPluggyCanonicalCollectionRef(userId, collectionName), docId);

const getPluggySourceCollectionRef = (
  userId: string,
  collectionName: PluggyCollectionName,
  source: PluggySource
) =>
  source === 'canonical'
    ? getPluggyCanonicalCollectionRef(userId, collectionName)
    : getPluggyLegacyCollectionRef(collectionName);

const loadSourceRecords = async <T extends Record<string, any>>(
  userId: string,
  collectionName: PluggyCollectionName,
  source: PluggySource,
  options: LoadPluggyOptions = {}
): Promise<PluggyRecord<T>[]> => {
  const collectionRef = getPluggySourceCollectionRef(userId, collectionName, source);
  const constraints = buildConstraints(userId, source, options);
  const sourceQuery = query(collectionRef, ...constraints);
  const snapshot = await getDocs(sourceQuery);

  return snapshot.docs.map((snapshotDoc) =>
    withMetadata(
      normalizePluggyRecord(collectionName, {
        id: snapshotDoc.id,
        ...(snapshotDoc.data() as T)
      }),
      {
        docRef: snapshotDoc.ref,
        canonicalRef: getPluggyCanonicalDocRef(userId, collectionName, snapshotDoc.id),
        source
      }
    )
  );
};

export const loadPluggyRecords = async <T extends Record<string, any> = Record<string, any>>(
  userId: string,
  collectionName: PluggyCollectionName,
  options: LoadPluggyOptions = {}
): Promise<PluggyRecord<T>[]> => {
  const [canonicalRecords, legacyRecords] = await Promise.all([
    loadSourceRecords<T>(userId, collectionName, 'canonical', options),
    loadSourceRecords<T>(userId, collectionName, 'legacy', options)
  ]);

  const mergedRecords =
    options.dedupe === false
      ? [...canonicalRecords, ...legacyRecords]
      : (() => {
          const mergedById = new Map<string, PluggyRecord<T>>();
          legacyRecords.forEach((record) => mergedById.set(record.id, record));
          canonicalRecords.forEach((record) => mergedById.set(record.id, record));
          return [...mergedById.values()];
        })();

  const sortedRecords = sortRecords(mergedRecords, options.orderBy);
  const finalRecords = typeof options.limit === 'number' ? sortedRecords.slice(0, options.limit) : sortedRecords;

  // Save to IndexedDB cache in background (fire-and-forget)
  setCacheRecords(userId, collectionName, finalRecords).catch(() => {});

  return finalRecords;
};

/**
 * Load records with IndexedDB cache support.
 * Returns cached data immediately if available, then fetches fresh data from Firestore.
 * 
 * @param userId - The user ID
 * @param collectionName - The Pluggy collection name
 * @param options - Query options
 * @returns Object with:
 *   - `records`: Cached records (or empty array if no cache)
 *   - `fromCache`: Whether the returned records came from cache
 *   - `cacheAge`: Human-readable cache age string
 *   - `fetchFresh()`: Promise that resolves to fresh records from Firestore
 */
export const loadPluggyRecordsWithCache = async <T extends Record<string, any> = Record<string, any>>(
  userId: string,
  collectionName: PluggyCollectionName,
  options: LoadPluggyOptions = {}
): Promise<{
  records: T[];
  fromCache: boolean;
  cacheAge: string | null;
  fetchFresh: () => Promise<PluggyRecord<T>[]>;
}> => {
  // Try to get cached data first
  let cachedEntry: CacheEntry<T> | null = null;
  try {
    cachedEntry = await getCacheRecords<T>(userId, collectionName);
  } catch {
    // IndexedDB unavailable, proceed without cache
  }

  const hasCachedData = cachedEntry !== null && cachedEntry.data.length > 0;
  const cacheFresh = isCacheFresh(cachedEntry);

  // Function to fetch fresh data from Firestore
  const fetchFresh = async (): Promise<PluggyRecord<T>[]> => {
    return loadPluggyRecords<T>(userId, collectionName, options);
  };

  if (hasCachedData) {
    const ageStr = formatCacheAge(cachedEntry!.timestamp);
    console.log(`[Cache] ${collectionName}: ${cachedEntry!.data.length} registros do cache (${ageStr})${cacheFresh ? ' [fresh]' : ' [stale]'}`);

    return {
      records: cachedEntry!.data,
      fromCache: true,
      cacheAge: ageStr,
      fetchFresh
    };
  }

  // No cache available, fetch from network
  const freshRecords = await fetchFresh();
  return {
    records: freshRecords,
    fromCache: false,
    cacheAge: null,
    fetchFresh: () => Promise.resolve(freshRecords)
  };
};

export const getPluggyDocRef = <T extends Record<string, any> = Record<string, any>>(
  record: PluggyRecord<T>
): DocumentReference<DocumentData> => {
  const docRef = record?.[DOC_REF_KEY];
  if (!docRef) {
    throw new Error('Pluggy document reference metadata is missing.');
  }

  return docRef;
};

export const getPluggyCanonicalRef = <T extends Record<string, any> = Record<string, any>>(
  record: PluggyRecord<T>
): DocumentReference<DocumentData> => {
  const docRef = record?.[CANONICAL_REF_KEY];
  if (!docRef) {
    throw new Error('Pluggy canonical document reference metadata is missing.');
  }

  return docRef;
};

export const getPluggySource = <T extends Record<string, any> = Record<string, any>>(
  record: PluggyRecord<T>
): PluggySource => record?.[SOURCE_KEY] || 'canonical';
