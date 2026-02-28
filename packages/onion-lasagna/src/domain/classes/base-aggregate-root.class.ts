import type { BaseValueObject } from './base-value-object.class';
import { BaseEntity } from './base-entity.class';
import type { BaseDomainEvent } from './base-domain-event.class';
import { PartialLoadError } from '../exceptions/partial-load.error';

/**
 * Base class for Aggregate Roots in Domain-Driven Design.
 *
 * An Aggregate Root is a special Entity that serves as the entry point to an
 * aggregate - a cluster of domain objects that are treated as a single unit
 * for data changes. The Aggregate Root enforces invariants across the entire
 * aggregate and manages domain events.
 *
 * **Note:** Like entities, aggregate roots should be composed of Value Objects,
 * which are self-validating. Cross-property invariants should be checked in
 * factory methods or domain methods.
 *
 * Key characteristics:
 * - **Entry point**: External objects can only reference the Aggregate Root
 * - **Consistency boundary**: All changes within the aggregate are atomic
 * - **Invariant enforcement**: The root ensures all business rules are satisfied
 * - **Event management**: Collects domain events raised during operations
 *
 * @typeParam TId - The identity type (must extend BaseValueObject)
 * @typeParam TProps - The properties type containing aggregate state (must be an object)
 *
 * @example
 * ```typescript
 * interface OrderProps {
 *   customerId: CustomerId;
 *   items: OrderItem[];
 *   status: OrderStatus;
 *   placedAt: DateVo;
 * }
 *
 * class Order extends BaseAggregateRoot<OrderId, OrderProps> {
 *   private constructor(id: OrderId, props: OrderProps, version?: number) {
 *     super(id, props, version);
 *   }
 *
 *   static create(customerId: CustomerId, items: OrderItem[]): Order {
 *     const id = OrderId.create();
 *     const order = new Order(id, {
 *       customerId,
 *       items,
 *       status: OrderStatus.pending(),
 *       placedAt: DateVo.now(),
 *     });
 *
 *     // Raise domain event
 *     order.addDomainEvent(new OrderPlacedEvent({
 *       orderId: id.value,
 *       customerId: customerId.value,
 *       itemCount: items.length,
 *     }));
 *
 *     return order;
 *   }
 *
 *   static reconstitute(id: OrderId, props: OrderProps, version: number): Order {
 *     return new Order(id, props, version);
 *   }
 *
 *   addItem(item: OrderItem): void {
 *     if (!this.props.status.isPending()) {
 *       throw new InvariantViolationError({
 *         message: 'Cannot add items to a non-pending order',
 *       });
 *     }
 *     this._props.items.push(item);
 *     this.addDomainEvent(new OrderItemAddedEvent({
 *       orderId: this.id.value,
 *       productId: item.productId.value,
 *     }));
 *   }
 *
 *   confirm(): void {
 *     this._props.status = OrderStatus.confirmed();
 *     this.addDomainEvent(new OrderConfirmedEvent({ orderId: this.id.value }));
 *   }
 * }
 *
 * // In repository after save:
 * async save(order: Order): Promise<void> {
 *   await this.db.save(order.toPersistence());
 *   const events = order.pullDomainEvents();
 *   await this.eventPublisher.publishAll(events);
 * }
 * ```
 */
export abstract class BaseAggregateRoot<
  TId extends BaseValueObject<unknown>,
  TProps extends object,
