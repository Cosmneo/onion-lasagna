/**
 * Base class for Domain Events in Domain-Driven Design.
 *
 * Domain Events represent something meaningful that happened in the domain.
 * They are immutable records of past occurrences that other parts of the
 * system can react to.
 *
 * Key characteristics:
 * - **Immutable**: Events are facts about the past, they cannot change
 * - **Named in past tense**: e.g., OrderPlaced, UserRegistered, PaymentReceived
 * - **Contain relevant data**: Include all information needed by handlers
 * - **Raised by Aggregate Roots**: Events are collected and published after persistence
 *
 * @typeParam TPayload - The event-specific data payload type
 *
 * @example
 * ```typescript
 * interface OrderPlacedPayload {
 *   orderId: string;
 *   customerId: string;
 *   items: Array<{ productId: string; quantity: number }>;
 *   totalAmount: number;
 * }
 *
 * class OrderPlacedEvent extends BaseDomainEvent<OrderPlacedPayload> {
 *   constructor(payload: OrderPlacedPayload) {
 *     super('OrderPlaced', payload.orderId, payload);
 *   }
 * }
 *
 * // In aggregate root
 * class Order extends BaseAggregateRoot<OrderId, OrderProps> {
 *   static create(customerId: string, items: OrderItem[]): Order {
 *     const order = new Order(...);
 *     order.addDomainEvent(new OrderPlacedEvent({
 *       orderId: order.id.value,
 *       customerId,
 *       items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
 *       totalAmount: order.totalAmount,
 *     }));
 *     return order;
 *   }
 * }
 * ```
 */
export abstract class BaseDomainEvent<TPayload = unknown> {
  private readonly _eventId: string;
  private readonly _eventName: string;
  private readonly _aggregateId: string;
  private readonly _occurredOn: Date;
  private readonly _payload: TPayload;

  /**
   * Creates a new Domain Event.
   *
   * @param eventName - The name of the event (e.g., 'OrderPlaced', 'UserRegistered')
   * @param aggregateId - The ID of the aggregate that raised this event
   * @param payload - The event-specific data
   * @param eventId - Optional custom event ID (defaults to crypto.randomUUID())
   * @param occurredOn - Optional timestamp (defaults to now)
   */
  protected constructor(
    eventName: string,
    aggregateId: string,
    payload: TPayload,
    eventId?: string,
    occurredOn?: Date,
  ) {
    this._eventId = eventId ?? crypto.randomUUID();
    this._eventName = eventName;
    this._aggregateId = aggregateId;
    this._occurredOn = occurredOn ?? new Date();
    this._payload = payload;
  }

  /**
   * Unique identifier for this event instance.
   *
   * Useful for idempotency checks and event deduplication.
   */
  public get eventId(): string {
    return this._eventId;
  }

  /**
   * The name/type of this event.
   *
   * Used for routing events to appropriate handlers.
   * Should be in PastTense format (e.g., 'OrderPlaced', 'UserRegistered').
   */
  public get eventName(): string {
    return this._eventName;
  }

  /**
   * The ID of the aggregate that raised this event.
   *
   * Useful for event sourcing and aggregate-specific event streams.
   */
  public get aggregateId(): string {
    return this._aggregateId;
  }

  /**
   * Timestamp when this event occurred.
   *
   * Represents the moment the domain action happened.
   */
  public get occurredOn(): Date {
    return this._occurredOn;
  }

  /**
   * The event-specific data payload.
   *
   * Contains all information needed by event handlers.
   */
  public get payload(): TPayload {
    return this._payload;
  }

  /**
   * Serializes the event to a plain object for persistence or messaging.
   *
   * @returns A plain object representation of the event
   *
   * @example
   * ```typescript
   * const event = new OrderPlacedEvent({ orderId: '123', ... });
   * const serialized = event.toJSON();
   * // {
   * //   eventId: 'uuid',
   * //   eventName: 'OrderPlaced',
   * //   aggregateId: '123',
   * //   occurredOn: '2024-01-15T10:30:00.000Z',
   * //   payload: { orderId: '123', ... }
   * // }
   * ```
   */
  public toJSON(): {
    eventId: string;
    eventName: string;
    aggregateId: string;
    occurredOn: string;
    payload: TPayload;
  } {
    return {
      eventId: this._eventId,
      eventName: this._eventName,
      aggregateId: this._aggregateId,
      occurredOn: this._occurredOn.toISOString(),
      payload: this._payload,
    };
  }
}
