# Omninode-Derived Onion Lasagna Patterns

This reference distills good structural patterns. It must stay self-contained and must not require the Omninode repository after plugin installation.

## Bounded Context Layout

```text
bounded-contexts/<context>/
|-- domain/
|-- app/
|-- infra/
|-- bootstrap/
`-- index.ts
```

## Bootstrap Flow

```typescript
const adapters = createAdapters();
const useCases = createUseCases(adapters);
const handlers = createHandlers(useCases);
```

## Use Case Flow

Use `BaseInboundAdapter` with `authorize()` for authentication, permission checks, and entity preloading. Pass the typed auth context into `handle()` so the use case does not duplicate lookups.

## Presentation Flow

Handlers are thin. They map request data and execution context into use-case input, call `useCase.execute()`, then map output to the response shape.

## Read/Write Split

Use write bounded contexts for commands and domain state changes. Use read modules/projections for query-optimized DTOs and list/detail views.

## Workflow Flow

Use saga workflows when a user operation coordinates multiple bounded contexts and needs compensation after partial failure.

## Good Smells

- Domain has no infrastructure imports.
- App use cases depend on ports, not concrete clients.
- Infra owns mapping and transactions.
- Bootstrap owns concrete object construction.
- Tests exist near domain, use cases, handlers, and projections.
