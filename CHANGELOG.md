# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- Align README with current unified HTTP layer implementation
- Complete rewrite of Quick Start examples using current patterns
- Add Type-Safe Client section with React Query and Vue Query examples
- Update Package Exports table with new `/http/*` paths
- Add Built-in Value Objects reference table
- Restore Orchestrations layer documentation (Compositions, Workflows, Projections)
- Fix documentation inconsistencies across 12 MDX files
- Update JSDoc import paths from `unified/*` to `http/*` (15 source files)
- Add "Coming Soon" callouts to planned CLI features
- Fix error handler signatures in framework documentation
- Clarify `InferRouteSuccessResponse` vs `InferRouteResponse` type utilities
- Fix `idEquals` example in aggregates documentation

## [0.1.4] - 2026-01-01

### Added

- Context schema validation in route definitions
- `TypedContext<TRoute>` for typed handler context
- Comprehensive unified HTTP layer documentation

### Changed

- Simplified type inference in `defineRoute` return type
- Router types now support 8 type parameters

## [0.1.3] - 2025-12-29

### Added

- Unified HTTP layer with route contracts as single source of truth
- `defineRoute()` and `defineRouter()` for type-safe route definitions
- `serverRoutes()` builder pattern for handler registration
- Schema adapters for Zod and TypeBox validation
- Framework integrations (Hono, Elysia, Fastify, NestJS)
- Type-safe HTTP client with `createTypedClient()`
- React Query integration with `createTypedHooks()`
- Vue Query integration with `createTypedComposables()`
- OpenAPI spec generation from route definitions

### Changed

- Migrated from BaseController pattern to unified route handlers
- Import paths reorganized under `/http/*` namespace

## [0.1.2] - 2025-12-28

### Added

- Built-in Value Objects: `BaseUuidV4Vo`, `BaseUuidV7Vo`, `BaseEmailVo`
- Text Value Objects: `BaseShortTextVo`, `BaseMediumTextVo`, `BaseLongTextVo`
- Audit Value Objects: `BaseAuditByVo`, `BaseAuditOnVo`
- Pagination Value Object: `BasePaginationVo`

### Changed

- Value Objects now use built-in validation instead of external validators

## [0.1.1] - 2025-12-27

### Added

- `BaseAggregateRoot` with domain event collection
- `BaseDomainEvent` for immutable event records
- `BaseOutboundAdapter` with automatic error wrapping
- `BaseInboundAdapter` with layered error handling

### Fixed

- Error hierarchy properly maps to HTTP status codes

## [0.1.0] - 2025-12-26

### Added

- Initial release
- `BaseEntity` and `BaseValueObject` base classes
- Layered error hierarchy (`CodedError`, `DomainError`, `UseCaseError`, `InfraError`)
- Framework-agnostic architecture supporting Hono, Elysia, Fastify, NestJS

[Unreleased]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Cosmneo/onion-lasagna/releases/tag/v0.1.0
