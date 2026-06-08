#!/usr/bin/env bun

import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? process.cwd();

function walkDirs(dir: string): string[] {
  const dirs: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.turbo') {
      continue;
    }

    const path = join(dir, entry);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
    dirs.push(path);
    dirs.push(...walkDirs(path));
  }

  return dirs;
}

const dirs = walkDirs(root);
const boundedContexts = dirs
  .filter((dir) => dir.includes('bounded-contexts'))
  .filter((dir) => existsSync(join(dir, 'domain')) && existsSync(join(dir, 'app')));
const readTrees = dirs.filter((dir) => /\/read$/.test(dir.replaceAll('\\', '/')));
const writeTrees = dirs.filter((dir) => /\/write$/.test(dir.replaceAll('\\', '/')));
const bootstrapDirs = dirs.filter((dir) => /\/bootstrap$/.test(dir.replaceAll('\\', '/')));

const summary = {
  root,
  boundedContexts: boundedContexts.map((dir) => relative(root, dir)),
  readTrees: readTrees.map((dir) => relative(root, dir)),
  writeTrees: writeTrees.map((dir) => relative(root, dir)),
  bootstrapDirs: bootstrapDirs.map((dir) => relative(root, dir)),
};

console.log(JSON.stringify(summary, null, 2));
