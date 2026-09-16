# Task Specification

## Source

Azure DevOps Task: 36 — Add Helmet middleware library for better security

## Goal

Integrate the `helmet` npm package into the NestJS backend (`opticv-be`) to set security-related HTTP response headers automatically, reducing common web vulnerabilities.

## Context

The backend is a NestJS 11 app bootstrapped in `apps/opticv-be/src/main.ts`. Middleware is applied globally at the `bootstrap()` level (same place where CORS, global prefix, and pipes are registered). Helmet is an Express-compatible middleware that sets headers such as `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and others.

## Scope

### In scope

- Install `helmet` as a production dependency.
- Install `@types/helmet` as a dev dependency (if types are not bundled).
- Apply Helmet globally in `main.ts` via `app.use(helmet())` before the server starts listening.

### Out of scope

- Customising individual Helmet directives (use defaults).
- Frontend changes.
- Any changes to existing modules, services, or tests other than what is strictly required.
- Environment-specific Helmet configuration (same config for dev and prod).

## Behavior

1. `helmet` package is installed.
2. In `apps/opticv-be/src/main.ts`, `helmet` is imported and applied as Express middleware using `app.use(helmet())` — placed after `NestFactory.create()` but before `app.listen()`.
3. Every HTTP response from the backend will now include the default Helmet security headers.

## Edge Cases

- Helmet's default `Content-Security-Policy` is permissive and should not break existing Swagger UI or API consumers.
- No content negotiation or CORS behaviour changes — Helmet runs before the CORS middleware call but both will coexist fine since CORS headers are set by NestJS, not Helmet.

## Data / API

- No new endpoints.
- No database changes.
- No changes to shared types.

## Acceptance (DEV)

- `npm install` completes without errors.
- `npm exec nx build opticv-be` passes.
- `npm exec nx test opticv-be` passes (no test changes expected — Helmet is a middleware concern, not a unit-testable module).
- A sample HTTP response (e.g. `GET /api`) includes the `X-Content-Type-Options: nosniff` header (verifiable via browser DevTools or `curl -I`).
- No breaking changes to existing API behaviour.
