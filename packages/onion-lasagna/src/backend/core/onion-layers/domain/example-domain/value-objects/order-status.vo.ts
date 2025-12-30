import { BaseValueObject } from '../../classes';

/**
 * Possible values for an order's status.
 */
export type OrderStatusValue = 'pending' | 'confirmed' | 'shipped' | 'cancelled';

/**
 * Value Object representing an Order's status.
 *
 * Provides type-safe status values with behavior methods for checking state.
 * Uses static factory methods to ensure only valid statuses can be created.
 *
 * @example
 * ```typescript
 * const status = OrderStatus.pending();
 *
 * if (status.isPending()) {
 *   // Can modify order
 * }
 *
 * if (status.isShipped()) {
 *   // Cannot cancel
 * }
 * ```
 */
export class OrderStatus extends BaseValueObject<OrderStatusValue> {
  /**
   * Creates a new OrderStatus with 'pending' value.
   * Use when creating new orders.
   */
  static pending(): OrderStatus {
    return new OrderStatus('pending');
  }

  /**
   * Creates a new OrderStatus with 'confirmed' value.
   * Use when payment is received.
   */
  static confirmed(): OrderStatus {
    return new OrderStatus('confirmed');
  }

  /**
   * Creates a new OrderStatus with 'shipped' value.
   * Use when order is dispatched.
   */
  static shipped(): OrderStatus {
    return new OrderStatus('shipped');
  }

  /**
   * Creates a new OrderStatus with 'cancelled' value.
   * Use when order is cancelled by customer or system.
   */
  static cancelled(): OrderStatus {
    return new OrderStatus('cancelled');
  }

  /**
   * Reconstitutes an OrderStatus from a persisted value.
   *
   * @param value - The status value from persistence
   */
  static reconstitute(value: OrderStatusValue): OrderStatus {
    return new OrderStatus(value);
  }

  /**
   * Checks if the order is in pending status.
   */
  isPending(): boolean {
    return this.value === 'pending';
  }

  /**
   * Checks if the order is confirmed.
   */
  isConfirmed(): boolean {
    return this.value === 'confirmed';
  }

  /**
   * Checks if the order has been shipped.
   */
  isShipped(): boolean {
    return this.value === 'shipped';
  }

  /**
   * Checks if the order has been cancelled.
   */
  isCancelled(): boolean {
    return this.value === 'cancelled';
  }

  /**
   * Checks if the order can still be modified (pending or confirmed).
   */
  isModifiable(): boolean {
    return this.isPending() || this.isConfirmed();
  }
}
