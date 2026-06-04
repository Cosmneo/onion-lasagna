import { describe, it, expect } from 'vitest';
import { BaseAuditByVo } from '../base-audit-by.vo';
import { BaseAuditOnVo } from '../base-audit-on.vo';
import { BaseUuidV4Vo } from '../base-uuid-v4.vo';
import { BaseValueObject } from '../../classes/base-value-object.class';
import { InvariantViolationError } from '../../exceptions/invariant-violation.error';

describe('BaseAuditByVo', () => {
  describe('create', () => {
    it('should create with user IDs', () => {
      const createdBy = BaseUuidV4Vo.generate();
      const updatedBy = BaseUuidV4Vo.generate();
      const auditBy = BaseAuditByVo.create({ createdBy, updatedBy });

      expect(auditBy.createdBy?.value).toBe(createdBy.value);
      expect(auditBy.updatedBy?.value).toBe(updatedBy.value);
    });

    it('should create with only createdBy', () => {
      const createdBy = BaseUuidV4Vo.generate();
      const auditBy = BaseAuditByVo.create({ createdBy });

      expect(auditBy.createdBy?.value).toBe(createdBy.value);
      expect(auditBy.updatedBy?.value).toBe(createdBy.value);
    });

    it('should create without user IDs (system operation)', () => {
      const auditBy = BaseAuditByVo.create({});

      expect(auditBy.createdBy).toBeUndefined();
      expect(auditBy.updatedBy).toBeUndefined();
    });
  });

  describe('createdBy getter', () => {
    it('should return the creator user ID', () => {
      const userId = BaseUuidV4Vo.generate();
      const auditBy = BaseAuditByVo.create({ createdBy: userId });

      expect(auditBy.createdBy?.value).toBe(userId.value);
    });

    it('should return undefined when not set', () => {
      const auditBy = BaseAuditByVo.create({});

      expect(auditBy.createdBy).toBeUndefined();
    });
  });

  describe('updatedBy getter', () => {
    it('should return the updater user ID', () => {
      const createdBy = BaseUuidV4Vo.generate();
      const updatedBy = BaseUuidV4Vo.generate();
      const auditBy = BaseAuditByVo.create({ createdBy, updatedBy });

      expect(auditBy.updatedBy?.value).toBe(updatedBy.value);
    });
  });

  describe('update method', () => {
    it('should create new instance with updated user', () => {
      const createdBy = BaseUuidV4Vo.generate();
      const auditBy = BaseAuditByVo.create({ createdBy });
      const newUpdater = BaseUuidV4Vo.generate();

      const updated = auditBy.update(newUpdater);

      expect(updated.createdBy?.value).toBe(createdBy.value);
      expect(updated.updatedBy?.value).toBe(newUpdater.value);
    });

    it('should preserve immutability', () => {
      const createdBy = BaseUuidV4Vo.generate();
      const auditBy = BaseAuditByVo.create({ createdBy });
      const updater = BaseUuidV4Vo.generate();

      const updated = auditBy.update(updater);

      expect(updated).not.toBe(auditBy);
      expect(auditBy.updatedBy?.value).toBe(createdBy.value);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const auditBy = BaseAuditByVo.create({});

      expect(auditBy).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('equals', () => {
    it('should return true for same user IDs', () => {
      const userId = BaseUuidV4Vo.generate();
      const auditBy1 = BaseAuditByVo.create({ createdBy: userId, updatedBy: userId });
      const auditBy2 = BaseAuditByVo.create({ createdBy: userId, updatedBy: userId });

      // Note: equals compares by value, deep equality
      expect(auditBy1.value.createdBy?.value).toBe(auditBy2.value.createdBy?.value);
    });
  });
});

describe('BaseAuditOnVo', () => {
  describe('create', () => {
    it('should create with timestamps', () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const updatedAt = new Date('2024-01-16T15:30:00.000Z');
      const auditOn = BaseAuditOnVo.create({ createdAt, updatedAt });

      expect(auditOn.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
      expect(auditOn.updatedAt.toISOString()).toBe('2024-01-16T15:30:00.000Z');
    });
  });

  describe('now factory', () => {
    it('should create with current time', () => {
      const before = new Date();
      const auditOn = BaseAuditOnVo.now();
      const after = new Date();

      expect(auditOn.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(auditOn.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(auditOn.updatedAt.getTime()).toBe(auditOn.createdAt.getTime());
    });
  });

  describe('domain invariant', () => {
    it('should throw when updatedAt is before createdAt', () => {
      const createdAt = new Date('2024-01-16T10:00:00.000Z');
      const updatedAt = new Date('2024-01-15T10:00:00.000Z'); // Before createdAt

      expect(() => BaseAuditOnVo.create({ createdAt, updatedAt })).toThrow(InvariantViolationError);
    });

    it('should throw with correct error message', () => {
      const createdAt = new Date('2024-01-16T10:00:00.000Z');
      const updatedAt = new Date('2024-01-15T10:00:00.000Z');

      expect(() => BaseAuditOnVo.create({ createdAt, updatedAt })).toThrow(
        'UpdatedAt cannot be earlier than createdAt',
      );
    });

    it('should allow equal timestamps', () => {
      const timestamp = new Date('2024-01-15T10:00:00.000Z');
      const auditOn = BaseAuditOnVo.create({
        createdAt: timestamp,
        updatedAt: new Date(timestamp.getTime()),
      });

      expect(auditOn.createdAt.getTime()).toBe(auditOn.updatedAt.getTime());
    });

    it('should allow updatedAt after createdAt', () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const updatedAt = new Date('2024-01-16T10:00:00.000Z');

      const auditOn = BaseAuditOnVo.create({ createdAt, updatedAt });

      expect(auditOn.updatedAt.getTime()).toBeGreaterThan(auditOn.createdAt.getTime());
    });
  });

  describe('createdAt getter', () => {
    it('should return the creation timestamp', () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const auditOn = BaseAuditOnVo.create({ createdAt, updatedAt: createdAt });

      expect(auditOn.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should return a cloned Date', () => {
      const auditOn = BaseAuditOnVo.now();
      const date1 = auditOn.createdAt;
      const date2 = auditOn.createdAt;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should not be affected by external mutation', () => {
      const auditOn = BaseAuditOnVo.now();
      const date = auditOn.createdAt;
      const originalTime = date.getTime();

      date.setFullYear(2000);

      expect(auditOn.createdAt.getTime()).toBe(originalTime);
    });
  });

  describe('updatedAt getter', () => {
    it('should return the update timestamp', () => {
      const updatedAt = new Date('2024-01-16T15:30:00.000Z');
      const auditOn = BaseAuditOnVo.create({
        createdAt: new Date('2024-01-15T10:00:00.000Z'),
        updatedAt,
      });

      expect(auditOn.updatedAt.toISOString()).toBe('2024-01-16T15:30:00.000Z');
    });

    it('should return a cloned Date', () => {
      const auditOn = BaseAuditOnVo.now();
      const date1 = auditOn.updatedAt;
      const date2 = auditOn.updatedAt;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('update method', () => {
    it('should create new instance with updated timestamp', async () => {
      const original = BaseAuditOnVo.now();
      const originalUpdatedAt = original.updatedAt.getTime();
      const originalCreatedAt = original.createdAt.getTime();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = original.update();

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should preserve immutability', () => {
      const auditOn = BaseAuditOnVo.now();
      const updated = auditOn.update();

      expect(updated).not.toBe(auditOn);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const auditOn = BaseAuditOnVo.now();

      expect(auditOn).toBeInstanceOf(BaseValueObject);
    });
  });
});

describe('BaseAuditOnVo additional invariants', () => {
  // C01-3: create()/now() must clone input Dates at construction
  it('mutating the Date passed to create() should not affect stored value (C01-3)', () => {
    const createdAt = new Date('2024-01-15T10:00:00.000Z');
    const updatedAt = new Date('2024-01-16T10:00:00.000Z');
    const auditOn = BaseAuditOnVo.create({ createdAt, updatedAt });

    const expectedCreated = createdAt.getTime();
    const expectedUpdated = updatedAt.getTime();

    // Mutate caller Dates after construction
    createdAt.setFullYear(1999);
    updatedAt.setFullYear(1999);

    expect(auditOn.createdAt.getTime()).toBe(expectedCreated);
    expect(auditOn.updatedAt.getTime()).toBe(expectedUpdated);
  });

  it('mutating the Date accessed via .value should not affect stored value (C01-3 / C01-1)', () => {
    const auditOn = BaseAuditOnVo.now();
    const expectedCreated = auditOn.createdAt.getTime();

    const leaked = auditOn.value as { createdAt: Date; updatedAt: Date };
    leaked.createdAt.setFullYear(1999);

    expect(auditOn.createdAt.getTime()).toBe(expectedCreated);
  });

  // C01-6: update() must honour the updatedAt >= createdAt invariant
  it('update() should throw InvariantViolationError if a mocked "now" would produce updatedAt < createdAt', () => {
    // We patch global.Date so that new Date() (no args) returns a time in the past,
    // then verify that update() — which calls create() — correctly throws.
    const OriginalDate = global.Date;
    const pastTime = new OriginalDate('2000-01-01T00:00:00.000Z');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockDate = function MockDate(...args: any[]) {
      if (args.length === 0) {
        return new OriginalDate(pastTime.getTime());
      }
       
      return new OriginalDate(...(args as [string]));
    } as unknown as typeof Date;
    MockDate.now = () => pastTime.getTime();
    MockDate.parse = OriginalDate.parse;
    MockDate.UTC = OriginalDate.UTC;
    Object.setPrototypeOf(MockDate.prototype, OriginalDate.prototype);
    global.Date = MockDate;

    try {
      // original was created with a future createdAt (using OriginalDate to bypass mock)
      const futureDate = new OriginalDate('2024-01-15T10:00:00.000Z');
      const original = BaseAuditOnVo.create({
        createdAt: futureDate,
        updatedAt: futureDate,
      });

      // Now calling update() will produce new Date() = pastTime (< createdAt)
      // With the fix (routed through create()), it should throw
      expect(() => original.update()).toThrow();
    } finally {
      global.Date = OriginalDate;
    }
  });
});

describe('BaseAuditByVo and BaseAuditOnVo composition', () => {
  it('should work together for complete audit tracking', () => {
    const userId = BaseUuidV4Vo.generate();
    const now = new Date();

    const auditBy = BaseAuditByVo.create({ createdBy: userId });
    const auditOn = BaseAuditOnVo.create({ createdAt: now, updatedAt: now });

    expect(auditBy.createdBy?.value).toBe(userId.value);
    expect(auditOn.createdAt.getTime()).toBe(now.getTime());
  });

  it('should update independently', async () => {
    const creatorId = BaseUuidV4Vo.generate();
    const auditBy = BaseAuditByVo.create({ createdBy: creatorId });
    const auditOn = BaseAuditOnVo.now();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const updaterId = BaseUuidV4Vo.generate();
    const updatedBy = auditBy.update(updaterId);
    const updatedOn = auditOn.update();

    expect(updatedBy.createdBy?.value).toBe(creatorId.value);
    expect(updatedBy.updatedBy?.value).toBe(updaterId.value);
    expect(updatedOn.updatedAt.getTime()).toBeGreaterThan(auditOn.createdAt.getTime());
  });
});
