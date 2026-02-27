import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Saga } from '../saga.class';
import { CompensationError, TimeoutError, AbortError } from '../errors';
import type { ISagaStep, ISagaOptions } from '../../interfaces';

type TestContext = {
  values: string[];
};

function createContext(): TestContext {
  return { values: [] };
}

function step(
  name: string,
  overrides?: Partial<ISagaStep<TestContext>>,
): ISagaStep<TestContext> {
  return {
    name,
    action: vi.fn(async (ctx) => {
      ctx.values.push(`${name}:action`);
    }),
    ...overrides,
  };
}

describe('Saga', () => {
  // ─── Happy Path ────────────────────────────────────────────────

  describe('execute - happy path', () => {
    it('should execute all steps in order and return success', async () => {
      const saga = new Saga<TestContext>();
      saga.addStep(step('step1'));
      saga.addStep(step('step2'));
      saga.addStep(step('step3'));

      const result = await saga.execute(createContext());

      expect(result.success).toBe(true);
      expect(result.completedSteps).toEqual(['step1', 'step2', 'step3']);
      expect(result.compensatedSteps).toEqual([]);
      expect(result.failedCompensations).toEqual([]);
      expect(result.error).toBeUndefined();
      expect(result.failedStep).toBeUndefined();
      expect(result.context.values).toEqual(['step1:action', 'step2:action', 'step3:action']);
    });

    it('should return success for empty saga', async () => {
      const saga = new Saga<TestContext>();
      const result = await saga.execute(createContext());

      expect(result.success).toBe(true);
      expect(result.completedSteps).toEqual([]);
    });

    it('should pass context through all steps', async () => {
      const saga = new Saga<TestContext>();
      saga.addStep(
        step('step1', {
          action: async (ctx) => {
            ctx.values.push('first');
          },
        }),
      );
      saga.addStep(
        step('step2', {
          action: async (ctx) => {
            expect(ctx.values).toEqual(['first']);
            ctx.values.push('second');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(true);
      expect(result.context.values).toEqual(['first', 'second']);
    });
  });

  // ─── Failure & Compensation ────────────────────────────────────

  describe('execute - failure and compensation', () => {
    it('should compensate completed steps in reverse order on failure', async () => {
      const compensationOrder: string[] = [];
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('step1', {
          compensation: async () => {
            compensationOrder.push('step1:compensate');
          },
        }),
      );
      saga.addStep(
        step('step2', {
          compensation: async () => {
            compensationOrder.push('step2:compensate');
          },
        }),
      );
      saga.addStep(
        step('step3', {
          action: async () => {
            throw new Error('step3 failed');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('step3 failed');
      expect(result.failedStep).toBe('step3');
      expect(result.completedSteps).toEqual(['step1', 'step2']);
      expect(result.compensatedSteps).toEqual(['step2', 'step1']);
      expect(compensationOrder).toEqual(['step2:compensate', 'step1:compensate']);
    });

    it('should skip steps without compensation functions during rollback', async () => {
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('step1', {
          compensation: vi.fn(),
        }),
      );
      saga.addStep(step('step2')); // no compensation
      saga.addStep(
        step('step3', {
          action: async () => {
            throw new Error('boom');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.compensatedSteps).toEqual(['step1']);
    });

    it('should not compensate steps that were not completed', async () => {
      const compensation3 = vi.fn();
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('step1', {
          action: async () => {
            throw new Error('first step fails');
          },
          compensation: vi.fn(),
        }),
      );
      saga.addStep(step('step2', { compensation: vi.fn() }));
      saga.addStep(step('step3', { compensation: compensation3 }));

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('step1');
      expect(result.completedSteps).toEqual([]);
      expect(result.compensatedSteps).toEqual([]);
      expect(compensation3).not.toHaveBeenCalled();
    });
  });

  // ─── Compensation Failure ──────────────────────────────────────

  describe('execute - compensation failure', () => {
    it('should continue compensating other steps when continueOnCompensationError=true (default)', async () => {
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('step1', {
          compensation: vi.fn(),
        }),
      );
      saga.addStep(
        step('step2', {
          compensation: async () => {
            throw new Error('comp2 failed');
          },
        }),
      );
      saga.addStep(
        step('step3', {
          action: async () => {
            throw new Error('step3 failed');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('step3');
      expect(result.compensatedSteps).toEqual(['step1']);
      expect(result.failedCompensations).toEqual(['step2']);
    });

    it('should stop compensating and return CompensationError when continueOnCompensationError=false', async () => {
      const step1Compensation = vi.fn();
      const saga = new Saga<TestContext>({ continueOnCompensationError: false });

      saga.addStep(step('step1', { compensation: step1Compensation }));
      saga.addStep(
        step('step2', {
          compensation: async () => {
            throw new Error('comp2 failed');
          },
        }),
      );
      saga.addStep(
        step('step3', {
          action: async () => {
            throw new Error('step3 failed');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(CompensationError);
      expect(result.compensationFailedStep).toBe('step2');
      expect(result.failedCompensations).toEqual(['step2']);
      expect(step1Compensation).not.toHaveBeenCalled();
    });
  });

  // ─── Retry ─────────────────────────────────────────────────────

  describe('execute - retry policy', () => {
    it('should retry a failing action up to maxAttempts', async () => {
      let attempts = 0;
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('flaky', {
          action: async () => {
            attempts++;
            if (attempts < 3) throw new Error('transient');
          },
          retry: { maxAttempts: 3, backoffMs: 0 },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should fail after exhausting retries', async () => {
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('always-fails', {
          action: async () => {
            throw new Error('permanent');
          },
          retry: { maxAttempts: 3, backoffMs: 0 },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('permanent');
    });

    it('should respect retryOn predicate', async () => {
      let attempts = 0;
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('selective-retry', {
          action: async () => {
            attempts++;
            throw new Error('non-retryable');
          },
          retry: {
            maxAttempts: 5,
            backoffMs: 0,
            retryOn: (err) => err.message !== 'non-retryable',
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(attempts).toBe(1);
    });

    it('should use function backoff', async () => {
      const delays: number[] = [];
      let attempts = 0;
      const saga = new Saga<TestContext>();

      const originalSetTimeout = globalThis.setTimeout;
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
        if (ms && ms > 0) delays.push(ms);
        return originalSetTimeout(fn, 0);
      });

      saga.addStep(
        step('backoff', {
          action: async () => {
            attempts++;
            if (attempts < 4) throw new Error('retry me');
          },
          retry: { maxAttempts: 4, backoffMs: (attempt) => attempt * 100 },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(true);
      expect(delays).toEqual([100, 200, 300]);

      vi.restoreAllMocks();
    });

    it('should retry compensation with compensationRetry policy', async () => {
      let compAttempts = 0;
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('step1', {
          compensation: async () => {
            compAttempts++;
            if (compAttempts < 2) throw new Error('transient comp');
          },
          compensationRetry: { maxAttempts: 3, backoffMs: 0 },
        }),
      );
      saga.addStep(
        step('step2', {
          action: async () => {
            throw new Error('step2 failed');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.compensatedSteps).toEqual(['step1']);
      expect(compAttempts).toBe(2);
    });
  });

  // ─── Timeout ───────────────────────────────────────────────────

  describe('execute - timeout', () => {
    it('should timeout a slow action', async () => {
      const saga = new Saga<TestContext>();

      saga.addStep(
        step('slow', {
          action: async (_ctx, signal) => {
            await new Promise((resolve, reject) => {
              const id = setTimeout(resolve, 10_000);
              signal?.addEventListener('abort', () => {
                clearTimeout(id);
                reject(signal.reason ?? new Error('aborted'));
              });
            });
          },
          actionTimeoutMs: 50,
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TimeoutError);
    });

    it('should timeout a slow compensation', async () => {
      const saga = new Saga<TestContext>({ continueOnCompensationError: true });

      saga.addStep(
        step('step1', {
          compensation: async (_ctx, signal) => {
            await new Promise((resolve, reject) => {
              const id = setTimeout(resolve, 10_000);
              signal?.addEventListener('abort', () => {
                clearTimeout(id);
                reject(signal.reason ?? new Error('aborted'));
              });
            });
          },
          compensationTimeoutMs: 50,
        }),
      );
      saga.addStep(
        step('step2', {
          action: async () => {
            throw new Error('step2 failed');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.failedCompensations).toEqual(['step1']);
    });
  });

  // ─── Abort Signal ──────────────────────────────────────────────

  describe('execute - abort signal', () => {
    it('should abort before running the next step if signal is already aborted', async () => {
      const controller = new AbortController();
      const saga = new Saga<TestContext>({ abortSignal: controller.signal });

      saga.addStep(
        step('step1', {
          action: async () => {
            controller.abort();
          },
        }),
      );
      saga.addStep(step('step2'));

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AbortError);
      expect(result.completedSteps).toEqual(['step1']);
    });

    it('should abort mid-execution and propagate signal to step action', async () => {
      const controller = new AbortController();
      const saga = new Saga<TestContext>({ abortSignal: controller.signal });

      saga.addStep(
        step('slow', {
          action: async (_ctx, signal) => {
            await new Promise((resolve, reject) => {
              const id = setTimeout(resolve, 10_000);
              signal?.addEventListener('abort', () => {
                clearTimeout(id);
                reject(signal.reason ?? new AbortError('aborted'));
              });
            });
          },
        }),
      );

      setTimeout(() => controller.abort(), 50);

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AbortError);
    });
  });

  // ─── Hooks ─────────────────────────────────────────────────────

  describe('execute - hooks', () => {
    it('should call onStepComplete after each successful step', async () => {
      const completedSteps: string[] = [];
      const saga = new Saga<TestContext>({
        onStepComplete: (name) => {
          completedSteps.push(name);
        },
      });

      saga.addStep(step('step1'));
      saga.addStep(step('step2'));

      await saga.execute(createContext());

      expect(completedSteps).toEqual(['step1', 'step2']);
    });

    it('should call onStepFail when a step fails', async () => {
      const failedSteps: Array<{ name: string; error: string }> = [];
      const saga = new Saga<TestContext>({
        onStepFail: (name, error) => {
          failedSteps.push({ name, error: error.message });
        },
      });

      saga.addStep(step('step1'));
      saga.addStep(
        step('step2', {
          action: async () => {
            throw new Error('step2 boom');
          },
        }),
      );

      await saga.execute(createContext());

      expect(failedSteps).toEqual([{ name: 'step2', error: 'step2 boom' }]);
    });

    it('should call onCompensate for each compensated step', async () => {
      const compensated: string[] = [];
      const saga = new Saga<TestContext>({
        onCompensate: (name) => {
          compensated.push(name);
        },
      });

      saga.addStep(step('step1', { compensation: vi.fn() }));
      saga.addStep(step('step2', { compensation: vi.fn() }));
      saga.addStep(
        step('step3', {
          action: async () => {
            throw new Error('fail');
          },
        }),
      );

      await saga.execute(createContext());

      expect(compensated).toEqual(['step2', 'step1']);
    });

    it('should call onCompensationError when compensation fails', async () => {
      const errors: Array<{ name: string; error: string }> = [];
      const saga = new Saga<TestContext>({
        onCompensationError: (name, error) => {
          errors.push({ name, error: error.message });
        },
      });

      saga.addStep(
        step('step1', {
          compensation: async () => {
            throw new Error('comp failed');
          },
        }),
      );
      saga.addStep(
        step('step2', {
          action: async () => {
            throw new Error('action failed');
          },
        }),
      );

      await saga.execute(createContext());

      expect(errors).toEqual([{ name: 'step1', error: 'comp failed' }]);
    });

    it('should ignore hook errors when failOnHookError=false (default)', async () => {
      const saga = new Saga<TestContext>({
        onStepComplete: () => {
          throw new Error('hook exploded');
        },
      });

      saga.addStep(step('step1'));
      saga.addStep(step('step2'));

      const result = await saga.execute(createContext());

      expect(result.success).toBe(true);
      expect(result.completedSteps).toEqual(['step1', 'step2']);
    });

    it('should treat hook errors as step failures when failOnHookError=true', async () => {
      const saga = new Saga<TestContext>({
        failOnHookError: true,
        onStepComplete: (name) => {
          if (name === 'step2') throw new Error('hook failed');
        },
      });

      saga.addStep(step('step1', { compensation: vi.fn() }));
      saga.addStep(step('step2', { compensation: vi.fn() }));

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('hook failed');
      expect(result.failedStep).toBe('step2');
      expect(result.compensatedSteps).toEqual(['step2', 'step1']);
    });

    it('should treat onStepFail hook error as the returned error when failOnHookError=true', async () => {
      const saga = new Saga<TestContext>({
        failOnHookError: true,
        onStepFail: () => {
          throw new Error('onStepFail hook crashed');
        },
      });

      saga.addStep(
        step('step1', {
          action: async () => {
            throw new Error('original error');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('onStepFail hook crashed');
    });

    it('should record failed compensation when onCompensate hook fails with failOnHookError=true and continueOnCompensationError=true', async () => {
      const saga = new Saga<TestContext>({
        failOnHookError: true,
        onCompensate: (name) => {
          if (name === 'step1') throw new Error('compensate hook failed');
        },
      });

      saga.addStep(step('step1', { compensation: vi.fn() }));
      saga.addStep(
        step('step2', {
          action: async () => {
            throw new Error('fail');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('fail');
      expect(result.failedCompensations).toEqual(['step1']);
    });

    it('should return CompensationError when onCompensate hook fails with failOnHookError=true and continueOnCompensationError=false', async () => {
      const saga = new Saga<TestContext>({
        failOnHookError: true,
        continueOnCompensationError: false,
        onCompensate: (name) => {
          if (name === 'step1') throw new Error('compensate hook failed');
        },
      });

      saga.addStep(step('step1', { compensation: vi.fn() }));
      saga.addStep(
        step('step2', {
          action: async () => {
            throw new Error('fail');
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(CompensationError);
      expect(result.compensationFailedStep).toBe('step1');
    });
  });

  // ─── addStep, reset, getSteps ──────────────────────────────────

  describe('addStep / getSteps / reset', () => {
    it('should chain addStep calls', () => {
      const saga = new Saga<TestContext>();
      const returned = saga.addStep(step('a')).addStep(step('b'));
      expect(returned).toBe(saga);
      expect(saga.getSteps()).toHaveLength(2);
    });

    it('should return frozen copy of steps from getSteps', () => {
      const saga = new Saga<TestContext>();
      saga.addStep(step('a'));
      const steps = saga.getSteps();

      expect(Object.isFrozen(steps)).toBe(true);
      expect(steps).toHaveLength(1);
      expect(steps[0].name).toBe('a');
    });

    it('should handle non-Error throws by wrapping in Error', async () => {
      const saga = new Saga<TestContext>();
      saga.addStep(
        step('throws-string', {
          action: async () => {
            throw 'a string error';
          },
        }),
      );

      const result = await saga.execute(createContext());

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('a string error');
    });
  });
});
