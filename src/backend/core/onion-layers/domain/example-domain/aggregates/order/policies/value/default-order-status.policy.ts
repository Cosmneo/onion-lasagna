import { OrderStatus } from '../../../../value-objects';

/**
 * Value Policy: Default order status for new orders.
 *
 * New orders start in 'pending' status, awaiting payment confirmation.
 *
 * @returns The default OrderStatus (pending)
 *
 * @example
 * ```typescript
 * const order = new Order(id, {
 *   status: defaultOrderStatus(),
 *   // ...
 * });
 * ```
 */
export const defaultOrderStatus = (): OrderStatus => {
  return OrderStatus.pending();
};
