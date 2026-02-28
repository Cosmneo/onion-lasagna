/**
 * Options for cache set operations.
 */
export interface CacheSetOptions {
  /** Time-to-live in seconds. If omitted, the entry does not expire. */
  ttl?: number;
}

/**
 * Outbound port for key-value caching.
 *
 * Implementations handle the actual cache storage (e.g., Redis, in-memory Map, Memcached).
 *
 * @example
 * ```typescript
 * class RedisCacheAdapter extends BaseOutboundAdapter implements CachePort {
 *   constructor(private redis: RedisClient) {
 *     super();
 *   }
 *
 *   async get<T>(key: string): Promise<T | undefined> {
 *     const raw = await this.redis.get(key);
 *     return raw ? (JSON.parse(raw) as T) : undefined;
 *   }
 *
 *   async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
 *     const serialized = JSON.stringify(value);
 *     if (options?.ttl) {
 *       await this.redis.set(key, serialized, 'EX', options.ttl);
 *     } else {
 *       await this.redis.set(key, serialized);
 *     }
 *   }
 *
 *   async delete(key: string): Promise<void> {
 *     await this.redis.del(key);
 *   }
 *
 *   async has(key: string): Promise<boolean> {
 *     return (await this.redis.exists(key)) === 1;
 *   }
 * }
 * ```
 */
export interface CachePort {
  /** Retrieves a value by key. Returns `undefined` on cache miss. */
  get<T>(key: string): Promise<T | undefined>;

  /** Stores a value with an optional TTL. */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /** Removes a value by key. No-op if the key does not exist. */
  delete(key: string): Promise<void>;

  /** Checks whether a key exists in the cache. */
  has(key: string): Promise<boolean>;
}
