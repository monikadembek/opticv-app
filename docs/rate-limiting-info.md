# Rate Limiting — Concepts & Design Decisions

## What is rate limiting?

Rate limiting controls how many requests a user or IP address can make to your API within a given time window.

**Per-IP rate limiting** — limits requests from a single IP address (e.g., max 100 requests/minute from any one IP). Protects against bots and unauthenticated abuse.

**Per-user rate limiting** — limits requests from a specific authenticated user account (e.g., max 50 AI optimizations/hour per user). Controls costs and fair usage.

### Why it matters for OptiCV

OptiCV calls AI (LLM) to optimize CVs. Those calls cost money. Without rate limiting:

- A single malicious user could spam the endpoint and run up a huge AI bill in minutes
- A bug in the frontend (e.g., infinite retry loop) could accidentally do the same
- Competitors or bots could scrape AI features for free
- One heavy user degrades performance for everyone else

### The two layers

| Layer | Why |
|---|---|
| **API calls** (all endpoints) | Prevent abuse, DDoS protection, server stability |
| **AI calls** (CV optimization endpoints) | Cost control — each AI call costs real money |

### Example limits for OptiCV

- **Per-IP:** 200 requests/15 minutes on all routes
- **Per-user AI:** 10 CV optimizations/hour, 50/day

---

## Should per-IP limiting apply to all requests or only pre-auth endpoints?

### Option 1: Per-IP on pre-auth endpoints only

Apply IP limiting only to `/api/auth/*` (login, OTP verification).

**Protects against:** OTP brute-forcing, account enumeration, spam signups.

**Doesn't protect against:** A compromised/free account being used to hammer AI endpoints.

**Downside of skipping authenticated routes:** No safety net if someone creates many accounts to bypass per-user limits.

### Option 2: Per-IP on all routes

Every request, authenticated or not, counts against the IP's quota.

**Downside:** Shared IPs (offices, universities, mobile NAT) can cause false positives.

### Recommended approach: both, tuned differently

| Endpoint type | IP limit | User limit |
|---|---|---|
| Pre-auth (`/login`, `/verify`) | Strict (e.g., 10 req/15 min) | — |
| Authenticated API | Loose (e.g., 300 req/15 min) | Moderate (e.g., 100 req/15 min) |
| AI optimization endpoints | Loose IP (e.g., 50/hour) | Strict user (e.g., 10/hour) |

The IP limit on authenticated routes acts as a **safety net** with a high threshold — it only triggers for genuine abuse, not normal usage. The per-user limit is the primary control for authenticated users.

---

## Storage backend for rate limit counters

The counter tracks "user X has made N requests in the last hour." It needs to be stored somewhere.

### In-memory store

Counter lives inside the NestJS process RAM.

**Pros:** Zero setup, works out of the box with `@nestjs/throttler`.

**Cons:**
- Each server instance has its own counter — if you run 2 servers, a user can make 2× the limit by alternating between them
- Counters reset every time the server restarts (deploy, crash)
- Doesn't scale horizontally

### Redis store

Counters stored in Redis, shared across all server instances.

**Pros:**
- All instances share the same counters — limits enforced correctly regardless of how many instances run
- Survives server restarts
- Production-grade

**Cons:** Requires a Redis connection and the `@nestjs/throttler-storage-redis` package

### Decision for OptiCV

**Use Redis** — BullModule already connects to Redis, so there is no new infrastructure, no extra cost, and minimal extra code. In-memory breaks rate limiting silently when the server restarts or scales out.

---

## Response when limit is exceeded

### The HTTP 429 standard

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json
```

`Retry-After: 60` tells the client "wait 60 seconds before trying again." Every HTTP client, browser, and API tool understands this.

### Why the response body shape matters

The Angular frontend's HTTP error interceptor reads a specific field (e.g., `message`, `error`) to show the user a toast/alert. If the 429 response has a different shape than other errors, the frontend might display a generic error instead of a helpful message.

### Recommended response body for OptiCV

Match the existing NestJS error shape and add a user-friendly message:

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please wait before trying again.",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

This keeps frontend error handling consistent without special-casing 429s.

---

## Code Walkthrough — Q&A

### `ApiThrottlerGuard` (`api-throttler.guard.ts`)

A custom NestJS rate-limiting guard that extends the built-in `ThrottlerGuard` from `@nestjs/throttler`. It controls how many requests a client can make within a time window.

The guard overrides `handleRequest()`, which is called for every incoming request. The logic branches on the **throttler's name** — meaning different rules can apply depending on which named throttler is in play:

**`'api-user'` throttler (per authenticated user)**
- If the request has an authenticated user, it tracks by `user.id` — so each user gets their own independent rate limit bucket.
- If there's no user (unauthenticated request), it **skips** the limit entirely (`return true`).

**`'api-ip'` throttler (per IP address)**
- Tracks by IP address — every IP gets its own bucket.
- Falls back to `'127.0.0.1'` if `req.ip` is somehow undefined.

**Default (anything else)**
- For any unrecognised throttler name, the request passes through freely.

**Why two throttlers?**

The dual strategy gives protection at two levels:

| Throttler | Tracks by | Protects against |
|-----------|-----------|------------------|
| `api-user` | User ID | Authenticated users hammering the API |
| `api-ip` | IP address | Unauthenticated/anonymous abuse (bots, credential stuffing) |

---

### `AiThrottlerGuard` (`ai-throttler.guard.ts`)

A custom rate-limiting guard specifically for AI endpoints (e.g. the CV optimization routes that call an LLM). Like `ApiThrottlerGuard`, it extends NestJS's built-in `ThrottlerGuard` and overrides `handleRequest()`.

**`'ai-ip'` throttler (per IP address)**
- Tracks requests by IP address.
- Falls back to `'127.0.0.1'` if the IP is unavailable.

**`'ai-user'` throttler (per authenticated user)**
- Tracks requests by user ID.
- Falls back to `'127.0.0.1'` if there's no authenticated user — meaning unauthenticated requests are still throttled (all share one bucket), unlike `ApiThrottlerGuard` which skips them entirely.

**Key difference vs `ApiThrottlerGuard`:**

| Feature | `ApiThrottlerGuard` | `AiThrottlerGuard` |
|---|---|---|
| Throttler names | `api-user`, `api-ip` | `ai-user`, `ai-ip` |
| Unauthenticated `*-user` request | Skips throttling (`return true`) | Falls back to `'127.0.0.1'` (still throttled) |

The `AiThrottlerGuard` does not skip unauthenticated requests because LLM calls are expensive and must be guarded even against anonymous traffic.

---

### `handleRequest()` method

`handleRequest()` is a method from NestJS's `ThrottlerGuard` that is called automatically for every incoming HTTP request to decide whether that request should be allowed or blocked.

**Its job:** "Has this client made too many requests recently? If yes — block it (throw a `429 Too Many Requests`). If no — allow it and count this request."

**What it receives — `ThrottlerRequest`:**
- `context` — the NestJS execution context (gives access to the raw `req`/`res` objects)
- `throttler` — the throttler config being applied (includes `name`, `limit`, `ttl`)
- `getTracker` — a function that returns the tracking key (e.g. a user ID or IP) used to identify who is making the request
- `storage` — the backend where hit counts are stored (Redis in this project)

**What it returns:**
- `true` — request is allowed, proceed normally
- throws `ThrottlerException` — request is blocked, NestJS returns a `429` response

Both guards override `handleRequest()` to control the tracking key before delegating to the parent by injecting a custom `getTracker`.

**Flow summary:**
```
Incoming request
      ↓
