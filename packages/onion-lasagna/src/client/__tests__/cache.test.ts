import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateCacheKey,
  getFromCache,
  setInCache,
  removeFromCache,
  clearCache,
  invalidateCache,
} from '../internals/cache';
import type { CacheConfig } from '../types';

describe('cache', () => {
  const memoryCacheConfig: CacheConfig = { ttl: 60000, storage: 'memory' };

  beforeEach(() => {
    // Clear memory cache before each test
    clearCache(memoryCacheConfig);
  });

  describe('generateCacheKey', () => {
    it('should generate key from URL and method', () => {
      const key = generateCacheKey('http://localhost:3000/api/users', 'GET');
      expect(key).toBe('GET:http://localhost:3000/api/users');
    });

    it('should generate different keys for different methods', () => {
      const getKey = generateCacheKey('http://localhost:3000/api/users', 'GET');
      const postKey = generateCacheKey('http://localhost:3000/api/users', 'POST');
      expect(getKey).not.toBe(postKey);
    });

    it('should generate different keys for different URLs', () => {
      const key1 = generateCacheKey('http://localhost:3000/api/users', 'GET');
      const key2 = generateCacheKey('http://localhost:3000/api/projects', 'GET');
      expect(key1).not.toBe(key2);
    });
  });

  describe('memory cache', () => {
    describe('setInCache and getFromCache', () => {
      it('should store and retrieve values', () => {
        const key = 'test-key';
        const value = { id: 1, name: 'Test' };

        setInCache(key, value, memoryCacheConfig);
        const retrieved = getFromCache<typeof value>(key, memoryCacheConfig);

        expect(retrieved).toEqual(value);
      });

      it('should return undefined for non-existent keys', () => {
        const retrieved = getFromCache('non-existent', memoryCacheConfig);
        expect(retrieved).toBeUndefined();
      });

      it('should return undefined for expired entries', async () => {
        const key = 'expiring-key';
        const value = { data: 'test' };
        const shortTtlConfig: CacheConfig = { ttl: 50, storage: 'memory' };

        setInCache(key, value, shortTtlConfig);

        // Verify it's there
        expect(getFromCache(key, shortTtlConfig)).toEqual(value);

        // Wait for TTL to expire (real time with short delay)
        await new Promise((resolve) => setTimeout(resolve, 60));

        // Should be expired now
        expect(getFromCache(key, shortTtlConfig)).toBeUndefined();
      });

      it('should overwrite existing values', () => {
        const key = 'overwrite-key';

        setInCache(key, 'first', memoryCacheConfig);
        setInCache(key, 'second', memoryCacheConfig);

        expect(getFromCache(key, memoryCacheConfig)).toBe('second');
      });
    });

    describe('removeFromCache', () => {
      it('should remove a cached value', () => {
        const key = 'remove-key';

        setInCache(key, 'value', memoryCacheConfig);
        expect(getFromCache(key, memoryCacheConfig)).toBe('value');

        removeFromCache(key, memoryCacheConfig);
        expect(getFromCache(key, memoryCacheConfig)).toBeUndefined();
      });

      it('should not throw when removing non-existent key', () => {
        expect(() => removeFromCache('non-existent', memoryCacheConfig)).not.toThrow();
      });
    });

    describe('clearCache', () => {
      it('should remove all cached values', () => {
        setInCache('key1', 'value1', memoryCacheConfig);
        setInCache('key2', 'value2', memoryCacheConfig);
        setInCache('key3', 'value3', memoryCacheConfig);

        clearCache(memoryCacheConfig);

        expect(getFromCache('key1', memoryCacheConfig)).toBeUndefined();
        expect(getFromCache('key2', memoryCacheConfig)).toBeUndefined();
        expect(getFromCache('key3', memoryCacheConfig)).toBeUndefined();
      });
    });

    describe('invalidateCache', () => {
      it('should remove entries matching pattern', () => {
        setInCache('GET:/api/users', 'users', memoryCacheConfig);
        setInCache('GET:/api/users/1', 'user1', memoryCacheConfig);
        setInCache('GET:/api/projects', 'projects', memoryCacheConfig);

        invalidateCache('/api/users', memoryCacheConfig);

        expect(getFromCache('GET:/api/users', memoryCacheConfig)).toBeUndefined();
        expect(getFromCache('GET:/api/users/1', memoryCacheConfig)).toBeUndefined();
        expect(getFromCache('GET:/api/projects', memoryCacheConfig)).toBe('projects');
      });

      it('should not remove entries not matching pattern', () => {
        setInCache('GET:/api/projects', 'projects', memoryCacheConfig);

        invalidateCache('/api/users', memoryCacheConfig);

        expect(getFromCache('GET:/api/projects', memoryCacheConfig)).toBe('projects');
      });
    });
  });

  describe('localStorage cache', () => {
    const localStorageConfig: CacheConfig = { ttl: 60000, storage: 'localStorage' };

    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
        get length() {
          return Object.keys(store).length;
        },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      };
    })();

    beforeEach(() => {
      vi.stubGlobal('localStorage', localStorageMock);
      localStorageMock.clear();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should store and retrieve values from localStorage', () => {
      const key = 'ls-test-key';
      const value = { id: 1, name: 'LocalStorage Test' };

      setInCache(key, value, localStorageConfig);
      const retrieved = getFromCache<typeof value>(key, localStorageConfig);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for expired localStorage entries', async () => {
      const key = 'ls-expiring-key';
      const value = { data: 'test' };
      const shortTtlConfig: CacheConfig = { ttl: 50, storage: 'localStorage' };

      setInCache(key, value, shortTtlConfig);

      // Wait for TTL to expire (real time with short delay)
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(getFromCache(key, shortTtlConfig)).toBeUndefined();
    });

    it('should remove values from localStorage', () => {
      const key = 'ls-remove-key';

      setInCache(key, 'value', localStorageConfig);
      removeFromCache(key, localStorageConfig);

      expect(getFromCache(key, localStorageConfig)).toBeUndefined();
    });
  });

  describe('default storage', () => {
    it('should use memory storage when storage is not specified', () => {
      const config: CacheConfig = { ttl: 60000 };

      setInCache('default-storage-key', 'value', config);
      expect(getFromCache('default-storage-key', config)).toBe('value');

      clearCache(config);
      expect(getFromCache('default-storage-key', config)).toBeUndefined();
    });
  });
});
