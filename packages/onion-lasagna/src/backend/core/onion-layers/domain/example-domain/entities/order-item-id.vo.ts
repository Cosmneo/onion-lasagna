import { v7 } from 'uuid';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../classes/base-value-object.class';
import { BaseUuidV7Vo } from '../../value-objects/base-uuid-v7.vo';

/**
 * Value Object representing an OrderItem's unique identifier.
 */
export class OrderItemId extends BaseUuidV7Vo {
    static override create(value: string): OrderItemId {
        return new OrderItemId(value, SKIP_VALUE_OBJECT_VALIDATION);
    }

    static override generate(): OrderItemId {
        return new OrderItemId(v7(), SKIP_VALUE_OBJECT_VALIDATION);
    }
}
