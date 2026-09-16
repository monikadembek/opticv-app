# Implementation Plan

Task ID: 33-rate-limiting

## Pre-implementation notes (resolving spec review critical issues)

**Critical Issue 1 — Guard ordering:**
`APP_GUARD` always runs before controller-level guards. Since `SupabaseGuard` is applied at the controller level, `request.user` will be `undefined` when the global `ApiThrottlerGuard` runs for authenticated routes. Resolution: the global guard checks the IP bucket unconditionally, and only checks the user bucket when `request.user?.id` is present. No error is thrown when user is absent — this is the intended fail-open behaviour for the user bucket.

**Critical Issue 2 — Dual-bucket mechanism:**
`@nestjs/throttler` v6 supports multiple named throttlers in a single `ThrottlerModule` config. A guard iterates all configured throttlers and calls `handleRequest()` once per throttler. To get two independent limits (IP and user) we define **two named throttlers per tier**: `"api-ip"` (IP limit) and `"api-user"` (user limit). The guard overrides `getTracker()` to return the appropriate key per throttler name. When the throttler name ends with `-user` and no user is present, the guard skips that throttler (returns without decrementing).

**Critical Issue 3 — `retryAfter` value:**
`ThrottlerException` does not expose TTL directly. The guard sets `Retry-After` response headers before throwing. In the custom exception filter, `retryAfter` in the response body will be derived from the `Retry-After` response header that was already set by the guard. If the header is absent, fall back to the throttler TTL in seconds.

**Non-critical issue 4 — `throttler.module.ts` wrapper:**
Skipped — `ThrottlerModule.forRootAsync()` is registered directly in `AppModule`. No wrapper module is created.

**Non-critical issue 8 — `<p-toast>` presence:**
Confirmed: `<p-toast position="bottom-right" />` is already in `app.html` and `ToastModule` is imported in `app.ts`. No change needed to the root component.

**Redis storage package:**
The correct package is `@nest-lab/throttler-storage-redis` (not `@nestjs/throttler-storage-redis`). It creates its own `ioredis` connection — this is acceptable; a separate connection from BullMQ's pool is harmless.

---

## Step-by-step implementation

---

### Step 1 — Install packages

```
npm install @nestjs/throttler @nest-lab/throttler-storage-redis
```

No additional `ioredis` install needed — it is already a transitive dependency via `@nestjs/bullmq`.

---

### Step 2 — Extend config validation and configuration factory

**File: `apps/opticv-be/config/validation.ts`**

Add six optional Joi fields after the existing entries:

```
THROTTLER_API_IP_TTL        Joi.number().default(900)
THROTTLER_API_IP_LIMIT      Joi.number().default(300)
THROTTLER_API_USER_TTL      Joi.number().default(900)
THROTTLER_API_USER_LIMIT    Joi.number().default(100)
THROTTLER_AI_IP_TTL         Joi.number().default(3600)
THROTTLER_AI_IP_LIMIT       Joi.number().default(50)
THROTTLER_AI_USER_TTL       Joi.number().default(3600)
THROTTLER_AI_USER_LIMIT     Joi.number().default(10)
```

**File: `apps/opticv-be/config/configuration.ts`**

Extend the returned object with a `throttler` key:

```typescript
throttler: {
  apiIpTtl:      parseInt(process.env.THROTTLER_API_IP_TTL   || '900',  10),
  apiIpLimit:    parseInt(process.env.THROTTLER_API_IP_LIMIT  || '300',  10),
  apiUserTtl:    parseInt(process.env.THROTTLER_API_USER_TTL  || '900',  10),
  apiUserLimit:  parseInt(process.env.THROTTLER_API_USER_LIMIT || '100', 10),
  aiIpTtl:       parseInt(process.env.THROTTLER_AI_IP_TTL     || '3600', 10),
  aiIpLimit:     parseInt(process.env.THROTTLER_AI_IP_LIMIT   || '50',   10),
  aiUserTtl:     parseInt(process.env.THROTTLER_AI_USER_TTL   || '3600', 10),
  aiUserLimit:   parseInt(process.env.THROTTLER_AI_USER_LIMIT  || '10',  10),
}
```

