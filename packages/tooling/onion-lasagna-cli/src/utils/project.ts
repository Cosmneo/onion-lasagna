import fs from 'node:fs';
import path from 'node:path';

interface OnionLasagnaConfig {
  starter: 'simple' | 'modules';
  validator: 'zod' | 'typebox';
  framework: 'hono' | 'elysia' | 'fastify';
}

/**
 * Find the project root by looking for .onion-lasagna.json
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    const configPath = path.join(currentDir, '.onion-lasagna.json');
    if (fs.existsSync(configPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load the onion-lasagna config from the project root
 */
export function loadConfig(projectRoot: string): OnionLasagnaConfig | null {
  const configPath = path.join(projectRoot, '.onion-lasagna.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as OnionLasagnaConfig;
  } catch {
    return null;
  }
}

/**
 * Get the backend packages directory based on project structure
 */
export function getBackendPath(projectRoot: string, config: OnionLasagnaConfig): string {
  if (config.starter === 'modules') {
    return path.join(projectRoot, 'packages', 'backend');
  }
  return path.join(projectRoot, 'packages', 'backend');
}

/**
 * Ensure a directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write file with directory creation
 */
export function writeFileWithDir(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}
