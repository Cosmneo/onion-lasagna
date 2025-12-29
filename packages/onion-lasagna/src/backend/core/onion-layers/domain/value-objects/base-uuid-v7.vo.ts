/**
 * Base UUID v7 value object for time-sortable entity identifiers.
 *
 * UUID v7 is a time-ordered UUID that combines a Unix timestamp with
 * random bits, making it ideal for database primary keys because:
 *
 * **Benefits:**
 * - **Time-sortable**: IDs created later sort after earlier ones
 * - **Database-friendly**: Sequential nature reduces B-tree fragmentation
 * - **Globally unique**: Same uniqueness guarantees as other UUID versions
 * - **Timestamp extractable**: Creation time can be derived from the ID
 *
 * @example Extending with validation (using validator wrappers)
 * ```typescript
 * import { UuidV7Vo } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 *
 * const id = UuidV7Vo.generate();
 * const parsed = UuidV7Vo.create('018f3b1c-5e7d-7000-8000-000000000001');
 * ```
 *
 * @example Extending in domain layer (no validation)
 * ```typescript
 * import { v7 } from 'uuid';
 *
 * class OrderId extends BaseUuidV7Vo {
 *   static create(value: string): OrderId {
 *     return new OrderId(value, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 *
 *   static generate(): OrderId {
 *     return new OrderId(v7(), SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 * }
 * ```
 */
import { v7 } from 'uuid';
import {
    BaseValueObject,
    SKIP_VALUE_OBJECT_VALIDATION,
    type VoClass,
} from '../classes/base-value-object.class';

/** Static interface for BaseUuidV7Vo factory. */
export type BaseUuidV7VoStatic = VoClass<BaseUuidV7Vo>;

/**
 * Interface for UUID v7 value object classes (static side).
 *
 * Extends VoClass with `generate()` for creating new UUIDs.
 */
export interface UuidV7VoClass extends VoClass<BaseUuidV7Vo> {
    generate(): BaseUuidV7Vo;
}

/**
 * Value object for UUID v7 identifiers.
 *
 * Provides `generate()` for creating new IDs. Subclasses should add
 * their own `create()` for parsing external input with appropriate validation.
 *
 * @extends BaseValueObject<string>
 */
export class BaseUuidV7Vo extends BaseValueObject<string> {
    /**
     * Creates a UUID v7 value object. Must be implemented by subclass.
     * @throws {Error} Always throws - subclasses must override this method
     */
    static create(_value: string): BaseUuidV7Vo {
        throw new Error('create must be implemented by subclass');
    }

    /**
     * Generates a new UUID v7 value object.
     * No validation needed since uuid library guarantees valid output.
     */
    static generate(): BaseUuidV7Vo {
        return new BaseUuidV7Vo(v7(), SKIP_VALUE_OBJECT_VALIDATION);
    }
}