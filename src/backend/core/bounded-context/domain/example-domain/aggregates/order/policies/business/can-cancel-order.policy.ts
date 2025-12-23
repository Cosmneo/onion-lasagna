import type { Order } from '../../order.aggregate';

/**
 * Business Policy: Determines if an order can be cancelled.
 *
 * Orders can only be cancelled if they have not yet been shipped.
 * Once an order is shipped or delivered, it cannot be cancelled.
 *
 * @param order - The order to check
 * @returns `true` if the order can be cancelled
 *
 * @example
 * ```typescript
 * if (!canCancelOrder(order)) {
 *   throw new InvariantViolationError({
 *     message: 'Order cannot be cancelled',
 *     code: 'ORDER_CANNOT_CANCEL',
 *   });
 * }
 * ```
 */
export const canCancelOrder = (order: Order): boolean => {
  return order.status.isPending() || order.status.isConfirmed();
};
