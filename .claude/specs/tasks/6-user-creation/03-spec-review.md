# Specification Review — Task 6: Handle user creation on the backend

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification covers both paths described in the raw task (Supabase webhook + guard fallback), correctly scopes the work, and provides clear acceptance criteria. Two non-critical issues need addressing before implementation: an internal contradiction around webhook secret verification (simple string compare vs HMAC), and a gap in how the `subscription.upsert` identifies an existing subscription row (the `where` clause references `userId` but the Prisma schema uses an `id` primary key — the unique constraint field needs confirming). No invented requirements were found.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **Webhook secret verification contradiction (Scope vs Assumptions)**
   - The **Scope** section states: _"Webhook secret verification (HMAC signature check on the incoming webhook request)"_ — implying HMAC.
   - The **Assumptions** section states: _"Webhook secret verification uses a simple constant-time string comparison (no HMAC required unless Supabase supports it)"_ — implying plain string compare by default.
   - These two statements are in conflict. The implementation approach must be decided before coding begins. The spec should state one definitive method and remove the ambiguity.

2. **`subscription.upsert` `where` clause — unique constraint unclear**
   - The shared upsert block uses `where: { userId }` for `prisma.subscription.upsert`. For Prisma `upsert`, the `where` argument must reference a field that is `@unique` or a primary key.
   - The spec does not confirm whether `userId` is marked `@unique` in the Subscription model. If it is not (e.g., if multiple subscriptions per user are possible in the schema even though "only one is expected"), the upsert will fail at runtime. The spec should explicitly state that `Subscription.userId` is `@unique` (or reference the schema to confirm), or propose a different lookup strategy (e.g., `findFirst` + conditional `create`).

3. **`production.env` not mentioned for new env vars**
   - The env var table lists only `config/env/development.env`. The same three variables must also be added to `config/env/production.env` (and any other environment files). The spec should note this.

4. **`supabase-client.ts` — module ownership unclear**
   - The file is placed in `auth/` but is described as a "singleton Supabase client factory" shared with the guard. If `UsersService` also needs the Supabase client (e.g., for future use), its placement in `auth/` couples the users module to auth internals. This is a minor structural concern worth noting before implementation.

5. **No mention of `AppModule` registration**
   - The spec lists new files but does not mention that `UsersModule` and `AuthModule` must be imported into `AppModule`. A developer could miss this step. Acceptance criteria do not catch it explicitly (build passes even without registration in some setups).

---

### Unclear or Ambiguous Sections

- **Behavior → Primary path, step 2**: _"verifies the `x-webhook-secret` header"_ — it is not stated whether this is a raw header match or an HMAC-computed signature. See Non-Critical Issue #1.
- **Behavior → Upsert logic, `subscription.upsert`**: `where: { userId }` — validity depends on schema constraint not confirmed in spec. See Non-Critical Issue #2.
- **Assumptions**: _"supabase-js v2 is already installed or will be added"_ — "or will be added" leaves the dependency install step undefined. The spec should confirm whether it is present and, if not, state it must be installed before implementation.

---

### Invented or Unsupported Requirements

None.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|------------|---------------------------|
| 1 | Supabase webhook sends a standard `INSERT` event payload as documented | Yes |
| 2 | Webhook secret is verified via simple constant-time string compare (not HMAC) | Yes — but contradicts Scope section |
| 3 | `supabase-js` v2 is installed or will be added as a dependency | Yes — but left open-ended |
| 4 | `displayName` and `avatarUrl` are nullable and not populated at creation time | Yes |
| 5 | Only one `Subscription` row per user at any time | Yes |
| 6 | `Subscription.userId` is `@unique` (required for `prisma.subscription.upsert`) | **Not stated** — implicit, needs verification |
| 7 | `UsersModule` and `AuthModule` will be registered in `AppModule` | **Not stated** — implicit |
| 8 | New env vars apply to all environments (development + production) | **Not stated** — only development.env listed |

---

## Recommendation

**Revise specification** — resolve the HMAC vs string-compare contradiction, confirm the `Subscription.userId` unique constraint, and add `AppModule` registration + all-environment env var notes. Changes are minor; a targeted update to the Scope, Assumptions, and Data/API sections is sufficient before proceeding to implementation.
