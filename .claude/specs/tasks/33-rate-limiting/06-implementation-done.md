# Implementation Done

Task ID: 33-rate-limiting

---

## Summary

Rate limiting has been implemented across both backend and frontend. The backend registers four named throttlers (`api-ip`, `api-user`, `ai-ip`, `ai-user`) via `ThrottlerModule.forRootAsync()` with Redis storage. A global `ApiThrottlerGuard` enforces general API limits; `AiThrottlerGuard` is applied per-route on AI endpoints. A `ThrottlerExceptionFilter` handles 429 responses with a standardized body. The Angular frontend intercepts 429 responses via `rateLimitInterceptor` and shows a PrimeNG warn toast. Unit tests exist for all three new units.

---

## Specification Coverage

| Requirement | Status |
|---|---|
| Install `@nestjs/throttler` and `@nest-lab/throttler-storage-redis` | Implemented |
| `ThrottlerModule.forRootAsync()` with four named throttlers (`api-ip`, `api-user`, `ai-ip`, `ai-user`) | Implemented |
| Redis storage via `REDIS_HOST` / `REDIS_PORT` | Implemented |
| Global `ApiThrottlerGuard` registered as `APP_GUARD` | Implemented |
| `ApiThrottlerGuard` — IP bucket uses `request.ip` | Implemented |
| `ApiThrottlerGuard` — user bucket skipped when no user | Implemented |
| `ApiThrottlerGuard` — user bucket uses `request.user.id` | Implemented |
| `AiThrottlerGuard` — only processes `ai-*` throttlers | Implemented |
| `AiThrottlerGuard` — IP bucket uses `request.ip` | Implemented |
| `AiThrottlerGuard` — user bucket uses `request.user.id` | Implemented (with deviation — see Deviations) |
| `ThrottlerExceptionFilter` — catches `ThrottlerException` | Implemented |
| `ThrottlerExceptionFilter` — HTTP 429 + correct JSON body | Implemented |
| `ThrottlerExceptionFilter` — reads `Retry-After` from response headers | Implemented (with deviation — see Deviations) |
| `ThrottlerExceptionFilter` — `Retry-After` default fallback | Implemented (`DEFAULT_RETRY_AFTER = 900`) |
| Filter registered globally in `main.ts` | Implemented |
| `THROTTLER_*` env vars in `config/validation.ts` | Implemented (8 vars: 4 IP + 4 user) |
| Throttler config exposed via `configuration.ts` | Implemented |
| `development.env` — throttler defaults as commented-out reference | Not implemented (values present but uncommented — see Deviations) |
| `production.env` — throttler defaults as commented-out reference | Implemented |
| `@UseGuards(AiThrottlerGuard)` on `POST /cv/:id/extract` | Implemented |
| `@UseGuards(AiThrottlerGuard)` on `POST /optimizations/.../run` | Implemented |
| `@UseGuards(AiThrottlerGuard)` on `POST /optimizations/.../run/:promptType` | Implemented |
| `@SkipThrottle()` on SSE stream endpoint | Implemented |
| Frontend `rateLimitInterceptor` — catches 429 and shows warn toast | Implemented |
| Frontend interceptor — re-throws original error | Implemented |
| Frontend interceptor registered in `app.config.ts` | Implemented |
| Unit tests for `ApiThrottlerGuard` | Implemented (6 test cases) |
| Unit tests for `AiThrottlerGuard` | Implemented (5 test cases) |
| Unit tests for `rateLimitInterceptor` | Implemented (4 test cases) |

---

## Implemented Files

### New Files

| File | Purpose |
|---|---|
| `apps/opticv-be/src/app/throttler/api-throttler.guard.ts` | Global IP + user rate limit guard for API endpoints |
| `apps/opticv-be/src/app/throttler/api-throttler.guard.spec.ts` | Unit tests for `ApiThrottlerGuard` |
| `apps/opticv-be/src/app/throttler/ai-throttler.guard.ts` | Per-route IP + user rate limit guard for AI endpoints |
| `apps/opticv-be/src/app/throttler/ai-throttler.guard.spec.ts` | Unit tests for `AiThrottlerGuard` |
| `apps/opticv-be/src/app/throttler/throttler-exception.filter.ts` | Exception filter returning standardized 429 JSON body |
| `apps/opticv-web/src/app/core/interceptors/rate-limit-interceptor.ts` | Angular interceptor showing warn toast on 429 |
| `apps/opticv-web/src/app/core/interceptors/rate-limit-interceptor.spec.ts` | Unit tests for `rateLimitInterceptor` |

