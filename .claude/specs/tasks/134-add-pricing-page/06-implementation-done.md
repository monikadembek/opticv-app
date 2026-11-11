# Implementation Done — Task 134: Create pricing page

Context files loaded: `role.md`, `rules.md`, `conventions.md`.
Preconditions: `02-spec.md`, `03-spec-review.md` (PASS WITH ISSUES), `04-implementation-plan.md` all exist.
Source examined: task commits `1ff08f7` and `e44229e`, plus uncommitted working-tree changes.

## Summary

A public, lazy-loaded `/pricing` route and `Pricing` component were delivered. It shows Free, Basic and Pro cards with prices, quotas derived from `TIER_LIMITS`, and state-dependent CTAs. Checkout and portal redirect logic was moved into a shared `BillingRedirectService`, used by Settings. Settings now shows a "View plans" button for FREE users instead of the upgrade buttons. `TIER_LIMITS.maxStoredCvs` was changed to 1 / 5 / 10, and the affected backend specs were updated. Unit tests were added for the pricing component, the billing service and the route. A "Pricing" entry was also added to the header menu.

## Specification Coverage

| # | Requirement | Status | Note |
| --- | --- | --- | --- |
| 1 | Route `/pricing`, lazy-loaded, title `Pricing – OptiCV`, no `authGuard` / `guestGuard` | Implemented | `app.routes.ts`; no `canActivate` |
| 2 | Standalone `Pricing` component (OnPush, signals) with Free / Basic / Pro cards: name, tagline, monthly price, quota list, CTA | Implemented | |
| 2a | Quota numbers derived from `TIER_LIMITS`; prices and taglines as constants | Implemented | `pricing.constants.ts` holds prices and taglines |
| 3 | CTA behavior reuses existing Stripe flow (`createCheckoutSession`, `createPortalSession`); logic shared, not duplicated | Implemented | Via `BillingRedirectService` |
| 4 | Settings: upgrade buttons, `onUpgrade` and `isRedirectingToCheckout` removed | Implemented | |
| 4a | Settings: FREE users see "View plans" navigating to `/pricing` | Implemented | Button calling `router.navigate(['/pricing'])` |
| 4b | Settings: plan badge, status badge, renewal text, usage section, "Manage billing" for paid users remain; `?billing=` toast handling stays | Implemented | `ngOnInit` billing handling not modified |
| 5 | `TIER_LIMITS.maxStoredCvs` FREE 1, BASIC 5, PRO 10; FREE templates unchanged | Implemented | |
| 5a | Specs asserting old stored-CV values updated | Implemented | `cv.service.spec.ts`, `users.service.spec.ts` |
| 6 | Unit tests: pricing component, Settings change, limit tests | Implemented | |
| 7 | Page layout: h1 "Choose the plan that works best for you" + subtitle; 3 cards, responsive grid, order Free/Basic/Pro | Implemented | `grid-cols-1 md:grid-cols-3`; subtitle "Start free. Upgrade when you need more." |
| 8 | Taglines and prices ($0, $9.90, $19.90 / month) per spec | Implemented | |
| 9 | Feature list: quotas + shared included features | Implemented | |
| 10 | CTA, logged out: Free "Get started for free", Basic/Pro "Get Basic" / "Get Pro" → `/login?returnUrl=/pricing` | Implemented | |
| 11 | CTA, logged-in FREE: Free "Current plan" (disabled); "Upgrade to Basic/Pro" → checkout; loading and both paid buttons disabled while redirecting | Implemented | |
| 12 | CTA, logged-in paid: own card "Current plan" (disabled); other paid card "Manage billing" → portal; Free card has no purchase action | Implemented | Free card renders no button |
| 13 | "Paid" = tier ≠ FREE and status ∈ ACTIVE / TRIALING / PAST_DUE | Implemented | |
| 14 | Loading profile for logged-in user: CTAs disabled, no logged-out variant | Implemented | `viewerState = 'loading'` |
| 15 | Profile fetch failure: cards shown, purchase CTAs disabled | Implemented | `viewerState = 'error'` |
| 16 | Checkout/portal errors show toast (`Checkout Error` / `Billing Portal Error`) and re-enable buttons | Implemented | In `BillingRedirectService` |
| 17 | Double click ignored while redirecting | Implemented | Guard in the service |
| 18 | Redirect only in browser click handler (SSR-safe) | Implemented | Via `DOCUMENT.defaultView?.location` |
| 19 | `/pricing` accepted as a return URL | Implemented | Existing `getSafeReturnUrl` unchanged |
| 20 | Accessibility: semantic headings, accessible button names including plan, keyboard-operable | Implemented | h1/h2, `aria-label` on CTAs; not verified by AXE in this report |
| 21 | Analytics event `pricing_cta_clicked` (optional per spec) | Not implemented | Not present in code |
| 22 | Existing users above the new limits left untouched | Implemented | No data change in code |
| 23 | Stripe endpoints and `success_url` / `cancel_url` unchanged | Implemented | No backend source changes |
| 24 | Tests: pricing (logged-out, FREE, paid, checkout/portal calls, disabled-while-redirecting) | Implemented | `pricing.spec.ts` |
| 24a | Tests: pricing error toast | Implemented | Covered in `billing-redirect.service.spec.ts` |
| 24b | Tests: Settings "View plans" instead of upgrade buttons | Implemented | `settings.spec.ts` |
| 24c | Tests: route unguarded | Implemented | `app.routes.spec.ts` |
| 25 | `nx lint` / `typecheck` / `test` / `build` pass | Not verified | Not run as part of this report |

