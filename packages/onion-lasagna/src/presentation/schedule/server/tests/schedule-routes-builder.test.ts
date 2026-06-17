import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineScheduledTask } from '../../task/define-scheduled-task';
import { defineScheduleRouter } from '../../task/define-schedule-router';
import { scheduleRoutes } from '../schedule-routes-builder';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';
import type { RawSchedule } from '../types';
import { UseCaseError } from '../../../../app/exceptions/use-case.error';
import { InfraError } from '../../../../infra/exceptions/infra.error';

function rawSchedule(overrides: Partial<RawSchedule> = {}): RawSchedule {
  return {
    type: 'billing.reconcile',
    payload: {},
    metadata: {
      runId: 'run_1',
      scheduledFor: '2026-01-01T00:00:00Z',
      firedAt: '2026-01-01T00:00:01Z',
    },
    ...overrides,
  };
}

const reconcile = defineScheduledTask({ type: 'billing.reconcile' });

describe('scheduleRoutes builder', () => {
  it('builds a UnifiedScheduleInput for a simple handler returning completed', async () => {
    const router = defineScheduleRouter({ reconcile });
    const routes = scheduleRoutes(router)
      .handle('reconcile', async () => ({ outcome: 'completed' as const }))
      .build();
    expect(routes).toHaveLength(1);
    expect(routes[0]!.type).toBe('billing.reconcile');
    await expect(routes[0]!.handler(rawSchedule())).resolves.toEqual({ outcome: 'completed' });
  });

  it('runs the use-case pipeline (payloadMapper -> useCase -> resultMapper)', async () => {
    const task = defineScheduledTask({
      type: 'billing.reconcile',
      payload: zodSchema(z.object({ tenantId: z.string() })),
    });
    const execute = vi.fn().mockResolvedValue({ processed: 3 });
    const routes = scheduleRoutes(defineScheduleRouter({ reconcile: task }))
      .handleWithUseCase('reconcile', {
        payloadMapper: (s) => ({ tenantId: s.payload.tenantId }),
        useCase: { execute },
        resultMapper: (out) =>
          out.processed > 0
            ? { outcome: 'completed' }
            : { outcome: 'skipped', reason: 'nothing due' },
      })
      .build();
    const res = await routes[0]!.handler(rawSchedule({ payload: { tenantId: 't1' } }));
    expect(execute).toHaveBeenCalledWith({ tenantId: 't1' });
    expect(res).toEqual({ outcome: 'completed' });
  });

  it('defaults to completed when no resultMapper is given', async () => {
    const routes = scheduleRoutes(defineScheduleRouter({ reconcile }))
      .handleWithUseCase('reconcile', {
        payloadMapper: () => ({}),
        useCase: { execute: vi.fn().mockResolvedValue(undefined) },
      })
      .build();
    await expect(routes[0]!.handler(rawSchedule())).resolves.toEqual({ outcome: 'completed' });
  });

  it('maps an invalid payload to FAILED (never skipped)', async () => {
    const task = defineScheduledTask({
      type: 'billing.reconcile',
      payload: zodSchema(z.object({ tenantId: z.string() })),
    });
    const routes = scheduleRoutes(defineScheduleRouter({ reconcile: task }))
      .handle('reconcile', async () => ({ outcome: 'completed' as const }))
      .build();
    const res = await routes[0]!.handler(rawSchedule({ payload: { tenantId: 123 } }));
    expect(res.outcome).toBe('failed');
    if (res.outcome === 'failed') expect(res.reason).toContain('Payload validation failed');
  });

  it('skips payload validation when validatePayload is false', async () => {
    const task = defineScheduledTask({
      type: 'billing.reconcile',
      payload: zodSchema(z.object({ tenantId: z.string() })),
    });
    const routes = scheduleRoutes(defineScheduleRouter({ reconcile: task }))
      .handle('reconcile', async () => ({ outcome: 'completed' as const }))
      .build({ validatePayload: false });
    await expect(routes[0]!.handler(rawSchedule({ payload: {} }))).resolves.toEqual({
      outcome: 'completed',
    });
  });

  it('maps a thrown UseCaseError to FAILED and an InfraError to RETRY', async () => {
    const failRoutes = scheduleRoutes(defineScheduleRouter({ reconcile }))
      .handle('reconcile', async () => {
        throw new UseCaseError({ message: 'bad input' });
      })
      .build();
    expect((await failRoutes[0]!.handler(rawSchedule())).outcome).toBe('failed');

    const retryRoutes = scheduleRoutes(defineScheduleRouter({ reconcile }))
      .handle('reconcile', async () => {
        throw new InfraError({ message: 'db down' });
      })
      .build();
    expect((await retryRoutes[0]!.handler(rawSchedule())).outcome).toBe('retry');
  });

  it('runs middleware around the handler in order', async () => {
    const order: string[] = [];
    const routes = scheduleRoutes(defineScheduleRouter({ reconcile }))
      .handle('reconcile', async () => {
        order.push('handler');
        return { outcome: 'completed' as const };
      })
      .build({
        middleware: [
          async (_raw, next) => {
            order.push('mw:before');
            const r = await next();
            order.push('mw:after');
            return r;
          },
        ],
      });
    await routes[0]!.handler(rawSchedule());
    expect(order).toEqual(['mw:before', 'handler', 'mw:after']);
  });

  it('buildPartial allows wiring only some tasks', () => {
    const router = defineScheduleRouter({ reconcile, digest: defineScheduledTask({ type: 'billing.digest' }) });
    const routes = scheduleRoutes(router)
      .handle('reconcile', async () => ({ outcome: 'completed' as const }))
      .buildPartial();
    expect(routes).toHaveLength(1);
    expect(routes[0]!.type).toBe('billing.reconcile');
  });

  it('maps a context-validation failure to FAILED', async () => {
    const task = defineScheduledTask({
      type: 'billing.reconcile',
      context: zodSchema(z.object({ runId: z.string(), tenantId: z.string() })),
    });
    const routes = scheduleRoutes(defineScheduleRouter({ reconcile: task }))
      .handle('reconcile', async () => ({ outcome: 'completed' as const }))
      .build();
    // metadata has runId but not tenantId -> context validation fails
    const res = await routes[0]!.handler(rawSchedule());
    expect(res.outcome).toBe('failed');
  });

  it('allows middleware to short-circuit with an explicit skipped outcome', async () => {
    const handler = vi.fn();
    const routes = scheduleRoutes(defineScheduleRouter({ reconcile }))
      .handle('reconcile', handler)
      .build({
        middleware: [async () => ({ outcome: 'skipped' as const, reason: 'locked' })],
      });
    const res = await routes[0]!.handler(rawSchedule());
    expect(res).toEqual({ outcome: 'skipped', reason: 'locked' });
    expect(handler).not.toHaveBeenCalled();
  });
});