**Files: `apps/opticv-be/config/env/development.env` and `production.env`**

Append commented-out block at the bottom of each file:

```
# Rate limiting (optional — these are the defaults)
# THROTTLER_API_IP_TTL=900
# THROTTLER_API_IP_LIMIT=300
# THROTTLER_API_USER_TTL=900
# THROTTLER_API_USER_LIMIT=100
# THROTTLER_AI_IP_TTL=3600
# THROTTLER_AI_IP_LIMIT=50
# THROTTLER_AI_USER_TTL=3600
# THROTTLER_AI_USER_LIMIT=10
```

---

### Step 3 — Register ThrottlerModule in AppModule

**File: `apps/opticv-be/src/app/app.module.ts`**

Add `ThrottlerModule.forRootAsync()` to the `imports` array. It must be async so it can read values from `ConfigService`.

Configuration:
- `storage`: `new ThrottlerStorageRedisService({ host, port })` constructed using `REDIS_HOST` and `REDIS_PORT` from `ConfigService`.
- `throttlers` array with four named entries:
  - `{ name: 'api-ip',   ttl: config.throttler.apiIpTtl,   limit: config.throttler.apiIpLimit   }`
  - `{ name: 'api-user', ttl: config.throttler.apiUserTtl,  limit: config.throttler.apiUserLimit  }`
  - `{ name: 'ai-ip',    ttl: config.throttler.aiIpTtl,    limit: config.throttler.aiIpLimit    }`
  - `{ name: 'ai-user',  ttl: config.throttler.aiUserTtl,   limit: config.throttler.aiUserLimit   }`

Also add to `providers`:
```typescript
{ provide: APP_GUARD, useClass: ApiThrottlerGuard }
```

Imports needed: `ThrottlerModule` from `@nestjs/throttler`, `ThrottlerStorageRedisService` from `@nest-lab/throttler-storage-redis`, `APP_GUARD` from `@nestjs/core`, `ApiThrottlerGuard` from the guard file (Step 4).

---

### Step 4 — Create ApiThrottlerGuard

**File: `apps/opticv-be/src/app/throttler/api-throttler.guard.ts`**

- Class `ApiThrottlerGuard` extends `ThrottlerGuard`.
- Inject `Reflector` and `ThrottlerStorage` via `inject()`.
- Override `getTracker(req: Request): Promise<string>`:
  - If the active throttler name ends with `-user`: return `request.user?.id ?? ''`. An empty string causes the guard to produce a unique-enough key that won't collide, but the real mechanism is handled in `handleRequest`.
  - If the active throttler name ends with `-ip`: return `request.ip ?? '127.0.0.1'`.
  - Because `@nestjs/throttler` v6 calls `handleRequest` per throttler (not `getTracker` independently), we override `handleRequest` instead (see below).

- Override `handleRequest(requestProps)`:
  - Extract `throttler.name` from `requestProps`.
  - If `throttler.name` ends with `-user`:
    - If `request.user?.id` is falsy → return `true` (skip, no user to rate-limit yet).
    - Otherwise set tracker to `request.user.id` and proceed with the standard throttler check.
  - If `throttler.name` ends with `-ip`:
    - Set tracker to `request.ip`.
    - Proceed with the standard throttler check.
  - Delegate to parent `handleRequest` after setting the correct key via the storage service directly, or call `super.handleRequest()` with a patched tracker.

  Implementation note: `ThrottlerGuard.handleRequest()` in v6 accepts a `ThrottlerRequest` object that includes `blockDuration`, `limit`, `ttl`, `throttler`, `key`, `storage`, `generateKey`. Override by calling `super.handleRequest({ ...requestProps, key: computedKey })` where `computedKey` is built as `throttlerName + '-' + trackerValue`.

