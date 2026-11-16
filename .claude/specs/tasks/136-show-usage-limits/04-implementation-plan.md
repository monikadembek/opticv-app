# Implementation Plan – Task 136: Show limits usage on the pages where limits matter

Spec review result: PASS WITH ISSUES (no blockers). Frontend only (`apps/opticv-web`). No backend, DB or shared-type changes.

All paths below are relative to `apps/opticv-web/src/app/`.

## Files

| Action | File |
| --- | --- |
| Modify | `shared/utils.ts` – add `usagePercent`, `isNearLimit` |
| Modify | `shared/utils.spec.ts` |
| Modify | `shared/constants.ts` – add `FEATURE_LABELS` |
| Create | `shared/usage-meter/usage-meter.ts` |
| Create | `shared/usage-meter/usage-meter.spec.ts` |
| Create | `core/stores/plan-usage.store.ts` – derived usage and tier state |
| Create | `core/stores/plan-usage.store.spec.ts` |
| Create | `core/stores/quota-dialog.store.ts` – dialog open/close state |
| Create | `core/stores/quota-dialog.store.spec.ts` |
| Create | `shared/quota-upgrade-dialog/quota-upgrade-dialog.ts` |
| Create | `shared/quota-upgrade-dialog/quota-upgrade-dialog.html` |
| Create | `shared/quota-upgrade-dialog/quota-upgrade-dialog.spec.ts` |
| Modify | `core/interceptors/quota-error-interceptor.ts` |
| Modify | `core/interceptors/quota-error-interceptor.spec.ts` |
| Modify | `app.ts`, `app.html` – host the dialog |
| Modify | `app.spec.ts` – stub `app-quota-upgrade-dialog` |
| Modify | `features/dashboard/dashboard.ts`, `dashboard.html`, `dashboard.spec.ts` |
| Modify | `features/upload-cv/upload-cv.ts`, `upload-cv.html`, `upload-cv.spec.ts` |

Folder placement follows the existing `shared/welcome-guide-modal/` pattern (one folder per shared component directly under `shared/`). The spec's `shared/components/` was only an example, and that folder does not exist.

Not touched: Settings, CV optimization page, `UserSettingsApiService`, backend.

## Resolved review items (decisions within spec limits)

