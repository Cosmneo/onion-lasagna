import { describe, it, expect, vi } from 'vitest';
import {
  indexScheduleRoutes,
  findScheduleRoute,
  invokeScheduledTask,
  resolveScheduleTrigger,
} from '../invoke';
import { defineScheduleTriggers } from '../../task/define-schedule-triggers';
import type { RawSchedule, UnifiedScheduleInput } from '../types';

function route(type: string, result = { outcome: 'completed' as const }): UnifiedScheduleInput {
  return { type, handler: vi.fn().mockResolvedValue(result), metadata: {} };
}

function rawSchedule(type: string): RawSchedule {
  return {
    type,
    payload: {},
    metadata: { runId: 'r', scheduledFor: '2026-01-01T00:00:00Z', firedAt: '2026-01-01T00:00:00Z' },
  };
}

describe('indexScheduleRoutes', () => {
  it('indexes routes by type', () => {
    const idx = indexScheduleRoutes([route('a'), route('b')]);
    expect(idx.size).toBe(2);
    expect(idx.get('a')?.type).toBe('a');
  });

  it('throws on a duplicate type (one task per type — no fan-out)', () => {
    expect(() => indexScheduleRoutes([route('a'), route('a')])).toThrow(/Duplicate scheduled task type/);
  });
});

describe('findScheduleRoute', () => {
  it('finds by type or returns undefined', () => {
    const routes = [route('a'), route('b')];
    expect(findScheduleRoute(routes, 'b')?.type).toBe('b');
    expect(findScheduleRoute(routes, 'zzz')).toBeUndefined();
  });
});

describe('invokeScheduledTask', () => {
  it('invokes the matching task handler', async () => {
    const routes = [route('a', { outcome: 'completed' })];
    const res = await invokeScheduledTask(routes, rawSchedule('a'));
    expect(res).toEqual({ outcome: 'completed' });
    expect(routes[0]!.handler).toHaveBeenCalledTimes(1);
  });

  it('returns FAILED (not throw) when no task matches the type', async () => {
    const res = await invokeScheduledTask([route('a')], rawSchedule('missing'));
    expect(res.outcome).toBe('failed');
    if (res.outcome === 'failed') expect(res.reason).toContain('missing');
  });
});

describe('resolveScheduleTrigger', () => {
  const triggers = defineScheduleTriggers({
    reconcileDaily: { type: 'billing.reconcile', cron: '0 2 * * *' },
    sweepFast: { type: 'outbox.sweep', rate: 'rate(1 minute)' },
  });

  it('resolves by triggerId', () => {
    expect(resolveScheduleTrigger(triggers, 'reconcileDaily')?.type).toBe('billing.reconcile');
  });

  it('falls back to matching a cron expression', () => {
    expect(resolveScheduleTrigger(triggers, '0 2 * * *')?.type).toBe('billing.reconcile');
  });

  it('falls back to matching a rate expression', () => {
    expect(resolveScheduleTrigger(triggers, 'rate(1 minute)')?.type).toBe('outbox.sweep');
  });

  it('returns undefined when nothing matches', () => {
    expect(resolveScheduleTrigger(triggers, 'nope')).toBeUndefined();
  });

  it('prefers a direct triggerId match over an expression match', () => {
    const colliding = defineScheduleTriggers({
      // triggerId literally equals the other trigger's cron expression
      '0 2 * * *': { type: 'matched.by.id', rate: 'rate(1 minute)' },
      daily: { type: 'matched.by.expression', cron: '0 2 * * *' },
    });
    expect(resolveScheduleTrigger(colliding, '0 2 * * *')?.type).toBe('matched.by.id');
  });
});
