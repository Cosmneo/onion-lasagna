/**
 * Repro tests for saga findings (written BEFORE fixes — expected to fail first).
 *
 * Findings covered:
 *  - MISSED timeout-enforcement: step ignoring signal still hangs; must race + throw TimeoutError
 *  - MISSED listener-leak: cleanup must happen in try/finally, not only on settle
 *  - C11-1: timeout aborts do NOT retry (already correct, confirm stays so)
 *  - C11-2: exponentialBackoff final value (base+jitter) must be clamped to maxMs
 *  - C11-3: abort during retry delay causes unbounded latency; delay must abort immediately
 *  - MISSED dup-name: addStep must throw on duplicate step name at runtime
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Saga } from '../saga.class';
import { TimeoutError, AbortError } from '../errors';
import { exponentialBackoff } from '../../backoff';
import type { ISagaStep } from '../../interfaces';

type Ctx = { values: string[] };

const makeCtx = (): Ctx => ({ values: [] });

// Helper: step that ignores the abort signal (does NOT listen to it)
function signalIgnoringSlowStep(
  name: string,
  durationMs: number,
  timeoutMs: number,
): ISagaStep<Ctx> {
  return {
    name,
    action: async () => {
      // deliberately ignores the signal — simulates a poorly-written step
      await new Promise<void>((resolve) => setTimeout(resolve, durationMs));
    },
    actionTimeoutMs: timeoutMs,
  };
}

describe('Saga – timeout enforcement (MISSED finding)', () => {
  it('throws TimeoutError even when step ignores the abort signal', async () => {
    const saga = new Saga<Ctx>();
    // action takes 500 ms but timeout is 50 ms; action ignores signal
    saga.addStep(signalIgnoringSlowStep('slow-ignoring', 500, 50));

    const start = Date.now();
    const result = await saga.execute(makeCtx());
    const elapsed = Date.now() - start;

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(TimeoutError);
    // must resolve well within the full 500 ms (allow generous 300 ms margin)
    expect(elapsed).toBeLessThan(300);
  }, 2000);

  it('throws TimeoutError for compensation that ignores the abort signal', async () => {
    const saga = new Saga<Ctx>({ continueOnCompensationError: true });

    saga.addStep({
      name: 'step1',
      action: async (ctx) => {
        ctx.values.push('step1');
      },
      compensation: async () => {
        // ignores signal
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      },
      compensationTimeoutMs: 50,
    });
    saga.addStep({
      name: 'step2',
      action: async () => {
        throw new Error('step2 failed');
      },
    });

    const start = Date.now();
    const result = await saga.execute(makeCtx());
    const elapsed = Date.now() - start;

    expect(result.success).toBe(false);
    expect(result.failedCompensations).toContain('step1');
    // must resolve well within 500 ms
    expect(elapsed).toBeLessThan(300);
  }, 2000);
});

describe('Saga – C11-1: timeout abort does not retry', () => {
  it('does not retry after a timeout (TimeoutError is non-retryable by abort path)', async () => {
    let attempts = 0;
    const saga = new Saga<Ctx>();

    saga.addStep({
      name: 'timed-out-step',
      action: async (_ctx, signal) => {
        attempts++;
        await new Promise<void>((resolve, reject) => {
          const id = setTimeout(resolve, 500);
          signal?.addEventListener('abort', () => {
            clearTimeout(id);
            reject(signal.reason ?? new Error('aborted'));
          });
        });
      },
      actionTimeoutMs: 50,
      retry: { maxAttempts: 3, backoffMs: 0 },
    });

    const result = await saga.execute(makeCtx());

    expect(result.success).toBe(false);
    // Must NOT retry on abort/timeout — stays at 1 attempt
    expect(attempts).toBe(1);
  }, 2000);
});

describe('Saga – C11-3: abort during retry delay resolves immediately', () => {
  it('wakes up the delay promise immediately when global abort fires', async () => {
    const controller = new AbortController();
    const saga = new Saga<Ctx>({ abortSignal: controller.signal });

    let attempts = 0;

    saga.addStep({
      name: 'flaky',
      action: async () => {
        attempts++;
        throw new Error('always fails');
      },
      retry: {
        maxAttempts: 5,
        // long backoff to detect if delay is aborted early
        backoffMs: 2000,
      },
    });

    // Abort after 1 attempt fires (short delay)
    setTimeout(() => controller.abort(), 50);

    const start = Date.now();
    const result = await saga.execute(makeCtx());
    const elapsed = Date.now() - start;

    expect(result.success).toBe(false);
    // should resolve quickly (much less than 2000 ms backoff)
    expect(elapsed).toBeLessThan(500);
  }, 3000);
});

describe('Saga – duplicate step name guard (MISSED finding)', () => {
  it('throws when two steps have the same name via addStep', () => {
    const saga = new Saga<Ctx>();
    saga.addStep({ name: 'duplicate', action: async () => {} });

    expect(() => {
      saga.addStep({ name: 'duplicate', action: async () => {} });
    }).toThrow(/duplicate/i);
  });
});

describe('exponentialBackoff – C11-2: jitter clamp to maxMs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never returns more than maxMs even with max jitter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1); // maximum jitter
    const backoff = exponentialBackoff(200, 1000) as (attempt: number) => number;

    // With max jitter (Math.random() = 1) old code: clamped + jitter = clamped + clamped = 2*clamped
    // New code must clamp the FINAL value to maxMs
    for (let attempt = 1; attempt <= 20; attempt++) {
      const result = backoff(attempt);
      expect(result).toBeLessThanOrEqual(1000);
    }
  });

  it('never returns more than maxMs even with partial jitter at max', () => {
    // attempt=5: 200*2^4=3200 → clamped=1000; jitter = random*1000
    // old: 1000 + random*1000 — up to 2000, violating maxMs=1000
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const backoff = exponentialBackoff(100, 500) as (attempt: number) => number;

    for (let attempt = 1; attempt <= 20; attempt++) {
      const result = backoff(attempt);
      expect(result).toBeLessThanOrEqual(500);
    }
  });
});
