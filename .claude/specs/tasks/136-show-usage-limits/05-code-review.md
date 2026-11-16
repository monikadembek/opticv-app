# Code Review – Task 136: Show limits usage on the pages where limits matter

Reviewed scope: all changes from `4a29775` (spec commit) to the working tree. This covers commits `f1647ed`, `de0c45c`, `68e7536` and `f27c0b1`, plus the uncommitted change to `features/dashboard/dashboard.html`. All paths below are relative to `apps/opticv-web/src/app/`.

Lint, typecheck, tests and build were **not run** as part of this review.

### Summary

- Overall result: **PASS WITH ISSUES**
- Every requirement in the spec is implemented: both stores, the usage meter, the global dialog, the interceptor change, and the Dashboard and Upload CV integration. Tests cover all the areas the plan asks for. Conventions are followed: OnPush, `inject()`, `input()`/`output()`, NgRx Signal Store, native control flow and no `any`. No issue blocks a merge. There are two deviations from the plan and spec: the dialog copy differs from the spec table, and the Dashboard usage panel sits inside the stat-card row instead of below it. There is also an uncommitted, out-of-scope label change on a stat card that contains a typo.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`features/dashboard/dashboard.html:32` (uncommitted)** – The stat-card label was changed from "Optimizations" to "Optimizations runs". The spec's Out of scope says "Changing the existing dashboard stat cards". The new text also has a grammar error: it should be "Optimization runs". Revert the change, or fix the wording and record it as an intentional change.
2. **`shared/usage-meter/usage-meter.ts:35-44`** – The "Upgrade" CTA is a `<button pButton routerLink="/pricing">`. The spec and plan call for an anchor/link. Navigation should be exposed as a link (role, middle-click, open in new tab), so `<a pButton routerLink>` would be better. The same applies to `features/upload-cv/upload-cv.html` ("Go to dashboard" / "View plans" use `<p-button routerLink>`).
3. **`shared/usage-meter/usage-meter.ts:49-52`** – The progress bar's `aria-label` is `summary()` only. When `atLimit()` is true, "Limit reached" is visible but is not part of the bar's accessible name. The visible text does convey the state, so this is minor.
4. **`shared/usage-meter/usage-meter.ts:11`** – The import order is inconsistent: `ButtonModule` is imported after the local `../utils` import. This is style only.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Shared usage-meter component (label/used/limit/reset/canUpgrade, Upgrade → `/pricing`) | Covered | `shared/usage-meter/usage-meter.ts` |
| Near-limit rule `limit > 0 && used/limit >= 0.8` | Covered | `shared/utils.ts` `isNearLimit` and `NEAR_LIMIT_RATIO` |
| Upgrade link only when near limit and tier ≠ PRO; unknown tier counts as upgradable | Covered | `PlanUsageStore.canUpgrade` (null tier → true) |
| Wording "{used} of {limit} optimizations used" / "CVs stored" | Covered | |
| Reset label "Resets" / "Access ends", hidden when `resetsAt` is null | Covered | `PlanUsageStore.resetLabel`, `@if (resetsAt(); as date)` |
| Progress value capped at 100; "Limit reached" stated in text | Covered | `usagePercent`, `atLimit` |
| Usage UI hidden while loading or on error | Covered | `@if` on `optimizationQuota()` / `storedCvs()` |
| Dashboard: reload on init and after a successful delete | Covered | `dashboard.ts` `ngOnInit`, `deleteCv` `next` |
| Dashboard: "Usage this month" section, `aria-label="Usage"`, **between stat cards and tabs** | Partial | Rendered as a 4th item inside the stat-card flex row (`flex-3`), not as a separate block before `<p-tabs>`. See Plan Deviations. |
| Dashboard: both meters independent; CV meter shown when the optimization quota is missing | Covered | |
| Upload: reload on init, after success and on `CV_LIMIT_EXCEEDED` | Covered | `upload-cv.ts` |
| Upload: stored-CV row above the dropzone | Covered | |
| Upload: limit prompt replaces the dropzone; Dashboard + View plans; PRO copy without "or upgrade" | Covered | `role="status"` |
| Upload: "Upload another CV" at the limit shows the prompt | Covered | Branch order `error → uploadedFile → isAtCvLimit → dropzone`; tested |
| Upload: no "Upload failed" toast for `CV_LIMIT_EXCEEDED` | Covered | `HttpErrorResponse` narrowing, returns `EMPTY` |
| Interceptor opens the dialog instead of toasts and still rethrows | Covered | |
| Dialog hosted in `app.html`; first payload wins | Covered | `QuotaDialogStore.open` guard |
| Dialog content per code × tier (spec table wording) | Partial | Headers, buttons and the PRO/non-PRO split are correct, but the message copy differs from the spec. See Plan Deviations #2. |
| View plans: track, close, navigate to `/pricing`; Not now / Close / Esc close it | Covered | |
| Dialog a11y (modal, header as name, Esc, real buttons) | Covered | PrimeNG `p-dialog`; `dismissableMask` was added (not in spec, harmless) |
| PostHog `upgrade_cta_clicked` with `{ page, place }` | Covered | Dashboard, Upload and dialog |
| Unit tests: usage-meter, dialog, interceptor, stores, Dashboard, Upload CV, utils | Covered | |
| `nx lint` / `typecheck` / `test` / `build` pass | Not verified | Not run during review |

