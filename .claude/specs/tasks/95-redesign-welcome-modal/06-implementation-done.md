# Implementation Done — Task 95: Redesign Welcome Modal

## Summary

The `WelcomeGuideModal` component was rebuilt to render three internal screens (Intro / Tour / Finish) per design 1c, replacing the previous static 3-step grid. `UserGuideStore` was extended with `mode` (`'full' | 'tour'`), `screen` (`'intro' | 'tour' | 'finish'`), and `stepIndex` state plus navigation methods (`startTour`, `nextStep`, `prevStep`, `goToStep`, `replayTour`). `app.ts` now opens the modal in `'full'` mode on first login; `top-header.ts` `openHelp()` opens it in `'tour'` mode. The tour was implemented with **7 steps** (not 6, per spec/plan — see Deviations). Unit tests for both the store and the component were rebuilt to cover full-mode and tour-mode flows.

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Rebuild `WelcomeGuideModal` with Intro/Tour/Finish screens | Implemented | `welcome-guide-modal.html` uses `@if` blocks keyed on `userGuideStore.screen()` |
| `UserGuideStore` open mode (`'full'` / `'tour'`) | Implemented | `WelcomeModalMode` type, `mode` state field |
| `UserGuideStore` current tour step index (0-5) | Implemented, with deviation | Step index range is 0-6 (7 steps), not 0-5 — see Deviations |
| `UserGuideStore` current internal screen | Implemented | `WelcomeModalScreen` type, `screen` state field |
| Navigation methods: start tour, next, back, skip, finish, replay | Implemented | `startTour`, `nextStep`, `prevStep`, `goToStep`, `replayTour`; skip/finish handled via component `onHide()`/`onNext()` |
| Wire `app.ts` first-login trigger to open in full mode | Implemented | `app.ts:50` — `openWelcomeModal('full')` |
| Wire `top-header.ts` `openHelp()` to open in tour mode | Implemented | `top-header.ts:97` — `openWelcomeModal('tour')` |
| Add 6 step screenshots as static assets | Implemented, with deviation | 7 images added under `public/images/welcome-tour/` (see Deviations) |
| Intro screen copy/content per design | Implemented | Heading, subtext, 3 bullet rows, primary + link button present |
| Finish screen copy per design | Implemented | Heading, subtext, "Get started" + "Replay the tour" buttons |
| Dot pagination (click-to-jump, active/inactive styling) | Implemented, with deviation | 7 dots (one per step) instead of 6 |
| Update unit tests (`welcome-guide-modal.spec.ts`, `user-guide.store.spec.ts`) | Implemented | Both files rebuilt; 639 combined lines, cases enumerated below |
| PostHog events preserved (`welcome_modal_shown`, `welcome_modal_dismissed`, `help_icon_clicked`) | Implemented | All three call sites present in `app.ts`, `welcome-guide-modal.ts`, `top-header.ts` |
| Full-mode journey: intro → tour (next/back/dots) → finish → close (marks seen) | Implemented | Covered in `welcome-guide-modal.spec.ts` |
| Full-mode skip from intro closes and marks seen | Implemented | Test: "clicking Skip marks welcome as seen and closes" |
| Full-mode close (×) mid-tour closes and marks seen | Implemented | Test: "clicking the close (x) button mid-tour in full mode marks seen" |
| Tour-mode opens directly to step 1 tour screen, no intro/finish | Implemented | Test: "opens directly to the tour screen with no intro/finish content" |
| Tour-mode Back hidden on step 1, visible/functional from step 2+ | Implemented | Tests: "hides the Back button on step 1", "shows and wires the Back button from step 2 onward" |
| Tour-mode Finish (last step) closes modal without marking seen | Implemented | Test: "clicking Finish on step 7 closes the modal without marking seen" |
| Tour-mode close (×) does not mark seen | Implemented | Test: "clicking the close (x) button does not mark seen" |
| AXE/WCAG AA: dialog focus mgmt, dot `aria-label`, close button `aria-label`/`title` | Implemented | `aria-label="'Go to step ' + (i+1)"` on dots, `aria-label="Close"` + `title="Close"` on close button, `aria-label="Welcome to OptiCV"` on dialog |
| No breaking changes to `TopHeader`/`app.ts` public APIs beyond store method signature | Implemented | Only `openWelcomeModal()` call sites updated to pass mode argument |
| Old 3-step images removed only if unused elsewhere | Not applicable / preserved | Confirmed still referenced in `home.html`; not modified or removed, per plan |

