# Implementation Done: 110-handle-past-due-status

## Summary

Implemented a shared `getEffectiveTier(tier, status)` helper in `@opticv/datatypes` that resolves a subscription's effective tier to `FREE` whenever `status` is not `ACTIVE` or `TRIALING`. Applied it at the two backend quota/limit call sites (`OptimizationService.resolveTierAndPeriod`, `UsersService.getUsageStatus`) and the frontend template-gating computed signal (`cv-optimization.ts`'s `allowedTemplateIds`). Added a new standalone `PastDueBanner` component rendered in the app shell between `app-top-header` and `<main>`, visible when the user's subscription `status` is `PAST_DUE`, dismissible for the current page view, with a "Manage billing" action that opens the Stripe billing portal via `UserSettingsApiService.createPortalSession()`. Unit tests were added/updated for the helper, both backend services, `allowedTemplateIds`, and the new banner component.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Shared `getEffectiveTier(tier, status)` helper in `@opticv/datatypes`, colocated with `TIER_LIMITS` | Implemented | `packages/shared/datatypes/src/lib/datatypes.ts:151-156` |
| `OptimizationService.resolveTierAndPeriod` reads `status` and computes effective tier before `QuotaService.checkAndConsume` | Implemented | `apps/opticv-be/src/app/optimization/optimization.service.ts:46-74`; applies to both `triggerOptimization` and `triggerSingleJob` call sites |
| `UsersService.getUsageStatus` computes effective tier once, reused for `TIER_LIMITS[...].maxStoredCvs` and `QuotaService.getQuotaStatus` | Implemented | `apps/opticv-be/src/app/users/users.service.ts:205-219` |
| `QuotaService` remains status-agnostic (no changes) | Implemented | `quota.service.ts` / `quota.service.spec.ts` not modified |
| `UserProfile.subscription` (via `getProfile`, `updateDisplayName`, `updateNotificationPreference`) continues to expose raw `tier`/`status` | Implemented | No changes made to these three methods in `users.service.ts` |
| Frontend `allowedTemplateIds` computed from effective tier | Implemented | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts:228-238` |
| Global `PastDueBanner` rendered between `app-top-header` and `<main>`, visible when `status === 'PAST_DUE'` | Implemented | `apps/opticv-web/src/app/app.html:6`; `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.ts` |
| Banner "Manage billing" button triggers `createPortalSession()` and redirects via `window.location.href` | Implemented | `past-due-banner.ts:34-56` |
| Banner shows error toast via `MessageService` on `createPortalSession()` failure, stays visible | Implemented | `past-due-banner.ts:40-51` |
| Banner dismissible via close button, in-memory signal only (no storage), resets on reload | Implemented | `past-due-banner.ts:24,58-60` |
| Banner renders nothing when no subscription / not authenticated | Implemented | `visible` computed guards on `userProfile.value()?.subscription?.status` |
| Unit tests for `getEffectiveTier` across `SubscriptionStatus` values | Implemented | `packages/shared/datatypes/src/lib/datatypes.spec.ts:31-46` |
| Updated `optimization.service.spec.ts` for `PAST_DUE`/`PRO` → `FREE` quota | Implemented | Covers both `triggerOptimization` (lines 191-213) and `triggerSingleJob` (lines 410-432) |
| Updated `users.service.spec.ts` for `getUsageStatus` returning `FREE` limits under `PAST_DUE` | Implemented | `users.service.spec.ts:461-482` |
| New spec for `PastDueBanner` (visible/hidden/dismiss/manage billing) | Implemented | `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.spec.ts` |
| Updated `cv-optimization.spec.ts` for `allowedTemplateIds` under `PAST_DUE` | Implemented | `cv-optimization.spec.ts:1087-1092` |

## Files

### Created

- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.ts`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.html`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.css`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.spec.ts`
- `packages/shared/datatypes/src/lib/datatypes.spec.ts`

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`
- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/app.html`
- `apps/opticv-web/src/app/app.ts`
- `apps/opticv-web/src/app/app.spec.ts`

## Components

| Component | Status |
| --- | --- |
| `PastDueBanner` (`apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.ts`) | Exist |

## Stores

Not applicable — no store changes were part of this task's plan.

## Deviations

- The implementation plan's Step 6 listed `TRIALING` and `CANCELED` as required "hidden" test cases for `past-due-banner.spec.ts`; the delivered spec file covers `ACTIVE`, `null` subscription, and not-yet-loaded as hidden cases, but does not include explicit `TRIALING` or `CANCELED` test cases.
- `app.spec.ts` was modified to stub `PastDueBanner` in the `App` component's test module (not explicitly listed in the plan's Files Summary, but required for `App`'s existing test setup to continue compiling with the new component registered in `app.ts`).

## Additional Implementation

None.
