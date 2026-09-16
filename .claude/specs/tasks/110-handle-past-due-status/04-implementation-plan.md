# Implementation Plan: 110-handle-past-due-status

## Source

- Specification: `.claude/specs/tasks/110-handle-past-due-status/02-spec.md`
- Specification review: `.claude/specs/tasks/110-handle-past-due-status/03-spec-review.md` (PASS WITH ISSUES — proceed as-is)

## Notes carried forward from spec review

These are clarifications to apply during implementation, not new requirements:

- At the `getUsageStatus` call site, compute `effectiveTier` once into a single variable and reuse it for both `TIER_LIMITS[effectiveTier].maxStoredCvs` and the `QuotaService.getQuotaStatus` call (avoid recomputing).
- The effective-tier change to `resolveTierAndPeriod` must be verified against both call sites that use it: `triggerOptimization` and `triggerSingleJob`. It is a single shared change (both call the same private method), but both call sites' tests must be checked/updated.
- `QuotaService` and `quota.service.ts` / `quota.service.spec.ts` are NOT modified — `QuotaService` stays status-agnostic, unaware of `SubscriptionStatus`.
- The banner's "per session" dismiss behavior is actually page-view-scoped (in-memory signal, no `sessionStorage`/`localStorage`). Implement it literally as described in spec Behavior item 5 / Edge Cases — an in-memory signal on the banner component that resets on reload. Do not reach for `sessionStorage`.
- No SSR-specific guard is needed for `window.location.href` in the banner — this matches existing unguarded precedent in `Settings.onManageBilling`.

---

## Step 1 — Shared `getEffectiveTier` helper (`@opticv/datatypes`)

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

- Add a new exported function `getEffectiveTier(tier: SubscriptionTier, status: SubscriptionStatus): SubscriptionTier`.
- Place it directly after the `SubscriptionStatus` type definition (near `TIER_LIMITS`, per spec Behavior item 1: "colocated with `TIER_LIMITS`").
- Logic: return `tier` when `status === 'ACTIVE' || status === 'TRIALING'`; otherwise return `'FREE'`.
- No new exported types required; reuses `SubscriptionTier` and `SubscriptionStatus`, both already exported.

**File:** `packages/shared/datatypes/src/lib/datatypes.spec.ts` (create if it does not already exist — check first)

- Unit tests for `getEffectiveTier` covering:
  - `status: 'ACTIVE'` with each of `FREE`, `BASIC`, `PRO` → returns the same tier unchanged.
  - `status: 'TRIALING'` with `PRO` (and/or `BASIC`) → returns the same tier unchanged.
  - `status: 'PAST_DUE'` with `PRO` → returns `'FREE'`.
  - `status: 'CANCELED'` with `BASIC` → returns `'FREE'`.

**Build order:** run `npm exec nx build datatypes` after this step so the compiled output is available to consuming apps before Steps 2–4.

---

## Step 2 — Backend: `OptimizationService.resolveTierAndPeriod`

**File:** `apps/opticv-be/src/app/optimization/optimization.service.ts`

