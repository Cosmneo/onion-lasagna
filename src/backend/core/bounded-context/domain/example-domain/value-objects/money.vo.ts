import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../../classes';
import { InvariantViolationError } from '../../exceptions/invariant-violation.error';

/**
 * The underlying value structure for Money.
 */
export interface MoneyValue {
  amount: number;
  currency: string;
}

/**
 * Value Object representing a monetary amount with currency.
 *
 * Provides arithmetic operations and comparison methods.
 * Prevents operations between different currencies.
 *
 * @example
 * ```typescript
 * const price = Money.usd(29.99);
 * const tax = Money.usd(2.40);
 * const total = price.add(tax);
 *
 * console.log(total.amount);   // 32.39
 * console.log(total.currency); // 'USD'
 *
 * if (total.isGreaterThan(Money.usd(30))) {
 *   // Apply discount
 * }
 * ```
 */
export class Money extends BaseValueObject<MoneyValue> {
  /**
   * Creates a Money instance with USD currency.
   *
   * @param amount - The monetary amount
   */
  static usd(amount: number): Money {
    return new Money({ amount, currency: 'USD' }, SKIP_VALUE_OBJECT_VALIDATION);
  }

  /**
   * Creates a Money instance with EUR currency.
   *
   * @param amount - The monetary amount
   */
  static eur(amount: number): Money {
    return new Money({ amount, currency: 'EUR' }, SKIP_VALUE_OBJECT_VALIDATION);
  }

  /**
   * Creates a zero amount in the specified currency.
   *
   * @param currency - The currency code (default: 'USD')
   */
  static zero(currency = 'USD'): Money {
    return new Money({ amount: 0, currency }, SKIP_VALUE_OBJECT_VALIDATION);
  }

  /**
   * Reconstitutes a Money from a persisted value.
   *
   * @param value - The money value from persistence
   */
  static fromPersistence(value: MoneyValue): Money {
    return new Money(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  /**
   * The monetary amount.
   */
  get amount(): number {
    return this.value.amount;
  }

  /**
   * The currency code.
   */
  get currency(): string {
    return this.value.currency;
  }

  /**
   * Adds another Money value to this one.
   *
   * @param other - The Money to add
   * @throws {InvariantViolationError} If currencies don't match
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(
      { amount: this.amount + other.amount, currency: this.currency },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  /**
   * Subtracts another Money value from this one.
   *
   * @param other - The Money to subtract
   * @throws {InvariantViolationError} If currencies don't match
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(
      { amount: this.amount - other.amount, currency: this.currency },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  /**
   * Multiplies this Money by a factor.
   *
   * @param factor - The multiplication factor
   */
  multiply(factor: number): Money {
    return new Money(
      { amount: this.amount * factor, currency: this.currency },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  /**
   * Checks if this Money is greater than another.
   *
   * @param other - The Money to compare with
   * @throws {InvariantViolationError} If currencies don't match
   */
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  /**
   * Checks if this Money is less than another.
   *
   * @param other - The Money to compare with
   * @throws {InvariantViolationError} If currencies don't match
   */
  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  /**
   * Checks if this Money represents zero.
   */
  isZero(): boolean {
    return this.amount === 0;
  }

  /**
   * Asserts that two Money values have the same currency.
   * @internal
   */
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new InvariantViolationError({
        message: `Cannot operate on different currencies: ${this.currency} vs ${other.currency}`,
        code: 'CURRENCY_MISMATCH',
      });
    }
  }
}
