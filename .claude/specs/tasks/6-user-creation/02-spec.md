# Task Specification

## Source

Task 6 — Handle user creation on the backend

## Goal

When a user successfully authenticates via Supabase OTP for the first time, create a corresponding `User` row and a free `Subscription` row in the PostgreSQL database. Ensure a `User` row always exists for any valid Supabase session, regardless of whether the webhook fired.

## Context

The app uses passwordless OTP auth via Supabase. Supabase manages its own `auth.users` table. The NestJS backend has a `User` model in Prisma but currently no auth layer and no user-creation logic. The frontend already attaches a Supabase JWT (`Authorization: Bearer <token>`) to every request via `AuthInterceptor`.

## Scope

### In scope

- NestJS `UsersModule` with a `UsersService` and `UsersController`
- `POST /api/users/sync` endpoint — receives Supabase Database Webhook payload and upserts the `User` + `Subscription` rows
- NestJS `AuthModule` with a `SupabaseGuard` — validates Supabase JWTs on protected routes and upserts `User` + `Subscription` if missing (fallback path)
- Webhook secret verification (HMAC signature check on the incoming webhook request)
- Shared `UserUpsertService` (or equivalent) so upsert logic is not duplicated between the webhook handler and the guard

### Out of scope

- Supabase Dashboard webhook configuration (infrastructure, not code)
- Any frontend changes
- User update or delete flows
- Stripe subscription management
- Role-based authorization beyond "authenticated vs unauthenticated"

## Behavior

### Primary path — Supabase Database Webhook

1. Supabase fires `POST /api/users/sync` when a row is inserted into `auth.users` (on first confirmed sign-in).
2. The endpoint verifies the `x-webhook-secret` header against `SUPABASE_WEBHOOK_SECRET` from config.
3. If verification fails → respond `401 Unauthorized`, log the attempt.
4. Extract `id` (supabaseId) and `email` from the webhook payload.
5. Call `prisma.user.upsert` — create if not exists, no-op on conflict (`supabaseId` is the unique key).
6. Within the same logical operation, call `prisma.subscription.upsert` — create a `FREE / ACTIVE` subscription linked to the new user if one does not already exist.
7. Respond `200 OK` with `{ received: true }`.

### Fallback path — JWT Guard upsert

1. Any protected route is guarded by `SupabaseGuard`.
2. The guard extracts the Bearer token from `Authorization` header.
3. Verifies the JWT against Supabase using `@supabase/supabase-js` (`getUser(token)`).
4. If invalid → throw `UnauthorizedException`.
5. If valid → check whether a `User` row exists for the `supabaseId`.
6. If missing → run the same upsert logic (user + free subscription) as the webhook handler.
7. Attach the resolved `User` to `request.user` for downstream handlers.

### Upsert logic (shared)

```
prisma.user.upsert({
  where: { supabaseId },
  create: { supabaseId, email, displayName: null, avatarUrl: null },
  update: {},          // no-op — do not overwrite profile fields
})

prisma.subscription.upsert({
  where: { userId },
  create: { userId, tier: FREE, status: ACTIVE },
  update: {},          // no-op
})
```

Both upserts run in a `prisma.$transaction` to keep them atomic.

## Edge Cases

- **Duplicate webhook delivery** — upsert is idempotent; no error.
- **Webhook fires before JWT guard** — normal; guard finds the row and skips creation.
- **JWT guard fires before webhook** — guard creates the row; when webhook arrives later, upsert is a no-op.
- **Missing `supabaseId` or `email` in payload** — validate at entry point; respond `400 Bad Request` and log.
- **Database error during upsert** — let the exception bubble; NestJS default exception filter returns `500`; Supabase will retry the webhook.
- **Invalid/expired JWT** — guard throws `UnauthorizedException`; request is rejected.

## Data / API

### New endpoint

| Method | Path               | Auth            | Description                        |
|--------|--------------------|-----------------|------------------------------------|
| POST   | `/api/users/sync`  | Webhook secret  | Supabase webhook — upsert user row |

### Webhook payload (Supabase `INSERT` event on `auth.users`)

```json
{
  "type": "INSERT",
  "table": "users",
  "schema": "auth",
  "record": {
    "id": "<uuid>",
    "email": "<string>",
    ...
  },
  "old_record": null
}
```

### New environment variables

| Variable                  | Location                            | Purpose                              |
|---------------------------|-------------------------------------|--------------------------------------|
| `SUPABASE_URL`            | `config/env/development.env`        | Supabase project URL (for JWT verify)|
| `SUPABASE_ANON_KEY`       | `config/env/development.env`        | Supabase anon key                    |
| `SUPABASE_WEBHOOK_SECRET` | `config/env/development.env`        | Shared secret for webhook HMAC check |

Add all three to the Joi validation schema in `config/validation.ts`.

### New NestJS modules / files

```
apps/opticv-be/src/
  app/
    users/
      users.module.ts
      users.controller.ts      — POST /users/sync
      users.service.ts         — upsert logic (shared)
    auth/
      auth.module.ts
      supabase.guard.ts        — SupabaseGuard (CanActivate)
      supabase-client.ts       — singleton Supabase client factory
```

### DB changes

No schema changes — `User` and `Subscription` models already exist in `schema.prisma`. No new migration needed.

## Assumptions

- The Supabase webhook sends a standard `INSERT` event payload as documented above.
- Webhook secret verification uses a simple constant-time string comparison (no HMAC required unless Supabase supports it — verify in dashboard; if HMAC is available, prefer it).
- `supabase-js` v2 is already installed or will be added as a dependency for JWT verification in the guard.
- `displayName` and `avatarUrl` are nullable and not populated at creation time (can be updated later).
- Only one `Subscription` row per user is expected at any given time.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-be`)
- Type check passes (`npm exec nx typecheck opticv-be`)
- Unit tests added for `UsersService` upsert logic (mock PrismaService)
- Unit test added for `SupabaseGuard` (mock Supabase client — valid token, invalid token, missing user row)
- `POST /api/users/sync` with valid secret and payload → `200 { received: true }`, user+subscription rows in DB
- `POST /api/users/sync` with wrong secret → `401`
- `POST /api/users/sync` with missing fields → `400`
- Calling a protected route with a valid JWT when no User row exists → row is created, request proceeds
- Calling a protected route with an invalid JWT → `401`
- No breaking changes to existing endpoints
