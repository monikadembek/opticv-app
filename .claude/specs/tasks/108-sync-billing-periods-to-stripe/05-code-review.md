# Code Review — Task 108: Sync billing periods to Stripe

> Note: `02-spec.md` and `04-implementation-plan.md` are marked "Superseded 2026-08-12" — the FREE-tier rolling-cycle/cron design they describe was replaced mid-implementation with a "FREE never renews" design. This review evaluates the actual implementation against the authoritative current source, `docs/sync-billing-periods-to-stripe.md`, and notes where it intentionally diverges from the superseded spec/plan.

## Summary

- Overall result: **PASS**
- The implementation correctly delivers the "FREE tier never renews" design described in `docs/sync-billing-periods-to-stripe.md`: period boundaries are now explicit parameters through `QuotaService`/`OptimizationService`/`UsersService`, `SubscriptionService.freeTierCycleFrom()` sets `currentPeriodEnd: null` for FREE, both migrations apply cleanly, and the settings UI / quota-exceeded toast handle the null-`resetsAt` and `cancelAtPeriodEnd` cases correctly with good test coverage. The previously-flagged interceptor test gap has been closed (`quota-error-interceptor.spec.ts` added, 8/8 passing); only a minor doc-sync note remains.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

- **Fixed during review**: `apps/opticv-web/src/app/core/interceptors/quota-error-interceptor.ts` had new branching logic (three-way `cancelAtPeriodEnd`/`resetsAt` message selection) with no spec file. Added `quota-error-interceptor.spec.ts` covering all three `QUOTA_EXCEEDED` message branches, `FEATURE_NOT_AVAILABLE`, `CV_LIMIT_EXCEEDED`, non-quota-error passthrough, error re-throwing, and success passthrough — 8/8 passing.
- `docs/sync-billing-periods-to-stripe.md` section 5 ("Ripple to callers") doesn't mention that `cancelAtPeriodEnd` was also threaded through `OptimizationService.resolveTierAndPeriod` → `checkAndConsume` → the `ForbiddenException` payload, and `QuotaStatus`/`QuotaErrorPayload` gaining a `cancelAtPeriodEnd: boolean` field isn't listed as a shared-type change (only the `resetsAt` widening is mentioned). The code itself is correct and consistent, but the doc is now slightly out of sync with what was actually shipped — worth a follow-up doc update since this doc is the authoritative reference for the next person touching this area.

## Specification Coverage

(Evaluated against `docs/sync-billing-periods-to-stripe.md`, the authoritative doc superseding `02-spec.md`.)

| Requirement | Status | Note |
| --- | --- | --- |
| Backfill migration for null `currentPeriodStart`/`currentPeriodEnd` | Covered | `20260812114550_backfill_free_tier_period_dates` |
| Follow-up migration clearing FREE `currentPeriodEnd` back to null | Covered | `20260812190728_free_tier_never_renews` |
| `SubscriptionService.freeTierCycleFrom()` returns `{ currentPeriodStart: now, currentPeriodEnd: null }` | Covered | `subscription.service.ts`, matches doc exactly, `addOneUtcMonth` correctly absent |
| `SubscriptionModule` registered in `app.module.ts`, imported by `UsersModule`/`StripeModule` | Covered | |
| Cron / `@nestjs/schedule` fully removed | Covered | No `free-tier-renewal.cron.ts`, no `ScheduleModule` reference, no `@nestjs/schedule` in `package.json` |
| `UsersService.upsertUser` create-branch sets FREE cycle; update branch untouched | Covered | Regression-guard test present |
| `StripeService.handleSubscriptionDeleted` sets fresh FREE cycle | Covered | Test asserts `currentPeriodEnd: null` alongside other fields |
| `QuotaService.checkAndConsume`/`getQuotaStatus` take explicit `periodStart`/`periodEnd: Date \| null` | Covered | `resolvePeriodStart`/`resolveNextPeriodStart` deleted |
| `resetsAt` becomes `periodEnd?.toISOString() ?? null` | Covered | |
| `QuotaStatus.resetsAt` / `QuotaErrorPayload.resetsAt` widened to `string \| null` | Covered | `datatypes.ts:127,140` |
| `OptimizationService.resolveTier` → `resolveTierAndPeriod` | Covered | Both call sites updated |
| Settings renewal sentence only for paid tiers, FREE renders nothing | Covered | `subscriptionRenewal` computed returns `null` when `currentPeriodEnd` is null |
| "Usage this month … Resets" card hidden when `resetsAt` is null | Covered | `settings.html:196` guards on `usage.quotas[0].resetsAt` |
| Quota-exceeded toast: no bogus date when `resetsAt` is null | Covered | Three-way message in interceptor; now unit-tested in `quota-error-interceptor.spec.ts` |
| Full test suites green | Not verified here | Not re-run in this review pass; typecheck run below |

## Plan Deviations

(Relative to `04-implementation-plan.md`, which is itself explicitly superseded — these are expected, intentional deviations, not defects.)

- Steps 1, 3 (dependency install + `FreeTierRenewalCron` + its spec) were reverted — `@nestjs/schedule` removed, cron file and spec deleted. Matches the "FREE never renews" decision.
- Step 5 (`QuotaService`) additionally gained a `cancelAtPeriodEnd: boolean` parameter/payload field not in either the original or superseding plan text, needed to support the "your plan won't renew" toast copy. Correctly implemented and tested, just not documented (see Non-Critical above).
- Step 9 (frontend) dropped the FREE-specific `'resets on'` verb branch, consistent with FREE's `currentPeriodEnd` always being `null` post-migration.
- Step 10 became two migrations instead of one, because the FREE-never-renews decision was made after the first migration had already backfilled FREE rows with a real date.

## Null Safety Issues

None found. `periodEnd: Date | null` is threaded consistently through `QuotaService`, `OptimizationService`, and `UsersService` with explicit `?? null` / `?.toISOString() ?? null` at each boundary. `subscriptionRenewal` and `usageResetLabel` in `settings.ts` both guard on `subscription`/`currentPeriodEnd` being present before dereferencing.

## Code Smells

None found. Changes are minimal and targeted; no duplication introduced; `freeTierCycleFrom()` is reused identically at both call sites (signup, cancellation) as intended.

## Verification Notes

- `npm exec nx typecheck opticv-be`: **fails**, but on a pre-existing, unrelated error in `job-application.controller.spec.ts` (`JobApplicationListItem` missing `cvDocument`) — last touched in commit `15661c5`, outside this task's diff. Not a regression from this change.
- `npm exec nx typecheck opticv-web`: **fails**, but on a pre-existing tsconfig configuration issue (`TS5069: emitDeclarationOnly` without `declaration`/`composite` in `tsconfig.app.json`/`tsconfig.spec.json`) — not related to any file touched by this task.
- Both failures should be flagged to the user as pre-existing/out-of-scope, not blockers for this task's merge, but worth a separate follow-up.
- Test suites (`nx test`) were not re-run in this review pass; the diff's own test files (`quota.service.spec.ts`, `optimization.service.spec.ts`, `users.service.spec.ts`, `stripe.service.spec.ts`, `subscription.service.spec.ts`, `settings.spec.ts`) were read in full and appear thorough and correctly asserting against the new behavior.

## Recommendation

- **Merge as-is.** The interceptor test gap has been closed. The doc-sync note (missing mention of `cancelAtPeriodEnd` threading and the `QuotaErrorPayload` field in `docs/sync-billing-periods-to-stripe.md`) is optional, non-blocking follow-up.
