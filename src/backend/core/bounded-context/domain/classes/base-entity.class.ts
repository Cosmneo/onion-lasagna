import type { BaseValueObject } from './base-value-object.class';

/**
 * Base class for Domain-Driven Design Entities.
 *
 * Entities are domain objects that have a distinct identity that runs through
 * time and different states. Unlike Value Objects (compared by value),
 * Entities are compared by their identity (ID).
 *
 * **Note:** Entities should be composed of Value Objects, which are self-validating.
 * Therefore, entity-level validation is not needed - VOs validate themselves
 * at construction time. Cross-property invariants should be checked in factory methods.
 *
 * Key characteristics:
 * - **Identity**: Each entity has a unique identifier
 * - **Equality by identity**: Two entities with the same ID are considered equal
 * - **Mutable state**: Entity properties can change while identity remains
 * - **Composed of VOs**: Properties should be Value Objects (self-validating)
 * - **Versioning**: Optional version field for optimistic locking
 *
 * @typeParam TId - The identity type (e.g., UuidV7Vo, string, number)
 * @typeParam TProps - The properties type containing entity state
 *
 * @example
 * ```typescript
 * interface UserProps {
 *   name: PersonName;
 *   email: Email;
 *   createdAt: DateVo;
 * }
 *
 * class User extends BaseEntity<UserId, UserProps> {
 *   private constructor(id: UserId, props: UserProps, version?: number) {
 *     super(id, props, version);
 *   }
 *
 *   static create(name: PersonName, email: Email): User {
 *     const id = UserId.create();
 *     return new User(id, {
 *       name,
 *       email,
 *       createdAt: DateVo.now(),
 *     });
 *   }
 *
 *   static fromPersistence(id: UserId, props: UserProps, version: number): User {
 *     return new User(id, props, version);
 *   }
 *
 *   get name(): PersonName {
 *     return this.props.name;
 *   }
 *
 *   get email(): Email {
 *     return this.props.email;
 *   }
 *
 *   changeName(newName: PersonName): void {
 *     this._props.name = newName;
 *   }
 * }
 *
 * const user1 = User.create(PersonName.create('John'), Email.create('john@example.com'));
 * const user2 = User.fromPersistence(user1.id, { ...user1.props }, user1.version);
 * user1.equals(user2); // true - same ID
 * ```
 */
export abstract class BaseEntity<TId, TProps> {
  private readonly _id: TId;
  protected _props: TProps;
  private readonly _version: number;

  /**
   * Creates a new Entity instance.
   *
   * @param id - The unique identifier for this entity
   * @param props - The entity's properties/state (should be composed of Value Objects)
   * @param version - Optional version number for optimistic locking (defaults to 0)
   */
  protected constructor(id: TId, props: TProps, version = 0) {
    this._id = id;
    this._props = props;
    this._version = version;
  }

  /**
   * The unique identifier for this entity.
   *
   * @returns The entity's ID of type TId
   */
  public get id(): TId {
    return this._id;
  }

  /**
   * The entity's properties/state.
   *
   * Protected to encourage encapsulation via specific getters.
   * Subclasses should expose individual properties as needed.
   *
   * @returns The entity's properties of type TProps
   */
  protected get props(): TProps {
    return this._props;
  }

  /**
   * The version number for optimistic locking.
   *
   * Use this to detect concurrent modifications:
   * - Load entity with version N
   * - Attempt to save with "WHERE version = N"
   * - If rows affected = 0, another process modified the entity
   *
   * @returns The current version number
   */
  public get version(): number {
    return this._version;
  }

  /**
   * Compares this Entity with another for equality.
   *
   * Entities are equal if they have the same identity (ID).
   * This differs from Value Objects which compare by value.
   *
   * @param other - The Entity to compare with
   * @returns `true` if the IDs are equal, `false` otherwise
   *
   * @example
   * ```typescript
   * const user1 = User.create(PersonName.create('John'), Email.create('john@example.com'));
   * const user2 = User.fromPersistence(user1.id, { name: PersonName.create('John Updated'), ... }, 1);
   * user1.equals(user2); // true - same ID, different state
   * ```
   */
  public equals(other: BaseEntity<TId, TProps>): boolean {
    if (this === other) return true;
    return this.idEquals(this._id, other._id);
  }

  /**
   * Compares two IDs for equality.
   *
   * Handles both Value Object IDs (with `equals` method) and primitives.
   * Override this method if using a custom ID type with different comparison logic.
   *
   * @param a - First ID to compare
   * @param b - Second ID to compare
   * @returns `true` if IDs are equal, `false` otherwise
   */
  protected idEquals(a: TId, b: TId): boolean {
    // Same reference
    if (a === b) return true;

    // Handle Value Object IDs (have equals method)
    if (this.isValueObjectId(a) && this.isValueObjectId(b)) {
      return a.equals(b);
    }

    // Primitive comparison
    return a === b;
  }

  /**
   * Type guard to check if an ID is a Value Object with an equals method.
   * @internal
   */
  private isValueObjectId(id: TId): id is TId & BaseValueObject<unknown> {
    return (
      id !== null &&
      typeof id === 'object' &&
      'equals' in id &&
      typeof (id as Record<string, unknown>)['equals'] === 'function'
    );
  }

  /**
   * Returns the next version number.
   *
   * Call this when persisting changes to implement optimistic locking.
   * The repository should save with version + 1.
   *
   * @returns The next version number (current + 1)
   *
   * @example
   * ```typescript
   * // In repository
   * async save(entity: User): Promise<void> {
   *   await this.db.update({
   *     ...entity.toPersistence(),
   *     version: entity.nextVersion(),
   *   }).where({ id: entity.id, version: entity.version });
   * }
   * ```
   */
  protected nextVersion(): number {
    return this._version + 1;
  }
}