handleRequest() called
      ↓
Which throttler name? (ai-user / ai-ip / api-user / api-ip)
      ↓
Determine tracker key (user ID or IP)
      ↓
super.handleRequest() checks storage:
  - hits within TTL window < limit? → allow (true)
  - hits within TTL window ≥ limit? → throw 429
```

---

### `ThrottlerExceptionFilter` (`throttler-exception.filter.ts`)

A NestJS exception filter that intercepts `ThrottlerException` (the `429` error) and formats the response into a clean, consistent JSON structure with a `retryAfter` value.

**How it's triggered:** The `@Catch(ThrottlerException)` decorator means this filter only activates when a `ThrottlerException` is thrown — i.e. when a rate limit is exceeded.

**What it does:**
1. Gets the Express `Response` object from the execution context
2. Tries to find a `Retry-After-*` header on the response
3. Sends a structured `429` JSON response with a `retryAfter` value

**How the `Retry-After` headers get there:**

The four possible headers are:
- `Retry-After-api-ip`
- `Retry-After-api-user`
- `Retry-After-ai-ip`
- `Retry-After-ai-user`

These headers are **automatically set by `@nestjs/throttler`** on the response object when a request hits the rate limit. For each named throttler, the library writes a corresponding `Retry-After-<name>` header containing the number of seconds the client must wait before retrying.

Flow:
```
Request hits rate limit
        ↓
@nestjs/throttler sets e.g. "Retry-After-ai-user: 743" on the response
        ↓
ThrottlerException is thrown
        ↓
ThrottlerExceptionFilter.catch() is called
        ↓
Filter reads the header → retryAfter = 743
```

The filter iterates through the four possible headers in order, uses the first valid numeric value found, and falls back to **900 seconds (15 minutes)** if none are present.

**Response sent to the client:**
```json
{
  "statusCode": 429,
  "message": "Too many requests. Please wait before trying again.",
  "error": "Too Many Requests",
  "retryAfter": 743
}
```

---

### `@SkipThrottle({ 'api-ip': true, 'api-user': true })`

A NestJS decorator from `@nestjs/throttler` that tells the throttler to skip (bypass) rate limiting for specific named throttlers on a controller or route.

It selectively disables only those two throttlers — any other throttlers (like `ai-ip`, `ai-user`) still apply normally.

| Scenario | Which throttlers apply |
|---|---|
| Regular controller (no decorator) | `api-ip` + `api-user` |
| `@SkipThrottle({ 'api-ip': true, 'api-user': true })` + `AiThrottlerGuard` | `ai-ip` + `ai-user` only |
| `@SkipThrottle()` (no args) | None — all throttlers skipped |

Used on the `OptimizationController` because those endpoints have their own dedicated `AiThrottlerGuard` — you don't want the generic API throttlers to also kick in on top.

---

### `{ provide: APP_GUARD, useClass: ApiThrottlerGuard }` — Why not also register `AiThrottlerGuard` here?

`APP_GUARD` is a NestJS token that registers a guard **globally** — it applies to every single route in the application automatically, without needing `@UseGuards()` on each controller.

**`AiThrottlerGuard` is intentionally NOT registered here.** It is applied locally on the `OptimizationController` only via `@UseGuards(AiThrottlerGuard)`, because `ai-ip`/`ai-user` throttlers are meant to be stricter limits specifically for expensive LLM calls. Adding it as a global `APP_GUARD` would incorrectly run it on every route in the app.

**The full picture:**
```
Every route
    ↓
ApiThrottlerGuard (global) → checks api-ip + api-user limits

Optimization routes only
    ↓
ApiThrottlerGuard → skipped via @SkipThrottle({ 'api-ip': true, 'api-user': true })
AiThrottlerGuard (local) → checks ai-ip + ai-user limits
```

This gives general API protection everywhere and stricter AI-specific protection only where it's needed.
