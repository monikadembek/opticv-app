# Sync billing periods to Stripe (and give FREE tier a real cycle)

## Context

The settings page "Plan renews on {date}" text and the `UsageQuota.periodStart` bucket are both currently derived from `QuotaService.resolvePeriodStart()` — "first day of the current UTC calendar month" — which has no relationship to a user's actual billing cycle. Now that Stripe is integrated, paid subscriptions have an accurate `Subscription.currentPeriodStart`/`currentPeriodEnd` populated by webhooks. This is a two-part bug:

1. **Display bug**: the settings page should show the real `currentPeriodEnd` from the `Subscription` table, not a calendar-month guess.
2. **Quota bucketing bug**: `UsageQuota.periodStart` should be anchored to `Subscription.currentPeriodStart`, so usage limits reset in sync with the actual billing period.

FREE tier has usage limits too (1 CV_OPTIMIZATION, 1 COVER_LETTER, 0 LINKEDIN) but never gets `currentPeriodStart`/`currentPeriodEnd` populated today (nullable, never written for FREE).

**Decision (revised 2026-08-12, superseding the original rolling-cycle plan below):** the FREE tier does **not** renew. It is assigned a period once, at signup (`currentPeriodStart = now()`, `currentPeriodEnd = null`), and that period never advances. Once a FREE user exhausts their limits, they stay exhausted until they upgrade to a paid tier — there is no cron, no monthly rollover, and no "resets on" date for FREE users. This replaces the original plan's daily cron-driven rolling monthly cycle for FREE (Section 3 below, kept for history).

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

> Note: this migration was applied before the FREE-never-renews decision above, so it backfilled existing null rows with a real `currentPeriodEnd` (`now() + 1 month`). Those rows are inert now — nothing reads `currentPeriodEnd` as a renewal signal for FREE — but if a fresh, fully-null backfill is wanted, a follow-up migration would be needed.

### 2. `SubscriptionModule`/`SubscriptionService` — shared FREE-cycle helper

No subscription-lifecycle service exists yet (`StripeService` is Stripe-webhook-focused only). Add `apps/opticv-be/src/app/subscription/`:

- `subscription.service.ts` — pure helper, no Prisma dependency, safe to call inside an existing transaction:
  ```ts
  @Injectable()
  export class SubscriptionService {
    freeTierCycleFrom(now = new Date()): { currentPeriodStart: Date; currentPeriodEnd: null } {
      return { currentPeriodStart: now, currentPeriodEnd: null };
    }
  }
  ```
  (The original plan's `addOneUtcMonth` helper was removed — nothing needs monthly UTC date math once FREE no longer rolls over.)
- `subscription.module.ts` — `imports: [PrismaModule]`, `providers: [SubscriptionService]`, `exports: [SubscriptionService]`.
- Register `SubscriptionModule` in `app.module.ts` imports, and in `UsersModule`/`StripeModule` imports (both need `SubscriptionService` injected).

**Call sites using the helper:**
- `UsersService.upsertUser` (users.service.ts:34-53) — only in the `create` branch of the `subscription.upsert`, add `...this.subscriptionService.freeTierCycleFrom()`. The `update: {}` branch stays untouched — existing rows (FREE or paid) must never be overwritten on every authenticated request.
- `StripeService.handleSubscriptionDeleted` (stripe.service.ts:361-396) — when a subscription is canceled and the user drops back to FREE, add `...this.subscriptionService.freeTierCycleFrom()` to the `update` payload alongside the existing `tier: 'FREE', status: 'CANCELED', ...` fields, so the user gets `currentPeriodStart = now()`, `currentPeriodEnd = null` instead of keeping stale Stripe dates.

### 3. ~~Cron job — advance expired FREE-tier periods~~ (removed, superseded)

The original plan added a daily `FreeTierRenewalCron` (`@nestjs/schedule`, `EVERY_DAY_AT_2AM`) that advanced expired FREE-tier periods forward one UTC month at a time. **This was removed entirely** once the FREE-never-renews decision was made — there is nothing to advance. `free-tier-renewal.cron.ts` and its spec were deleted, `@nestjs/schedule` was uninstalled, and `ScheduleModule.forRoot()` was removed from `app.module.ts`.

### 4. `QuotaService` — accept period boundaries instead of computing them

`apps/opticv-be/src/app/quota/quota.service.ts`: delete `resolvePeriodStart()` and `resolveNextPeriodStart()`. Change signatures to take explicit `periodStart`/`periodEnd` params, with `periodEnd` nullable (FREE tier has no end date):

```ts
checkAndConsume(userId: string, feature: LimitedFeature, tier: SubscriptionTier, periodStart: Date, periodEnd: Date | null): Promise<void>
getQuotaStatus(userId: string, tier: SubscriptionTier, periodStart: Date, periodEnd: Date | null): Promise<QuotaStatus[]>
```

`resetsAt` (used in both `QuotaStatus` and the `ForbiddenException` payloads for `FEATURE_NOT_AVAILABLE`/`QUOTA_EXCEEDED`) becomes `periodEnd?.toISOString() ?? null`. **Shared-type change needed** (unlike the original plan): `QuotaStatus.resetsAt` and `QuotaErrorPayload.resetsAt` in `packages/shared/datatypes/src/lib/datatypes.ts` were widened from `string` to `string | null`.

### 5. Ripple to callers

- **`optimization.service.ts`**: `resolveTier` (lines 42-48) → renamed `resolveTierAndPeriod`, additionally `select: { tier: true, currentPeriodStart: true, currentPeriodEnd: true }` and returns `{ tier, periodStart, periodEnd }` where `periodEnd: Date | null` (falls back to `new Date()` for `periodStart` only if a subscription row is somehow missing — defensive; `periodEnd` falls back to `null`, not `new Date()`, since `null` is now a valid, expected state). Both call sites pass `periodStart`/`periodEnd` into `checkAndConsume`.
- **`users.service.ts`**: `getUsageStatus` (lines 187-208) already does `include: { subscription: true }` — reads `currentPeriodStart`/`currentPeriodEnd` off the same object (no extra query) and passes into `getQuotaStatus`, with `periodEnd` defaulting to `null` rather than `new Date()`.
- **Frontend quota-error toast** (`quota-error-interceptor.ts`): the `QUOTA_EXCEEDED` message previously always formatted `resetsAt` as a date; fixed to show an upgrade-focused message with no date when `resetsAt` is `null` (previously would have rendered a bogus epoch date like "1/1/1970").

### 6. Frontend — `apps/opticv-web/src/app/features/settings/`

**`settings.html`** — the renewal sentence block, sourced from `userProfile.value()?.subscription` via `subscriptionRenewal`, now only ever renders for paid tiers:
- Paid tier, active (`cancelAtPeriodEnd === false`) → "Your PRO plan renews on {currentPeriodEnd}"
- Paid tier, `cancelAtPeriodEnd === true` → "Your PRO plan will end on {currentPeriodEnd}"
- FREE tier → **no sentence at all** (FREE's `currentPeriodEnd` is always `null`, and the computed signal returns `null` whenever `currentPeriodEnd` is null — this falls out automatically, no FREE-specific branch needed)

The separate "Usage this month … Resets {date}" card is now conditional on `resetsAt` being non-null (previously always rendered) — for FREE users it's hidden rather than showing a bare "Resets" label with nothing after it.

**`settings.ts`**:

```ts
readonly subscriptionRenewal = computed<{ tier: string; verb: string; date: string } | null>(() => {
  const subscription = this.userProfile.value()?.subscription;
  if (!subscription || !subscription.currentPeriodEnd) return null;
  const verb = subscription.cancelAtPeriodEnd ? 'will end on' : 'renews on';
  return { tier: subscription.tier, verb, date: subscription.currentPeriodEnd };
});
```

(The original plan's FREE-specific `'resets on'` verb branch was removed as dead code — unreachable now that FREE always has a null `currentPeriodEnd`.)

### 7. Tests

- `quota.service.spec.ts` — every `checkAndConsume`/`getQuotaStatus` call site takes 2 new `Date | null` args; includes cases asserting `resetsAt: null` when `periodEnd` is null.
- `optimization.service.spec.ts` — extended `subscription.findUnique` mock to include period dates; `checkAndConsume` call assertions include the new args.
- `users.service.spec.ts` — `upsertUser` create-payload assertion includes `currentPeriodStart`/`currentPeriodEnd: null`; `getUsageStatus` tests cover both a FREE subscription (periodEnd passed through as `null`) and a paid subscription (real periodEnd passed through).
- `stripe.service.spec.ts` — `handleSubscriptionDeleted` test asserts `currentPeriodEnd: null` is set alongside the fresh `currentPeriodStart`.
- `subscription.service.spec.ts` — covers `freeTierCycleFrom` returning `{ currentPeriodStart: now, currentPeriodEnd: null }`, including the default-param case.
- `free-tier-renewal.cron.spec.ts` — **deleted**, along with the cron itself.
- `settings.spec.ts` — renewal-sentence tests keyed off `userProfile`/`currentPeriodEnd`: "will end on" and "renews on" cases for paid tiers, and a case confirming FREE renders no sentence at all (no more FREE "resets on" case, since that state is unreachable). Added a case for the usage card's "Resets" line being hidden when `resetsAt` is null.

## Files

**New:**
- `apps/opticv-be/src/app/subscription/subscription.module.ts`
- `apps/opticv-be/src/app/subscription/subscription.service.ts` (+ `.spec.ts`)
- `apps/opticv-be/prisma/migrations/<timestamp>_backfill_free_tier_period_dates/migration.sql`

**Deleted (originally planned as new, then removed):**
- `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.ts` (+ `.spec.ts`)

**Changed:**
- `apps/opticv-be/src/app/quota/quota.service.ts` (+ spec)
- `apps/opticv-be/src/app/optimization/optimization.service.ts` (+ spec)
- `apps/opticv-be/src/app/users/users.service.ts`, `users.module.ts` (+ spec)
- `apps/opticv-be/src/app/stripe/stripe.service.ts`, `stripe.module.ts` (+ spec)
- `apps/opticv-be/src/app/app.module.ts` (`SubscriptionModule` added; `ScheduleModule.forRoot()` added then removed)
- `apps/opticv-be/package.json` (`@nestjs/schedule` added then removed)
- `apps/opticv-web/src/app/features/settings/settings.html`, `settings.ts` (+ spec)
- `apps/opticv-web/src/app/core/interceptors/quota-error-interceptor.ts` (null-safe `resetsAt` handling)
- `packages/shared/datatypes/src/lib/datatypes.ts` (`QuotaStatus.resetsAt`, `QuotaErrorPayload.resetsAt` widened to `string | null`)

## Verification

- `npm exec nx test opticv-be` / `npm exec nx test opticv-web` — full suites green (271/271 backend, 1199/1199 frontend).
- `npm exec nx typecheck opticv-be` / `opticv-web`, `npm exec nx lint opticv-be` / `opticv-web` — clean (pre-existing unrelated findings only).
- `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma` applied locally.
- Manual verification via `npm run start-be:dev` + `npm exec nx serve opticv-web` — not yet performed as of this doc update; recommended checks:
  1. New FREE signup → `Subscription` row has `currentPeriodStart = now`, `currentPeriodEnd = null`; settings page shows no renewal sentence.
  2. FREE user exhausts a limit (e.g. CV_OPTIMIZATION) → quota error toast shows an upgrade message with no date; limit stays exhausted regardless of elapsed time (no reset).
  3. Upgrade to BASIC/PRO via Stripe test checkout → settings page shows "renews on {Stripe's real currentPeriodEnd}", matching the Stripe test dashboard.
  4. Cancel-at-period-end via billing portal → copy switches to "will end on {date}".
  5. Force `customer.subscription.deleted` → subscription flips to FREE with `currentPeriodStart = now`, `currentPeriodEnd = null`.
  6. Trigger a CV optimization as a fresh FREE user → `UsageQuota.periodStart` matches `Subscription.currentPeriodStart`, not the 1st of the calendar month.