### Modified Files

| File | Change |
|---|---|
| `apps/opticv-be/src/app/app.module.ts` | Added `ThrottlerModule.forRootAsync()` with 4 throttlers and Redis storage; registered `ApiThrottlerGuard` as `APP_GUARD` |
| `apps/opticv-be/src/main.ts` | Registered `ThrottlerExceptionFilter` as global filter |
| `apps/opticv-be/config/configuration.ts` | Added `throttler` config key mapping 8 env vars with defaults |
| `apps/opticv-be/config/validation.ts` | Added Joi validation for 8 `THROTTLER_*` env vars |
| `apps/opticv-be/config/env/development.env` | Added 8 throttler env vars (uncommented) |
| `apps/opticv-be/config/env/production.env` | Added 8 throttler env vars (commented out as reference) |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | Added `@UseGuards(AiThrottlerGuard)` on `POST :id/extract` |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | Added `@UseGuards(AiThrottlerGuard)` on run endpoints; `@SkipThrottle()` on SSE stream |
| `apps/opticv-web/src/app/app.config.ts` | Registered `rateLimitInterceptor` in `withInterceptors()` |

---

## Implemented Components

| Plan Component | Status |
|---|---|
| `ApiThrottlerGuard` | Exists — `apps/opticv-be/src/app/throttler/api-throttler.guard.ts` |
| `AiThrottlerGuard` | Exists — `apps/opticv-be/src/app/throttler/ai-throttler.guard.ts` |
| `ThrottlerExceptionFilter` | Exists — `apps/opticv-be/src/app/throttler/throttler-exception.filter.ts` |
| `rateLimitInterceptor` | Exists — `apps/opticv-web/src/app/core/interceptors/rate-limit-interceptor.ts` |
| `ThrottlerModule` (4 named throttlers in `AppModule`) | Exists — `apps/opticv-be/src/app/app.module.ts` |

---

## Implemented Stores

No stores were planned or implemented for this task.

---

## Deviations from Plan

1. **`AiThrottlerGuard` `ai-user` fallback uses `'127.0.0.1'` instead of skipping.**
   Plan (Step 4, referencing spec and spec review issue #1) states: when `request.user` is absent, the user bucket should be skipped (`return true`). The `AiThrottlerGuard` instead falls back to `'127.0.0.1'` as the tracker key: `getTracker: async () => expressReq.user?.id ?? '127.0.0.1'`. In practice this is non-impactful at runtime because `SupabaseGuard` rejects unauthenticated requests before `AiThrottlerGuard` runs, but the guard logic diverges from the plan and from the `ApiThrottlerGuard` pattern.

2. **`throttler-exception.filter.ts` reads custom header names instead of standard `Retry-After`.**
   Plan (Step 6) specifies reading `response.getHeader('Retry-After')`. The implementation reads from four custom headers: `Retry-After-api-ip`, `Retry-After-api-user`, `Retry-After-ai-ip`, `Retry-After-ai-user`. The `@nestjs/throttler` base guard does not set these custom header names, so `retryAfter` always falls back to `DEFAULT_RETRY_AFTER = 900`. The 429 status and response body are otherwise correct.

3. **`development.env` — throttler vars are uncommented (active values).**
   Plan (Step 2) states to append a commented-out block with defaults. `production.env` follows this correctly. `development.env` has the same eight vars uncommented and active.

4. **No `throttler.module.ts` wrapper module created.**
   Intentional deviation documented in the implementation plan pre-implementation notes. `ThrottlerModule` is registered directly in `AppModule`.

5. **Frontend toast detail message is dynamic, not a fixed string.**
   Spec specified a fixed `detail` string (`'Please wait a moment before trying again.'`). Implementation computes a dynamic message showing the wait time in minutes from the `retryAfter` value: `'Please wait N minute(s) before trying again.'` This is a positive UX improvement beyond the spec.

---

## Extra Work

- **Swagger decorators on `CvController` AI endpoint** — `@ApiOperation`, `@ApiResponse` decorators on `POST :id/extract` were already in place; `@UseGuards(AiThrottlerGuard)` was added alongside them.
- **Dynamic `retryAfter` display in frontend toast** — Computes human-readable wait time in minutes from the `retryAfter` value returned in the 429 body, beyond what the spec required.
- **8 env vars instead of 6** — Spec mentioned 6 optional `THROTTLER_*` env vars. Implementation added 8 (separate TTL and limit for each of the 4 throttlers), which is consistent with the four-throttler architecture resolved in the spec review.
