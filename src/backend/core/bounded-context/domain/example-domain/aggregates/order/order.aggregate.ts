import { BaseAggregateRoot } from '../../../classes';
import { InvariantViolationError } from '../../../exceptions/invariant-violation.error';
import { OrderId, OrderStatus, Money } from '../../value-objects';
import type { OrderItem } from '../../entities';
import { OrderPlacedEvent, OrderCancelledEvent } from '../../events';
import { defaultOrderStatus } from './policies/value';
import { canCancelOrder, canAddOrderItem } from './policies/business';

/**
 * Properties for the Order aggregate.
 */
export interface OrderProps {
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: Money;
  placedAt: Date;
}

/**
 * Order Aggregate Root.
 *
 * Represents a customer's order with line items. The Order is the aggregate root
 * and controls access to its OrderItems. All modifications go through the Order
 * to ensure business invariants are maintained.
 *
 * **Policies used:**
 * - Value: `defaultOrderStatus` - New orders start as 'pending'
 * - Business: `canAddOrderItem` - Items can only be added to pending orders
 * - Business: `canCancelOrder` - Orders can only be cancelled if not shipped
 *
 * **Events raised:**
 * - `OrderPlacedEvent` - When order is created
 * - `OrderCancelledEvent` - When order is cancelled
 *
 * @example
 * ```typescript
 * // Create a new order
 * const order = Order.create('customer-123', [
 *   OrderItem.create({
 *     productId: 'prod-1',
 *     productName: 'Widget',
 *     quantity: 2,
 *     unitPrice: Money.usd(29.99),
 *   }),
 * ]);
 *
 * // Add another item
 * order.addItem(OrderItem.create({
 *   productId: 'prod-2',
 *   productName: 'Gadget',
 *   quantity: 1,
 *   unitPrice: Money.usd(49.99),
 * }));
 *
 * // Cancel the order
 * order.cancel('Customer changed their mind');
 *
 * // Get events for publishing
 * const events = order.pullDomainEvents();
 * ```
 */
export class Order extends BaseAggregateRoot<OrderId, OrderProps> {
  private constructor(id: OrderId, props: OrderProps, version?: number) {
    super(id, props, version);
  }

  /**
   * Creates a new Order.
   *
   * @param customerId - The customer placing the order
   * @param items - Initial order items
   * @returns A new Order instance with OrderPlacedEvent raised
   */
  static create(customerId: string, items: OrderItem[]): Order {
    const id = OrderId.generate();
    const totalAmount = items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      Money.zero(),
    );

    const order = new Order(id, {
      customerId,
      items,
      status: defaultOrderStatus(),
      totalAmount,
      placedAt: new Date(),
    });

    order.addDomainEvent(
      new OrderPlacedEvent({
        orderId: id.value,
        customerId,
        itemCount: items.length,
        totalAmount: totalAmount.amount,
        currency: totalAmount.currency,
        placedAt: order.placedAt.toISOString(),
      }),
    );

    return order;
  }

  /**
   * Reconstitutes an Order from persistence.
   *
   * @param id - The order ID
   * @param props - The order properties
   * @param version - The version for optimistic locking
   */
  static fromPersistence(id: OrderId, props: OrderProps, version: number): Order {
    return new Order(id, props, version);
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get items(): readonly OrderItem[] {
    return this.props.items;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get totalAmount(): Money {
    return this.props.totalAmount;
  }

  get placedAt(): Date {
    return this.props.placedAt;
  }

  /**
   * Adds an item to the order.
   *
   * Uses the `canAddOrderItem` business policy to check if the operation is allowed.
   *
   * @param item - The item to add
   * @throws {InvariantViolationError} If the order is not in pending status
   */
  addItem(item: OrderItem): void {
    if (!canAddOrderItem(this)) {
      throw new InvariantViolationError({
        message: 'Cannot add items to non-pending order',
        code: 'ORDER_NOT_PENDING',
      });
    }

    this._props.items.push(item);
    this._props.totalAmount = this._props.totalAmount.add(item.totalPrice);
  }

  /**
   * Confirms the order (e.g., after payment received).
   *
   * @throws {InvariantViolationError} If the order is not in pending status
   */
  confirm(): void {
    if (!this.status.isPending()) {
      throw new InvariantViolationError({
        message: 'Only pending orders can be confirmed',
        code: 'ORDER_NOT_PENDING',
      });
    }

    this._props.status = OrderStatus.confirmed();
  }

  /**
   * Marks the order as shipped.
   *
   * @throws {InvariantViolationError} If the order is not confirmed
   */
  ship(): void {
    if (!this.status.isConfirmed()) {
      throw new InvariantViolationError({
        message: 'Only confirmed orders can be shipped',
        code: 'ORDER_NOT_CONFIRMED',
      });
    }

    this._props.status = OrderStatus.shipped();
  }

  /**
   * Cancels the order.
   *
   * Uses the `canCancelOrder` business policy to check if the operation is allowed.
   *
   * @param reason - The reason for cancellation
   * @throws {InvariantViolationError} If the order cannot be cancelled
   */
  cancel(reason: string): void {
    if (!canCancelOrder(this)) {
      throw new InvariantViolationError({
        message: 'Order cannot be cancelled - already shipped or cancelled',
        code: 'ORDER_CANNOT_CANCEL',
      });
    }

    this._props.status = OrderStatus.cancelled();

    this.addDomainEvent(
      new OrderCancelledEvent({
        orderId: this.id.value,
        reason,
        cancelledAt: new Date().toISOString(),
      }),
    );
  }
}
