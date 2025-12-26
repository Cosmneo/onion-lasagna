import { BaseDomainEvent } from '../../classes';

/**
 * Payload for the OrderPlaced domain event.
 */
export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  placedAt: string;
}

/**
 * Domain event raised when a new order is placed.
 *
 * @example
 * ```typescript
 * order.addDomainEvent(new OrderPlacedEvent({
 *   orderId: order.id.value,
 *   customerId: order.customerId,
 *   itemCount: order.items.length,
 *   totalAmount: order.totalAmount.amount,
 *   currency: order.totalAmount.currency,
 *   placedAt: new Date().toISOString(),
 * }));
 * ```
 */
export class OrderPlacedEvent extends BaseDomainEvent<OrderPlacedPayload> {
  constructor(payload: OrderPlacedPayload) {
    super('OrderPlaced', payload.orderId, payload);
  }
}
