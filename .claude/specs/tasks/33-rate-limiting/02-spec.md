# Task Specification

## Source

Azure DevOps Task: 33 — Rate Limiting

## Goal

Implement two independent rate-limiting tiers on the NestJS backend:

1. **General API rate limiting** — per-IP and per-user, applied to all authenticated endpoints.
2. **AI rate limiting** — per-IP and per-user, applied only to endpoints that internally invoke `OpenAiService` (CV extraction, optimization triggers).

Rate limit counters are stored in Redis (already provisioned for BullMQ). The Angular frontend shows a toast notification when a `429` response is received.

---

## Context

- Backend: NestJS 11 (`apps/opticv-be`), global prefix `/api`, Express adapter.
- Redis is configured via `REDIS_HOST` / `REDIS_PORT` env vars and already used by BullMQ.
- Authentication is handled by `SupabaseGuard` — all protected routes already have a resolved `user` object on `request.user`.
- IP is available on `request.ip` (Express).
- Frontend: Angular 21, PrimeNG `MessageService` (already provided globally in `app.config.ts`).

**AI-touching endpoints** (those that call `OpenAiService`):

| Method | Path | Module |
|--------|------|--------|
| `POST` | `/api/cv/:id/extract` | `CvModule` → `CvExtractionService` |
| `POST` | `/api/optimizations/job-applications/:id/run` | `OptimizationModule` |
| `POST` | `/api/optimizations/job-applications/:id/run/:promptType` | `OptimizationModule` |

