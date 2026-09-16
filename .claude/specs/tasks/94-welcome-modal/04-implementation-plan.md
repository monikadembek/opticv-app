# Implementation Plan — Task 94: Welcome Modal + Help Icon

## Source

- Specification: `.claude/specs/tasks/94-welcome-modal/02-spec.md`
- Specification review: `.claude/specs/tasks/94-welcome-modal/03-spec-review.md` (PASS WITH ISSUES)

This plan resolves the review's one open implementation ambiguity (dialog dismiss wiring, see Non-Critical/Unclear finding #2) by making `(onHide)` the single source of truth for `markWelcomeSeen()` and the `welcome_modal_dismissed` capture — the "Got it" button only triggers the dialog to close (sets `visible` state to `false` / calls `closeWelcomeModal()`... see Step 4 for the exact mechanism), so the seen-marking logic exists in exactly one place regardless of dismissal path. All other spec decisions (per-email storage model, key name reuse, event names) are carried forward as written since the review did not require spec changes to proceed.

---

## Step 1 — `UserGuideStore` (`apps/opticv-web/src/app/core/stores/user-guide.store.ts`)

Follow the exact `signalStore` composition pattern used in `apps/opticv-web/src/app/core/stores/cv.store.ts` (`providedIn: 'root'`, `withState`, `withComputed`, `withMethods`, `patchState`).

**State shape:**

- `isWelcomeModalOpen: boolean` (initial `false`)
- `seenByEmail: Record<string, boolean>` (initial `{}`)

**Initialization:**

