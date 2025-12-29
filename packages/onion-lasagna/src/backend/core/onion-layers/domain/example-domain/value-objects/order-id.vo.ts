import { v7 } from 'uuid';
import { BaseUuidV7Vo } from '../../value-objects/base-uuid-v7.vo';

/**
 * Value Object representing an Order's unique identifier.
 *
 * Extends BaseUuidV7Vo to use time-ordered UUIDs for better
 * database indexing and natural ordering.
 *
 * @example
 * ```typescript
 * const orderId = OrderId.generate();
 * console.log(orderId.value); // '01902e8a-7c3b-7def-8a1b-...'
 *
 * orderId.equals(anotherOrderId); // true if same value
 * ```
 */
export class OrderId extends BaseUuidV7Vo {
  static override generate(): OrderId {
    return new OrderId(v7());
  }
}
