import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import degit from 'degit';

export type Structure = 'simple' | 'modules';
export type Starter = 'simple-clean' | 'modules-clean';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

interface StarterConfig {
  structure: Structure;
  label: string;
  hint: string;
  repoPath: string;
}

export const STARTERS: Record<Starter, StarterConfig> = {
  'simple-clean': {
    structure: 'simple',
    label: 'Clean',
    hint: 'Minimal setup, ready to build',
    repoPath: 'simple-clean-starter',
  },
  'modules-clean': {
    structure: 'modules',
    label: 'Clean',
    hint: 'Minimal setup, ready to build',
    repoPath: 'modules-clean-starter',
  },
};

interface ScaffoldOptions {
  name: string;
  structure: Structure;
  starter: Starter;
  validator: 'zod' | 'valibot' | 'arktype' | 'typebox';
  framework: 'hono' | 'elysia' | 'fastify';
  packageManager: PackageManager;
  install: boolean;
  skipGit: boolean;
}

const REPO = 'Cosmneo/onion-lasagna';

const VALIDATOR_PACKAGES: Record<string, string> = {
  zod: 'zod',
  valibot: 'valibot',
  arktype: 'arktype',
  typebox: '@sinclair/typebox',
};

const FRAMEWORK_PACKAGES: Record<string, string[]> = {
  hono: ['hono'],
  elysia: ['elysia'],
  fastify: ['fastify'],
};

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: 'npm install',
  yarn: 'yarn',
  pnpm: 'pnpm install',
  bun: 'bun install',
};

function initGitRepository(targetDir: string): boolean {
  try {
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });
    execSync('git add -A', { cwd: targetDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit from create-onion-lasagna-app"', {
      cwd: targetDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    // Git not installed or init failed - silently continue
    return false;
  }
}

export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const { name, structure, starter, validator, framework, packageManager, install, skipGit } =
    options;
  const targetDir = path.resolve(process.cwd(), name);

  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      throw new Error(`Directory "${name}" is not empty`);
    }
  }

  // Get starter config
  const starterConfig = STARTERS[starter];
  if (!starterConfig) {
    throw new Error(`Unknown starter: ${starter}`);
  }

  // Validate starter matches structure
  if (starterConfig.structure !== structure) {
    throw new Error(`Starter "${starter}" is not compatible with structure "${structure}"`);
  }

  // Clone starter template
  const starterPath = `${REPO}/starters/${starterConfig.repoPath}`;
  const emitter = degit(starterPath, {
    cache: false,
    force: true,
    verbose: false,
  });

  await emitter.clone(targetDir);

  // Update root package.json
  const rootPackageJsonPath = path.join(targetDir, 'package.json');
  const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'));
  rootPackageJson.name = name;
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + '\n');

  // Update backend package.json
  const backendPackageJsonPath = path.join(targetDir, 'packages', 'backend', 'package.json');
  if (fs.existsSync(backendPackageJsonPath)) {
    const backendPackageJson = JSON.parse(fs.readFileSync(backendPackageJsonPath, 'utf-8'));

    // Update dependencies based on selections
    backendPackageJson.dependencies = backendPackageJson.dependencies || {};

    // Add selected validator
    backendPackageJson.dependencies[VALIDATOR_PACKAGES[validator]!] = 'latest';

    // Add selected framework
    for (const pkg of FRAMEWORK_PACKAGES[framework]!) {
      backendPackageJson.dependencies[pkg] = 'latest';
    }

    fs.writeFileSync(backendPackageJsonPath, JSON.stringify(backendPackageJson, null, 2) + '\n');
  }

  // Create a .env.example file
  const envExamplePath = path.join(targetDir, 'packages', 'backend', '.env.example');
  const envContent = `# Environment variables
NODE_ENV=development
PORT=3000
`;
  fs.writeFileSync(envExamplePath, envContent);

  // Copy .env.example to .env
  const envPath = path.join(targetDir, 'packages', 'backend', '.env');
  fs.writeFileSync(envPath, envContent);

  // Create a basic configuration comment file to indicate selections
  const configPath = path.join(targetDir, '.onion-lasagna.json');
  const config = {
    structure,
    starter,
    validator,
    framework,
    packageManager,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  // Install dependencies if requested
  if (install) {
    const installCmd = INSTALL_COMMANDS[packageManager];
    execSync(installCmd, {
      cwd: targetDir,
      stdio: 'ignore',
    });
  }

  // Initialize git repository (unless skipped)
  if (!skipGit) {
    initGitRepository(targetDir);
  }
}
