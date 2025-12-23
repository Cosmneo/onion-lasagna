# Example Domain: Order Management

This example demonstrates a simplified e-commerce order management domain, showing how business concepts translate to DDD building blocks using `onion-lasagna`.

---

## Business Scenario

A customer places an order containing one or more items. Each order goes through a lifecycle:

```
[Pending] → [Confirmed] → [Shipped]
     ↓           ↓
[Cancelled] [Cancelled]
```

**Business Rules:**
1. New orders start in "pending" status
2. Items can only be added while the order is pending
3. Orders can only be cancelled before shipping
4. Each order has a total amount calculated from its items
5. When significant actions occur, the system must notify other parts of the application

---

## Domain Elements Mapping

### Value Objects (`/value-objects/`)

Value Objects represent concepts with no identity - they are defined by their attributes.

| Business Concept | Value Object | Why VO? |
|-----------------|--------------|---------|
| Order identifier | `OrderId` | Unique ID, but two orders with same ID are the same order |
| Order lifecycle state | `OrderStatus` | 'pending', 'confirmed', etc. - defined by value, not identity |
| Monetary amount | `Money` | $50 USD is equal to any other $50 USD |

```typescript
// OrderStatus - enum-style VO with behavior
const status = OrderStatus.pending();
if (status.isPending()) {
  // Can modify order
}

// Money - composite VO with operations
const price = Money.usd(29.99);
const total = price.multiply(2);  // $59.98
```

---

### Entities (`/entities/`)

Entities have identity and can change state over time.

| Business Concept | Entity | Why Entity? |
|-----------------|--------|-------------|
| Line item in order | `OrderItem` | Each item is unique even if same product - can update quantity |

```typescript
// OrderItem has identity (OrderItemId) and mutable state
const item = OrderItem.create({
  productId: 'prod-123',
  productName: 'Widget',
  quantity: 2,
  unitPrice: Money.usd(29.99),
});

item.updateQuantity(3);  // State changes, identity remains
```

---

### Aggregate Root (`/aggregates/order/`)

The Order is an Aggregate Root - the entry point that enforces invariants across the aggregate.

| Business Concept | Aggregate Root | Why Aggregate Root? |
|-----------------|----------------|---------------------|
| Customer order | `Order` | Controls access to items, enforces business rules |

```typescript
// Order controls its items - external code cannot modify items directly
const order = Order.create('customer-123', [item1, item2]);

// Business rules enforced through the aggregate
order.addItem(newItem);  // Only works if order is pending
order.cancel('Changed mind');  // Only works if not shipped
```

**Aggregate Boundary:**
```
┌─────────────────────────────────┐
│           Order (Root)          │
│  ┌─────────┐  ┌─────────┐      │
│  │OrderItem│  │OrderItem│ ...  │
│  └─────────┘  └─────────┘      │
└─────────────────────────────────┘
        ↑
   External access only through Order
```

---

### Policies (`/aggregates/order/policies/`)

Policies extract business rules into reusable, testable functions.

#### Value Policies (`/policies/value/`)

Answer: **"What should the default value be?"**

| Business Rule | Policy | Implementation |
|--------------|--------|----------------|
| New orders start as pending | `defaultOrderStatus()` | Returns `OrderStatus.pending()` |

```typescript
// Used in Order.create()
static create(customerId: string, items: OrderItem[]): Order {
  return new Order(id, {
    status: defaultOrderStatus(),  // Policy provides default
    // ...
  });
}
```

#### Business Policies (`/policies/business/`)

Answer: **"Is this operation allowed?"**

| Business Rule | Policy | Implementation |
|--------------|--------|----------------|
| Items only added to pending orders | `canAddOrderItem(order)` | Returns `order.status.isPending()` |
| Cancel only before shipping | `canCancelOrder(order)` | Returns `pending` or `confirmed` |

```typescript
// Used in Order.addItem()
addItem(item: OrderItem): void {
  if (!canAddOrderItem(this)) {  // Policy check
    throw new InvariantViolationError({
      message: 'Cannot add items to non-pending order',
    });
  }
  this._props.items.push(item);
}
```

---

### Domain Events (`/events/`)

Events capture significant occurrences that other parts of the system might need to react to.

| Business Occurrence | Event | Payload |
|--------------------|-------|---------|
| New order placed | `OrderPlacedEvent` | orderId, customerId, itemCount, totalAmount |
| Order cancelled | `OrderCancelledEvent` | orderId, reason, cancelledAt |

```typescript
// Raised in Order.create()
order.addDomainEvent(new OrderPlacedEvent({
  orderId: order.id.value,
  customerId,
  itemCount: items.length,
  totalAmount: order.totalAmount.amount,
  currency: order.totalAmount.currency,
  placedAt: new Date().toISOString(),
}));

// Repository publishes after save
async save(order: Order): Promise<void> {
  await this.db.save(order);
  const events = order.pullDomainEvents();
  for (const event of events) {
    await this.eventBus.publish(event);
  }
}
```

---

### Domain Exceptions (`/exceptions/`)

Domain-specific errors for invariant violations.

| Business Violation | Exception | When Thrown |
|-------------------|-----------|-------------|
| Modifying shipped order | `OrderAlreadyShippedError` | Attempting to add items or cancel |

```typescript
// Could be used in Order methods
if (this.status.isShipped()) {
  throw new OrderAlreadyShippedError(this.id.value);
}
```

---

## Complete Flow Example

```typescript
// 1. Create order with items
const order = Order.create('customer-123', [
  OrderItem.create({
    productId: 'widget-1',
    productName: 'Premium Widget',
    quantity: 2,
    unitPrice: Money.usd(49.99),
  }),
]);
// → OrderPlacedEvent raised

// 2. Add another item (allowed - order is pending)
order.addItem(OrderItem.create({
  productId: 'gadget-1',
  productName: 'Super Gadget',
  quantity: 1,
  unitPrice: Money.usd(99.99),
}));

// 3. Confirm order
order.confirm();

// 4. Try to add item (fails - order is confirmed)
order.addItem(anotherItem);
// → InvariantViolationError: Cannot add items to non-pending order

// 5. Cancel order (allowed - not shipped yet)
order.cancel('Customer changed mind');
// → OrderCancelledEvent raised

// 6. Repository saves and publishes events
await orderRepository.save(order);
// → Events published to message bus
```

---

## Summary

| DDD Building Block | Example | Purpose |
|-------------------|---------|---------|
| **Value Object** | `OrderId`, `OrderStatus`, `Money` | Immutable values, equality by content |
| **Entity** | `OrderItem` | Has identity, mutable state |
| **Aggregate Root** | `Order` | Entry point, enforces invariants |
| **Value Policy** | `defaultOrderStatus()` | Provides default values |
| **Business Policy** | `canCancelOrder()` | Encapsulates business rules |
| **Domain Event** | `OrderPlacedEvent` | Captures significant occurrences |
| **Domain Exception** | `OrderAlreadyShippedError` | Domain-specific error handling |
