# Implementation Plan

## Source

Task 108 — Sync billing periods to Stripe (and give FREE tier a real cycle)
Derived from `02-spec.md` (review: PASS, `03-spec-review.md`).

## Execution Order

Steps are ordered so each step's dependencies are already in place (dependency installed → pure helper module → cron → quota signature change → callers → frontend → migration last, applied after code is stable).

---

### Step 1 — Add `@nestjs/schedule` dependency

- Install `@nestjs/schedule` into `apps/opticv-be/package.json` (confirmed not currently present).
- Run install so lockfile is updated before any code references it (Order-of-operations rule: install first).

---

### Step 2 — Create `SubscriptionModule` / `SubscriptionService`

**New file:** `apps/opticv-be/src/app/subscription/subscription.service.ts`

- `@Injectable()` class `SubscriptionService`, no constructor dependencies (pure functions only).
- `addOneUtcMonth(date: Date): Date` — returns `new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()))`.
- `freeTierCycleFrom(now: Date = new Date()): { currentPeriodStart: Date; currentPeriodEnd: Date }` — returns `{ currentPeriodStart: now, currentPeriodEnd: this.addOneUtcMonth(now) }`.

**New file:** `apps/opticv-be/src/app/subscription/subscription.service.spec.ts`

- Test `addOneUtcMonth`:
  - Ordinary mid-month date advances by exactly one calendar month, same day/time.
  - Jan 31 → Feb 28 (non-leap year) and Feb 29 (leap year), verifying `Date.UTC` day-overflow rollover behavior is accounted for (spec calls out this edge case explicitly — assert exact expected date, including the case where overflow rolls into March if `Date.UTC` normalizes rather than clamps).
- Test `freeTierCycleFrom`:
  - `currentPeriodStart` equals the passed-in `now`.
  - `currentPeriodEnd` equals `addOneUtcMonth(now)`.
  - Default parameter (`new Date()`) is used when no arg passed (fake timers or injected clock to assert).

**New file:** `apps/opticv-be/src/app/subscription/subscription.module.ts`

- `imports: [PrismaModule]`
- `providers: [SubscriptionService, FreeTierRenewalCron]`
- `exports: [SubscriptionService]`

---

### Step 3 — Create `FreeTierRenewalCron`

**New file:** `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.ts`

- `@Injectable()` class `FreeTierRenewalCron`, constructor injects `PrismaService` and `SubscriptionService`.
- Method `advanceExpiredFreeTierPeriods(): Promise<void>` decorated `@Cron(CronExpression.EVERY_DAY_AT_2AM)`.
- Query: `prisma.subscription.findMany({ where: { tier: 'FREE', currentPeriodEnd: { lte: now } }, select: { id: true, currentPeriodStart: true, currentPeriodEnd: true } })`.
- For each row: loop advancing `start`/`end` one UTC month at a time via `subscriptionService.addOneUtcMonth` until `end > now`, then `prisma.subscription.update({ where: { id }, data: { currentPeriodStart: start, currentPeriodEnd: end } })`.
- Guard: rows with `currentPeriodStart`/`currentPeriodEnd` null are not expected post-backfill, but the query already filters `currentPeriodEnd: { lte: now }` so a null value is excluded by Prisma's comparison semantics (null never satisfies `lte`) — no separate null-check required in the loop body since the where clause already excludes them.

**New file:** `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.spec.ts`

Mock `PrismaService.subscription.findMany`/`update`, mock `SubscriptionService.addOneUtcMonth` (or use the real implementation for deterministic date math), and cover:
- No expired rows → `findMany` called, `update` never called.
- Single-month rollover: one expired row, `end` advances exactly one month past the original `currentPeriodEnd`, `update` called once with expected dates.
- Multi-month rollover: row inactive for 3+ months, loop advances through multiple cycles until `end > now`, final persisted `end` is in the future relative to `now`.
- Confirms the Prisma `where` filter passed to `findMany` includes `tier: 'FREE'` (paid-row exclusion is enforced at the query level — assert the query args, not row-level filtering logic).

---

### Step 4 — Register `SubscriptionModule` and `ScheduleModule`

**Modify:** `apps/opticv-be/src/app/app.module.ts`

