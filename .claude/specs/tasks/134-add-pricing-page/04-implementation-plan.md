# Implementation Plan — Task 134: Create pricing page

Inputs: `02-spec.md`, `03-spec-review.md` (result: PASS WITH ISSUES — planning allowed).
Rules applied: `.claude/context/*`, `docs/angular-best-practices.md` (standalone without `standalone: true`, OnPush, signals, `inject()`, native control flow, `class`/`style` bindings, no `@HostBinding`/`@HostListener`, no `ngClass`/`ngStyle`, AXE/WCAG AA, no `any`, no TODO comments, no unnecessary comments, no non-null assumptions).

## Findings from code analysis that shape the plan

1. **Server render mode.** `app.routes.server.ts` prerenders every route not listed (`**` → `Prerender`); auth-dependent pages (`settings`, `login`, `dashboard`, …) are listed as `RenderMode.Client`. `/pricing` has auth-dependent CTAs, so it must be registered as `RenderMode.Client`. Consequence: the SSR build does not prerender the page content, so the spec acceptance line "SSR build renders the page" is satisfied as "the SSR build succeeds and `/pricing` is served as a client-rendered route". **Needs confirmation from the PO/developer before step 6** (see Open Points).
2. **Effective tier.** `getEffectiveTier(tier, status)` (used by `users.service.ts` and `cv-optimization.ts`) maps PAST_DUE users to FREE limits. The spec says PAST_DUE users are treated as paid on the pricing page (Manage billing), consistent with Settings' `hasActivePaidSubscription`. The plan follows the spec; the displayed quotas always come from the plan's own `TIER_LIMITS` row, not from the viewer's effective tier.
3. **Return URL.** `getSafeReturnUrl` already accepts `/pricing`; no change to the util. The login page reads `returnUrl` from query params and forwards it to `/verify`.
4. **Auth state.** `Supabase.sessionReady()` / `Supabase.currentUser()` expose session state. `UserSettingsApiService.userProfile` is an `httpResource` that stays idle when there is no user.
5. **Tests that assert old stored-CV values** (backend, Jest): `cv.service.spec.ts` (lines ~223–260) and `users.service.spec.ts` (line ~517, `limit: 2`; also BASIC stored-CV limit expectation ~line 468–493). `quota.service.spec.ts` only touches `features`, not stored CVs. Web specs (`settings.spec.ts`) use hand-written mock `UsageStatus` values, not `TIER_LIMITS`, so they need no change for the limits.
6. **Analytics event excluded.** The PostHog `pricing_cta_clicked` event is not planned: `03-spec-review.md` flagged it as unsupported by the task, and the spec marks it "drop if the plan decides otherwise".

## Step order

Follow in order; each step leaves the repo building.

### Step 1 — Shared limits (`@opticv/datatypes`)

- Modify `packages/shared/datatypes/src/lib/datatypes.ts`: in `TIER_LIMITS`, change `maxStoredCvs` FREE `2 → 1`, BASIC `10 → 5`, PRO `20 → 10`. Leave `features` and `allowedTemplates` unchanged (Free keeps `['default', 'classic']`).

### Step 2 — Backend tests for the new limits

- Modify `apps/opticv-be/src/app/cv/cv.service.spec.ts` (upload cap tests):
  - "rejects … at the tier cap": FREE count `2 → 1`.
  - "allows upload when under the tier cap": FREE count `1 → 0`.
  - BASIC cap test: rename to the new cap (5) and mock count `9 → 4`.
  - "defaults to FREE tier limits when no subscription row exists": count `2 → 1`.
- Modify `apps/opticv-be/src/app/users/users.service.spec.ts`:
  - PAST_DUE → FREE test: expected `storedCvs` `{ used: 5, limit: 2 }` → `{ used: 5, limit: 1 }`.
  - "returns quotas and stored CV usage for the resolved tier" (PAID cycle): update the expected stored-CV `limit` to match the tier used in that test (BASIC 5 / PRO 10) after reading the test's tier; the per-feature quota `limit: 10` values are unchanged.
- No backend source files change (`cv.service.ts`, `users.service.ts` already read `TIER_LIMITS`).

### Step 3 — Shared billing redirect service (frontend)

Purpose: remove checkout/portal duplication between Settings and Pricing (spec Scope 3).

- Create `apps/opticv-web/src/app/core/services/billing-redirect.service.ts`:
  - `@Injectable({ providedIn: 'root' })`; `inject()` for `UserSettingsApiService`, `MessageService`, `DOCUMENT`.
  - Signals (readonly exposure): `redirectingToCheckout: 'BASIC' | 'PRO' | null`, `redirectingToPortal: boolean`.
  - `startCheckout(tier: 'BASIC' | 'PRO'): void` — ignores the call if any redirect is in progress; sets the signal; calls `createCheckoutSession(tier)`; on error shows the existing toast (`Checkout Error`, message from `error.error.message` or `Failed to start checkout. Please try again.`), resets the signal; on success assigns `response.url` via `DOCUMENT.defaultView?.location` (browser only).
  - `openPortal(): void` — same pattern with `createPortalSession()`, toast `Billing Portal Error` / `Failed to open billing portal. Please try again.`.
  - Messages and severities are identical to the current Settings behavior.
