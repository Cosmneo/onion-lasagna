# Domain Layer Structure

This document describes the recommended folder structure for the domain layer in a DDD-style application using `onion-lasagna`.

---

## Overview

```
src/backend/core/bounded-context/domain/
├── classes/              # Base classes (BaseEntity, BaseAggregateRoot, etc.)
├── exceptions/           # Domain-level errors
├── value-objects/        # Shared base value objects
└── [domain-name]/        # Your bounded context domain
    ├── aggregates/       # Aggregate roots with policies
    ├── entities/         # Non-root entities
    ├── events/           # Domain events
    ├── exceptions/       # Domain-specific errors
    └── value-objects/    # Domain-specific value objects
```

---

## Folder Breakdown

### `/value-objects`

Contains domain-specific Value Objects that extend base library VOs.

```
value-objects/
├── order-id.vo.ts           # Extends BaseUuidV7Vo
├── order-status.vo.ts       # Extends BaseValueObject
├── money.vo.ts              # Extends BaseValueObject
└── index.ts
```

VOs should always extend the base library classes:

```typescript
// order-id.vo.ts - Simple extension of base UUID
import { BaseUuidV7Vo } from '../../value-objects/base-uuid-v7.vo';

export class OrderId extends BaseUuidV7Vo {}

// order-status.vo.ts - Enum-style VO with behavior
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../../classes';

type OrderStatusValue = 'pending' | 'confirmed' | 'shipped' | 'cancelled';

export class OrderStatus extends BaseValueObject<OrderStatusValue> {
  static pending(): OrderStatus {
    return new OrderStatus('pending', SKIP_VALUE_OBJECT_VALIDATION);
  }

  isPending(): boolean {
    return this.value === 'pending';
  }
}
```

---

### `/aggregates`

Contains aggregate roots - the entry points to aggregates. Each aggregate has its own folder with policies.

```
aggregates/
├── order/
│   ├── policies/
│   │   ├── value/        # Value policies (defaults, factories)
│   │   └── business/     # Business policies (invariants, rules)
│   └── order.aggregate.ts
└── index.ts
```

#### Value Policies (`/policies/value/`)

Value policies define **default values, factories, and value transformations**. They answer: "What should the default state be?"

Examples:

- Default order status when created
- Initial inventory quantity
- Default shipping method

```typescript
// policies/value/default-order-status.policy.ts
import { OrderStatus } from '../../value-objects';

/**
 * Policy: New orders start in 'pending' status.
 */
export const defaultOrderStatus = (): OrderStatus => {
  return OrderStatus.pending();
};
```

#### Business Policies (`/policies/business/`)

Business policies define **invariants, validations, and business rules**. They answer: "Is this operation allowed?"

Examples:

- Can an order be cancelled?
- Is the customer eligible for discount?
- Can items be added to this order?

```typescript
// policies/business/can-cancel-order.policy.ts
import type { Order } from '../order.aggregate';

/**
 * Policy: Orders can only be cancelled if not yet shipped.
 */
export const canCancelOrder = (order: Order): boolean => {
  return order.status.isPending() || order.status.isConfirmed();
};
```

---

### `/entities`

Contains non-root entities that belong to aggregates but are not entry points.

```
entities/
├── order-item.entity.ts
└── index.ts
```

Entities have identity but are accessed through their aggregate root:

```typescript
// order-item.entity.ts
export class OrderItem extends BaseEntity<OrderItemId, OrderItemProps> {
  // Accessed via Order aggregate, not directly
}
```

---

### `/events`

Contains domain events raised by aggregates.

```
events/
├── order-placed.event.ts
├── order-cancelled.event.ts
└── index.ts
```

```typescript
// order-placed.event.ts
interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  placedAt: string;
}

export class OrderPlacedEvent extends BaseDomainEvent<OrderPlacedPayload> {
  constructor(payload: OrderPlacedPayload) {
    super('OrderPlaced', payload.orderId, payload);
  }
}
```

