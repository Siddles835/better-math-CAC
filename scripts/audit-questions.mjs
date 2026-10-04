#!/usr/bin/env node
/**
 * Inventory + answer audit entrypoint.
 * Runs the vitest audit suite and prints the inventory summary.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('Answer audit — inventorying questions via vitest…');
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', 'src/lib/answers/answers.test.ts', '--reporter=verbose'],
  { cwd: root, stdio: 'inherit', env: process.env }
);

process.exit(result.status ?? 1);
