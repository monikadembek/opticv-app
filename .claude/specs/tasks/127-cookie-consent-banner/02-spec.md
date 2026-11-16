# Task Specification

## Source

Azure DevOps Task: 127 — Add cookie consent banner

## Goal

Make PostHog analytics consent-based. PostHog must not load until the visitor explicitly accepts analytics cookies. Add a cookie consent banner with equally weighted **Accept** and **Reject** choices. Users can change their choice later from three places: a footer link, a toggle on the Settings page, and a button in the cookies section of the privacy policy.

## Context

- `apps/opticv-web/src/app/core/services/posthog.service.ts`: `PosthogService` currently calls `posthog.init(...)` in its constructor whenever it runs in the browser. It also subscribes to router `NavigationEnd` and captures `$pageview`. It is eagerly injected in `App` (`app.ts`).
- Several components import `posthog` from `posthog-js` directly and call `posthog.capture(...)`: `top-header`, `login`, `verify`, `settings`, `home`, `dashboard`, `upload-cv`, `cv-optimization` and its child components, `welcome-guide-modal`, `app.ts`.
- `apps/opticv-web/src/app/features/legal/privacy-policy/privacy-policy.html`, section 11 "Cookies and similar technologies" (`id="cookies"`), says: "We use analytics cookies only with your consent where the law requires it, and you can change your choice at any time."
- `apps/opticv-web/src/app/layout/footer/footer.html` already has a `<nav aria-label="Legal">` with Privacy Policy and Terms of Use links.
- `apps/opticv-web/src/app/features/settings/settings.html` already has a "Notifications" section built from `p-toggleswitch` rows. Use it as the visual pattern for the new toggle.
- `apps/opticv-web/src/app/core/stores/user-guide.store.ts` shows the existing convention for SSR-safe `localStorage` access: guard with `isPlatformBrowser`, and use `try/catch` around `JSON.parse`.
- The app is SSR-enabled, so `localStorage` and `posthog` are only available in the browser.
- Sentry (`main.ts`, error monitoring and masked session replay) is **not** affected by this task.

## Clarifications (answered)

| Question                                   | Answer                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| Who sees the banner?                       | Everyone. No geo-detection.                                                     |
| PostHog behavior before consent / on reject | Not loaded at all. `posthog.init` runs only after Accept.                       |
| Gate Sentry Session Replay too?            | No. PostHog only.                                                               |
| Where can the choice be changed later?     | Footer "Cookie settings" link, Settings page toggle, and a button in privacy policy section 11. |

## Scope

### In scope

- A consent state holder: a root-provided service or signal store exposing the current consent status as a signal (`'accepted' | 'rejected' | null`). `null` means the visitor hasn't decided yet. The holder persists the status to `localStorage` and exposes methods to accept, reject and reopen the banner.
- Refactor `PosthogService` so that it:
  - does not call `posthog.init` on construction;
  - initializes PostHog (with the existing config and `$pageview` router subscription) only when consent becomes `accepted`, and only once per page load;
  - stops capturing when consent changes from `accepted` to `rejected`, and clears PostHog identifiers stored in the browser;
  - resumes capturing if the user accepts again in the same page load, after PostHog was already initialized.
- A new cookie consent banner component, rendered once in `app.html` and visible on every route, including public, legal and auth pages.
- A "Cookie settings" link in the footer's Legal nav that reopens the banner.
- An "Analytics cookies" toggle on the Settings page, in a new section, bound to the same consent state.
- A "Cookie settings" button in privacy policy section 11 that reopens the banner.
- Unit tests for the consent store/service, the refactored `PosthogService`, the banner component, and the new footer, Settings and privacy-policy controls.

### Out of scope

- Geo-detection or region-specific behavior.
- Gating Sentry (errors or Session Replay).
- PostHog cookieless mode.
- Saving consent to the backend or database, or syncing it across devices.
- Granular per-category preferences beyond a single "analytics" category. Strictly necessary storage is always on and never asked about.
- Rewriting privacy policy text, apart from adding the "Cookie settings" button.
- Changing which events are captured, or refactoring the existing direct `posthog.capture(...)` calls in components.
- Backend changes.

## Behavior

### First visit (no stored decision)

1. The page renders. SSR output doesn't include the banner, because consent can't be known on the server.
2. After hydration in the browser, the consent holder reads `localStorage`. No valid record is found, so the status is `null` and the banner appears.
3. PostHog is **not** initialized. No PostHog network requests are made and no `ph_*` cookies or `localStorage` keys are created.
4. The banner is a non-blocking bar fixed to the bottom of the viewport. The user can keep using the page while it is visible. It contains:
   - a short text explaining that OptiCV uses analytics cookies (PostHog) to understand how the Service is used, only with consent;
   - a link to the cookies section of the privacy policy (`/privacy-policy#cookies`);
   - an **Accept** button and a **Reject** button with equal visual weight. Neither is a text link or visually de-emphasized.

### Accept

1. Consent status becomes `accepted`, is saved to `localStorage`, and the banner hides.
2. `PosthogService` reacts and calls `posthog.init(...)` with the current config (`api_host`, `defaults`), then starts the `$pageview` router subscription.
3. Later `posthog.capture(...)` calls from components send events as they do today.

### Reject

1. Consent status becomes `rejected`, is saved to `localStorage`, and the banner hides.
2. PostHog stays uninitialized for the rest of the page load and on later visits.

### Returning visit

- **Stored `accepted`:** the banner doesn't appear and PostHog initializes on app start in the browser, matching today's behavior.
- **Stored `rejected`:** the banner doesn't appear and PostHog is never initialized.

### Changing the choice later