- Create `billing-redirect.service.spec.ts`: success redirect for each method (location assignment spied), error toast + signal reset for each, ignore second call while in progress.

### Step 4 — Settings page changes

- Modify `features/settings/settings.ts`:
  - Remove `isRedirectingToCheckout`, `isRedirectingToPortal`, `onUpgrade`; keep `onManageBilling` as a thin call to `BillingRedirectService.openPortal()`; expose the service's `redirectingToPortal` signal to the template.
  - Remove now-unused imports (`catchError`/`EMPTY` remain in use by other handlers — verify before removing).
  - Add `RouterLink` import (or `Router.navigate`) for the "View plans" action.
  - `?billing=success|canceled` handling in `ngOnInit` is unchanged.
- Modify `features/settings/settings.html`, Subscription section:
  - FREE branch: replace the two "Upgrade to …" buttons with one "View plans" `p-button` linking to `/pricing` (`routerLink`, `aria-label="View plans"`, icon `pi pi-arrow-up` kept or `pi pi-list`).
  - Paid branch: "Manage billing" button unchanged (loading/disabled bound to the service signal).
- Modify `features/settings/settings.spec.ts`:
  - Add `BillingRedirectService` mock to the providers in `setup`.
  - Replace test "shows upgrade buttons (not Manage billing) for a FREE tier user" with: shows "View plans" link to `/pricing`, no "Upgrade to Basic/Pro", no "Manage billing".
  - Update the paid-user test to keep asserting "Manage billing" present and upgrade buttons absent.
  - Add: clicking "Manage billing" calls `openPortal()`.
  - Add: `?billing=success` / `canceled` still produce the existing toasts (only if not already covered elsewhere — check `settings-privacy.spec.ts` and the rest of the file first).

### Step 5 — Pricing feature (frontend)

Create under `apps/opticv-web/src/app/features/pricing/`:

- `pricing.constants.ts`
  - Typed constant array of plan descriptors for `FREE`, `BASIC`, `PRO`: `tier`, `name`, `tagline`, `monthlyPrice` (number), and the shared "included on all plans" feature list. Taglines and prices exactly as in the spec (Free "Everything you need to get started." $0; Basic "For regular job seekers." $9.90; Pro "For serious job seekers." $19.90).
  - No quota numbers here.
- `pricing.ts` (component `Pricing`, selector `app-pricing`, OnPush, no `standalone: true`, external template `./pricing.html`)
  - Injects `Supabase`, `UserSettingsApiService`, `BillingRedirectService`, `Router`.
  - `viewerState` — `computed<'loading' | 'guest' | 'error' | 'free' | 'paid'>`:
    - `loading`: session not ready, or a user exists and the profile has no value yet and no error;
    - `guest`: session ready and no user;
    - `error`: user exists and profile resource has an error;
    - `paid`: tier ≠ `FREE` and status ∈ `ACTIVE | TRIALING | PAST_DUE`;
    - `free`: otherwise.
  - `currentTier` — `computed<SubscriptionTier | null>` from the profile.
  - `plans` — `computed` view models built from the constants plus `TIER_LIMITS[tier]`: rows for stored CVs, CV optimizations, cover letters, interview prep, LinkedIn content, templates (`allowedTemplates === 'ALL'` → "Multiple ATS-friendly CV templates"; array → "`n` CV templates"), plus the shared included-features list; and the card's CTA model: `label`, `disabled`, `loading`, `action` (`'login' | 'checkout' | 'portal' | 'none'`) derived from `viewerState`, `currentTier`, and the service's `redirectingToCheckout` / `redirectingToPortal` per the spec's CTA table.
  - `ngOnInit`: if a user exists, `userSettingsApiService.reloadUserProfile()`.
  - `onCta(plan)`: `login` → `router.navigate(['/login'], { queryParams: { [RETURN_URL_PARAM]: '/pricing' } })`; `checkout` → `billing.startCheckout(tier)` (BASIC/PRO only); `portal` → `billing.openPortal()`; `none` → no-op.
  - Free card for logged-out viewers uses the same login navigation (spec Assumption 10 in review: Free CTA also returns to `/pricing`; follows the spec table literally).
