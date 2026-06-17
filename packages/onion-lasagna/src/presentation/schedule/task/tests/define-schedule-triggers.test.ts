import { describe, it, expect } from 'vitest';
import { defineScheduleTriggers } from '../define-schedule-triggers';
import { isCronScheduleTrigger, isRateScheduleTrigger } from '../types';

describe('defineScheduleTriggers', () => {
  it('returns a frozen trigger map keyed by triggerId', () => {
    const triggers = defineScheduleTriggers({
      reconcileDaily: { type: 'billing.reconcile', cron: '0 2 * * *', timezone: 'UTC' },
      sweepFast: { type: 'outbox.sweep', rate: 'rate(1 minute)' },
    });
    expect(Object.isFrozen(triggers)).toBe(true);
    expect(triggers.reconcileDaily.type).toBe('billing.reconcile');
    expect(triggers.sweepFast.type).toBe('outbox.sweep');
  });

  it('distinguishes cron vs rate triggers via guards', () => {
    const triggers = defineScheduleTriggers({
      daily: { type: 'a', cron: '0 0 * * *' },
      fast: { type: 'b', rate: 'rate(5 minutes)' },
    });
    expect(isCronScheduleTrigger(triggers.daily)).toBe(true);
    expect(isRateScheduleTrigger(triggers.daily)).toBe(false);
    expect(isRateScheduleTrigger(triggers.fast)).toBe(true);
    expect(isCronScheduleTrigger(triggers.fast)).toBe(false);
  });

  it('freezes each individual trigger object', () => {
    const triggers = defineScheduleTriggers({
      daily: { type: 'a', cron: '0 0 * * *' },
    });
    expect(Object.isFrozen(triggers.daily)).toBe(true);
  });

  it('throws when a trigger has neither or both of cron/rate', () => {
    expect(() =>
      // @ts-expect-error — neither cron nor rate
      defineScheduleTriggers({ bad: { type: 'a' } }),
    ).toThrow(/exactly one of 'cron' or 'rate'/);
    expect(() =>
      // @ts-expect-error — both cron and rate
      defineScheduleTriggers({ bad: { type: 'a', cron: '* * * * *', rate: 'rate(1 minute)' } }),
    ).toThrow(/exactly one of 'cron' or 'rate'/);
  });
});
