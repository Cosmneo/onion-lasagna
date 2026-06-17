import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineScheduledTask } from '../define-scheduled-task';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

describe('defineScheduledTask', () => {
  it('creates a frozen task with the given type and no payload/context by default', () => {
    const task = defineScheduledTask({ type: 'billing.reconcile' });
    expect(task.type).toBe('billing.reconcile');
    expect(task.payload).toBeUndefined();
    expect(task.context).toBeUndefined();
    expect(Object.isFrozen(task)).toBe(true);
  });

  it('passes through the payload + context schemas', () => {
    const payload = zodSchema(z.object({ tenantId: z.string() }));
    const context = zodSchema(z.object({ runId: z.string() }));
    const task = defineScheduledTask({ type: 'x', payload, context });
    expect(task.payload).toBe(payload);
    expect(task.context).toBe(context);
  });

  it('carries docs metadata', () => {
    const task = defineScheduledTask({
      type: 'x',
      docs: { summary: 'Reconcile', tags: ['billing'], deprecated: true },
    });
    expect(task.docs.summary).toBe('Reconcile');
    expect(task.docs.tags).toEqual(['billing']);
    expect(task.docs.deprecated).toBe(true);
  });

  it('does not expose a schedule/cron field on the task contract', () => {
    const task = defineScheduledTask({ type: 'x' });
    expect('schedule' in task).toBe(false);
    expect('cron' in task).toBe(false);
  });
});