- Add import `ScheduleModule` from `@nestjs/schedule`, add `ScheduleModule.forRoot()` to the `imports` array.
- Add import for `SubscriptionModule`, add to `imports` array (alongside existing `UsersModule`, `StripeModule`, etc.).

**Modify:** `apps/opticv-be/src/app/users/users.module.ts`

- Add `SubscriptionModule` to `imports` array (needed for `SubscriptionService` injection into `UsersService`).

**Modify:** `apps/opticv-be/src/app/stripe/stripe.module.ts`

- Add `SubscriptionModule` to `imports` array (needed for `SubscriptionService` injection into `StripeService`).

---

### Step 5 — `QuotaService`: accept explicit period boundaries

**Modify:** `apps/opticv-be/src/app/quota/quota.service.ts`

- Delete `resolvePeriodStart()` and `resolveNextPeriodStart()` methods entirely.
- Change `checkAndConsume` signature to `checkAndConsume(userId: string, feature: LimitedFeature, tier: SubscriptionTier, periodStart: Date, periodEnd: Date): Promise<void>`.
- Change `getQuotaStatus` signature to `getQuotaStatus(userId: string, tier: SubscriptionTier, periodStart: Date, periodEnd: Date): Promise<QuotaStatus[]>`.
- In both methods, replace `resetsAt` computation (`this.resolveNextPeriodStart(periodStart).toISOString()`) with `periodEnd.toISOString()`.
- All other logic (upsert/updateMany retry pattern, `TIER_LIMITS` lookups) stays unchanged — only the source of `periodStart`/`periodEnd` changes from computed to parameter.

**Modify:** `apps/opticv-be/src/app/quota/quota.service.spec.ts`

- Add `periodStart`/`periodEnd` `Date` args to every existing `checkAndConsume`/`getQuotaStatus` call in the test file.
- Rewrite the test currently named `'uses the current calendar month as periodStart'` (lines 104-116) — replace with a test asserting verbatim pass-through: pick a non-1st-of-month `periodStart` (e.g. `2026-03-17T00:00:00Z`), pass it in, assert `upsertArg.create.periodStart` equals that exact date object/value (no recomputation).
- Add/adjust assertions so `resetsAt` in thrown `ForbiddenException` payloads and in `getQuotaStatus` results equal the passed-in `periodEnd.toISOString()`.

---

### Step 6 — `OptimizationService`: resolve tier and period together

**Modify:** `apps/opticv-be/src/app/optimization/optimization.service.ts`

- Rename private method `resolveTier` → `resolveTierAndPeriod(userId: string): Promise<{ tier: SubscriptionTier; periodStart: Date; periodEnd: Date }>`.
- Extend the `prisma.subscription.findUnique` call's `select` to `{ tier: true, currentPeriodStart: true, currentPeriodEnd: true }`.
- Return shape: `{ tier: subscription?.tier ?? 'FREE', periodStart: subscription?.currentPeriodStart ?? new Date(), periodEnd: subscription?.currentPeriodEnd ?? new Date() }` (defensive fallback only, per spec — should not trigger post-backfill).
- Update call site in `triggerOptimization` (currently `const tier = await this.resolveTier(userId);` then `checkAndConsume(userId, 'CV_OPTIMIZATION', tier)`) to destructure `{ tier, periodStart, periodEnd }` and pass both extra args into `checkAndConsume`.
- Update call site in `triggerSingleJob` (same pattern) identically.

**Modify:** `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`

- Extend the `subscription.findUnique` mock return value(s) to include `currentPeriodStart`/`currentPeriodEnd`.
- Update any assertions referencing `resolveTier` naming/behavior to `resolveTierAndPeriod`.
- Update `checkAndConsume` call assertions in both `triggerOptimization` and `triggerSingleJob` test suites to include the two new positional args.

---

### Step 7 — `UsersService`: FREE signup cycle + usage status period pass-through

**Modify:** `apps/opticv-be/src/app/users/users.service.ts`

