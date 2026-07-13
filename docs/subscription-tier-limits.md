# Subscription Tier Limits — Implementation Plan

## Context

OptiCV will offer three subscription tiers — **FREE**, **BASIC**, **PRO** — each with monthly caps on AI features, a cap on stored CVs, and restricted CV template access. Today the app has the _scaffolding_ for subscriptions (a `Subscription` model defaulted to `FREE`/`ACTIVE`, surfaced on the settings page) but **no enforcement logic whatsoever**: no usage counters, no quota checks, no tier gating. Every authenticated action runs unbounded (only IP/time rate-throttling exists).

This plan adds the missing pieces: corrected tier enum, per-feature monthly quota counters, enforcement at the backend chokepoints, and frontend gating/visibility so users understand their limits and remaining usage.

### Target limits (monthly, per tier)

| Feature                               | FREE                   | BASIC | PRO |
| ------------------------------------- | ---------------------- | ----- | --- |
| CV optimization runs                  | 1                      | 10    | 30  |
| Cover letter generations              | 1                      | 10    | 30  |
| Interview prep generations            | 1                      | 10    | 30  |
| LinkedIn profile content              | 0 (not offered)        | 10    | 30  |
| CV templates                          | default + classic only | all   | all |
| Stored CV documents (active, at once) | 2                      | 10    | 20  |

### Decisions locked with the user

- **Full run → separate features.** Today `triggerOptimization` fires all 7 `PromptType`s at once. We **decouple**: a "CV optimization run" consumes only the CV prompt types (RESUME_AUTOPSY, KEYWORD_GAP, SUMMARY_REWRITE, BULLET_UPGRADE). Cover letter, interview prep, and LinkedIn become their own separately-triggered features, each consuming its own quota.
- **Reset window = subscription billing period, with calendar-month fallback.** Paid users with real Stripe `currentPeriodStart/End` use those; when null (all FREE users today), fall back to the 1st-of-calendar-month → now window.
- **Counting source = new `UsageQuota` counter table** (per-user, per-feature, per-period), incremented on each successful action. Not derived from `UsageLog` (which is per-job token accounting and doesn't map 1:1 to user-facing runs).
- **CV storage cap = FREE 2 / BASIC 10 / PRO 20** active documents.
- **Template gating = frontend-only** (templates are a client-side export concept; no backend template model). Gate the selector by tier from the user profile.

---

## Part 1 — Shared types & tier config (single source of truth)

**`packages/shared/datatypes/src/lib/datatypes.ts`**

- Change `SubscriptionTier` from `'FREE' | 'PRO' | 'PRO_ANNUAL' | 'SPRINT'` → `'FREE' | 'BASIC' | 'PRO'`.
- Add a `LimitedFeature` type: `'CV_OPTIMIZATION' | 'COVER_LETTER' | 'INTERVIEW_PREP' | 'LINKEDIN'`.
- Add a `TIER_LIMITS` config object mapping each tier → per-feature monthly caps + `maxStoredCvs` + allowed template ids. This is the **single source of truth** consumed by both backend enforcement and frontend gating/display. Example shape:
  ```ts
  export const TIER_LIMITS: Record<SubscriptionTier, {
    features: Record<LimitedFeature, number>;   // monthly cap; 0 = not offered
    maxStoredCvs: number;
    allowedTemplates: 'ALL' | CvTemplateId[];
  }> = { ... }
  ```
- Add a `QuotaStatus` type for the usage endpoint response (per feature: `used`, `limit`, `remaining`, `resetsAt`).
- **Rebuild the library** (`npm exec nx build datatypes`) — apps depend on the compiled output.

> Note: `CvTemplateId` currently lives frontend-only (`cv-templates.ts`). Either import a minimal template-id union into datatypes, or keep `allowedTemplates` as `'ALL' | string[]` in the shared config and let the frontend map to `CvTemplateId`. Prefer the latter to avoid moving frontend concerns into shared types.

---

## Part 2 — Database schema (Prisma)

**`apps/opticv-be/prisma/schema.prisma`**

1. Update the `SubscriptionTier` enum: replace `PRO_ANNUAL`, `SPRINT` with `BASIC` (keep `FREE`, `PRO`, add `BASIC`).
2. Add a `UsageQuota` counter model:

   ```prisma
   model UsageQuota {
     id           String        @id @default(uuid())
     userId       String
     user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
     feature      LimitedFeature
     periodStart  DateTime      // start of the counting window this row belongs to
     count        Int           @default(0)
     updatedAt    DateTime      @updatedAt

     @@unique([userId, feature, periodStart])
     @@index([userId, periodStart])
     @@map("usage_quotas")
   }

   enum LimitedFeature {
     CV_OPTIMIZATION
     COVER_LETTER
     INTERVIEW_PREP
     LINKEDIN
   }
   ```

   Add `usageQuotas UsageQuota[]` to the `User` model.

3. **Migration considerations (important):** the enum change is destructive if any existing rows use `PRO_ANNUAL`/`SPRINT`. Since billing isn't wired up, all rows are almost certainly `FREE` — but the migration must handle it. Approach: write a migration that (a) maps any `PRO_ANNUAL`/`SPRINT` → `PRO`, then (b) alters the enum. Prisma may need a manual SQL migration for the enum-value rename (Postgres can't drop an enum value in use). Generate with `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma` and review the SQL before applying.
4. Regenerate the client: `npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma` (outputs to `apps/opticv-be/src/generated/prisma/`).

