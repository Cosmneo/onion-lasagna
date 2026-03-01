import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2022',
  minify: false,
  skipNodeModulesBundle: true,
  external: [
    '@tanstack/svelte-query',
    'svelte',
    '@cosmneo/onion-lasagna',
    '@cosmneo/onion-lasagna-client',
  ],
});
