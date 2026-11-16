# Implementation Done – Task 136: Show limits usage on the pages where limits matter

## Summary

Delivered in `apps/opticv-web` only. No backend, DB or shared-type changes.

- **Shared:** a new `app-usage-meter` presentational component, plus the helpers `usagePercent` / `isNearLimit` and the `FEATURE_LABELS` constant.
- **Stores:** two new root NgRx Signal Stores.
  - `PlanUsageStore` holds the derived usage and tier state.
  - `QuotaDialogStore` holds the dialog payload; the first payload wins.
- **Dashboard:** a "Usage this month" panel with meters for CV optimizations and stored CVs. Usage reloads on init and after a successful CV delete.
- **Upload CV page:**
  - A stored-CV meter is shown above the dropzone.
  - At the limit, a limit prompt replaces the dropzone.
  - Usage reloads on init, after a successful upload and on `CV_LIMIT_EXCEEDED`.
  - The generic "Upload failed" toast is suppressed for `CV_LIMIT_EXCEEDED`.
- **Quota errors:** a global `app-quota-upgrade-dialog` is hosted in `app.html`. `quotaErrorInterceptor` now opens this dialog instead of showing toasts, and still rethrows the error.
- **Analytics:** PostHog `upgrade_cta_clicked` with `{ page, place }` fires from the Dashboard, the Upload page and the dialog.
- **Tests:** unit tests added or updated for utils, the usage meter, both stores, the dialog, the interceptor, App, Dashboard and Upload CV.

Spec review status: **PASS WITH ISSUES**. The implementation plan exists.

Source of changed files: all Task 136 commits (`4a29775` → `44a9d6f`). `HEAD~1..HEAD` alone contains only the code-review fix commit.

## Specification Coverage

| # | Requirement | Status | Note |
| --- | --- | --- | --- |
| 1 | Reusable usage-meter component (label, used, limit, reset date/label, upgrade link to `/pricing`) | Implemented | `shared/usage-meter/usage-meter.ts` |
| 2 | Usage-nudge derived state (effective tier, optimization quota, stored CVs, near-limit, `canUpgrade`) | Implemented | `core/stores/plan-usage.store.ts`; near-limit check in `shared/utils.ts` |
| 3 | Near-limit rule `limit > 0 && used / limit >= 0.8` | Implemented | `isNearLimit`, `NEAR_LIMIT_RATIO = 0.8` |
| 4 | Upgrade link only when near/at limit and tier ≠ PRO | Implemented | `showUpgrade = canUpgrade && isNearLimit` |
| 5 | Upgrade destination `/pricing`, click tracked in PostHog | Implemented | `routerLink="/pricing"` + `upgradeClicked` output → `upgrade_cta_clicked` |
| 6 | Wording "{used} of {limit} optimizations used" / "{used} of {limit} CVs stored" | Implemented | |
| 7 | Reset date "Resets {date}" / "Access ends {date}" (`mediumDate`), hidden when `resetsAt` is null; none for stored CVs | Implemented | `PlanUsageStore.resetLabel` |
| 8 | Progress value `min(100, used/limit*100)`; at limit, state given in text | Implemented | Text "Limit reached" shown next to the summary |
| 9 | Usage UI hidden while loading or on error | Implemented | `@if` on `optimizationQuota()` / `storedCvs()` |
| 10 | Dashboard: `reloadUsageStatus()` on init | Implemented | `planUsageStore.reload()` in `ngOnInit` |
| 11 | Dashboard: "Usage this month" section, `aria-label="Usage"`, between stat cards and tabs | Implemented | Placed inside the stat-card row (see Deviations) |
| 12 | Dashboard: CV optimizations row (with reset date) and stored CVs row, each with its own upgrade link | Implemented | |
| 13 | Dashboard: reload usage after a successful CV deletion | Implemented | |
| 14 | Upload: `reloadUsageStatus()` on init | Implemented | |
| 15 | Upload: stored-CV usage row above the dropzone | Implemented | |
| 16 | Upload: at the limit, the dropzone is replaced by a limit prompt with "Go to dashboard" and "View plans" (non-PRO); PRO text has no "or upgrade your plan" | Implemented | `role="status"` prompt |
| 17 | Upload: below the limit, the dropzone works as before | Implemented | |
| 18 | Upload: reload after a successful upload; "Upload another CV" at the limit shows the prompt | Implemented | |
| 19 | Upload: `CV_LIMIT_EXCEEDED` resets the selection, shows no "Upload failed" toast and reloads usage | Implemented | |
| 20 | Interceptor opens the dialog (root state holder) instead of toasts and still rethrows | Implemented | `QuotaDialogStore.open(payload)` |
| 21 | Dialog hosted in `app.html`, reads the payload and effective tier | Implemented | |
| 22 | Dialog content per code × tier (headers, messages, View plans / Not now vs Close) | Implemented | Message wording differs from the spec table (see Deviations) |
| 23 | Feature labels reuse the existing wording | Implemented | `FEATURE_LABELS` in `shared/constants.ts` |
| 24 | View plans closes the dialog, navigates to `/pricing` and is tracked; Not now / Close / Esc / close icon close it | Implemented | |
| 25 | Several quota errors: the first payload wins, no stacking | Implemented | `open()` patches only when `payload()` is null |
| 26 | Dialog accessibility (modal, header as name, focus, Esc, real buttons) | Implemented | PrimeNG `p-dialog` |
| 27 | Edge case: unknown tier treated as upgradable | Implemented | `effectiveTier` null → `canUpgrade` true |
| 28 | Edge case: `used > limit` capped at 100 %, real numbers shown, treated as at limit | Implemented | |
| 29 | Edge case: CV_OPTIMIZATION quota missing → only the stored-CV row is shown | Implemented | |
| 30 | Unit tests for usage-meter, dialog, interceptor, Dashboard, Upload CV | Implemented | Store and utils tests were also added |
| 31 | `nx lint` / `typecheck` / `test` / `build` pass for `opticv-web` | Not implemented | Not run as part of this report |

