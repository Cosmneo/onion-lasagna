import { describe, it, expect, vi } from 'vitest';
import {
  calculateRetryDelay,
  shouldRetry,
  withRetry,
  DEFAULT_RETRY_CONFIG,
} from '../internals/retry';
import { ClientError } from '../types';

describe('calculateRetryDelay', () => {
  describe('linear backoff', () => {
    it('should return constant delay for linear backoff', () => {
      const config = { attempts: 3, delay: 1000, backoff: 'linear' as const };

      expect(calculateRetryDelay(1, config)).toBe(1000);
      expect(calculateRetryDelay(2, config)).toBe(1000);
      expect(calculateRetryDelay(3, config)).toBe(1000);
    });
  });

  describe('exponential backoff', () => {
    it('should return exponentially increasing delay', () => {
      const config = { attempts: 5, delay: 1000, backoff: 'exponential' as const };

      expect(calculateRetryDelay(1, config)).toBe(1000); // 1000 * 2^0
      expect(calculateRetryDelay(2, config)).toBe(2000); // 1000 * 2^1
      expect(calculateRetryDelay(3, config)).toBe(4000); // 1000 * 2^2
      expect(calculateRetryDelay(4, config)).toBe(8000); // 1000 * 2^3
    });

    it('should use exponential backoff by default', () => {
      const config = { attempts: 3, delay: 500 };

      expect(calculateRetryDelay(1, config)).toBe(500);
      expect(calculateRetryDelay(2, config)).toBe(1000);
      expect(calculateRetryDelay(3, config)).toBe(2000);
    });
  });
});

describe('shouldRetry', () => {
  it('should return false when max attempts reached', () => {
    const error = new ClientError('Server error', 500);
    const config = { ...DEFAULT_RETRY_CONFIG, attempts: 3 };

    expect(shouldRetry(error, 3, config)).toBe(false);
    expect(shouldRetry(error, 4, config)).toBe(false);
  });

  it('should return true for server errors when attempts remain', () => {
    const error = new ClientError('Server error', 500);
    const config = { ...DEFAULT_RETRY_CONFIG, attempts: 3 };

    expect(shouldRetry(error, 1, config)).toBe(true);
    expect(shouldRetry(error, 2, config)).toBe(true);
  });

  it('should return true for network errors when attempts remain', () => {
    const error = ClientError.networkError('Network failed');
    const config = { ...DEFAULT_RETRY_CONFIG, attempts: 3 };

    expect(shouldRetry(error, 1, config)).toBe(true);
  });

  it('should return false for client errors (4xx)', () => {
    const error = new ClientError('Not found', 404);
    const config = { ...DEFAULT_RETRY_CONFIG, attempts: 3 };

    expect(shouldRetry(error, 1, config)).toBe(false);
  });

  it('should use custom retryOn function when provided', () => {
    const error = new ClientError('Custom error', 418);
    const config = {
      ...DEFAULT_RETRY_CONFIG,
      attempts: 3,
      retryOn: (err: ClientError) => err.status === 418,
    };

    expect(shouldRetry(error, 1, config)).toBe(true);
  });
});

describe('withRetry', () => {
  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { attempts: 3, delay: 1 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed eventually', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ClientError('Error', 500))
      .mockRejectedValueOnce(new ClientError('Error', 500))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { attempts: 3, delay: 1 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max attempts exhausted', async () => {
    const error = new ClientError('Persistent error', 500);
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { attempts: 3, delay: 1 })).rejects.toThrow('Persistent error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    const error = new ClientError('Not found', 404);
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { attempts: 3, delay: 1 })).rejects.toThrow('Not found');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should wrap non-ClientError errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Generic error'));

    await expect(withRetry(fn, { attempts: 2, delay: 1 })).rejects.toBeInstanceOf(ClientError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use default config when not provided', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