Update the Swagger enum in **`apps/opticv-be/src/app/users/dto/user-profile.dto.ts:2-6`** to `['FREE', 'BASIC', 'PRO']`.

---

## Part 3 — Backend: quota service & enforcement

### New `QuotaService`

Create **`apps/opticv-be/src/app/quota/quota.service.ts`** (+ `quota.module.ts`, exporting the service; import `PrismaModule`). Responsibilities:

- `resolvePeriodStart(subscription)` — returns `currentPeriodStart` if set, else the 1st of the current calendar month. (Compute in one place so all checks agree.)
- `checkAndConsume(userId, feature, tier, subscription)` — the atomic guard:
  1. Look up the tier's limit from `TIER_LIMITS`. If `0`, throw `ForbiddenException` (feature not available on this tier — e.g. LinkedIn on FREE).
  2. Upsert/read the `UsageQuota` row for `(userId, feature, periodStart)`.
  3. If `count >= limit`, throw a `ForbiddenException` / `429`-style error carrying a machine-readable code (e.g. `QUOTA_EXCEEDED`) and `{ feature, limit, resetsAt }` so the frontend can show a precise message.
  4. Otherwise atomically increment. Use a transaction / `updateMany` with a `count < limit` WHERE guard to avoid race double-spend, or Prisma `$transaction` with the unique constraint.
- `getQuotaStatus(userId, tier, subscription)` — returns `QuotaStatus[]` for all features (used, limit, remaining, resetsAt) for the usage endpoint / frontend display.

> **Consume on success, not on enqueue.** Because runs are async (BullMQ), decide policy: reserve-then-refund-on-failure, or increment only after the job succeeds. Simplest correct approach: **check availability at trigger time (reject if no quota), and increment the counter at trigger time** (a queued+failed job is a rare edge; optionally add refund-on-terminal-failure later). Document this choice in the service.

### Enforce at the chokepoints

**`apps/opticv-be/src/app/optimization/optimization.service.ts`** — inject `QuotaService`.

- Decouple `triggerOptimization`: split `ALL_PROMPT_TYPES` into the **CV-optimization subset** (`RESUME_AUTOPSY, KEYWORD_GAP, SUMMARY_REWRITE, BULLET_UPGRADE`) vs. the standalone features. `triggerOptimization` should enqueue **only the CV subset** and call `checkAndConsume(userId, 'CV_OPTIMIZATION', ...)` once.
- `triggerSingleJob` — map the incoming `PromptType` → `LimitedFeature` (`COVER_LETTER→COVER_LETTER`, `INTERVIEW_PREP→INTERVIEW_PREP`, `LINKEDIN_REWRITE→LINKEDIN`; the four CV subset types → `CV_OPTIMIZATION`) and call `checkAndConsume` before enqueuing.
- The controller methods in `optimization.controller.ts` already pass `userId` (from `@CurrentUser()`); they need the tier/subscription too — load it via the service or pass through. Ensure the guard-attached `request.user` or a fresh subscription lookup provides `tier` + billing period.

**`apps/opticv-be/src/app/cv/cv.service.ts`** — in `uploadCv(file, userId)` (line 38), before creating the `CvDocument`: count active docs (`cvDocument.count({ where: { userId, isActive: true } })`), compare against `TIER_LIMITS[tier].maxStoredCvs`, throw `ForbiddenException` with a `CV_LIMIT_EXCEEDED` code if at cap. Needs the user's tier — inject a subscription lookup.

### Usage endpoint

Add `GET users/me/usage` (or extend `users/me`) in **`apps/opticv-be/src/app/users/users.controller.ts`** / `users.service.ts` returning `QuotaStatus[]` + `maxStoredCvs`/`storedCvsUsed`, so the frontend can display "X of Y used, resets on <date>".

---

## Part 4 — Frontend: gating & visibility

### Tier config access

Consume `TIER_LIMITS` and the user's `subscription.tier` (already on `UserProfile`, fetched via `user-settings-api.service.ts` → `users/me`) to drive gating. Consider a small `TierService`/computed signal exposing the current tier's limits.

