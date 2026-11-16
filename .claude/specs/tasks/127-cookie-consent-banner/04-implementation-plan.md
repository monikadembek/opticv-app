# Implementation Plan

Task ID: 127-cookie-consent-banner

Source: `02-spec.md`, `03-spec-review.md` (**PASS WITH ISSUES**). The spec wasn't revised after the review. The review's open points are resolved below by implementation decisions that stay within the spec, plus behavior checked against the installed `posthog-js@1.396.6`.

## Verified Library Behavior (posthog-js 1.396.6)

- `posthog.capture()` before `init`: the library checks `__loaded` first. If PostHog isn't initialized, it calls `uninitializedWarning("posthog.capture")` through its internal logger and returns, with no network request and no exception. Existing direct `capture()` call sites therefore need **no guard** (spec Edge Case; review Non-Critical 4). A console message from the PostHog logger is acceptable.
- `posthog.reset()` follows the same pattern: before `init` it only warns and returns. It must only be called on an initialized instance.
- `opt_out_capturing()`, `opt_in_capturing()`, `has_opted_out_capturing()` and `reset()` all exist in the public API (review Assumption 8).
- `defaults: '2026-05-30'` sets `capture_pageview: 'history_change'`. `init` captures a `$pageview` for the current page automatically, so Accept records the page the user is on with no extra code (review Non-Critical 1). The duplicate `$pageview` from the existing manual `NavigationEnd` subscription is today's behavior and is left unchanged (spec Assumption 4).
- PostHog storage names: the persistence key is `ph_<token>_posthog`, used for both the cookie and the `localStorage` entry, and session keys start with `ph_<token>_` in `sessionStorage`.

## Implementation Decisions (resolving review findings within spec bounds)

| Review ref                     | Decision |
| ------------------------------ | -------- |
| Non-Critical 2 (leftover storage) | At browser startup, if consent status isn't `accepted`, `PosthogService` removes leftover PostHog storage without initializing PostHog: `localStorage` and `sessionStorage` keys starting with `ph_`, and the `ph_<token>_posthog` cookie. The cookie is expired for both the current host and the parent domain, because PostHog sets it cross-subdomain. This satisfies the Acceptance line "no `ph_*` cookies or `localStorage` keys". |
| Non-Critical 3 (holder design) | NgRx Signal Store `CookieConsentStore` (`providedIn: 'root'`), because the state is shared by components and services (conventions §3). |
| Non-Critical 5/6, Assumption 12 (AXE, e2e) | No e2e tests; this matches the spec's Acceptance, which lists unit tests only. Run AXE manually with the axe DevTools / Lighthouse accessibility audit on `/`, `/login`, `/privacy-policy` and `/settings` with the banner open, in light and dark mode. |
| Ambiguous 1 (small screens)    | The banner uses `position: sticky; bottom: 0` and is placed as the last child of the `App` host, after `<app-footer>`. The `App` host is a flex column with no `overflow` rule, so sticky works. The banner stays pinned to the viewport while the user scrolls, then sits in normal flow below the footer at the end of the page. The footer and page content are never permanently hidden, and no padding hacks are needed. |
| Ambiguous 2 (welcome modal)    | The banner's z-index is above page content but below PrimeNG's overlay range (for example Tailwind `z-40`; PrimeNG dialogs start at 1100). The modal mask covers the banner while the modal is open. The modal's focus trap is unaffected, and the banner is usable again after the modal closes. |
| Ambiguous 3 (dismissable)      | The banner has no close button in any state, on first visit or when reopened. The only actions are Accept and Reject. |
| Ambiguous 4 (copy / heading)   | The Settings section heading is **"Privacy"**, the row label is **"Analytics cookies"**, and the footer and privacy policy control label is **"Cookie settings"**. The banner text is written during implementation (spec Assumption 5). |
| Ambiguous 5 (focus with no opener) | Focus is restored only if an opener element was recorded. After a choice on first visit, focus isn't moved programmatically. |
| Ambiguous 6 (higher version)   | Any `version` that isn't strictly equal to the current constant is invalid, as the spec's "other than" says. |
| Assumption 10 (hydration delay) | The banner renders only after the first client render (`afterNextRender`), so server and client initial markup match. First-time visitors see the banner right after hydration. |
| Assumption 14                  | Addressed by the Non-Critical 2 decision above. |

