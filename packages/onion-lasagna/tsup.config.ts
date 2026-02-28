import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Core (domain, app, infra, presentation layers + global)
    index: 'src/index.ts',
    global: 'src/global/index.ts',
    // Dedicated entry points for ports and common types
    ports: 'src/ports.ts',
    types: 'src/types.ts',
    // HTTP Presentation Layer (unified route system)
    'http/index': 'src/presentation/http/index.ts',
    'http/schema/index': 'src/presentation/http/schema/index.ts',
    'http/schema/types': 'src/presentation/http/schema/types/index.ts',
    'http/route/index': 'src/presentation/http/route/index.ts',
    'http/server/index': 'src/presentation/http/server/index.ts',
    'http/shared/index': 'src/presentation/http/shared/index.ts',
    'http/openapi/index': 'src/presentation/http/openapi/index.ts',
  },
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2022',
  minify: false,
  skipNodeModulesBundle: true,
  external: ['uuid'],
});
