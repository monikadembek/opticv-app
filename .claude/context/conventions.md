## Project Overview

OptiCV App – application which will help users to optimize their CV with AI

This is an **Nx monorepo** with three main projects:

- `web-ng-app` — Angular 21 frontend (standalone components, SSR, PrimeNG UI, Supabase auth)
- `api` — NestJS 11 backend (REST API, Webpack build)
- `datatypes` — Shared TypeScript types library (`packages/shared/datatypes`)

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

---

## Passwordless Authentication — Supabase OTP

Passwordless authentication via Supabase email OTP (6-digit code).

---

## TypeScript

- Use strict type checking
- Prefer inferred types — only annotate when the inference is wrong or unclear.
- Avoid `any`; use `unknown` when the type is truly unknown and narrow it before use.
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of defensive `if` chains.

---

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use ngrx signals store for state shared among features or components
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

---
