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

## [0.1.4] - 2026-01-01

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
- Context schema validation in route definitions
- `TypedContext<TRoute>` for typed handler context
- Theme-aware Mermaid diagram support in docs
- `my-todo-app` reference implementation

### Changed

- Migrated from BaseController pattern to unified route handlers
- Import paths reorganized under `/http/*` namespace
- Simplified type inference in `defineRoute` return type

### Documentation

- Comprehensive documentation alignment with DDD patterns
- Bootstrap pattern documentation
- Token-optimized CLAUDE.md for AI assistance

## [0.1.3] - 2025-12-29

Version bump release.

## [0.1.2] - 2025-12-28

### Added

- `contextExtractor` support in all framework adapters
- Explicit `TRequest` type parameter in RouteInput
- Customizable `maxLength` for text value objects
- `assertStaticMethods` helper for value object testing
- Documentation site with landing page

### Changed

- Simplified Value Object pattern - domain owns validation
- Replace `void` with `undefined` in generic type constraints

### Fixed

- VS Code settings option to hide build artifacts
- Renamed starters to match CLI expectations

## [0.1.0] - 2025-12-26

### Added

- Initial release
- `BaseEntity` and `BaseValueObject` base classes
- `BaseAggregateRoot` with domain event collection
- `BaseDomainEvent` for immutable event records
- `BaseInboundAdapter` and `BaseOutboundAdapter` with error handling
- Layered error hierarchy (`CodedError`, `DomainError`, `UseCaseError`, `InfraError`)
- Built-in Value Objects: `BaseUuidV4Vo`, `BaseUuidV7Vo`, `BaseEmailVo`
- Text Value Objects: `BaseShortTextVo`, `BaseMediumTextVo`, `BaseLongTextVo`
- Pagination Value Object: `BasePaginationVo`
- `create-onion-lasagna-app` CLI for project scaffolding
- `onion-lasagna-cli` development tool
- Starter templates for Hono, Elysia, Fastify, NestJS

[Unreleased]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Cosmneo/onion-lasagna/compare/v0.1.0...v0.1.2
[0.1.0]: https://github.com/Cosmneo/onion-lasagna/releases/tag/v0.1.0
