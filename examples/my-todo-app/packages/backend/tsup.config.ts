import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Bounded Contexts
    'bounded-contexts/project-management/index': 'bounded-contexts/project-management/index.ts',

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
  external: ['@cosmneo/onion-lasagna', '@repo/shared', 'zod', 'uuid'],
});
