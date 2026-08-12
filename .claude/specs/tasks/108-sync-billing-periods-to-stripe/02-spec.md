# Task Specification

## Source

Task 108 — Sync billing periods to Stripe (and give FREE tier a real cycle)

## Goal

Fix two related bugs so that billing/usage periods reflect real subscription cycles instead of calendar-month guesses:

1. The settings page "Plan renews on {date}" text must show the real `Subscription.currentPeriodEnd` (from Stripe for paid tiers), not a calendar-month guess.
2. `UsageQuota.periodStart` bucketing must be anchored to `Subscription.currentPeriodStart`, so usage limits reset in sync with the actual billing period — for both paid tiers and FREE.

FREE tier currently never gets `currentPeriodStart`/`currentPeriodEnd` populated. It will get its own rolling monthly cycle, anchored to signup date, advanced by a daily cron job (no Stripe webhook exists to drive it for FREE).

## Context

- Backend: `apps/opticv-be/src/app/quota/quota.service.ts`, `users/users.service.ts`, `optimization/optimization.service.ts`, `stripe/stripe.service.ts`
- Prisma: `apps/opticv-be/prisma/schema.prisma` — `Subscription.currentPeriodStart`/`currentPeriodEnd` (nullable `DateTime?`, no schema change needed)
- Frontend: `apps/opticv-web/src/app/features/settings/settings.html`, `settings.ts`
- Full technical approach previously agreed with the user is recorded in `docs/sync-billing-periods-to-stripe.md` — this spec follows that plan exactly, adding no new requirements.

## Scope

### In scope

- Data backfill migration to populate `currentPeriodStart`/`currentPeriodEnd` for existing null (FREE) `Subscription` rows.
- New `SubscriptionModule`/`SubscriptionService` providing pure date-math helpers (`addOneUtcMonth`, `freeTierCycleFrom`) used by both the FREE-signup path and the Stripe-cancellation path.
- New daily cron job (`FreeTierRenewalCron`, using `@nestjs/schedule`, `EVERY_DAY_AT_2AM`) that advances expired FREE-tier periods, handling multi-month rollover for inactive users. Only touches rows with `tier: 'FREE'`.
- `QuotaService`: remove calendar-month period computation (`resolvePeriodStart`/`resolveNextPeriodStart`); accept `periodStart`/`periodEnd` as explicit parameters in `checkAndConsume` and `getQuotaStatus`.
- Update all callers of the above (`optimization.service.ts`, `users.service.ts`) to source period boundaries from the user's `Subscription` row.
- `UsersService.upsertUser`: new FREE signups get `currentPeriodStart`/`currentPeriodEnd` populated via `SubscriptionService.freeTierCycleFrom()`. Existing rows are never overwritten (the `update: {}` branch stays untouched).
- `StripeService.handleSubscriptionDeleted`: when a subscription cancels and the user drops to FREE, populate a fresh FREE cycle via `SubscriptionService.freeTierCycleFrom()` instead of leaving stale Stripe dates.
- Settings page: replace the renewal sentence to source tier/date from `userProfile().subscription` (not `usageStatus`), with three copy states (paid active, paid canceling, FREE).
- Test updates/additions per file, as enumerated below.

### Out of scope

- Any Prisma schema structural change (columns stay nullable `DateTime?`).
- Changing the "Usage this month … Resets {date}" label/card — it stays sourced from `usageStatus.quotas[0].resetsAt` and needs no changes since it will now correctly reflect the synced cycle.
- Any change to Stripe webhook handlers other than `handleSubscriptionDeleted`.
- Real-time/lazy rollover of FREE-tier periods on read — the daily cron is the sole mechanism; up to ~1 day of staleness between a FREE user's period actually ending and the cron catching up is accepted by design.
- Any UI/API for manually triggering the cron (manual trigger during verification is done via test tooling/Prisma Studio, not a shipped feature).

## Behavior

### Backend

