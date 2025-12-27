import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import degit from 'degit';

export type Structure = 'simple' | 'modules';
export type Starter = 'simple-clean' | 'modules-clean';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

// Reserved names that cannot be used as project names
const RESERVED_NAMES = new Set([
  'node_modules',
  'favicon.ico',
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '.git',
  '.gitignore',
  '.env',
  'src',
  'dist',
  'build',
  'test',
  'tests',
  'lib',
  'bin',
  'npm',
  'npx',
  'node',
]);

export interface NameValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateProjectName(name: string): NameValidationResult {
  // Empty check
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Project name cannot be empty' };
  }

  // Length check (npm limit is 214 characters)
  if (name.length > 214) {
    return {
      valid: false,
      error: 'Project name must be 214 characters or fewer',
      suggestion: name.slice(0, 50),
    };
  }

  // Reserved name check
  if (RESERVED_NAMES.has(name.toLowerCase())) {
    return {
      valid: false,
      error: `"${name}" is a reserved name`,
      suggestion: `my-${name}`,
    };
  }

  // Cannot start with a dot or underscore
  if (name.startsWith('.') || name.startsWith('_')) {
    return {
      valid: false,
      error: 'Project name cannot start with a dot or underscore',
      suggestion: name.replace(/^[._]+/, ''),
    };
  }

  // Cannot start with a number
  if (/^[0-9]/.test(name)) {
    return {
      valid: false,
      error: 'Project name cannot start with a number',
      suggestion: `app-${name}`,
    };
  }

  // No uppercase letters (npm packages must be lowercase)
  if (/[A-Z]/.test(name)) {
    return {
      valid: false,
      error: 'Project name must be lowercase',
      suggestion: name.toLowerCase(),
    };
  }

  // No spaces
  if (/\s/.test(name)) {
    return {
      valid: false,
      error: 'Project name cannot contain spaces',
      suggestion: name.replace(/\s+/g, '-'),
    };
  }

  // Only allowed characters: lowercase letters, numbers, hyphens, underscores
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/^[._-]+/, '')
      .replace(/-+/g, '-');
    return {
      valid: false,
      error: 'Project name can only contain lowercase letters, numbers, hyphens, and underscores',
      suggestion: sanitized || 'my-app',
    };
  }

  // Cannot end with certain characters
  if (/[._-]$/.test(name)) {
    return {
      valid: false,
      error: 'Project name cannot end with a dot, underscore, or hyphen',
      suggestion: name.replace(/[._-]+$/, ''),
    };
  }

  return { valid: true };
}

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
  vscode: boolean;
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

const VSCODE_SETTINGS = {
  'files.exclude': {
    '**/node_modules': true,
    '**/dist': true,
    '**/.turbo': true,
    '**/coverage': true,
    '**/.nyc_output': true,
    '**/*.tsbuildinfo': true,
    '**/bun.lockb': true,
    '**/package-lock.json': true,
    '**/yarn.lock': true,
    '**/pnpm-lock.yaml': true,
  },
  'search.exclude': {
    '**/node_modules': true,
    '**/dist': true,
    '**/.turbo': true,
    '**/coverage': true,
    '**/bun.lockb': true,
    '**/package-lock.json': true,
    '**/yarn.lock': true,
    '**/pnpm-lock.yaml': true,
  },
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
  const {
    name,
    structure,
    starter,
    validator,
    framework,
    packageManager,
    install,
    skipGit,
    vscode,
  } = options;
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

  // Handle VS Code settings
  const vscodeDir = path.join(targetDir, '.vscode');
  if (vscode) {
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }
    const vscodeSettingsPath = path.join(vscodeDir, 'settings.json');
    fs.writeFileSync(vscodeSettingsPath, JSON.stringify(VSCODE_SETTINGS, null, 2) + '\n');
  } else if (fs.existsSync(vscodeDir)) {
    fs.rmSync(vscodeDir, { recursive: true });
  }

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
