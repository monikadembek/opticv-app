# Implementation Done — Task 108: Sync billing periods to Stripe

> Note: `02-spec.md` and `04-implementation-plan.md` are marked "Superseded 2026-08-12." They documented the original cron-driven rolling FREE-tier cycle design. Mid-implementation, the design changed to "FREE tier never renews" (no cron, `currentPeriodEnd = null` for FREE, set once at signup). The authoritative record of what was actually agreed and delivered is `docs/sync-billing-periods-to-stripe.md`. Specification Coverage below is assessed against the original `02-spec.md` requirements, marking items `Implemented`, `Not implemented`, or `Implemented (superseded)` where the delivered behavior intentionally differs per the documented design change.

## Summary

Billing/usage periods now reflect real subscription cycles instead of calendar-month guesses. `QuotaService` and `OptimizationService` accept explicit `periodStart`/`periodEnd` (nullable) boundaries sourced from each user's `Subscription` row rather than computing a calendar month. A new `SubscriptionService.freeTierCycleFrom()` helper sets `currentPeriodStart = now()`, `currentPeriodEnd = null` for FREE tier at signup and on downgrade-to-FREE via Stripe cancellation; FREE never renews and has no cron. Two data migrations backfill and then correct existing rows. The settings page renewal sentence and the quota-exceeded toast were both updated to read real period data and handle the null-`currentPeriodEnd`/`cancelAtPeriodEnd` cases without showing bogus dates.

## Specification Coverage

| Requirement (from `02-spec.md`) | Status | Note |
| --- | --- | --- |
| Settings page shows real `Subscription.currentPeriodEnd`, not calendar-month guess | Implemented | `settings.ts` `subscriptionRenewal` computed signal, sourced from `userProfile().subscription` |
| `UsageQuota.periodStart` anchored to `Subscription.currentPeriodStart` | Implemented | `QuotaService.checkAndConsume`/`getQuotaStatus` take `periodStart` as an explicit param sourced from the subscription row |
| FREE tier gets its own cycle, anchored to signup date | Implemented | `SubscriptionService.freeTierCycleFrom()` sets `currentPeriodStart = now()` at signup |
| FREE tier cycle advanced by a daily cron job (`FreeTierRenewalCron`) | Implemented (superseded) | Cron was built, then deleted; FREE tier does not renew at all — `currentPeriodEnd` stays `null` until upgrade. See `docs/sync-billing-periods-to-stripe.md` §3 |
| Migration backfills existing null `currentPeriodStart`/`currentPeriodEnd` rows | Implemented | `20260812114550_backfill_free_tier_period_dates` (`COALESCE`-based, data-only) |
| `SubscriptionModule`/`SubscriptionService` with `addOneUtcMonth`, `freeTierCycleFrom` | Implemented (superseded) | `SubscriptionService` created; `addOneUtcMonth` was not retained — removed as unnecessary once FREE stopped rolling over. `freeTierCycleFrom` returns `{ currentPeriodStart: now, currentPeriodEnd: null }` |
| `QuotaService`: remove calendar-month computation, accept explicit `periodStart`/`periodEnd` params | Implemented | `resolvePeriodStart`/`resolveNextPeriodStart` deleted; `checkAndConsume`/`getQuotaStatus` take `periodStart: Date`, `periodEnd: Date \| null` |
| Callers (`optimization.service.ts`, `users.service.ts`) source period boundaries from `Subscription` row | Implemented | `OptimizationService.resolveTierAndPeriod`, `UsersService.getUsageStatus` |
| `UsersService.upsertUser`: new FREE signups get period dates via `freeTierCycleFrom()`; existing rows never overwritten | Implemented | `create` branch only; `update: {}` branch untouched, regression-tested |
| `StripeService.handleSubscriptionDeleted`: fresh FREE cycle on cancellation | Implemented | `...this.subscriptionService.freeTierCycleFrom()` spread into the update payload |
| Settings page: three copy states (paid active, paid canceling, FREE) | Implemented (superseded) | Paid active ("renews on") and paid canceling ("will end on") implemented as specified; the FREE "resets on" state was removed as unreachable dead code, since FREE's `currentPeriodEnd` is always `null` under the revised design — FREE now renders no sentence at all |
| Test updates/additions per file, as enumerated in spec's Acceptance section | Implemented | See Files below; additionally includes a new `quota-error-interceptor.spec.ts` not enumerated in the original spec (component didn't need behavioral changes under the original cron-based design) |
| No Prisma schema structural change | Implemented | `currentPeriodStart`/`currentPeriodEnd` remain nullable `DateTime?` |
| No changes to Stripe webhook handlers other than `handleSubscriptionDeleted` | Implemented | `handleSubscriptionUpdated` gained an unrelated `cancelAtPeriodEnd` fix (see Additional Implementation) |
| No REST endpoint/route changes; no new public API surface | Implemented | |
| No shared-type changes (per original spec) | Not implemented (superseded) | `QuotaStatus.resetsAt`/`QuotaErrorPayload.resetsAt` widened to `string \| null`; `QuotaErrorPayload` gained `cancelAtPeriodEnd: boolean` — required by the revised nullable-`periodEnd` design, not present in the original spec |

## Files

