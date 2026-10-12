import { existsSync } from 'fs';

// @Processor() options are evaluated at import time, before ConfigModule
// loads the env file, so load it here first. Variables already set in the
// real environment (e.g. on Hostinger) keep precedence over file values.
export function loadEnvFile(): void {
  const nodeEnv = process.env['NODE_ENV'];
  if (!nodeEnv) {
    return;
  }

  const path = `${process.cwd()}/apps/opticv-be/config/env/${nodeEnv}.env`;
  if (!existsSync(path)) {
    return;
  }

  process.loadEnvFile(path);
}

loadEnvFile();
