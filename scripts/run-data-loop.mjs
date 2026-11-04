#!/usr/bin/env node
/**
 * One-shot go-live data loop when credentials are available:
 *   hotspots → publish risk → optional push
 *
 * Usage (from repo root):
 *   node scripts/run-data-loop.mjs
 *   node scripts/run-data-loop.mjs --skip-push
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const skipPush = process.argv.includes('--skip-push');

function run(cwd, command, args) {
  console.log(`\n> ${command} ${args.join(' ')}  (${cwd})`);
  const result = spawnSync(command, args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('backend/pipeline', 'node', ['compute-hotspots.mjs', '--threshold', '2', '--grid', '0.03']);
run('backend/ml', 'node', ['publish-risk-predictions.mjs']);
if (!skipPush) {
  run('backend/pipeline', 'node', ['notify-push.mjs']);
}

console.log('\nData loop complete.');