- `pricing.html`
  - Single `<h1>` ("Choose the plan that works best for you") + short subtitle (text: "Start free. Upgrade when you need more.").
  - `<ul>`/grid of three `<article>` cards (`@for … track plan.tier`), each with `<h2>` plan name, price (`<p>` with visually clear "/ month"), CTA `p-button` (`aria-label` includes plan name, e.g. "Upgrade to Basic"), and a feature `<ul>` with check icons marked `aria-hidden="true"`.
  - Tailwind layout: single column on mobile, three columns from `md`; card style `rounded-lg border border-gray-200 p-6`; highlight the viewer's current plan card with a `class` binding (no `ngClass`).
  - `<p-toast>` is not added: toasts use the app-level `MessageService` outlet already used by Settings (confirm where `p-toast` is hosted — `app.html` — before finishing).
  - Disabled/loading states per Edge Cases: while `viewerState` is `loading` or `error`, purchase CTAs are disabled; button labels in the loading state fall back to the guest wording only after `sessionReady`.
- `pricing.spec.ts` — Vitest, same patterns as `settings.spec.ts` (mock `UserSettingsApiService`, `Supabase`, `BillingRedirectService`, `provideRouter([])`):
  - renders three plans with prices and quotas equal to `TIER_LIMITS` (stored CVs 1/5/10, optimizations 1/10/30);
  - guest: all CTAs navigate to `/login` with `returnUrl=/pricing`;
  - free user: Free card "Current plan" disabled; Basic/Pro call `startCheckout('BASIC'|'PRO')`; loading state disables both paid buttons;
  - paid user (BASIC and PRO): own card "Current plan" disabled; the other paid card calls `openPortal()`; Free card shows no purchase action (see Open Points #2 for the label);
  - PAST_DUE and `cancelAtPeriodEnd` users are treated as paid;
  - session-not-ready and profile-error states: purchase CTAs disabled, no navigation or service calls;
  - no authentication guard on the route (covered in step 6 test).

### Step 6 — Routing and render mode

- Modify `apps/opticv-web/src/app/app.routes.ts`: add, before the `''` and `**` routes, a route `path: 'pricing'`, `title: 'Pricing – OptiCV'`, lazy `loadComponent` for `Pricing`, **no `canActivate`**.
- Modify `apps/opticv-web/src/app/app.routes.server.ts`: add `{ path: 'pricing', renderMode: RenderMode.Client }` before the `**` entry.
- Add a routes test (new `apps/opticv-web/src/app/app.routes.spec.ts`, or extend an existing one if present — check first): the `pricing` route exists, lazy-loads a component, and has no `canActivate` / `canMatch` guards.

### Step 7 — Verification

Run from the workspace root with `npm exec nx …`:

1. `npm exec nx test datatypes` (if a test target exists) and `npm exec nx test opticv-be -- cv.service.spec users.service.spec quota.service.spec`.
2. `npm exec nx test opticv-web -- pricing settings billing-redirect app.routes`.
3. `npm exec nx run-many -t lint typecheck test -p opticv-web opticv-be datatypes`.
4. `npm exec nx build opticv-web` (production SSR build must succeed with the new server route) and `npm exec nx build opticv-be`.
5. `npm exec nx format:check`.
6. Manual check (dev server): logged-out visit of `/pricing` (no redirect); login round trip returns to `/pricing`; FREE user checkout redirect; paid user Manage billing; mobile width (≈375 px); keyboard navigation and focus order; AXE scan (browser extension or devtools) on `/pricing` and `/settings`.

## Files

### Created

- `apps/opticv-web/src/app/core/services/billing-redirect.service.ts`
- `apps/opticv-web/src/app/core/services/billing-redirect.service.spec.ts`
- `apps/opticv-web/src/app/features/pricing/pricing.constants.ts`
- `apps/opticv-web/src/app/features/pricing/pricing.ts`
- `apps/opticv-web/src/app/features/pricing/pricing.html`
- `apps/opticv-web/src/app/features/pricing/pricing.spec.ts`
- `apps/opticv-web/src/app/app.routes.spec.ts` (only if no suitable routes spec exists)

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/src/app/cv/cv.service.spec.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-web/src/app/app.routes.ts`
- `apps/opticv-web/src/app/app.routes.server.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`

### Not changed (explicitly)

- Backend source (Stripe service, controllers, `cv.service.ts`, `users.service.ts`), Prisma schema, header/footer navigation, landing page, `UserSettingsApiService` (its checkout/portal methods are reused as-is), `return-url.ts`.

## Open Points to confirm before or during implementation

1. **Render mode `Client` for `/pricing`** (finding 1) deviates from the literal spec line "SSR build renders the page"; the alternative (Prerender with auth-aware CTAs hydrating client-side) risks a flash of guest content and SSR access to Supabase/session. Recommendation: `RenderMode.Client`.
2. **Free card for paid users:** spec says "no purchase action" without defining content. Plan default: the Free card shows no button, only its plan details (no placeholder). Confirm or specify a label.
3. **Existing users above the new stored-CV limits** (spec Edge Cases): plan makes no data change; Settings usage would show e.g. `2 / 1`. PO confirmation still pending per the spec review.
4. **Subtitle text** is not defined in the spec; the plan uses a neutral line ("Start free. Upgrade when you need more.") and avoids the landing page's "unlimited" wording, which conflicts with the 30-run limit.
