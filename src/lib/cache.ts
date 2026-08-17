/** 極簡 in-memory cache，預設 TTL 3 分鐘。寫入操作時呼叫 invalidate。 */

const DEFAULT_TTL_MS = 3 * 60 * 1000;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** 不帶參數時清空整個 cache。 */
export function cacheInvalidate(key?: string): void {
  if (key) store.delete(key);
  else store.clear();
}

export const RECEIPTS_CACHE_KEY = "notion:receipts";