1. **Footer "Cookie settings" link:** a button-like control in the footer's Legal nav. It reopens the banner, which shows the same Accept and Reject buttons. The current status isn't cleared until the user picks again. Dismissing isn't possible without choosing.
2. **Privacy policy section 11 button:** same behavior as the footer link.
3. **Settings page toggle:** a new section (for example "Privacy"), styled like the Notifications section, with one `p-toggleswitch` row:
   - label "Analytics cookies", description along the lines of "Help us improve OptiCV with anonymous usage analytics (PostHog)."
   - checked when the status is `accepted`; unchecked when it is `rejected` or `null`.
   - turning it on equals Accept; turning it off equals Reject. The change takes effect immediately with no Save button, and the banner hides if it was open.
4. **Accepted → rejected:** call PostHog's opt-out (`posthog.opt_out_capturing()`) and `posthog.reset()` so capturing stops and stored identifiers are cleared. No page reload is required.
5. **Rejected (or never decided) → accepted within the same page load:** if PostHog isn't initialized yet, initialize it. If it was initialized earlier in this page load and then opted out, call `posthog.opt_in_capturing()` instead of initializing it again.

### Persisted record

- Stored under one `localStorage` key (for example `opticv_cookie_consent`) as JSON with:
  - `status` (`'accepted' | 'rejected'`);
  - `version` (a number constant, starting at `1`);
  - `decidedAt` (ISO timestamp).
- A record is invalid if it is missing, unparseable, has an unknown `status`, or has a `version` other than the current constant. An invalid record is treated as "no decision": status `null` and the banner shows.

## Edge Cases

- **SSR:** neither the banner nor `PosthogService` may touch `localStorage` or `posthog` on the server. The banner must not render in SSR output. This avoids a flash for users who have already decided and prevents hydration mismatches.
- **`localStorage` unavailable or throwing** (private mode, blocked storage): treat the status as `null` and show the banner. Accept and Reject still apply for the current page load (in memory) even if saving fails, and no error reaches the user.
- **Direct `posthog.capture(...)` calls while PostHog is not initialized:** these must not throw, break the UI or send network requests. posthog-js is expected to treat calls before `init` as no-ops; confirm this during implementation. If it is not true, add the smallest guard that keeps the existing call sites unchanged.
- **Welcome guide modal open at the same time:** the banner must not block or cover the modal's controls. It stays available after the modal closes, and keyboard focus inside the modal must not be pulled into the banner.
- **Small screens:** the banner must not cover the footer's "Cookie settings" link permanently, and must not cause horizontal scrolling. Text wraps and buttons stack or share the row as space allows.
- **Multiple tabs:** syncing a change live across open tabs isn't required. Each tab reads the stored value on load.
- **Repeated Accept:** accepting again while already `accepted` must not call `posthog.init` a second time or create a duplicate router subscription.
- **Settings toggle while the banner is open:** changing the toggle closes the banner.

## Accessibility

- The banner is a landmark region (for example `role="region"` with `aria-label="Cookie consent"`) containing real `<button>` elements.
- The banner doesn't trap focus and doesn't move focus automatically on first display. When it is reopened from the footer, Settings or privacy policy control, focus moves into the banner, on the banner's first control. After a choice is made, focus returns to the control that opened it.
- The footer "Cookie settings" control and the privacy policy control are `<button type="button">` elements, not links, because they don't navigate.
- Text and buttons meet WCAG AA contrast in both light and dark mode, following existing `dark:` Tailwind patterns. The page must pass AXE checks.

## Data / API

- **Endpoints:** none.
- **DB changes:** none.
- **Models:** a frontend-only type for the consent status and the persisted record. This type is local to `opticv-web`, not `@opticv/datatypes`, because the backend doesn't use it.
- **Browser storage:** one new `localStorage` key holding the consent record described above. It is classified as strictly necessary, because it only stores the user's consent choice.

## Assumptions

- Consent is per browser, not per account. The Settings toggle shows and changes the consent for the current browser.
- Consent doesn't expire on a timer. To ask everyone again (for example after adding a new analytics provider), raise the `version` constant.
- Strictly necessary storage (Supabase session, welcome-guide flag, Stripe, the consent record itself) and Sentry stay as they are and are not controlled by the banner, matching privacy policy section 11.
- The existing PostHog config (`api_host`, `defaults: '2026-05-30'`) and the manual `$pageview` capture on `NavigationEnd` are kept as they are. Only *when* they start changes.
- The banner wording is final English copy written during implementation. No translations are needed.

## Acceptance (DEV)

- With no stored decision, the banner appears on every route. No requests go to `eu.i.posthog.com`, and no `ph_*` cookies or `localStorage` keys exist.
- Accept: the banner hides, PostHog initializes, and page views and events are sent. After a reload, no banner appears and PostHog initializes.
- Reject: the banner hides and PostHog never initializes, including after a reload.
- The footer "Cookie settings" button and the privacy policy section 11 button reopen the banner, and choosing again updates the stored status.
- The Settings "Analytics cookies" toggle reflects the current status and changes it immediately. Turning it off after accepting stops capturing and clears PostHog identifiers without a reload.
- SSR output contains no banner, and SSR doesn't throw.
- Unit tests cover:
  - the consent holder: read, write, invalid record, storage throwing;
  - `PosthogService`: no init without consent, init on accept, single init, opt-out on reject, opt-in on re-accept;
  - the banner: visibility and button actions;
  - the footer, Settings and privacy-policy controls.
- `npm exec nx lint opticv-web`, `npm exec nx typecheck opticv-web`, `npm exec nx test opticv-web` and `npm exec nx build opticv-web` pass.
- No breaking changes to existing `posthog.capture(...)` call sites.
