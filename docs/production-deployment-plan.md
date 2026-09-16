# Production Deployment Plan — Hostinger

Target: `app.opticv.net` (opticv-web, Angular SSR) + `api.opticv.net` (opticv-be, NestJS) on Hostinger's
managed Node.js hosting (hPanel), Business plan or above. Supabase stays the Postgres provider; Redis
moves to Upstash (Hostinger has no Redis add-on) — this matches `docs/landing-page-and-hosting-research.md`.

Hostinger's Node.js hosting runs a **plain Node process** (you pick a startup file, it runs
`npm install` against a `package.json` you provide, then `node <startup file>`). It is not a
Docker host, so this plan does not use a Dockerfile.

---

## 0. Pre-deploy manual steps (do these first, outside the repo)

These can't be done from the codebase — do them before touching env files:

1. **Create a production Supabase project.** The current `environment.prod.ts` and
   `production.env` both point at the *staging* Supabase project (`kmkkoqsagagernsxuggr...`) or
   are blank — neither is a real prod project yet. Create one, copy its URL/anon key/service
   role key.
2. **Switch Stripe to live mode** and create live-mode equivalents of the Basic/Pro prices used
   in staging (`STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`), plus a live webhook endpoint pointed at
   `https://api.opticv.net/api/stripe/webhook` (confirm the exact path in
   `apps/opticv-be/src/app/stripe/stripe.controller.ts`) to get a live `STRIPE_WEBHOOK_SECRET`.
3. **Create a production R2 bucket** (currently `opticv-dev` is used even by staging) — don't
   share the dev/staging bucket with prod user uploads.
4. **Create a production Upstash Redis database** (staging already uses Upstash — same flow, new
   instance so rate-limit/queue state isn't shared with staging).
5. **Point DNS**: `app.opticv.net` and `api.opticv.net` A/CNAME records at Hostinger, per
   Hostinger's Node.js app domain-binding instructions.
6. **Buy/confirm the Hostinger plan** with Node.js hosting (Business plan: 2 vCPU / 3 GB RAM /
   5 Node apps — enough for both `opticv-be` and `opticv-web` on one plan).

---

## 1. Fill in `apps/opticv-be/config/env/production.env`

Every value is currently blank except non-secret defaults. Fill with the credentials from step 0:

```
SUPABASE_URL=                  # new prod project
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
R2_ACCOUNT_ID=                 # prod bucket
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
OPENAI_API_KEY=                # can reuse staging key or use a separate prod key for cost tracking
REDIS_HOST=                    # prod Upstash instance
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=true
STRIPE_SECRET_KEY=             # sk_live_...
STRIPE_WEBHOOK_SECRET=         # whsec_... from the live webhook endpoint
STRIPE_PRICE_BASIC=            # live-mode price id
STRIPE_PRICE_PRO=              # live-mode price id
DATABASE_URL=                  # prod Supabase pooled connection string
DIRECT_URL=                    # prod Supabase direct connection string, used for migrations
```

`FRONTEND_URL=https://opticv.net` is already set but should be `https://app.opticv.net` once the
domain is live (it drives CORS in `main.ts`).

`DATABASE_URL`/`DIRECT_URL` live in this same `NODE_ENV`-keyed file, same as every other backend
secret — there's no separate flat `.env` to keep in sync. `PrismaService` reads them from
`process.env` (populated by `ConfigModule` at Nest bootstrap), and `prisma.config.ts` loads the
matching `config/env/${NODE_ENV}.env` itself for Prisma CLI usage, which runs outside Nest. To run
Prisma CLI commands against staging or production, use `npm run prisma:migrate:staging` /
`npm run prisma:migrate:production` (or `prisma:studio:*`) from the workspace root — see the
[Prisma section in CLAUDE.md](../CLAUDE.md#prisma).

## 2. Fix `environment.prod.ts`

`apps/opticv-web/src/environments/environment.prod.ts` currently has the **staging** Supabase URL/key
and a shared PostHog key. Update once the prod Supabase project exists:

```ts
export const environment = {
  production: true,
  supabaseUrl: '<prod supabase url>',
  supabaseKey: '<prod supabase publishable key>',
  apiUrl: 'https://api.opticv.net/api',
  posthogKey: '<consider a separate prod PostHog project to keep staging events out of prod analytics>',
  posthogHost: 'https://eu.i.posthog.com',
};
```

## 3. Backend build for Hostinger (plain Node, no Docker)

`opticv-be` already has an Nx `prune` target (`prune-lockfile` + `copy-workspace-modules`) built
for exactly this: producing a self-contained deployable folder since `generatePackageJson: false`
means the webpack build alone doesn't ship dependencies.

```bash
npm exec nx build opticv-be -- --configuration=production
npm exec nx run opticv-be:prune
```

This produces `apps/opticv-be/dist/` containing `main.js`, a pruned `package.json` +
`package-lock.json`, and `workspace_modules/`. Upload the contents of that `dist/` folder to
Hostinger, run `npm install` there (or let Hostinger's deploy step do it), and set the app's
**startup file** to `main.js`.

Set these in Hostinger's environment-variables UI for the `opticv-be` app (Hostinger doesn't read
`apps/opticv-be/config/env/production.env` — that file is only for local `ConfigModule` loading,
so its values need to be re-entered as actual Hostinger env vars, or the deploy step needs to copy
it in):

- `NODE_ENV=production`
- Everything listed in step 1's `production.env`, including `DATABASE_URL` / `DIRECT_URL`

### Database migrations

Run once per deploy, **before** starting the new backend process, using the prod
`DATABASE_URL`/`DIRECT_URL`:

```bash
npm run prisma:migrate:production
```

(`migrate deploy`, not `migrate dev` — `dev` prompts interactively and can create new migrations;
`deploy` only applies existing ones, which is what CI/production needs.)

### Health check

`GET /api` already exists (`apps/opticv-be/src/app/app.controller.ts`) and returns 200 — use it as
Hostinger's health-check / uptime-monitor URL if the product supports one.

## 4. Frontend build for Hostinger

```bash
npm exec nx build opticv-web -- --configuration=production
```

Produces `apps/opticv-web/dist/apps/opticv-web/` with a `server/` folder (SSR entry,
`server.mjs`) and `browser/` (static assets). Set the Hostinger Node app's startup file to
`server/server.mjs`, and set `PORT` per Hostinger's assigned port for that app (Angular's SSR
server reads `process.env.PORT` already, via `@angular/ssr`).

No env vars needed here — `opticv-web` has no Angular runtime env files; `apiUrl`/`supabaseUrl`
etc. are baked in at build time via `environment.prod.ts` (fileReplacements), so they must be
correct **before** running this build.

## 5. Open gaps not covered by this deploy (tracked separately)

- **Structured/persisted logging** — researched in `docs/production-ready-logging-opticv-be.md`
  (Winston + daily-rotate-file), not implemented. Sentry covers error-level events; there is
  currently no request-level audit trail in prod. Also tracked in `docs/tasks-list.md`
  ("Implement logging to db/file").
- **PII encryption at rest for resumes** — open item in `docs/tasks-list.md`, not implemented.
- **No CD step in CI** — `.github/workflows/ci.yml` runs format/lint/test/build/e2e but does not
  deploy. Hostinger deploys are likely manual/Git-push-to-deploy initially; automating that (e.g.
  a `deploy` job triggered on `main` after CI passes, using Hostinger's Git deployment or an SSH
  step) is a follow-up, not required for a first prod release.
- **Remove the `main.ts` startup comment** ("This is not a production server yet!") once live.
