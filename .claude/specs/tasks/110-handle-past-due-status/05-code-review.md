# Code Review: 110-handle-past-due-status

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation faithfully follows the spec and implementation plan: the shared `getEffectiveTier` helper, both backend call sites (`OptimizationService.resolveTierAndPeriod`, `UsersService.getUsageStatus`), and the frontend `allowedTemplateIds`/`PastDueBanner` all correctly downgrade to `FREE` for non-`ACTIVE`/`TRIALING` statuses. One real CSS layout bug (fixed banner overlapping page content) and a minor test-coverage gap keep this from a clean PASS.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.css:3-8` — The banner uses `position: fixed; top: 80px`, but `app-top-header` is `position: sticky` with an actual height of `5.5rem` (88px) (`apps/opticv-web/src/app/layout/top-header/top-header.css:28`). Two issues: (1) the 80px offset is 8px short of the header's real height, so the banner slightly overlaps the header; (2) because the banner is `fixed` (out of normal flow) while `.main` (`apps/opticv-web/src/app/app.css:7-10`) has no compensating top padding/margin, the banner will visually overlay the top of the page's `<router-outlet>` content whenever it is visible, rather than pushing content down. Consider making the banner part of normal document flow (e.g. `position: static`/`sticky` below the header) or adding dynamic top padding to `.main`/`router-outlet` when the banner is visible.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Shared `getEffectiveTier` helper in `@opticv/datatypes` | Covered | `packages/shared/datatypes/src/lib/datatypes.ts:151-156`, colocated after `SubscriptionStatus`/near `TIER_LIMITS` as required. |
| `OptimizationService.resolveTierAndPeriod` uses effective tier | Covered | `optimization.service.ts:46-74`; `status` added to Prisma `select`; both `triggerOptimization` and `triggerSingleJob` call sites verified by tests. |
| `UsersService.getUsageStatus` uses effective tier for both `maxStoredCvs` and `getQuotaStatus` | Covered | `users.service.ts:205-219`; `effectiveTier` computed once and reused, per spec-review clarification. |
| `QuotaService` remains status-agnostic | Covered | No changes to `quota.service.ts`/`quota.service.spec.ts`. |
| `UserProfile.subscription` (via `getProfile`/`updateDisplayName`/`updateNotificationPreference`) keeps raw tier/status | Covered | No changes made to these methods; raw values still returned. |
| Frontend `allowedTemplateIds` uses effective tier | Covered | `cv-optimization.ts:228-238`; test added at `cv-optimization.spec.ts:1087-1092`. |
| `PastDueBanner` component: visible on `PAST_DUE`, dismissible, "Manage billing" via `createPortalSession` | Covered | `past-due-banner.ts`/`.html` implement per spec; renders `null` when no subscription (via `computed` returning `false`). |
| Banner rendered between `app-top-header` and `<main>` | Covered | `app.html:6`. |
| Banner dismiss is in-memory only (no storage), resets on reload | Covered | `dismissed = signal(false)`, no persistence used. |
| `createPortalSession()` failure keeps banner visible, shows toast | Covered | `onManageBilling()` catchError path; test at `past-due-banner.spec.ts:108-122`. |
| Unit tests for `getEffectiveTier` across all `SubscriptionStatus` values | Covered | `datatypes.spec.ts:31-46` — `ACTIVE`/`TRIALING` (allow) and `PAST_DUE`/`CANCELED` (deny) both exercised. |
| `optimization.service.spec.ts` updated for `PAST_DUE`/`PRO` → `FREE` quota, both call sites | Covered | Tests at lines 191-213 (`triggerOptimization`) and 410-432 (`triggerSingleJob`). |
| `users.service.spec.ts` updated for `PAST_DUE` → `FREE` limits | Covered | Test at `users.service.spec.ts:461-482`. |
| Banner spec: visible/hidden/dismiss/manage-billing/error cases | Partial | Covers `PAST_DUE` visible, `ACTIVE` hidden, `null` subscription hidden, not-loaded hidden, dismiss, manage-billing call, and error-toast-keeps-visible. Does **not** test `TRIALING` or `CANCELED` statuses as hidden, though the implementation plan (Step 6) explicitly lists these as required cases. |

## Plan Deviations

None of substance — implementation matches the plan's described logic and file list. The only deviation is the untested `TRIALING`/`CANCELED` cases in the banner spec noted above (a test-coverage gap relative to the plan, not a behavior deviation).

## Null Safety Issues

None. All three effective-tier call sites (`resolveTierAndPeriod`, `getUsageStatus`, `allowedTemplateIds`) correctly guard the null-subscription case by short-circuiting to `'FREE'` before calling `getEffectiveTier`, consistent with the existing `?? 'FREE'` fallback pattern. The banner's `visible` computed also safely optional-chains through `userProfile.value()?.subscription?.status`.

## Code Smells

None. The effective-tier computation logic is duplicated three times (backend x2, frontend x1) in the pattern `subscription ? getEffectiveTier(subscription.tier, subscription.status) : 'FREE'`, but this is inherent to the three call sites living in different runtimes/layers (two NestJS services, one Angular component) and each was an explicit, separate step in the implementation plan — not a within-file duplication warranting a shared wrapper.

## Recommendation

- Fix critical issues before merge — none are critical, so this is effectively **mergeable with a follow-up fix recommended** for the banner's fixed-positioning/layout-overlap issue (non-critical) before it reaches users, and optionally extending the banner spec with `TRIALING`/`CANCELED` cases for full plan coverage.
