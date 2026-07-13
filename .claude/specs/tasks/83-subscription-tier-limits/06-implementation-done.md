# Implementation Done — Task 83: Subscription Tier Limits

## Summary

Delivered enforced monthly usage limits and feature gating for three subscription tiers (`FREE`, `BASIC`, `PRO`), replacing the previous `PRO_ANNUAL`/`SPRINT` values. `TIER_LIMITS` was added as a single source of truth in `@opticv/datatypes`. Backend quota enforcement (check + atomic consume) was wired into CV optimization triggers, cover letter/interview prep/LinkedIn triggers, and CV upload, via a new `QuotaService` and `UsageQuota` Prisma model. A free-retry path (`retryFailedJob`) was added that bypasses quota checks for `FAILED` `OptimizationResult` rows. A new `GET users/me/usage` endpoint returns per-feature quota status and stored-CV usage. Frontend changes gate the CV template selector and export-footer template select by tier, display usage on the settings page, and surface distinct toast messages for `QUOTA_EXCEEDED`, `FEATURE_NOT_AVAILABLE`, and `CV_LIMIT_EXCEEDED` via a new HTTP interceptor. The Prisma migration was generated and, per the raw task and plan, applied by the user (commit message states "run migration").

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `SubscriptionTier` changed to `FREE \| BASIC \| PRO` (datatypes) | Implemented | `datatypes.ts:73` |
| `SubscriptionTier` enum changed in Prisma schema | Implemented | `schema.prisma:15-19` |
| Swagger enum updated in `user-profile.dto.ts` | Implemented | `['FREE', 'BASIC', 'PRO']` |
| `TIER_LIMITS` single source of truth in `@opticv/datatypes` | Implemented | `datatypes.ts:87-118` |
| `LimitedFeature` type/enum (shared + Prisma) | Implemented | `datatypes.ts:75-79`, `schema.prisma:21-26` |
| `UsageQuota` model (userId, feature, periodStart, count) with unique/index constraints | Implemented | `schema.prisma:207-221` |
| `User.usageQuotas` relation | Implemented | `schema.prisma:79` |
| `triggerOptimization` enqueues only 4 CV-subset prompt types, consumes one `CV_OPTIMIZATION` unit | Implemented | `optimization.service.ts:17-22, 50-109` |
| `triggerSingleJob` maps promptType → feature, consumes quota before enqueue | Implemented | `optimization.service.ts:111-163` |
| Quota check at CV optimization, cover letter, interview prep, LinkedIn triggers | Implemented | via `PROMPT_TYPE_TO_FEATURE` + `checkAndConsume` |
| LinkedIn unavailable on FREE (limit 0 → `FEATURE_NOT_AVAILABLE`, not `QUOTA_EXCEEDED`) | Implemented | `quota.service.ts:30-37` |
| Atomic check-and-increment (race-safe) | Implemented | `quota.service.ts:39-52` (transaction + conditional `updateMany`) |
| CV file upload cap enforcement | Implemented | `cv.service.ts:60-75` |
| Free retry of `FAILED` `OptimizationResult` rows without quota check | Implemented | `optimization.service.ts:165-218` |
| Retry rejects on `COMPLETED` or missing row | Implemented | `optimization.service.ts:182-186` |
| Retry endpoint (no `runId` in request body, per resolved plan decision) | Implemented | `POST job-applications/:jobApplicationId/retry/:promptType` |
| Monthly reset window = calendar month, uniform across tiers | Implemented | `quota.service.ts:10-13` |
| `GET users/me/usage` endpoint | Implemented | `users.controller.ts:94-105` |
| `QuotaService.resolvePeriodStart/checkAndConsume/getQuotaStatus` | Implemented | `quota.service.ts` |
| No refund method on `QuotaService` | Implemented | Confirmed absent |
| Machine-readable error codes (`QUOTA_EXCEEDED`, `FEATURE_NOT_AVAILABLE`, `CV_LIMIT_EXCEEDED`) with payload | Implemented | `quota.service.ts`, `cv.service.ts` |
| Prisma migration generated (not auto-applied by Claude) | Implemented | `migrations/20260713125454_subscription_limits/migration.sql`; per commit history the migration was subsequently run |
| Frontend: CV template selector gated by tier, locked/disabled with upgrade affordance | Implemented | `cv-template-selector.ts/.html` |
| Frontend: default template never lands on a locked one for FREE users | Implemented | `cv-optimization.ts:425-429` (effect resets selection if not in allowed set) |
| Frontend: export-footer template select also gated | Implemented | `export-footer.ts:49-57` (disabled options, "(Upgrade to unlock)" label) — not explicitly listed in plan's file list but within spec scope |
| Frontend: usage panel on settings page (used/limit, resetsAt, stored CVs) | Implemented | `settings.html:59-84` |
| Frontend: distinct quota-error messaging via interceptor | Implemented | `quota-error-interceptor.ts` |
| Frontend: Retry action distinct from Re-generate | Implemented | `cv-optimization.ts:371-397`, `retryOptimization()`; `cv-optimization.html` renders "Retry" only when `retryablePromptTypes()` includes the prompt type |
| Backend unit tests: `QuotaService` (limit reached, increment, month rollover, feature unavailable) | Implemented | `quota.service.spec.ts` |
| Backend unit tests: `retryFailedJob` (free retry, rejects on COMPLETED/missing) | Implemented | `optimization.service.spec.ts:343-420` |
| Backend unit tests: `CvService.uploadCv` (cap enforcement) | Implemented | `cv.service.spec.ts:223-260` |
| Frontend tests: `settings.spec.ts` BASIC/PRO coverage | Implemented | `settings.spec.ts:170-200` |
| Frontend tests: `cv-template-selector.spec.ts` locked/unlocked cases | Implemented | `cv-template-selector.spec.ts:157-191` |