### Plan Deviations

1. **Dashboard panel placement** (`features/dashboard/dashboard.html:57-87`). The plan places the section "between the stat-card row and `<p-tabs>`" with `mb-8`. The implementation puts it inside the `flex md:flex-row` stat row as a `flex-3` item. On `md+` screens, the three stat cards then take half the width and the usage panel takes the other half. The spec ("between the stat cards and the tabs") reads as a separate block. If this layout is intentional, record it in the done report.
2. **Dialog copy** (`shared/quota-upgrade-dialog/quota-upgrade-dialog.ts:79-100`). The messages do not follow the spec table:
   - `QUOTA_EXCEEDED`: the implementation uses "`{label}: you've used this month's allowance. Resets …`". The spec says "You've used all your {feature label} this month. Resets {date}. …". The same pattern applies to the cancel-at-period-end and no-`resetsAt` variants.
   - `FEATURE_NOT_AVAILABLE`: the implementation uses "`{label} are not included … Upgrade to unlock them.`". The spec says "… is not included … Upgrade to unlock it." The plural form does read correctly with the plural labels, so this may be a deliberate improvement. Either way, it should be stated in the done report.
3. **Date formatting in the dialog.** The plan says to format dates in the template with `DatePipe`. The implementation formats them in TS with `formatDate(iso, 'mediumDate', LOCALE_ID)`. The output is the same, so this is acceptable.
4. **Usage-meter Upgrade element.** The plan specifies an anchor; a `pButton` `<button>` is used instead (see Non-Critical #2).
5. **Uncommitted stat-card label change.** This is not in the plan (see Non-Critical #1).

### Null Safety Issues

1. **`shared/quota-upgrade-dialog/quota-upgrade-dialog.ts:77`.** `FEATURE_LABELS[payload.feature]` has no fallback. The type guarantees a `LimitedFeature`, but the payload comes from an HTTP body that is only validated by `code` (`isQuotaErrorPayload`). If the backend sent an unknown `feature`, the message would render "undefined: you've …". A `?? 'This feature'` fallback would make it robust. This is low risk.

No other issues. All reads of `usageStatus` and `userProfile` use `?.` / `??` or `@if … as`, there are no non-null assertions in the new code, and `err.error?.code` is guarded by `instanceof HttpErrorResponse`.

### Code Smells

1. **Duplicated `<app-usage-meter label="CVs stored" …>` block.** It appears three times: once in `features/dashboard/dashboard.html` and twice in `features/upload-cv/upload-cv.html` (limit-prompt branch and dropzone branch). In the upload page the two copies are identical. They could be rendered once above the `@if (isAtCvLimit())` split. Minor.
2. **Hard-coded `/pricing` and `/dashboard` route strings** appear in the usage meter, the upload page and the dialog. This is consistent with the existing codebase, so no action is required.
3. **Feature label wording now lives in two places**: `FEATURE_LABELS` (new) and the Settings usage section. The spec intentionally leaves Settings untouched, so this is noted only.

### Recommendation

- **Merge as-is** once the minor items are addressed. At a minimum:
  - revert or fix the uncommitted "Optimizations runs" label;
  - confirm, or align with the spec, the Dashboard panel placement and the dialog copy;
  - run `nx lint/typecheck/test/build opticv-web`.
