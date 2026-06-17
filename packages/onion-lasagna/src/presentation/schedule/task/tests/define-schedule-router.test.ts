import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineScheduledTask } from '../define-scheduled-task';
import {
  defineScheduleRouter,
  mergeScheduleRouters,
} from '../define-schedule-router';
import { collectScheduledTasks } from '../types';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

const reconcile = defineScheduledTask({ type: 'billing.reconcile' });
const digest = defineScheduledTask({ type: 'billing.digest' });
const sweep = defineScheduledTask({ type: 'outbox.sweep' });

describe('defineScheduleRouter', () => {
  it('wraps tasks into a frozen router definition', () => {
    const router = defineScheduleRouter({ reconcile, digest });
    expect(router._isScheduleRouter).toBe(true);
    expect(Object.isFrozen(router)).toBe(true);
    const collected = collectScheduledTasks(router.tasks);
    expect(collected.map((c) => c.key).sort()).toEqual(['digest', 'reconcile']);
  });

  it('flattens nested routers into dotted keys', () => {
    const router = defineScheduleRouter({
      billing: { reconcile, digest },
      outbox: { sweep },
    });
    const keys = collectScheduledTasks(router.tasks)
      .map((c) => c.key)
      .sort();
    expect(keys).toEqual(['billing.digest', 'billing.reconcile', 'outbox.sweep']);
  });

  it('applies router defaults (context + tags) to child tasks', () => {
    const context = zodSchema(z.object({ runId: z.string() }));
    const router = defineScheduleRouter(
      { reconcile: defineScheduledTask({ type: 'x', docs: { tags: ['own'] } }) },
      { defaults: { context, tags: ['billing'] } },
    );
    const [{ task }] = collectScheduledTasks(router.tasks);
    expect(task.context).toBe(context);
    expect(task.docs.tags).toEqual(expect.arrayContaining(['billing', 'own']));
  });
});

describe('mergeScheduleRouters', () => {
  it('deep-merges multiple routers', () => {
    const a = defineScheduleRouter({ billing: { reconcile } });
    const b = defineScheduleRouter({ billing: { digest }, outbox: { sweep } });
    const merged = mergeScheduleRouters(a, b);
    const keys = collectScheduledTasks(merged.tasks)
      .map((c) => c.key)
      .sort();
    expect(keys).toEqual(['billing.digest', 'billing.reconcile', 'outbox.sweep']);
  });
});
