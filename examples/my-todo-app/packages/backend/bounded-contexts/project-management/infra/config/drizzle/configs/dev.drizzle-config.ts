import type { Config } from 'drizzle-kit';
import { resolve } from 'path';

const drizzleRoot = resolve(__dirname, '..');

function getDbUrl(): string {
  const envPath = process.env['DATABASE_PATH'];
  if (envPath) {
    return envPath;
  }
  return resolve(drizzleRoot, 'data/dev.db');
}

export default {
  schema: resolve(drizzleRoot, 'schemas/index.ts'),
  out: resolve(drizzleRoot, 'migrations/dev'),
  dialect: 'sqlite',
  dbCredentials: {
    url: getDbUrl(),
  },
} satisfies Config;
