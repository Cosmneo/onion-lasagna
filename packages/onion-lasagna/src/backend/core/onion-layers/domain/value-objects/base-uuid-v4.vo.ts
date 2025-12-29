/**
 * Base UUID v4 value object for random entity identifiers.
 *
 * UUID v4 is a randomly generated UUID, suitable for identifiers where
 * time-ordering is not required. For time-sortable IDs, use {@link BaseUuidV7Vo}.
 *
 * **Use Cases:**
 * - User IDs (for audit tracking)
 * - Session tokens
 * - Correlation IDs
 * - Any identifier where time-ordering doesn't matter
 *
 * @example Extending with validation (using validator wrappers)
 * ```typescript
 * import { UuidV4Vo } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 *
 * const id = UuidV4Vo.generate();
 * const parsed = UuidV4Vo.create('550e8400-e29b-41d4-a716-446655440000');
 * ```
 *
 * @example Extending in domain layer (no validation)
 * ```typescript
 * import { v4 } from 'uuid';
 *
 * class UserId extends BaseUuidV4Vo {
 *   static create(value: string): UserId {
 *     return new UserId(value, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 *
 *   static generate(): UserId {
 *     return new UserId(v4(), SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 * }
 * ```
 */
import { v4 } from 'uuid';
import {
    BaseValueObject,
    SKIP_VALUE_OBJECT_VALIDATION,
    type VoClass,
} from '../classes/base-value-object.class';

/** Static interface for BaseUuidV4Vo factory. */
export type BaseUuidV4VoStatic = VoClass<BaseUuidV4Vo>;

/**
 * Interface for UUID v4 value object classes (static side).
 *
 * Extends VoClass with `generate()` for creating new UUIDs.
 */
export interface UuidV4VoClass extends VoClass<BaseUuidV4Vo> {
    generate(): BaseUuidV4Vo;
}

/**
 * Value object for UUID v4 identifiers.
 *
 * Provides `generate()` for creating new IDs. Subclasses should add
 * their own `create()` for parsing external input with appropriate validation.
 *
 * @extends BaseValueObject<string>
 */
export class BaseUuidV4Vo extends BaseValueObject<string> {
    /**
     * Creates a UUID v4 value object. Must be implemented by subclass.
     * @throws {Error} Always throws - subclasses must override this method
     */
    static create(_value: string): BaseUuidV4Vo {
        throw new Error('create must be implemented by subclass');
    }

    /**
     * Generates a new UUID v4 value object.
     * No validation needed since uuid library guarantees valid output.
     */
    static generate(): BaseUuidV4Vo {
        return new BaseUuidV4Vo(v4(), SKIP_VALUE_OBJECT_VALIDATION);
    }
}
