# Task Specification

## Source

Task 94. UX - In-app user guide - welcome guide + help icon

Related design doc: `docs/in-app-user-guide.md` (covers this scope plus a guided tour for the cv-optimization page — the tour is explicitly **out of scope** for this task, see Scope below).

## Goal

Help first-time users understand the app's 3-step flow by:

1. Showing a welcome modal once, automatically, the first time a given user (by email) logs in on a given browser.
2. Adding a persistent "help" icon button in the header (visible when logged in) that reopens the same modal on demand, any time.

## Context

- App shell: `apps/opticv-web/src/app/app.ts` / `app.html` renders `<app-top-header>`, `<router-outlet>`, `<app-footer>`, `<p-toast>`. `App` already has a login-transition `effect()` that calls `cvStore.loadUserCVs()` when `isLoggedIn` flips from `false` to `true` — the welcome modal trigger extends this same effect.
- Header: `apps/opticv-web/src/app/layout/top-header/top-header.ts` / `.html` — a `p-menubar` with `isLoggedIn` input; the `#end` template currently renders Sign In button (logged out) or avatar + Sign Out button (logged in).
- State management convention: NgRx Signals `signalStore` under `apps/opticv-web/src/app/core/stores/`, e.g. `cv.store.ts` (`providedIn: 'root'`, `withState`/`withComputed`/`withMethods`, `patchState`). A new `UserGuideStore` follows this exact pattern.
- `p-dialog` (PrimeNG `DialogModule`) is already used in `section-card.ts` (task 91 per-section help) and `cv-template-selector.ts`/`export-footer.ts`/`dashboard.ts` — reuse this component for the welcome modal.
- SSR-safety precedent: `isPlatformBrowser(inject(PLATFORM_ID))` is already used in multiple places (e.g. `cv-dropzone.ts`, `supabase.ts`) before touching browser-only APIs — the new store must guard all `localStorage` access this way.
- Homepage "3 steps" copy/imagery to reuse for modal content: `apps/opticv-web/src/app/features/home/home.html` — `step-1-upload.png` / `step-2-job-description.png` / `step-3-optimization.png`, with titles "Upload your CV", "Paste job description", "Get your optimized CV".
- PostHog analytics convention: `posthog.capture('event_name', { ...props })` calls exist in `top-header.ts` and `cv-optimization.ts` (e.g. `signin_button_clicked`).
- Current user email is available via `Supabase.currentUser()?.email` (`apps/opticv-web/src/app/core/auth/services/supabase.ts`), already injected/used in `app.ts`.

## Scope

### In scope

- New `UserGuideStore` (`apps/opticv-web/src/app/core/stores/user-guide.store.ts`) tracking whether the welcome modal is open and which user emails have already seen it, persisted to `localStorage`.
- New standalone `WelcomeGuideModal` component (`apps/opticv-web/src/app/shared/welcome-guide-modal/`), a `p-dialog` showing the 3-step explanation, with a single "Got it" button that closes it and marks the current user's email as seen.
- Wiring in `app.ts`/`app.html`: mount the modal globally (once), and extend the existing login-transition effect to open the modal automatically when `isLoggedIn` flips `false → true` and the current user's email has not been marked as seen.
- New help icon button (`pi pi-question-circle`) in `top-header.ts`/`.html`, visible only when `isLoggedIn()`, that reopens the modal via `UserGuideStore` regardless of seen-state.
- PostHog analytics: `welcome_modal_shown` (on auto-open), `welcome_modal_dismissed` (on "Got it"), `help_icon_clicked` (on manual reopen).
- Unit tests: `user-guide.store.spec.ts`, `welcome-guide-modal.spec.ts`, extend `top-header.spec.ts` for help icon visibility/click, extend `app.spec.ts` (if present) or add coverage for the trigger effect.

### Out of scope

- The guided tour for the `cv-optimization` page (item 3 of `docs/in-app-user-guide.md`) — separate future task.
- Contextual empty-state guidance and video walkthrough (items 4–5 of the design doc) — separate backlog items.
- Server-side/account-level persistence of "seen" state — this is browser-local only (see Behavior).
- Any change to the Supabase auth flow itself.

## Behavior

### Storage shape

- `localStorage` key: `opticv_has_seen_welcome`.
- Value: JSON-serialized object mapping email → `true`, e.g. `{"a@example.com": true, "b@example.com": true}`.
- Read once on store initialization (guarded by `isPlatformBrowser`); on SSR or when parsing fails/key absent, treat as `{}`.

### `UserGuideStore`

- State: `{ isWelcomeModalOpen: boolean; seenByEmail: Record<string, boolean> }`.
- Computed: `hasSeenWelcome(email: string | null | undefined): boolean` — returns `false` if `email` is falsy or not present in `seenByEmail`.
- Methods:
  - `openWelcomeModal(): void` — sets `isWelcomeModalOpen: true`.
  - `closeWelcomeModal(): void` — sets `isWelcomeModalOpen: false`.
  - `markWelcomeSeen(email: string): void` — merges `{ [email]: true }` into `seenByEmail`, persists the full map to `localStorage` (guarded by `isPlatformBrowser`), and closes the modal.
