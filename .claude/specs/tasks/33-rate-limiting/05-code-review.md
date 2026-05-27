# Code Review

Task ID: 33-rate-limiting

Reviewer: Claude Code (senior fullstack peer review)

---

## Summary

- **Overall result: PASS WITH ISSUES**
- The implementation correctly delivers all required rate-limiting tiers, global guard registration, AI endpoint decoration, SSE skip-throttle exemption, exception filter, env-var configuration, and the Angular 429 interceptor. Tests exist for all new units. Two non-critical but noteworthy issues exist: (1) the `development.env` throttler values are committed as uncommented live values rather than commented-out defaults as required by the spec and plan, and (2) `AiThrottlerGuard` falls back to `'127.0.0.1'` as the tracker key when `request.user?.id` is absent for the `ai-user` throttler, which silently conflates unauthenticated requests under a single key rather than skipping the bucket. There are no blocking correctness bugs.

---

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **`apps/opticv-be/config/env/development.env` lines 16–24 — throttler values are not commented out.**
   The spec (§ Data/API) and implementation plan (Step 2) explicitly state: *"Append commented-out block … Add these to `development.env` and `production.env` (commented-out with defaults as reference)."* `production.env` correctly uses hash-comments. `development.env` has the same eight vars **uncommented** (active). This is inconsistent with the stated intent and means any CI pipeline with a freshly-cloned repo inheriting dev env values gets the live defaults baked in rather than the Joi defaults. Low risk in practice, but the spec is unambiguous.

2. **`apps/opticv-be/src/app/throttler/ai-throttler.guard.ts` line 26 — wrong fallback for `ai-user` tracker.**
   ```typescript
   getTracker: async () => expressReq.user?.id ?? '127.0.0.1',
   ```
   When `request.user` is absent the tracker becomes `'127.0.0.1'`, which is the same value used by the IP bucket. All anonymous requests to AI endpoints would consume the AI-user bucket under a shared IP-like key. The spec and plan both say the user bucket should be skipped (return `true`) when no user is present — matching how `ApiThrottlerGuard` handles the `api-user` case (`if (!expressReq.user?.id) return true`). This discrepancy is unlikely to cause real issues at runtime because `SupabaseGuard` rejects unauthenticated requests to AI endpoints before `AiThrottlerGuard` runs (as noted in the plan), but the guard logic is still semantically wrong and diverges from both the spec and the `ApiThrottlerGuard` pattern without justification.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Install `@nestjs/throttler` and `@nest-lab/throttler-storage-redis` | Covered | Confirmed in `package.json` diff |
