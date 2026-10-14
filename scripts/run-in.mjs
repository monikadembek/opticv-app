// Runs a command with cwd set to the given directory. Used to invoke the
// Prisma CLI from apps/opticv-be, since prisma.config.ts resolves the
// schema and config/env/{NODE_ENV}.env paths relative to its own cwd.
// Usage: node scripts/run-in.mjs <dir> <command> [...args]

import { spawnSync } from 'node:child_process';

const [dir, command, ...args] = process.argv.slice(2);

if (!dir || !command) {
  console.error('Usage: node scripts/run-in.mjs <dir> <command> [...args]');
  process.exit(1);
}

const result = spawnSync(command, args, {
  cwd: dir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