- Override `getRequestResponse(context)` to extract the raw Express `Request` and `Response` objects.

---

### Step 5 — Create AiThrottlerGuard

**File: `apps/opticv-be/src/app/throttler/ai-throttler.guard.ts`**

- Class `AiThrottlerGuard` extends `ThrottlerGuard`.
- Same `handleRequest` override pattern as `ApiThrottlerGuard`.
- Only processes throttler names `"ai-ip"` and `"ai-user"`.
- For `"ai-ip"`: tracker = `request.ip`.
- For `"ai-user"`: tracker = `request.user.id` (user is guaranteed present because `SupabaseGuard` runs before this method-level guard on the same request... wait — see note below).

  **Ordering note for AI guard:** `AiThrottlerGuard` is applied via `@UseGuards()` at the method level on endpoints that also have the class-level `@UseGuards(SupabaseGuard)`. NestJS processes method-level `@UseGuards` **after** class-level guards in the decorator chain, meaning `SupabaseGuard` runs before `AiThrottlerGuard`. By the time `AiThrottlerGuard` is invoked, `request.user` is populated. Safe to use directly.

  However, the global `ApiThrottlerGuard` still runs first (before `SupabaseGuard`). For AI endpoints this means three guards run in order: `ApiThrottlerGuard` (global) → `SupabaseGuard` (class) → `AiThrottlerGuard` (method). The AI endpoint therefore gets checked against both the general API limit and the AI limit. This is intentional and correct.

- Apply `@SkipThrottle({ 'api-ip': true, 'api-user': true })` decorator on `AiThrottlerGuard` class or on the method — no, that won't work. The AI guard should only process `"ai-*"` throttlers; it ignores `"api-*"` by checking the throttler name in `handleRequest` and returning `true` for any throttler name not prefixed `"ai-"`.

---

### Step 6 — Create ThrottlerExceptionFilter

**File: `apps/opticv-be/src/app/throttler/throttler-exception.filter.ts`**

- Implements `ExceptionFilter<ThrottlerException>`.
- Decorated with `@Catch(ThrottlerException)`.
- In `catch(exception, host)`:
  1. Get `Response` from `host.switchToHttp().getResponse()`.
  2. Read the `Retry-After` header already set by the guard on the response: `response.getHeader('Retry-After')`.
  3. Parse to a number; if absent or not a number, default to `900` (the shortest configured TTL).
  4. Set status 429 on the response.
  5. Send JSON body:
     ```json
     {
       "statusCode": 429,
       "message": "Too many requests. Please wait before trying again.",
       "error": "Too Many Requests",
       "retryAfter": <number>
     }
     ```

**File: `apps/opticv-be/src/main.ts`**

Register globally after `ValidationPipe`:
```typescript
app.useGlobalFilters(new ThrottlerExceptionFilter());
```

---

### Step 7 — Apply guards and skip decorators to controllers

**File: `apps/opticv-be/src/app/cv/cv.controller.ts`**

- Import `AiThrottlerGuard` and `UseGuards`.
- Add `@UseGuards(AiThrottlerGuard)` to the `extractCv` method only.

**File: `apps/opticv-be/src/app/optimization/optimization.controller.ts`**

- Import `AiThrottlerGuard`, `UseGuards`, `SkipThrottle`.
- Add `@UseGuards(AiThrottlerGuard)` to `triggerOptimization` and `triggerSingleJob` methods.
- Add `@SkipThrottle({ 'api-ip': true, 'api-user': true })` to `streamOptimization` method to exempt the SSE endpoint from the global `ApiThrottlerGuard`. (The AI guard is not applied here, so no additional decorator needed for it.)

---

### Step 8 — Frontend: create rateLimitInterceptor

**File: `apps/opticv-web/src/app/core/interceptors/rate-limit-interceptor.ts`**

