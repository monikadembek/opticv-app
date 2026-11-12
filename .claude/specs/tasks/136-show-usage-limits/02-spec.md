# Task Specification

## Source

Azure DevOps Task: 136 – Show limits usage on the pages where limits matter

## Goal

Show users how much of their plan they have used on the pages where limits matter, and turn a hit quota into an upgrade opportunity:

1. **Dashboard** – a "Usage this month" panel with CV optimization usage and stored-CV usage ("2 of 3 optimizations used"), with an **Upgrade** link when the user is near (≥ 80 %) or at the limit.
2. **Upload CV page** – stored-CV usage, with the same upgrade nudge; when the user is already at the stored-CV limit the dropzone is replaced by a limit prompt.
3. **Quota hit (any page)** – a global upgrade dialog with a **View plans** action replaces the plain warning toast currently shown by `quotaErrorInterceptor`.

Usage data is reused from the existing `UserSettingsApiService.usageStatus` resource (`GET /users/me/usage`) that already powers the Settings progress bars.

## Context

- Frontend only (`apps/opticv-web`). No backend, DB or shared-type changes are required.
- **Usage data:** `core/services/user-settings-api.service.ts` – root-provided `usageStatus` (`httpResource<UsageStatus | null>`) and `reloadUsageStatus()`. `UsageStatus = { quotas: QuotaStatus[]; storedCvs: { used; limit } }`; `QuotaStatus = { feature, used, limit, remaining, resetsAt }`. The backend computes limits from the **effective** tier (`getEffectiveTier`).
- **Tier:** `UserSettingsApiService.userProfile` → `subscription.tier` / `status` / `cancelAtPeriodEnd`; effective tier via `getEffectiveTier()` from `@opticv/datatypes`.
- **Tier limits** (`TIER_LIMITS` in `@opticv/datatypes`): FREE 1 optimization / 1 stored CV, BASIC 10 / 5, PRO 30 / 10. PRO is the highest tier.
- **Settings** (`features/settings/settings.{ts,html}`) – existing "Usage this month" section with `p-progressbar`, `usagePercent()` and the "Resets / Access ends" label logic. Reference for look and wording; not modified.
- **Dashboard** (`features/dashboard/dashboard.{ts,html}`) – three stat cards (CVs stored, Optimizations, Latest activity) followed by the `p-tabs` with CV list and optimization list. Deleting a CV happens here.
- **Upload CV** (`features/upload-cv/upload-cv.{ts,html}`) – left info panel + right panel with `app-cv-dropzone`; on upload error it shows an "Upload failed" error toast using `err.error.message`.
- **Quota errors:** `core/interceptors/quota-error-interceptor.ts` (registered globally in `app.config.ts`) recognises `QuotaErrorPayload` codes `QUOTA_EXCEEDED`, `FEATURE_NOT_AVAILABLE`, `CV_LIMIT_EXCEEDED` and currently shows a warning/info toast for each.
  - `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` are thrown by `QuotaService.checkAndConsume` (optimization triggers).
  - `CV_LIMIT_EXCEEDED` is thrown by `CvService.uploadCv`.
- **CV optimization page** already shows inline plan-limit messages on the affected cards (`planLimitMessage`, `storedPlanBlockedMessages`) and calls `reloadUsageStatus()` after a run – unchanged by this task.
- **App shell** `app.html` – hosts global components (`p-toast`, `app-welcome-guide-modal`, `app-past-due-banner`); the new global dialog lives here.
- `/pricing` route exists (Task 134) and is the upgrade destination.

## Scope

### In scope

- **Reusable usage-meter presentational component** (shared, e.g. `shared/components/usage-meter/`): inputs for label, `used`, `limit`, optional reset date/label, and whether to show the upgrade link; renders "X of Y … used" text, a `p-progressbar`, and an optional **Upgrade** link to `/pricing`.
- **Usage-nudge derived state** (computed signals, either in a small root service or in the consuming components): effective tier, CV-optimization quota, stored-CV usage, "near limit" flags, `canUpgrade` (tier ≠ PRO).
- **Dashboard:** new "Usage this month" panel between the stat cards and the tabs, with two rows: CV optimizations and stored CVs. Existing stat cards unchanged.
- **Upload CV page:** stored-CV usage row; when at the stored-CV limit, the dropzone is replaced by a limit prompt.
- **Global quota-hit upgrade dialog** (`p-dialog`, hosted in `app.html`), opened by `quotaErrorInterceptor` instead of the current toasts.
- Suppress the generic "Upload failed" error toast on the upload page when the error is `CV_LIMIT_EXCEEDED` (the dialog covers it).
- Refresh usage (`reloadUsageStatus()`) on Dashboard and Upload page init, after a successful CV upload and after a successful CV deletion on the dashboard.
- PostHog click tracking for the new Upgrade / View plans actions, following the existing `posthog.capture(...)` pattern (`page`, `button_name`).
- Unit tests for the new component(s), the dialog, the interceptor change, Dashboard and Upload CV changes.

