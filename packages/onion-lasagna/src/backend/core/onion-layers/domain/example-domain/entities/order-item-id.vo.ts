import { v7 } from 'uuid';
import { BaseUuidV7Vo } from '../../value-objects/base-uuid-v7.vo';

/**
 * Value Object representing an OrderItem's unique identifier.
 */
export class OrderItemId extends BaseUuidV7Vo {
  static override generate(): OrderItemId {
    return new OrderItemId(v7());
  }
}
