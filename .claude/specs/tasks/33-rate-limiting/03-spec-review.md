# Specification Review

Task ID: 33-rate-limiting
Reviewed file: `.claude/specs/tasks/33-rate-limiting/02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured, covers all explicit task requirements (per-user and per-IP rate limiting on both API and AI calls), and incorporates clarified values correctly. However, there are a few ambiguous implementation details around how `@nestjs/throttler` handles dual-bucket (IP + user) throttling within a single guard, the guard execution order relative to `SupabaseGuard`, and an unresolved `retryAfter` calculation. These gaps could cause implementation guesswork and should be addressed before coding begins.

---

### Findings

#### Critical Issues

1. **Guard ordering undefined — `SupabaseGuard` vs `ApiThrottlerGuard`** (Section: "Backend — general throttler guard", step 4)
   The spec states the IP-bucket check runs before user identity is known, but does not specify the execution order between `SupabaseGuard` and `ApiThrottlerGuard`. If `ApiThrottlerGuard` is registered as `APP_GUARD` and `SupabaseGuard` is applied at controller level, the global guard runs *before* `SupabaseGuard`, meaning `request.user` will be `undefined` during the global guard's user-bucket check for authenticated routes. The spec says "when a user is present" but does not explicitly address this ordering problem or how to resolve it (e.g., make the global guard skip user-bucket when no user is set, or reorder guards).

2. **Dual-bucket mechanism underspecified** (Section: "Backend — general throttler guard", step 4)
   The spec says `ApiThrottlerGuard` applies both an IP bucket and a user bucket for the same `"api"` throttler, but `@nestjs/throttler`'s `ThrottlerGuard.handleRequest()` calls one tracker per throttler instance. It is not specified *how* both limits are checked in a single guard pass — whether `handleRequest()` is called twice with different tracker keys, or whether a custom `handleRequest()` override iterates two keys. Without this detail an implementer would need to guess the internal mechanism.

3. **`retryAfter` value source unresolved** (Section: "Backend — 429 error body", step 8)
   The spec notes: *"If the library does not expose it directly, default to the full window TTL."* This is left open. Since this value goes into the HTTP response body and `Retry-After` header (which clients may rely on), the spec should either confirm which field from the throttler exception carries the remaining window time, or explicitly prescribe the fallback. Leaving it to the implementer introduces inconsistency.

---

#### Non-Critical Issues

4. **`throttler.module.ts` wrapper may be unnecessary** (Section: "Backend — setup", step 3)
   The spec creates a separate `ThrottlerModule` wrapper solely to import `ThrottlerModule.forRootAsync()` and re-export it into `AppModule`. In practice, `ThrottlerModule.forRootAsync()` is typically registered directly in `AppModule`. The wrapper adds a file without a clear benefit. Not a blocker, but worth confirming intent.

5. **Pre-auth limit is specified but unenforceable by this task** (Section: "Rate Limit Table")
   The 10 req / 15 min IP limit for pre-auth endpoints is documented, but the routes don't exist yet (acknowledged in the spec). There is no mechanism described for *how* this limit will be applied when those routes are eventually added — e.g., a dedicated guard, a route-level decorator, or a separate throttler config. This could cause confusion when the auth routes are implemented.

6. **`@SkipThrottle()` on SSE stream only mentioned once** (Section: "Backend — AI throttler guard", step 5 and modified files)
   The SSE stream endpoint is mentioned in the general throttler section but not in the AI guard section. Since `AiThrottlerGuard` is applied with `@UseGuards()` at the method level, not globally, the stream endpoint is not in scope for the AI guard anyway. The reference is slightly misleading — it should clarify that `@SkipThrottle()` is only needed to exempt the stream from the *global* `ApiThrottlerGuard`.

7. **`@nestjs/throttler-storage-redis` uses `ioredis`** — spec says it "uses the same ioredis connection BullMQ uses" but does not specify whether a shared `ioredis` instance is created and injected, or whether a second connection is opened. BullMQ (via `@nestjs/bullmq`) manages its own connection pool. A second connection to Redis is harmless but the phrasing implies sharing, which would require additional wiring not described.

8. **Missing `Toast` component in frontend template** (Section: "Frontend — 429 interceptor", step 11)
   The spec calls `MessageService.add()`, but PrimeNG toasts require a `<p-toast>` component to be present in the DOM. The spec does not mention where this component should be placed (e.g., in the root `app.ts` template). If it is already present, this should be confirmed; if not, it is a missing step.

---

#### Unclear or Ambiguous Sections

- **"Backend — general throttler guard", step 4** — The phrase *"Applies both the `"api"` throttler by IP and (when a user is present) the `"api"` throttler by user ID with limit 100 / 900 s"* is ambiguous. It is unclear whether this is two separate throttler entries in the module config (one named `"api-ip"`, one `"api-user"`), or one throttler entry with a guard that runs the check twice with different keys. The distinction matters for implementation.

- **"Edge Cases — Redis unavailable"** — *"verify the library's behavior and add a note/comment if a fallback is needed"* defers a decision to the implementer. This is an operational edge case that should be decided in the spec (fail open vs fail closed), not during implementation.

---

#### Invented or Unsupported Requirements

- **`THROTTLER_*` env vars and `configuration.ts` extension** — Not explicitly requested in the original task or clarification answers. The task only says to implement rate limiting with agreed defaults. Making limits env-configurable is a reasonable extension, but it is an addition not confirmed by the user.
  *(Low risk — beneficial, but technically unsupported by the stated task requirements.)*

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | `@nestjs/throttler` with `@nestjs/throttler-storage-redis` is the implementation library of choice | Yes (Scope, step 1) |
| 2 | Redis is already available and configured (same instance as BullMQ) | Yes (Context) |
| 3 | Sliding window semantics are used (not fixed window) | Yes (Rate Limit Table note) |
| 4 | `request.ip` is populated correctly by Express (no proxy/load-balancer IP spoofing concern) | No — not stated |
| 5 | `MessageService` is already globally provided and a `<p-toast>` outlet exists in the frontend | Partially — `MessageService` confirmed in Context, `<p-toast>` not mentioned |
| 6 | The SSE stream endpoint should not be throttled at all (not just exempt from the AI guard) | Yes (Edge Cases) |
| 7 | The global `ApiThrottlerGuard` should fail open (allow request) when no user is present on the request, rather than rejecting it | Implicit — not explicitly stated |
| 8 | `@nestjs/throttler-storage-redis` is compatible with the existing `ioredis`/BullMQ Redis version in the project | No — not verified |
| 9 | AI endpoints are exclusively those identified in the Context table; no new AI endpoints exist or will be added during this task | Yes (Scope) |
| 10 | A second Redis connection (separate from BullMQ's) is acceptable | No — "same ioredis connection" wording implies sharing but mechanism unspecified |

---

### Recommendation

**Revise specification** — address Critical Issues 1, 2, and 3 before implementation starts. Issues 1 and 2 in particular will directly block a correct implementation of the guard. Issue 3 (retryAfter) should be resolved to avoid an inconsistent `Retry-After` header. The non-critical issues (4–8) and assumption gaps (4, 8, 10) are worth a short clarification pass but do not block a start.