- Inject `SubscriptionService` via constructor (`private readonly subscriptionService: SubscriptionService`).
- In `upsertUser`, `create` branch of `tx.subscription.upsert` only: spread `...this.subscriptionService.freeTierCycleFrom()` into the `create` object alongside existing `userId, tier: 'FREE', status: 'ACTIVE'`. The `update: {}` branch stays exactly as-is (no changes) — this is the mechanism that guarantees existing rows are never overwritten.
- In `getUsageStatus`: after loading `user` with `include: { subscription: true }` (already present), read `currentPeriodStart`/`currentPeriodEnd` off `user.subscription` and pass them as the extra two args into `this.quotaService.getQuotaStatus(user.id, tier, periodStart, periodEnd)`. Fall back to `new Date()` for both if `user.subscription` is null (mirrors the tier fallback already present: `user.subscription?.tier ?? 'FREE'`).
- Add a one-line comment at this read site noting the daily-cron-only rollover design (no lazy rollover-on-read) — per spec item 9.

**Modify:** `apps/opticv-be/src/app/users/users.module.ts`

- Already updated in Step 4 to import `SubscriptionModule`.

**Modify:** `apps/opticv-be/src/app/users/users.service.spec.ts`

- Inject a mocked `SubscriptionService` (pattern consistent with existing `mockQuotaService` mock in this file) with `freeTierCycleFrom` returning fixed, deterministic dates.
- `upsertUser` create-branch test: assert `mockTx.subscription.upsert` was called with the fixed `currentPeriodStart`/`currentPeriodEnd` merged into the `create` payload.
- Confirm/add a test that the `update: {}` branch remains untouched (no period fields injected there) — regression guard for the "never overwrite existing rows" requirement.
- `getUsageStatus` tests: extend subscription mock to include period dates, update `getQuotaStatus` call assertions to include the two new args.

---

### Step 8 — `StripeService`: fresh FREE cycle on cancellation

**Modify:** `apps/opticv-be/src/app/stripe/stripe.service.ts`

- Inject `SubscriptionService` via constructor.
- In `handleSubscriptionDeleted`, extend the `prisma.subscription.update` `data` payload (currently `{ tier: 'FREE', status: 'CANCELED', stripeSubscriptionId: null, stripePriceId: null, cancelAtPeriodEnd: false }`) to additionally spread `...this.subscriptionService.freeTierCycleFrom()`.

**Modify:** `apps/opticv-be/src/app/stripe/stripe.module.ts`

- Already updated in Step 4 to import `SubscriptionModule`.

**Modify:** `apps/opticv-be/src/app/stripe/stripe.service.spec.ts`

- Inject mocked `SubscriptionService` (fixed `freeTierCycleFrom` return value).
- In the `handleSubscriptionDeleted` test(s), assert the `prisma.subscription.update` call's `data` payload includes the fresh `currentPeriodStart`/`currentPeriodEnd` values alongside the existing `tier`/`status` assertions.

---

### Step 9 — Frontend: settings renewal sentence

**Modify:** `apps/opticv-web/src/app/features/settings/settings.ts`

- Add `computed<{ tier: string; verb: string; date: string } | null>` signal `subscriptionRenewal`, reading `this.userProfile.value()?.subscription`:
  - Returns `null` if `subscription` is null/undefined or `subscription.currentPeriodEnd` is null.
  - `verb` = `'resets on'` if `tier === 'FREE'`; else `'will end on'` if `cancelAtPeriodEnd === true`; else `'renews on'`.
  - Returns `{ tier: subscription.tier, verb, date: subscription.currentPeriodEnd }` (date stays as the raw ISO string; formatting happens in template via `DatePipe`, consistent with existing usage).
- `DatePipe` is already imported in this file's `imports` array — no new import needed.

**Modify:** `apps/opticv-web/src/app/features/settings/settings.html`

- Replace the current renewal sentence block (lines 142-150, currently gated on `usageStatus.hasValue() && usageStatus.value()` and reading `subUsage.quotas[0].resetsAt`) with a block gated on `subscriptionRenewal(); as renewal` (or equivalent `@if (subscriptionRenewal(); as renewal)`), rendering:
  `Your <strong>{{ renewal.tier }}</strong> plan {{ renewal.verb }} <strong>{{ renewal.date | date: 'mediumDate' }}</strong>`
