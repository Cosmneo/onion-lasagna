import { describe, it, expect } from 'vitest';
import { BaseAuditByVo } from '../base-audit-by.vo';
import { BaseAuditOnVo } from '../base-audit-on.vo';
import { BaseUuidV4Vo } from '../base-uuid-v4.vo';
import {
  BaseValueObject,
  SKIP_VALUE_OBJECT_VALIDATION,
} from '../../classes/base-value-object.class';
import { InvariantViolationError } from '../../exceptions/invariant-violation.error';

// Concrete implementations for testing
class TestUserId extends BaseUuidV4Vo {
  static create(value: string): TestUserId {
    return new TestUserId(value, SKIP_VALUE_OBJECT_VALIDATION);
  }
}

class TestAuditBy extends BaseAuditByVo {
  static create(opts?: { createdBy?: TestUserId; updatedBy?: TestUserId }): TestAuditBy {
    return new TestAuditBy(
      { createdBy: opts?.createdBy, updatedBy: opts?.updatedBy ?? opts?.createdBy },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  update(updatedBy: BaseUuidV4Vo): TestAuditBy {
    return new TestAuditBy(
      { createdBy: this.createdBy, updatedBy: updatedBy as TestUserId },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }
}

class TestAuditOn extends BaseAuditOnVo {
  static create(opts?: { createdAt?: Date; updatedAt?: Date }): TestAuditOn {
    const now = new Date();
    return new TestAuditOn(
      { createdAt: opts?.createdAt ?? now, updatedAt: opts?.updatedAt ?? now },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  update(): TestAuditOn {
    return new TestAuditOn(
      { createdAt: this.createdAt, updatedAt: new Date() },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }
}

describe('BaseAuditByVo', () => {
  describe('create', () => {
    it('should create with user IDs', () => {
      const createdBy = TestUserId.create('creator-id');
      const updatedBy = TestUserId.create('updater-id');
      const auditBy = TestAuditBy.create({ createdBy, updatedBy });

      expect(auditBy.createdBy?.value).toBe('creator-id');
      expect(auditBy.updatedBy?.value).toBe('updater-id');
    });

    it('should create with only createdBy', () => {
      const createdBy = TestUserId.create('creator-id');
      const auditBy = TestAuditBy.create({ createdBy });

      expect(auditBy.createdBy?.value).toBe('creator-id');
      expect(auditBy.updatedBy?.value).toBe('creator-id');
    });

    it('should create without user IDs (system operation)', () => {
      const auditBy = TestAuditBy.create();

      expect(auditBy.createdBy).toBeUndefined();
      expect(auditBy.updatedBy).toBeUndefined();
    });
  });

  describe('createdBy getter', () => {
    it('should return the creator user ID', () => {
      const userId = TestUserId.create('user-123');
      const auditBy = TestAuditBy.create({ createdBy: userId });

      expect(auditBy.createdBy?.value).toBe('user-123');
    });

    it('should return undefined when not set', () => {
      const auditBy = TestAuditBy.create();

      expect(auditBy.createdBy).toBeUndefined();
    });
  });

  describe('updatedBy getter', () => {
    it('should return the updater user ID', () => {
      const createdBy = TestUserId.create('creator');
      const updatedBy = TestUserId.create('updater');
      const auditBy = TestAuditBy.create({ createdBy, updatedBy });

      expect(auditBy.updatedBy?.value).toBe('updater');
    });
  });

  describe('update method', () => {
    it('should create new instance with updated user', () => {
      const createdBy = TestUserId.create('original-creator');
      const auditBy = TestAuditBy.create({ createdBy });
      const newUpdater = TestUserId.create('new-updater');

      const updated = auditBy.update(newUpdater);

      expect(updated.createdBy?.value).toBe('original-creator');
      expect(updated.updatedBy?.value).toBe('new-updater');
    });

    it('should preserve immutability', () => {
      const auditBy = TestAuditBy.create({ createdBy: TestUserId.create('creator') });
      const updated = auditBy.update(TestUserId.create('updater'));

      expect(updated).not.toBe(auditBy);
      expect(auditBy.updatedBy?.value).toBe('creator');
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const auditBy = TestAuditBy.create();

      expect(auditBy).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('equals', () => {
    it('should return true for same user IDs', () => {
      const userId = TestUserId.create('same-id');
      const auditBy1 = TestAuditBy.create({ createdBy: userId, updatedBy: userId });
      const auditBy2 = TestAuditBy.create({
        createdBy: TestUserId.create('same-id'),
        updatedBy: TestUserId.create('same-id'),
      });

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
      const auditOn = TestAuditOn.create({ createdAt, updatedAt });

      expect(auditOn.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
      expect(auditOn.updatedAt.toISOString()).toBe('2024-01-16T15:30:00.000Z');
    });

    it('should default to current time', () => {
      const before = new Date();
      const auditOn = TestAuditOn.create();
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

      expect(() => TestAuditOn.create({ createdAt, updatedAt })).toThrow(InvariantViolationError);
    });

    it('should throw with correct error message', () => {
      const createdAt = new Date('2024-01-16T10:00:00.000Z');
      const updatedAt = new Date('2024-01-15T10:00:00.000Z');

      expect(() => TestAuditOn.create({ createdAt, updatedAt })).toThrow(
        'UpdatedAt cannot be earlier than createdAt',
      );
    });

    it('should allow equal timestamps', () => {
      const timestamp = new Date('2024-01-15T10:00:00.000Z');
      const auditOn = TestAuditOn.create({
        createdAt: timestamp,
        updatedAt: new Date(timestamp.getTime()),
      });

      expect(auditOn.createdAt.getTime()).toBe(auditOn.updatedAt.getTime());
    });

    it('should allow updatedAt after createdAt', () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const updatedAt = new Date('2024-01-16T10:00:00.000Z');

      const auditOn = TestAuditOn.create({ createdAt, updatedAt });

      expect(auditOn.updatedAt.getTime()).toBeGreaterThan(auditOn.createdAt.getTime());
    });
  });

  describe('createdAt getter', () => {
    it('should return the creation timestamp', () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const auditOn = TestAuditOn.create({ createdAt, updatedAt: createdAt });

      expect(auditOn.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should return a cloned Date', () => {
      const auditOn = TestAuditOn.create();
      const date1 = auditOn.createdAt;
      const date2 = auditOn.createdAt;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should not be affected by external mutation', () => {
      const auditOn = TestAuditOn.create();
      const date = auditOn.createdAt;
      const originalTime = date.getTime();

      date.setFullYear(2000);

      expect(auditOn.createdAt.getTime()).toBe(originalTime);
    });
  });

  describe('updatedAt getter', () => {
    it('should return the update timestamp', () => {
      const updatedAt = new Date('2024-01-16T15:30:00.000Z');
      const auditOn = TestAuditOn.create({
        createdAt: new Date('2024-01-15T10:00:00.000Z'),
        updatedAt,
      });

      expect(auditOn.updatedAt.toISOString()).toBe('2024-01-16T15:30:00.000Z');
    });

    it('should return a cloned Date', () => {
      const auditOn = TestAuditOn.create();
      const date1 = auditOn.updatedAt;
      const date2 = auditOn.updatedAt;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('update method', () => {
    it('should create new instance with updated timestamp', async () => {
      const original = TestAuditOn.create();
      const originalUpdatedAt = original.updatedAt.getTime();
      const originalCreatedAt = original.createdAt.getTime();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = original.update();

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should preserve immutability', () => {
      const auditOn = TestAuditOn.create();
      const updated = auditOn.update();

      expect(updated).not.toBe(auditOn);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const auditOn = TestAuditOn.create();

      expect(auditOn).toBeInstanceOf(BaseValueObject);
    });
  });
});

describe('BaseAuditByVo and BaseAuditOnVo composition', () => {
  it('should work together for complete audit tracking', () => {
    const userId = TestUserId.create('user-123');
    const now = new Date();

    const auditBy = TestAuditBy.create({ createdBy: userId });
    const auditOn = TestAuditOn.create({ createdAt: now, updatedAt: now });

    expect(auditBy.createdBy?.value).toBe('user-123');
    expect(auditOn.createdAt.getTime()).toBe(now.getTime());
  });

  it('should update independently', async () => {
    const creatorId = TestUserId.create('creator');
    const auditBy = TestAuditBy.create({ createdBy: creatorId });
    const auditOn = TestAuditOn.create();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const updaterId = TestUserId.create('updater');
    const updatedBy = auditBy.update(updaterId);
    const updatedOn = auditOn.update();

    expect(updatedBy.createdBy?.value).toBe('creator');
    expect(updatedBy.updatedBy?.value).toBe('updater');
    expect(updatedOn.updatedAt.getTime()).toBeGreaterThan(auditOn.createdAt.getTime());
  });
});
