import { describe, it, expect } from 'vitest';
import { BaseAuditInfoVo } from '../base-audit-info.vo';
import { BaseAuditByVo } from '../base-audit-by.vo';
import { BaseAuditOnVo } from '../base-audit-on.vo';
import { BaseUuidV4Vo } from '../base-uuid-v4.vo';
import {
  BaseValueObject,
  SKIP_VALUE_OBJECT_VALIDATION,
} from '../../classes/base-value-object.class';

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

class TestAuditInfo extends BaseAuditInfoVo {
  static create(createdBy?: TestUserId): TestAuditInfo {
    const now = new Date();
    return new TestAuditInfo(
      {
        by: TestAuditBy.create({ createdBy, updatedBy: createdBy }),
        on: TestAuditOn.create({ createdAt: now, updatedAt: now }),
      },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  static fromPersistence(
    by: { createdBy?: TestUserId; updatedBy?: TestUserId },
    on: { createdAt: Date; updatedAt: Date },
  ): TestAuditInfo {
    return new TestAuditInfo(
      {
        by: TestAuditBy.create(by),
        on: TestAuditOn.create(on),
      },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  update(updatedBy: BaseUuidV4Vo): TestAuditInfo {
    return new TestAuditInfo(
      {
        by: this.value.by.update(updatedBy) as TestAuditBy,
        on: this.value.on.update() as TestAuditOn,
      },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }
}

describe('BaseAuditInfoVo', () => {
  describe('create', () => {
    it('should create with user ID', () => {
      const userId = TestUserId.create('user-123');
      const audit = TestAuditInfo.create(userId);

      expect(audit.createdBy?.value).toBe('user-123');
      expect(audit.updatedBy?.value).toBe('user-123');
    });

    it('should create without user ID (system operation)', () => {
      const audit = TestAuditInfo.create();

      expect(audit.createdBy).toBeUndefined();
      expect(audit.updatedBy).toBeUndefined();
    });

    it('should set timestamps to current time', () => {
      const before = new Date();
      const audit = TestAuditInfo.create();
      const after = new Date();

      expect(audit.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(audit.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(audit.updatedAt.getTime()).toBe(audit.createdAt.getTime());
    });
  });

  describe('createdBy getter', () => {
    it('should return the creator user ID', () => {
      const userId = TestUserId.create('creator-id');
      const audit = TestAuditInfo.create(userId);

      expect(audit.createdBy?.value).toBe('creator-id');
    });

    it('should return undefined for system-created', () => {
      const audit = TestAuditInfo.create();

      expect(audit.createdBy).toBeUndefined();
    });
  });

  describe('createdAt getter', () => {
    it('should return the creation timestamp', () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const audit = TestAuditInfo.fromPersistence({}, { createdAt, updatedAt: createdAt });

      expect(audit.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should return a cloned Date', () => {
      const audit = TestAuditInfo.create();
      const date1 = audit.createdAt;
      const date2 = audit.createdAt;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('updatedBy getter', () => {
    it('should return the updater user ID', () => {
      const userId = TestUserId.create('updater-id');
      const audit = TestAuditInfo.fromPersistence(
        { updatedBy: userId },
        { createdAt: new Date(), updatedAt: new Date() },
      );

      expect(audit.updatedBy?.value).toBe('updater-id');
    });
  });

  describe('updatedAt getter', () => {
    it('should return the update timestamp', () => {
      const updatedAt = new Date('2024-01-16T15:30:00.000Z');
      const audit = TestAuditInfo.fromPersistence(
        {},
        { createdAt: new Date('2024-01-15T10:00:00.000Z'), updatedAt },
      );

      expect(audit.updatedAt.toISOString()).toBe('2024-01-16T15:30:00.000Z');
    });

    it('should return a cloned Date', () => {
      const audit = TestAuditInfo.create();
      const date1 = audit.updatedAt;
      const date2 = audit.updatedAt;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('isModified getter', () => {
    it('should return false when just created', () => {
      const audit = TestAuditInfo.create();

      expect(audit.isModified).toBe(false);
    });

    it('should return true when timestamps differ', () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const updatedAt = new Date('2024-01-16T15:30:00.000Z');
      const audit = TestAuditInfo.fromPersistence({}, { createdAt, updatedAt });

      expect(audit.isModified).toBe(true);
    });

    it('should return true when users differ', () => {
      const createdBy = TestUserId.create('user-1');
      const updatedBy = TestUserId.create('user-2');
      const now = new Date();
      const audit = TestAuditInfo.fromPersistence(
        { createdBy, updatedBy },
        { createdAt: now, updatedAt: now },
      );

      expect(audit.isModified).toBe(true);
    });

    it('should return false when both timestamps and users are same', () => {
      const userId = TestUserId.create('same-user');
      const timestamp = new Date();
      const audit = TestAuditInfo.fromPersistence(
        { createdBy: userId, updatedBy: userId },
        { createdAt: timestamp, updatedAt: new Date(timestamp.getTime()) },
      );

      expect(audit.isModified).toBe(false);
    });

    it('should return false when both createdBy and updatedBy are undefined', () => {
      const timestamp = new Date();
      const audit = TestAuditInfo.fromPersistence(
        {},
        { createdAt: timestamp, updatedAt: new Date(timestamp.getTime()) },
      );

      expect(audit.isModified).toBe(false);
    });
  });

  describe('lastModifiedBy getter', () => {
    it('should be alias for updatedBy', () => {
      const userId = TestUserId.create('modifier-id');
      const audit = TestAuditInfo.fromPersistence(
        { updatedBy: userId },
        { createdAt: new Date(), updatedAt: new Date() },
      );

      expect(audit.lastModifiedBy?.value).toBe(audit.updatedBy?.value);
    });
  });

  describe('lastModifiedAt getter', () => {
    it('should be alias for updatedAt', () => {
      const audit = TestAuditInfo.create();

      expect(audit.lastModifiedAt.getTime()).toBe(audit.updatedAt.getTime());
    });
  });

  describe('update method', () => {
    it('should create new instance with updated timestamp and user', async () => {
      const creatorId = TestUserId.create('creator');
      const original = TestAuditInfo.create(creatorId);
      const originalUpdatedAt = original.updatedAt.getTime();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updaterId = TestUserId.create('updater');
      const updated = original.update(updaterId);

      expect(updated.createdBy?.value).toBe('creator');
      expect(updated.updatedBy?.value).toBe('updater');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
      expect(updated.createdAt.getTime()).toBe(original.createdAt.getTime());
    });

    it('should preserve immutability', () => {
      const audit = TestAuditInfo.create();
      const updated = audit.update(TestUserId.create('new-user'));

      expect(updated).not.toBe(audit);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const audit = TestAuditInfo.create();

      expect(audit).toBeInstanceOf(BaseValueObject);
    });
  });
});
