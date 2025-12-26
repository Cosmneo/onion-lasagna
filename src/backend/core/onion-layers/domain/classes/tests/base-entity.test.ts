import { describe, it, expect } from 'vitest';
import { BaseEntity } from '../base-entity.class';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../base-value-object.class';

// Test ID value object
class TestId extends BaseValueObject<string> {
  static create(value: string): TestId {
    return new TestId(value, SKIP_VALUE_OBJECT_VALIDATION);
  }
}

// Test entity props
interface TestEntityProps {
  name: string;
  active: boolean;
}

// Concrete entity for testing
class TestEntity extends BaseEntity<TestId, TestEntityProps> {
  static create(id: string, name: string, active = true): TestEntity {
    return new TestEntity(TestId.create(id), { name, active });
  }

  static fromPersistence(
    id: string,
    props: TestEntityProps,
    version: number,
  ): TestEntity {
    return new TestEntity(TestId.create(id), props, version);
  }

  get name(): string {
    return this.props.name;
  }

  get active(): boolean {
    return this.props.active;
  }

  changeName(newName: string): void {
    this._props.name = newName;
  }

  deactivate(): void {
    this._props.active = false;
  }

  getNextVersion(): number {
    return this.nextVersion();
  }
}

describe('BaseEntity', () => {
  describe('constructor', () => {
    it('should create entity with id and props', () => {
      const entity = TestEntity.create('123', 'Test Entity');

      expect(entity.id.value).toBe('123');
      expect(entity.name).toBe('Test Entity');
      expect(entity.active).toBe(true);
    });

    it('should default version to 0', () => {
      const entity = TestEntity.create('123', 'Test');

      expect(entity.version).toBe(0);
    });

    it('should accept custom version', () => {
      const entity = TestEntity.fromPersistence(
        '123',
        { name: 'Test', active: true },
        5,
      );

      expect(entity.version).toBe(5);
    });
  });

  describe('id getter', () => {
    it('should return the entity id', () => {
      const entity = TestEntity.create('unique-id', 'Test');

      expect(entity.id).toBeInstanceOf(TestId);
      expect(entity.id.value).toBe('unique-id');
    });
  });

  describe('version getter', () => {
    it('should return the current version', () => {
      const entity = TestEntity.fromPersistence('123', { name: 'Test', active: true }, 10);

      expect(entity.version).toBe(10);
    });
  });

  describe('nextVersion', () => {
    it('should return version + 1', () => {
      const entity = TestEntity.fromPersistence('123', { name: 'Test', active: true }, 5);

      expect(entity.getNextVersion()).toBe(6);
    });

    it('should work from initial version 0', () => {
      const entity = TestEntity.create('123', 'Test');

      expect(entity.getNextVersion()).toBe(1);
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const entity1 = TestEntity.create('same-id', 'Entity 1');
      const entity2 = TestEntity.fromPersistence('same-id', { name: 'Entity 2', active: false }, 1);

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should return false for different ids', () => {
      const entity1 = TestEntity.create('id-1', 'Entity');
      const entity2 = TestEntity.create('id-2', 'Entity');

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should return true for same reference', () => {
      const entity = TestEntity.create('123', 'Test');

      expect(entity.equals(entity)).toBe(true);
    });

    it('should compare by id regardless of props differences', () => {
      const entity1 = TestEntity.create('123', 'Name 1');
      entity1.changeName('Updated Name');
      entity1.deactivate();

      const entity2 = TestEntity.fromPersistence('123', { name: 'Different', active: true }, 5);

      expect(entity1.equals(entity2)).toBe(true);
    });
  });

  describe('props mutation', () => {
    it('should allow props to be changed via methods', () => {
      const entity = TestEntity.create('123', 'Original');

      entity.changeName('Updated');

      expect(entity.name).toBe('Updated');
    });

    it('should allow multiple props changes', () => {
      const entity = TestEntity.create('123', 'Test');

      entity.changeName('New Name');
      entity.deactivate();

      expect(entity.name).toBe('New Name');
      expect(entity.active).toBe(false);
    });
  });

  describe('identity stability', () => {
    it('should maintain id after props changes', () => {
      const entity = TestEntity.create('stable-id', 'Original');
      const originalId = entity.id;

      entity.changeName('Changed');

      expect(entity.id).toBe(originalId);
      expect(entity.id.value).toBe('stable-id');
    });

    it('should maintain version after props changes', () => {
      const entity = TestEntity.fromPersistence('123', { name: 'Test', active: true }, 5);

      entity.changeName('Changed');

      expect(entity.version).toBe(5);
    });
  });
});
