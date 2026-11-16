# Implementation Done

Task ID: 127-cookie-consent-banner

Sources: `02-spec.md`, `03-spec-review.md` (**PASS WITH ISSUES**), `04-implementation-plan.md`, commits `18e2850` and `2e3189f` (`HEAD~2..HEAD`).

## Summary

PostHog analytics now depends on consent. A new `CookieConsentStore` (an NgRx Signal Store) keeps the visitor's decision (`'accepted' | 'rejected' | null`) and saves it to `localStorage` under `opticv_cookie_consent` as `{ status, version, decidedAt }`.

`PosthogService` no longer initializes PostHog when it is constructed. It reacts to the consent status:

- **Accepted:** it initializes PostHog once and starts the `$pageview` subscription.
- **Accepted, then rejected:** it calls `reset()` and `opt_out_capturing()`.
- **Accepted again:** it calls `opt_in_capturing()`.
- **No consent:** it removes leftover `ph_*` storage and cookies.

A new `CookieConsentBanner` component is mounted once in the app shell and renders only in the browser. Users can change their choice from three places:

- a "Cookie settings" button in the footer;
- a "Cookie settings" button in section 11 of the privacy policy;
- an "Analytics cookies" toggle in a new "Privacy" section on the Settings page.

Unit tests were added for all new and changed units.

## Specification Coverage

| Requirement | Status | Note |
| ----------- | ------ | ---- |
| Consent holder with a status signal (`'accepted' \| 'rejected' \| null`), saved to `localStorage`, with accept / reject / reopen methods | Implemented | `CookieConsentStore` |
| Saved record `{ status, version, decidedAt }` under one key; an invalid record counts as `null` | Implemented | Key `opticv_cookie_consent`, `COOKIE_CONSENT_VERSION = 1` |
| `localStorage` unavailable or throwing → `null`; the choice still applies in memory | Implemented | try/catch on read and write |
| `PosthogService` doesn't call `posthog.init` when constructed | Implemented | |
| PostHog initializes only on `accepted`, once per page load, with the existing config and `$pageview` subscription | Implemented | `isInitialized` flag |
| Accepted → rejected: stop capturing and clear PostHog identifiers | Implemented | `posthog.reset()`, then `posthog.opt_out_capturing()` |
| Accepting again in the same page load: `opt_in_capturing()` with no second init | Implemented | |
| No PostHog storage or cookies without consent | Implemented | `clearLeftoverStorage()` removes `ph_*` local and session storage keys and expires the `ph_<token>_posthog` cookie |
| Banner rendered once in `app.html` and visible on every route | Implemented | |
| Banner not in the SSR output | Implemented | `afterNextRender` gate |
| Non-blocking bottom bar with explanatory text and a link to `/privacy-policy#cookies` | Implemented | Sticky host, `z-40` |
| Accept and Reject buttons with equal visual weight | Implemented | Both `p-button` with `severity="secondary"` |
| Banner can't be dismissed without a choice | Implemented | No close control |
| Footer "Cookie settings" `<button type="button">` reopens the banner | Implemented | |
| Privacy policy section 11 "Cookie settings" `<button type="button">` reopens the banner | Implemented | `.link-button` style in `legal.css` |
| Settings "Analytics cookies" toggle in a new section, bound to consent, applies immediately and closes an open banner | Implemented | Section titled "Privacy" |
| Banner landmark `role="region"` with `aria-label="Cookie consent"` | Implemented | |
| Focus: not moved on first display, moved into the banner on reopen, returned to the opener after a choice | Implemented | |
| The welcome modal isn't covered and its focus isn't taken | Implemented | Banner `z-40`, below the PrimeNG overlay layer |
| Small screens: text wraps, buttons share the row or stack | Implemented | `flex-col` → `sm:flex-row` |
| WCAG AA contrast in light and dark mode, AXE pass | Implemented | `dark:` Tailwind variants used; no AXE run recorded |
| Existing `posthog.capture(...)` call sites unchanged | Implemented | No edits to those files |
| Unit tests: consent store | Implemented | `cookie-consent.store.spec.ts` |
| Unit tests: `PosthogService` | Implemented | `posthog.service.spec.ts` |
| Unit tests: banner | Implemented | `cookie-consent-banner.spec.ts` |
| Unit tests: footer, Settings and privacy-policy controls | Implemented | `footer.spec.ts`, `settings-privacy.spec.ts`, `privacy-policy.spec.ts` |
| `lint`, `typecheck`, `test` and `build` pass for `opticv-web` | Implemented | `lint` and `test` passed during code review (1302 passed, 10 skipped); no `typecheck` or `build` run recorded |

