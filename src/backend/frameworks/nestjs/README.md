# NestJS Integration

Minimal adapter layer for using onion-lasagna with NestJS applications.

## Installation

```bash
npm install @cosmneo/onion-lasagna @nestjs/common @nestjs/core
```

## Exports

| Export                 | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `OnionRequest`         | Parameter decorator that extracts `HttpRequest` from NestJS request |
| `OnionExceptionFilter` | Exception filter that maps onion-lasagna errors to HTTP responses   |
| `HttpController`       | Type alias for `Controller<HttpRequest, HttpResponse>`              |
| `HttpRequest`          | Request type with body, headers, queryParams, pathParams            |
| `HttpResponse`         | Response type with statusCode, body, headers                        |

## Usage

### Basic Setup

```typescript
// users.controller.ts
import { Controller, Get, Post, Delete, UseGuards, UseFilters } from '@nestjs/common';
import {
  OnionRequest,
  OnionExceptionFilter,
} from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
import type { HttpRequest } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { getUserController, createUserController, deleteUserController } from './controllers';

@Controller('users')
@UseFilters(OnionExceptionFilter)
@UseGuards(JwtAuthGuard) // Infrastructure: "Is token valid?"
export class UsersController {
  @Get(':id')
  getUser(@OnionRequest() request: HttpRequest) {
    return getUserController.execute(request);
  }

  @Post()
  createUser(@OnionRequest() request: HttpRequest) {
    return createUserController.execute(request);
  }

  @Delete(':id')
  deleteUser(@OnionRequest() request: HttpRequest) {
    // GuardedController handles business authorization
    return deleteUserController.execute(request);
  }
}
```

### Global Exception Filter

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { OnionExceptionFilter } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new OnionExceptionFilter());
  await app.listen(3000);
}
bootstrap();
```

## Guard Separation

This integration uses a layered authorization model:

| Layer             | Responsibility          | Example                                 |
| ----------------- | ----------------------- | --------------------------------------- |
| **NestJS Guards** | Infrastructure concerns | JWT validation, rate limiting, API keys |
| **AccessGuard**   | Business authorization  | "Can this user delete this resource?"   |

NestJS Guards run first and handle infrastructure-level security. Business authorization happens inside onion-lasagna controllers using `AccessGuard` or `GuardedController`.

```typescript
@Controller('orders')
@UseFilters(OnionExceptionFilter)
@UseGuards(JwtAuthGuard) // Infra: validates token
export class OrdersController {
  @Delete(':id')
  deleteOrder(@OnionRequest() request: HttpRequest) {
    // Business: GuardedController checks if user owns this order
    return deleteOrderController.execute(request);
  }
}
```

## Error Mapping

The `OnionExceptionFilter` maps onion-lasagna errors to HTTP responses:

| Error Type              | HTTP Status | Response                                 |
| ----------------------- | ----------- | ---------------------------------------- |
| `ObjectValidationError` | 400         | Includes `errorItems` with field details |
| `InvalidRequestError`   | 400         | Includes `errorItems` with field details |
| `AccessDeniedError`     | 403         | Message and error code                   |
| `NotFoundError`         | 404         | Message and error code                   |
| `ConflictError`         | 409         | Message and error code                   |
| `UnprocessableError`    | 422         | Message and error code                   |
| `UseCaseError` (other)  | 400         | Message and error code                   |
| `DomainError`           | 500         | Masked: "An unexpected error occurred"   |
| `InfraError`            | 500         | Masked: "An unexpected error occurred"   |
| `ControllerError`       | 500         | Masked: "An unexpected error occurred"   |
| Unknown                 | 500         | Masked: "An unexpected error occurred"   |

**Security:** Internal errors (Domain, Infra, Controller) are masked to prevent leaking implementation details.

## Comparison with Hono Integration

| Aspect             | Hono                           | NestJS                                                       |
| ------------------ | ------------------------------ | ------------------------------------------------------------ |
| Route Registration | Dynamic (`registerHonoRoutes`) | Decorator-based (`@Get`, `@Post`)                            |
| Request Extraction | `extractRequest(context)`      | `@OnionRequest()` decorator                                  |
| Error Handling     | `app.onError(handler)`         | `@UseFilters(OnionExceptionFilter)`                          |
| Middleware/Guards  | `options.middlewares`          | NestJS `@UseGuards` (infra) + onion `AccessGuard` (business) |
| Response Transform | Automatic in handler           | Controller returns body directly                             |

## Philosophy

This integration provides only the essential adapter utilities:

1. **`@OnionRequest()`** - Extracts the NestJS request into onion-lasagna's `HttpRequest` format
2. **`OnionExceptionFilter`** - Maps onion-lasagna errors to consistent HTTP responses

Everything else (guards, interceptors, pipes) is left to the NestJS ecosystem. This keeps the adapter minimal and gives developers full control over their NestJS application.
