# Onion Lasagna Layer Checklist

Use this checklist when reviewing an Onion Lasagna project.

## Findings Order

Report risks before praise. Order findings by severity:

1. Boundary violations that couple inner layers to outer layers.
2. Error-handling leaks or missing wrapping at boundaries.
3. Validation in the wrong layer.
4. Missing tests for use cases, mappers, repositories, and route handlers.
5. Maintainability drift in bootstrap files or oversized handlers.

## Dependency Direction

- Domain may depend on Onion Lasagna domain/global primitives and local domain code.
- Domain must not import infrastructure, presentation, HTTP, GraphQL, Drizzle, framework adapters, or external SDKs.
- App use cases may depend on domain objects, app ports, and shared errors.
- App use cases should not instantiate concrete repositories, HTTP clients, SDK clients, or loggers.
- Infra implements outbound ports and wraps external failures.
- Presentation maps validated requests into use-case inputs and maps outputs into responses.

## Good Signals

- Domain objects use factories and reconstitution methods.
- `BaseInboundAdapter` use cases use `authorize()` for permission checks and preloading.
- Outbound adapters protect use cases from concrete infrastructure and wrap errors.
- Route handlers stay thin and use `handleWithUseCase` when executing a use case.
- Bootstrap files wire adapters, use cases, handlers, and workflows explicitly.

## Review Output

For each finding include:

- severity;
- file or pattern;
- violated rule;
- concrete fix;
- verification command.
