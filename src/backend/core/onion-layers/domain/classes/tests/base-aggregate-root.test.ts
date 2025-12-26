import { describe, it, expect } from 'vitest';
import { BaseAggregateRoot } from '../base-aggregate-root.class';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../base-value-object.class';
import { BaseDomainEvent } from '../base-domain-event.class';

// Test ID value object
class TestId extends BaseValueObject<string> {
  static create(value: string): TestId {
    return new TestId(value, SKIP_VALUE_OBJECT_VALIDATION);
  }
}

// Test domain event
interface TestEventPayload {
  message: string;
}

class TestEvent extends BaseDomainEvent<TestEventPayload> {
  constructor(aggregateId: string, payload: TestEventPayload) {
    super('TestEvent', aggregateId, payload);
  }
}

// Test aggregate root
interface TestAggregateProps {
  name: string;
  status: string;
}

class TestAggregate extends BaseAggregateRoot<TestId, TestAggregateProps> {
  static create(id: string, name: string): TestAggregate {
    const aggregate = new TestAggregate(TestId.create(id), { name, status: 'active' });
    aggregate.addEvent(new TestEvent(id, { message: `Created: ${name}` }));
    return aggregate;
  }

  static fromPersistence(id: string, props: TestAggregateProps, version: number): TestAggregate {
    return new TestAggregate(TestId.create(id), props, version);
  }

  get name(): string {
    return this.props.name;
  }

  get status(): string {
    return this.props.status;
  }

  changeName(newName: string): void {
    this._props.name = newName;
    this.addEvent(new TestEvent(this.id.value, { message: `Name changed to: ${newName}` }));
  }

  // Expose protected methods for testing
  addEvent(event: BaseDomainEvent): void {
    this.addDomainEvent(event);
  }

  clearEvents(): void {
    this.clearDomainEvents();
  }
}

describe('BaseAggregateRoot', () => {
  describe('constructor', () => {
    it('should create aggregate with id, props, and empty events', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);

      expect(aggregate.id.value).toBe('123');
      expect(aggregate.name).toBe('Test');
      expect(aggregate.hasDomainEvents).toBe(false);
    });

    it('should inherit from BaseEntity', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 5);

      expect(aggregate.version).toBe(5);
    });
  });

  describe('addDomainEvent', () => {
    it('should add event to pending events', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);
      const event = new TestEvent('123', { message: 'Test message' });

      aggregate.addEvent(event);

      expect(aggregate.hasDomainEvents).toBe(true);
    });

    it('should allow multiple events', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);

      aggregate.addEvent(new TestEvent('123', { message: 'Event 1' }));
      aggregate.addEvent(new TestEvent('123', { message: 'Event 2' }));
      aggregate.addEvent(new TestEvent('123', { message: 'Event 3' }));

      const events = aggregate.peekDomainEvents();
      expect(events).toHaveLength(3);
    });
  });

  describe('pullDomainEvents', () => {
    it('should return all pending events', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);
      aggregate.addEvent(new TestEvent('123', { message: 'Event 1' }));
      aggregate.addEvent(new TestEvent('123', { message: 'Event 2' }));

      const events = aggregate.pullDomainEvents();

      expect(events).toHaveLength(2);
      expect(events[0]?.payload.message).toBe('Event 1');
      expect(events[1]?.payload.message).toBe('Event 2');
    });

    it('should clear events after pulling', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);
      aggregate.addEvent(new TestEvent('123', { message: 'Event' }));

      aggregate.pullDomainEvents();

      expect(aggregate.hasDomainEvents).toBe(false);
      expect(aggregate.pullDomainEvents()).toHaveLength(0);
    });

    it('should return empty array when no events', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);

      const events = aggregate.pullDomainEvents();

      expect(events).toEqual([]);
    });
  });

  describe('peekDomainEvents', () => {
    it('should return events without clearing them', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);
      aggregate.addEvent(new TestEvent('123', { message: 'Event' }));

      const peeked = aggregate.peekDomainEvents();

      expect(peeked).toHaveLength(1);
      expect(aggregate.hasDomainEvents).toBe(true);
    });

    it('should return a copy of the events array', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);
      aggregate.addEvent(new TestEvent('123', { message: 'Event' }));

      const peeked1 = aggregate.peekDomainEvents();
      const peeked2 = aggregate.peekDomainEvents();

      expect(peeked1).not.toBe(peeked2);
      expect(peeked1).toEqual(peeked2);
    });
  });

  describe('hasDomainEvents', () => {
    it('should return false when no events', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);

      expect(aggregate.hasDomainEvents).toBe(false);
    });

    it('should return true when events are pending', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);
      aggregate.addEvent(new TestEvent('123', { message: 'Event' }));

      expect(aggregate.hasDomainEvents).toBe(true);
    });

    it('should return false after pulling all events', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);
      aggregate.addEvent(new TestEvent('123', { message: 'Event' }));
      aggregate.pullDomainEvents();

      expect(aggregate.hasDomainEvents).toBe(false);
    });
  });

  describe('clearDomainEvents', () => {
    it('should remove all pending events', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);
      aggregate.addEvent(new TestEvent('123', { message: 'Event 1' }));
      aggregate.addEvent(new TestEvent('123', { message: 'Event 2' }));

      aggregate.clearEvents();

      expect(aggregate.hasDomainEvents).toBe(false);
      expect(aggregate.pullDomainEvents()).toEqual([]);
    });
  });

  describe('domain event lifecycle', () => {
    it('should collect events during domain operations', () => {
      const aggregate = TestAggregate.create('123', 'Initial Name');

      expect(aggregate.peekDomainEvents()).toHaveLength(1);

      aggregate.changeName('Updated Name');

      expect(aggregate.peekDomainEvents()).toHaveLength(2);
    });

    it('should preserve event order', () => {
      const aggregate = TestAggregate.fromPersistence('123', { name: 'Test', status: 'active' }, 0);

      aggregate.addEvent(new TestEvent('123', { message: 'First' }));
      aggregate.addEvent(new TestEvent('123', { message: 'Second' }));
      aggregate.addEvent(new TestEvent('123', { message: 'Third' }));

      const events = aggregate.pullDomainEvents();
      expect(events[0]?.payload.message).toBe('First');
      expect(events[1]?.payload.message).toBe('Second');
      expect(events[2]?.payload.message).toBe('Third');
    });
  });

  describe('equality (inherited from BaseEntity)', () => {
    it('should compare by id', () => {
      const aggregate1 = TestAggregate.create('same-id', 'Name 1');
      const aggregate2 = TestAggregate.fromPersistence('same-id', { name: 'Name 2', status: 'inactive' }, 5);

      expect(aggregate1.equals(aggregate2)).toBe(true);
    });

    it('should be false for different ids', () => {
      const aggregate1 = TestAggregate.create('id-1', 'Name');
      const aggregate2 = TestAggregate.create('id-2', 'Name');

      expect(aggregate1.equals(aggregate2)).toBe(false);
    });
  });
});
