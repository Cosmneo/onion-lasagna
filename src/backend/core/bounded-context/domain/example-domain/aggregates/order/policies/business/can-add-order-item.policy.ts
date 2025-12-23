import type { Order } from '../../order.aggregate';

/**
 * Business Policy: Determines if items can be added to an order.
 *
 * Items can only be added to orders that are still in 'pending' status.
 * Once an order is confirmed, shipped, or cancelled, items cannot be added.
 *
 * @param order - The order to check
 * @returns `true` if items can be added to the order
 *
 * @example
 * ```typescript
 * if (!canAddOrderItem(order)) {
 *   throw new InvariantViolationError({
 *     message: 'Cannot add items to non-pending order',
 *     code: 'ORDER_NOT_PENDING',
 *   });
 * }
 * ```
 */
export const canAddOrderItem = (order: Order): boolean => {
  return order.status.isPending();
};
