# Sync billing periods to Stripe (and give FREE tier a real cycle)

## Context

The settings page "Plan renews on {date}" text and the `UsageQuota.periodStart` bucket are both currently derived from `QuotaService.resolvePeriodStart()` — "first day of the current UTC calendar month" — which has no relationship to a user's actual billing cycle. Now that Stripe is integrated, paid subscriptions have an accurate `Subscription.currentPeriodStart`/`currentPeriodEnd` populated by webhooks. This is a two-part bug:

1. **Display bug**: the settings page should show the real `currentPeriodEnd` from the `Subscription` table, not a calendar-month guess.
2. **Quota bucketing bug**: `UsageQuota.periodStart` should be anchored to `Subscription.currentPeriodStart`, so usage limits reset in sync with the actual billing period.

FREE tier has usage limits too (1 CV_OPTIMIZATION, 1 COVER_LETTER, 0 LINKEDIN) but never gets `currentPeriodStart`/`currentPeriodEnd` populated today (nullable, never written for FREE). Decision made with the user: FREE tier gets its own rolling monthly cycle, anchored to signup date, advanced by a daily cron job (not lazy rollover-on-read) since there's no Stripe webhook to drive it.

## Approach

### 1. Prisma — no schema change, one data backfill migration

`Subscription.currentPeriodStart`/`currentPeriodEnd` (schema.prisma:99-100) stay nullable `DateTime?` — no structural change. Add a migration that backfills existing null rows (all current FREE subscriptions):

```sql
UPDATE "subscriptions"
SET "currentPeriodStart" = COALESCE("currentPeriodStart", now()),
    "currentPeriodEnd" = COALESCE("currentPeriodEnd", now() + interval '1 month')
WHERE "currentPeriodStart" IS NULL;
```

Generate via `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma --name backfill_free_tier_period_dates`, following the existing migration pattern (e.g. `20260713125454_subscription_limits`).

### 2. New `SubscriptionModule`/`SubscriptionService` — shared FREE-cycle helper

No subscription-lifecycle service exists yet (`StripeService` is Stripe-webhook-focused only). Add `apps/opticv-be/src/app/subscription/`:

- `subscription.service.ts` — pure date-math helpers, no Prisma dependency, safe to call inside an existing transaction:
  ```ts
  @Injectable()
  export class SubscriptionService {
    addOneUtcMonth(date: Date): Date { ... }               // Date.UTC(y, m+1, d, h, min, s, ms)
    freeTierCycleFrom(now = new Date()): { currentPeriodStart: Date; currentPeriodEnd: Date } {
      return { currentPeriodStart: now, currentPeriodEnd: this.addOneUtcMonth(now) };
    }
  }
  ```
- `subscription.module.ts` — `imports: [PrismaModule]`, `providers: [SubscriptionService, FreeTierRenewalCron]`, `exports: [SubscriptionService]`.
- Register `SubscriptionModule` in `app.module.ts` imports, and in `UsersModule`/`StripeModule` imports (both need `SubscriptionService` injected).

**Call sites using the helper:**
- `UsersService.upsertUser` (users.service.ts:34-53) — only in the `create` branch of the `subscription.upsert`, add `...this.subscriptionService.freeTierCycleFrom()`. The `update: {}` branch stays untouched — existing rows (FREE or paid) must never be overwritten on every authenticated request.
- `StripeService.handleSubscriptionDeleted` (stripe.service.ts:361-396) — when a subscription is canceled and the user drops back to FREE, add `...this.subscriptionService.freeTierCycleFrom()` to the `update` payload alongside the existing `tier: 'FREE', status: 'CANCELED', ...` fields, so the user starts a fresh FREE cycle instead of keeping stale Stripe dates.

### 3. Cron job — advance expired FREE-tier periods

New `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.ts`:

```ts
@Injectable()
export class FreeTierRenewalCron {
  constructor(private prisma: PrismaService, private subscriptionService: SubscriptionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async advanceExpiredFreeTierPeriods(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: { tier: 'FREE', currentPeriodEnd: { lte: now } },
      select: { id: true, currentPeriodStart: true, currentPeriodEnd: true },
    });
    for (const sub of expired) {
      let start = sub.currentPeriodStart ?? now;
      let end = sub.currentPeriodEnd ?? now;
      while (end <= now) {
        start = end;
        end = this.subscriptionService.addOneUtcMonth(start);
      }
      await this.prisma.subscription.update({ where: { id: sub.id }, data: { currentPeriodStart: start, currentPeriodEnd: end } });
    }
  }
}
```

The `tier: 'FREE'` filter keeps this cron from ever touching BASIC/PRO rows (Stripe webhooks own those exclusively). The `while` loop handles users inactive for multiple months by advancing whole cycles rather than jumping to "now."

Add `@nestjs/schedule` as a new dependency (not currently installed — confirmed absent from package.json) and wire `ScheduleModule.forRoot()` into `app.module.ts` imports, alongside `SubscriptionModule`.

### 4. `QuotaService` — accept period boundaries instead of computing them

`apps/opticv-be/src/app/quota/quota.service.ts`: delete `resolvePeriodStart()` and `resolveNextPeriodStart()`. Change signatures to take explicit `periodStart`/`periodEnd` params (matches this file's existing convention of positional named params):

```ts
checkAndConsume(userId: string, feature: LimitedFeature, tier: SubscriptionTier, periodStart: Date, periodEnd: Date): Promise<void>
getQuotaStatus(userId: string, tier: SubscriptionTier, periodStart: Date, periodEnd: Date): Promise<QuotaStatus[]>
```

`resetsAt` (used in both `QuotaStatus` and the `ForbiddenException` payloads for `FEATURE_NOT_AVAILABLE`/`QUOTA_EXCEEDED`) becomes `periodEnd.toISOString()`. No shared-type changes needed — `QuotaStatus`/`QuotaErrorPayload` in `packages/shared/datatypes/src/lib/datatypes.ts` already just carry `resetsAt: string`.

### 5. Ripple to callers

- **`optimization.service.ts`**: `resolveTier` (lines 42-48) → rename `resolveTierAndPeriod`, additionally `select: { tier: true, currentPeriodStart: true, currentPeriodEnd: true }` and return `{ tier, periodStart, periodEnd }` (fall back to `new Date()`/same instant if a subscription row is somehow missing — defensive only, shouldn't trigger post-backfill). Update both call sites (lines 57-58, 122-124) to pass the extra two args into `checkAndConsume`.
- **`users.service.ts`**: `getUsageStatus` (lines 187-208) already does `include: { subscription: true }` — read `currentPeriodStart`/`currentPeriodEnd` off the same object (no extra query) and pass into `getQuotaStatus`.
- No inline "is this stale, roll it forward now" logic anywhere in the request path — the daily cron is the sole rollover mechanism, and brief staleness (up to ~1 day) between a FREE user's period actually ending and the cron catching up is accepted by design. Add a one-line comment at the `getUsageStatus` read site noting this.

### 6. Frontend — `apps/opticv-web/src/app/features/settings/`

**`settings.html`** — replace the renewal sentence block (lines 142-150), which currently reads `usageStatus.quotas[0].resetsAt`. Source it from `userProfile.value()?.subscription` instead, with three copy states:
- Paid tier, active → "Your PRO plan renews on {currentPeriodEnd}"
- Paid tier, `cancelAtPeriodEnd === true` → "Your PRO plan will end on {currentPeriodEnd}"
- FREE tier → "Your FREE plan resets on {currentPeriodEnd}" (not "renews" — nothing is being paid)

Do **not** touch the separate "Usage this month … Resets {date}" label (lines 200-204) — it stays sourced from `usageStatus.quotas[0].resetsAt`, which is now correctly synced to the billing cycle via the backend fix and remains meaningful as-is.

**`settings.ts`** — add a `computed()` signal deriving the sentence parts (tier/verb/date) from `userProfile.value()?.subscription`, guarded so it renders nothing if `currentPeriodEnd` is null:

```ts
readonly subscriptionRenewal = computed<{ tier: string; verb: string; date: string } | null>(() => {
  const subscription = this.userProfile.value()?.subscription;
  if (!subscription?.currentPeriodEnd) return null;
  const verb = subscription.tier === 'FREE' ? 'resets on'
    : subscription.cancelAtPeriodEnd ? 'will end on' : 'renews on';
  return { tier: subscription.tier, verb, date: subscription.currentPeriodEnd };
});
```

Template renders `{{ renewal.date | date: 'mediumDate' }}` via the existing `DatePipe`, keeping formatting in the template rather than the computed signal (consistent with existing usage in this file).

### 7. Tests to update

- `quota.service.spec.ts` — every `checkAndConsume`/`getQuotaStatus` call site needs 2 new `Date` args; rewrite the "uses the current calendar month as periodStart" test (lines 104-116) to instead assert the passed-in `periodStart` is used verbatim (pick a non-1st-of-month date to prove no recomputation happens).
- `optimization.service.spec.ts` — extend the `subscription.findUnique` mock to include period dates; update `checkAndConsume` call assertions for the new args.
- `users.service.spec.ts` — `upsertUser` test's `mockTx.subscription.upsert` assertion needs `currentPeriodStart`/`currentPeriodEnd` in the `create` payload (inject a mocked `SubscriptionService` returning fixed dates, consistent with the existing `mockQuotaService` pattern); `getUsageStatus` tests need the subscription mock extended and `getQuotaStatus` call assertions updated.
- `stripe.service.spec.ts` — `handleSubscriptionDeleted` test needs an assertion that fresh FREE-cycle dates are set.
- New `subscription.service.spec.ts` — unit-test `addOneUtcMonth`/`freeTierCycleFrom`, including month-end edge cases (Jan 31 → Feb 28/29).
- New `free-tier-renewal.cron.spec.ts` — no expired rows (no-op), single-month rollover, multi-month rollover (inactive user), confirms `tier: 'FREE'` filter excludes paid rows.
- `settings.spec.ts` — update mock profiles' `currentPeriodEnd` (many currently `null`); rewrite the "renders/omits the renewal sentence" tests to key off `userProfile`/`currentPeriodEnd` instead of `usageStatus` availability; add cases for FREE ("resets on") and `cancelAtPeriodEnd` ("will end on") copy. Leave the existing "Resets" usage-card test untouched as a regression guard.

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

## Verification

- `npm exec nx test opticv-be` / `npm exec nx test opticv-web` — full suites green.
- `npm exec nx typecheck opticv-be` / `opticv-web`, `npm exec nx lint opticv-be` / `opticv-web`.
- `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma` locally, inspect via Prisma Studio that existing null-period rows get backfilled.
- Manual, via `npm run start-be:dev` + `npm exec nx serve opticv-web`:
  1. New FREE signup → `Subscription` row has `currentPeriodStart = now`, `currentPeriodEnd = now + 1 month`; settings page shows "Your FREE plan resets on {date}".
  2. Upgrade to BASIC/PRO via Stripe test checkout → settings page shows "renews on {Stripe's real currentPeriodEnd}", matching the Stripe test dashboard.
  3. Cancel-at-period-end via billing portal → copy switches to "will end on {date}".
  4. Let/force `customer.subscription.deleted` → subscription flips to FREE with a fresh cycle, not stale Stripe dates.
  5. Set a test row's `currentPeriodEnd` to the past in Prisma Studio, manually trigger the cron → confirms correct (including multi-month) rollover.
  6. Trigger a CV optimization as a fresh FREE user → `UsageQuota.periodStart` matches `Subscription.currentPeriodStart`, not the 1st of the calendar month.
