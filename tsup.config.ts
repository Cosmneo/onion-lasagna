import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'backend/core/bounded-context': 'src/backend/core/bounded-context/index.ts',
    'backend/core/global': 'src/backend/core/global/index.ts',
    'backend/core/presentation': 'src/backend/core/presentation/index.ts',
    'backend/core/validators/zod': 'src/backend/core/validators/zod/index.ts',
  },
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2022',
  minify: false,
  skipNodeModulesBundle: true,
  external: ['zod', 'uuid'],
});