1. **Migration**: a new Prisma migration backfills existing null `currentPeriodStart`/`currentPeriodEnd` rows to `now()` / `now() + 1 month` respectively (`COALESCE`, so it's a no-op for already-populated rows).
2. **`SubscriptionService`** (new, `apps/opticv-be/src/app/subscription/subscription.service.ts`):
   - `addOneUtcMonth(date: Date): Date` — adds one calendar month in UTC via `Date.UTC`.
   - `freeTierCycleFrom(now = new Date()): { currentPeriodStart: Date; currentPeriodEnd: Date }` — returns `{ currentPeriodStart: now, currentPeriodEnd: addOneUtcMonth(now) }`.
   - No Prisma dependency; pure functions, safe to call inside an existing transaction.
3. **`SubscriptionModule`** (new): imports `PrismaModule`; provides `SubscriptionService` and `FreeTierRenewalCron`; exports `SubscriptionService`. Registered in `app.module.ts`, and imported by `UsersModule` and `StripeModule` (both need `SubscriptionService` injected).
4. **New FREE signup** (`UsersService.upsertUser`, `create` branch of `subscription.upsert` only): sets `currentPeriodStart`/`currentPeriodEnd` via `subscriptionService.freeTierCycleFrom()`. The `update: {}` branch is untouched — no overwrite on every authenticated request.
5. **Subscription cancellation** (`StripeService.handleSubscriptionDeleted`): when a user drops to FREE, the `update` payload additionally includes a fresh `freeTierCycleFrom()` result alongside the existing `tier: 'FREE'`, `status: 'CANCELED'`, etc.
6. **Daily cron** (`FreeTierRenewalCron`, new): runs at 2am UTC daily. Finds all `Subscription` rows with `tier: 'FREE'` and `currentPeriodEnd <= now`. For each, advances `currentPeriodStart`/`currentPeriodEnd` forward one UTC month at a time in a loop until `currentPeriodEnd > now` (handles users inactive for multiple months), then persists. Paid tiers (BASIC/PRO) are never touched by this cron — Stripe webhooks own those exclusively.
7. **`QuotaService`**: `resolvePeriodStart`/`resolveNextPeriodStart` are removed. `checkAndConsume(userId, feature, tier, periodStart, periodEnd)` and `getQuotaStatus(userId, tier, periodStart, periodEnd)` take the period boundaries as explicit params. `resetsAt` (used in `QuotaStatus` and in `FEATURE_NOT_AVAILABLE`/`QUOTA_EXCEEDED` `ForbiddenException` payloads) becomes `periodEnd.toISOString()`. No shared-type changes needed.
8. **`OptimizationService`**: `resolveTier` renamed to `resolveTierAndPeriod`; selects `tier`, `currentPeriodStart`, `currentPeriodEnd` and returns `{ tier, periodStart, periodEnd }` (falls back to `new Date()` for both if a subscription row is somehow missing — defensive only). Both call sites (`triggerOptimization`, `triggerSingleJob`) pass `periodStart`/`periodEnd` into `checkAndConsume`.
9. **`UsersService.getUsageStatus`**: already loads `subscription` via `include`; reads `currentPeriodStart`/`currentPeriodEnd` off the same object (no extra query) and passes them into `getQuotaStatus`. A one-line comment notes the daily-cron-only rollover design (no lazy rollover-on-read).

### Frontend

`settings.html`/`settings.ts` renewal sentence sourced from `userProfile.value()?.subscription` via a new computed signal `subscriptionRenewal`:

- Returns `null` (renders nothing) if `subscription.currentPeriodEnd` is null.
- Paid tier, active (`cancelAtPeriodEnd === false`) → verb "renews on".
- Paid tier, `cancelAtPeriodEnd === true` → verb "will end on".
- FREE tier → verb "resets on" (never "renews", since nothing is paid).
- Date formatting stays in the template via the existing `DatePipe` (`| date: 'mediumDate'`), consistent with current usage in this file.

The separate "Usage this month … Resets {date}" card (lines ~200-204 of `settings.html`) is untouched — it remains sourced from `usageStatus.quotas[0].resetsAt`.

## Edge Cases

- User inactive for multiple months on FREE tier: cron advances `currentPeriodStart`/`currentPeriodEnd` through multiple whole-month cycles in one run, landing on the first cycle boundary that is still in the future relative to `now`.
- Subscription row missing when `OptimizationService` resolves tier/period (should not happen post-backfill, but handled defensively by falling back to `new Date()` for both boundaries rather than throwing).
- FREE tier: verb is always "resets on", regardless of `cancelAtPeriodEnd` (which is not meaningful for FREE).
- Existing paid or FREE subscription rows must never be overwritten by `upsertUser` on subsequent authenticated requests — only the `create` branch sets period dates.
- Cron only ever selects/updates `tier: 'FREE'` rows — must never touch BASIC/PRO rows, which are owned exclusively by Stripe webhooks.

## Data / API

- **DB**: One new migration `backfill_free_tier_period_dates` (data-only, no schema change) under `apps/opticv-be/prisma/migrations/`.
- **New backend module**: `apps/opticv-be/src/app/subscription/` — `subscription.module.ts`, `subscription.service.ts`, `free-tier-renewal.cron.ts` (+ specs).
- **New dependency**: `@nestjs/schedule`, wired via `ScheduleModule.forRoot()` in `app.module.ts` alongside `SubscriptionModule`.
- **Changed signatures**:
  - `QuotaService.checkAndConsume(userId, feature, tier, periodStart: Date, periodEnd: Date): Promise<void>`
  - `QuotaService.getQuotaStatus(userId, tier, periodStart: Date, periodEnd: Date): Promise<QuotaStatus[]>`
  - `OptimizationService.resolveTier` → `resolveTierAndPeriod(userId): Promise<{ tier, periodStart, periodEnd }>`
- No changes to `@opticv/datatypes` shared types — `QuotaStatus`/`QuotaErrorPayload.resetsAt: string` already fits.
- No REST endpoint/route changes; no new public API surface.

## Files

**New:**
- `apps/opticv-be/src/app/subscription/subscription.module.ts`
- `apps/opticv-be/src/app/subscription/subscription.service.ts` (+ `.spec.ts`)
- `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.ts` (+ `.spec.ts`)
- `apps/opticv-be/prisma/migrations/<timestamp>_backfill_free_tier_period_dates/migration.sql`

**Changed:**
- `apps/opticv-be/src/app/quota/quota.service.ts` (+ spec)
- `apps/opticv-be/src/app/optimization/optimization.service.ts` (+ spec)
- `apps/opticv-be/src/app/users/users.service.ts`, `users.module.ts` (+ spec)
- `apps/opticv-be/src/app/stripe/stripe.service.ts`, `stripe.module.ts` (+ spec)
- `apps/opticv-be/src/app/app.module.ts` (add `ScheduleModule.forRoot()`, `SubscriptionModule`)
- `apps/opticv-be/package.json` (add `@nestjs/schedule`)
- `apps/opticv-web/src/app/features/settings/settings.html`, `settings.ts` (+ spec)

## Acceptance (DEV)

- `npm exec nx test opticv-be` / `npm exec nx test opticv-web` — full suites green, including:
  - `quota.service.spec.ts` updated for the new `periodStart`/`periodEnd` params (calendar-month test rewritten to assert verbatim pass-through using a non-1st-of-month date).
  - `optimization.service.spec.ts` updated mocks/assertions for `resolveTierAndPeriod` and the extra `checkAndConsume` args.
  - `users.service.spec.ts` updated for `upsertUser` create-payload period dates (mocked `SubscriptionService`) and `getUsageStatus` period pass-through.
  - `stripe.service.spec.ts` asserts fresh FREE-cycle dates are set on `handleSubscriptionDeleted`.
  - New `subscription.service.spec.ts` covering `addOneUtcMonth`/`freeTierCycleFrom`, including month-end edge cases (Jan 31 → Feb 28/29).
  - New `free-tier-renewal.cron.spec.ts` covering no-op (no expired rows), single-month rollover, multi-month rollover, and the `tier: 'FREE'` filter excluding paid rows.
  - `settings.spec.ts` updated mock profiles (`currentPeriodEnd` populated) and rewritten renewal-sentence tests keyed off `userProfile`, including FREE ("resets on") and `cancelAtPeriodEnd` ("will end on") cases. Existing "Resets" usage-card test left untouched as a regression guard.
- `npm exec nx typecheck opticv-be` / `opticv-web`, `npm exec nx lint opticv-be` / `opticv-web` — clean.
- `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma` applied locally; Prisma Studio confirms existing null-period rows are backfilled.
- Manual verification via `npm run start-be:dev` + `npm exec nx serve opticv-web`:
  1. New FREE signup → `Subscription` row has `currentPeriodStart = now`, `currentPeriodEnd = now + 1 month`; settings page shows "Your FREE plan resets on {date}".
  2. Upgrade to BASIC/PRO via Stripe test checkout → settings page shows "renews on {Stripe's real currentPeriodEnd}", matching the Stripe test dashboard.
  3. Cancel-at-period-end via billing portal → copy switches to "will end on {date}".
  4. Force `customer.subscription.deleted` → subscription flips to FREE with a fresh cycle, not stale Stripe dates.
  5. Set a test row's `currentPeriodEnd` to the past in Prisma Studio, manually trigger the cron → confirms correct (including multi-month) rollover.
  6. Trigger a CV optimization as a fresh FREE user → `UsageQuota.periodStart` matches `Subscription.currentPeriodStart`, not the 1st of the calendar month.
- No breaking changes to existing REST API contracts or shared datatypes.
