/**
 * @fileoverview Type-level regression tests for the build() exhaustiveness contract.
 *
 * These tests assert that `.build()` is a compile-time type error when not all
 * route / field / event-handler keys have been registered via `.handle()`.
 *
 * The file uses two complementary techniques:
 *
 *   1. `// @ts-expect-error` — asserts that the next line IS a type error.
 *      With `typecheck: { enabled: true }` in vitest.config, tsc runs these
 *      checks and the suite FAILS if the expected error disappears (i.e., if
 *      someone removes the exhaustiveness guard from the builder type).
 *
 *   2. `expectTypeOf(...).toBeCallableWith(...)` / `.not.toBeAny()` —
 *      positive assertions that run in every vitest mode (including non-typecheck)
 *      as belt-and-suspenders coverage.
 *
 * DECISION NOTE: `typecheck: { enabled: true }` is set in vitest.config.ts.
 * This is an experimental vitest feature that runs tsc in addition to the
 * regular test runner. The checked file pattern is `**\/*-d.test.ts`.
 */

import { describe, it, expectTypeOf } from 'vitest';

import { defineRoute, defineRouter } from '../../route';
import { serverRoutes } from '../server-routes-builder';
import type { MissingHandlersError } from '../server-routes-builder';

import { defineQuery, defineMutation } from '../../../graphql/field/define-field';
import { defineGraphQLSchema } from '../../../graphql/field/define-schema';
import { graphqlRoutes } from '../../../graphql/server/graphql-routes-builder';
import type { MissingHandlersError as GraphQLMissingHandlersError } from '../../../graphql/server/graphql-routes-builder';

import { defineEventHandler } from '../../../events/handler/define-event-handler';
import { defineEventRouter } from '../../../events/handler/define-event-router';
import { eventRoutes } from '../../../events/server/event-routes-builder';
import type { MissingHandlersError as EventMissingHandlersError } from '../../../events/server/event-routes-builder';

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const routeA = defineRoute({ method: 'GET', path: '/a', responses: { 200: {} } });
const routeB = defineRoute({ method: 'GET', path: '/b', responses: { 200: {} } });
const twoRouteRouter = defineRouter({ a: routeA, b: routeB });

const queryA = defineQuery();
const mutationB = defineMutation();
const twoFieldSchema = defineGraphQLSchema({ a: queryA, b: mutationB });

const handlerA = defineEventHandler({ eventType: 'test.a' });
const handlerB = defineEventHandler({ eventType: 'test.b' });
const twoHandlerRouter = defineEventRouter({ a: handlerA, b: handlerB });

// ─── HTTP serverRoutes ──────────────────────────────────────────────────────────

describe('serverRoutes build() exhaustiveness', () => {
  it('build is callable when all routes are handled', () => {
    const builder = serverRoutes(twoRouteRouter)
      .handle('a', async () => ({ status: 200 as const, body: null }))
      .handle('b', async () => ({ status: 200 as const, body: null }));

    // build should be a function, not a MissingHandlersError
    expectTypeOf(builder.build).toBeFunction();
  });

  it('build is MissingHandlersError when a route is unhandled', () => {
    const _incompleteBuilder = serverRoutes(twoRouteRouter).handle('a', async () => ({
      status: 200 as const,
      body: null,
    }));

    // The type of `build` on an incomplete builder must satisfy MissingHandlersError<...>
    // If this expectation fails at compile time, the exhaustiveness guard was removed.
    expectTypeOf(_incompleteBuilder.build).toMatchTypeOf<MissingHandlersError<string>>();
  });

  it('build is NOT callable (type error) when a route is unhandled', () => {
    const _incompleteBuilder = serverRoutes(twoRouteRouter).handle('a', async () => ({
      status: 200 as const,
      body: null,
    }));

    // This line is type-checked by tsc (in typecheck mode) but never executed at runtime.
    // tsc will report an error here if `build` becomes callable (i.e., the exhaustiveness
    // guard is removed from the builder type). The @ts-expect-error suppresses tsc's complaint
    // so the file still compiles; if the type error *disappears*, tsc will report "unused @ts-expect-error".
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (false as boolean) &&
      // @ts-expect-error — calling build() on an incomplete builder must be a type error
      _incompleteBuilder.build();
  });

  it('the ___missingRoutes property names the unhandled route', () => {
    const _incompleteBuilder = serverRoutes(twoRouteRouter).handle('a', async () => ({
      status: 200 as const,
      body: null,
    }));

    type BuildType = typeof _incompleteBuilder.build;
    type Missing = BuildType extends MissingHandlersError<infer M> ? M : never;

    expectTypeOf<Missing>().toEqualTypeOf<'b'>();
  });
});

// ─── GraphQL graphqlRoutes ─────────────────────────────────────────────────────

describe('graphqlRoutes build() exhaustiveness', () => {
  it('build is callable when all fields are handled', () => {
    const builder = graphqlRoutes(twoFieldSchema)
      .handle('a', async () => null)
      .handle('b', async () => null);

    expectTypeOf(builder.build).toBeFunction();
  });

  it('build is MissingHandlersError when a field is unhandled', () => {
    const _incompleteBuilder = graphqlRoutes(twoFieldSchema).handle('a', async () => null);

    expectTypeOf(_incompleteBuilder.build).toMatchTypeOf<GraphQLMissingHandlersError<string>>();
  });

  it('build is NOT callable (type error) when a field is unhandled', () => {
    const _incompleteBuilder = graphqlRoutes(twoFieldSchema).handle('a', async () => null);

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (false as boolean) &&
      // @ts-expect-error — calling build() on an incomplete builder must be a type error
      _incompleteBuilder.build();
  });

  it('the ___missingFields property names the unhandled field', () => {
    const _incompleteBuilder = graphqlRoutes(twoFieldSchema).handle('a', async () => null);

    type BuildType = typeof _incompleteBuilder.build;
    type Missing = BuildType extends GraphQLMissingHandlersError<infer M> ? M : never;

    expectTypeOf<Missing>().toEqualTypeOf<'b'>();
  });
});

// ─── Events eventRoutes ────────────────────────────────────────────────────────

describe('eventRoutes build() exhaustiveness', () => {
  it('build is callable when all handlers are wired', () => {
    const builder = eventRoutes(twoHandlerRouter)
      .handle('a', async () => ({ outcome: 'ack' as const }))
      .handle('b', async () => ({ outcome: 'ack' as const }));

    expectTypeOf(builder.build).toBeFunction();
  });

  it('build is MissingHandlersError when a handler is not wired', () => {
    const _incompleteBuilder = eventRoutes(twoHandlerRouter).handle('a', async () => ({
      outcome: 'ack' as const,
    }));

    expectTypeOf(_incompleteBuilder.build).toMatchTypeOf<EventMissingHandlersError<string>>();
  });

  it('build is NOT callable (type error) when a handler is not wired', () => {
    const _incompleteBuilder = eventRoutes(twoHandlerRouter).handle('a', async () => ({
      outcome: 'ack' as const,
    }));

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (false as boolean) &&
      // @ts-expect-error — calling build() on an incomplete builder must be a type error
      _incompleteBuilder.build();
  });

  it('the ___missingHandlers property names the unwired handler', () => {
    const _incompleteBuilder = eventRoutes(twoHandlerRouter).handle('a', async () => ({
      outcome: 'ack' as const,
    }));

    type BuildType = typeof _incompleteBuilder.build;
    type Missing = BuildType extends EventMissingHandlersError<infer M> ? M : never;

    expectTypeOf<Missing>().toEqualTypeOf<'b'>();
  });
});
