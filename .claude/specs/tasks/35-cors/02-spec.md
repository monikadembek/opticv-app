# Task Specification

## Source

Azure DevOps Task: 35-cors

## Goal

Replace the current permissive `app.enableCors()` call in the NestJS bootstrap with a restrictive CORS configuration that allows requests only from the known frontend origin, driven by an environment variable so that the allowed origin differs between development and production.

## Context

The backend (`apps/opticv-be`) is a NestJS 11 application bootstrapped in `src/main.ts`. CORS is already enabled via `app.enableCors()` (line 35) with no options — this allows all origins. The app uses a `ConfigModule`-based configuration system (`config/configuration.ts`, `config/validation.ts`, and per-environment `.env` files) that must be extended to carry the CORS origin value.

- Development env file: `config/env/development.env`
- Production env file: `config/env/production.env`
- Config mapping: `config/configuration.ts`
- Validation schema: `config/validation.ts`
- Bootstrap: `src/main.ts`

## Scope

### In scope

- Add `CORS_ORIGIN` env var to `development.env` and `production.env`
- Add `CORS_ORIGIN` to the Joi validation schema in `config/validation.ts`
- Map `corsOrigin` in `config/configuration.ts`
- Replace `app.enableCors()` in `src/main.ts` with a configured call that reads the allowed origin from `ConfigService`

### Out of scope

- Frontend changes
- Multiple allowed origins / wildcard support
- CORS preflight caching or credentials configuration beyond what NestJS defaults provide
- Any proxy or CDN-level CORS headers

## Behavior

1. At startup, `ConfigService` provides the value of `CORS_ORIGIN`.
2. `app.enableCors()` is called with `{ origin: corsOrigin }`, restricting cross-origin requests to that single origin.
3. In development the allowed origin is `http://localhost:4200` (the Angular dev server).
4. In production the allowed origin is `https://opticv.com`.
5. If `CORS_ORIGIN` is missing or not a valid URI, the Joi validation schema rejects startup — the app fails fast with a descriptive error rather than running with open CORS.

## Edge Cases

- **Missing env var in production**: Joi validation marks `CORS_ORIGIN` as `required()` — app will not start if it is absent.
- **Development without the env var set**: Value is present in `development.env`; no fallback needed.

## Data / API

No new endpoints, models, or database changes. Changes are limited to configuration and bootstrap files:

| File | Change |
|---|---|
| `config/env/development.env` | Add `CORS_ORIGIN=http://localhost:4200` |
| `config/env/production.env` | Add `CORS_ORIGIN=https://opticv.com` |
| `config/validation.ts` | Add `CORS_ORIGIN: Joi.string().uri().required()` |
| `config/configuration.ts` | Add `corsOrigin: process.env.CORS_ORIGIN` |
| `src/main.ts` | Replace `app.enableCors()` with `app.enableCors({ origin: configService.get<string>('corsOrigin') })` |

## Acceptance (DEV)

- `npm exec nx build opticv-be` passes with no errors
- `npm exec nx test opticv-be` passes (no test changes expected; existing tests must remain green)
- `npm exec nx typecheck opticv-be` passes
- Starting the backend in dev mode (`npm run start-be:dev`) logs no CORS-related errors
- A request from `http://localhost:4200` is accepted; a request from any other origin is rejected by CORS
- Removing `CORS_ORIGIN` from the env file causes the app to fail at startup with a Joi validation error
