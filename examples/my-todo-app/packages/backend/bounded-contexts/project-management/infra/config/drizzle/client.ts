import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { getDatabaseConfig } from '../database.config';
import * as schema from './schemas';

export type DbClient = BunSQLiteDatabase<typeof schema>;

let dbInstance: DbClient | null = null;

function createDrizzleClient(): DbClient {
  const config = getDatabaseConfig();

  console.info(`📦 Database: ${config.path} (${config.environment})`);

  const sqlite = new Database(config.path);
  return drizzle(sqlite, { schema });
}

export function getDb(): DbClient {
  if (!dbInstance) {
    dbInstance = createDrizzleClient();
  }
  return dbInstance;
}

// Lazy initialization - db is created on first access
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});