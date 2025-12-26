import { BaseDomainEvent } from '../../classes';

/**
 * Payload for the OrderCancelled domain event.
 */
export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  cancelledAt: string;
}

/**
 * Domain event raised when an order is cancelled.
 *
 * @example
 * ```typescript
 * order.addDomainEvent(new OrderCancelledEvent({
 *   orderId: order.id.value,
 *   reason: 'Customer requested cancellation',
 *   cancelledAt: new Date().toISOString(),
 * }));
 * ```
 */
export class OrderCancelledEvent extends BaseDomainEvent<OrderCancelledPayload> {
  constructor(payload: OrderCancelledPayload) {
    super('OrderCancelled', payload.orderId, payload);
  }
}
