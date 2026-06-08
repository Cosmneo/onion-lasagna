---
name: onion-lasagna-architect
description: Use when designing an Onion Lasagna project, choosing bounded contexts, selecting packages, or deciding read-write-workflow structure
---

# Onion Lasagna Architect

## Overview

Design Onion Lasagna systems by deciding bounded contexts, adapters, schema libraries, server framework, client packages, read models, and workflows before code is written.

## Procedure

1. Inspect existing project shape when present.
2. Identify business capabilities and split bounded contexts by ownership of invariants.
3. Choose presentation surfaces: HTTP, GraphQL, events, or a mix.
4. Choose concrete Onion Lasagna packages for schema, server, client, and workflow needs.
5. Identify read models separately from write/domain models.
6. Identify operations that need saga workflows.
7. Produce an implementation order ending with review.

## Package Chooser

Name concrete packages when the target stack is known:

- Core: `@cosmneo/onion-lasagna`.
- HTTP routes: `@cosmneo/onion-lasagna/http/route`, `@cosmneo/onion-lasagna/http/server`.
- Server adapters: `@cosmneo/onion-lasagna-hono`, `@cosmneo/onion-lasagna-fastify`,
  `@cosmneo/onion-lasagna-express`, `@cosmneo/onion-lasagna-elysia`,
  `@cosmneo/onion-lasagna-nestjs`.
- GraphQL: `@cosmneo/onion-lasagna/graphql`, `@cosmneo/onion-lasagna-yoga`.
- Events: `@cosmneo/onion-lasagna/events`, `@cosmneo/onion-lasagna/events/handler`,
  `@cosmneo/onion-lasagna/events/server`, `@cosmneo/onion-lasagna/events/shared`,
  `@cosmneo/onion-lasagna/events/asyncapi`.
- Schemas: `@cosmneo/onion-lasagna-zod`, `@cosmneo/onion-lasagna-typebox`,
  `@cosmneo/onion-lasagna-valibot`, `@cosmneo/onion-lasagna-arktype`.
- Clients: `@cosmneo/onion-lasagna-client`, `@cosmneo/onion-lasagna-axios`,
  `@cosmneo/onion-lasagna-react-query`, `@cosmneo/onion-lasagna-graphql-client`.
- Workflows: `@cosmneo/onion-lasagna-saga`.

## Output

Return:

- bounded context map;
- package choices with concrete `@cosmneo/*` names where known;
- data flow;
- error flow;
- read/write/workflow boundaries;
- saga candidates;
- test strategy;
- implementation order.

Use `../../references/omninode-patterns.md` for the preferred structure and
`../../references/package-entrypoints.md` for package choices. Use
`../../references/architecture-rules.md` for error-boundary rules. Verify target exports before
importing. Known domain and app errors pass through; unknown infrastructure failures are wrapped
as `InfraError` or a specific subclass; presentation maps coded errors to client responses and
masks internal failures.
