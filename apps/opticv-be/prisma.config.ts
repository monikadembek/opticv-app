import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma CLI runs outside Nest, so it can't rely on ConfigModule to load
// config/env/{NODE_ENV}.env — load the same file here, keyed off the same
// NODE_ENV, so `DATABASE_URL`/`DIRECT_URL` always match whichever
// environment you're targeting (defaults to development, like the rest of
// the app's local tooling).
const nodeEnv = process.env.NODE_ENV || 'development';
loadEnv({ path: `config/env/${nodeEnv}.env` });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DIRECT_URL'],
  },
});
