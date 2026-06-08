#!/usr/bin/env bun

import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const normalizedRoot = root.replaceAll('\\', '/').replace(/\/$/, '');
const isPluginRoot = normalizedRoot.endsWith('plugins/onion-lasagna-kit');
const violations: string[] = [];
const externalPathTokens = [
  '..' + '/packages',
  '..' + '/starters',
  '..' + '/CLAUDE.md',
  'omninode' + '-workspace',
];

const bannedByLayer: Array<{ layer: string; pattern: RegExp; banned: RegExp[] }> = [
  {
    layer: 'domain',
    pattern: /\/domain\//,
    banned: [
      /\/infra\//,
      /\/presentation\//,
      /drizzle/,
      /hono/,
      /express/,
      /fastify/,
      /nestjs/,
      /graphql/,
    ],
  },
  {
    layer: 'app',
    pattern: /\/app\//,
    banned: [/\/infra\//, /drizzle/, /axios/, /fetch\(/, /hono/, /express/, /fastify/, /nestjs/],
  },
  {
    layer: 'presentation',
    pattern: /\/(presentation|graphql|http)\//,
    banned: [/\/repositories\//],
  },
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.turbo') {
      continue;
    }

    const path = join(dir, entry);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) files.push(...walk(path));
    if (stat.isFile() && /\.(ts|tsx|js|mjs|md|json)$/.test(entry)) files.push(path);
  }

  return files;
}

for (const file of walk(root)) {
  const normalized = `/${relative(root, file).replaceAll('\\', '/')}`;
  const text = readFileSync(file, 'utf8');
  const importText = text
    .split('\n')
    .filter((line) => /^\s*import\b|^\s*export\b.*\bfrom\b|require\(/.test(line))
    .join('\n');

  for (const rule of bannedByLayer) {
    if (!rule.pattern.test(normalized)) continue;

    for (const banned of rule.banned) {
      if (banned.test(importText)) {
        violations.push(`${normalized}: ${rule.layer} layer contains banned pattern ${banned}`);
      }
    }
  }

  if (isPluginRoot || normalized.startsWith('/plugins/onion-lasagna-kit/')) {
    if (externalPathTokens.some((token) => text.includes(token))) {
      violations.push(
        `${normalized}: plugin runtime file references content outside the plugin root`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Onion Lasagna boundary check passed');
