# Task Specification

## Source

Task 110: Handle PAST_DUE status in backend, frontend and Stripe dashboard

## Goal

Enforce feature gating based on subscription `status`, not just `tier`. Today a user whose Stripe subscription is `PAST_DUE` keeps full BASIC/PRO access indefinitely, because every quota/tier check reads `subscription.tier` and ignores `subscription.status`. Introduce an "effective tier" concept — `tier` is only honored when `status` is `ACTIVE` or `TRIALING`; otherwise the user is treated as `FREE` for all gated features — and surface a dismissible "payment failed" banner in the frontend pointing users to the Stripe billing portal.

## Context

- Backend: `apps/opticv-be/src/app/optimization/optimization.service.ts` (resolves tier/period, calls `QuotaService.checkAndConsume`), `apps/opticv-be/src/app/quota/quota.service.ts` (quota enforcement using `TIER_LIMITS[tier]`), `apps/opticv-be/src/app/users/users.service.ts` (`getUsageStatus`, `getProfile` — reads `maxStoredCvs` and exposes subscription to frontend)
- Frontend: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` (`allowedTemplateIds` computed from raw tier), `apps/opticv-web/src/app/app.html` / `apps/opticv-web/src/app/app.ts` (app shell, global banner location), `apps/opticv-web/src/app/core/services/user-settings-api.service.ts` (`userProfile`, `createPortalSession`)
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts` (`SubscriptionTier`, `SubscriptionStatus`, `TIER_LIMITS`)

## Scope

### In scope

- A shared "effective tier" helper: `tier` is honored only when `status` is `ACTIVE` or `TRIALING`; any other status (`PAST_DUE`, `CANCELED`) resolves the effective tier to `FREE`.
- Backend: apply effective tier wherever quota/limits are currently computed from raw `subscription.tier`:
  - `OptimizationService.resolveTierAndPeriod` (feeds `QuotaService.checkAndConsume` for `triggerOptimization` and `triggerSingleJob`)
  - `UsersService.getUsageStatus` (feeds `TIER_LIMITS[tier].maxStoredCvs` and `QuotaService.getQuotaStatus`)
- `QuotaService` itself remains status-agnostic — it keeps accepting a `SubscriptionTier` and is unaware of `status`; callers are responsible for passing the effective tier.
- `UserProfile.subscription` returned by `getProfile`/`updateDisplayName`/`updateNotificationPreference` continues to expose the **raw** stored `tier` and `status` unchanged (for display purposes — e.g. "PRO" badge, renewal date) — only quota/limit computations use the effective tier, not the profile DTO.
- Frontend: `allowedTemplateIds` in `cv-optimization.ts` computed from effective tier (raw tier downgraded to `FREE` when `status` is not `ACTIVE`/`TRIALING`), matching backend behavior for template access.
- Frontend: global "payment failed, update your card" banner rendered in `app.html` (below `app-top-header`, above `router-outlet`) when `subscription.status === 'PAST_DUE'`, with a call-to-action button that triggers `createPortalSession()` and redirects to the returned Stripe billing portal URL (same mechanism as `Settings.onManageBilling`).
- Banner is dismissible (close button) for the current browser session only: dismissal state held in a signal that resets on full page reload/new session; reappears on next reload while `status` remains `PAST_DUE`.
- Unit tests for the effective-tier helper, updated backend service tests (`optimization.service.spec.ts`, `users.service.spec.ts`, `quota.service.spec.ts` if applicable), and a spec for the new banner component.

### Out of scope

