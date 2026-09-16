# Implementation Plan — Task 95: Redesign Welcome Modal

## Source

- Specification: `.claude/specs/tasks/95-redesign-welcome-modal/02-spec.md`
- Spec review: `.claude/specs/tasks/95-redesign-welcome-modal/03-spec-review.md` — **PASS WITH ISSUES** (no critical issues; proceeding as-is per review's own recommendation)
- Design reference: `.claude/specs/tasks/95-redesign-welcome-modal/ui/Welcome-modal-design/Welcome Modal.dc.html`, section `#1c`

## Notes carried over from spec review (non-critical, resolved here)

- "Mark as seen" applies to every full-mode close path (Skip, ×, Get started) — treated as settled behavior below, per spec Behavior §6 and Edge Cases.
- Back-on-step-1-returns-to-Intro (full mode) is settled behavior below, per spec Behavior (Opening in full mode, point 3) and Edge Cases.
- Dot styling (active wider/primary, inactive gray) and layout proportions (540px modal width, 240px image area) are settled visual behavior below, per spec Scope/Behavior/Assumptions.
- Old 3-step images (`step-1-upload.png`, `step-2-job-description.png`, `step-3-optimization.png`) are confirmed still used in `apps/opticv-web/src/app/features/home/home.html` (grepped) — **must NOT be deleted**. This supersedes spec Acceptance line "removed only if confirmed unused elsewhere": they ARE used elsewhere, so removal is out of scope for this task.

---

## 1. `UserGuideStore` — state model changes

File: `apps/opticv-web/src/app/core/stores/user-guide.store.ts`

### 1.1 State shape

Replace `UserGuideState` with:

```ts
export type WelcomeModalMode = 'full' | 'tour';
export type WelcomeModalScreen = 'intro' | 'tour' | 'finish';

export interface UserGuideState {
  isWelcomeModalOpen: boolean;
  mode: WelcomeModalMode;
  screen: WelcomeModalScreen;
  stepIndex: number; // 0-5
  seenByEmail: Record<string, boolean>;
}
```

- `initialState`: `isWelcomeModalOpen: false`, `mode: 'full'`, `screen: 'intro'`, `stepIndex: 0`, `seenByEmail: {}`.

### 1.2 Methods — replace `openWelcomeModal()` / `closeWelcomeModal()` / keep `markWelcomeSeen()` / `hasSeenWelcome()`

- `openWelcomeModal(mode: WelcomeModalMode): void`
  - `full` → `patchState(store, { isWelcomeModalOpen: true, mode: 'full', screen: 'intro', stepIndex: 0 })`.
  - `tour` → `patchState(store, { isWelcomeModalOpen: true, mode: 'tour', screen: 'tour', stepIndex: 0 })`.
- `closeWelcomeModal(): void` — unchanged behavior, only closes: `patchState(store, { isWelcomeModalOpen: false })`.
- `startTour(): void` — intro → tour transition (full mode only, called from "Take the 2-minute tour"): `patchState(store, { screen: 'tour', stepIndex: 0 })`.
- `nextStep(): void`
  - If `stepIndex < 5` → `patchState(store, { stepIndex: stepIndex + 1 })`.
  - If `stepIndex === 5` (last step) and `mode === 'full'` → `patchState(store, { screen: 'finish' })`.
  - If `stepIndex === 5` and `mode === 'tour'` → do not patch step/screen; caller (component) is responsible for triggering close (see §2.3) — store itself does not decide to mark-seen/close here to keep the "close" and "mark seen" responsibility in one place (component's existing `onHide()`-style helper, extended).
- `prevStep(): void`
  - If `stepIndex > 0` → `patchState(store, { stepIndex: stepIndex - 1 })`.
  - If `stepIndex === 0` and `mode === 'full'` → `patchState(store, { screen: 'intro' })`.
  - If `stepIndex === 0` and `mode === 'tour'` → no-op (Back is hidden in the template in this case, per spec; method still safe to no-op defensively since nothing renders the button).
- `goToStep(index: number): void` — dot navigation, works in both modes: `patchState(store, { stepIndex: index, screen: 'tour' })`.
- `replayTour(): void` — Finish screen "Replay the tour" (full mode only): `patchState(store, { screen: 'intro', stepIndex: 0 })`.
- `markWelcomeSeen(email: string): void` — unchanged signature/behavior (sets `seenByEmail`, closes modal, persists to `localStorage`).

### 1.3 Computed signals (derived state, `withComputed`)

Add a `withComputed` block:

- `currentScreen = computed(() => store.screen())` — expose directly if no derivation needed (screen already tracked as explicit state per spec Data/API). Do not derive `screen` from `stepIndex` — spec explicitly lists `screen` as its own tracked state field.
- No additional computed values are required beyond direct state signal reads; keep `withComputed` omitted if it would only pass through raw state (avoid indirection per Rules §Minimal footprint).

### 1.4 Removed API

- Remove old parameterless `openWelcomeModal()` — all call sites must pass a mode (breaking internal change, both call sites are in this same task's scope: `app.ts`, `top-header.ts`).

---

## 2. `WelcomeGuideModal` component — rebuild

Files: `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.ts` / `.html` / `.css`

### 2.1 Step data

Add a local constant (component file or a co-located `welcome-guide-modal.data.ts` if the array plus types exceed reasonable inline size — prefer inline `readonly` array in the component class since it's static, ~6 entries):

```ts
interface TourStepData {
  tag: string;
  title: string;
  caption: string;
  image: string;
  alt: string;
}
```

Populate from spec Scope list (6 entries, tags/titles/captions verbatim from spec §Scope), `image` pointing at the new `/images/welcome-tour/step-N-*.png` paths (see §4 for asset naming/location), `alt` written descriptively per step (e.g. "Screenshot of the CV upload page").

### 2.2 Component class (`welcome-guide-modal.ts`)

- Keep `inject(UserGuideStore)`, `inject(Supabase)`.
- Rename/extend the existing `onHide()` → keep name `onHide()` for the `p-dialog` `(onHide)` binding (fires on any dialog-level dismissal, e.g. Escape key/backdrop if enabled) but branch on mode:
  ```ts
  onHide(): void {
    if (this.userGuideStore.mode() === 'tour') {
      this.userGuideStore.closeWelcomeModal();
      posthog.capture('welcome_modal_dismissed');
      return;
    }
    const email = this.supabase.currentUser()?.email;
    if (email) {
      this.userGuideStore.markWelcomeSeen(email);
    } else {
      this.userGuideStore.closeWelcomeModal();
    }
    posthog.capture('welcome_modal_dismissed');
  }
  ```
- Add explicit button handlers (do not rely solely on `p-dialog`'s `onHide` for in-content buttons — Skip/×/Get started/Finish-in-tour-mode all call `onHide()` directly from the template so the same mark-seen-vs-not branching is centralized):
  - `onSkip(): void` → `this.onHide()`.
  - `onGetStarted(): void` → `this.onHide()`.
  - `onCloseIcon(): void` → `this.onHide()`.
  - `onStartTour(): void` → `this.userGuideStore.startTour()`.
  - `onNext(): void`:
    ```ts
    onNext(): void {
      const isLastStep = this.userGuideStore.stepIndex() === 5;
      const isTourMode = this.userGuideStore.mode() === 'tour';
      if (isLastStep && isTourMode) {
        this.onHide(); // tour-mode Finish closes without marking seen — but onHide() marks seen for full mode only, this branch is tour mode so onHide()'s tour-branch already skips markWelcomeSeen
        return;
      }
      this.userGuideStore.nextStep();
    }
    ```
    Note: `onHide()`'s existing mode-check (`mode() === 'tour'` → `closeWelcomeModal()` only, no mark-seen) already satisfies the tour-mode-Finish-does-not-mark-seen requirement, so no separate method is needed — `onNext()` simply delegates to `onHide()` when tour-mode + last step.
  - `onPrev(): void` → `this.userGuideStore.prevStep()`.
  - `onDotClick(index: number): void` → `this.userGuideStore.goToStep(index)`.
  - `onReplay(): void` → `this.userGuideStore.replayTour()`.
- Expose `readonly tourSteps = [...]` (the data from §2.1) and a computed `currentStep = computed(() => this.tourSteps[this.userGuideStore.stepIndex()])` for template convenience.
- Expose `nextLabel = computed(() => (this.userGuideStore.stepIndex() === 5 ? 'Finish' : 'Next'))`.
- Keep `ChangeDetectionStrategy.OnPush`; keep `imports: [DialogModule, ButtonModule, NgOptimizedImage]` (no new modules needed — icons via `pi` classes don't require a PrimeNG import, same as `top-header.ts`'s existing `pi pi-question-circle` usage pattern).

### 2.3 Template (`welcome-guide-modal.html`)

Restructure to three conditionally-rendered sections inside one `p-dialog`, using native control flow (`@if`) per conventions:

- `p-dialog` bindings:
  - `[visible]="userGuideStore.isWelcomeModalOpen()"`
  - `[modal]="true"`, `[draggable]="false"`, `[closable]="false"` (design has a custom × button inside the tour header only — no dialog-chrome close button per design; intro/finish screens have no × at all per design HTML, matching spec's screens). Provide the dialog's own accessible dismiss via Escape still triggering `(onHide)`.
  - `[style]="{ width: '540px', maxWidth: '95vw' }"` (per spec Assumptions/Scope: 540px width).
  - `[showHeader]="false"` (design has no default `p-dialog` header bar — all chrome is custom-built per screen, matching the design HTML's absence of a `p-dialog`-style title bar).
  - `(onHide)="onHide()"`.
- Root content wrapper with `@switch (userGuideStore.currentScreen())` or three `@if` blocks keyed off `userGuideStore.screen()`:

  **Intro screen** (`@if (userGuideStore.screen() === 'intro')`):
  - Header block: logo icon, "Welcome to OptiCV" heading, subtext (verbatim from spec/design).
  - 3 bullet rows: icon (`pi-upload` / `pi-bolt` / `pi-briefcase`), title, subtext — per spec Scope list.
  - Primary button "Take the 2-minute tour" → `(onClick)="onStartTour()"`.
  - Link button "Skip — I'll explore on my own" → `(onClick)="onSkip()"`.

  **Tour screen** (`@if (userGuideStore.screen() === 'tour')`):
  - Header row: logo icon + "Quick tour" label, step counter (`{{ userGuideStore.stepIndex() + 1 }} / 6`), × close button (`(onClick)="onCloseIcon()"`, `aria-label="Close"`, `title="Close"`).
  - Image area: `<img [ngSrc]="currentStep().image" [alt]="currentStep().alt" fill priority ...>` inside a fixed-height (240px) rounded container. Since `NgOptimizedImage` requires explicit `width`/`height` or `fill` + a positioned container — use `fill` with the container `position: relative; height: 240px` (matches design's fixed-height image area; avoids the "NgOptimizedImage doesn't work for inline base64" caveat since these are static file assets, not base64).
  - Tag/title/caption block from `currentStep()`.
  - Footer row: 6 dot buttons (`@for` over `tourSteps` with `$index`), each `(onClick)="onDotClick($index)"`, `[class.welcome-guide-modal__dot--active]="$index === userGuideStore.stepIndex()"`, `[attr.aria-label]="'Go to step ' + ($index + 1)"`, `[attr.aria-current]="$index === userGuideStore.stepIndex() ? 'step' : null"`.
  - Back button: `@if (userGuideStore.mode() === 'full' || userGuideStore.stepIndex() > 0)` → visible; `(onClick)="onPrev()"`. Hidden entirely (not `disabled`) when `mode() === 'tour' && stepIndex() === 0`, per spec.
  - Next/Finish button: `(onClick)="onNext()"`, label `{{ nextLabel() }}`.

  **Finish screen** (`@if (userGuideStore.screen() === 'finish')`, full mode only — unreachable in tour mode since tour mode never sets `screen: 'finish'`):
  - Check icon, "You're ready to go" heading, subtext.
  - Primary button "Get started" → `(onClick)="onGetStarted()"`.
  - Link button "Replay the tour" → `(onClick)="onReplay()"`.

- Accessibility (per conventions §Accessibility Requirements and spec Acceptance):
  - Dialog: PrimeNG `p-dialog` already manages focus trap/`aria-modal`/`role="dialog"` by default; verify `ariaLabelledBy`/`ariaCloseLabel` not needed since `[showHeader]="false"` — instead set `[attr.aria-label]="'Welcome to OptiCV'"` on the dialog or on the intro heading via `aria-labelledby` pointing at the visible `<h2>`/`<h1>` in whichever screen is active. Use a stable `id` on each screen's heading element and bind `p-dialog`'s content wrapper `aria-labelledby` dynamically, OR simplest compliant approach: set a static `[attr.aria-label]="'Welcome to OptiCV'"` directly on `p-dialog` (constant, screen-independent) — prefer this simpler option to avoid dynamic id plumbing across three conditionally-rendered headings.
  - Dot buttons: `aria-label="Go to step N"` each (per Acceptance).
  - × close button: `aria-label="Close"` + `title="Close"` (per Acceptance).
  - Color contrast: reuse existing design-system CSS custom properties already available in the app's global Tailwind/PrimeNG theme tokens (`--primary-*`, `--neutral-*` equivalents) — do not hardcode raw hex values that bypass the app's token system; map design's `var(--primary-600)` etc. to the equivalent Tailwind/PrimeNG token already configured in `app.config.ts`'s Aura preset, or the closest existing CSS variable used elsewhere in the app (check `styles.css`/existing component CSS for the established naming, e.g. this component's own `.css` currently uses `var(--primary-color)`, `var(--text-color)`, `var(--text-grey-color)`, `var(--white)` — continue using those existing tokens, not the design mockup's `--primary-600`/`--neutral-*` names, since those are the design-tool's own token set, not this app's).

### 2.4 Styles (`welcome-guide-modal.css`)

Replace the 3-step grid styles with styles for:
- `.welcome-guide-modal__intro-header` (gradient background per design — translate to existing app tokens, e.g. `var(--primary-color)` gradient or solid if no gradient token exists in the app's design system; if no equivalent gradient token exists, use a solid `var(--primary-color)` background rather than inventing new raw color values, per Rules "no hacks/no invented values").
- `.welcome-guide-modal__bullet-row`, `.welcome-guide-modal__bullet-icon` (40px circle, `var(--primary-color)`-tinted background).
- `.welcome-guide-modal__tour-header`, `.welcome-guide-modal__step-count`.
- `.welcome-guide-modal__image-area` (`height: 240px; position: relative; border-radius: 12px; overflow: hidden;`).
- `.welcome-guide-modal__dots` (flex row, gap), `.welcome-guide-modal__dot` (8px height, pill, `background: var(--neutral-*)` inactive equivalent already used in app), `.welcome-guide-modal__dot--active` (width 26px, `background: var(--primary-color)`).
- `.welcome-guide-modal__finish` (centered text, icon circle).
- Remove now-unused `.welcome-guide-modal__steps`, `.welcome-guide-modal__step`, `.step-number`, `.welcome-guide-modal__step-title`, `.welcome-guide-modal__step-text` (superseded).
- Keep file under the 1000-line limit (trivially, this is a small stylesheet).

---

## 3. Trigger point changes

### 3.1 `apps/opticv-web/src/app/app.ts`

In the constructor's login `effect()`:
```ts
if (email && !this.userGuideStore.hasSeenWelcome(email)) {
  this.userGuideStore.openWelcomeModal('full');
  posthog.capture('welcome_modal_shown');
}
```
Only change: pass `'full'` to `openWelcomeModal`. No other logic in `app.ts` changes.

### 3.2 `apps/opticv-web/src/app/layout/top-header/top-header.ts`

In `openHelp()`:
```ts
openHelp(): void {
  this.userGuideStore.openWelcomeModal('tour');
  posthog.capture('help_icon_clicked', {
    place: 'top header',
    button_title: 'Help',
  });
}
```
Only change: pass `'tour'` to `openWelcomeModal`. Per spec, this always resets to step 1 tour screen regardless of `hasSeenWelcome` — already satisfied since `openWelcomeModal('tour')` unconditionally sets `screen: 'tour', stepIndex: 0`.

---

## 4. Static assets

- Create `apps/opticv-web/public/images/welcome-tour/` (new subfolder — keeps the new 6-image set distinct from the existing flat `public/images/` files, avoiding naming collisions and making the old-vs-new sets unambiguous).
- Copy and rename the 6 files from `.claude/specs/tasks/95-redesign-welcome-modal/ui/Welcome-modal-design/uploads/` into that folder:
  - `step-1-upload-cv-page.png`
  - `step-2-cv-optimization-page.png`
  - `step-3-loaded-cv-optimization-results.png`
  - `step-4-cover-letter.png`
  - `step-5-interview-prep.png`
  - `step-6-linked-in-profile.png`
- Do **not** touch `step-1-upload.png`, `step-2-job-description.png`, `step-3-optimization.png` in the flat `public/images/` folder — confirmed still referenced by `home.html`.

---

## 5. Tests

### 5.1 `user-guide.store.spec.ts` — update/extend

- Update all `openWelcomeModal()` calls in existing tests to `openWelcomeModal('full')` (signature change).
- Add coverage for:
  - `openWelcomeModal('full')` sets `mode: 'full', screen: 'intro', stepIndex: 0, isWelcomeModalOpen: true`.
  - `openWelcomeModal('tour')` sets `mode: 'tour', screen: 'tour', stepIndex: 0, isWelcomeModalOpen: true`.
  - `startTour()` transitions `screen` from `'intro'` to `'tour'`, resets `stepIndex` to 0.
  - `nextStep()` increments `stepIndex` while `< 5`.
  - `nextStep()` at `stepIndex === 5` in `mode: 'full'` sets `screen: 'finish'` (does not increment past 5).
  - `nextStep()` at `stepIndex === 5` in `mode: 'tour'` is a no-op on `screen`/`stepIndex` (component handles closing, not the store — assert store state unchanged after the call, matching §1.2's design).
  - `prevStep()` decrements `stepIndex` while `> 0`.
  - `prevStep()` at `stepIndex === 0` in `mode: 'full'` sets `screen: 'intro'`.
  - `prevStep()` at `stepIndex === 0` in `mode: 'tour'` is a no-op.
  - `goToStep(n)` sets `stepIndex` to `n` and `screen` to `'tour'` regardless of current screen.
  - `replayTour()` sets `screen: 'intro'`, `stepIndex: 0`.
  - `markWelcomeSeen` behavior unchanged — keep existing assertions.

### 5.2 `welcome-guide-modal.spec.ts` — rebuild

Update the store mock to the new shape (`mode`, `screen`, `stepIndex` signals; `openWelcomeModal` accepting an argument; new methods `startTour`, `nextStep`, `prevStep`, `goToStep`, `replayTour`).

Cover, per spec Acceptance (DEV):
- Full-mode journey: intro renders when `screen() === 'intro'`; clicking "Take the 2-minute tour" calls `startTour()`; tour screen renders step content from `currentStep()`; clicking Next calls `nextStep()`; clicking a dot calls `goToStep(index)`; clicking Back calls `prevStep()`; on step 6 label reads "Finish"; clicking Finish on step 6 in full mode calls `onHide()`-path → asserts `markWelcomeSeen` called (mock `mode` signal to `'full'`).
- Full-mode skip from intro: clicking "Skip — I'll explore on my own" → `markWelcomeSeen` called with email, dialog closes.
- Full-mode × mid-tour: clicking the × button → `markWelcomeSeen` called (mode `'full'`).
- Tour-mode (help icon) open: with `mode` signal `'tour'`, `screen` signal `'tour'` — assert intro/finish blocks are absent from rendered DOM.
- Tour-mode Back hidden on step 1: with `mode() === 'tour'` and `stepIndex() === 0`, assert no Back button in DOM; with `stepIndex() === 1`, assert Back button present and clicking it calls `prevStep()`.
- Tour-mode Finish (step 6) closes without marking seen: `mode() === 'tour'`, `stepIndex() === 5`, click Next/Finish → assert `closeWelcomeModal` called, `markWelcomeSeen` NOT called.
- Tour-mode × does not mark seen: `mode() === 'tour'`, click × → assert `closeWelcomeModal` called, `markWelcomeSeen` NOT called.
- No-email fallback preserved: existing test (call with `email: null`) still passes with the new `onHide()` logic for full mode.
- Keep the existing `posthog.capture('welcome_modal_dismissed')` assertion.

### 5.3 AXE/accessibility check

- If the project has an existing AXE test harness/pattern for other components, follow that same pattern for `WelcomeGuideModal` (search codebase for existing axe usage before adding a new one — if none exists, this task does not introduce a new AXE test *framework*, only ensures markup satisfies WCAG AA via correct ARIA attributes as specified in §2.3; manual verification via browser AXE devtools extension is acceptable if no automated AXE harness exists in this repo).

---

## 6. Order of implementation

1. `UserGuideStore` — state/method changes (§1) + store spec updates (§5.1).
2. Copy new image assets into `public/images/welcome-tour/` (§4).
3. `WelcomeGuideModal` component rebuild — class, template, styles (§2).
4. Update `app.ts` and `top-header.ts` call sites (§3).
5. `WelcomeGuideModal` spec rebuild (§5.2).
6. Run `npm exec nx test opticv-web`, `npm exec nx build opticv-web`, `npm exec nx lint opticv-web`, `npm exec nx typecheck opticv-web`.
7. Manual verification in browser: first-login flow (clear `localStorage` key `opticv_has_seen_welcome`) end-to-end; help-icon flow; AXE devtools spot-check on all three screens.

---

## Files planned (created/modified)

**Modified:**
- `apps/opticv-web/src/app/core/stores/user-guide.store.ts`
- `apps/opticv-web/src/app/core/stores/user-guide.store.spec.ts`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.ts`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.html`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.css`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.spec.ts`
- `apps/opticv-web/src/app/app.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.ts`

**Created:**
- `apps/opticv-web/public/images/welcome-tour/step-1-upload-cv-page.png`
- `apps/opticv-web/public/images/welcome-tour/step-2-cv-optimization-page.png`
- `apps/opticv-web/public/images/welcome-tour/step-3-loaded-cv-optimization-results.png`
- `apps/opticv-web/public/images/welcome-tour/step-4-cover-letter.png`
- `apps/opticv-web/public/images/welcome-tour/step-5-interview-prep.png`
- `apps/opticv-web/public/images/welcome-tour/step-6-linked-in-profile.png`

**Explicitly not modified:**
- `apps/opticv-web/public/images/step-1-upload.png`, `step-2-job-description.png`, `step-3-optimization.png` (still used by `home.html`)
- `apps/opticv-web/src/app/features/home/home.html`
- `apps/opticv-be/**` (no backend changes)