## Files

### Create

1. `apps/opticv-web/src/app/core/stores/cookie-consent.store.ts`
2. `apps/opticv-web/src/app/core/stores/cookie-consent.store.spec.ts`
3. `apps/opticv-web/src/app/layout/cookie-consent-banner/cookie-consent-banner.ts`
4. `apps/opticv-web/src/app/layout/cookie-consent-banner/cookie-consent-banner.html`
5. `apps/opticv-web/src/app/layout/cookie-consent-banner/cookie-consent-banner.spec.ts`
6. `apps/opticv-web/src/app/core/services/posthog.service.spec.ts`

### Modify

7. `apps/opticv-web/src/app/core/services/posthog.service.ts`
8. `apps/opticv-web/src/app/app.ts`
9. `apps/opticv-web/src/app/app.html`
10. `apps/opticv-web/src/app/app.spec.ts` (only if existing tests break because PostHog now depends on consent)
11. `apps/opticv-web/src/app/layout/footer/footer.ts`
12. `apps/opticv-web/src/app/layout/footer/footer.html`
13. `apps/opticv-web/src/app/layout/footer/footer.spec.ts`
14. `apps/opticv-web/src/app/features/settings/settings.ts`
15. `apps/opticv-web/src/app/features/settings/settings.html`
16. `apps/opticv-web/src/app/features/settings/settings.spec.ts`
17. `apps/opticv-web/src/app/features/legal/privacy-policy/privacy-policy.ts`
18. `apps/opticv-web/src/app/features/legal/privacy-policy/privacy-policy.html`
19. `apps/opticv-web/src/app/features/legal/privacy-policy/privacy-policy.spec.ts`

No backend, `@opticv/datatypes`, dependency or environment changes.

## Steps

### Step 1 — `CookieConsentStore` (`core/stores/cookie-consent.store.ts`)

Follow the `user-guide.store.ts` conventions: `signalStore`, `withState`, `withMethods`, `isPlatformBrowser` guard, and `try/catch` around storage access.

Exported types and constants (local to `opticv-web`):
- `export type CookieConsentStatus = 'accepted' | 'rejected';`
- `interface CookieConsentRecord { status: CookieConsentStatus; version: number; decidedAt: string; }`
- `const STORAGE_KEY = 'opticv_cookie_consent';`
- `export const COOKIE_CONSENT_VERSION = 1;`

State:
- `status: CookieConsentStatus | null` (initially `null`)
- `isBannerReopened: boolean` (initially `false`)

Computed (`withComputed`):
- `isBannerVisible`: `status() === null || isBannerReopened()`
- `hasAcceptedAnalytics`: `status() === 'accepted'`

Hooks (`withHooks.onInit`): in the browser only, read and validate the stored record and patch `status`.

Private helpers (module-level functions, like `readSeenByEmail`):
- `readConsent(platformId): CookieConsentStatus | null`
  - returns `null` on the server;
  - returns `null` if `localStorage` throws, the key is missing, `JSON.parse` fails, `status` isn't `'accepted'` or `'rejected'`, or `version !== COOKIE_CONSENT_VERSION`.
  - Narrow the parsed `unknown` with a type guard. Don't use `any`.
- `writeConsent(platformId, status)`: on the browser only, `setItem` with `{ status, version, decidedAt: new Date().toISOString() }` inside `try/catch`. On failure, do nothing; the in-memory state still applies (spec Edge Case).

Methods:
- `accept()`: write `'accepted'`, then patch `{ status: 'accepted', isBannerReopened: false }`.
- `reject()`: write `'rejected'`, then patch `{ status: 'rejected', isBannerReopened: false }`.
- `reopenBanner()`: patch `{ isBannerReopened: true }`.

