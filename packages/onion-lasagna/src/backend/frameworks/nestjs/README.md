# NestJS Integration

Minimal adapter layer for using onion-lasagna with NestJS applications.

## Installation

```bash
npm install @cosmneo/onion-lasagna @nestjs/common @nestjs/core
```

## Exports

| Export                            | Description                                                         |
| --------------------------------- | ------------------------------------------------------------------- |
| `BaseNestController`              | Abstract base class with auto-wired filter and interceptor          |
| `OnionLasagnaRequest`             | Parameter decorator that extracts `HttpRequest` from NestJS request |
| `OnionLasagnaExceptionFilter`     | Exception filter that maps onion-lasagna errors to HTTP responses   |
| `OnionLasagnaResponseInterceptor` | Interceptor that transforms `HttpResponse` to NestJS response       |
| `HttpController`                  | Type alias for `Controller<HttpRequest, HttpResponse>`              |
| `HttpRequest`                     | Request type with body, headers, queryParams, pathParams            |
| `HttpResponse`                    | Response type with statusCode, body, headers                        |

## Usage

### Using BaseNestController (Recommended)

Extend `BaseNestController` to automatically apply the exception filter and response interceptor:

```typescript
// users.controller.ts
import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import {
  BaseNestController,
  OnionLasagnaRequest,
} from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
import type { HttpRequest } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { getUserController, createUserController, deleteUserController } from './controllers';

@Controller('users')
@UseGuards(JwtAuthGuard) // Infrastructure: "Is token valid?"
export class UsersController extends BaseNestController {
  @Get(':id')
  getUser(@OnionLasagnaRequest() request: HttpRequest) {
    return getUserController.execute(request);
  }

  @Post()
  createUser(@OnionLasagnaRequest() request: HttpRequest) {
    return createUserController.execute(request);
  }

  @Delete(':id')
  deleteUser(@OnionLasagnaRequest() request: HttpRequest) {
    // GuardedController handles business authorization
    return deleteUserController.execute(request);
  }
}
```

### Manual Setup

If you prefer not to use inheritance, apply the decorators manually:

```typescript
import { Controller, Get, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  OnionLasagnaRequest,
  OnionLasagnaExceptionFilter,
  OnionLasagnaResponseInterceptor,
} from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';

@Controller('users')
@UseFilters(OnionLasagnaExceptionFilter)
@UseInterceptors(OnionLasagnaResponseInterceptor)
export class UsersController {
  @Get(':id')
  getUser(@OnionLasagnaRequest() request: HttpRequest) {
    return getUserController.execute(request);
  }
}
```

### Global Exception Filter

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { OnionLasagnaExceptionFilter } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new OnionLasagnaExceptionFilter());
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
@UseFilters(OnionLasagnaExceptionFilter)
@UseGuards(JwtAuthGuard) // Infra: validates token
export class OrdersController {
  @Delete(':id')
  deleteOrder(@OnionLasagnaRequest() request: HttpRequest) {
    // Business: GuardedController checks if user owns this order
    return deleteOrderController.execute(request);
  }
}
```

## Error Mapping

The `OnionLasagnaExceptionFilter` maps onion-lasagna errors to HTTP responses:

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
| Request Extraction | `extractRequest(context)`      | `@OnionLasagnaRequest()` decorator                           |
| Error Handling     | `app.onError(handler)`         | `@UseFilters(OnionLasagnaExceptionFilter)`                   |
| Middleware/Guards  | `options.middlewares`          | NestJS `@UseGuards` (infra) + onion `AccessGuard` (business) |
| Response Transform | Automatic in handler           | Controller returns body directly                             |

## Philosophy

This integration provides essential adapter utilities:

1. **`BaseNestController`** - Abstract base class that auto-wires filter and interceptor
2. **`@OnionLasagnaRequest()`** - Extracts the NestJS request into onion-lasagna's `HttpRequest` format
3. **`OnionLasagnaExceptionFilter`** - Maps onion-lasagna errors to consistent HTTP responses
4. **`OnionLasagnaResponseInterceptor`** - Transforms `HttpResponse` objects to NestJS responses

Everything else (guards, pipes, other interceptors) is left to the NestJS ecosystem. This keeps the adapter minimal and gives developers full control over their NestJS application.
