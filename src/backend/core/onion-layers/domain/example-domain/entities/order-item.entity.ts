import { BaseEntity } from '../../classes';
import { OrderItemId } from './order-item-id.vo';
import type { Money } from '../value-objects';

/**
 * Properties for an OrderItem entity.
 */
export interface OrderItemProps {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Money;
}

/**
 * Entity representing a line item within an Order aggregate.
 *
 * OrderItem is not an aggregate root - it's accessed through the Order aggregate.
 * It has its own identity but cannot exist independently of an Order.
 *
 * @example
 * ```typescript
 * const item = OrderItem.create({
 *   productId: 'prod-123',
 *   productName: 'Widget',
 *   quantity: 2,
 *   unitPrice: Money.usd(29.99),
 * });
 *
 * console.log(item.totalPrice.amount); // 59.98
 * ```
 */
export class OrderItem extends BaseEntity<OrderItemId, OrderItemProps> {
  private constructor(id: OrderItemId, props: OrderItemProps) {
    super(id, props);
  }

  /**
   * Creates a new OrderItem.
   */
  static create(props: OrderItemProps): OrderItem {
    return new OrderItem(OrderItemId.generate(), props);
  }

  /**
   * Reconstitutes an OrderItem from persistence.
   */
  static fromPersistence(id: OrderItemId, props: OrderItemProps): OrderItem {
    return new OrderItem(id, props);
  }

  get productId(): string {
    return this.props.productId;
  }

  get productName(): string {
    return this.props.productName;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  /**
   * Calculates the total price for this line item.
   */
  get totalPrice(): Money {
    return this.props.unitPrice.multiply(this.props.quantity);
  }

  /**
   * Updates the quantity of this item.
   */
  updateQuantity(newQuantity: number): void {
    this._props.quantity = newQuantity;
  }

  /**
   * Converts to a plain object for events or persistence.
   */
  toPlain(): {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: { amount: number; currency: string };
  } {
    return {
      id: this.id.value,
      productId: this.props.productId,
      productName: this.props.productName,
      quantity: this.props.quantity,
      unitPrice: {
        amount: this.props.unitPrice.amount,
        currency: this.props.unitPrice.currency,
      },
    };
  }
}
