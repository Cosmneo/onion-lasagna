# Onion Lasagna Architecture Rules

## Layers

- Domain: entities, aggregates, value objects, domain events, invariants.
- App: inbound ports, use cases, outbound ports, authorization and orchestration of domain operations.
- Infra: concrete repositories, external service clients, mappers, transactions, error wrapping.
- Presentation: HTTP, GraphQL, events, schema adapters, route handlers, request/response mapping.
- Bootstrap: composition root that wires concrete adapters to use cases and handlers.

## Direction

Dependencies point inward. Domain never depends on app, infra, or presentation. App depends on domain and ports. Infra depends on app ports and domain to implement persistence. Presentation depends on app use cases and route/schema builders.

## Error Boundaries

Known domain and app errors pass through. Unknown infrastructure failures are wrapped as `InfraError` or a specific subclass. Presentation maps coded errors to client responses and masks internal failures.

## Validation

Validate external input at the presentation/schema boundary. Validate domain invariants inside value-object and aggregate factories.

## Bootstrap

Prefer explicit phases:

```typescript
const adapters = createAdapters();
const useCases = createUseCases(adapters);
const handlers = createHandlers(useCases);
```
