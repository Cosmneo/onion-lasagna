import type { Config } from 'drizzle-kit';
import { resolve } from 'path';

const drizzleRoot = resolve(__dirname, '..');

export default {
  schema: resolve(drizzleRoot, 'schemas/index.ts'),
  out: resolve(drizzleRoot, 'migrations/qa'),
  dialect: 'sqlite',
  dbCredentials: {
    url: resolve(drizzleRoot, 'data/qa.db'),
  },
} satisfies Config;
