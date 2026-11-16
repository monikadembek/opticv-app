# Task Specification

## Source

Azure DevOps Task: 134 — Create pricing page

## Goal

Add a public `/pricing` page in `opticv-web` that compares the Free, Basic and Pro plans (price and quotas) and lets users start the existing Stripe checkout from it. The Settings page stops being the only place with upgrade UI and instead links to `/pricing`. As part of this, align the app's enforced tier limits (`TIER_LIMITS`) with the limits advertised on https://opticv.net/pricing/.

## Context

- Frontend: `apps/opticv-web` (Angular 21, standalone, OnPush, signals, PrimeNG 21, Tailwind 4, SSR enabled). Routes in `src/app/app.routes.ts`; public routes today: `home`, `privacy-policy`, `terms-of-use`.
- Current upgrade UI lives in `features/settings/settings.{ts,html}`: `onUpgrade(tier)` → `UserSettingsApiService.createCheckoutSession(tier)` → `POST /stripe/checkout-session` → redirect to `response.url`; `onManageBilling()` → `createPortalSession()`.
- Backend Stripe checkout (`apps/opticv-be/src/app/stripe/stripe.service.ts`) redirects back to `${frontendUrl}/settings?billing=success|canceled`; Settings shows the toasts. This stays unchanged.
- Shared limits: `TIER_LIMITS` in `packages/shared/datatypes/src/lib/datatypes.ts`, consumed by `quota.service.ts`, `cv.service.ts`, `users.service.ts` (backend) and `cv-optimization.ts` (frontend, template gating).
- Landing page pricing (source of truth for price and displayed quotas), monthly billing:

| | Free | Basic | Pro |
| --- | --- | --- | --- |
| Price | $0 | $9.90 / month | $19.90 / month |
| CV upload (stored CV) limit | 1 | 5 | 10 |
| CV optimizations | 1 | 10 | 30 |
| Cover letters, interview prep, LinkedIn content | 1 each (Free), 10 each (Basic), 30 each (Pro) — as in `TIER_LIMITS.features` |||
| CV templates | Two templates (`default`, `classic`) — landing page to be updated by PO, currently says "One CV template" | Multiple ATS-friendly templates | Multiple ATS-friendly templates |
| Included on all plans | AI resume autopsy & keyword gap analysis, summary rewrites & stronger bullet points, cover letter generator, interview prep guide, LinkedIn profile content, PDF + DOCX export |||

## Scope

### In scope

1. **New route `/pricing`** (lazy-loaded, `title: 'Pricing – OptiCV'`), **no `authGuard` and no `guestGuard`** — reachable by logged-in and logged-out users.
2. **New standalone component** `features/pricing/pricing.{ts,html}` (OnPush, signals) rendering three plan cards: Free, Basic, Pro, each with name, tagline, monthly price, quota list and a CTA button. Quota numbers are derived from `TIER_LIMITS` (not hard-coded copies); prices and taglines are constants in the pricing feature.
3. **Button behavior** (see Behavior) reusing the existing Stripe flow (`UserSettingsApiService.createCheckoutSession`, `createPortalSession`). Checkout/portal redirect logic is moved/shared so Settings and Pricing do not duplicate it (e.g. a small shared service or reuse of the API service plus a shared helper) — exact structure decided in the plan.
4. **Settings page change**: remove the "Upgrade to Basic" / "Upgrade to Pro" buttons and the `onUpgrade` / `isRedirectingToCheckout` code; for FREE users show a "View plans" link/button to `/pricing`. Plan badge, status badge, renewal text, usage section and "Manage billing" (paid users) remain. `?billing=success|canceled` toast handling stays in Settings.
5. **Tier limits update** in `@opticv/datatypes` `TIER_LIMITS`, to match the landing page:
   - `maxStoredCvs`: FREE 2→**1**, BASIC 10→**5**, PRO 20→**10**.
   - FREE `allowedTemplates` stays `['default', 'classic']` (PO decision: the landing page will be updated to list 2 free templates).
   - Update every spec/test that asserts the old stored-CV values.
6. Unit tests for the new component, the Settings change, and updated limit tests.

### Out of scope

- Annual billing / monthly–annual toggle (landing page has a toggle UI, but only monthly Stripe prices exist in the app).
- Changing Stripe prices, products, or the backend checkout/portal endpoints and their `success_url` / `cancel_url` (remain `/settings?billing=…`).
- Auto-starting checkout after login (user returns to `/pricing` and clicks again).
- Adding a "Pricing" entry to the header menu or footer (not requested; can be a follow-up).
- Editing the landing page itself (the PO will update it to mention 2 free templates).
- Migrating/cleaning up existing users who exceed the new lower limits (see Edge Cases).
- FAQ section, enterprise plan, promo-code UI.

## Behavior

### Page layout

- Page title "Choose the plan that works best for you" with a short subtitle; three cards side by side on desktop, stacked on mobile (Tailwind responsive). Order: Free, Basic, Pro.
- Each card: plan name, tagline (Free "Everything you need to get started." / Basic "For regular job seekers." / Pro "For serious job seekers."), price (`$0`, `$9.90`, `$19.90` with "/ month"), CTA, then the feature list (quotas from `TIER_LIMITS` + the shared included features).
- Must meet WCAG AA and AXE (semantic headings, accessible button names that include the plan, sufficient contrast, keyboard operable).
- No UI mockups were provided (no `ui/` folder); layout follows the landing page structure and existing app styling (PrimeNG + Tailwind, same card style as Settings: `rounded-lg border border-gray-200`).

