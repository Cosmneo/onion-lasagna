import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Core (domain, app, infra, presentation layers + global)
    index: 'src/index.ts',
    global: 'src/global/index.ts',
    // Dedicated entry points for ports and common types
    ports: 'src/ports.ts',
    types: 'src/types.ts',
    // HTTP Presentation Layer (unified route system)
    'http/index': 'src/presentation/http/index.ts',
    'http/schema/index': 'src/presentation/http/schema/index.ts',
    'http/schema/types': 'src/presentation/http/schema/types/index.ts',
    'http/route/index': 'src/presentation/http/route/index.ts',
    'http/server/index': 'src/presentation/http/server/index.ts',
    'http/shared/index': 'src/presentation/http/shared/index.ts',
    'http/openapi/index': 'src/presentation/http/openapi/index.ts',
    // Event Handler System
    'events/index': 'src/presentation/events/index.ts',
    'events/handler/index': 'src/presentation/events/handler/index.ts',
    'events/server/index': 'src/presentation/events/server/index.ts',
    'events/shared/index': 'src/presentation/events/shared/index.ts',
    'events/asyncapi/index': 'src/presentation/events/asyncapi/index.ts',
    // Schedule System
    'schedule/index': 'src/presentation/schedule/index.ts',
    'schedule/task/index': 'src/presentation/schedule/task/index.ts',
    'schedule/server/index': 'src/presentation/schedule/server/index.ts',
    'schedule/shared/index': 'src/presentation/schedule/shared/index.ts',
    'schedule/catalog/index': 'src/presentation/schedule/catalog/index.ts',
    // GraphQL Presentation Layer
    'graphql/index': 'src/presentation/graphql/index.ts',
    'graphql/field/index': 'src/presentation/graphql/field/index.ts',
    'graphql/server/index': 'src/presentation/graphql/server/index.ts',
    'graphql/shared/index': 'src/presentation/graphql/shared/index.ts',
    'graphql/sdl/index': 'src/presentation/graphql/sdl/index.ts',
  },
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2022',
  minify: false,
  skipNodeModulesBundle: true,
  // uuid@13 is ESM-only; bundling it ensures the CJS output is self-contained
  // and CJS consumers do not get a bare require('uuid') that cannot resolve.
  noExternal: ['uuid'],
});
