import type { Config } from 'drizzle-kit';
import { resolve } from 'path';

const drizzleRoot = resolve(__dirname, '..');

export default {
  schema: resolve(drizzleRoot, 'schemas/index.ts'),
  out: resolve(drizzleRoot, 'migrations/prod'),
  dialect: 'sqlite',
  dbCredentials: {
    url: resolve(drizzleRoot, 'data/prod.db'),
  },
} satisfies Config;
