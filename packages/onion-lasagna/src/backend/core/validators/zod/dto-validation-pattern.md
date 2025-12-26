# DTO Validation Pattern with Zod

This document explains the architectural pattern used for DTO (Data Transfer Object) validation using Zod while maintaining decoupling between the Application Layer and specific validation libraries.

## Overview

The core idea is to define **Ports** (Interfaces) using raw data types and a generic `BaseDto` wrapper. The **Adapters** (Implementations) then use Zod-specific DTO subclasses to enforce validation at runtime.

### Key Benefits

1.  **Decoupling**: The Application core (Ports) doesn't know about Zod.
2.  **Type Safety**: The Adapter works with specific, validated DTO types.
3.  **Automatic Validation**: Validation is triggered automatically upon DTO instantiation (fail-fast).
4.  **Contract Enforcement**: Both Input and Output are validated, protecting the use case from external and internal data corruption.

---

## Implementation Example

```typescript
import { z } from 'zod';
import { BaseDto } from './wrappers/dto';
import { BaseInboundAdapter } from '../../onion-layers/app/classes/base-inbound-adapter.class';
import { BaseInboundPort } from '../../onion-layers/app/interfaces/ports/base-inbound.port';

// 1. Define Schemas
const inputSchema = z.object({ name: z.string(), age: z.number() });
const outputSchema = z.object({ id: z.string() });

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

// 2. Create Zod-specific DTOs
class InputDto extends Dto<Input> {
  constructor(value: Input) {
    super(inputSchema, value);
  }
}

class OutputDto extends Dto<Output> {
  constructor(value: Output) {
    super(outputSchema, value);
  }
}

// 3. Define the Generic Port
interface MyUsecasePort extends BaseInboundPort<Input, Output> {}

// 4. Implement the Adapter with specific DTOs
class MyUsecaseAdapter
  extends BaseInboundAdapter<Input, Output, InputDto, OutputDto>
  implements MyUsecasePort
{
  protected async handle(input: InputDto): Promise<OutputDto> {
    // Input is already validated here
    const { name } = input.data;

    // Output validation is triggered by 'new OutputDto'
    return new OutputDto({ id: '123' });
  }
}
```

---

## How It Works

### 1. Dual-Layer Validation

- **Input Validation**: Triggered when the caller (e.g., a Controller) instantiates the `InputDto`. If the request payload is invalid, an error is thrown before the use case is even executed.
- **Output Validation**: Triggered when the adapter instantiates the `OutputDto` at the end of its `handle` method. This ensures the use case never returns data that violates its own contract.

### 2. Generic `BaseInboundAdapter`

The `BaseInboundAdapter` uses generic parameters to bridge the gap between the Port and the Implementation:

```typescript
export abstract class BaseInboundAdapter<
  TInput,
  TOutput,
  TInDto extends BaseDto<TInput> = BaseDto<TInput>,
  TOutDto extends BaseDto<TOutput> = BaseDto<TOutput>,
> implements BaseInboundPort<TInput, TOutput> {
  // ...
}
```

- `TInput` / `TOutput`: The raw data shapes defined in the Port.
- `TInDto` / `TOutDto`: The specific Zod DTO classes used in the Implementation.

### 3. The Bootstrapping Flow

When the application runs:

1.  A **Controller** receives a request.
2.  It creates an `InputDto(requestBody)`. **[Zod runs here]**.
3.  It calls `useCase.execute(inputDto)`.
4.  The `BaseInboundAdapter` receives the generic `BaseDto` and casts it to the specific `InputDto` required by the `handle` method.
5.  The `handle` method processes the data and returns `new OutputDto(result)`. **[Zod runs here]**.
6.  The validated result travels back to the controller.

---

## Summary

By using this pattern, you ensure that if an object exists in your system (as a DTO), it is **guaranteed** to be valid according to its schema. You achieve "Validation as a Type".
