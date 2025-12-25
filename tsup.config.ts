import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'backend/core/onion-layers': 'src/backend/core/onion-layers/index.ts',
    'backend/core/global': 'src/backend/core/global/index.ts',
    'backend/core/presentation': 'src/backend/core/onion-layers/presentation/index.ts',
    'backend/core/validators/zod': 'src/backend/core/validators/zod/index.ts',
    'backend/core/validators/arktype': 'src/backend/core/validators/arktype/index.ts',
    'backend/core/validators/valibot': 'src/backend/core/validators/valibot/index.ts',
    'backend/core/validators/typebox': 'src/backend/core/validators/typebox/index.ts',
    'backend/frameworks/serverless-onion/core':
      'src/backend/frameworks/serverless-onion/core/index.ts',
    'backend/frameworks/serverless-onion/aws':
      'src/backend/frameworks/serverless-onion/runtimes/aws-api-gateway-http/index.ts',
    'backend/frameworks/serverless-onion/cloudflare':
      'src/backend/frameworks/serverless-onion/runtimes/cloudflare-workers/index.ts',
    'backend/frameworks/hono': 'src/backend/frameworks/hono/index.ts',
    'backend/frameworks/nestjs': 'src/backend/frameworks/nestjs/index.ts',
    'backend/frameworks/elysia': 'src/backend/frameworks/elysia/index.ts',
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
    '@nestjs/common',
    '@nestjs/core',
    'express',
  ],
});