### Out of scope

- Backend / API / DB / shared-type changes.
- Changes to the Settings usage section (stays as is; not refactored onto the new component).
- Changes to the CV optimization page's inline plan-limit messages.
- Usage for COVER_LETTER, INTERVIEW_PREP and LINKEDIN quotas on dashboard/upload (only CV optimizations and stored CVs, as stated in the task).
- Changing the existing dashboard stat cards (the "Optimizations" card keeps showing the all-time count).
- Pricing page changes and Stripe checkout flow.
- Fixing the pre-existing inconsistency that `CvService.uploadCv` uses the raw tier while `/users/me/usage` uses the effective tier.

## Behavior

### Shared rules

1. **Near-limit rule:** a meter is "near or at limit" when `limit > 0 && used / limit >= 0.8`. Examples: FREE after 1 use (1/1), BASIC at 8/10 optimizations or 4/5 CVs, PRO at 24/30 or 8/10.
2. **Upgrade link visibility:** shown only when the meter is near/at limit **and** the effective tier is not PRO. PRO users never see an upgrade link (no higher tier); they see the usage text and reset date only.
3. **Upgrade destination:** `/pricing` (router link). Clicking is tracked in PostHog.
4. **Wording:**
   - Optimizations: "{used} of {limit} optimizations used".
   - Stored CVs (a total cap, not monthly): "{used} of {limit} CVs stored".
   - Reset date for the optimization meter: "Resets {date}" or "Access ends {date}" when `subscription.cancelAtPeriodEnd` is true (same rule as Settings), using `quota.resetsAt` with `date: 'mediumDate'`. Not shown when `resetsAt` is null. Stored CVs have no reset date.
