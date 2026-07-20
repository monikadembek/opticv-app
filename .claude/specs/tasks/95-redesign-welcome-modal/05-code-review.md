# Code Review — Task 95: Redesign Welcome Modal

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation faithfully covers the spec's three-screen (intro/tour/finish) redesign, the full-vs-tour mode branching, mark-seen semantics, and accessibility requirements from `02-spec.md`. Unit tests in `welcome-guide-modal.spec.ts` and `user-guide.store.spec.ts` were updated (commit `8b8ac5f`) and pass. The main issues are that the tour was expanded from 6 to 7 steps and the dialog width changed from 540px to 700px without the spec/plan documents being updated to reflect these decisions — a documentation/traceability gap rather than a functional defect.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.ts:17-82` — the `TOUR_STEPS` array (7 entries with tag/title/caption/image/alt) is a static, non-trivial-sized data block defined at module scope inside the component file. The implementation plan (§2.1) anticipated this and explicitly offered a co-located `welcome-guide-modal.data.ts` file "if the array plus types exceed reasonable inline size." At 7 entries with multi-sentence captions this arguably crosses that threshold; consider extracting to keep `welcome-guide-modal.ts` focused on component behavior. Not blocking.
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.ts:107-123` — `onHide()` still does the "is it tour mode → early return, else check email" branching inline; this matches the plan's own suggested implementation (04-implementation-plan.md §2.2) so it's intentional, but the double `posthog.capture('welcome_modal_dismissed')` call (once in the tour-mode branch, once at the end) is easy to miss on future edits since it's not visually obvious that both branches converge on the same capture call. A short comment or slight restructuring (single capture at the very end, no early return) would reduce this risk. Not blocking since current behavior is correct.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Rebuild `WelcomeGuideModal` with Intro/Tour/Finish screens (design 1c) | Covered | `welcome-guide-modal.html:11-186` implements all three `@if`-gated screens. |
| `UserGuideStore` supports `mode: 'full' \| 'tour'`, `screen`, `stepIndex` | Covered | `user-guide.store.ts:7-26`. |
| `openWelcomeModal(mode)` replaces parameterless version | Covered | `user-guide.store.ts:52-68`; both call sites (`app.ts:50`, `top-header.ts:97`) updated. |
| Navigation methods: `startTour`, `nextStep`, `prevStep`, `goToStep`, `replayTour` | Covered | `user-guide.store.ts:72-100`. |
| `app.ts` wired to open in `'full'` mode on first login | Covered | `app.ts:50`. |
| `top-header.ts` `openHelp()` wired to `'tour'` mode | Covered | `top-header.ts:97`. |
| 6 step screenshots as static assets (per spec) | Partial | Spec/plan specify 6 step images; actual implementation ships **7** step images (`step-1` through `step-7` in `public/images/welcome-tour/`, added/renamed in commit `de84936`). Functionally coherent (store, template, and tests are all consistent at 7 steps) but the spec document itself was not updated to reflect the change from 6 to 7 steps — see Plan Deviations. |
| Intro screen copy (heading, subtext, 3 bullets, buttons) | Covered | `welcome-guide-modal.html:11-88`. |
| Finish screen copy (heading, subtext, Get started, Replay) | Covered | `welcome-guide-modal.html:162-185`. |
| Dot pagination (N dots, click-to-jump, active/inactive styling) | Covered | `welcome-guide-modal.html:132-146`, `.css:214-232` — now renders 7 dots (one per `tourSteps` entry) rather than the spec's 6, consistent with the 7-step decision. |
| Update unit tests for new behavior | Covered | `welcome-guide-modal.spec.ts` (24 tests) and `user-guide.store.spec.ts` (23 tests) both updated and passing per the latest commit. |
| PostHog events preserved (`welcome_modal_shown`, `welcome_modal_dismissed`, `help_icon_clicked`) | Covered | `app.ts:51`, `welcome-guide-modal.ts:110/122`, `top-header.ts:98`. |
| Full-mode: Skip / × mid-tour / Get started all mark welcome as seen | Covered | `onHide()` branches correctly per mode; verified by `welcome-guide-modal.spec.ts` full-mode tests. |
| Tour-mode: × and Finish-on-last-step do NOT mark seen | Covered | Verified by `welcome-guide-modal.spec.ts` tour-mode tests. |
| Back hidden on step 1 in tour mode, shown in full mode | Covered | `welcome-guide-modal.html:149`. |
| No-email fallback preserved | Covered | `onHide()` still falls back to `closeWelcomeModal()` when email is absent; test at `welcome-guide-modal.spec.ts:358-365`. |
| AXE/WCAG AA: dialog aria-label, dot aria-labels, close button aria-label/title | Covered | `welcome-guide-modal.html:8,108-109,140`. |
| Old 3-step images (`step-1-upload.png` etc.) left untouched | Covered | Confirmed still referenced in `home.html`; not touched in this task's diff. |
| Modal width 540px per spec/plan | Missing | Actual `welcome-guide-modal.html:7` uses `width: '700px'`, not the spec's/plan's 540px. Functional, but a documented deviation — see below. |

## Plan Deviations

- **Step count: 6 → 7.** The spec (`02-spec.md`) and implementation plan (`04-implementation-plan.md`) both specify a 6-step tour (`stepIndex` 0-5, `LAST_STEP_INDEX = 5`, "1 / 6" counter, 6 images, 6 dots). Commit `de84936` ("Task 95: Update text content and images in the welcome guide, increase number of steps to 7") changed this to 7 steps (`LAST_STEP_INDEX = 6`, "1 / 7", 7 images, 7 dots, `user-guide.store.ts:18`). The change is internally consistent (store, component, template, and both spec files were all updated together, including the follow-up test fix in `8b8ac5f`), but neither `02-spec.md` nor `04-implementation-plan.md` was amended to describe the new 7th step or the revised step content/captions. This is a factual, not correctness, issue — future readers of the spec/plan will see stale numbers.
- **Dialog width: 540px → 700px.** Both spec (§Out of scope, referencing "540px modal width") and plan (§2.3, explicitly `[style]="{ width: '540px', maxWidth: '95vw' }"`) call for a 540px-wide dialog. The shipped component (`welcome-guide-modal.ts:7`) uses `{ width: '700px', maxWidth: '95vw' }`. Likely a deliberate visual adjustment (more room for 7 steps' worth of caption text) but undocumented in the spec/plan.
- **Intro subtext max-width bumped 400px → 430px** (`welcome-guide-modal.css:64`, changed in `de84936`) — minor, not spec-tracked, consistent with the wider dialog.

## Null Safety Issues

None. `Supabase.currentUser()?.email` (`welcome-guide-modal.ts:114`) is correctly optional-chained, and the no-email fallback path is preserved and tested.

## Code Smells

None beyond the non-critical style note above (inline step-data array size). No SRP violations, no duplicated logic, no magic numbers (step index bounds are centralized via the exported `LAST_STEP_INDEX` constant and consistently referenced from both the store and the component).

## Recommendation

- **Merge as-is.** No critical defects. Recommend a quick follow-up edit to `02-spec.md` / `04-implementation-plan.md` to reconcile the step count (6→7) and dialog width (540px→700px) so the spec/plan remain accurate historical references, but this should not block merging the working code.