- In the `withMethods` factory, inject `PLATFORM_ID` and guard all `localStorage` access with `isPlatformBrowser(inject(PLATFORM_ID))`, matching the precedent in `supabase.ts` / `posthog.service.ts`.
- On store creation (module-level `initialState` cannot read `localStorage` synchronously in a browser-safe way inside `withState`, so perform the read in a constructor-style step inside `withMethods`'s factory function body, before returning the methods object, and `patchState` the result into `seenByEmail`):
  - If not in browser: leave `seenByEmail` as `{}`.
  - If in browser: read `localStorage.getItem('opticv_has_seen_welcome')`. If present, `JSON.parse` inside a `try/catch`; on parse failure or absent key, use `{}`.

**Computed:**

- `hasSeenWelcome: (email: string | null | undefined) => boolean` — implemented as a plain method or a computed factory returning a function; per spec it takes a parameter, so implement it as a plain instance method inside `withMethods` (not `withComputed`, since `withComputed` signals take no arguments) that reads `store.seenByEmail()` and returns `false` when `email` is falsy or `!(email in seenByEmail())`.

**Methods (in `withMethods`):**

- `openWelcomeModal(): void` — `patchState(store, { isWelcomeModalOpen: true })`.
- `closeWelcomeModal(): void` — `patchState(store, { isWelcomeModalOpen: false })`.
- `markWelcomeSeen(email: string): void`:
  1. Compute merged map: `{ ...store.seenByEmail(), [email]: true }`.
  2. `patchState(store, { seenByEmail: mergedMap, isWelcomeModalOpen: false })`.
  3. If `isPlatformBrowser(platformId)`, write `localStorage.setItem('opticv_has_seen_welcome', JSON.stringify(mergedMap))`.

**Explicitly not implemented:** no `resetStore()` method — the spec states this store is not reset by sign-out/`CvStore.resetStore()`, so no reset method is needed at all.

---

## Step 2 — `WelcomeGuideModal` component (`apps/opticv-web/src/app/shared/welcome-guide-modal/`)

Files: `welcome-guide-modal.ts`, `welcome-guide-modal.html` (external template, since this is not a "small" component per the 3-step content length — follow the relative-path convention from `conventions.md`).

**Component (`welcome-guide-modal.ts`):**

- Standalone, selector `app-welcome-guide-modal`, `changeDetection: ChangeDetectionStrategy.OnPush`, no inputs/outputs.
- Imports: `DialogModule` (PrimeNG `p-dialog`), `NgOptimizedImage` (for the three step images, per Angular conventions — static, non-base64 images).
- Inject `UserGuideStore` and `Supabase` via `inject()`.
- Expose `userGuideStore` (or narrowed signals) to the template for the dialog's `visible` binding.
- Single method `onHide(): void`:
  1. Read `this.supabase.currentUser()?.email`.
  2. If email is present, call `userGuideStore.markWelcomeSeen(email)`.
  3. If email is absent, call `userGuideStore.closeWelcomeModal()` directly (defensive fallback — should not normally occur since the modal is only opened when an email was available, but avoids leaving the modal's open state inconsistent if it does).
  4. Capture PostHog event `welcome_modal_dismissed` (same call site regardless of whether dismissal came from the "Got it" button, X, Escape, or mask-click — all four converge on the dialog's `(onHide)` output, resolving spec-review ambiguity #2).

**Template (`welcome-guide-modal.html`):**

- `<p-dialog>` bound with `[visible]="userGuideStore.isWelcomeModalOpen()"`, `[modal]="true"`, `(onHide)="onHide()"`. Do not add a `(visibleChange)` two-way binding that also calls store methods — `(onHide)` alone owns the close-and-mark-seen behavior to avoid the double-call risk the review flagged. PrimeNG's `p-dialog` fires `(onHide)` for X-button, Escape, and mask-click dismissal uniformly, and the footer "Got it" button will trigger dismissal by closing the dialog (see below), so `(onHide)` also covers that path.
- Header: reuse copy such as "Welcome to OptiCV" (or similar short title — exact wording is content, not structural; keep concise).
- Body: three step blocks, same order/copy/images as `apps/opticv-web/src/app/features/home/home.html` lines 60–115 (`step-1-upload.png` / "Upload your CV", `step-2-job-description.png` / "Paste job description", `step-3-optimization.png` / "Get your optimized CV"), condensed (shorter paragraph copy is acceptable per spec — omit the ATS-language-support caveat since it's homepage-specific detail, not essential to the 3-step overview). Use `<img ngSrc="..." width="..." height="..." alt="...">` (`NgOptimizedImage`) instead of the homepage's plain `<img src>`, since this is a new usage site and conventions mandate `NgOptimizedImage` for static images.
- Footer (PrimeNG `p-dialog` `pTemplate="footer"` or `<ng-template pTemplate="footer">`): single `<p-button label="Got it" (onClick)="dialogVisible-related close">`. Because `(onHide)` must own `markWelcomeSeen`, the button's click handler should only cause the dialog to close (e.g., call a local method that sets a local signal used for `[visible]`, or more simply: since `[visible]` is bound to the store signal, the button's click handler calls `userGuideStore.closeWelcomeModal()` and nothing else — this triggers `visible` to become `false`, which PrimeNG's `p-dialog` treats as a close and will invoke `(onHide)` per its lifecycle, so `onHide()` still runs and performs the `markWelcomeSeen` + event capture). No inline `(click)` logic beyond calling `closeWelcomeModal()`.

**Mounting:** Add `WelcomeGuideModal` to `App`'s `imports` array and mount `<app-welcome-guide-modal></app-welcome-guide-modal>` once in `app.html`, alongside `<p-toast>` (per spec).

---

## Step 3 — Trigger flow in `app.ts` / `app.html`

**`app.ts` changes:**

- Inject `UserGuideStore`.
- Extend the existing constructor `effect()` (the one tracking `wasLoggedIn` for `cvStore.loadUserCVs()`): in the `isLoggedIn && !wasLoggedIn` branch, after the existing `loadUserCVs()` call, add:
  1. Read `email = this.supabaseService.currentUser()?.email`.
  2. If `email` is truthy and `!this.userGuideStore.hasSeenWelcome(email)`:
     - `this.userGuideStore.openWelcomeModal()`.
     - Capture PostHog `welcome_modal_shown` (no extra props needed unless following the `signin_button_clicked` precedent suggests otherwise — keep minimal, e.g. `posthog.capture('welcome_modal_shown')`).
  3. If `email` is falsy, do nothing further for this transition (per spec Edge Cases — no retry, no crash; help icon remains the fallback).
- Import `posthog` from `posthog-js` directly in `app.ts` (matching the direct-import pattern already used in `top-header.ts`, rather than going through `PosthogService`, since `PosthogService` only handles init/pageview tracking, not ad-hoc event capture).

**`app.html` changes:**

- Add `<app-welcome-guide-modal></app-welcome-guide-modal>` next to `<p-toast position="bottom-right" />`.

---

## Step 4 — Help icon in `top-header.ts` / `.html`

**`top-header.ts` changes:**

- Inject `UserGuideStore`.
- Add method `openHelp(): void`:
  1. `this.userGuideStore.openWelcomeModal()`.
  2. `posthog.capture('help_icon_clicked', { place: 'top header', button_title: 'Help' })` (matching the existing `signin_button_clicked`/`signout_button_clicked` prop shape for consistency).

**`top-header.html` changes:**

- Inside the `#end` template's `@else` branch (logged-in branch, alongside the avatar and Sign Out button), add:
  ```
  <p-button
    icon="pi pi-question-circle"
    [text]="true"
    [rounded]="true"
    severity="secondary"
    ariaLabel="Open help guide"
    (onClick)="openHelp()"
  ></p-button>
  ```
- Placement: before or after the avatar (spec says "near avatar" without exact ordering — place it immediately before the avatar so Sign Out remains the last/rightmost action, consistent with typical header conventions of primary action last).

---

## Step 5 — Unit tests

**`user-guide.store.spec.ts`** (new, pattern from `cv.store.spec.ts`):

- Initial state: `isWelcomeModalOpen` false, `seenByEmail` `{}` when no `localStorage` value exists.
- Initialization reads existing `localStorage` value and populates `seenByEmail`.
- Initialization falls back to `{}` on malformed JSON in `localStorage` (wrapped try/catch).
- `hasSeenWelcome`: returns `false` for `null`/`undefined`/empty-string email; returns `false` for an email not in the map; returns `true` for an email present in the map.
- `openWelcomeModal` sets `isWelcomeModalOpen` to `true`.
- `closeWelcomeModal` sets `isWelcomeModalOpen` to `false`.
- `markWelcomeSeen`: adds the email to `seenByEmail`, sets `isWelcomeModalOpen` to `false`, and persists the merged map to `localStorage` (assert via a spy/mock on `localStorage.setItem`).
- `markWelcomeSeen` preserves previously seen emails when adding a new one (merge, not overwrite).
- SSR guard: when `PLATFORM_ID` is mocked as server, `markWelcomeSeen` still updates in-memory state but does not call `localStorage.setItem` (mock/spy and assert not called, or provide a fake `PLATFORM_ID` token value and mock `isPlatformBrowser` behavior consistent with existing SSR-guard test patterns in the codebase, if any exist — otherwise assert via a `localStorage` spy that it is never called when the platform token is set to `'server'`).

**`welcome-guide-modal.spec.ts`** (new, pattern from `top-header.spec.ts` for TestBed setup with mocked deps):

- Renders with `p-dialog` `visible` bound to `userGuideStore.isWelcomeModalOpen()` (mock `UserGuideStore` as a provider).
- `onHide()` calls `markWelcomeSeen` with the current user's email when `Supabase.currentUser()` returns a user with an email (mock `Supabase`).
- `onHide()` calls `closeWelcomeModal()` instead when no email is available.
- `onHide()` triggers a `welcome_modal_dismissed` PostHog capture (spy on `posthog.capture`).
- Renders three step blocks with expected titles ("Upload your CV", "Paste job description", "Get your optimized CV").

**`top-header.spec.ts`** (extend existing file):

- New `describe('help icon')` block:
  - Not rendered when `isLoggedIn` is `false`.
  - Rendered when `isLoggedIn` is `true`, with `aria-label="Open help guide"`.
  - Clicking it calls `userGuideStore.openWelcomeModal()` (mock `UserGuideStore` provider, following the existing `TestBed.configureTestingModule` pattern already in the file) and captures `help_icon_clicked`.

**`app.spec.ts`** (extend existing file):

- New `describe('welcome modal trigger')` block, following the existing `describe('cv store loading')` pattern (using `supabaseMock.setSession(...)` to trigger the `false → true` transition):
  - Mocks `UserGuideStore` as a provider (`openWelcomeModal`, `hasSeenWelcome` spies) alongside the existing `Supabase`/`CvStore` mocks, and stubs `WelcomeGuideModal` in the `overrideComponent` call (same pattern as `TopHeaderStub`/`FooterStub`/`ToastStub`).
  - When transitioning to logged-in with an email not in `seenByEmail` (`hasSeenWelcome` mock returns `false`): `openWelcomeModal()` is called once, and `welcome_modal_shown` is captured.
  - When transitioning to logged-in with an email already seen (`hasSeenWelcome` mock returns `true`): `openWelcomeModal()` is not called.
  - When transitioning to logged-in with no email on the user object: `openWelcomeModal()` is not called, no error thrown.

---

## Step 6 — Verification (per spec Acceptance)

Run in order, fixing any failures before proceeding to the next:

1. `npm exec nx lint opticv-web`
2. `npm exec nx test opticv-web`
3. `npm exec nx build opticv-web`

Manual verification (dev server, `npm exec nx serve opticv-web`):

- Fresh/cleared `localStorage` → sign in → welcome modal appears once automatically.
- Dismiss via "Got it" → modal closes, `localStorage` key `opticv_has_seen_welcome` contains the signed-in email mapped to `true`.
- Refresh and re-login with the same email → modal does not reopen automatically.
- Click header help icon → modal reopens regardless of seen-state.
- Dismiss via Escape or mask-click (not "Got it") → also marks as seen (verify via `localStorage` inspection).
- Sign out, sign in with a different email on the same browser → modal auto-opens again for that new email.
- No regressions to existing header layout, Sign In/Sign Out flow, or home page.

---

## Files Summary

### New files

- `apps/opticv-web/src/app/core/stores/user-guide.store.ts`
- `apps/opticv-web/src/app/core/stores/user-guide.store.spec.ts`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.ts`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.html`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.spec.ts`

### Modified files

- `apps/opticv-web/src/app/app.ts` — inject `UserGuideStore`, extend login-transition effect, import `posthog`.
- `apps/opticv-web/src/app/app.html` — mount `<app-welcome-guide-modal>`.
- `apps/opticv-web/src/app/app.spec.ts` — add welcome-modal-trigger test coverage, stub `WelcomeGuideModal`.
- `apps/opticv-web/src/app/layout/top-header/top-header.ts` — inject `UserGuideStore`, add `openHelp()` method.
- `apps/opticv-web/src/app/layout/top-header/top-header.html` — add help icon button in `#end` template.
- `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts` — add help icon coverage.
