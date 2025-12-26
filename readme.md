# Onion Lasagna

Enterprise-grade TypeScript library for building backend applications with hexagonal/onion architecture.

[![Documentation](https://img.shields.io/badge/docs-onion--lasagna.cosmneo.com-blue)](https://onion-lasagna.cosmneo.com)

> Comprehensive documentation available at **[onion-lasagna.cosmneo.com](https://onion-lasagna.cosmneo.com)**

---

## Features

- **Hexagonal Architecture** - Clean separation between domain, application, infrastructure, and presentation layers
- **Framework Agnostic** - Works with Hono, NestJS, Elysia, and Fastify
- **Validator Agnostic** - Choose between Zod, ArkType, Valibot, or TypeBox
- **Type Safe** - Full TypeScript with strict mode, generics throughout
- **Zero Dependencies** - Everything is peer dependencies, install only what you use
- **DDD Building Blocks** - Entity, Value Object, Aggregate Root, Domain Event base classes
- **Error Handling** - Layered error hierarchy with automatic wrapping and mapping

---

## Architecture

```mermaid
graph TB
    subgraph External["External World"]
        HTTP[HTTP Request]
        DB[(Database)]
        EXT[External APIs]
    end

    subgraph Presentation["Presentation Layer"]
        CTRL[Controllers]
        ROUTE[Routing]
    end

    subgraph Application["Application Layer"]
        UC[Use Cases]
        DTO[DTOs]
    end

    subgraph Domain["Domain Layer"]
        ENT[Entities]
        VO[Value Objects]
        AGG[Aggregates]
        EVT[Domain Events]
    end

    subgraph Infrastructure["Infrastructure Layer"]
        REPO[Repositories]
        SVC[External Services]
    end

    HTTP --> CTRL
    CTRL --> UC
    UC --> ENT
    UC --> REPO
    REPO --> DB
    SVC --> EXT

    style Domain fill:#e1f5fe
    style Application fill:#fff3e0
    style Presentation fill:#f3e5f5
    style Infrastructure fill:#e8f5e9
```

### Layer Responsibilities

```mermaid
graph LR
    subgraph P["Presentation"]
        P1[BaseController]
        P2[GuardedController]
        P3[HttpRequest/Response]
    end

    subgraph A["Application"]
        A1[BaseInboundAdapter]
        A2[Use Case Errors]
    end

    subgraph D["Domain"]
        D1[BaseEntity]
        D2[BaseValueObject]
        D3[BaseAggregateRoot]
    end

    subgraph I["Infrastructure"]
        I1[BaseOutboundAdapter]
        I2[Auto Error Wrapping]
    end

    P1 --> A1
    A1 --> D1
    A1 --> I1

    style P fill:#f3e5f5
    style A fill:#fff3e0
    style D fill:#e1f5fe
    style I fill:#e8f5e9
```

---

## Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Framework as Hono/NestJS/Elysia/Fastify
    participant Controller as BaseController
    participant UseCase as Use Case
    participant Repository as Repository
    participant DB as Database

    Client->>Framework: HTTP Request
    Framework->>Controller: execute(HttpRequest)
    Controller->>Controller: requestMapper()
    Controller->>UseCase: execute(Input)
    UseCase->>Repository: findById()
    Repository->>DB: Query
    DB-->>Repository: Data
    Repository-->>UseCase: Entity
    UseCase-->>Controller: Output
    Controller->>Controller: responseMapper()
    Controller-->>Framework: HttpResponse
    Framework-->>Client: HTTP Response
```

---

## Error Hierarchy

```mermaid
graph TD
    CE[CodedError] --> DE[DomainError]
    CE --> UCE[UseCaseError]
    CE --> IE[InfraError]
    CE --> CTE[ControllerError]
    CE --> OVE[ObjectValidationError]

    DE --> IVE[InvariantViolationError]
    DE --> PLE[PartialLoadError]

    UCE --> CFE[ConflictError<br/>409]
    UCE --> NFE[NotFoundError<br/>404]
    UCE --> UPE[UnprocessableError<br/>422]

    IE --> DBE[DbError<br/>500]
    IE --> NWE[NetworkError<br/>500]
    IE --> TME[TimeoutError<br/>500]
    IE --> ESE[ExternalServiceError<br/>500]

    CTE --> ADE[AccessDeniedError<br/>403]
    CTE --> IRE[InvalidRequestError<br/>400]

    style CE fill:#ffcdd2
    style DE fill:#e1bee7
    style UCE fill:#fff9c4
    style IE fill:#c8e6c9
    style CTE fill:#bbdefb
    style OVE fill:#ffe0b2
```

---

## Pick Your Stack

```mermaid
graph LR
    subgraph Validators["Validators (pick one)"]
        ZOD[Zod]
        ARK[ArkType]
        VAL[Valibot]
        TBX[TypeBox]
    end

    subgraph Core["Onion Lasagna Core"]
        OL[Base Classes<br/>Error Handling<br/>Value Objects]
    end

    subgraph Frameworks["Frameworks (pick one)"]
        HONO[Hono]
        NEST[NestJS]
        ELIA[Elysia]
        FAST[Fastify]
    end

    ZOD --> OL
    ARK --> OL
    VAL --> OL
    TBX --> OL

    OL --> HONO
    OL --> NEST
    OL --> ELIA
    OL --> FAST

    style Core fill:#e3f2fd
    style Validators fill:#fff8e1
    style Frameworks fill:#fce4ec
```

---

## Installation

```bash
bun add @cosmneo/onion-lasagna
```

Install peer dependencies based on your choices:

```bash
# Validator (pick one)
bun add zod           # or arktype, valibot, @sinclair/typebox

# Framework (pick one)
bun add hono          # or @nestjs/common @nestjs/core, elysia, fastify

# Required utilities
bun add uuid http-status-codes
```

---

## Quick Start

### 1. Define a Value Object

```typescript
import {
  BaseUUIDv7,
  SKIP_VALUE_OBJECT_VALIDATION,
} from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';

const userIdSchema = z.string().uuid();

export class UserId extends BaseUUIDv7 {
  static generate(): UserId {
    return new UserId(uuidv7(), SKIP_VALUE_OBJECT_VALIDATION);
  }

  static create(value: string): UserId {
    return new UserId(value, createZodValidator(userIdSchema));
  }
}
```

### 2. Define an Entity

```typescript
import { BaseEntity } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

interface UserProps {
  email: string;
  name: string;
}

export class User extends BaseEntity<UserId, UserProps> {
  static create(id: UserId, email: string, name: string): User {
    return new User(id, { email, name });
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  changeName(newName: string): void {
    this._props.name = newName;
  }
}
```

### 3. Define a Use Case

```typescript
import {
  BaseInboundAdapter,
  NotFoundError,
} from '@cosmneo/onion-lasagna/backend/core/onion-layers';

interface GetUserInput {
  userId: string;
}

interface GetUserOutput {
  user: User;
}

export class GetUserUseCase extends BaseInboundAdapter<GetUserInput, GetUserOutput> {
  constructor(private userRepository: UserRepository) {
    super();
  }

  protected async handle(input: GetUserInput): Promise<GetUserOutput> {
    const user = await this.userRepository.findById(UserId.create(input.userId));

    if (!user) {
      throw new NotFoundError({ message: 'User not found' });
    }

    return { user };
  }
}
```

### 4. Define a Controller

```typescript
import { BaseController, HttpResponse } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import type { HttpRequest } from '@cosmneo/onion-lasagna/backend/core/presentation';

export class GetUserController extends BaseController<GetUserInput, GetUserOutput, UserDto> {
  constructor(private getUserUseCase: GetUserUseCase) {
    super();
  }

  protected requestMapper(req: HttpRequest): GetUserInput {
    return { userId: req.pathParams.id };
  }

  protected get useCase() {
    return this.getUserUseCase;
  }

  protected responseMapper(output: GetUserOutput): HttpResponse<UserDto> {
    return HttpResponse.ok({
      id: output.user.id.value,
      email: output.user.email,
      name: output.user.name,
    });
  }
}
```

### 5. Wire Up with Your Framework

**Hono:**

```typescript
import { Hono } from 'hono';
import {
  registerHonoRoutes,
  onionErrorHandler,
} from '@cosmneo/onion-lasagna/backend/frameworks/hono';

const app = new Hono();
app.onError(onionErrorHandler);

registerHonoRoutes(app, [
  {
    method: 'GET',
    path: '/users/{id}',
    controller: new GetUserController(getUserUseCase),
  },
]);
```

**NestJS:**

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  BaseNestController,
  OnionLasagnaRequest,
} from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';

@Controller('users')
export class UserController extends BaseNestController {
  constructor(private getUserController: GetUserController) {
    super();
  }

  @Get(':id')
  getUser(@OnionLasagnaRequest() req: HttpRequest) {
    return this.getUserController.execute(req);
  }
}
```

---

## Package Exports

| Path                               | Purpose                                       |
| ---------------------------------- | --------------------------------------------- |
| `/backend/core/onion-layers`       | Domain, App, Infra, Presentation base classes |
| `/backend/core/global`             | BaseDto, CodedError, utilities                |
| `/backend/core/presentation`       | HTTP types, routing                           |
| `/backend/core/validators/zod`     | Zod validation                                |
| `/backend/core/validators/arktype` | ArkType validation                            |
| `/backend/core/validators/valibot` | Valibot validation                            |
| `/backend/core/validators/typebox` | TypeBox validation                            |
| `/backend/frameworks/hono`         | Hono integration                              |
| `/backend/frameworks/nestjs`       | NestJS integration                            |
| `/backend/frameworks/elysia`       | Elysia integration                            |
| `/backend/frameworks/fastify`      | Fastify integration                           |

---

## Error Handling

Layered error hierarchy with automatic HTTP status mapping:

| Error Type            | HTTP Status | Use Case                 |
| --------------------- | ----------- | ------------------------ |
| `InvalidRequestError` | 400         | Validation failures      |
| `AccessDeniedError`   | 403         | Authorization failures   |
| `NotFoundError`       | 404         | Resource not found       |
| `ConflictError`       | 409         | Duplicate resources      |
| `UnprocessableError`  | 422         | Business rule violations |
| `InfraError`          | 500         | Infrastructure failures  |

---

## Documentation

Full documentation with guides, API reference, and examples:

**[onion-lasagna.cosmneo.com](https://onion-lasagna.cosmneo.com)**

---

## License

MIT
