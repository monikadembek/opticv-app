# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Docs-First Requirement

**Before generating any code, Claude Code MUST first read and refer to the relevant documentation files in the `/docs` directory.** All implementation decisions, patterns, and conventions should align with what is specified in those docs. If a relevant doc file exists for the feature or area being worked on, it takes precedence over general assumptions.

- /docs/angular-best-practices.md

## Project Overview

OptiCV App – application which will help users to optimize their CV with AI

This is an **Nx monorepo** with three main projects:

- `opticv-web` — Angular 21 frontend (standalone components, SSR, PrimeNG UI, Supabase auth)
- `opticv-be` — NestJS 11 backend (REST API, Webpack build)
- `datatypes` — Shared TypeScript types library (`packages/shared/datatypes`)

## Common Commands

All `nx` commands must be prefixed with `npm exec` (no global Nx install assumed).

### Development

```bash
# Start backend in dev mode (sets NODE_ENV=development)
npm run start-be:dev

# Start frontend dev server
npm exec nx serve opticv-web

# Start both (run in separate terminals)
npm run start-be:dev
npm exec nx serve opticv-web
```

### Build

```bash
npm exec nx build opticv-be               # production webpack build
npm exec nx build opticv-be -- --configuration=development
npm exec nx build opticv-web              # production Angular SSR build
npm exec nx build opticv-web -- --configuration=development
npm exec nx run-many -t build             # build all projects
```

### Test

```bash
npm exec nx test opticv-be                # Jest (backend)
npm exec nx test opticv-web               # Vitest via Angular build (frontend)
npm exec nx run-many -t test              # all projects

# Run a single test file
npm exec nx test opticv-be -- --testFile=path/to/spec.ts
```

### Lint & Format

```bash
npm exec nx lint opticv-be
npm exec nx lint opticv-web
npm exec nx run-many -t lint
npm exec nx format:check                  # check formatting
npm exec nx format:write                  # fix formatting
```

### E2E

```bash
npm exec nx e2e opticv-web-e2e
npm exec nx e2e opticv-be-e2e
```

### Type Check

```bash
npm exec nx typecheck opticv-be
npm exec nx typecheck opticv-web
npm exec nx run-many -t typecheck
```

### Prisma

Prisma commands must run from the workspace root (the `cwd` matters for env file resolution):

```bash
npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma
npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma
npm exec prisma studio --schema=apps/opticv-be/prisma/schema.prisma
```

The generated Prisma client is output to `apps/opticv-be/src/generated/prisma/`.

---

## Architecture

### Monorepo Layout

```
apps/
  opticv-be/       NestJS backend (Webpack build, serves on :3000)
  opticv-be-e2e/   Playwright E2E for backend
  opticv-web/      Angular 21 frontend with SSR (serves on :4200)
  opticv-web-e2e/  Playwright E2E for frontend
packages/
  shared/datatypes/ Shared TypeScript types (@opticv/datatypes)
```

### Backend (`opticv-be`)

- **NestJS 11** with Express, built via **Webpack** (not `tsc` directly)
- **Database:** PostgreSQL on Supabase, accessed through **Prisma 7** using the `@prisma/adapter-pg` driver adapter (connection-string based, not the default binary protocol)
- `PrismaService` extends `PrismaClient` directly and is exported from `PrismaModule` — inject it into feature modules as needed
- **Config:** `ConfigModule` loads `apps/opticv-be/config/env/{NODE_ENV}.env` at startup; schema validated by Joi (`config/validation.ts`). The `DATABASE_URL` for Prisma is read from `apps/opticv-be/.env` (not the same env file)
- Global API prefix: `/api`; CORS enabled
- Build output: `apps/opticv-be/dist/`; deployment uses `prune` target to produce a minimal lockfile and copy workspace node_modules

### Frontend (`opticv-web`)

- **Angular 21** standalone components (no NgModules), **SSR enabled** (`@angular/ssr` with event replay hydration)
- **UI:** PrimeNG 21 with Aura theme preset, configured globally in `app.config.ts`
- **Styling:** Tailwind CSS 4 via PostCSS
- **State management:** NgRx Signals
- Build executor: `@angular/build:application`; SSR entry at `src/server.ts`
- Test runner: `@angular/build:unit-test` (Vitest under the hood via `vitest-angular`)

### Shared Types (`@opticv/datatypes`)

- Pure TypeScript, ESM module format
- Import as `@opticv/datatypes` in both frontend and backend
- Source: `packages/shared/datatypes/src/lib/datatypes.ts`
- Must be built before apps that depend on it (`^build` dependency in Nx)

### Authentication

The app uses **passwordless OTP authentication** via Supabase — no passwords, no backend auth module.

**Flow:**

1. User submits email on `/login` → `SupabaseService.signInWithOtp()` sends a 6-digit code to that email
2. User enters the code on `/verify` → `SupabaseService.verifyOtp()` validates it and establishes a Supabase session
3. Session token is persisted in the Supabase client and attached to every outgoing HTTP request by `AuthInterceptor`
4. `authGuard` blocks unauthenticated users from protected routes (redirects to `/login`)
5. `guestGuard` blocks already-authenticated users from `/login` and `/verify` (redirects to `/`)

**Frontend files (all under `apps/opticv-web/src/app/core/auth/`):**

| Path                               | Purpose                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `services/supabase.ts`             | `SupabaseService` — wraps Supabase client; exposes `user` and `session` signals, `signInWithOtp()`, `verifyOtp()`, `signOut()` |
| `guards/auth-guard.ts`             | `CanActivateFn` — redirects to `/login` when no session                                                                        |
| `guards/guest-guard.ts`            | `CanActivateFn` — redirects authenticated users away from login/verify pages                                                   |
| `pages/login/login.ts`             | Email input page; initiates OTP flow                                                                                           |
| `pages/verify/verify.ts`           | OTP input page (PrimeNG `InputOtp`, 6 digits); completes sign-in                                                               |
| `interceptors/auth-interceptor.ts` | Attaches `Authorization: Bearer <token>` to all HTTP requests                                                                  |

**Configuration:**

- Supabase URL and anon key are set in `apps/opticv-web/src/environments/environment.ts`
- `AuthInterceptor` is registered globally in `app.config.ts`
- Routes for login and verify use `guestGuard`; protected routes use `authGuard` (see `app.routes.ts`)

**Backend:** No auth module exists yet — session validation against Supabase JWTs is not yet implemented on the NestJS side.

### Environment & Secrets

- Backend env files: `apps/opticv-be/config/env/development.env` and `production.env` (loaded by NestJS ConfigModule)
- `apps/opticv-be/.env` — contains `DATABASE_URL`; read directly by Prisma CLI and `PrismaService` at runtime
- The Angular frontend has no runtime env files; environment config uses Angular's `environment.ts` pattern if needed

### CI (GitHub Actions)

- Nx Cloud with 3 distributed agents (`linux-medium-js`)
- Pipeline: format check → lint → typecheck → test → build → e2e-ci
- Uses `npm ci` and `nx affected` to skip unchanged projects
