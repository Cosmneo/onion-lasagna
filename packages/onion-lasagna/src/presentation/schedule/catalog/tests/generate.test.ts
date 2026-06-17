import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineScheduledTask } from '../../task/define-scheduled-task';
import { defineScheduleRouter } from '../../task/define-schedule-router';
import { defineScheduleTriggers } from '../../task/define-schedule-triggers';
import { generateScheduleCatalog } from '../generate';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

const reconcile = defineScheduledTask({
  type: 'billing.reconcile',
  payload: zodSchema(z.object({ tenantId: z.string() })),
  docs: { summary: 'Reconcile' },
});
const sweep = defineScheduledTask({ type: 'outbox.sweep' });

describe('generateScheduleCatalog', () => {
  it('produces a task + trigger inventory', () => {
    const router = defineScheduleRouter({ billing: { reconcile }, outbox: { sweep } });
    const triggers = defineScheduleTriggers({
      reconcileDaily: { type: 'billing.reconcile', cron: '0 2 * * *', timezone: 'UTC' },
      sweepFast: { type: 'outbox.sweep', rate: 'rate(1 minute)' },
    });
    const catalog = generateScheduleCatalog(router, triggers);

    expect(catalog.tasks.map((t) => t.type).sort()).toEqual(['billing.reconcile', 'outbox.sweep']);
    const recon = catalog.tasks.find((t) => t.type === 'billing.reconcile')!;
    expect(recon.key).toBe('billing.reconcile');
    expect(recon.hasPayload).toBe(true);
    expect(recon.docs.summary).toBe('Reconcile');

    const cronTrigger = catalog.triggers.find((t) => t.triggerId === 'reconcileDaily')!;
    expect(cronTrigger.cron).toBe('0 2 * * *');
    expect(cronTrigger.timezone).toBe('UTC');
    const rateTrigger = catalog.triggers.find((t) => t.triggerId === 'sweepFast')!;
    expect(rateTrigger.rate).toBe('rate(1 minute)');
  });

  it('accepts a plain router config (not only a definition)', () => {
    const catalog = generateScheduleCatalog({ reconcile });
    expect(catalog.tasks).toHaveLength(1);
    expect(catalog.triggers).toHaveLength(0);
  });

  it('throws on a duplicate task type', () => {
    const a = defineScheduledTask({ type: 'dup' });
    const b = defineScheduledTask({ type: 'dup' });
    expect(() => generateScheduleCatalog({ a, b })).toThrow(/Duplicate scheduled task type/);
  });

  it('throws when a trigger references an unknown task type', () => {
    const triggers = defineScheduleTriggers({
      ghost: { type: 'does.not.exist', cron: '* * * * *' },
    });
    expect(() => generateScheduleCatalog(defineScheduleRouter({ reconcile }), triggers)).toThrow(
      /references unknown task type/,
    );
  });
});