5. **Visual state:** progress bar value `min(100, used / limit * 100)` (same as Settings' `usagePercent`). At the limit (`used >= limit`) the text clearly states it (e.g. "Limit reached") – not by colour alone.
6. **Loading / no data:** while `usageStatus` has no value (loading or error) the usage panel/row is not rendered; no error UI is shown for it (the rest of the page works as today).

### Dashboard

1. On init, call `reloadUsageStatus()` (alongside the existing `loadOptimizations()`).
2. Render a bordered section with `aria-label="Usage"` and heading "Usage this month" between the stat cards and `p-tabs`, styled consistently with the existing cards / Settings usage section.
3. Two rows using the usage-meter component:
   - **CV optimizations** – from `usageStatus.quotas` entry with `feature === 'CV_OPTIMIZATION'`, with reset date.
   - **Stored CVs** – from `usageStatus.storedCvs`.
4. Each row independently shows its Upgrade link per the shared rules.
5. After a CV is deleted successfully, call `reloadUsageStatus()` so the stored-CV row updates.

### Upload CV page

1. On init, call `reloadUsageStatus()`.
2. A stored-CV usage row ("{used} of {limit} CVs stored", progress bar, Upgrade link per shared rules) is shown in the right panel above the dropzone / result area.
3. **At limit (`storedCvs.used >= storedCvs.limit`) and no file was just uploaded in this view:** the dropzone is not rendered. Instead a prompt is shown: "You've reached your limit of {limit} stored CVs. Delete a CV from your dashboard or upgrade your plan to add more." with:
   - a link/button to `/dashboard` ("Go to dashboard"),
   - a **View plans** button to `/pricing` (hidden for PRO; PRO sees only the dashboard action and text without "or upgrade your plan").
4. Below the limit: dropzone behaves exactly as today.
5. After a successful upload: `reloadUsageStatus()` is called (in addition to the existing `cvStore.loadUserCVs(true)`); the success view ("Ready to go", uploaded file card) is shown as today. If the user then clicks "Upload another CV" and is now at the limit, the limit prompt (step 3) is shown instead of the dropzone.
6. On upload error with `CV_LIMIT_EXCEEDED`: the dropzone selection is reset as today, the generic "Upload failed" toast is **not** shown (the global dialog handles it), and `reloadUsageStatus()` is called so the page switches to the limit prompt.

### Global quota-hit upgrade dialog

1. `quotaErrorInterceptor` no longer adds toasts; for any `QuotaErrorPayload` it opens the dialog (via a root-provided state holder, e.g. a small service/signal store with `open(payload)` / `close()`) and still rethrows the error so callers keep their existing handling.
2. The dialog component is placed in `app.html` and reads the current payload + effective tier.
3. Content per payload (header / message / actions):

   | Code | Tier ≠ PRO | Tier = PRO |
   |---|---|---|
   | `QUOTA_EXCEEDED`, `cancelAtPeriodEnd && resetsAt` | "Limit reached" – "You've used all your {feature label} for this period, and your plan won't renew. Access ends {date}." – **View plans**, **Not now** | same text – **Close** only |
   | `QUOTA_EXCEEDED`, `resetsAt` | "Limit reached" – "You've used all your {feature label} this month. Resets {date}. Upgrade your plan for a higher limit." – **View plans**, **Not now** | "You've used all your {feature label} this month. Resets {date}." – **Close** only |
   | `QUOTA_EXCEEDED`, no `resetsAt` | "Limit reached" – "You've used all your {feature label} on your current plan. Upgrade your plan for a higher limit." – **View plans**, **Not now** | n/a (PRO always has a period) – **Close** |
   | `FEATURE_NOT_AVAILABLE` | "Not available on your plan" – "{feature label} is not included in your current plan. Upgrade to unlock it." – **View plans**, **Not now** | n/a – **Close** |
   | `CV_LIMIT_EXCEEDED` | "CV storage limit reached" – "You can store up to {limit} CVs on your plan. Delete one or upgrade to add more." – **View plans**, **Not now** | "You can store up to {limit} CVs on your plan. Delete one to add more." – **Close** only |

   Feature labels reuse the existing wording (`CV optimization runs`, `Cover letter generations`, `Interview prep generations`, `LinkedIn content generations`).
4. **View plans** closes the dialog and navigates to `/pricing`; **Not now** / **Close** / Escape / close icon closes it. Both are tracked in PostHog (View plans at least).
5. If several quota errors arrive while the dialog is open (e.g. parallel optimization triggers), the dialog stays open showing the first payload; later ones are ignored until it is closed (no stacking).
6. Accessibility: `p-dialog` modal with header as accessible name, focus moved into the dialog on open and returned on close, Escape closes, buttons are real buttons with clear labels.

## Edge Cases

- **User profile not loaded / tier unknown:** treat as upgradable (show Upgrade / View plans); do not hide the nudge.
- **`limit === 0`** (feature not offered): meter not shown as "near limit" (rule requires `limit > 0`); not applicable to CV_OPTIMIZATION or stored CVs with current `TIER_LIMITS`.
- **`used > limit`** (e.g. after a downgrade, stored CVs above the new cap): progress bar capped at 100 %, text shows real numbers ("6 of 5 CVs stored"), treated as at limit (upload page shows the limit prompt).
- **CV_OPTIMIZATION quota missing from `usageStatus.quotas`:** optimization row not rendered; stored-CV row still shown.
- **`resetsAt` null:** reset date omitted.
- **Usage request fails:** usage UI hidden; page otherwise unaffected; quota enforcement still happens server-side and the dialog still appears on a hit.
- **SSR:** `usageStatus` only loads when the Supabase session is ready (existing resource condition), so the server render shows no usage UI; the dialog is closed by default and only opened from the interceptor in response to HTTP errors.
- **Optimization page quota hit:** dialog opens and the existing inline card message is still shown (both are intended).
- **Logged-out user:** no usage UI is rendered (pages are behind `authGuard`); the dialog cannot trigger as quota endpoints require auth.

## Data / API

- **Endpoints:** none new. Reuses `GET /api/users/me/usage` (`UsageStatus`) and `GET /api/users/me` (`UserProfile`) via `UserSettingsApiService`.
- **Models:** reuses `UsageStatus`, `QuotaStatus`, `QuotaErrorPayload`, `LimitedFeature`, `SubscriptionTier`, `getEffectiveTier` from `@opticv/datatypes`. No changes.
- **DB changes:** none.
- **Frontend additions (indicative):**
  - shared usage-meter component (presentational, `input()`s, OnPush);
  - quota upgrade dialog component + root-provided dialog state (signal-based);
  - modified `quotaErrorInterceptor`, `Dashboard`, `UploadCv`, `app.html` / `app.ts` imports.

## Assumptions

- "Monthly usage of stored CVs" is interpreted as the current number of stored (active) CVs against the tier cap; stored CVs are not reset monthly.
- The upgrade link/dialog target is the existing `/pricing` page.
- PRO users never get upgrade CTAs (no higher tier).
- Near-limit threshold is ≥ 80 % (confirmed).
- PostHog tracking of the new CTAs follows the existing convention (Task 135 precedent).

## Acceptance (DEV)

- Dashboard shows "Usage this month" with CV optimizations and stored CVs ("X of Y …"), progress bars, reset date, and an Upgrade link only when ≥ 80 % used and tier ≠ PRO.
- Upload page shows stored-CV usage; at the limit the dropzone is replaced by the limit prompt with dashboard and View plans (non-PRO) actions.
- Any `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` / `CV_LIMIT_EXCEEDED` response opens the upgrade dialog instead of a toast; View plans navigates to `/pricing`; PRO users see no upgrade action.
- No duplicate "Upload failed" toast for `CV_LIMIT_EXCEEDED`.
- Usage refreshes after upload, CV deletion and page init.
- AXE / WCAG AA: limit state conveyed by text, dialog focus management correct.
- `nx lint`, `nx typecheck`, `nx test`, `nx build` pass for `opticv-web`.
- Unit tests added/updated for usage-meter, upgrade dialog, `quotaErrorInterceptor`, `Dashboard`, `UploadCv`.
- No breaking changes to Settings or the CV optimization page.