- Leave the separate "Usage this month … Resets {date}" block (lines ~200-204, `usage.quotas[0].resetsAt`) completely untouched — out of scope per spec.
- Leave the tier/status badges (lines 129-140) untouched — they already read `userProfile.value()?.subscription?.tier`/`status` correctly.

**Modify:** `apps/opticv-web/src/app/features/settings/settings.spec.ts`

- Update mock user profiles used across the file so `subscription.currentPeriodEnd` is populated (many currently `null`) where the test scenario requires the renewal sentence to render.
- Rewrite the existing "renders/omits the renewal sentence" test(s) to key off `userProfile`/`subscription.currentPeriodEnd` instead of `usageStatus` availability.
- Add new cases:
  - FREE tier with `currentPeriodEnd` set → sentence renders with "resets on".
  - Paid tier, `cancelAtPeriodEnd: true` → sentence renders with "will end on".
  - Paid tier, `cancelAtPeriodEnd: false` → sentence renders with "renews on".
  - `subscription.currentPeriodEnd` null → sentence does not render.
- Leave the existing "Resets" usage-card test untouched (regression guard per spec).

---

### Step 10 — Prisma migration (backfill, applied last)

**New file:** `apps/opticv-be/prisma/migrations/<timestamp>_backfill_free_tier_period_dates/migration.sql`

```sql
UPDATE "subscriptions"
SET "currentPeriodStart" = COALESCE("currentPeriodStart", now()),
    "currentPeriodEnd" = COALESCE("currentPeriodEnd", now() + interval '1 month')
WHERE "currentPeriodStart" IS NULL;
```

- Generate via `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma --name backfill_free_tier_period_dates` (run from workspace root, per project convention).
- No `schema.prisma` changes — `currentPeriodStart`/`currentPeriodEnd` remain nullable `DateTime?`.
- Applied after all code changes are in place and tests pass, so the backfilled data lines up with the new code paths that read these columns.

---

### Step 11 — Verification pass

Run in order, fixing forward on failure before moving to the next:

1. `npm exec nx test opticv-be` — all suites green, including new `subscription.service.spec.ts` and `free-tier-renewal.cron.spec.ts`.
2. `npm exec nx test opticv-web` — `settings.spec.ts` green.
3. `npm exec nx typecheck opticv-be` / `npm exec nx typecheck opticv-web` — clean.
4. `npm exec nx lint opticv-be` / `npm exec nx lint opticv-web` — clean.
5. `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma` — applies cleanly; inspect via Prisma Studio that existing null-period rows are backfilled.
6. Manual verification (`npm run start-be:dev` + `npm exec nx serve opticv-web`), per spec's Acceptance section:
   - New FREE signup shows correct period dates and "resets on" copy.
   - Stripe test checkout upgrade shows "renews on" with Stripe's real date.
   - Cancel-at-period-end via billing portal shows "will end on".
   - Forced `customer.subscription.deleted` flips to FREE with a fresh cycle.
   - Manually expiring a test row's `currentPeriodEnd` and triggering the cron confirms correct (including multi-month) rollover.
   - CV optimization as a fresh FREE user confirms `UsageQuota.periodStart` matches `Subscription.currentPeriodStart`.

---

## Planned Files

**New:**
- `apps/opticv-be/src/app/subscription/subscription.module.ts`
- `apps/opticv-be/src/app/subscription/subscription.service.ts`
- `apps/opticv-be/src/app/subscription/subscription.service.spec.ts`
- `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.ts`
- `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.spec.ts`
- `apps/opticv-be/prisma/migrations/<timestamp>_backfill_free_tier_period_dates/migration.sql`

**Modified:**
- `apps/opticv-be/package.json`
- `apps/opticv-be/src/app/app.module.ts`
- `apps/opticv-be/src/app/users/users.module.ts`
- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-be/src/app/stripe/stripe.module.ts`
- `apps/opticv-be/src/app/stripe/stripe.service.ts`
- `apps/opticv-be/src/app/stripe/stripe.service.spec.ts`
- `apps/opticv-be/src/app/quota/quota.service.ts`
- `apps/opticv-be/src/app/quota/quota.service.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
