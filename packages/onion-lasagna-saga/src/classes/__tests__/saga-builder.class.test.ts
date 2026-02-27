import { describe, it, expect, vi } from 'vitest';
import { SagaBuilder, createSaga } from '../saga-builder.class';
import { Saga } from '../saga.class';

type TestContext = {
  log: string[];
};

describe('SagaBuilder', () => {
  it('should build a Saga instance', () => {
    const builder = new SagaBuilder<TestContext>();
    builder.step('step1', async (ctx) => {
      ctx.log.push('step1');
    });

    const saga = builder.build();

    expect(saga).toBeInstanceOf(Saga);
    expect(saga.getSteps()).toHaveLength(1);
    expect(saga.getSteps()[0].name).toBe('step1');
  });

  it('should chain steps fluently', () => {
    const builder = new SagaBuilder<TestContext>();

    const result = builder
      .step(
        'step1',
        async (ctx) => {
          ctx.log.push('step1');
        },
        async (ctx) => {
          ctx.log.push('step1:comp');
        },
      )
      .step('step2', async (ctx) => {
        ctx.log.push('step2');
      });

    expect(result).toBe(builder);
    expect(builder.build().getSteps()).toHaveLength(2);
  });

  it('should pass step options (retry, compensationRetry, timeouts)', () => {
    const builder = new SagaBuilder<TestContext>();

    builder.step(
      'withOptions',
      async () => {},
      async () => {},
      {
        retry: { maxAttempts: 3, backoffMs: 100 },
        compensationRetry: { maxAttempts: 2 },
        actionTimeoutMs: 5000,
        compensationTimeoutMs: 3000,
      },
    );

    const steps = builder.build().getSteps();
    expect(steps[0].retry).toEqual({ maxAttempts: 3, backoffMs: 100 });
    expect(steps[0].compensationRetry).toEqual({ maxAttempts: 2 });
    expect(steps[0].actionTimeoutMs).toBe(5000);
    expect(steps[0].compensationTimeoutMs).toBe(3000);
  });

  it('should execute the saga directly without build()', async () => {
    const builder = new SagaBuilder<TestContext>();

    builder
      .step('step1', async (ctx) => {
        ctx.log.push('step1');
      })
      .step('step2', async (ctx) => {
        ctx.log.push('step2');
      });

    const result = await builder.execute({ log: [] });

    expect(result.success).toBe(true);
    expect(result.context.log).toEqual(['step1', 'step2']);
    expect(result.completedSteps).toEqual(['step1', 'step2']);
  });

  it('should pass options to the underlying Saga', async () => {
    const onStepComplete = vi.fn();
    const builder = new SagaBuilder<TestContext>({ onStepComplete });

    builder.step('step1', async (ctx) => {
      ctx.log.push('step1');
    });

    await builder.execute({ log: [] });

    expect(onStepComplete).toHaveBeenCalledWith('step1');
  });

  it('should handle compensation via execute()', async () => {
    const compensated: string[] = [];
    const builder = new SagaBuilder<TestContext>();

    builder
      .step(
        'step1',
        async (ctx) => {
          ctx.log.push('step1');
        },
        async () => {
          compensated.push('step1:comp');
        },
      )
      .step('step2', async () => {
        throw new Error('fail');
      });

    const result = await builder.execute({ log: [] });

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('step2');
    expect(result.compensatedSteps).toEqual(['step1']);
    expect(compensated).toEqual(['step1:comp']);
  });
});

describe('createSaga', () => {
  it('should return a SagaBuilder', () => {
    const builder = createSaga<TestContext>();
    expect(builder).toBeInstanceOf(SagaBuilder);
  });

  it('should allow full fluent usage with createSaga', async () => {
    const result = await createSaga<TestContext>()
      .step('step1', async (ctx) => {
        ctx.log.push('first');
      })
      .step('step2', async (ctx) => {
        ctx.log.push('second');
      })
      .execute({ log: [] });

    expect(result.success).toBe(true);
    expect(result.context.log).toEqual(['first', 'second']);
  });

  it('should pass options through createSaga', async () => {
    const onStepComplete = vi.fn();

    await createSaga<TestContext>({ onStepComplete })
      .step('a', async () => {})
      .step('b', async () => {})
      .execute({ log: [] });

    expect(onStepComplete).toHaveBeenCalledTimes(2);
    expect(onStepComplete).toHaveBeenCalledWith('a');
    expect(onStepComplete).toHaveBeenCalledWith('b');
  });

  it('should work end-to-end with compensation', async () => {
    const result = await createSaga<TestContext>()
      .step(
        'createOrder',
        async (ctx) => {
          ctx.log.push('order created');
        },
        async (ctx) => {
          ctx.log.push('order rolled back');
        },
      )
      .step(
        'processPayment',
        async (ctx) => {
          ctx.log.push('payment processed');
        },
        async (ctx) => {
          ctx.log.push('payment refunded');
        },
      )
      .step('sendNotification', async () => {
        throw new Error('email service down');
      })
      .execute({ log: [] });

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('sendNotification');
    expect(result.compensatedSteps).toEqual(['processPayment', 'createOrder']);
    expect(result.context.log).toEqual([
      'order created',
      'payment processed',
      'payment refunded',
      'order rolled back',
    ]);
  });
});
