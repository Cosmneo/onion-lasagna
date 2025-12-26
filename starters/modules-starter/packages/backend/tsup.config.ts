import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Module: my-module
    'modules/my-module/bounded-contexts/my-bounded-context/index':
      'modules/my-module/bounded-contexts/my-bounded-context/index.ts',
    'modules/my-module/orchestrations/my-orchestrations/index':
      'modules/my-module/orchestrations/my-orchestrations/index.ts',
    'modules/my-module/shared/index': 'modules/my-module/shared/index.ts',

    // Global shared
    'shared/index': 'shared/index.ts',
  },
  dts: true,
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'es2022',
  minify: false,
  skipNodeModulesBundle: true,
  external: ['@cosmneo/onion-lasagna', 'zod', 'uuid'],
});
