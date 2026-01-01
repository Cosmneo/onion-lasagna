import type { CacheConfig } from '../types';

/**
 * Cache entry with value and expiration time.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Default cache configuration.
 */
export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  ttl: 60000, // 1 minute
  storage: 'memory',
};

/**
 * In-memory cache storage.
 */
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Cache key prefix for localStorage.
 */
const STORAGE_PREFIX = 'onion-lasagna-client-cache:';

/**
 * Generate a cache key from URL and method.
 */
export function generateCacheKey(url: string, method: string): string {
  return `${method}:${url}`;
}

/**
 * Get a value from the cache.
 *
 * @param key - Cache key
 * @param config - Cache configuration
 * @returns The cached value or undefined if not found or expired
 */
export function getFromCache<T>(key: string, config: CacheConfig): T | undefined {
  const storage = config.storage ?? 'memory';

  if (storage === 'memory') {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  // localStorage
  if (typeof localStorage === 'undefined') return undefined;

  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    if (!stored) return undefined;

    const entry = JSON.parse(stored) as CacheEntry<T>;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return undefined;
    }

    return entry.value;
  } catch {
    return undefined;
  }
}

/**
 * Set a value in the cache.
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param config - Cache configuration
 */
export function setInCache<T>(key: string, value: T, config: CacheConfig): void {
  const storage = config.storage ?? 'memory';
  const ttl = config.ttl ?? DEFAULT_CACHE_CONFIG.ttl;

  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttl,
  };

  if (storage === 'memory') {
    memoryCache.set(key, entry);
    return;
  }

  // localStorage
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

/**
 * Remove a value from the cache.
 *
 * @param key - Cache key
 * @param config - Cache configuration
 */
export function removeFromCache(key: string, config: CacheConfig): void {
  const storage = config.storage ?? 'memory';

  if (storage === 'memory') {
    memoryCache.delete(key);
    return;
  }

  // localStorage
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all cached values.
 *
 * @param config - Cache configuration
 */
export function clearCache(config: CacheConfig): void {
  const storage = config.storage ?? 'memory';

  if (storage === 'memory') {
    memoryCache.clear();
    return;
  }

  // localStorage
  if (typeof localStorage === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Invalidate cache entries matching a pattern.
 *
 * @param pattern - URL pattern to match (simple string matching)
 * @param config - Cache configuration
 */
export function invalidateCache(pattern: string, config: CacheConfig): void {
  const storage = config.storage ?? 'memory';

  if (storage === 'memory') {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
    return;
  }

  // localStorage
  if (typeof localStorage === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) && key.includes(pattern)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage errors
  }
}
