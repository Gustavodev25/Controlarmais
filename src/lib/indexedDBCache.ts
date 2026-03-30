/**
 * IndexedDB Cache Service
 * 
 * Provides a local cache layer using IndexedDB for fast offline loading.
 * Uses a "stale-while-revalidate" pattern: returns cached data instantly
 * while fetching fresh data from Firestore in the background.
 */

const DB_NAME = 'controlarmais-cache';
const DB_VERSION = 1;
const STORE_NAME = 'pluggy-records';
const META_STORE = 'cache-meta';

// Cache TTL: 7 days (after this, cache is considered expired and won't be used as primary)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Max age before cache is soft-expired (still usable, but triggers background refresh)
// Anything under this is considered "fresh enough" to skip network
const FRESH_TTL_MS = 2 * 60 * 1000; // 2 minutes

let dbPromise: Promise<IDBDatabase> | null = null;
let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Main data store: keyed by "userId::collectionName"
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }

      // Metadata store for timestamps
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;

      // Handle unexpected close (e.g. browser clears storage)
      dbInstance.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };

      resolve(dbInstance);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function getCacheKey(userId: string, collectionName: string): string {
  return `${userId}::${collectionName}`;
}

/**
 * Serialize a record for IndexedDB storage.
 * Firestore Timestamps have toDate(), we convert them to ISO strings.
 * Non-enumerable metadata keys (__pluggyDocRef, etc.) are stripped.
 */
function serializeRecord(record: Record<string, any>): Record<string, any> {
  const serialized: Record<string, any> = {};

  for (const key of Object.keys(record)) {
    const value = record[key];

    if (value === undefined) {
      serialized[key] = null;
      continue;
    }

    if (value && typeof value === 'object') {
      // Firestore Timestamp
      if (typeof value.toDate === 'function') {
        try {
          serialized[key] = { __type: 'timestamp', value: value.toDate().toISOString() };
        } catch {
          serialized[key] = null;
        }
        continue;
      }

      // Date objects
      if (value instanceof Date) {
        serialized[key] = { __type: 'date', value: value.toISOString() };
        continue;
      }

      // Nested objects (shallow - e.g. creditCardMetadata, creditData)
      if (!Array.isArray(value)) {
        serialized[key] = serializeRecord(value);
        continue;
      }

      // Arrays
      serialized[key] = value.map((item: any) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          if (typeof item.toDate === 'function') {
            try {
              return { __type: 'timestamp', value: item.toDate().toISOString() };
            } catch {
              return null;
            }
          }
          return serializeRecord(item);
        }
        return item;
      });
      continue;
    }

    serialized[key] = value;
  }

  return serialized;
}

/**
 * Deserialize a record from IndexedDB.
 * Restores ISO strings back to Date objects where tagged.
 */
function deserializeRecord(record: Record<string, any>): Record<string, any> {
  const deserialized: Record<string, any> = {};

  for (const key of Object.keys(record)) {
    const value = record[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Tagged timestamp/date
      if (value.__type === 'timestamp' || value.__type === 'date') {
        deserialized[key] = new Date(value.value);
        continue;
      }

      // Nested object
      deserialized[key] = deserializeRecord(value);
      continue;
    }

    if (Array.isArray(value)) {
      deserialized[key] = value.map((item: any) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          if (item.__type === 'timestamp' || item.__type === 'date') {
            return new Date(item.value);
          }
          return deserializeRecord(item);
        }
        return item;
      });
      continue;
    }

    deserialized[key] = value;
  }

  return deserialized;
}

export interface CacheEntry<T = any> {
  data: T[];
  timestamp: number;
}

export interface CacheMeta {
  timestamp: number;
  count: number;
  collectionName: string;
}

/**
 * Store records in the cache.
 */
export async function setCacheRecords<T extends Record<string, any>>(
  userId: string,
  collectionName: string,
  records: T[]
): Promise<void> {
  try {
    const db = await openDB();
    const key = getCacheKey(userId, collectionName);

    const serializedRecords = records.map(serializeRecord);

    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
    const dataStore = tx.objectStore(STORE_NAME);
    const metaStore = tx.objectStore(META_STORE);

    const cacheEntry: CacheEntry = {
      data: serializedRecords,
      timestamp: Date.now()
    };

    const meta: CacheMeta = {
      timestamp: Date.now(),
      count: records.length,
      collectionName
    };

    dataStore.put(cacheEntry, key);
    metaStore.put(meta, key);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[Cache] Erro ao salvar no IndexedDB:', error);
  }
}

/**
 * Get cached records. Returns null if no cache exists or cache is expired.
 */
export async function getCacheRecords<T extends Record<string, any>>(
  userId: string,
  collectionName: string
): Promise<CacheEntry<T> | null> {
  try {
    const db = await openDB();
    const key = getCacheKey(userId, collectionName);

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise<CacheEntry<T> | null>((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;

        if (!entry || !entry.data) {
          resolve(null);
          return;
        }

        // Check hard expiry
        const age = Date.now() - entry.timestamp;
        if (age > CACHE_TTL_MS) {
          resolve(null);
          return;
        }

        resolve({
          data: entry.data.map(deserializeRecord) as T[],
          timestamp: entry.timestamp
        });
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[Cache] Erro ao ler do IndexedDB:', error);
    return null;
  }
}

/**
 * Check if cached data is still "fresh" (within FRESH_TTL).
 */
export function isCacheFresh(entry: CacheEntry | null): boolean {
  if (!entry) return false;
  return (Date.now() - entry.timestamp) < FRESH_TTL_MS;
}

/**
 * Get cache metadata for a specific collection.
 */
export async function getCacheMeta(
  userId: string,
  collectionName: string
): Promise<CacheMeta | null> {
  try {
    const db = await openDB();
    const key = getCacheKey(userId, collectionName);

    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);

    return new Promise<CacheMeta | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Clear all cache for a specific user.
 */
export async function clearUserCache(userId: string): Promise<void> {
  try {
    const db = await openDB();
    const collections = ['accounts', 'transactions', 'creditCardTransactions', 'creditCardBills'];

    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
    const dataStore = tx.objectStore(STORE_NAME);
    const metaStore = tx.objectStore(META_STORE);

    for (const col of collections) {
      const key = getCacheKey(userId, col);
      dataStore.delete(key);
      metaStore.delete(key);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    console.log('[Cache] Cache do usuário limpo');
  } catch (error) {
    console.warn('[Cache] Erro ao limpar cache:', error);
  }
}

/**
 * Clear all cached data.
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB();

    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(META_STORE).clear();

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    console.log('[Cache] Todo o cache foi limpo');
  } catch (error) {
    console.warn('[Cache] Erro ao limpar todo o cache:', error);
  }
}

/**
 * Get the age of cached data in a human-readable format.
 */
export function formatCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}