- Changes to Stripe Dashboard configuration itself (despite the task title mentioning it) — no evidence in the codebase of Dashboard-side settings to change; if Stripe Dashboard smart-retry/dunning settings need adjusting, that is a manual Stripe Dashboard task outside this codebase change, not implemented here.
- Any change to how `status` is written/synced from Stripe webhooks (`handleSubscriptionUpdated`, `handleInvoicePaymentFailed` in `stripe.service.ts`) — this task only consumes the already-stored `status`.
- Changing `UserProfile` DTO shape or adding a new "effective tier" field to the API response — the frontend computes effective tier locally from the existing `tier` + `status` fields already present in `UserProfile`.
- Blocking/hard-gating access outright (e.g. a guard that throws 403 for all endpoints) — PAST_DUE users are downgraded to FREE-tier limits, not blocked entirely.

## Behavior

1. **Shared effective-tier helper** (`@opticv/datatypes`, colocated with `TIER_LIMITS`):
   - `getEffectiveTier(tier: SubscriptionTier, status: SubscriptionStatus): SubscriptionTier`
   - Returns `tier` unchanged when `status` is `'ACTIVE'` or `'TRIALING'`.
   - Returns `'FREE'` for any other status (`'PAST_DUE'`, `'CANCELED'`).
   - Exported so both backend and frontend import the same logic (single source of truth, avoids drift).

2. **Backend — quota consumption** (`OptimizationService`):
   - `resolveTierAndPeriod` reads both `tier` and `status` from the `Subscription` row.
   - Computes `effectiveTier = getEffectiveTier(tier, status)` and passes `effectiveTier` (not raw `tier`) into `QuotaService.checkAndConsume`.
   - Result: a PRO user whose subscription goes `PAST_DUE` is limited to FREE tier's quota (e.g. 1 `CV_OPTIMIZATION` run instead of 30) starting immediately, without any change to `QuotaService`.

3. **Backend — usage status display** (`UsersService.getUsageStatus`):
   - Reads `tier` and `status` from `user.subscription`.
   - Computes `effectiveTier = getEffectiveTier(tier, status)`.
   - Uses `effectiveTier` for both `TIER_LIMITS[effectiveTier].maxStoredCvs` and the `tier` argument passed to `QuotaService.getQuotaStatus`, so the usage page shows the user their actual (downgraded) limits while `PAST_DUE`.
   - `getProfile` is **not** changed — `subscription.tier` in `UserProfile` keeps reporting the real underlying tier (e.g. still shows "PRO" so the user understands what they're paying for and what they'll get back once payment succeeds).

4. **Frontend — template gating** (`cv-optimization.ts`):
   - `allowedTemplateIds` computed signal reads both `subscription.tier` and `subscription.status` from `userProfile`.
   - Calls the shared `getEffectiveTier` helper before looking up `TIER_LIMITS[...].allowedTemplates`.
   - A `PAST_DUE` PRO/BASIC user sees only the FREE-tier template set (`['default', 'classic']`).

5. **Frontend — PAST_DUE banner**:
   - New standalone component (e.g. `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.ts`), `OnPush`, rendered in `app.html` between `app-top-header` and `<main>`.
   - Visible when `userProfile().subscription?.status === 'PAST_DUE'` AND the banner has not been dismissed this session.
   - Content: warning-styled banner (PrimeNG `Message`/`p-message` or equivalent existing pattern) with text such as "Your last payment failed. Update your payment method to keep your BASIC/PRO features." and a "Manage billing" button.
   - "Manage billing" button calls `createPortalSession()` from `UserSettingsApiService`, redirects via `window.location.href` on success (same flow as `Settings.onManageBilling`), shows a `p-toast` error via existing `MessageService` pattern on failure.
   - Close (X) button sets a local `dismissed` signal to `true`; banner hides for the remainder of the session (in-memory signal — no persistence to localStorage/sessionStorage, so a full page reload will show it again while `status` remains `PAST_DUE`).
   - Component is only meaningful for authenticated users; it should render `null`/nothing when `userProfile()` has no subscription (guest/not-yet-loaded state) — no route guard needed since the underlying condition (`status === 'PAST_DUE'`) can only be true for an authenticated user with a subscription.

## Edge Cases