### Step 2 — `PosthogService` refactor (`core/services/posthog.service.ts`)

- Inject `CookieConsentStore` and `DOCUMENT` alongside the existing injections.
- Remove the unconditional `init()` call from the constructor.
- Private state:
  - `isInitialized = false` (a plain field, not a signal; it isn't read by templates);
  - `wasAccepted = false`, to detect the accepted → rejected transition.
- In the constructor, browser only: register one `effect()` that reads `consentStore.status()`:
  - `'accepted'`:
    - if not initialized, run the existing `init()` body (posthog init with the unchanged config, plus the `NavigationEnd` subscription), set `isInitialized = true`, `wasAccepted = true`;
    - if already initialized and `posthog.has_opted_out_capturing()`, call `posthog.opt_in_capturing()` and set `wasAccepted = true`;
    - if already initialized and capturing, do nothing (single init, no duplicate subscription).
  - `'rejected'` or `null`:
    - if `isInitialized && wasAccepted`, call `posthog.opt_out_capturing()` and `posthog.reset()`, then set `wasAccepted = false`;
    - if not initialized, call `clearLeftoverStorage()`.
  - Wrap all `posthog.*` calls in `ngZone.runOutsideAngular`, as today.
- `private clearLeftoverStorage()`, using the injected `DOCUMENT` and `DOCUMENT.defaultView` storage; each access in `try/catch`:
  - remove every `localStorage` key and every `sessionStorage` key starting with `ph_`;
  - expire cookie `ph_${environment.posthogKey}_posthog` with `path=/` and no `domain`, then again with `domain=` set to the parent domain derived from `location.hostname` (skip the parent-domain write on `localhost` and IP hosts).
- `$pageview` subscription: keep it exactly as it is today, started from the init branch only.

### Step 3 — `CookieConsentBanner` component (`layout/cookie-consent-banner/`)

- Selector `app-cookie-consent-banner`, `ChangeDetectionStrategy.OnPush`, external `templateUrl`, no stylesheet (Tailwind only), `imports: [ButtonModule, RouterLink]`.
- Inject `CookieConsentStore` and `DOCUMENT`.
- Local state:
  - `private readonly isRendered = signal(false)`, set to `true` in `afterNextRender` (SSR-safe; matches server markup on hydration);
  - `readonly isVisible = computed(() => isRendered() && store.isBannerVisible())`;
  - `private opener: HTMLElement | null = null`.
- Focus handling:
  - `viewChild` reference to the first focusable control (the privacy-policy link).
  - An `effect` reacting to `store.isBannerReopened()` becoming `true`: record `DOCUMENT.activeElement` as `opener` if it is an `HTMLElement`, then focus the first control after render (`afterNextRender` with the component injector).
  - On first-visit display, focus isn't moved.
- `onAccept()` / `onReject()`: call `store.accept()` / `store.reject()`, then if `opener` is non-null and still connected, call `opener.focus()`; then clear `opener`.
- Template (`@if (isVisible())`):
  - Root element: `<section role="region" aria-label="Cookie consent">` with Tailwind classes:
    - `sticky bottom-0 z-40`;
    - full width, border-top, padding;
    - light background plus `dark:` variants matching footer tokens (`bg-white` / `dark:bg-neutral-900`, `border-neutral-200` / `dark:border-neutral-700`, text `neutral-700` / `dark:neutral-200`) so contrast meets AA.
  - Inner layout: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.
  - Text paragraph explaining PostHog analytics cookies, used only with consent, with `<a routerLink="/privacy-policy" fragment="cookies">` (underlined) to the cookies section.
  - Button group `flex gap-2`, with two PrimeNG `p-button` elements that have the same `severity` and variant (equal visual weight): "Reject" and "Accept", each `type="button"`.
- Place the component in `layout/`, next to `past-due-banner`, because it is app-shell chrome.

### Step 4 — Mount in App shell (`app.ts`, `app.html`)

- `app.ts`: add `CookieConsentBanner` to `imports`. Leave the existing `readonly _posthog = inject(PosthogService)` as it is, because the service still needs eager construction to react to consent.
- `app.html`: add `<app-cookie-consent-banner></app-cookie-consent-banner>` directly after `<app-footer></app-footer>` and before `<p-toast>`, so it is the last flex child in normal flow for sticky positioning.
- `app.spec.ts`: run the existing suite. If PostHog-related tests or setup fail because `init` no longer runs on construction, provide `CookieConsentStore` state (or mock `PosthogService`) in that spec only. Don't change test intent.

### Step 5 — Footer "Cookie settings" (`layout/footer/`)

- `footer.ts`: inject `CookieConsentStore`; add `openCookieSettings()`, which calls `store.reopenBanner()`.
- `footer.html`: inside the existing `<nav aria-label="Legal">`, after the Terms of Use link, add `<button type="button" class="hover:underline" (click)="openCookieSettings()">Cookie settings</button>`, matching the links' typography. The button must inherit font and color: no default button background, and same text size.
- `footer.spec.ts`: add a test that the button renders with the label "Cookie settings" and that clicking it calls `reopenBanner` (store spy) or sets `isBannerVisible` to true.

### Step 6 — Settings "Privacy" section (`features/settings/`)

- `settings.ts`: inject `CookieConsentStore`. Expose `analyticsCookiesEnabled = this.cookieConsentStore.hasAcceptedAnalytics` (a signal reference) and `onAnalyticsCookiesToggle(enabled: boolean)`, which calls `accept()` when `enabled` is true and `reject()` otherwise. `ToggleSwitchModule` and `FormsModule` are already imported.
- `settings.html`: add a new `<section aria-label="Privacy">` directly after the Notifications section and before the danger-zone section, using the same classes as Notifications (`mb-6 rounded-lg border border-gray-200 p-6`, `h2` styles, row layout). It contains one row:
  - title "Analytics cookies";
  - description "Help us improve OptiCV with anonymous usage analytics (PostHog).";
  - `p-toggleswitch` with `[ngModel]="analyticsCookiesEnabled()"`, `(ngModelChange)="onAnalyticsCookiesToggle($event)"`, `[ngModelOptions]="{ standalone: true }"` and `ariaLabel="Analytics cookies"`.
- The section renders regardless of profile loading state. Consent doesn't depend on the profile API, so place it outside any profile-loading `@if`. Check where the Notifications section sits relative to such blocks and place the new section outside them.
- `settings.spec.ts`: add tests:
  - the toggle reflects `accepted` as on and `rejected`/`null` as off;
  - toggling on calls `accept`, and toggling off calls `reject`.

### Step 7 — Privacy policy button (`features/legal/privacy-policy/`)

- `privacy-policy.ts`: inject `CookieConsentStore`; add `openCookieSettings()`, which calls `store.reopenBanner()`.
- `privacy-policy.html`: in section 11 (`id="cookies"`), directly after the closing paragraph ("Strictly necessary technologies don't need your consent…"), add a `<p>` containing `<button type="button" (click)="openCookieSettings()">Cookie settings</button>`, styled like the page's inline links (`legal.css` link styles or matching Tailwind underline classes). Don't change any policy text.
- `privacy-policy.spec.ts`: add a test that the button exists inside `#cookies` and calls `reopenBanner`.

### Step 8 — Unit tests for new units

`cookie-consent.store.spec.ts` (Vitest, `TestBed` with a `PLATFORM_ID` override where needed; clear `localStorage` in `beforeEach`):
- no stored record gives `status` `null` and `isBannerVisible` true;
- a valid `accepted` or `rejected` record is loaded, and `isBannerVisible` is false;
- an invalid record is treated as `null` (bad JSON, unknown status, `version` 0 and `version` 2);
- `localStorage.getItem` throwing gives `null`;
- `localStorage.setItem` throwing: `accept()` still sets `status` to `accepted` in memory;
- `accept()` and `reject()` persist `{ status, version: COOKIE_CONSENT_VERSION, decidedAt }` and reset `isBannerReopened`;
- `reopenBanner()` makes `isBannerVisible` true while `status` is kept;
- server platform: no `localStorage` access and `status` stays `null`.

`posthog.service.spec.ts` (spy on `posthog.init`, `opt_out_capturing`, `opt_in_capturing`, `reset`, `has_opted_out_capturing`, `capture`; provide a test `CookieConsentStore` or patch its state):
- status `null` or `rejected` at start: `init` isn't called, and `ph_*` `localStorage` keys are removed;
- status `accepted` at start: `init` is called once with `api_host` and `defaults`;
- `null` to `accepted`: `init` is called once; calling `accepted` again doesn't call `init` a second time;
- `accepted` to `rejected`: `opt_out_capturing` and `reset` are called;
- `accepted` to `rejected` to `accepted`: `opt_in_capturing` is called, and `init` is still called only once;
- a `NavigationEnd` after init captures `$pageview`; with no consent, a `NavigationEnd` doesn't call `capture`;
- server platform: no `posthog` calls.

`cookie-consent-banner.spec.ts`:
- not rendered before `afterNextRender` / on the server; rendered when `status` is `null`;
- hidden when the status is decided and not reopened; visible after `reopenBanner()`;
- the Accept and Reject buttons call `store.accept` and `store.reject` and hide the banner;
- it has `role="region"` and `aria-label="Cookie consent"`, and the privacy link points to `/privacy-policy#cookies`;
- reopened from a focused trigger: the first control receives focus, and after a choice focus returns to the trigger.

### Step 9 — Verification

Run from the workspace root:
- `npm exec nx lint opticv-web`
- `npm exec nx typecheck opticv-web`
- `npm exec nx test opticv-web`
- `npm exec nx build opticv-web`
- `npm exec nx format:check`

Manual checks (`npm exec nx serve opticv-web`, DevTools Network and Application tabs):
1. Clean storage: the banner shows, there are no `eu.i.posthog.com` requests, and there are no `ph_*` cookies or `localStorage` keys.
2. Accept: requests start, including a `$pageview` for the current page. Reload: no banner, and PostHog loads.
3. Settings toggle off: capturing stops and `ph_*` storage is cleared without a reload. Toggle on: capturing resumes.
4. Reject, then reload: no banner and no PostHog requests. Leftover `ph_*` keys from step 2 are removed on load.
5. Footer and privacy-policy "Cookie settings" buttons reopen the banner and move focus into it; after a choice, focus returns to the button.
6. On a 360 px-wide viewport, the banner doesn't cause horizontal scroll, and the footer is reachable by scrolling to the end.
7. With the welcome modal open, the banner sits under the mask and the modal works normally.
8. Run the AXE / Lighthouse accessibility audit with the banner open on `/`, `/login`, `/privacy-policy` and `/settings`, in light and dark mode: no violations.
9. Check the SSR response HTML (view-source) for `/`: it contains no banner markup.

## Acceptance Mapping

| Spec Acceptance item                                         | Covered by |
| ------------------------------------------------------------ | ---------- |
| No PostHog requests and no `ph_*` storage without a decision | Steps 2, 8; manual 1 and 4 |
| Accept → init, reload keeps it                               | Steps 1, 2, 8; manual 2 |
| Reject → never init                                          | Steps 1, 2, 8; manual 4 |
| Footer and privacy policy reopen the banner                  | Steps 5, 7; manual 5 |
| Settings toggle, revoke without reload                       | Steps 2, 6; manual 3 |
| No banner in SSR, no SSR errors                              | Steps 1, 3; manual 9 |
| Unit tests listed in spec                                    | Steps 5–8 |
| lint / typecheck / test / build pass                         | Step 9 |
| Existing `posthog.capture()` sites unchanged                 | Verified Library Behavior; no edits to those files |