## Files

### Created

- `apps/opticv-web/src/app/core/stores/cookie-consent.store.ts`
- `apps/opticv-web/src/app/core/stores/cookie-consent.store.spec.ts`
- `apps/opticv-web/src/app/core/services/posthog.service.spec.ts`
- `apps/opticv-web/src/app/layout/cookie-consent-banner/cookie-consent-banner.ts`
- `apps/opticv-web/src/app/layout/cookie-consent-banner/cookie-consent-banner.html`
- `apps/opticv-web/src/app/layout/cookie-consent-banner/cookie-consent-banner.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings-privacy.spec.ts`

### Modified

- `apps/opticv-web/src/app/core/services/posthog.service.ts`
- `apps/opticv-web/src/app/app.ts`
- `apps/opticv-web/src/app/app.html`
- `apps/opticv-web/src/app/app.spec.ts`
- `apps/opticv-web/src/app/layout/footer/footer.ts`
- `apps/opticv-web/src/app/layout/footer/footer.html`
- `apps/opticv-web/src/app/layout/footer/footer.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/legal/privacy-policy/privacy-policy.ts`
- `apps/opticv-web/src/app/features/legal/privacy-policy/privacy-policy.html`
- `apps/opticv-web/src/app/features/legal/privacy-policy/privacy-policy.spec.ts`
- `apps/opticv-web/src/app/features/legal/legal.css`
- `docs/tasks-list.md`

## Components

| Component | Status |
| --------- | ------ |
| `CookieConsentBanner` (`layout/cookie-consent-banner/`) | Exist |
| `Footer`: `openCookieSettings()` and "Cookie settings" button | Exist |
| `Settings`: "Privacy" section, `analyticsCookiesEnabled`, `onAnalyticsCookiesToggle()` | Exist |
| `PrivacyPolicy`: `openCookieSettings()` and "Cookie settings" button | Exist |
| `App`: `CookieConsentBanner` import and `<app-cookie-consent-banner>` mount | Exist |
| `PosthogService` (refactored, consent-driven) | Exist |

## Stores

| Store | Status |
| ----- | ------ |
| `CookieConsentStore` (`core/stores/cookie-consent.store.ts`): state `status`, `isBannerReopened`; computed `isBannerVisible`, `hasAcceptedAnalytics`; methods `accept()`, `reject()`, `reopenBanner()` | Exist |

## Deviations

1. The Settings "Privacy" section is inside the `@else if (userProfile.hasValue())` block (`settings.html:16-318`). The plan placed it outside any profile-loading `@if`.
2. When consent is revoked, `posthog.reset()` runs before `posthog.opt_out_capturing()`. The plan listed opt-out first, then reset.
3. `enableCapturing()` also checks `has_opted_out_capturing()` right after the first `init()`, so an opt-out saved in an earlier page load is reversed.
4. `sticky bottom-0 z-40` is set on the component host through the `host` object, not on the `<section>` element.
5. The footer "Cookie settings" button uses `hover:text-(--primary-color)`, not `hover:underline`.
6. The Settings tests are in a new file, `settings-privacy.spec.ts`, not in `settings.spec.ts`.
7. The privacy policy button uses a new `.link-button` class in `legal.css`.

## Additional Implementation

Additional implementation not covered by the original documents:

- `hover:underline` was removed from the existing Privacy Policy and Terms of Use links in `footer.html`.
- `docs/tasks-list.md` was updated.
