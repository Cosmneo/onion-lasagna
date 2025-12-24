import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'backend/core/bounded-context': 'src/backend/core/bounded-context/index.ts',
    'backend/core/global': 'src/backend/core/global/index.ts',
    'backend/core/presentation': 'src/backend/core/bounded-context/presentation/index.ts',
    'backend/core/validators/zod': 'src/backend/core/validators/zod/index.ts',
    'backend/core/validators/arktype': 'src/backend/core/validators/arktype/index.ts',
    'backend/core/validators/valibot': 'src/backend/core/validators/valibot/index.ts',
    'backend/core/validators/typebox': 'src/backend/core/validators/typebox/index.ts',
    'backend/frameworks/aws-api-gateway-http':
      'src/backend/frameworks/aws-api-gateway-http/index.ts',
    'backend/frameworks/cloudflare-workers': 'src/backend/frameworks/cloudflare-workers/index.ts',
    // serverless-onion framework
    'backend/frameworks/serverless-onion/core':
      'src/backend/frameworks/serverless-onion/core/index.ts',
    'backend/frameworks/serverless-onion/aws':
      'src/backend/frameworks/serverless-onion/runtimes/aws-api-gateway-http/index.ts',
    'backend/frameworks/serverless-onion/cloudflare':
      'src/backend/frameworks/serverless-onion/runtimes/cloudflare-workers/index.ts',
  },
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2022',
  minify: false,
  skipNodeModulesBundle: true,
  external: ['zod', 'uuid', 'arktype', 'valibot', '@sinclair/typebox', 'aws-lambda'],
});