- Not reset by `CvStore.resetStore()` / sign-out — the seen-map persists across sign-out/sign-in cycles on the same browser (per-email lookup already differentiates users).

### Trigger flow (`app.ts`)

- In the existing `constructor()` effect that tracks `wasLoggedIn`, when `isLoggedIn` transitions `false → true`:
  - Read `supabaseService.currentUser()?.email`.
  - If email exists and `!userGuideStore.hasSeenWelcome(email)`, call `userGuideStore.openWelcomeModal()` and capture `welcome_modal_shown`.
- Mount `<app-welcome-guide-modal>` once in `app.html`, alongside `<p-toast>`.

### Welcome modal component

- Standalone, `OnPush`, no inputs — injects `UserGuideStore` and `Supabase` directly.
- `p-dialog` bound to `userGuideStore.isWelcomeModalOpen()`, `modal: true`, dismissible via the dialog's own close affordance (X) and via Escape/mask click (PrimeNG defaults) — both paths must also call `markWelcomeSeen` (see Edge Cases).
- Content: three steps in the same order/copy/images as the homepage "how it works" section (Upload your CV / Paste job description / Get your optimized CV), condensed for a modal (reuse existing step images via `NgOptimizedImage` per Angular conventions).
- Footer: single "Got it" button. On click: call `userGuideStore.markWelcomeSeen(email)` (email from `Supabase.currentUser()`), capture `welcome_modal_dismissed`.

### Help icon (header)

- `p-button` with `icon="pi pi-question-circle"`, `text`, `rounded`, `severity="secondary"`, `aria-label="Open help guide"`, placed in the `#end` template of `top-header.html`, shown only when `isLoggedIn()` (alongside avatar/Sign Out).
- Click handler in `TopHeader`: inject `UserGuideStore`, call `openWelcomeModal()` (bypasses the seen-check — always reopens), capture `help_icon_clicked`.

## Edge Cases

- **No email available** (e.g. `currentUser()` not yet hydrated at the moment of the login-transition check): skip auto-open for that transition; do not crash. The help icon remains available once logged in so the user can still open it manually.
- **Dialog dismissed via X/Escape/mask-click instead of "Got it"**: still counts as seen — call `markWelcomeSeen` from the dialog's `(onHide)` event, not only the button click, so the modal doesn't reappear on next login. `welcome_modal_dismissed` fires from this single path.
- **Same browser, second different account logs in, first account already saw it**: modal auto-opens again for the new email, since the seen-map is keyed by email and the new email is absent from it.
- **SSR / no `localStorage` (server render)**: all reads/writes guarded by `isPlatformBrowser(inject(PLATFORM_ID))`; store defaults to `seenByEmail: {}` and `isWelcomeModalOpen: false` on the server, so nothing renders/opens during SSR.
- **Malformed/corrupted localStorage value**: `JSON.parse` wrapped in try/catch, falling back to `{}`.
- **User clicks help icon while the modal is already open**: no-op / idempotent (`openWelcomeModal()` just (re)sets `true`).
- **Rapid sign-out/sign-in without a real navigation**: the `wasLoggedIn` boolean in `app.ts`'s effect already handles this — only a `false → true` transition triggers the check, consistent with existing `loadUserCVs()` behavior.

## Data / API

- No backend/API changes. No Prisma/DB changes.
- No new shared `@opticv/datatypes` types required (email is already exposed via `Supabase.currentUser()`).
- Client-side only: `localStorage` key `opticv_has_seen_welcome` as described above.

## Assumptions

- "First login" per the raw task is interpreted as "first time this email is seen on this browser," per the user's clarification — not a one-time-ever-per-app flag and not server-persisted across devices.
- No secondary CTA (e.g. "Start guided tour" or "Upload your CV") is added to the modal footer in this task, since the guided tour is out of scope and no other CTA was requested — single "Got it" button only.
- Modal copy reuses existing homepage step copy/images verbatim (condensed), rather than new copywriting, since no new content was supplied.
- Help icon placement follows the plan doc's suggestion (in `#end` template, near avatar), since no UI mockup was provided for this task (no `ui/` folder present).

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx test opticv-web` passes, including new specs (`user-guide.store.spec.ts`, `welcome-guide-modal.spec.ts`) and updated `top-header.spec.ts`.
- `npm exec nx lint opticv-web` passes.
- Manual verification: sign in with a fresh browser profile (or cleared `localStorage`) → welcome modal appears once; "Got it" or Escape/mask dismiss both mark it seen; refresh/re-login with the same email does not reopen it automatically; header help icon reopens it on demand regardless of seen-state; signing in with a different email on the same browser triggers the modal again for that email.
- No breaking changes to existing header, home page, or app shell behavior.
