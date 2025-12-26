# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Comprehensive test coverage for all core layers (881 tests)
- Production readiness analysis document

---

## [0.1.0] - 2025-12-26

### Added

#### Core Layers

- `BaseEntity` - Base class for domain entities with identity and equality
- `BaseValueObject` - Base class for immutable value objects with deep equality
- `BaseAggregateRoot` - Base class for aggregate roots with domain event support
- `BaseDomainEvent` - Base class for domain events
- `BaseDto` - Base class for data transfer objects with validation
- `BaseInboundAdapter` - Base class for use cases (application layer)
- `BaseOutboundAdapter` - Base class for repositories with automatic error wrapping
- `BaseController` - Base class for HTTP controllers with request/response mapping
- `GuardedController` - Controller with access guard support

#### Value Objects

- `BaseUUIDv4` - UUID v4 value object
- `BaseUUIDv7` - UUID v7 value object (time-sortable)
- `BaseShortText` - Text up to 100 characters
- `BaseMediumText` - Text up to 500 characters
- `BaseLongText` - Text up to 2000 characters
- `BaseEmail` - Email value object with format validation
- `BasePagination` - Pagination value object (page, limit, offset)
- `BaseAuditInfo` - Full audit info (created/updated by/on)
- `BaseAuditBy` - Audit by user tracking
- `BaseAuditOn` - Audit timestamp tracking

#### Error Handling

- `CodedError` - Base error class with error codes and cause chain
- `DomainError` - Domain layer errors
- `InvariantViolationError` - Domain invariant violations
- `PartialLoadError` - Partial entity loading errors
- `UseCaseError` - Application layer errors
- `ConflictError` - Resource conflict (409)
- `NotFoundError` - Resource not found (404)
- `UnprocessableError` - Business rule violations (422)
- `InfraError` - Infrastructure layer errors
- `DbError` - Database errors
- `NetworkError` - Network errors
- `TimeoutError` - Timeout errors
- `ExternalServiceError` - External service errors
- `ControllerError` - Presentation layer errors
- `AccessDeniedError` - Authorization failures (403)
- `InvalidRequestError` - Validation failures (400)
- `ObjectValidationError` - Schema validation errors

#### Validators

- Zod validator implementation with path normalization
- ArkType validator implementation with path normalization
- Valibot validator implementation with path normalization
- TypeBox validator implementation with path normalization
- `ObjectValidatorPort` interface for validator abstraction
- `BoundValidator` pattern for schema binding
- DTO wrappers for each validator
- Value object wrappers for each validator

#### Framework Integrations

- **Hono** - `registerHonoRoutes()`, `onionErrorHandler`, `mapErrorToHttpException`
- **NestJS** - `BaseNestController`, `@OnionLasagnaRequest()`, `OnionLasagnaExceptionFilter`, `OnionLasagnaResponseInterceptor`
- **Elysia** - `registerElysiaRoutes()`, `mapErrorToResponse`
- **Fastify** - `registerFastifyRoutes()`, `mapErrorToResponse`

#### Utilities

- `wrapError()` / `wrapErrorAsync()` - Error transformation
- `wrapErrorUnless()` / `wrapErrorUnlessAsync()` - Conditional error passthrough
- `fieldChanged()` - Partial update helper
- `computeRoutePath()` - Route path computation
- `HttpResponse` - HTTP response builder

#### Build & Configuration

- ESM + CJS dual output with TypeScript declarations
- 11 separate entry points for tree shaking
- Strict TypeScript configuration
- ESLint + Prettier configuration

---

## Version History

| Version | Date       | Summary                                                                  |
| ------- | ---------- | ------------------------------------------------------------------------ |
| 0.1.0   | 2025-12-26 | Initial release with core layers, validators, and framework integrations |

---

## Migration Guides

### Upgrading to 0.1.0

This is the initial release. No migration required.

---

## Links

- [Documentation](https://onion-lasagna.cosmneo.com)
- [GitHub Repository](https://github.com/Cosmneo/onion-lasagna)
- [Issue Tracker](https://github.com/Cosmneo/onion-lasagna/issues)
