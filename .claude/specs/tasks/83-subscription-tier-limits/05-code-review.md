# Code Review — Task 83: Subscription Tier Limits

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation faithfully follows the spec and plan: tier enum migration, `TIER_LIMITS` single source of truth, `QuotaService` with atomic check-and-consume, free-retry endpoint bypassing quota, CV upload cap, usage-status endpoint, and frontend gating/interceptor are all present and largely correct. Issues found are non-blocking but should be addressed: a `getQuotaStatus`/`checkAndConsume` period-boundary inconsistency risk, a minor duplication between `optionDisabled` handling in `export-footer` vs `isLocked` in `cv-template-selector`, and a couple of null-safety/DX gaps.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. **`apps/opticv-be/src/app/quota/quota.service.ts` (`checkAndConsume` / `getQuotaStatus`)** — `resolvePeriodStart()` is called independently in both methods (and independently within the same request in `optimization.service.ts`'s callers vs `quota.service.ts`). Since it's based on `new Date()` at call time, a request straddling a UTC-month boundary (however unlikely in practice) could compute two different `periodStart` values across the upsert and the `resetsAt` calculation in the same call — low risk given both reads happen within the same synchronous `checkAndConsume` execution, but worth a one-line comment noting the assumption, since the spec explicitly calls out month-boundary rollover as an edge case (spec line 100).

2. **`apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`** — `templates` computed rebuilds the label string (`${template.name} (Upgrade to unlock)`) for locked templates, while `cv-template-selector.ts` uses a separate `isLocked()` + lock icon approach for the same underlying gating concept (`allowedTemplateIds`). Two different UI patterns for the same tier-gating idea in sibling components under the same feature — not wrong, but a minor consistency/duplication smell the plan didn't explicitly call out either way.

3. **`apps/opticv-be/src/app/quota/quota.service.ts`** — `checkAndConsume` and `getQuotaStatus` both duplicate the `resolveNextPeriodStart` calculation and the `TIER_LIMITS[tier].features[feature]` lookup pattern. Minor; acceptable given the class is small, but a shared private helper (e.g., `resolveWindow()`) would remove the duplication if this file grows.

## Specification Coverage

| Requirement | Status | Note |
| ----------- | ------ | ---- |
| `SubscriptionTier` → `FREE \| BASIC \| PRO` (shared types, Prisma, Swagger) | Covered | `datatypes.ts`, `schema.prisma`, `user-profile.dto.ts` all updated consistently. |
| `TIER_LIMITS` single source of truth | Covered | `datatypes.ts` — used by both `QuotaService` and frontend (`cv-optimization.ts`, `cv-template-selector`, `export-footer`). |
| `UsageQuota` table + `LimitedFeature` enum | Covered | Migration + schema match spec's field list, unique/index constraints. |
| Decouple `triggerOptimization` to CV-subset only | Covered | `CV_SUBSET_PROMPT_TYPES` replaces `ALL_PROMPT_TYPES`; tests confirm 4 jobs enqueued, cover-letter/interview/linkedin excluded. |
| Quota enforcement at CV optimization, cover letter, interview prep, LinkedIn triggers | Covered | `checkAndConsume` called in `triggerOptimization` and `triggerSingleJob` via `PROMPT_TYPE_TO_FEATURE` map. |
| CV upload cap enforcement | Covered | `cv.service.ts` checks `activeCount >= maxStoredCvs` before any R2 upload, throws `CV_LIMIT_EXCEEDED`. |
| Free retry of failed jobs, no quota check | Covered | `retryFailedJob` validates `status === 'FAILED'`, resets to `PENDING`, re-enqueues without `checkAndConsume`; rejects `COMPLETED`/missing rows. |
| Atomic check-and-increment (race-safe) | Covered | `$transaction` with upsert + conditional `updateMany({ where: { id, count: { lt: limit } } })`, checks affected-row count. |
| Monthly reset = calendar month, uniform across tiers | Covered | `resolvePeriodStart()` uses UTC first-of-month. |
| `GET users/me/usage` endpoint | Covered | `UsersController.getUsageStatus` → `UsersService.getUsageStatus` → `QuotaService.getQuotaStatus` + stored-CV count. |
| Error codes `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` / `CV_LIMIT_EXCEEDED` with `{feature, limit, resetsAt}` / `{limit}` payload | Covered | `QuotaErrorPayload` discriminated union in datatypes; thrown via `ForbiddenException` with object body in all three call sites. |
| Frontend: template gating by tier | Covered | `cv-template-selector` (`isLocked`, disabled + aria-disabled, keyboard nav skip) and `export-footer` (`optionDisabled`) both gate off `allowedTemplateIds`, sourced from `TIER_LIMITS` in `cv-optimization.ts`. |
| Frontend: default template never lands on locked one for FREE | Covered | `effect()` in `cv-optimization.ts` resets `selectedTemplate` when it falls outside `allowedTemplateIds()`; covered by test "resets selectedTemplate away from a now-locked template". |
| Frontend: usage panel on settings page | Covered | `settings.html`/`settings.ts` render `usage.quotas` + `storedCvs` via new `usageStatus` resource. |
| Frontend: distinct quota-error messaging + upgrade prompt | Covered | `quota-error-interceptor.ts` handles all three codes with distinct toast copy. |
| Frontend: Retry vs Re-generate visually/functionally distinct | Partial | `cv-optimization.ts` `retryOptimization()` now calls `retryFailedJob` instead of `runSingleOptimizationProcess` (functionally correct — free retry, no quota check). However, the review did not find a UI-visible change distinguishing a "Retry" affordance from "Re-generate" beyond the existing button reused for retry — worth confirming the template/label still clearly says "Retry" for `FAILED` rows specifically (not inspected in this diff since `cv-optimization.html`'s retry-button markup itself wasn't shown as changed, meaning the button already existed pre-task and this task only rewired its handler). Not a defect, but confirm manually per spec Acceptance item 2. |
| Swagger enum update | Covered | `user-profile.dto.ts`. |
| Prisma migration generated, not auto-applied | Covered | Migration file present under `prisma/migrations/20260713125454_subscription_limits/`; per commit `ea6f0fb` message ("run migration") the user has already applied it locally — consistent with spec's "applied manually by the user." |
| Backend unit tests (`QuotaService`, `retryFailedJob`, upload cap) | Covered | `quota.service.spec.ts`, `optimization.service.spec.ts`, `cv.service.spec.ts` all have the required cases. |
| Frontend tests updated (`settings.spec.ts`, `cv-template-selector.spec.ts`) | Covered | Both extended with BASIC/PRO and locking cases as required. |

## Plan Deviations

- **`user-settings-api.service.ts` moved to `core/services/`** rather than staying in `features/settings/services/` as the plan's "Files Planned" section implied (plan line 220 lists it under the settings feature path). This is a reasonable and disclosed deviation — commit `b21c907` explicitly states the motivation ("so it can be shared among different features"), and it's consumed by both `settings.ts` and `cv-upload-api.service.ts`/`cv-optimization.ts`. Not a violation, just noting the path differs from the plan's file list.
- **Retry route path**: plan (line 95) suggested `POST job-applications/:jobApplicationId/retry/:promptType`; actual implementation is `POST optimizations/job-applications/:jobApplicationId/retry/:promptType` (the `optimizations` prefix comes from the existing `@Controller('optimizations')` base, which the plan's route sketch omitted). This is consistent with existing controller conventions, not a real deviation — just the plan's route sketch being relative to the controller's base path.
- No other factual deviations found; the `runId`-dropped-from-retry decision documented in the plan's "Resolved Review Issues" section is correctly reflected in the implementation (`retryFailedJob(jobApplicationId, promptType, userId)`, no `runId` param).

## Null Safety Issues

None. Tier resolution consistently defaults to `'FREE'` via `subscription?.tier ?? 'FREE'` pattern in `cv.service.ts`, `optimization.service.ts` (`resolveTier`), and `users.service.ts` (`getUsageStatus`). Frontend `allowedTemplateIds` computed in `cv-optimization.ts` defaults to `'FREE'` when `userProfile.value()?.subscription?.tier` is undefined, consistent with backend default.

## Code Smells

- Minor duplication noted above (quota period/limit lookup logic in `quota.service.ts`; parallel gating implementations in `cv-template-selector.ts` vs `export-footer.ts`). Neither rises to a must-fix; both are small, single-responsibility files well under the 1000-line limit.
- No magic values of concern — tier limits are centralized in `TIER_LIMITS`; feature labels in `settings.ts` are a small local `Record` map, appropriately scoped to the component.

## Recommendation

- **Fix critical issues before merge** — none are critical; only non-critical items listed above (optional polish) — so this effectively reads as **Merge as-is**, with a manual-verification callout on the Retry-vs-Re-generate UI distinction (spec Acceptance item 2) before considering the task fully done.