### Template gating

**`apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts`** and `cv-templates.ts`:

- Compute allowed templates from `TIER_LIMITS[tier].allowedTemplates` (FREE → `['default','classic']`; BASIC/PRO → all).
- Render locked templates as disabled with an "upgrade to unlock" affordance. Ensure the default `selectedTemplate` signal (`cv-optimization.ts:210`) never lands on a locked template for FREE users.

### Usage display & quota errors

- Add a usage/quota panel (e.g. on the settings page `settings.html:39-57` alongside the existing tier badge, and/or near the optimization trigger) showing per-feature remaining counts from `GET users/me/usage`.
- Handle the backend `QUOTA_EXCEEDED` / `CV_LIMIT_EXCEEDED` errors with a clear message + upgrade prompt. The existing `rate-limit-interceptor.ts` handles 429s; add handling for the quota error shape (or reuse a similar interceptor/toast).

### Tests to update

- `apps/opticv-web/src/app/features/settings/settings.spec.ts:16` references `tier: 'FREE'` — still valid, but add coverage for BASIC/PRO gating.

---

## Part 5 — Things to consider before/while implementing (answers to "what else?")

1. **Feature availability vs. quota=0.** LinkedIn is _not offered_ on FREE (limit 0). Treat "not available on tier" distinctly from "quota exhausted" in error messaging (upsell to a plan that _has_ it vs. wait for reset).
2. **Async run accounting.** Runs are queued (BullMQ). Decide consume-on-trigger vs. consume-on-success and whether failed jobs refund quota (see QuotaService note). Start simple (consume on trigger), document it.
3. **Race conditions / double-spend.** Two concurrent requests could both pass the check. Use an atomic conditional increment (`updateMany` with `count < limit`) or a transaction with the unique constraint.
4. **Re-running an existing optimization.** `triggerOptimization`/`triggerSingleJob` currently _upsert_ results (re-run overwrites). Decide whether a re-run consumes a fresh quota unit (recommended: yes — it's a new AI call and cost) and make that explicit in UX.
5. **Migration safety.** The enum change (`PRO_ANNUAL`/`SPRINT` → removed) is destructive in Postgres. Map existing rows first; review generated SQL. Keep the three declarations (shared TS type, Prisma enum, DTO Swagger list) in sync.
6. **Existing throttling stays.** Tier quotas are orthogonal to the IP/time `AiThrottlerGuard`/`ApiThrottlerGuard` — keep both; they solve different problems (abuse-per-second vs. monthly fair-use).
7. **Deleting a CV frees a storage slot.** Since the cap is on _active_ docs, `DELETE cv/:id` (and `isActive` toggling) naturally frees capacity — confirm the count query uses `isActive: true`.
8. **Downgrade behavior.** A user on PRO with 15 stored CVs who downgrades to FREE (cap 2) will be over-limit. Decide policy: block new uploads until under cap (recommended, simplest) — no forced deletion.
9. **No billing yet.** Tiers can only change via manual DB edit until Stripe is wired. This plan is billing-agnostic; the billing-period reset logic is already forward-compatible with Stripe fields.
10. **Admin/testing.** Consider a way to reset or bump a user's quota for QA (e.g. a seed script or admin-only endpoint) — optional but useful.

---

## Verification

1. **Types build:** `npm exec nx build datatypes` then `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web` — confirm the new enum/config compiles everywhere the old values were referenced.
2. **Migration:** run `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma` against a dev DB; inspect `usage_quotas` table and the altered enum via `npm exec prisma studio`.
3. **Backend unit tests:** add specs for `QuotaService` (limit reached → throws; increment; period rollover across month boundary; billing-period vs calendar fallback; LinkedIn-on-FREE → forbidden). Run `npm exec nx test opticv-be`.
4. **End-to-end manual (dev):** start `npm run start-be:dev` + `npm exec nx serve opticv-web`. As a FREE user: run 1 CV optimization (succeeds) → attempt a 2nd in the same month (blocked with clear message); attempt LinkedIn (blocked as unavailable); confirm only `default`/`classic` templates selectable; upload 2 CVs (ok) → 3rd blocked. Flip the user's `Subscription.tier` to `BASIC`/`PRO` in Prisma Studio and confirm limits expand and all templates unlock.
5. **Usage endpoint:** hit `GET users/me/usage` and confirm `used/limit/remaining/resetsAt` reflect actions taken; confirm the settings page displays them.
6. **Race check (optional):** fire concurrent trigger requests at the FREE cap and confirm only the allowed number succeed (no double-spend).
7. **Lint** `npm exec nx run-many -t lint`