- `subscription` is `null` on `UserProfile` (should not normally happen post-`upsertUser`, but defensively): effective tier resolves to `FREE` (existing `?? 'FREE'` fallback pattern already used in both `resolveTierAndPeriod` and `getUsageStatus`); banner does not render.
- `status === 'CANCELED'`: also resolves to effective tier `FREE` — same treatment as `PAST_DUE` for quota/template gating, but the banner is scoped to `PAST_DUE` only per the task (a canceled subscription is a different UX case, out of scope here).
- `status === 'TRIALING'` with `tier !== 'FREE'`: effective tier equals raw tier (full access), per the task's suggested pattern of explicitly allowing `TRIALING`.
- User's status flips from `PAST_DUE` back to `ACTIVE` (payment succeeds) mid-session: next `userProfile` reload (already triggered by existing `reloadUserProfile()` calls, e.g. after returning from Stripe portal with `?billing=success`) picks up the new status and the banner's visibility condition (`status === 'PAST_DUE'`) becomes false — no extra polling needed.
- Quota already consumed at the higher tier before the subscription became `PAST_DUE` (e.g. user used 5 of 30 `CV_OPTIMIZATION` runs on PRO, then goes `PAST_DUE`): `QuotaService` counts usage per `periodStart`/feature regardless of tier, so the existing count (5) is compared against the new, lower FREE limit (1) — the user is immediately over limit and further attempts return `QUOTA_EXCEEDED` (limit 1) until the next period or until payment is fixed. This is the expected/desired behavior of downgrading effective tier and requires no special handling.
- `createPortalSession()` fails (e.g. no billing account) from the banner: show existing error-toast pattern, keep banner visible, do not mark as dismissed.

## Data / API

- No new endpoints. No DB schema changes — `status` already exists on `Subscription` and is already returned via `UserProfile.subscription.status`.
- New export from `@opticv/datatypes`: `getEffectiveTier(tier: SubscriptionTier, status: SubscriptionStatus): SubscriptionTier`.
- Modified functions (no signature changes to public DTOs):
  - `OptimizationService.resolveTierAndPeriod` — internally computes and returns effective tier instead of raw tier (return type unchanged: `{ tier: SubscriptionTier; ... }`, but `tier` now holds the effective value).
  - `UsersService.getUsageStatus` — internally computes effective tier before calling `TIER_LIMITS[...]` / `QuotaService.getQuotaStatus`; `UsageStatus` response shape unchanged.
  - `cv-optimization.ts` `allowedTemplateIds` — internal computation only, no output shape change.
- New frontend component: `PastDueBanner` (standalone, `OnPush`), added to `app.html` imports/template.

## Acceptance (DEV)

- `npm exec nx build opticv-be`, `npm exec nx build opticv-web`, and `npm exec nx build datatypes` pass.
- `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web` pass.
- `npm exec nx test opticv-be` and `npm exec nx test opticv-web` pass, including:
  - New unit test(s) for `getEffectiveTier` covering all `SubscriptionStatus` values combined with representative `SubscriptionTier` values.
  - Updated `optimization.service.spec.ts` covering a `PAST_DUE`/`PRO` user being limited to `FREE` quota.
  - Updated `users.service.spec.ts` covering `getUsageStatus` returning `FREE` limits for a `PAST_DUE` subscription.
  - New spec for the banner component covering: visible when `PAST_DUE`, hidden otherwise, hidden after dismiss, "Manage billing" triggers `createPortalSession`.
- `npm exec nx lint opticv-be` and `npm exec nx lint opticv-web` pass.
- No breaking changes to existing `UserProfile`/`UsageStatus` API contracts.
- Manual verification: with a test subscription manually set to `status = 'PAST_DUE'` in the DB, confirm (a) banner appears on app load, (b) CV optimization quota is capped at FREE limits, (c) template picker only offers FREE templates, (d) "Manage billing" opens the Stripe portal, (e) dismissing the banner hides it until reload.
