import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Bounded Contexts
    'bounded-contexts/my-bounded-context/index': 'bounded-contexts/my-bounded-context/index.ts',

    // Orchestrations
    'orchestrations/my-orchestrations/index': 'orchestrations/my-orchestrations/index.ts',

    // Shared
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
