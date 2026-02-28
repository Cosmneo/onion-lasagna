/**
 * @fileoverview Bump all @cosmneo/* packages to the same version atomically.
 *
 * Updates:
 *   - `version` field in each package.json
 *   - `peerDependencies` referencing @cosmneo/* packages (>=X.Y.Z → >=NEW)
 *
 * Usage:
 *   bun scripts/bump-version.ts 0.3.0           # set exact version
 *   bun scripts/bump-version.ts patch            # 0.2.0 → 0.2.1
 *   bun scripts/bump-version.ts minor            # 0.2.0 → 0.3.0
 *   bun scripts/bump-version.ts major            # 0.2.0 → 1.0.0
 *   bun scripts/bump-version.ts                  # defaults to patch
 */

import { resolve, join } from 'node:path';

// ============================================================================
// Constants
// ============================================================================

const ROOT = resolve(import.meta.dirname, '..');

const PACKAGE_DIRS = [
  'packages/onion-lasagna',
  'packages/schemas/onion-lasagna-zod',
  'packages/schemas/onion-lasagna-zod-v3',
  'packages/schemas/onion-lasagna-typebox',
  'packages/schemas/onion-lasagna-valibot',
  'packages/schemas/onion-lasagna-arktype',
  'packages/servers/onion-lasagna-hono',
  'packages/servers/onion-lasagna-elysia',
  'packages/servers/onion-lasagna-fastify',
  'packages/servers/onion-lasagna-express',
  'packages/servers/onion-lasagna-nestjs',
  'packages/clients/onion-lasagna-client',
  'packages/patterns/onion-lasagna-saga',
  'packages/clients/onion-lasagna-react-query',
] as const;

// ============================================================================
// Helpers
// ============================================================================

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const BUMP_TYPES = ['patch', 'minor', 'major'] as const;
type BumpType = (typeof BUMP_TYPES)[number];

function isValidSemver(v: string): boolean {
  return SEMVER_RE.test(v);
}

function isBumpType(v: string): v is BumpType {
  return BUMP_TYPES.includes(v as BumpType);
}

function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = current.split('.').map(Number) as [number, number, number];
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

async function getCurrentVersion(): Promise<string> {
  const pkgPath = join(ROOT, PACKAGE_DIRS[0], 'package.json');
  const pkg = await Bun.file(pkgPath).json();
  return pkg.version;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const requireExact = args.includes('--set');
  const arg = args.find((a) => a !== '--set');
  let newVersion: string;

  if (requireExact) {
    if (!arg || !isValidSemver(arg)) {
      console.error('Usage: bun run version:set <X.Y.Z>');
      console.error('Example: bun run version:set 0.3.0');
      process.exit(1);
    }
    newVersion = arg;
  } else if (!arg || isBumpType(arg)) {
    const type = (arg as BumpType) ?? 'patch';
    const current = await getCurrentVersion();
    newVersion = bumpVersion(current, type);
    console.log(`\n📦 Bumping ${type}: ${current} → ${newVersion}`);
  } else if (isValidSemver(arg)) {
    newVersion = arg;
  } else {
    console.error(`❌ Invalid argument: "${arg}"`);
    console.error('Usage: bun scripts/bump-version.ts [patch|minor|major|X.Y.Z]');
    process.exit(1);
  }

  console.log(`\n📦 Bumping all @cosmneo/* packages to ${newVersion}\n`);

  let changed = 0;

  for (const rel of PACKAGE_DIRS) {
    const pkgPath = join(ROOT, rel, 'package.json');
    const raw = await Bun.file(pkgPath).text();
    const pkg = JSON.parse(raw);
    const oldVersion = pkg.version;
    let modified = false;

    // Update version
    if (pkg.version !== newVersion) {
      pkg.version = newVersion;
      modified = true;
    }

    // Update @cosmneo/* peerDependencies
    if (pkg.peerDependencies) {
      for (const [dep, range] of Object.entries(pkg.peerDependencies)) {
        if (dep.startsWith('@cosmneo/') && typeof range === 'string') {
          const newRange = `>=${newVersion}`;
          if (range !== newRange) {
            pkg.peerDependencies[dep] = newRange;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`   ✅ ${pkg.name.padEnd(45)} ${oldVersion} → ${newVersion}`);
      changed++;
    } else {
      console.log(`   ⏭  ${pkg.name.padEnd(45)} already at ${newVersion}`);
    }
  }

  console.log(`\n${changed === 0 ? '✅ Nothing to change' : `✅ Updated ${changed} package(s)`}\n`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
