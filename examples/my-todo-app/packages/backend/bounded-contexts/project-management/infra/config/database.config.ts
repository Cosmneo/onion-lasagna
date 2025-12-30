import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export type Environment = 'dev' | 'qa' | 'prod';

export interface DatabaseConfig {
  path: string;
  environment: Environment;
}

function ensureDirectory(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getEnvironment(): Environment {
  const env = process.env['NODE_ENV'] || process.env['ENVIRONMENT'] || 'dev';
  if (env === 'production') return 'prod';
  if (env === 'qa' || env === 'staging') return 'qa';
  return 'dev';
}

function getDatabasePath(environment: Environment): string {
  const envVar = process.env['DATABASE_PATH'];
  if (envVar) {
    return envVar;
  }

  // Default: use a data directory relative to current working directory
  return `./data/${environment}.db`;
}

export function getDatabaseConfig(): DatabaseConfig {
  const environment = getEnvironment();
  const path = getDatabasePath(environment);

  ensureDirectory(path);

  return { path, environment };
}
