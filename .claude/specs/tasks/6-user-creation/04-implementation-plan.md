# Implementation Plan — Task 6: Handle user creation on the backend

## Pre-implementation findings (from review + schema inspection)

- `Subscription.userId` is `@unique` in the schema — `prisma.subscription.upsert({ where: { userId } })` is valid.
- `@supabase/supabase-js` v2 is already in `package.json` — no install step needed.
- Webhook secret verification: use **constant-time string comparison** (Node `crypto.timingSafeEqual`) against the `x-webhook-secret` header. Supabase Database Webhooks send a custom header, not HMAC — simple secret matching is correct. The "HMAC" wording in the spec Scope was imprecise; the Assumptions section was correct.
- Two env files exist: `development.env` and `production.env` — both must be updated.
- `UsersModule` and `AuthModule` must be registered in `AppModule`.

---

## Step 1 — Add environment variables

**Files modified:**
- `apps/opticv-be/config/env/development.env`
- `apps/opticv-be/config/env/production.env`

Add three variables to both files:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_WEBHOOK_SECRET=
```

---

## Step 2 — Extend Joi validation schema

**File modified:** `apps/opticv-be/config/validation.ts`

Add to the `Joi.object({...})`:
- `SUPABASE_URL`: `Joi.string().uri().required()`
- `SUPABASE_ANON_KEY`: `Joi.string().required()`
- `SUPABASE_WEBHOOK_SECRET`: `Joi.string().required()`

---

## Step 3 — Create `AuthModule` with Supabase client and `SupabaseGuard`

### 3a. Supabase client factory

**File created:** `apps/opticv-be/src/app/auth/supabase-client.provider.ts`

- Export a NestJS `Provider` with token `SUPABASE_CLIENT`.
- Factory injects `ConfigService`, reads `SUPABASE_URL` and `SUPABASE_ANON_KEY`, calls `createClient(url, key, { auth: { persistSession: false } })`.
- `persistSession: false` is mandatory — this is a server-side client.

### 3b. `SupabaseGuard`

**File created:** `apps/opticv-be/src/app/auth/supabase.guard.ts`

- Implements `CanActivate`.
- Uses `inject()` for `SUPABASE_CLIENT` and `UsersService`.
- Steps:
  1. Extract `Authorization` header from request; if missing or not `Bearer …` → throw `UnauthorizedException`.
  2. Call `supabase.auth.getUser(token)` — if `error` or no `data.user` → throw `UnauthorizedException`.
  3. Destructure `id` (supabaseId) and `email` from `data.user`.
  4. Call `UsersService.upsertUser({ supabaseId, email })`.
  5. Assign the returned `User` to `request['user']`.
  6. Return `true`.

### 3c. `AuthModule`

**File created:** `apps/opticv-be/src/app/auth/auth.module.ts`

- Imports `UsersModule` (for `UsersService`).
- Provides `SupabaseClientProvider` and `SupabaseGuard`.
- Exports `SupabaseGuard` so other modules can apply it via `UseGuards`.

---

## Step 4 — Create `UsersModule` with `UsersService` and `UsersController`

### 4a. `UsersService`

**File created:** `apps/opticv-be/src/app/users/users.service.ts`

- Injected via `UsersModule` (not `providedIn: 'root'`).
- Injects `PrismaService` using `inject()`.
- Exports one public method:

```
upsertUser(data: { supabaseId: string; email: string }): Promise<User>
```

Implementation:
1. Run `prisma.$transaction(async (tx) => { ... })`.
2. Inside transaction:
   - `tx.user.upsert({ where: { supabaseId }, create: { supabaseId, email }, update: {} })`
   - `tx.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, tier: 'FREE', status: 'ACTIVE' }, update: {} })`
3. Return the `User` from step 2a.

### 4b. Webhook payload DTO

**File created:** `apps/opticv-be/src/app/users/dto/webhook-payload.dto.ts`

- Class with validation using `class-validator`:
  - `type: string`
  - `record: { id: string; email: string }` (nested DTO with `@IsObject`, `@IsString` on nested fields)
- Used in the controller with `ValidationPipe`.

### 4c. `UsersController`

**File created:** `apps/opticv-be/src/app/users/users.controller.ts`

- Route prefix: `users`
- One endpoint: `@Post('sync')`
- Steps:
  1. Read `x-webhook-secret` header. Compare to `ConfigService.get('SUPABASE_WEBHOOK_SECRET')` using `crypto.timingSafeEqual` (convert both to `Buffer.from(value, 'utf8')` before comparing; if lengths differ, reject immediately).
  2. If mismatch → throw `UnauthorizedException`.
  3. Validate body against `WebhookPayloadDto` via `ValidationPipe` — if invalid → `BadRequestException` (NestJS `ValidationPipe` handles this automatically when applied).
  4. Call `UsersService.upsertUser({ supabaseId: body.record.id, email: body.record.email })`.
  5. Return `{ received: true }` with `HttpStatus.OK`.

### 4d. `UsersModule`

**File created:** `apps/opticv-be/src/app/users/users.module.ts`

- Imports `PrismaModule`.
- Provides `UsersService` and `UsersController`.
- Exports `UsersService` (needed by `AuthModule`).

---

## Step 5 — Register modules in `AppModule`

**File modified:** `apps/opticv-be/src/app/app.module.ts`

- Import `UsersModule` and `AuthModule` into the `imports` array.

---

## Step 6 — Enable `ValidationPipe` globally (if not already set)

**File modified:** `apps/opticv-be/src/main.ts`

- Check whether `app.useGlobalPipes(new ValidationPipe({ whitelist: true }))` is already present.
- If not, add it. This ensures `WebhookPayloadDto` validation works on the `POST /api/users/sync` route.

---

## Step 7 — Install `class-validator` and `class-transformer` (if not present)

Before step 4b, verify both packages are in `package.json`. If missing, run:
```
npm install class-validator class-transformer
```
These are required by `ValidationPipe` with DTOs.

---

## Step 8 — Write unit tests

### 8a. `UsersService` tests

**File created:** `apps/opticv-be/src/app/users/users.service.spec.ts`

Test cases:
- Creates user + subscription when neither exists (mock `prisma.$transaction` — assert both upserts called).
- Is idempotent when user already exists (upsert `update: {}` — second call returns existing user).
- Transaction error propagates (mock `tx.user.upsert` throws — assert service rejects).

### 8b. `SupabaseGuard` tests

**File created:** `apps/opticv-be/src/app/auth/supabase.guard.spec.ts`

Test cases:
- Missing `Authorization` header → `UnauthorizedException`.
- Non-`Bearer` token format → `UnauthorizedException`.
- `supabase.auth.getUser` returns error → `UnauthorizedException`.
- Valid token, no User row → `upsertUser` called, `request.user` populated, returns `true`.
- Valid token, user row already exists → same result (upsert is a no-op in the service).

---

## File summary

### Created

| File | Purpose |
|------|---------|
| `apps/opticv-be/src/app/auth/auth.module.ts` | NestJS auth module |
| `apps/opticv-be/src/app/auth/supabase-client.provider.ts` | Supabase client factory provider |
| `apps/opticv-be/src/app/auth/supabase.guard.ts` | JWT guard with fallback upsert |
| `apps/opticv-be/src/app/auth/supabase.guard.spec.ts` | Guard unit tests |
| `apps/opticv-be/src/app/users/users.module.ts` | NestJS users module |
| `apps/opticv-be/src/app/users/users.service.ts` | Shared upsert logic |
| `apps/opticv-be/src/app/users/users.service.spec.ts` | Service unit tests |
| `apps/opticv-be/src/app/users/users.controller.ts` | POST /api/users/sync webhook handler |
| `apps/opticv-be/src/app/users/dto/webhook-payload.dto.ts` | Webhook body DTO |

### Modified

| File | Change |
|------|--------|
| `apps/opticv-be/config/env/development.env` | Add 3 Supabase env vars |
| `apps/opticv-be/config/env/production.env` | Add 3 Supabase env vars |
| `apps/opticv-be/config/validation.ts` | Add Joi rules for 3 new vars |
| `apps/opticv-be/src/app/app.module.ts` | Register `UsersModule` + `AuthModule` |
| `apps/opticv-be/src/main.ts` | Enable `ValidationPipe` globally (if missing) |

---

## Acceptance checklist

- [ ] `npm exec nx build opticv-be` passes
- [ ] `npm exec nx typecheck opticv-be` passes
- [ ] `npm exec nx test opticv-be` passes (all new tests green)
- [ ] `POST /api/users/sync` with valid secret + payload → `200 { received: true }`, User + Subscription rows in DB
- [ ] `POST /api/users/sync` with wrong secret → `401`
- [ ] `POST /api/users/sync` with missing `record.id` or `record.email` → `400`
- [ ] Protected route with valid JWT, no User row → row created, request proceeds
- [ ] Protected route with invalid JWT → `401`
- [ ] No regressions on existing endpoints