- `HttpInterceptorFn`.
- Uses `catchError` from `rxjs/operators`.
- Injects `MessageService` from `primeng/api`.
- Checks `error instanceof HttpErrorResponse && error.status === 429`.
- Calls `messageService.add({ severity: 'warn', summary: 'Too many requests', detail: 'Please wait a moment before trying again.', life: 5000 })`.
- Re-throws the original error with `throwError(() => error)`.

**File: `apps/opticv-web/src/app/app.config.ts`**

- Import `rateLimitInterceptor`.
- Add it to the `withInterceptors([authInterceptor, rateLimitInterceptor])` array.

`<p-toast>` is already present in `app.html` and `ToastModule` is imported in `app.ts` — no changes needed there.

---

### Step 9 — Unit tests

**File: `apps/opticv-be/src/app/throttler/api-throttler.guard.spec.ts`**

Test cases:
- IP bucket is checked with `request.ip` as tracker key.
- User bucket is skipped (returns `true`) when `request.user` is absent.
- User bucket is checked with `request.user.id` as tracker key when user is present.
- A `ThrottlerException` is thrown when the storage reports limit exceeded.
- Use a mock `ThrottlerStorage` that can be configured to return exceeded state.

**File: `apps/opticv-be/src/app/throttler/ai-throttler.guard.spec.ts`**

Test cases:
- AI IP bucket is checked with `request.ip`.
- AI user bucket is checked with `request.user.id`.
- Non-AI throttler names (`"api-ip"`, `"api-user"`) are skipped by the guard (returns `true`).
- `ThrottlerException` is thrown when AI limits are exceeded.

**File: `apps/opticv-web/src/app/core/interceptors/rate-limit-interceptor.spec.ts`**

Test cases:
- 429 response triggers `MessageService.add()` with correct severity and summary.
- Non-429 HTTP errors are re-thrown without calling `MessageService`.
- The original error is always re-thrown (interceptor does not swallow errors).

---

## Files created

```
apps/opticv-be/src/app/throttler/api-throttler.guard.ts
apps/opticv-be/src/app/throttler/api-throttler.guard.spec.ts
apps/opticv-be/src/app/throttler/ai-throttler.guard.ts
apps/opticv-be/src/app/throttler/ai-throttler.guard.spec.ts
apps/opticv-be/src/app/throttler/throttler-exception.filter.ts
apps/opticv-web/src/app/core/interceptors/rate-limit-interceptor.ts
apps/opticv-web/src/app/core/interceptors/rate-limit-interceptor.spec.ts
```

## Files modified

```
apps/opticv-be/src/app/app.module.ts
apps/opticv-be/src/main.ts
apps/opticv-be/config/validation.ts
apps/opticv-be/config/configuration.ts
apps/opticv-be/config/env/development.env
apps/opticv-be/config/env/production.env
apps/opticv-be/src/app/cv/cv.controller.ts
apps/opticv-be/src/app/optimization/optimization.controller.ts
apps/opticv-web/src/app/app.config.ts
```

## Packages installed

```
@nestjs/throttler
@nest-lab/throttler-storage-redis
```

---

## Acceptance checklist

- [ ] `npm exec nx build opticv-be` passes
- [ ] `npm exec nx build opticv-web` passes
- [ ] `npm exec nx run-many -t typecheck` passes
- [ ] `npm exec nx run-many -t lint` passes
- [ ] `npm exec nx run-many -t test` passes (all new specs green)
- [ ] 11th AI endpoint call within 1 hour (same user) → HTTP 429 with correct JSON body
- [ ] 101st general API call within 15 min (same user) → HTTP 429
- [ ] 301st general API call within 15 min (same IP) → HTTP 429
- [ ] 429 response in Angular app shows PrimeNG warn toast
- [ ] `Retry-After` header present on all 429 responses
- [ ] SSE stream endpoint (`GET /api/optimizations/.../stream`) is not throttled
- [ ] No existing endpoint response shapes changed