### CTA behavior

| Viewer | Free card | Basic / Pro card |
| --- | --- | --- |
| Logged out | "Get started for free" → `/login` (with `returnUrl=/pricing`) | "Get Basic" / "Get Pro" → `/login?returnUrl=/pricing`; after OTP the user lands on `/pricing` and clicks again |
| Logged in, FREE | "Current plan" (disabled) | "Upgrade to Basic" / "Upgrade to Pro" → `createCheckoutSession(tier)` → redirect to Stripe URL; button shows loading, both paid buttons disabled while redirecting |
| Logged in, paid (BASIC/PRO) | Free card shows no purchase action | Own plan card: "Current plan" (disabled). Other paid card: "Manage billing" → `createPortalSession()` → redirect to Stripe portal |

- "Paid" uses the same rule as Settings' `hasActivePaidSubscription` (tier ≠ FREE and status ∈ ACTIVE / TRIALING / PAST_DUE). A logged-in user whose profile is still loading sees the buttons disabled/loading, not the logged-out variant.
- Errors from checkout/portal show a PrimeNG toast (`Checkout Error` / `Billing Portal Error`) and re-enable the buttons, same as today.
- `returnUrl` handling reuses the existing login `returnUrl` mechanism (see `core/auth/utils/return-url`); `/pricing` must be accepted as a valid return URL.

### Settings page

- FREE user, Subscription section: replace the two upgrade buttons with a single "View plans" action navigating to `/pricing`.
- Paid user: unchanged ("Manage billing").
- After Stripe checkout the user still returns to `/settings?billing=success` / `canceled` and sees the existing toasts.

### Tier limits

- Backend enforcement (`CV_LIMIT_EXCEEDED`, template gating, `/users/me/usage`) automatically uses the new `TIER_LIMITS` values; the Settings usage section and the pricing page therefore show the same numbers as the landing page.

## Edge Cases

- **Session not ready / profile loading** for a logged-in user: render plan cards with CTAs in a disabled state; do not flash the logged-out CTA text.
- **Profile fetch failure** for a logged-in user: still show the plan cards, but keep the purchase CTAs disabled (assumption); no extra error toast, since the profile error is already surfaced by existing handling.
- **Existing users above the new limits** (e.g. a Free user with 2 stored CVs, a Basic user with 6–10): not auto-deleted (assumption); they simply cannot add more until under the limit. Confirm with PO before release.
- **PAST_DUE paid users**: treated as paid (portal button), consistent with Settings.
- **User with `cancelAtPeriodEnd`**: still treated as the current paid plan until the period ends; "Manage billing" lets them resume.
- **User opens `/pricing?billing=...`**: no special handling (Stripe never targets `/pricing`).
- **SSR**: page must render without `window`; the Stripe redirect assignment happens only in the click handler (browser).
- **Double click** on a CTA: second click ignored while a redirect is in progress.

## Data / API

- **No new endpoints.** Reuses `POST /api/stripe/checkout-session` `{ tier: 'BASIC' | 'PRO' }` and `POST /api/stripe/portal-session`.
- **Models:** no new DB or Prisma changes. `UserProfile.subscription.{tier,status,cancelAtPeriodEnd}` consumed as today.
- **Shared types change:** `TIER_LIMITS` values in `packages/shared/datatypes/src/lib/datatypes.ts` (see Scope 5). No type-shape change.
- **Frontend files (expected):** `app.routes.ts` (new route), `features/pricing/*` (new), `features/settings/settings.{ts,html,spec.ts}` (modified), existing specs touching limits (`quota.service.spec.ts`, `cv.service.spec.ts`, `users.service.spec.ts`, and any web spec asserting the old 2/10/20 stored-CV limits).
- **Analytics:** follow existing PostHog usage (`posthog.capture`) for CTA clicks only if consistent with other pages — assumption: add `pricing_cta_clicked` with `{ page: 'pricing', plan }`, gated by the existing cookie-consent behavior. Drop if the plan decides otherwise.

## Assumptions

1. Prices are USD, monthly only, and taken verbatim from the landing page ($0 / $9.90 / $19.90). The PO confirmed the Stripe prices configured in the backend match these.
2. Landing page is authoritative for stored-CV limits (per PO answer); app limits are changed to match. For Free templates the app is authoritative (2 templates); the PO will update the landing page.
3. Existing data over the new limits is left untouched.
4. No header/footer navigation change is part of this task.

## Acceptance (DEV)

- `/pricing` is reachable without authentication and with authentication; no redirect to `/login`.
- Page shows Free, Basic, Pro with prices and quotas matching the landing page and `TIER_LIMITS`.
- Logged-out CTAs go to `/login` with return to `/pricing`; logged-in FREE user can start Stripe checkout for Basic/Pro from the page; paid users see "Current plan" / "Manage billing".
- Settings no longer contains upgrade buttons; FREE users see a "View plans" link to `/pricing`; billing toasts after checkout still work.
- `TIER_LIMITS` updated (1/5/10 stored CVs; Free templates unchanged) and all affected tests updated and passing.
- Passes AXE / WCAG AA checks; works on mobile width; SSR build renders the page.
- `nx lint`, `typecheck`, `test`, `build` pass for `opticv-web`, `opticv-be` and `datatypes`.
- Tests added: pricing component (logged-out, FREE, paid states; checkout/portal calls; error toast; disabled-while-redirecting), Settings (View plans link instead of upgrade buttons), route is unguarded.
- No breaking changes to the Stripe endpoints or existing auth/guard behavior.
