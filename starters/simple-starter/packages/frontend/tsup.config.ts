import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'design-system/index': 'design-system/index.ts',
  },
  dts: true,
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'es2022',
  minify: false,
  skipNodeModulesBundle: true,
  external: ['react', 'react-dom'],
});