**Created:**
- `apps/opticv-be/src/app/subscription/subscription.module.ts`
- `apps/opticv-be/src/app/subscription/subscription.service.ts`
- `apps/opticv-be/src/app/subscription/subscription.service.spec.ts`
- `apps/opticv-be/prisma/migrations/20260812114550_backfill_free_tier_period_dates/migration.sql`
- `apps/opticv-be/prisma/migrations/20260812190728_free_tier_never_renews/migration.sql`
- `apps/opticv-web/src/app/core/interceptors/quota-error-interceptor.spec.ts`
- `docs/sync-billing-periods-to-stripe.md`

**Modified:**
- `apps/opticv-be/package.json`
- `apps/opticv-be/src/app/app.module.ts`
- `apps/opticv-be/src/app/quota/quota.service.ts`, `quota.service.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`, `optimization.service.spec.ts`
- `apps/opticv-be/src/app/users/users.module.ts`, `users.service.ts`, `users.service.spec.ts`
- `apps/opticv-be/src/app/stripe/stripe.module.ts`, `stripe.service.ts`, `stripe.service.spec.ts`
- `apps/opticv-web/src/app/core/interceptors/quota-error-interceptor.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`, `settings.ts`, `settings.spec.ts`
- `packages/shared/datatypes/src/lib/datatypes.ts`
- `docs/tasks-list.md`

**Deleted (created then removed within the branch's history):**
- `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.ts`
- `apps/opticv-be/src/app/subscription/free-tier-renewal.cron.spec.ts`

## Components

| Component (per `04-implementation-plan.md`) | Status |
| --- | --- |
| `SubscriptionService` | Exist |
| `SubscriptionModule` | Exist |
| `FreeTierRenewalCron` | Missing (removed — superseded by "FREE never renews" design) |
| `QuotaService` (modified signatures) | Exist |
| `OptimizationService.resolveTierAndPeriod` | Exist |
| `UsersService` (FREE signup cycle, usage status pass-through) | Exist |
| `StripeService` (fresh FREE cycle on cancellation) | Exist |
| Settings `subscriptionRenewal` computed signal | Exist |
| `quota-error-interceptor` (`cancelAtPeriodEnd`/null-`resetsAt` branching) | Exist |

## Stores

Not applicable — no NgRx Signal Store changes were part of this task's scope.

## Deviations

- `SubscriptionService.addOneUtcMonth` (planned pure helper for monthly UTC date math) was not implemented — only `freeTierCycleFrom` exists, since FREE tier no longer advances through cycles.
- `FreeTierRenewalCron` and its spec were created (per the original plan) and subsequently deleted, along with the `@nestjs/schedule` dependency and `ScheduleModule.forRoot()` registration in `app.module.ts`.
- `QuotaService.checkAndConsume` gained a third parameter, `cancelAtPeriodEnd: boolean`, not present in either `02-spec.md` or `04-implementation-plan.md`'s original signature.
- `OptimizationService.resolveTierAndPeriod` returns an additional `cancelAtPeriodEnd` field beyond the planned `{ tier, periodStart, periodEnd }` shape.
- `QuotaStatus.resetsAt`/`QuotaErrorPayload.resetsAt` in `packages/shared/datatypes/src/lib/datatypes.ts` were widened to `string | null`, and `QuotaErrorPayload` gained a `cancelAtPeriodEnd: boolean` field — the original spec stated no shared-type changes were needed.
- The frontend settings renewal sentence's FREE-tier "resets on" branch, present in the original spec/plan, was removed from `settings.ts`/`settings.html` as unreachable code once FREE's `currentPeriodEnd` is always `null`.
- Migration delivered as two files instead of one: `20260812114550_backfill_free_tier_period_dates` (original backfill, sets a real `currentPeriodEnd` for FREE) followed by `20260812190728_free_tier_never_renews` (clears `currentPeriodEnd` back to `null` for all FREE rows), because the never-renews decision was made after the first migration had already been applied.

## Additional Implementation

> Additional implementation not covered by the original documents.

- `StripeService.handleSubscriptionUpdated`: `cancelAtPeriodEnd` is now computed as `subscription.cancel_at_period_end || subscription.cancel_at != null` instead of `subscription.cancel_at_period_end` alone, so billing-portal cancellations that populate `cancel_at` without setting `cancel_at_period_end` are correctly reflected in the database.
- `apps/opticv-web/src/app/core/interceptors/quota-error-interceptor.ts`: the `QUOTA_EXCEEDED` toast message now branches three ways (canceling-with-date, active-with-date, no-date/upgrade-only) instead of the original single always-dated message, and gained a dedicated spec file (`quota-error-interceptor.spec.ts`) covering all branches plus `FEATURE_NOT_AVAILABLE`, `CV_LIMIT_EXCEEDED`, and pass-through behavior.
- `settings.html`/`settings.ts`: added `usageResetLabel` computed signal so the "Usage this month" card shows "Access ends" instead of "Resets" when the subscription is canceling at period end; the usage card's "Resets" line is now conditional on `resetsAt` being non-null (previously always rendered).
- `docs/sync-billing-periods-to-stripe.md` created as the authoritative design record superseding `02-spec.md`/`04-implementation-plan.md`, documenting the FREE-never-renews decision and its full ripple effects.
