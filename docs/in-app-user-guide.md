# In-App User Guide — Ideas & Implementation Plan

Relates to backlog items in `docs/tasks-list.md`: "UX - explain user how to use app" and "UX - create animations or video on how to use the app."

## Problem

New users land on a multi-step flow (upload CV → paste job description → run optimization → review results across 7 sections) with no in-app explanation of how it works, beyond the homepage's static "3 steps" section. The `cv-optimization` page in particular is dense — many collapsible sections, a sidebar, an export footer — and is the page most likely to confuse a first-time user.

## Brainstormed ideas

Five approaches were considered:

1. **Welcome modal on first login** — a `p-dialog` shown once (localStorage flag), summarizing the 3-step flow. Cheap to build, reuses existing homepage "3 steps" content/imagery, no new dependency.
2. **Guided first-time tour with spotlights/tooltips** — step-by-step highlighting of key UI elements (upload button, job description field, "Run optimization" button, sidebar scores) using sequential tooltips/popovers. More work than a modal; no tour library installed, so either hand-roll a minimal sequential highlighter or add a small dependency (e.g. `driver.js`, `shepherd.js`).
3. **Persistent "?" help affordance** — a help icon in the top header (or floating button) that reopens the welcome modal / tour on demand, plus links to per-section help (already partially done — see `docs/help-informations.md`, task 91's per-section info dialogs).
4. **Contextual empty-state guidance** — extend existing empty-state patterns (task 64's "Upload your first CV" vs "Optimize CV" logic) so pages guide the user based on their current state rather than (or in addition to) a tour.
5. **Video/animated walkthrough** — a short demo video/GIF on the homepage showing the full flow end-to-end; serves both marketing and as a reference existing users can rewind to. Already a separate backlog item.

**Decision:** combine welcome modal (1) + persistent help icon (3) + a lightweight hand-rolled guided tour (2) scoped specifically to the `cv-optimization` page, since that's where users are most likely to get lost. Idea 4 and 5 remain open backlog items, not part of this build.

## Context

The user selected three complementary pieces to build:
1. A **welcome modal** shown once on first login, explaining the 3-step process.
2. A **persistent help icon** in the header that reopens the welcome modal / guide on demand.
3. A **guided tour** specific to the cv-optimization page, highlighting its key areas step by step.

## Findings from codebase exploration

- No existing onboarding/tour pattern anywhere in the app. No `localStorage` first-visit flag exists yet (grepped, zero matches).
- `p-dialog` (PrimeNG DialogModule) is already used once, in `section-card.ts`/`.html` for per-section help info (task 91, see `docs/help-informations.md`) — good precedent to reuse for the welcome modal.
- `pTooltip` is used for short inline hints (`keyword-gap.html`, `export-footer.html`) — not suited for a multi-step tour by itself.
- State management convention: NgRx Signals `signalStore` under `apps/opticv-web/src/app/core/stores/`, e.g. `cv.store.ts` (`CvStore`, `providedIn: 'root'`, `withState`/`withComputed`/`withMethods`). A new `UserGuideStore` should follow this exact pattern.
- App shell: `apps/opticv-web/src/app/app.ts` / `app.html` renders `<app-top-header>`, `<router-outlet>`, `<app-footer>`, `<p-toast>`. `App` already injects `CvStore` and reacts to login state via an `effect()` — the welcome modal's "show once after login" trigger belongs here, mirroring that existing effect.
- Header: `apps/opticv-web/src/app/layout/top-header/top-header.ts` / `.html` — a `p-menubar` with `isLoggedIn` input, sign-in/sign-out buttons, and an avatar. The help icon (`pi pi-question-circle` button) belongs in the `#end` template, next to the avatar, visible only when `isLoggedIn()`.
- cv-optimization page: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` / `.html`. Sections are already marked with `[attr.data-section]` (used for scrollspy via `IntersectionObserver`, see `setupScrollspy()`) and rendered via `id="section-{id}"` elements — these same DOM hooks (`#section-{PromptType}` ids) can be reused as tour anchor targets, no new markup needed for anchoring, just querying existing `document.getElementById('section-...')`.
- No tour library (driver.js, shepherd.js, etc.) is installed. Given the app's small footprint and existing tooltip-based precedent, a **hand-rolled minimal tour** (a single overlay component + step config array) fits the codebase better than adding a dependency — matches `docs/angular-best-practies.md` conventions (standalone components, signals, OnPush) more predictably than a third-party lib's own state model.

## Implementation Plan

### 1. Shared guide state — `UserGuideStore`

New file: `apps/opticv-web/src/app/core/stores/user-guide.store.ts`, modeled directly on `cv.store.ts`.

```ts
export interface UserGuideState {
  hasSeenWelcome: boolean;
  isWelcomeModalOpen: boolean;
  isTourActive: boolean;
  tourStepIndex: number;
}
```

- `providedIn: 'root'` signal store.
- `hasSeenWelcome` is hydrated from `localStorage` (key: `opticv_has_seen_welcome`) on store creation, and persisted via `localStorage.setItem` inside a method whenever it flips to `true`. Guard `localStorage` access for SSR (the app has `@angular/ssr` — wrap reads/writes with `isPlatformBrowser(inject(PLATFORM_ID))`, consistent with SSR-safety already required elsewhere in this SSR app).
- Methods: `openWelcomeModal()`, `closeWelcomeModal()`, `markWelcomeSeen()` (sets flag + persists), `startTour()`, `endTour()`, `nextTourStep()`, `prevTourStep()`.
- Reset on sign-out is optional — this is a "seen it" flag, not per-user data, so it should NOT be cleared by `CvStore.resetStore()`/`executeSignOut()`. It's tied to the browser, not the account.

### 2. Welcome modal component

New: `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.ts` (+ `.html`, `.css`, `.spec.ts`).

- Standalone `p-dialog` (import `DialogModule`, `ButtonModule`), OnPush, no inputs needed — reads `UserGuideStore` directly via `inject()`.
- Content: reuse the "3 steps" copy/imagery already on the homepage (`home.html` step-1/2/3 images: `step-1-upload.png` etc.) so the modal visually echoes what the user already saw signing up. Steps: 1) Upload your CV, 2) Paste the job description, 3) Run optimization & review results.
- Footer: a "Got it" button that calls `userGuideStore.markWelcomeSeen()` + closes; optionally a secondary "Start guided tour" button (visible only when the modal opens from the cv-optimization page — see step 4) that closes the modal and calls `userGuideStore.startTour()`.
- Mount once, globally, in `app.html` (next to `<p-toast>`), not per-page — avoids duplicate instances.