## Files

### Created

- `apps/opticv-web/src/app/core/services/billing-redirect.service.ts`
- `apps/opticv-web/src/app/core/services/billing-redirect.service.spec.ts`
- `apps/opticv-web/src/app/features/pricing/pricing.constants.ts`
- `apps/opticv-web/src/app/features/pricing/pricing.ts`
- `apps/opticv-web/src/app/features/pricing/pricing.html`
- `apps/opticv-web/src/app/features/pricing/pricing.spec.ts`
- `apps/opticv-web/src/app/app.routes.spec.ts`

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/src/app/cv/cv.service.spec.ts`
- `apps/opticv-be/src/app/users/users.service.spec.ts`
- `apps/opticv-web/src/app/app.routes.ts`
- `apps/opticv-web/src/app/app.routes.server.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.ts`

Uncommitted at the time of writing: `pricing.ts`, `pricing.html`, `top-header.ts`.

## Components

| Component / Service | Status |
| --- | --- |
| `Pricing` (`features/pricing/pricing.ts`, `pricing.html`) | Exist |
| `pricing.constants.ts` (plan descriptors, included features) | Exist |
| `BillingRedirectService` | Exist |
| Settings changes (`settings.ts`, `settings.html`) | Exist |
| `app.routes.ts` `pricing` route | Exist |
| `app.routes.server.ts` `pricing` entry (`RenderMode.Client`) | Exist |

## Stores

The plan defines no stores. Not applicable.

## Deviations

- The Settings "View plans" action is a `p-button` with an `(onClick)` handler calling `onViewPlans()` → `router.navigate(['/pricing'])`. The plan described `routerLink` or `Router.navigate`.
- The Settings "View plans" button has no icon. The plan allowed an icon to be kept or replaced.
- `isRedirectingToPortal` remains on `Settings` as a reference to the service's `redirectingToPortal` signal, instead of being removed.
- `/pricing` is registered as `RenderMode.Client`, as the plan recommended. The spec line "SSR build renders the page" is therefore not met by prerendering. Plan Open Point 1 is still listed as unconfirmed.
- `app.routes.spec.ts` was created because no routes spec existed.
- The pricing page toast is not hosted in the component (app-level `MessageService` outlet used).

## Additional Implementation

> Additional implementation not covered by the original documents.

- A "Pricing" item (`/pricing`) was added to the header menu in `layout/top-header/top-header.ts`, for logged-out users and, in the working tree, for logged-in users. The spec lists this as out of scope (Out of scope: header menu entry; Assumption 4), and the plan lists header navigation as "Not changed".
