---
name: onion-lasagna-domain
description: Use when modeling Onion Lasagna domain entities, aggregate roots, value objects, domain events, invariants, or domain tests
---

# Onion Lasagna Domain

## Overview

Model domain code as pure business behavior: value objects validate facts, entities carry identity,
aggregate roots enforce consistency, and domain events record meaningful past occurrences.

## Always First

Inspect actual implementations before writing code:

```bash
rg -n "class .* extends Base(AggregateRoot|Entity|ValueObject|DomainEvent)" packages/onion-lasagna/src starters -g '*.ts'
rg -n "InvariantViolationError|pullDomainEvents|peekDomainEvents|reconstitute|static create" packages/onion-lasagna/src starters -g '*.ts'
```

Read the matching base class and tests before copying a constructor shape. Use starter files for
folder and naming conventions unless they contain complete implementations.

## Class Choices

- `BaseValueObject<T>`: immutable, compared by value, self-validating in `create()`.
- `BaseEntity<TId, TProps>`: identity-based object with mutable state and versioning.
- `BaseAggregateRoot<TId, TProps>`: consistency boundary that raises domain events.
- `BaseDomainEvent<TPayload>`: immutable past-tense event raised by an aggregate.

## Domain Rules

- Entity, aggregate, and VO constructors stay private or protected; expose `static create()` for new objects.
- Add `static reconstitute()` for loading existing state without emitting creation events.
- Validate VOs before construction; validate cross-property invariants in factories or domain methods.
- Throw domain errors such as `InvariantViolationError` for business rule violations.
- Use value objects for ids and meaningful primitives instead of raw strings in entity props.
- Raise events only for facts that happened in the domain, and include primitive payload data handlers need.
- Event constructors or factories should follow the local `BaseDomainEvent` examples/tests.

## Forbidden In Domain

- No HTTP, GraphQL, Hono, Elysia, Express, Fastify, NestJS, SDK, or external API imports.
- No Drizzle, Prisma, SQL, database schema, repository adapter, cache, queue, or transport imports.
- No request DTOs, response DTOs, persistence rows, framework exceptions, or `console.log`.
- No app/use-case authorization or infra retry behavior.

## Test Checklist

- VO accepts valid input and rejects invalid input.
- Aggregate `create()` sets initial state and emits the relevant events.
- `reconstitute()` restores state and does not emit creation events.
- Domain methods enforce invalid transitions when transitions are introduced.
- Events are inspectable with `peekDomainEvents()` and cleared with `pullDomainEvents()` when relevant.