### 3. Trigger on first login

In `apps/opticv-web/src/app/app.ts`, extend the existing login-effect (the one that calls `this.cvStore.loadUserCVs()`) to also check `userGuideStore.hasSeenWelcome()` and call `userGuideStore.openWelcomeModal()` when `isLoggedIn && !wasLoggedIn && !hasSeenWelcome`. This mirrors the existing pattern exactly rather than adding a second competing effect.

### 4. Help icon in header (reopen on demand)

In `top-header.ts`/`.html`:
- Add a `p-button` with `icon="pi pi-question-circle"`, `text`, `rounded`, `severity="secondary"` in the `#end` template, before/after the avatar, shown only when `isLoggedIn()`.
- Add an `output<void>() openGuide` (or inject `UserGuideStore` directly in `TopHeader` since it's a global singleton store — simpler than threading an output through `App`). Clicking it calls `userGuideStore.openWelcomeModal()`, reopening the same modal from step 2 (which is always mounted in `app.html`).

### 5. Guided tour for cv-optimization page

New: `apps/opticv-web/src/app/features/cv-optimization/components/guided-tour/guided-tour.ts` (+ `.html`, `.css`, `.spec.ts`), mounted from `cv-optimization.html` only (not global).

- A small step-config array local to this component:
  ```ts
  interface TourStep { targetSelector: string; title: string; body: string; }
  ```
  Targets reuse existing DOM hooks already in `cv-optimization.html`: `#section-JOB_POSTING`, `#section-RESUME_AUTOPSY`, `#section-KEYWORD_GAP`, `#section-BULLET_UPGRADE`, the sidebar (`app-optim-sidebar` — add one `#tour-sidebar` template ref if no stable id exists), and the export footer (`app-export-footer` — same).
- Rendering approach: on each step, compute the target element's `getBoundingClientRect()`, position a highlighted outline (CSS `box-shadow` ring, `position: fixed`, `pointer-events: none`) plus a small popover card (`title` + `body` + Next/Back/Skip buttons) near it — a lightweight hand-rolled version of the spotlight pattern, no new dependency. Recompute position on window resize/scroll while active (`host: {}` object per project conventions, not `@HostListener`).
- Driven entirely by `UserGuideStore.isTourActive` / `tourStepIndex` signals — `CvOptimization` component doesn't need new state, it just conditionally renders `<app-guided-tour>` when `userGuideStore.isTourActive()`.
- Tour should auto-scroll each target into view (`element.scrollIntoView({ behavior: 'smooth', block: 'center' })`) before positioning, since sections can be long/collapsed — for collapsed sections, expand them first via the existing `onSectionCollapsedChange(id, false)` method already on `CvOptimization` (call it through a small `@Output` or by having the tour step config include an optional `beforeShow` callback invoked by the host page).
- "Skip"/"End" and completing the last step both call `userGuideStore.endTour()`.
- Entry points to start the tour: (a) the "Start guided tour" button in the welcome modal when opened from/for the cv-optimization page, (b) a small "Take the tour" text link near the page header or in `job-info-banner`, for users who dismissed the welcome modal earlier.

### 6. Analytics (matches existing PostHog usage)

Following the existing `posthog.capture(...)` convention used throughout `cv-optimization.ts` and `top-header.ts`, add capture calls: `welcome_modal_shown`, `welcome_modal_dismissed`, `guided_tour_started`, `guided_tour_completed`, `guided_tour_skipped` (with step index).

### 7. Tests

- `user-guide.store.spec.ts` — hydration from localStorage, `markWelcomeSeen` persistence, tour step navigation bounds.
- `welcome-guide-modal.spec.ts` — opens/closes based on store state, "Got it" marks seen.
- `guided-tour.spec.ts` — step advancement, target resolution, end-of-tour cleanup.
- Extend `top-header.spec.ts` for the new help button's visibility gating on `isLoggedIn`.

## Files to create
- `apps/opticv-web/src/app/core/stores/user-guide.store.ts` (+ spec)
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.{ts,html,css,spec.ts}`
- `apps/opticv-web/src/app/features/cv-optimization/components/guided-tour/guided-tour.{ts,html,css,spec.ts}`

## Files to modify
- `apps/opticv-web/src/app/app.ts` / `app.html` — trigger welcome modal on first login, mount modal
- `apps/opticv-web/src/app/layout/top-header/top-header.ts` / `.html` — help icon button
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` / `.html` — mount `<app-guided-tour>`, "Take the tour" entry point, wire collapse-before-show

## Verification
- `npm exec nx serve opticv-web`, sign in with a fresh browser profile (or clear `localStorage`) → confirm welcome modal appears once, "Got it" dismisses it and it doesn't reappear on refresh/re-login.
- Click the header help icon while logged in → confirm modal reopens.
- From the modal (or "Take the tour" link) on `/cv-optimization` → confirm each tour step scrolls to and highlights the right section, expands collapsed sections as needed, and Skip/End work.
- Run `npm exec nx test opticv-web` for the new and modified spec files.
- Check mobile viewport (this app has `mobile-tabs` for cv-optimization) — tour positioning must not break on narrow screens; acceptable to disable/simplify the tour on mobile if highlighting is unreliable there (flag as a decision point, not silently skip).

## Status

**status: planned** — not yet implemented.
