import { describe, it, expect, vi, afterEach } from 'vitest';
import { exponentialBackoff } from '../../backoff';

describe('exponentialBackoff', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a function', () => {
    const backoff = exponentialBackoff(100, 5000);
    expect(typeof backoff).toBe('function');
  });

  it('doubles the base delay per attempt (no jitter)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const backoff = exponentialBackoff(100, 10000) as (attempt: number) => number;

    expect(backoff(1)).toBe(100); // 100 * 2^0 = 100
    expect(backoff(2)).toBe(200); // 100 * 2^1 = 200
    expect(backoff(3)).toBe(400); // 100 * 2^2 = 400
    expect(backoff(4)).toBe(800); // 100 * 2^3 = 800
  });

  it('clamps to maxMs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const backoff = exponentialBackoff(100, 500) as (attempt: number) => number;

    expect(backoff(1)).toBe(100); // 100, under max
    expect(backoff(2)).toBe(200); // 200, under max
    expect(backoff(3)).toBe(400); // 400, under max
    expect(backoff(4)).toBe(500); // clamped from 800 to 500
    expect(backoff(5)).toBe(500); // clamped from 1600 to 500
  });

  it('adds jitter up to the clamped value', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const backoff = exponentialBackoff(100, 10000) as (attempt: number) => number;

    // clamped + jitter = clamped + random * clamped = clamped * 2
    expect(backoff(1)).toBe(200); // 100 + 1 * 100
    expect(backoff(2)).toBe(400); // 200 + 1 * 200
    expect(backoff(3)).toBe(800); // 400 + 1 * 400
  });

  it('always returns an integer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.333);
    const backoff = exponentialBackoff(100, 5000) as (attempt: number) => number;

    for (let i = 1; i <= 10; i++) {
      expect(Number.isInteger(backoff(i))).toBe(true);
    }
  });

  it('stays within [clamped, clamped * 2] range', () => {
    const backoff = exponentialBackoff(200, 3000) as (attempt: number) => number;

    for (let attempt = 1; attempt <= 20; attempt++) {
      const exponential = 200 * 2 ** (attempt - 1);
      const clamped = Math.min(exponential, 3000);

      for (let i = 0; i < 50; i++) {
        const result = backoff(attempt);
        expect(result).toBeGreaterThanOrEqual(clamped);
        expect(result).toBeLessThanOrEqual(clamped * 2);
      }
    }
  });
});
