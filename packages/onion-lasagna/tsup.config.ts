import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Shared contracts (single source of truth for client + server)
    'shared/contracts': 'src/shared/contracts/index.ts',
    // Backend core
    'backend/core/onion-layers': 'src/backend/core/onion-layers/index.ts',
    'backend/core/global': 'src/backend/core/global/index.ts',
    'backend/core/presentation': 'src/backend/core/onion-layers/presentation/index.ts',
    // Client (legacy)
    'client/index': 'src/client/index.ts',
    'client/react-query/index': 'src/client/react-query/index.ts',
    'client/vue-query/index': 'src/client/vue-query/index.ts',
    // HTTP Presentation Layer (unified route system)
    'http/index': 'src/backend/core/onion-layers/presentation/http/index.ts',
    'http/schema/index': 'src/backend/core/onion-layers/presentation/http/schema/index.ts',
    'http/schema/types': 'src/backend/core/onion-layers/presentation/http/schema/types/index.ts',
    'http/schema/zod':
      'src/backend/core/onion-layers/presentation/http/schema/adapters/zod.adapter.ts',
    'http/schema/typebox':
      'src/backend/core/onion-layers/presentation/http/schema/adapters/typebox.adapter.ts',
    'http/route/index': 'src/backend/core/onion-layers/presentation/http/route/index.ts',
    'http/client/index': 'src/backend/core/onion-layers/presentation/http/client/index.ts',
    'http/server/index': 'src/backend/core/onion-layers/presentation/http/server/index.ts',
    'http/openapi/index': 'src/backend/core/onion-layers/presentation/http/openapi/index.ts',
    // HTTP Framework Adapters (unified route system)
    'http/frameworks/hono':
      'src/backend/core/onion-layers/presentation/http/frameworks/hono/index.ts',
    'http/frameworks/fastify':
      'src/backend/core/onion-layers/presentation/http/frameworks/fastify/index.ts',
    'http/frameworks/elysia':
      'src/backend/core/onion-layers/presentation/http/frameworks/elysia/index.ts',
    'http/frameworks/nestjs':
      'src/backend/core/onion-layers/presentation/http/frameworks/nestjs/index.ts',
  },
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2022',
  minify: false,
  skipNodeModulesBundle: true,
  external: [
    'zod',
    'uuid',
    'arktype',
    'valibot',
    '@sinclair/typebox',
    'aws-lambda',
    'hono',
    'elysia',
    'fastify',
    '@nestjs/common',
    '@nestjs/core',
    'express',
    '@tanstack/react-query',
    '@tanstack/vue-query',
  ],
});