## Files

### Created
- `apps/opticv-be/src/app/quota/quota.module.ts`
- `apps/opticv-be/src/app/quota/quota.service.ts`
- `apps/opticv-be/src/app/quota/quota.service.spec.ts`
- `apps/opticv-be/prisma/migrations/20260713125454_subscription_limits/migration.sql`
- `apps/opticv-web/src/app/core/interceptors/quota-error-interceptor.ts`
- `docs/subscription-tier-limits.md`
- `.claude/specs/tasks/83-subscription-tier-limits/00-raw-task.md`, `02-spec.md`, `03-spec-review.md`, `04-implementation-plan.md`

### Modified
- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/prisma/schema.prisma`
- `apps/opticv-be/src/app/users/dto/user-profile.dto.ts`
- `apps/opticv-be/src/app/users/users.controller.ts`
- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-be/src/app/users/users.module.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.ts`
- `apps/opticv-be/src/app/optimization/optimization.module.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.spec.ts`
- `apps/opticv-be/src/app/cv/cv.service.ts`
- `apps/opticv-be/src/app/cv/cv.service.spec.ts`
- `apps/opticv-web/src/app/app.config.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `apps/opticv-web/src/app/features/upload-cv/services/cv-upload-api.service.spec.ts`
- `docs/tasks-list.md`

### Moved
- `apps/opticv-web/src/app/features/settings/services/user-settings-api.service.ts` → `apps/opticv-web/src/app/core/services/user-settings-api.service.ts`
- `apps/opticv-web/src/app/features/settings/services/user-settings-api.service.spec.ts` → `apps/opticv-web/src/app/core/services/user-settings-api.service.spec.ts`

## Components

| Component | Status |
|---|---|
| `QuotaModule` | Exist |
| `QuotaService` | Exist |
| `CvTemplateSelector` (tier gating) | Exist |
| `ExportFooter` (tier gating) | Exist |
| `quotaErrorInterceptor` | Exist |
| `Settings` (usage panel) | Exist |

## Stores

No new NgRx Signal Store was introduced. Usage/quota state is held in `UserSettingsApiService` resources (`userProfile`, `usageStatus`) and local component signals — consistent with the plan, which did not specify a dedicated store for this task.

## Deviations

- `user-settings-api.service.ts` was moved from `features/settings/services/` to `core/services/` (not listed in the plan's file list). Commit message: "Move user settings api service to core folder so it can be shared among different features."
- The plan's file list did not explicitly name `export-footer.ts`/`.html`/`.spec.ts` for template gating, but the plan's scope ("wherever CV optimization ... triggers are called from the frontend") covers it; `ExportFooter` received the same `allowedTemplateIds` gating pattern as `CvTemplateSelector`.
- The retry endpoint route is `POST job-applications/:jobApplicationId/retry/:promptType`, matching the plan's suggested naming (`run/:promptType` sibling), with no request body (`runId` dropped per the plan's "Resolved Review Issues" section).
- `retryFailedJob` signature is `(jobApplicationId, promptType, userId)` — matches the plan's resolved decision to drop `runId`, differing from the original `02-spec.md` draft signature that included `runId`.

## Additional Implementation

None.