| `ThrottlerModule.forRootAsync()` with four named throttlers (`api-ip`, `api-user`, `ai-ip`, `ai-user`) | Covered | `app.module.ts` lines 36–66 |
| Redis storage via `REDIS_HOST` / `REDIS_PORT` | Covered | `app.module.ts` line 39–41 |
| Global `ApiThrottlerGuard` registered as `APP_GUARD` | Covered | `app.module.ts` line 77 |
| `ApiThrottlerGuard` — IP bucket uses `request.ip` | Covered | `api-throttler.guard.ts` lines 26–31 |
| `ApiThrottlerGuard` — user bucket skipped when no user | Covered | `api-throttler.guard.ts` lines 17–19 |
| `ApiThrottlerGuard` — user bucket uses `request.user.id` | Covered | `api-throttler.guard.ts` lines 20–23 |
| `AiThrottlerGuard` — only processes `ai-*` throttlers | Covered | `ai-throttler.guard.ts` returns `true` for all other names |
| `AiThrottlerGuard` — IP bucket uses `request.ip` | Covered | `ai-throttler.guard.ts` lines 16–20 |
| `AiThrottlerGuard` — user bucket uses `request.user.id` | Partial | Correct key used, but fails-open with `'127.0.0.1'` instead of skipping when user absent (see Non-Critical #2) |
| `ThrottlerExceptionFilter` — catches `ThrottlerException` | Covered | `throttler-exception.filter.ts` |
| `ThrottlerExceptionFilter` — HTTP 429 + correct JSON body | Covered | `throttler-exception.filter.ts` lines 31–36 |
| `ThrottlerExceptionFilter` — `Retry-After` header read from response | Covered | Filter reads from named `Retry-After-*` headers |
| `ThrottlerExceptionFilter` — `Retry-After` default of `900` | Covered | `DEFAULT_RETRY_AFTER = 900` constant |
| Filter registered globally in `main.ts` | Covered | `main.ts` line 34 |
| Six `THROTTLER_*` env vars in `config/validation.ts` | Covered | Eight vars (four IP + four user) added |
| Throttler config exposed via `configuration.ts` | Covered | `configuration.ts` lines 4–13 |
| `development.env` — throttler defaults as commented-out reference | Partial | Values are present but uncommented (see Non-Critical #1) |
| `production.env` — throttler defaults as commented-out reference | Covered | Correctly commented out |
| `@UseGuards(AiThrottlerGuard)` on `POST /cv/:id/extract` | Covered | `cv.controller.ts` line 119 |
| `@UseGuards(AiThrottlerGuard)` on `POST /optimizations/.../run` | Covered | `optimization.controller.ts` lines 59, 82 |
| `@SkipThrottle()` on SSE stream endpoint | Covered | `optimization.controller.ts` line 156 |
| Frontend `rateLimitInterceptor` — catches 429 and shows toast | Covered | `rate-limit-interceptor.ts` |
| Frontend interceptor — re-throws original error | Covered | `rate-limit-interceptor.ts` line 24 |
| Frontend interceptor registered in `app.config.ts` | Covered | `app.config.ts` line 28 |
| Unit tests for `ApiThrottlerGuard` | Covered | `api-throttler.guard.spec.ts` — 6 test cases |
| Unit tests for `AiThrottlerGuard` | Covered | `ai-throttler.guard.spec.ts` — 5 test cases |
| Unit tests for `rateLimitInterceptor` | Covered | `rate-limit-interceptor.spec.ts` — 4 test cases |
| `@SkipThrottle()` on pre-auth endpoints (when added) | Covered | Not applicable yet; spec notes this is out of scope |

---

## Plan Deviations

1. **`throttler-exception.filter.ts` — custom header names instead of `Retry-After`.**
   The plan (Step 6) says to read `response.getHeader('Retry-After')`. The implementation instead reads from four named headers: `Retry-After-api-ip`, `Retry-After-api-user`, `Retry-After-ai-ip`, `Retry-After-ai-user`. This implies the guards are expected to set these custom headers (not the standard `Retry-After` header). Looking at the guards (`api-throttler.guard.ts`, `ai-throttler.guard.ts`), neither guard explicitly sets any `Retry-After` header — the parent `ThrottlerGuard` base class does this automatically. The base class sets `Retry-After` using internal naming conventions from `@nestjs/throttler`. This means the custom header names may never match what the guard sets, so `retryAfter` will always fall back to `DEFAULT_RETRY_AFTER = 900`. This is a plan deviation that also affects correctness of the `retryAfter` field in the response body; however, the fallback value is reasonable and the 429 status + message are still correct.

2. **`development.env` — throttler values not commented out (see Non-Critical #1 above).**
   The plan explicitly says to append a commented-out block. `production.env` follows this; `development.env` does not.

3. **No `throttler.module.ts` wrapper module created.**
   The plan explicitly documents this as a deliberate skip (Non-critical issue 4 in pre-implementation notes). Not a deviation — intentional.

---

## Null Safety Issues

1. **`apps/opticv-be/src/app/app.module.ts` lines 46–63 — non-null assertions on `ConfigService.get()`.**
   `config.get<number>('throttler.apiIpTtl')!` etc. use non-null assertion on each throttler config value. Since all eight values have Joi defaults (and `parseInt` fallbacks in `configuration.ts`), `undefined` should not occur at runtime, but the type-level null assertion is redundant when the config factory already provides defaults. Low severity — this is a common NestJS pattern when using `ConfigService` with nested keys.

2. **`apps/opticv-be/src/app/throttler/ai-throttler.guard.ts` line 26 — `'127.0.0.1'` fallback for missing user ID (also listed under Non-Critical above).**
   If somehow `AiThrottlerGuard` is reached without a user (e.g., if the controller-level `SupabaseGuard` is bypassed or order changes), anonymous requests are counted against the `ai-user` bucket using `'127.0.0.1'` as the key, which contaminates the IP-based bucket key space.

---

## Code Smells

1. **`throttler-exception.filter.ts` lines 5–10 — `RETRY_AFTER_HEADERS` constant names are opaque and likely incorrect.**
   The array of four custom header names (`Retry-After-api-ip`, etc.) is searching for headers that the library does not appear to set. The standard `Retry-After` header (set by `ThrottlerGuard` base class) will never be found in this list. This creates a silent always-fallback for `retryAfter`. A comment explaining the header-naming convention expected from the guard would clarify intent — or the implementation should use the actual header name the base class sets.

2. **`api-throttler.guard.spec.ts` lines 38–46 — direct internal property mutation in test setup.**
   ```typescript
   (guard as unknown as { throttlers: unknown[]; ... }).throttlers = [...]
   ```
   The test manually patches internal `throttlers` and `commonOptions` properties. This couples tests tightly to the private internals of `ThrottlerGuard`. While acceptable in a test context where the parent class cannot be cleanly mocked, a brief comment explaining _why_ this is necessary (the guard does not expose these via constructor or DI) would aid future maintainers. Same pattern in `ai-throttler.guard.spec.ts`.

3. **`rate-limit-interceptor.ts` lines 12–19 — enhanced toast detail is a good addition, but the spec specified a fixed string.**
   The spec (§ Frontend – 429 interceptor) states the exact `detail` string: `'Please wait a moment before trying again.'`. The implementation instead computes a dynamic message from `retryAfter` (`'Please wait N minute(s) before trying again.'`). This is a _positive_ deviation (better UX), but worth noting so the reviewer is aware this was a deliberate improvement beyond the spec.

---

## Recommendation

**Fix critical issues before merge** — though there are no blocking correctness bugs, the two non-critical issues are worth resolving before merge:

- **Priority 1:** Fix `AiThrottlerGuard` `ai-user` fallback from `'127.0.0.1'` to `return true` when `request.user?.id` is absent, to match the `ApiThrottlerGuard` pattern and the spec's intent.
- **Priority 2:** Comment out the throttler vars in `development.env` to match the spec, or leave them active with an explicit note in a code comment explaining the intentional deviation.

The `retryAfter` header reading in the exception filter is also worth investigating to confirm whether the values are actually flowing through, but this does not block functionality.
