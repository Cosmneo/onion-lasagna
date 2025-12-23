import { InvariantViolationError } from '../../exceptions/invariant-violation.error';

/**
 * Error thrown when attempting to modify an order that has already been shipped.
 *
 * @example
 * ```typescript
 * if (order.status.isShipped()) {
 *   throw new OrderAlreadyShippedError(order.id.value);
 * }
 * ```
 */
export class OrderAlreadyShippedError extends InvariantViolationError {
  constructor(orderId: string) {
    super({
      message: `Order ${orderId} has already been shipped and cannot be modified`,
      code: 'ORDER_ALREADY_SHIPPED',
    });
  }
}