## Files

All paths are relative to `apps/opticv-web/src/app/` unless stated otherwise.

### Created

- `core/stores/plan-usage.store.ts`
- `core/stores/plan-usage.store.spec.ts`
- `core/stores/quota-dialog.store.ts`
- `core/stores/quota-dialog.store.spec.ts`
- `shared/usage-meter/usage-meter.ts`
- `shared/usage-meter/usage-meter.spec.ts`
- `shared/quota-upgrade-dialog/quota-upgrade-dialog.ts`
- `shared/quota-upgrade-dialog/quota-upgrade-dialog.html`
- `shared/quota-upgrade-dialog/quota-upgrade-dialog.spec.ts`
- `.claude/specs/tasks/136-show-usage-limits/00-raw-task.md`, `02-spec.md`, `03-spec-review.md`, `04-implementation-plan.md`, `05-code-review.md` (workspace root)

### Modified

- `app.ts`, `app.html`, `app.spec.ts`
- `core/interceptors/quota-error-interceptor.ts`, `quota-error-interceptor.spec.ts`
- `features/dashboard/dashboard.ts`, `dashboard.html`, `dashboard.spec.ts`
- `features/upload-cv/upload-cv.ts`, `upload-cv.html`, `upload-cv.spec.ts`
- `shared/constants.ts`
- `shared/utils.ts`, `shared/utils.spec.ts`
- `docs/tasks-list.md` (workspace root)

## Components

| Component | Selector | Status |
| --- | --- | --- |
| `UsageMeter` (`shared/usage-meter/usage-meter.ts`) | `app-usage-meter` | Exist |
| `QuotaUpgradeDialog` (`shared/quota-upgrade-dialog/quota-upgrade-dialog.ts`) | `app-quota-upgrade-dialog` | Exist |
| `Dashboard` (modified) | `app-dashboard` | Exist |
| `UploadCv` (modified) | `app-upload-cv` | Exist |
| `App` (modified, hosts dialog) | `app-root` | Exist |

## Stores

| Store | File | Status |
| --- | --- | --- |
| `PlanUsageStore` | `core/stores/plan-usage.store.ts` | Exist |
| `QuotaDialogStore` | `core/stores/quota-dialog.store.ts` | Exist |

## Deviations

1. **Dashboard panel placement.** The plan puts the usage section between the stat-card row and `<p-tabs>`. In the code it is a fourth item (`flex-3`) inside the stat-card `flex md:flex-row` container.
2. **Dialog message copy.** The wording differs from the spec table:
   - `QUOTA_EXCEEDED` uses the forms "{label}: you've used this month's allowance. Resets {date}." and "{label}: you've used this period's allowance, and your plan won't renew. Access ends {date}." It also has "{label}: you've used your plan's allowance."
   - `FEATURE_NOT_AVAILABLE` uses "{label} are not included in your current plan. Upgrade to unlock them." (plural).
   - Headers, buttons and the PRO/non-PRO split follow the spec table.
3. **Dialog date formatting.** Dates are formatted in TypeScript with `formatDate(iso, 'mediumDate', LOCALE_ID)`. The plan had them formatted in the template with `DatePipe`.
4. **Upgrade element in the usage meter.** It is a `<button pButton routerLink="/pricing">` (with `ButtonModule` imported), not an anchor.
5. **"Limit reached" text.** It is a separate styled `<span>` next to the summary, not a " – Limit reached" suffix in the same string. The progress bar `aria-label` contains only the summary.
6. **Extra dialog options.** The dialog also sets `[dismissableMask]="true"`, `[resizable]="false"` and a width of `480px`. The buttons are ordered Not now → View plans, and View plans has the `pi pi-arrow-up` icon.
7. **Upload limit-prompt branch.** The stored-CV meter is also rendered inside the limit-prompt branch, with `upgradeClicked` → `usage_meter_cvs`. The branch is wrapped in a nested `@if (planUsageStore.storedCvs(); as cvs)`. Both "Go to dashboard" and "View plans" use `<p-button routerLink>`.

## Additional Implementation

Additional implementation not covered by the original documents:

- The Dashboard stat-card label changed from "Optimizations" to "Optimizations runs" (`features/dashboard/dashboard.html`).
- `QuotaDialogContent` is an exported interface in `quota-upgrade-dialog.ts`.
- A `NEAR_LIMIT_RATIO` constant was added in `shared/utils.ts`.
- `app.spec.ts` has a test asserting that `app-quota-upgrade-dialog` renders.
- `dashboard.spec.ts` has a test asserting that usage is not reloaded when CV deletion fails.
- `docs/tasks-list.md` has an entry for Task 136.