**Pre-auth endpoints** (no `SupabaseGuard`):

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/auth/login` | OTP initiation (if/when implemented) |
| Any    | `/api/auth/verify` | OTP verification (if/when implemented) |

> Pre-auth routes do not currently exist in the codebase. The spec defines how to apply limits when they are added, but **no auth controller is created by this task**.

---

## Rate Limit Table

| Endpoint group | IP limit | User limit |
|---|---|---|
| Pre-auth (`/auth/*`) | 10 req / 15 min | — (no session yet) |
| Authenticated API (all others) | 300 req / 15 min | 100 req / 15 min |
| AI endpoints (`/cv/:id/extract`, `/optimizations/.../run`) | 50 req / hour | 10 req / hour |

All windows are sliding windows. When a limit is exceeded the response is HTTP `429`.

---

## Scope

### In scope

- Install and configure `@nestjs/throttler` with a Redis storage backend (`@nestjs/throttler-storage-redis`).
- Implement a **global guard** for general API + IP throttling (applied in `AppModule`).
- Implement a **custom `AiThrottlerGuard`** for AI-specific stricter limits (applied at controller method level via decorator).
- Custom `ThrottlerExceptionFilter` or override that returns the agreed 429 error body.
- Extend Joi validation schema and `configuration()` to accept optional `THROTTLER_*` env vars so limits can be tuned without a redeploy.
- Frontend: add a global HTTP interceptor (`rateLimitInterceptor`) that catches 429 responses and shows a PrimeNG toast.
- Unit tests for the guard logic (mocked Redis storage).

### Out of scope

- Pre-auth controller / auth routes (not yet implemented).
- Per-endpoint granularity beyond the two tiers (general vs AI).
- Rate limit dashboards or admin overrides.
- Distributed tracing or alerting on limit breaches.
- Frontend retry logic (show toast only, no automatic retry).

---

## Behavior

### Backend — setup

1. Install packages:
   - `@nestjs/throttler` (NestJS official throttler)
   - `@nestjs/throttler-storage-redis` (Redis storage adapter, uses the same `ioredis` connection BullMQ uses)

2. Register `ThrottlerModule.forRootAsync()` in `AppModule` with two named throttlers:
   - `"api"` — ttl: 15 min (900 s), limit: 300 (IP-level default; user-level enforced in guard)
   - `"ai"` — ttl: 3600 s, limit: 50 (IP-level default; user-level enforced in guard)
   - Storage: Redis via `REDIS_HOST` / `REDIS_PORT` (same credentials as BullMQ).

3. Create `apps/opticv-be/src/app/throttler/throttler.module.ts` that exports the configured `ThrottlerModule` — import this into `AppModule`.

### Backend — general throttler guard

4. Create `apps/opticv-be/src/app/throttler/api-throttler.guard.ts`:
   - Extends `ThrottlerGuard`.
   - Overrides `getTracker()`: returns `IP` for the IP bucket, `userId` for the user bucket (reads `request.user?.id` when available).
   - Applies both the `"api"` throttler by IP and (when a user is present) the `"api"` throttler by user ID with limit 100 / 900 s.
   - Register as a global guard in `AppModule` providers: `{ provide: APP_GUARD, useClass: ApiThrottlerGuard }`.

5. Apply `@SkipThrottle()` to any endpoint that must be excluded (e.g., SSE stream endpoint `GET /optimizations/.../stream` — streaming connections should not be throttled per-request).

### Backend — AI throttler guard

6. Create `apps/opticv-be/src/app/throttler/ai-throttler.guard.ts`:
   - Extends `ThrottlerGuard`.
   - Uses the `"ai"` named throttler.
   - IP limit: 50 / hour. User limit: 10 / hour.
   - Tracker key format: `ai_ip_{ip}` and `ai_user_{userId}`.

7. Apply `@UseGuards(AiThrottlerGuard)` to the three AI endpoints listed above.

### Backend — 429 error body

8. Create `apps/opticv-be/src/app/throttler/throttler-exception.filter.ts`:
   - Implements `ExceptionFilter`, catches `ThrottlerException`.
   - Returns:
     ```json
     {
       "statusCode": 429,
       "message": "Too many requests. Please wait before trying again.",
       "error": "Too Many Requests",
       "retryAfter": <seconds_until_window_resets>
     }
     ```
   - Sets `Retry-After` response header to the same value.
   - Register as a global filter in `main.ts`.

### Backend — env vars

9. Add to `config/validation.ts` (all optional with defaults matching the table above):
   ```
   THROTTLER_API_TTL         default 900
   THROTTLER_API_LIMIT_IP    default 300
   THROTTLER_API_LIMIT_USER  default 100
   THROTTLER_AI_TTL          default 3600
   THROTTLER_AI_LIMIT_IP     default 50
   THROTTLER_AI_LIMIT_USER   default 10
   ```

10. Add to `config/configuration.ts` so values are accessible via `ConfigService`.

### Frontend — 429 interceptor

11. Create `apps/opticv-web/src/app/core/interceptors/rate-limit-interceptor.ts`:
    - `HttpInterceptorFn`.
    - Catches HTTP errors where `status === 429`.
    - Injects `MessageService` and calls `messageService.add({ severity: 'warn', summary: 'Too many requests', detail: 'Please wait a moment before trying again.', life: 5000 })`.
    - Re-throws the error so calling code can still react.

12. Register `rateLimitInterceptor` in `app.config.ts` alongside `authInterceptor`.

---

## Edge Cases

- **Unauthenticated requests to protected routes**: `SupabaseGuard` rejects them with 401 before the throttler user-bucket check runs — no user-bucket decrement happens.
- **SSE stream endpoint** (`GET /optimizations/.../stream`): decorated with `@SkipThrottle()` to avoid throttling a long-lived connection.
- **Redis unavailable**: `@nestjs/throttler-storage-redis` should be configured to fail open (allow the request) rather than hard-fail — verify the library's behavior and add a note/comment if a fallback is needed.
- **Concurrent identical requests**: Redis atomic increment ensures correctness under concurrency.
- **`retryAfter` calculation**: derive from the TTL of the active throttler window. If the library does not expose it directly, default to the full window TTL.

---

## Data / API

No database schema changes.

**New env vars** (all optional, see defaults above):
```
THROTTLER_API_TTL
THROTTLER_API_LIMIT_IP
THROTTLER_API_LIMIT_USER
THROTTLER_AI_TTL
THROTTLER_AI_LIMIT_IP
THROTTLER_AI_LIMIT_USER
```

Add these to `apps/opticv-be/config/env/development.env` and `production.env` (commented-out with defaults as reference).

**New backend files:**
```
apps/opticv-be/src/app/throttler/
  throttler.module.ts
  api-throttler.guard.ts
  ai-throttler.guard.ts
  throttler-exception.filter.ts
  api-throttler.guard.spec.ts
  ai-throttler.guard.spec.ts
```

**New frontend files:**
```
apps/opticv-web/src/app/core/interceptors/
  rate-limit-interceptor.ts
  rate-limit-interceptor.spec.ts
```

**Modified files:**
```
apps/opticv-be/src/app/app.module.ts          — import ThrottlerModule, register APP_GUARD
apps/opticv-be/src/main.ts                    — register ThrottlerExceptionFilter globally
apps/opticv-be/config/validation.ts           — add THROTTLER_* vars
apps/opticv-be/config/configuration.ts        — expose throttler config
apps/opticv-be/config/env/development.env     — add commented throttler defaults
apps/opticv-be/config/env/production.env      — add commented throttler defaults
apps/opticv-be/src/app/cv/cv.controller.ts    — @UseGuards(AiThrottlerGuard) on extractCv
apps/opticv-be/src/app/optimization/optimization.controller.ts — @UseGuards(AiThrottlerGuard) on run endpoints, @SkipThrottle() on stream
apps/opticv-web/src/app/app.config.ts         — register rateLimitInterceptor
```

---

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-be` and `npm exec nx build opticv-web`).
- Typecheck passes (`npm exec nx run-many -t typecheck`).
- Unit tests added for `ApiThrottlerGuard` and `AiThrottlerGuard` with mocked Redis storage; tests pass.
- Unit test added for `rateLimitInterceptor`; passes.
- Hitting an AI endpoint more than 10 times in an hour with the same user returns 429 with the specified body on the 11th request.
- Hitting a general API endpoint more than 100 times in 15 min with the same user returns 429.
- A 429 response in the Angular app shows a PrimeNG warn toast.
- `Retry-After` header is present on all 429 responses.
- No breaking changes to existing endpoints or response shapes.
- Lint passes (`npm exec nx run-many -t lint`).
