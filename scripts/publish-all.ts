/**
 * @fileoverview Synchronized publish orchestrator for all @cosmneo/* packages.
 *
 * Enforces that all packages share the same version, then publishes them
 * in dependency order. Already-published packages are skipped, so re-runs
 * after a partial failure pick up where they left off.
 *
 * Usage:
 *   bun scripts/publish-all.ts              # publish all
 *   bun scripts/publish-all.ts --dry-run    # check without publishing
 *
 * Environment:
 *   NODE_AUTH_TOKEN — npm auth token (required for publishing)
 *   CI=true        — adds --provenance flag (GitHub Actions only)
 */

import { resolve, join } from 'node:path';

// ============================================================================
// Constants
// ============================================================================

const ROOT = resolve(import.meta.dirname, '..');

/**
 * Publish order respects the dependency graph:
 *   Layer 1: core (no @cosmneo deps)
 *   Layer 2: adapters + client + saga (peer-depend on core only)
 *   Layer 3: react-query (peer-depends on core + client)
 */
const PUBLISH_ORDER = [
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
  'packages/clients/onion-lasagna-axios',
  'packages/patterns/onion-lasagna-saga',
  'packages/clients/onion-lasagna-react-query',
  'packages/clients/onion-lasagna-vue-query',
  'packages/clients/onion-lasagna-svelte-query',
  'packages/clients/onion-lasagna-swr',
] as const;

// ============================================================================
// Types
// ============================================================================

interface PackageInfo {
  name: string;
  version: string;
  dir: string;
}

// ============================================================================
// Helpers
// ============================================================================

async function readPackageJson(dir: string): Promise<PackageInfo> {
  const pkgPath = join(dir, 'package.json');
  const raw = await Bun.file(pkgPath).json();
  return { name: raw.name, version: raw.version, dir };
}

async function run(cmd: string[], cwd: string): Promise<{ ok: boolean; output: string }> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { ok: exitCode === 0, output: (stdout + stderr).trim() };
}

async function isPublished(name: string, version: string): Promise<boolean> {
  const result = await run(['npm', 'view', `${name}@${version}`, 'version'], ROOT);
  return result.ok && result.output.trim() === version;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const isCI = process.env.CI === 'true';

  if (!dryRun && !isCI) {
    console.error('❌ Publishing is only allowed in CI. Use --dry-run for local checks.');
    process.exit(1);
  }

  console.log(`\n📦 onion-lasagna publish orchestrator`);
  console.log(`   mode: ${dryRun ? 'DRY RUN' : 'PUBLISH'}`);
  console.log(`   ci:   ${isCI}\n`);

  // 1. Read all package.json files
  const packages: PackageInfo[] = [];
  for (const rel of PUBLISH_ORDER) {
    const dir = join(ROOT, rel);
    packages.push(await readPackageJson(dir));
  }

  // 2. Verify version sync
  const versions = new Set(packages.map((p) => p.version));
  if (versions.size !== 1) {
    console.error('❌ Version mismatch detected:\n');
    for (const pkg of packages) {
      console.error(`   ${pkg.name.padEnd(45)} ${pkg.version}`);
    }
    console.error('\nAll @cosmneo/* packages must share the same version.');
    console.error('Run: bun scripts/bump-version.ts <version>');
    process.exit(1);
  }

  const version = packages[0]!.version;
  console.log(`✅ All ${packages.length} packages at version ${version}\n`);

  // 3. Check registry and publish
  let published = 0;
  let skipped = 0;

  for (const pkg of packages) {
    process.stdout.write(`   ${pkg.name.padEnd(45)} `);

    const alreadyPublished = await isPublished(pkg.name, pkg.version);

    if (alreadyPublished) {
      console.log('⏭  already published');
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log('🔍 would publish');
      published++;
      continue;
    }

    // Publish
    const publishCmd = ['npm', 'publish', '--access', 'public'];
    if (isCI) {
      publishCmd.push('--provenance');
    }

    const result = await run(publishCmd, pkg.dir);

    if (!result.ok) {
      // Check if the error is "already exists" (race condition safety)
      if (result.output.includes('You cannot publish over the previously published versions')) {
        console.log('⏭  already published (race)');
        skipped++;
        continue;
      }

      console.log('❌ FAILED');
      console.error(`\n${result.output}\n`);
      console.error(`Publishing stopped. Re-run to continue from where it left off.`);
      console.error(`Published: ${published}, Skipped: ${skipped}, Failed: 1`);
      process.exit(1);
    }

    console.log('✅ published');
    published++;
  }

  // 4. Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${dryRun ? '🔍 Dry run' : '✅ Done'}:`);
  console.log(`   ${dryRun ? 'Would publish' : 'Published'}: ${published}`);
  console.log(`   Skipped:   ${skipped}`);
  console.log(`   Total:     ${packages.length}\n`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
