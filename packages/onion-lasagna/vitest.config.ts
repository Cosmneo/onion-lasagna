import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts', 'vitest.config.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // Enable tsc-based type checking for files matching *-d.test.ts.
    // These files use @ts-expect-error to assert that incomplete builders
    // produce compile-time errors (MissingHandlersError exhaustiveness).
    // NOTE: This is an experimental vitest feature; it runs tsc alongside
    // the normal test runner and reports type errors as test failures.
    typecheck: {
      enabled: true,
      checker: 'tsc',
      include: ['src/**/*-d.test.ts'],
    },
  },
});
