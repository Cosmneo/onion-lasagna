---
name: onion-lasagna-route
description: Use when creating Onion Lasagna HTTP routes, GraphQL fields, schema adapters, request mappers, response mappers, or presentation handlers
---

# Onion Lasagna Route

## Overview

Presentation code validates external input, maps it into use-case input, executes use cases, and
maps outputs into transport responses. Business rules stay in domain/use cases.

## Always First

Inspect actual route definitions, schema adapter imports, server route registration, and framework
adapter usage before writing code:

```bash
rg -n "defineRoute\\(|defineRouter\\(|serverRoutes\\(|graphqlRoutes\\(|define(Query|Mutation|Subscription)" packages/onion-lasagna/src starters -g '*.ts'
rg -n "zodSchema|typeboxSchema|valibotSchema|arktypeSchema|onionErrorHandler|registerRoutes" packages starters -g '*.ts'
```

For package names, read `../../references/package-entrypoints.md` when choosing schema or server
adapters.

## HTTP Route Pattern

- Define external schemas with the selected schema adapter package.
- Use `defineRoute()` for method, path, request schemas, responses, and docs metadata.
- Group route definitions with `defineRouter()`.
- Register route behavior with `serverRoutes(router)`.
- Use `.handleWithUseCase()` when the endpoint calls a use case.
- Use `.handle()` only for simple presentation-only handlers.

## Mapper Rules

- `requestMapper(req, ctx)` maps validated `body`, `query`, `pathParams`, `headers`, and `context` into app input.
- `useCase` is an app port or `BaseInboundAdapter` instance; call through the builder pipeline.
- `responseMapper(output)` chooses HTTP status, body, and headers.
- Mappers may translate shapes but must not enforce business rules or query repositories.

## GraphQL Pattern

- Define fields with `defineQuery()`, `defineMutation()`, or `defineSubscription()`.
- Group fields with `defineGraphQLSchema()` or `mergeGraphQLSchemas()`.
- Register field behavior with `graphqlRoutes(schema)`.
- Use `.handleWithUseCase()` for use-case fields: `argsMapper(args, ctx)`, `useCase`, then `responseMapper(output)`.
- Use `@cosmneo/onion-lasagna-yoga` only at the framework adapter boundary.

## Guardrails

- Do not import repositories, database schemas, external SDKs, or concrete infra adapters into route handlers.
- Do not duplicate schema validation already expressed in the route definition.
- Do not catch and remap known Onion Lasagna errors inside handlers; use framework error handlers and `mapErrorToResponse`.
- Use `build()` for complete route sets and `buildPartial()` only when intentionally registering a subset.
- Keep framework-specific registration in the package adapter layer, not in domain or use-case code.