> extends BaseEntity<TId, TProps> {
  private _domainEvents: BaseDomainEvent[] = [];
  private _loadedFields = new Set<keyof TProps | string>();

  /**
   * Creates a new Aggregate Root instance.
   *
   * @param id - The unique identifier for this aggregate
   * @param props - The aggregate's properties/state (should be composed of Value Objects)
   * @param version - Optional version number for optimistic locking (defaults to 0)
   */
  protected constructor(id: TId, props: TProps, version?: number) {
    super(id, props, version);
  }

  /**
   * Adds a domain event to be published after persistence.
   *
   * Call this method when a significant domain action occurs.
   * Events are collected and should be published by the repository
   * after successfully persisting the aggregate.
   *
   * @param event - The domain event to add
   *
   * @example
   * ```typescript
   * confirm(): void {
   *   this._props.status = OrderStatus.confirmed();
   *   this.addDomainEvent(new OrderConfirmedEvent({
   *     orderId: this.id.value,
   *     confirmedAt: new Date(),
   *   }));
   * }
   * ```
   */
  protected addDomainEvent(event: BaseDomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Returns and clears all pending domain events.
   *
   * This method should be called by the repository after successfully
   * persisting the aggregate. The events are cleared to prevent
   * duplicate publishing.
   *
   * @returns Array of domain events that were pending
   *
   * @example
   * ```typescript
   * // In repository
   * async save(order: Order): Promise<void> {
   *   await this.db.transaction(async (tx) => {
   *     await tx.orders.upsert(order.toPersistence());
   *   });
   *
   *   // Only publish after successful persistence
   *   const events = order.pullDomainEvents();
   *   for (const event of events) {
   *     await this.eventBus.publish(event);
   *   }
   * }
   * ```
   */
  public pullDomainEvents(): BaseDomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  /**
   * Returns pending domain events without clearing them.
   *
   * Useful for inspection or testing without affecting the event queue.
   *
   * @returns Array of pending domain events
   */
  public peekDomainEvents(): readonly BaseDomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Checks if there are any pending domain events.
   *
   * @returns `true` if there are events waiting to be published
   *
   * @example
   * ```typescript
   * if (order.hasDomainEvents) {
   *   const events = order.pullDomainEvents();
   *   await eventBus.publishAll(events);
   * }
   * ```
   */
  public get hasDomainEvents(): boolean {
    return this._domainEvents.length > 0;
  }

  /**
   * Clears all pending domain events without returning them.
   *
   * Use with caution - this discards events that haven't been published.
   * Useful in testing or when intentionally discarding events.
   */
  protected clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Marks one or more fields as loaded.
   *
   * Call this method during reconstitution to indicate which fields/relations
   * were loaded from the database. Fields not marked as loaded will trigger
   * a PartialLoadError when accessed via requireLoaded().
   *
   * @param fields - The field names to mark as loaded
   *
   * @example
   * ```typescript
   * static reconstitute(id: OrderId, props: OrderProps, version: number): Order {
   *   const order = new Order(id, props, version);
   *   order.markLoaded('customerId', 'status');
   *   return order;
   * }
   * ```
   */
  protected markLoaded(...fields: (keyof TProps | string)[]): void {
    for (const field of fields) {
      this._loadedFields.add(field);
    }
  }

  /**
   * Checks if a field is marked as loaded.
   *
   * Useful for conditional logic based on load state.
   *
   * @param field - The field name to check
   * @returns `true` if the field is marked as loaded
   *
   * @example
   * ```typescript
   * get itemCount(): number {
   *   if (!this.isLoaded('items')) {
   *     return 0;
   *   }
   *   return this.props.items.length;
   * }
   * ```
   */
  protected isLoaded(field: keyof TProps | string): boolean {
    return this._loadedFields.has(field);
  }

  /**
   * Ensures a field is loaded, throwing PartialLoadError if not.
   *
   * Use this as a guard in getters that access potentially unloaded relations.
   * Returns the field value if loaded, enabling fluent usage.
   *
   * @typeParam K - The field key type
   * @param field - The field name to check
   * @param errorCode - Optional custom error code (defaults to FIELD_NOT_LOADED)
   * @returns The field value if loaded
   * @throws {PartialLoadError} When the field is not marked as loaded
   *
   * @example
   * ```typescript
   * get items(): readonly OrderItem[] {
   *   return this.requireLoaded('items');
   * }
   *
   * // With custom error code
   * get customer(): Customer {
   *   return this.requireLoaded('customer', 'ORDER_CUSTOMER_NOT_LOADED');
   * }
   * ```
   */
  protected requireLoaded<K extends keyof TProps>(field: K, errorCode?: string): TProps[K] {
    if (!this._loadedFields.has(field)) {
      throw new PartialLoadError({
        message: `Field '${String(field)}' was not loaded`,
        code: errorCode ?? `${String(field).toUpperCase()}_NOT_LOADED`,
      });
    }
    return this.props[field];
  }

  /**
   * Returns a read-only view of loaded fields.
   *
   * Useful for debugging and inspection, particularly in tests
   * or logging scenarios.
   *
   * @returns A read-only set of loaded field names
   *
   * @example
   * ```typescript
   * console.log('Loaded fields:', Array.from(order.loadedFields));
   * // Output: Loaded fields: ['customerId', 'status', 'placedAt']
   * ```
   */
  public get loadedFields(): ReadonlySet<keyof TProps | string> {
    return this._loadedFields;
  }
}