---

### `/exceptions`

Contains domain-specific errors.

```
exceptions/
├── order-already-shipped.error.ts
└── index.ts
```

```typescript
// order-already-shipped.error.ts
export class OrderAlreadyShippedError extends InvariantViolationError {
  constructor(orderId: string) {
    super({
      message: `Order ${orderId} has already been shipped`,
      code: 'ORDER_ALREADY_SHIPPED',
    });
  }
}
```

---

## Complete Example Structure

```
example-domain/
├── aggregates/
│   ├── order/
│   │   ├── policies/
│   │   │   ├── value/
│   │   │   │   ├── default-order-status.policy.ts
│   │   │   │   └── index.ts
│   │   │   ├── business/
│   │   │   │   ├── can-cancel-order.policy.ts
│   │   │   │   ├── can-add-order-item.policy.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── order.aggregate.ts
│   └── index.ts
├── entities/
│   ├── order-item.entity.ts
│   └── index.ts
├── events/
│   ├── order-placed.event.ts
│   ├── order-cancelled.event.ts
│   └── index.ts
├── exceptions/
│   ├── order-already-shipped.error.ts
│   └── index.ts
├── value-objects/
│   ├── order-id.vo.ts
│   ├── order-status.vo.ts
│   ├── money.vo.ts
│   └── index.ts
└── index.ts
```

---

## Policy Usage in Aggregates

```typescript
// order.aggregate.ts
import { BaseAggregateRoot } from '../../classes';
import { InvariantViolationError } from '../../exceptions';
import { defaultOrderStatus } from './policies/value';
import { canCancelOrder, canAddOrderItem } from './policies/business';
import { OrderPlacedEvent, OrderCancelledEvent } from '../events';
import { OrderId, OrderStatus, Money } from '../value-objects';

export class Order extends BaseAggregateRoot<OrderId, OrderProps> {
  static create(customerId: string, items: OrderItem[]): Order {
    const order = new Order(OrderId.create(), {
      customerId,
      items,
      status: defaultOrderStatus(), // Value policy
      totalAmount: Money.zero(),
      placedAt: new Date(),
    });

    order.addDomainEvent(
      new OrderPlacedEvent({
        orderId: order.id.value,
        customerId,
        totalAmount: order.totalAmount.amount,
        placedAt: order.placedAt.toISOString(),
      }),
    );

    return order;
  }

  addItem(item: OrderItem): void {
    if (!canAddOrderItem(this)) {
      // Business policy
      throw new InvariantViolationError({
        message: 'Cannot add items to non-pending order',
        code: 'ORDER_NOT_PENDING',
      });
    }
    this._props.items.push(item);
  }

  cancel(reason: string): void {
    if (!canCancelOrder(this)) {
      // Business policy
      throw new InvariantViolationError({
        message: 'Order cannot be cancelled',
        code: 'ORDER_CANNOT_CANCEL',
      });
    }
    this._props.status = OrderStatus.cancelled();
    this.addDomainEvent(
      new OrderCancelledEvent({
        orderId: this.id.value,
        reason,
        cancelledAt: new Date().toISOString(),
      }),
    );
  }
}
```

---

## Summary

| Folder                                  | Purpose                   | Examples                        |
| --------------------------------------- | ------------------------- | ------------------------------- |
| `/value-objects/`                       | Domain-specific VOs       | OrderId, OrderStatus, Money     |
| `/aggregates/[name]/policies/value/`    | Default values, factories | Default status, timestamps      |
| `/aggregates/[name]/policies/business/` | Invariants, rules         | Can cancel? Is eligible?        |
| `/entities/`                            | Non-root entities         | OrderItem, Address              |
| `/events/`                              | Domain events             | OrderPlaced, CustomerRegistered |
| `/exceptions/`                          | Domain errors             | OrderAlreadyShipped             |