## Files

### Created

- `apps/opticv-web/public/images/welcome-tour/step-1-upload-cv-page.png`
- `apps/opticv-web/public/images/welcome-tour/step-2-cv-optimization-page.png`
- `apps/opticv-web/public/images/welcome-tour/step-3-analyze.png`
- `apps/opticv-web/public/images/welcome-tour/step-4-export-cv.png`
- `apps/opticv-web/public/images/welcome-tour/step-5-cover-letter.png`
- `apps/opticv-web/public/images/welcome-tour/step-6-interview-prep.png`
- `apps/opticv-web/public/images/welcome-tour/step-7-linked-in-profile.png`

### Modified

- `apps/opticv-web/src/app/core/stores/user-guide.store.ts`
- `apps/opticv-web/src/app/core/stores/user-guide.store.spec.ts`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.ts`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.html`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.css`
- `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.spec.ts`
- `apps/opticv-web/src/app/app.ts`
- `apps/opticv-web/src/app/app.spec.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts`
- `docs/tasks-list.md`

### Not modified (confirmed per plan)

- `apps/opticv-web/public/images/step-1-upload.png`, `step-2-job-description.png`, `step-3-optimization.png`
- `apps/opticv-web/src/app/features/home/home.html`
- `apps/opticv-be/**`

## Components

| Component | Status |
|---|---|
| `WelcomeGuideModal` (rebuilt: intro/tour/finish screens) | Exist |

## Stores

| Store | Status |
|---|---|
| `UserGuideStore` (extended: `mode`, `screen`, `stepIndex`, navigation methods) | Exist |

## Deviations

- **Tour step count is 7, not 6.** Spec and implementation plan specify a 6-step tour (steps 1-6, index 0-5). The implemented `TOUR_STEPS` array contains 7 entries (tags "Step 1" through "Step 7"), `LAST_STEP_INDEX` constant is `6` (not `5`), and a 7th image (`step-7-linked-in-profile.png`) and step-7 caption ("Polish your LinkedIn") were added. Dot pagination renders 7 dots. This is reflected consistently across `user-guide.store.ts`, `welcome-guide-modal.ts`, `welcome-guide-modal.html`, and both spec files.
- **Modal width is 700px, not 540px.** Spec Scope/Assumptions and implementation plan §2.3 both specify `[style]="{ width: '540px', maxWidth: '95vw' }"`. The implemented template uses `[style]="{ width: '700px', maxWidth: '95vw' }"`.
- **Step 3 image filename differs from spec's listed source filename.** Spec/plan list the source design asset as `step-3-loaded-cv-optimization-results.png`; the copied/renamed asset in the app is `step-3-analyze.png` (naming pattern otherwise consistent with the plan's "copy and rename" instruction for the other steps, e.g. `step-3-loaded-cv-optimization-results.png` → renamed differently than the plan's listed target name `step-3-loaded-cv-optimization-results.png`).
- **Step tag/title/caption copy differs from spec §Scope verbatim text.** The spec lists exact copy for each step's tag, title, and caption (e.g. Step 1 title "Upload your CV once" — matches; Step 2 title spec says "Point it at a job", implemented title is "Point it at a specific job"; captions across steps 1-6 are reworded/expanded from the spec's listed text, and a 7th step's copy was added that has no corresponding entry in the spec at all).
- **`app.spec.ts` and `top-header.spec.ts` were modified** in addition to the files explicitly listed in the plan's "Files planned" section (plan listed `app.ts` and `top-header.ts` as modified but did not list their spec files; both were updated to match the new `openWelcomeModal(mode)` signature).
- **`docs/tasks-list.md` was modified**, not listed in the plan's "Files planned" section.

## Additional Implementation

None beyond what is captured under Deviations.
