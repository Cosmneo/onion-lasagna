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
  external: ['valibot', '@valibot/to-json-schema', '@cosmneo/onion-lasagna'],
});
