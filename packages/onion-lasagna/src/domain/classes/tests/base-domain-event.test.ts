import { describe, expect, it } from 'vitest';
import { BaseDomainEvent } from '../base-domain-event.class';

interface TestPayload {
  id: string;
  name: string;
  nested: {
    value: number;
    items: string[];
  };
  createdAt: Date;
}

class TestEvent extends BaseDomainEvent<TestPayload> {
  constructor(payload: TestPayload) {
    super('TestEvent', payload.id, payload);
  }
}

describe('BaseDomainEvent', () => {
  describe('payload immutability', () => {
    it('should not mutate the original payload object', () => {
      const originalPayload: TestPayload = {
        id: '123',
        name: 'test',
        nested: {
          value: 42,
          items: ['a', 'b'],
        },
        createdAt: new Date('2024-01-01'),
      };

      // Create event with the payload
      new TestEvent(originalPayload);

      // Original payload should still be mutable
      expect(() => {
        originalPayload.name = 'modified';
      }).not.toThrow();

      expect(originalPayload.name).toBe('modified');
    });

    it('should not mutate nested objects in the original payload', () => {
      const originalPayload: TestPayload = {
        id: '123',
        name: 'test',
        nested: {
          value: 42,
          items: ['a', 'b'],
        },
        createdAt: new Date('2024-01-01'),
      };

      new TestEvent(originalPayload);

      // Original nested object should still be mutable
      expect(() => {
        originalPayload.nested.value = 100;
        originalPayload.nested.items.push('c');
      }).not.toThrow();

      expect(originalPayload.nested.value).toBe(100);
      expect(originalPayload.nested.items).toEqual(['a', 'b', 'c']);
    });

    it('should freeze the event payload', () => {
      const originalPayload: TestPayload = {
        id: '123',
        name: 'test',
        nested: {
          value: 42,
          items: ['a', 'b'],
        },
        createdAt: new Date('2024-01-01'),
      };

      const event = new TestEvent(originalPayload);

      // Event payload should be frozen
      expect(Object.isFrozen(event.payload)).toBe(true);
      expect(Object.isFrozen(event.payload.nested)).toBe(true);
      expect(Object.isFrozen(event.payload.nested.items)).toBe(true);
    });

    it('should create independent copies for multiple events from same source', () => {
      const originalPayload: TestPayload = {
        id: '123',
        name: 'test',
        nested: {
          value: 42,
          items: ['a', 'b'],
        },
        createdAt: new Date('2024-01-01'),
      };

      const event1 = new TestEvent(originalPayload);
      originalPayload.name = 'modified';
      const event2 = new TestEvent(originalPayload);

      // Events should have different payload values
      expect(event1.payload.name).toBe('test');
      expect(event2.payload.name).toBe('modified');

      // Original should still be mutable
      originalPayload.name = 'modified again';
      expect(originalPayload.name).toBe('modified again');
    });
  });

  describe('Date handling', () => {
    it('should clone Date objects in payload', () => {
      // Use mid-year date to avoid timezone boundary issues
      const originalDate = new Date('2024-06-15T12:00:00Z');
      const originalPayload: TestPayload = {
        id: '123',
        name: 'test',
        nested: {
          value: 42,
          items: [],
        },
        createdAt: originalDate,
      };

      const event = new TestEvent(originalPayload);

      // Modifying original date should not affect event payload
      originalDate.setUTCFullYear(2025);

      expect(event.payload.createdAt.getUTCFullYear()).toBe(2024);
      expect(originalDate.getUTCFullYear()).toBe(2025);
    });
  });

  describe('event properties', () => {
    it('should set eventName correctly', () => {
      const event = new TestEvent({
        id: '123',
        name: 'test',
        nested: { value: 1, items: [] },
        createdAt: new Date(),
      });

      expect(event.eventName).toBe('TestEvent');
    });

    it('should set aggregateId correctly', () => {
      const event = new TestEvent({
        id: 'my-aggregate-id',
        name: 'test',
        nested: { value: 1, items: [] },
        createdAt: new Date(),
      });

      expect(event.aggregateId).toBe('my-aggregate-id');
    });

    it('should generate a unique eventId', () => {
      const event1 = new TestEvent({
        id: '123',
        name: 'test',
        nested: { value: 1, items: [] },
        createdAt: new Date(),
      });
      const event2 = new TestEvent({
        id: '123',
        name: 'test',
        nested: { value: 1, items: [] },
        createdAt: new Date(),
      });

      expect(event1.eventId).toBeDefined();
      expect(event2.eventId).toBeDefined();
      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should set occurredOn to current time', () => {
      const before = new Date();
      const event = new TestEvent({
        id: '123',
        name: 'test',
        nested: { value: 1, items: [] },
        createdAt: new Date(),
      });
      const after = new Date();

      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('toJSON', () => {
    it('should serialize event correctly', () => {
      const payload: TestPayload = {
        id: '123',
        name: 'test',
        nested: { value: 42, items: ['a'] },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const event = new TestEvent(payload);
      const json = event.toJSON();

      expect(json.eventId).toBe(event.eventId);
      expect(json.eventName).toBe('TestEvent');
      expect(json.aggregateId).toBe('123');
      expect(json.occurredOn).toBe(event.occurredOn.toISOString());
      expect(json.payload).toEqual({
        id: '123',
        name: 'test',
        nested: { value: 42, items: ['a'] },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });
    });
  });
});