- **Effective vs. raw tier (review #1 / assumption 14):** this is accepted as is. Gating uses `usageStatus` (effective tier). For lapsed paid users the UI is therefore stricter than the backend. Backend unchanged, as the spec's Out of scope says.
- **Unknown tier:** treated as upgradable (`canUpgrade` is true unless the effective tier is known and equals `PRO`).
- **Dialog tier source:** `userProfile` → `getEffectiveTier(tier, status)`. The payload carries no tier.
- **Dialog de-duplication:** the first payload wins while the dialog is open.
- **State holder:** NgRx Signal Store (conventions: shared state uses the NgRx signals store), following the `UserGuideStore` pattern.
- **Upload page usage-row placement:** the row is shown in the dropzone state and in the limit-prompt state. It is hidden in the error state and in the success state.
- **"Upload another CV" at the limit:** the button stays. Clicking it shows the limit prompt (spec Upload #5).
- **"Limit reached" copy:** when `used >= limit`, the meter text gets the suffix " – Limit reached". The progress bar alone never conveys the state.
- **Dashboard heading:** kept as "Usage this month", as the spec says. Stored CVs are labelled "CVs stored" without "this month".
- **PRO "n/a" cells (`FEATURE_NOT_AVAILABLE` / no `resetsAt`):** PRO shows the same message as non-PRO without the upgrade sentence ("Upgrade your plan for a higher limit." / "Upgrade to unlock it.") and only a **Close** button.
- **Analytics:** one event, `upgrade_cta_clicked`, with `{ page, place }`. `place` is one of `usage_meter_optimizations`, `usage_meter_cvs`, `upload_limit_prompt` or `quota_dialog`. `page` is the current URL path (dialog) or the page name (`dashboard` / `upload-cv`). Dialog dismissals are not tracked.
- **Existing interceptor tests:** the toast assertions are replaced with store `open()` assertions.

## Steps

### 1. `shared/utils.ts` (+ spec)

1. `usagePercent(used: number, limit: number): number` returns `limit > 0 ? Math.min(100, used / limit * 100) : 0`. This mirrors the Settings implementation; Settings is not refactored.
2. `isNearLimit(used: number, limit: number): boolean` returns `limit > 0 && used / limit >= 0.8`.
3. Tests: 0/1, 1/1, 7/10, 8/10, 4/5, 6/5 (over the cap), limit 0.

### 2. `shared/constants.ts`

- Add `FEATURE_LABELS: Record<LimitedFeature, string>` with the existing wording: "CV optimization runs", "Cover letter generations", "Interview prep generations", "LinkedIn content generations". It is used only by the new dialog.

### 3. `core/stores/plan-usage.store.ts` (+ spec)

A root `signalStore` with no state of its own, built with `withComputed` over `UserSettingsApiService`:

- `effectiveTier`: `SubscriptionTier | null`, from `userProfile.value()?.subscription`. Returns `null` when the subscription is absent; otherwise `getEffectiveTier(tier, status)`.
- `canUpgrade`: `effectiveTier() !== 'PRO'`.
- `resetLabel`: `'Access ends'` when `subscription?.cancelAtPeriodEnd`, else `'Resets'`.
- `optimizationQuota`: the `QuotaStatus` with `feature === 'CV_OPTIMIZATION'` from `usageStatus.value()?.quotas`, or `null`.
- `storedCvs`: `usageStatus.value()?.storedCvs ?? null`.
- `isAtCvLimit`: `storedCvs` is not null and `used >= limit`.
- `withMethods`: `reload()` calls `userSettingsApiService.reloadUsageStatus()`.

Tests mock `UserSettingsApiService` with signal-backed `value()` / `hasValue()` and cover:
- a null profile, FREE, PRO, and PAST_DUE BASIC (where the effective tier is FREE);
- the reset label;
- a missing CV_OPTIMIZATION quota;
- `isAtCvLimit` at equal and over-cap values.

### 4. `shared/usage-meter/usage-meter.ts` (+ spec)

Presentational component, `app-usage-meter`, with an inline template and OnPush. It injects no services; navigation uses `routerLink`.

- Inputs, all via `input()`:
  - `label: string` (required), e.g. "optimizations used" or "CVs stored";
  - `used: number` (required);
  - `limit: number` (required);
  - `resetLabel: string | null` (default `null`);
  - `resetsAt: string | null` (default `null`);
  - `canUpgrade: boolean` (default `true`).
- Output: `upgradeClicked` via `output<void>()`. The parent tracks it in PostHog.
- Computed values:
  - `percent` uses `usagePercent`;
  - `atLimit` is `used >= limit && limit > 0`;
  - `showUpgrade` is `canUpgrade && isNearLimit(used, limit)`.
- Template:
  - Text "{used} of {limit} {label}", followed by " – Limit reached" when `atLimit`.
  - When `resetsAt` is set, "{resetLabel} {resetsAt | date:'mediumDate'}".
  - A `p-progressbar` with `[showValue]="false"` and an `aria-label` equal to the text.
  - When `showUpgrade`, an anchor with `routerLink="/pricing"` and the text "Upgrade". Its click emits `upgradeClicked`.
- Imports: `ProgressBarModule`, `RouterLink`, `DatePipe`.
- Tests:
  - the text renders;
  - the limit-reached suffix appears;
  - the Upgrade link is hidden below 80%, shown at 80% or more, and hidden when `canUpgrade` is false;
  - the reset date is hidden when null;
  - `upgradeClicked` is emitted.

### 5. `core/stores/quota-dialog.store.ts` (+ spec)

A root `signalStore` with state `{ payload: QuotaErrorPayload | null }`.

- Computed: `isOpen` is `payload() !== null`.
- Methods:
  - `open(payload)` only patches when `payload()` is null (first one wins);
  - `close()` sets `payload` to null.
- Tests: open, a second `open` while open is ignored, close, and reopen after close.

### 6. `core/interceptors/quota-error-interceptor.ts` (+ spec)

1. Replace the `MessageService` injection with `QuotaDialogStore`.
2. On a matching `QuotaErrorPayload`, call `quotaDialogStore.open(payload)`. Keep `isQuotaErrorPayload` and keep rethrowing the error.
3. Remove all toast logic and the `MessageService` import.
4. Spec:
   - Provide the real `QuotaDialogStore` and assert `payload()` for each of the three codes.
   - The error is still rethrown.
   - Non-quota errors (another 403 body, a 500) and successful responses leave the store closed.
   - Remove the `MessageService` spies.

### 7. `shared/quota-upgrade-dialog/` (+ spec)

Component `app-quota-upgrade-dialog`, OnPush, external template.

- Injections: `QuotaDialogStore`, `PlanUsageStore`, `Router`.
- Computed values:
  - `content`: `{ header, message, showUpgrade } | null`, derived from `quotaDialogStore.payload()` and `planUsageStore.canUpgrade()` following the spec's table.
  - Dates are formatted inside the template with the `DatePipe` (`mediumDate`); the computed values only pass the ISO date through.
  - Feature labels come from `FEATURE_LABELS`.
  - Copy for each row: as in spec Behavior › Dialog #3, with the PRO variants from the resolved items above.
- Template:
  - `p-dialog` with `[visible]="quotaDialogStore.isOpen()"`, `(visibleChange)` → `close()` when false, `[modal]="true"`, `[closable]="true"`, `[closeOnEscape]="true"`, `[draggable]="false"`, `[header]="content()?.header"`, and a width style matching the welcome modal (`maxWidth: '95vw'`).
  - The body is wrapped in `@if (content(); as c)`.
  - Footer when `showUpgrade`:
    - `p-button` "View plans" → `onViewPlans()`;
    - `p-button` outlined "Not now" → `close()`.
  - Footer otherwise: `p-button` "Close" → `close()`.
- `onViewPlans()`:
  1. `posthog.capture('upgrade_cta_clicked', { page: router.url, place: 'quota_dialog' })`;
  2. `close()`;
  3. `router.navigate(['/pricing'])`.
- Imports: `DialogModule`, `ButtonModule`, `DatePipe`.
- Tests, with the stores mocked by signals:
  - Each code × upgradable / PRO gives the expected header, message fragment and buttons.
  - The cancel-at-period-end text appears.
  - View plans closes, navigates and captures.
  - Not now and Close call `close()`.
  - Nothing renders when `payload` is null.

### 8. `app.ts` / `app.html` / `app.spec.ts`

1. Import `QuotaUpgradeDialog` into `App.imports`.
2. Add `<app-quota-upgrade-dialog></app-quota-upgrade-dialog>` after `<app-welcome-guide-modal>`.
3. In `app.spec.ts`, add a stub component for the `app-quota-upgrade-dialog` selector and include it in the test override, following the existing stubs.

### 9. Dashboard

**`dashboard.ts`**

1. Inject `PlanUsageStore`. Expose `planUsageStore` as readonly for the template.
2. In `ngOnInit`, call `planUsageStore.reload()` before `loadOptimizations()`.
3. In the `deleteCv` success `next`, call `planUsageStore.reload()` after `updateCvList`.
4. `onUpgradeClicked(place: 'usage_meter_optimizations' | 'usage_meter_cvs')` calls `posthog.capture('upgrade_cta_clicked', { page: 'dashboard', place })`.
5. Add `UsageMeter` to `imports`.

**`dashboard.html`**

The new section goes between the stat-card row and `<p-tabs>`:

- Render it only when `optimizationQuota()` or `storedCvs()` is non-null.
- It is a `<section aria-label="Usage">` with the existing card border classes (`rounded-lg border border-(--border-subtle) p-4 mb-8`) and an `<h2>` "Usage this month".
- `@if (planUsageStore.optimizationQuota(); as q)` renders `<app-usage-meter>` with:
  - `label="optimizations used"`;
  - `[used]="q.used"`, `[limit]="q.limit"`;
  - `[resetsAt]="q.resetsAt"`, `[resetLabel]="planUsageStore.resetLabel()"`;
  - `[canUpgrade]="planUsageStore.canUpgrade()"`;
  - `(upgradeClicked)="onUpgradeClicked('usage_meter_optimizations')"`.
- `@if (planUsageStore.storedCvs(); as cvs)` renders `<app-usage-meter>` with `label="CVs stored"`, no reset inputs, and `place` set to `usage_meter_cvs`.

**`dashboard.spec.ts`**

- Provide a `PlanUsageStore` mock with signals and a `reload` `vi.fn()`.
- Tests:
  - `reload` is called on init;
  - `reload` is called after a successful CV delete;
  - the usage section is absent when both values are null;
  - both meters render with data;
  - only the CV meter renders when the optimization quota is null;
  - `onUpgradeClicked` captures the PostHog event (posthog is mocked as in existing specs).

### 10. Upload CV

**`upload-cv.ts`**

1. Inject `PlanUsageStore` and expose it readonly. Implement `OnInit`; `ngOnInit` calls `planUsageStore.reload()`.
2. In the `map` success branch, call `planUsageStore.reload()` next to the existing `cvStore.loadUserCVs(true)`.
3. In `catchError`:
   - Check `err?.error?.code === 'CV_LIMIT_EXCEEDED'`, with `err` narrowed as `HttpErrorResponse`; never assume non-null.
   - When true, skip the "Upload failed" toast and call `planUsageStore.reload()`.
   - Otherwise keep the existing toast.
   - `isLoading` / `selectedFile` resets are unchanged.
4. `onUpgradeClicked(place: 'usage_meter_cvs' | 'upload_limit_prompt')` calls `posthog.capture('upgrade_cta_clicked', { page: 'upload-cv', place })`.
5. Add `UsageMeter` and `RouterLink` to `imports`.

**`upload-cv.html`** (right panel)

The existing `@if (error()) … @else if (uploadedFile()) … @else { dropzone }` becomes:

- The `error()` branch is unchanged.
- The `uploadedFile()` branch is unchanged.
- New branch, `@else if (planUsageStore.isAtCvLimit())`:
  1. The usage meter for stored CVs.
  2. A bordered prompt block with `role="status"`. Its text is "You've reached your limit of {limit} stored CVs. Delete a CV from your dashboard or upgrade your plan to add more." When `canUpgrade()` is false, the text instead ends with "…from your dashboard to add more."
  3. An outlined button/link "Go to dashboard" with `routerLink="/dashboard"`.
  4. When `canUpgrade()`, a "View plans" `p-button` with `routerLink="/pricing"`. Clicking it calls `onUpgradeClicked('upload_limit_prompt')`.
- `@else`:
  1. The usage meter for stored CVs, rendered only when `storedCvs()` is non-null. Its upgrade output goes to `onUpgradeClicked('usage_meter_cvs')`.
  2. The existing dropzone below it.

`limit` in the text comes from `planUsageStore.storedCvs()`, read null-safely through an `@if … as` alias.

**`upload-cv.spec.ts`**

- Add a `PlanUsageStore` mock.
- Tests:
  - `reload` is called on init;
  - `reload` is called after a successful upload;
  - the meter and dropzone render below the limit;
  - at the limit, the limit prompt renders with no dropzone, and View plans is hidden when `canUpgrade` is false;
  - on a `CV_LIMIT_EXCEEDED` error there is no `messageService.add` call and `reload` is called;
  - on any other error the toast is still shown;
  - with an uploaded file plus "Upload another CV" while at the limit, the limit prompt shows.

## Conventions checklist

- Standalone with no `standalone: true`; OnPush everywhere; `inject()`, `input()`, `output()`, `computed()`.
- NgRx Signal Store for shared state (`PlanUsageStore`, `QuotaDialogStore`), `providedIn: 'root'`.
- Native control flow; no `ngClass` / `ngStyle`; Tailwind utilities; no `any`; no TODOs or redundant comments.
- Null-safety: every `usageStatus` and `userProfile` read uses `?.` / `??` and `@if … as`; no non-null assertions in new code.
- Accessibility:
  - the limit state is stated in text;
  - progress bars are labelled;
  - the dialog is modal, uses its header as the accessible name, closes on Escape and handles focus (PrimeNG);
  - the limit prompt uses `role="status"`.
- SSR: no browser globals; the dialog only opens from HTTP errors; the usage resource is already session-gated.

## Verification

- `npm exec nx lint opticv-web`
- `npm exec nx typecheck opticv-web`
- `npm exec nx test opticv-web`
- `npm exec nx build opticv-web`
