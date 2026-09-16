# Implementation Done — Task 94: Welcome Modal + Help Icon

## Summary

A `UserGuideStore` (NgRx Signals, `providedIn: 'root'`) was added to track welcome-modal open state and a per-email "seen" map persisted to `localStorage` under the key `opticv_has_seen_welcome`. A standalone `WelcomeGuideModal` component (`p-dialog`) renders the 3-step "how it works" explanation and is mounted once in `App`. `App`'s existing login-transition effect was extended to auto-open the modal on `false → true` login when the current user's email has not been marked as seen, capturing a `welcome_modal_shown` PostHog event. A help icon button (`pi pi-question-circle`) was added to `TopHeader`'s `#end` template, visible when logged in, which reopens the modal on demand via `openHelp()` and captures `help_icon_clicked`. The modal's `(onHide)` handler is the single call site for `markWelcomeSeen` (or `closeWelcomeModal` as a no-email fallback) and for capturing `welcome_modal_dismissed`, covering the "Got it" button, X, and Escape dismissal paths. Unit tests were added/extended for the store, the modal component, `TopHeader`, and `App`'s trigger effect.

---

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `UserGuideStore` with `isWelcomeModalOpen` / `seenByEmail` state | Implemented | `apps/opticv-web/src/app/core/stores/user-guide.store.ts` |
| `hasSeenWelcome(email)` — false for falsy/absent email | Implemented | Plain method inside `withMethods` |
| `openWelcomeModal()` / `closeWelcomeModal()` | Implemented | `patchState` toggling `isWelcomeModalOpen` |
| `markWelcomeSeen(email)` — merges map, persists, closes modal | Implemented | Guards `localStorage.setItem` with `isPlatformBrowser` |
| No `resetStore()` (not reset on sign-out) | Implemented | No reset method present |
| `localStorage` read on init, guarded by `isPlatformBrowser` | Implemented | `readSeenByEmail()` |
| Malformed `localStorage` value falls back to `{}` | Implemented | `try/catch` around `JSON.parse` |
| `WelcomeGuideModal` standalone component, `p-dialog`, no inputs | Implemented | `welcome-guide-modal.ts` |
| 3-step content reusing homepage copy/images, `NgOptimizedImage` | Implemented | `welcome-guide-modal.html`, `ngSrc` on all three step images |
| Single "Got it" footer button | Implemented | `pTemplate="footer"`, calls `closeWelcomeModal()` |
| Dismiss (X/Escape/mask-click) also marks seen via `(onHide)` | Partial | `(onHide)` wired and calls `markWelcomeSeen`/`closeWelcomeModal`; `dismissableMask` is not set to `true`, so mask-click does not trigger dismissal (PrimeNG default `dismissableMask: false`) |
| Mount `<app-welcome-guide-modal>` once in `app.html` | Implemented | Alongside `<p-toast>` |
| Login-transition effect extended (`false → true`, email-gated) | Implemented | `app.ts` constructor effect |
| `welcome_modal_shown` captured on auto-open | Implemented | `app.ts` |
| `welcome_modal_dismissed` captured on dismiss | Implemented | `welcome-guide-modal.ts` `onHide()` |
| No email available → skip auto-open, no crash | Implemented | `if (email && !hasSeenWelcome(email))` guard |
| Help icon (`pi pi-question-circle`) in header, logged-in only | Implemented | `top-header.html`, `aria-label="Open help guide"` |
| Help icon reopens modal regardless of seen-state | Implemented | `openHelp()` calls `openWelcomeModal()` directly |
| `help_icon_clicked` captured on click | Implemented | `top-header.ts` |
| Unit tests: `user-guide.store.spec.ts` | Implemented | Covers init, `hasSeenWelcome`, open/close, `markWelcomeSeen`, SSR guard |
| Unit tests: `welcome-guide-modal.spec.ts` | Implemented | Covers dialog binding, step content, `onHide` branches, event capture |
| Unit tests: `top-header.spec.ts` extended for help icon | Implemented | Visibility and click coverage added |
| Unit tests: `app.spec.ts` extended for trigger effect | Implemented | Covers seen/not-seen/no-email transitions |
| No breaking changes to existing header, home page, or app shell | Not implemented | Sign Out button's `label="Sign Out"` attribute was changed to `title="Sign Out"` (icon-only) in `top-header.html`; `top-header.spec.ts` was subsequently updated to query `title="Sign Out"` instead of `label="Sign Out"` to match |

---

## Files

### Created

- `apps/opticv-web/src/app/core/stores/user-guide.store.ts`
- `apps/opticv-web/src/app/core/stores/user-guide.store.spec.ts`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.ts`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.html`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.css`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.spec.ts`

### Modified

- `apps/opticv-web/src/app/app.ts`
- `apps/opticv-web/src/app/app.html`
- `apps/opticv-web/src/app/app.spec.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.html`
- `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts`
- `docs/tasks-list.md`

---

## Components

| Component | Status |
| --- | --- |
| `WelcomeGuideModal` (`apps/opticv-web/src/app/shared/welcome-guide-modal/`) | Exist |

---

## Stores

| Store | Status |
| --- | --- |
| `UserGuideStore` (`apps/opticv-web/src/app/core/stores/user-guide.store.ts`) | Exist |

---

## Deviations

- The "Got it" footer button calls `userGuideStore.closeWelcomeModal()` directly (not `markWelcomeSeen()`); `markWelcomeSeen()` is invoked exclusively from `onHide()`, per the plan's Step 2 resolution of spec-review ambiguity #2.
- `top-header.html`'s Sign Out `p-button` attribute was changed from `label="Sign Out"` to `title="Sign Out"` (icon-only, no visible label). This file/attribute is not listed in the plan's Files Summary or Step 4 changes.
- `docs/tasks-list.md` was modified: a note was added to task 94 referencing a follow-up mobile RWD change to the Sign Out button, and task 95's title/status/date were changed from "RWD issue - top menu change Sign out button to icon button on mobile view" / `todo` to "UX/UI - Redesign welcome modal" / `in progress`, `20.07.2026`. This file is not listed in the plan's Files Summary.
- `top-header.spec.ts` assertions for the Sign Out button (`should not show Sign Out button`, `should show Sign Out button`) query `p-button[title="Sign Out"]` rather than `p-button[label="Sign Out"]`, reflecting the attribute change above.
- A `welcome-guide-modal.css` file was added; the plan's Step 2 anticipates an external template (`welcome-guide-modal.html`) but does not explicitly list a companion `.css` file in the Files Summary.

---

## Additional Implementation

None beyond the deviations listed above.