- Import `getEffectiveTier` from `@opticv/datatypes` alongside the existing `SubscriptionTier` import.
- In `resolveTierAndPeriod` (around line 42–63):
  - Extend the Prisma `select` to also fetch `status: true` on the subscription (currently selects `tier`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`).
  - After computing the raw tier fallback (`subscription?.tier ?? 'FREE'`), also resolve `subscription?.status`. Use the existing `?? 'FREE'` tier fallback pattern; for status, if `subscription` is null there is no status to read — in that case the effective tier must still resolve to `FREE` (see Edge Cases in spec). Compute `effectiveTier = subscription ? getEffectiveTier(rawTier, subscription.status as SubscriptionStatus) : 'FREE'`.
  - Return `tier: effectiveTier` in the existing return object shape (field name and shape unchanged per spec Data/API section — `tier` now holds the effective value, not the raw one).
- No changes needed at the `triggerOptimization` (line ~65–81) or `triggerSingleJob` (line ~146–155) call sites themselves — both already destructure `tier` from `resolveTierAndPeriod()` and pass it straight into `quotaService.checkAndConsume`. Confirm both call sites are exercised by the updated tests in Step 6.
- Import `SubscriptionStatus` type from `@opticv/datatypes` if not already imported.

---

## Step 3 — Backend: `UsersService.getUsageStatus`

**File:** `apps/opticv-be/src/app/users/users.service.ts`

- Import `getEffectiveTier` from `@opticv/datatypes` alongside existing imports (`SubscriptionTier`, `TIER_LIMITS`).
- In `getUsageStatus` (around line 194–222):
  - After line 204 (`const tier = (user.subscription?.tier ?? 'FREE') as SubscriptionTier;`), add a `status` read: `const status = (user.subscription?.status ?? 'CANCELED') as SubscriptionStatus` (any non-`ACTIVE`/`TRIALING` fallback value works since a null subscription must resolve to `FREE`; reuse the pattern from Step 2 for consistency — if simpler, mirror the `subscription ? getEffectiveTier(...) : 'FREE'` conditional instead of inventing a fallback status).
  - Compute `const effectiveTier = ...` once, per the spec-review clarification.
  - Replace the two subsequent usages of `tier` (line 209 passed to `quotaService.getQuotaStatus`, and line 213 `TIER_LIMITS[tier].maxStoredCvs`) with `effectiveTier`.
  - Do not touch `getProfile` or `updateDisplayName`/`updateNotificationPreference` — `UserProfile.subscription.tier`/`status` must keep reporting raw values (spec Scope, explicitly out of scope for effective-tier substitution).

---

## Step 4 — Frontend: `cv-optimization.ts` `allowedTemplateIds`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

- Import `getEffectiveTier` from `@opticv/datatypes` alongside existing `SubscriptionTier`/`TIER_LIMITS` imports.
- In the `allowedTemplateIds` computed signal (lines 228–236):
  - Read both `tier` and `status` from `this.userSettingsApiService.userProfile.value()?.subscription`.
  - Default `tier` to `'FREE'` as today; default `status` such that a missing subscription resolves to effective `FREE` (mirror the null-subscription pattern used in Steps 2–3: only call `getEffectiveTier` when a subscription exists, otherwise fall straight to `'FREE'`).
  - Compute `const effectiveTier = subscription ? getEffectiveTier(subscription.tier, subscription.status) : 'FREE'`.
  - Use `TIER_LIMITS[effectiveTier].allowedTemplates` instead of `TIER_LIMITS[tier].allowedTemplates`.
- No other logic in this computed signal changes (the `'ALL'` vs. array handling below it is untouched).

---

## Step 5 — Frontend: `PastDueBanner` component

**New files (following the `Footer`/layout component pattern — standalone, `OnPush`, external template/style, colocated spec):**

- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.ts`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.html`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.css`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.spec.ts`

**`past-due-banner.ts`:**

- `@Component` with `selector: 'app-past-due-banner'`, `changeDetection: ChangeDetectionStrategy.OnPush`, external `templateUrl`/`styleUrl` relative to the component file.
- Imports needed in the component decorator: PrimeNG `Message` module (`p-message`, matching spec wording "PrimeNG `Message`/`p-message` or equivalent existing pattern" — check existing usage of `p-message` elsewhere in the codebase first; if none exists, use `ButtonModule` + a plain styled `<div>` consistent with existing banner-like UI, whichever pattern is already established) and `ButtonModule` for the "Manage billing" / close button.
- Inject `UserSettingsApiService` (for `userProfile` and `createPortalSession()`) and `MessageService` (for the error toast), matching the `Settings` component's injection style (`inject()` function, not constructor injection).
- State:
  - `dismissed = signal(false)` — local, in-memory, resets on reload (no storage).
  - `isRedirectingToPortal = signal(false)` — mirrors `Settings.isRedirectingToPortal` for button loading/disabled state during the portal redirect.
- Computed:
  - `visible = computed(() => !this.dismissed() && this.userSettingsApiService.userProfile()?.subscription?.status === 'PAST_DUE')`.
- Methods:
  - `onManageBilling(): void` — same implementation pattern as `Settings.onManageBilling` (lines 360–382): set `isRedirectingToPortal` true, call `createPortalSession()`, `catchError` → toast via `messageService.add({ severity: 'error', summary: ..., detail: ... })`, reset `isRedirectingToPortal` to `false`, keep banner visible (do not touch `dismissed`); on success, `window.location.href = response.url`.
  - `onDismiss(): void` — `this.dismissed.set(true)`.

**`past-due-banner.html`:**

- Root element gated by `@if (visible()) { ... }` (per Angular native control-flow convention).
- Warning-styled banner containing: message text ("Your last payment failed. Update your payment method to keep your BASIC/PRO features." per spec wording), a "Manage billing" button bound to `(onClick)="onManageBilling()"` with `[disabled]`/loading state bound to `isRedirectingToPortal()`, and a close (X) icon-button bound to `(onClick)="onDismiss()"` with an appropriate `aria-label` (e.g. "Dismiss payment failed banner") for accessibility (WCAG AA requirement per conventions).

**Styling:** Tailwind utility classes per project convention (no `ngClass`/`ngStyle`; use `class`/`style` bindings if any conditional styling is needed — unlikely here since visibility is handled by `@if`).

**Registration in app shell:**

**File:** `apps/opticv-web/src/app/app.html`

- Add `<app-past-due-banner></app-past-due-banner>` between `</app-top-header>` and `<main class="main">`.

**File:** `apps/opticv-web/src/app/app.ts`

- Import `PastDueBanner` from `./layout/past-due-banner/past-due-banner` and add it to the `imports` array of the `App` component decorator.

---

## Step 6 — Tests

### `packages/shared/datatypes/src/lib/datatypes.spec.ts`

- Covered in Step 1: `getEffectiveTier` truth-table tests across all `SubscriptionStatus` × representative `SubscriptionTier` combinations.

### `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`

- Update mocked Prisma `subscription.findUnique` responses (or equivalent mock setup) to include a `status` field, since `resolveTierAndPeriod`'s `select` now fetches it.
- Add a new test case: subscription with `tier: 'PRO'`, `status: 'PAST_DUE'` → `quotaService.checkAndConsume` is called with `tier: 'FREE'` (not `'PRO'`), for both `triggerOptimization` and `triggerSingleJob` describe blocks (per spec Acceptance criteria and the review's note that both call sites must be verified).
- Confirm existing `ACTIVE`-status test fixtures (if `status` is not currently part of mocked data) still pass — add `status: 'ACTIVE'` to any existing subscription mocks so pre-existing tests keep asserting raw-tier behavior correctly.

### `apps/opticv-be/src/app/users/users.service.spec.ts`

- Update mocked `prisma.user.findUnique` subscription fixtures to include `status`.
- Add a new test case: `getUsageStatus` with subscription `tier: 'PRO'`, `status: 'PAST_DUE'` → asserts `quotaService.getQuotaStatus` is called with `'FREE'` and the returned `storedCvs.limit` equals `TIER_LIMITS.FREE.maxStoredCvs` (2).
- Confirm existing `ACTIVE`/no-subscription test cases still pass with `status` added to fixtures where needed.

### `apps/opticv-be/src/app/quota/quota.service.spec.ts`

- No changes — confirmed out of scope per spec Scope section (`QuotaService` remains status-agnostic). Do not modify this file.

### `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` (if it exists — check first)

- If a spec file already covers `allowedTemplateIds`, add/update a test case: subscription `tier: 'PRO'`, `status: 'PAST_DUE'` → `allowedTemplateIds()` returns the FREE-tier template list (`['default', 'classic']`) rather than `'ALL'`.
- If no such spec file exists, this is not newly required by the spec's Acceptance section (which only explicitly calls out the banner spec and the two backend service specs) — skip creating one unless an existing spec file for this component already exists and is the natural place to extend.

### `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.spec.ts`

- New spec, following the `Footer`/`Settings` spec conventions (`TestBed.resetTestingModule()`, mock `UserSettingsApiService` and `MessageService` via `TestBed`, per `settings.spec.ts` pattern).
- Test cases required by spec Acceptance section:
  - Visible when `userProfile().subscription.status === 'PAST_DUE'`.
  - Hidden when `status` is `'ACTIVE'`, `'TRIALING'`, `'CANCELED'`, or `subscription` is `null`.
  - Hidden after clicking the dismiss (close) button, even while `status` remains `'PAST_DUE'`.
  - Clicking "Manage billing" calls `userSettingsApiService.createPortalSession()`.
  - On `createPortalSession()` error, banner remains visible (not dismissed) and an error toast is added via `MessageService`.

---

## Step 7 — Verification (Acceptance criteria from spec)

Run in order:

1. `npm exec nx build datatypes`
2. `npm exec nx build opticv-be`
3. `npm exec nx build opticv-web`
4. `npm exec nx typecheck opticv-be`
5. `npm exec nx typecheck opticv-web`
6. `npm exec nx test opticv-be`
7. `npm exec nx test opticv-web`
8. `npm exec nx lint opticv-be`
9. `npm exec nx lint opticv-web`

Manual verification (per spec Acceptance section, requires a test subscription manually set to `status = 'PAST_DUE'` in the DB):

- Banner appears on app load.
- CV optimization quota is capped at FREE limits.
- Template picker only offers FREE templates.
- "Manage billing" opens the Stripe portal.
- Dismissing the banner hides it until reload.

---

## Files Summary

### Created

- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.ts`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.html`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.css`
- `apps/opticv-web/src/app/layout/past-due-banner/past-due-banner.spec.ts`
- `packages/shared/datatypes/src/lib/datatypes.spec.ts` (only if it does not already exist)

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts` — add `getEffectiveTier`
- `apps/opticv-be/src/app/optimization/optimization.service.ts` — effective tier in `resolveTierAndPeriod`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` — new/updated test cases
- `apps/opticv-be/src/app/users/users.service.ts` — effective tier in `getUsageStatus`
- `apps/opticv-be/src/app/users/users.service.spec.ts` — new/updated test cases
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` — effective tier in `allowedTemplateIds`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` — new test case (only if file already exists)
- `apps/opticv-web/src/app/app.html` — add `<app-past-due-banner>`
- `apps/opticv-web/src/app/app.ts` — import/register `PastDueBanner`

### Not modified (explicitly out of scope)

- `apps/opticv-be/src/app/quota/quota.service.ts`
- `apps/opticv-be/src/app/quota/quota.service.spec.ts`
- `UserProfile.subscription` shape / `UsersService.getProfile`
- Stripe webhook handlers (`stripe.service.ts`)
