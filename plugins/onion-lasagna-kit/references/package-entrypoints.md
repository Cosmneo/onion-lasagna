# Onion Lasagna Package Entry Points

Verify exports in the target codebase before importing. This file is a navigation aid, not a substitute for reading `index.ts` files.

## Core

- `@cosmneo/onion-lasagna`
- `@cosmneo/onion-lasagna/global`
- `@cosmneo/onion-lasagna/ports`
- `@cosmneo/onion-lasagna/types`

## HTTP

- `@cosmneo/onion-lasagna/http`
- `@cosmneo/onion-lasagna/http/route`
- `@cosmneo/onion-lasagna/http/server`
- `@cosmneo/onion-lasagna/http/schema`
- `@cosmneo/onion-lasagna/http/schema/types`
- `@cosmneo/onion-lasagna/http/shared`
- `@cosmneo/onion-lasagna/http/openapi`

## GraphQL

- `@cosmneo/onion-lasagna/graphql`
- `@cosmneo/onion-lasagna/graphql/field`
- `@cosmneo/onion-lasagna/graphql/server`
- `@cosmneo/onion-lasagna/graphql/shared`
- `@cosmneo/onion-lasagna/graphql/sdl`

## Events

- `@cosmneo/onion-lasagna/events`
- `@cosmneo/onion-lasagna/events/handler`
- `@cosmneo/onion-lasagna/events/server`
- `@cosmneo/onion-lasagna/events/shared`
- `@cosmneo/onion-lasagna/events/asyncapi`

## Adapters

Server adapters:

- `@cosmneo/onion-lasagna-hono`
- `@cosmneo/onion-lasagna-elysia`
- `@cosmneo/onion-lasagna-express`
- `@cosmneo/onion-lasagna-fastify`
- `@cosmneo/onion-lasagna-nestjs`
- `@cosmneo/onion-lasagna-yoga`

Schema adapters:

- `@cosmneo/onion-lasagna-zod`
- `@cosmneo/onion-lasagna-zod-v3`
- `@cosmneo/onion-lasagna-typebox`
- `@cosmneo/onion-lasagna-valibot`
- `@cosmneo/onion-lasagna-arktype`

Client adapters:

- `@cosmneo/onion-lasagna-client`
- `@cosmneo/onion-lasagna-axios`
- `@cosmneo/onion-lasagna-react-query`
- `@cosmneo/onion-lasagna-swr`
- `@cosmneo/onion-lasagna-svelte-query`
- `@cosmneo/onion-lasagna-vue-query`
- `@cosmneo/onion-lasagna-graphql-client`
- `@cosmneo/onion-lasagna-graphql-react-query`

Pattern adapters:

- `@cosmneo/onion-lasagna-saga`

## Verification Command

```bash
bun --eval 'const pkg=await Bun.file("packages/onion-lasagna/package.json").json(); console.log(Object.keys(pkg.exports ?? {}).join("\n"));'
```

After confirming a public export exists, read the corresponding source `index.ts` before importing.
