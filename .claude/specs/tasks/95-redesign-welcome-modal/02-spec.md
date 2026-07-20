# Task Specification

## Source

Azure DevOps Task: 95 — UX/UI: Redesign welcome modal

## Goal

Replace the current 3-step, single-screen "Welcome to OptiCV" modal with the **"1c — Intro → tour → finish"** design from `.claude/specs/tasks/95-redesign-welcome-modal/ui/Welcome-modal-design/Welcome Modal.dc.html`.

The redesigned modal has three internal screens:

1. **Intro** — brand intro with 3 value-prop bullets, "Take the 2-minute tour" and "Skip — I'll explore on my own".
2. **Tour** — a 6-step carousel (one screenshot per step, tag/title/caption, dot pagination, Back/Next).
3. **Finish** — "You're ready to go" confirmation with "Get started" and "Replay the tour".

The modal must behave differently depending on how it was opened:

- **First login** (auto-triggered): full journey — Intro → Tour(1-6) → Finish.
- **Help icon in top menu** (`TopHeader.openHelp()`): **Tour only** — steps 1-6, no Intro screen and no Finish screen.

## Context

- Frontend component: `apps/opticv-web/src/app/shared/welcome-guide-modal/` (`welcome-guide-modal.ts` / `.html` / `.css`), currently a `p-dialog` with a static 3-step grid.
- State: `apps/opticv-web/src/app/core/stores/user-guide.store.ts` (`UserGuideStore`, NgRx Signals), currently tracks only `isWelcomeModalOpen` and `seenByEmail` (persisted to `localStorage` under `opticv_has_seen_welcome`).
- Trigger points:
  - `apps/opticv-web/src/app/app.ts` — on first login (`isLoggedIn && !wasLoggedIn`), if `!userGuideStore.hasSeenWelcome(email)`, calls `userGuideStore.openWelcomeModal()`.
  - `apps/opticv-web/src/app/layout/top-header/top-header.ts` — `openHelp()` calls `userGuideStore.openWelcomeModal()` when the help icon is clicked (already wired from Task 94; must now be extended to open tour-only mode).
- Design reference images used for the 6 tour steps live in `.claude/specs/tasks/95-redesign-welcome-modal/ui/Welcome-modal-design/uploads/`:
  - `step-1-upload-cv-page.png`
  - `step-2-cv-optimization-page.png`
  - `step-3-loaded-cv-optimization-results.png`
  - `step-4-cover-letter.png`
  - `step-5-interview-prep.png`
  - `step-6-linked-in-profile.png`
- Existing app images (`apps/opticv-web/public/images/step-1-upload.png`, `step-2-job-description.png`, `step-3-optimization.png`) are the old 3-step set and will be superseded by the new 6-image set.

## Scope

### In scope

- Rebuild `WelcomeGuideModal` component to render three internal screens (Intro / Tour / Finish) matching design 1c, using PrimeNG (`p-dialog` or equivalent) and Tailwind utility classes per project conventions.
- Extend `UserGuideStore` to support:
  - An **open mode**: `'full'` (intro → tour → finish) vs `'tour'` (tour only, steps 1-6).
  - Current tour step index (0-5).
  - Current internal screen (`intro` / `tour` / `finish`), derived/controlled per mode.
  - Navigation methods: start tour from intro, next, back, skip, finish, replay.
- Wire `app.ts` first-login trigger to open in **full** mode.
- Wire `top-header.ts` `openHelp()` to open in **tour** mode, always starting at step 1, regardless of `hasSeenWelcome`.
- Add the 6 step screenshots as static assets served by the Angular app (copy into `apps/opticv-web/public/images/`), with step content (tag, title, caption) per the design's `steps()` data:
  1. Step 1 · Upload — "Upload your CV once" — "Drop in a PDF or DOCX. We keep it on hand to tailor for every job you chase."
  2. Step 2 · Optimize — "Point it at a job" — "Paste the job description and company details — OptiCV tailors everything to that exact posting."
  3. Step 3 · Analyze — "See your ATS score" — "An instant ATS score, keyword gaps and a rewrite that lifts a 70 to a 90."
  4. Step 4 · Apply — "Get a matching cover letter" — "A tailored cover letter in your voice — edit it inline, then export to PDF or DOCX."
  5. Step 5 · Apply — "Walk in interview-ready" — "Likely questions, model answers and traps to avoid — matched to the role."
  6. Step 6 · Apply — "Polish your LinkedIn" — "Headline variants and profile rewrites so recruiters find you too."
- Intro screen copy/content per design: heading "Welcome to OptiCV", subtext, 3 bullet rows (Upload your CV once / Tailored to any job / Land more interviews), primary button "Take the 2-minute tour", link button "Skip — I'll explore on my own".
- Finish screen copy per design: heading "You're ready to go", subtext, primary button "Get started", link button "Replay the tour" (full-mode only — see Behavior).
- Dot pagination (6 dots) with click-to-jump, matching design's active/inactive styling.
- Update/replace existing unit tests (`welcome-guide-modal.spec.ts`, `user-guide.store.spec.ts`) to cover new behavior.
- Update `posthog.capture` event usage to remain functional with the new flows (keep `welcome_modal_shown`, `welcome_modal_dismissed`, `help_icon_clicked`; no new analytics requirements beyond what already exists unless naturally needed for new interactions — see Assumptions).

### Out of scope

- Designs 1a ("Guided carousel") and 1b ("Sidebar stepper") — not implemented, reference-only per the task's explicit instruction to implement version 1c.
- Changes to `TopHeader` help button icon/placement/styling itself (already implemented in Task 94).
- Backend changes — this is a frontend-only, client-state feature.
- Any change to how/when `hasSeenWelcome` / `markWelcomeSeen` persistence key or storage mechanism works (still `localStorage`, keyed by email).
- Mobile-specific/responsive redesign beyond what Tailwind + PrimeNG defaults provide (design reference is desktop-only, 540px modal width).

## Behavior

### Opening in full mode (first login)

1. `app.ts` detects a fresh login and the user has not seen the welcome guide → calls a store method to open in `'full'` mode, resetting to the `intro` screen.
2. **Intro screen** shows. User can:
   - Click **"Take the 2-minute tour"** → advances to `tour` screen at step 1 (index 0).
   - Click **"Skip — I'll explore on my own"** → modal closes immediately (dialog closes; per clarification, this also marks welcome as seen).
3. **Tour screen** (steps 1-6): shows step image, tag, title, caption, and 6 dots for direct navigation.
   - **Back** button: disabled/hidden on step 1 in tour screen when reached via intro-skip is not applicable — in full mode, Back on step 1 returns to the **Intro** screen (per original design behavior for the full journey; the constraint about hiding Back only applies to tour-only/help-icon mode — see below).
   - **Next** button: advances step by step; label reads "Next" until the last step (step 6), where it reads **"Finish"**.
   - Clicking a dot jumps directly to that step.
   - Close (×) button in the tour header closes the modal immediately (per clarification: this also marks welcome as seen since it's a dismissal during the first-login flow).
4. On step 6, clicking **"Finish"** → advances to the **Finish** screen.
5. **Finish screen**: user can click **"Get started"** → modal closes (marks welcome as seen), or **"Replay the tour"** → returns to `intro` screen, restarting the full journey (state resets to step 1 if tour is re-entered).
6. Any path that closes the modal during the first-login (full-mode) journey — Skip, ×, or Get started — calls `markWelcomeSeen(email)` so the modal does not auto-open on subsequent logins.

### Opening in tour mode (help icon)

1. `top-header.ts` `openHelp()` calls a store method to open in `'tour'` mode, always resetting to step 1 (index 0), regardless of `hasSeenWelcome`.
2. Only the **Tour screen** is shown — no Intro screen, no Finish screen.
3. **Back** button: hidden (not just disabled) on step 1, since there is no Intro screen to go back to in this mode. From step 2 onward, Back behaves normally (goes to previous step).
4. **Next** button: advances step by step; on step 6 the button reads **"Finish"** (reusing the same label logic — see Assumptions) and clicking it **closes the modal** directly (no Finish screen).
5. The × close button closes the modal at any step.
6. Closing the modal in tour mode (via ×, or via "Finish" on step 6) does **not** call `markWelcomeSeen` — it only closes the modal (`closeWelcomeModal()`), since tour mode is not the first-login flow and `hasSeenWelcome` is unrelated to it.
7. Dot pagination works the same as in full mode.

### Shared

- Dots: 6 dots, active dot wider (per design), inactive dots gray; clicking any dot jumps to that step in whichever mode is active.
- Step content (image, tag, title, caption) is identical between full and tour modes — same 6-step data source.
- Modal open/closed state continues to be driven by `UserGuideStore` signals, consumed by `WelcomeGuideModal`.

## Edge Cases

- **User closes modal (×) mid-tour in full mode**: treated as a dismissal — marks welcome as seen (per clarification), same as Skip.
- **User closes modal (×) mid-tour in tour mode (help icon)**: does not touch `seenByEmail`/`hasSeenWelcome` at all.
- **User replays tour from Finish screen**, then closes without finishing again: still counts as seen (already marked seen when they first reached/left the Finish screen area per step 6 above — no double-marking issue since `markWelcomeSeen` is idempotent).
- **User has no email available** (edge case already handled in existing `onHide()`): falls back to `closeWelcomeModal()` without marking seen — preserve this fallback behavior for any full-mode close path.
- **Rapid open via help icon while already open**: reopening resets to step 1 tour screen (no special guard needed beyond existing dialog visibility toggling).
- **Back button on step 1 in full mode**: returns to Intro screen (not disabled), since Intro exists in that mode.
- **Back button on step 1 in tour mode**: hidden entirely (per clarification), since there's no Intro screen to return to.

## Data / API

- No backend/API changes.
- No new Prisma models or DB changes.
- Client-side only:
  - `UserGuideStore` state additions: open mode (`'full' | 'tour'`), current screen (`'intro' | 'tour' | 'finish'`), current step index (`number`, 0-5).
  - `localStorage` key `opticv_has_seen_welcome` — unchanged format (`Record<email, true>`).
  - New static image assets copied into `apps/opticv-web/public/images/` (6 files, from the design's `uploads/` folder).

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx test opticv-web` passes, including updated/new unit tests for `WelcomeGuideModal` and `UserGuideStore` covering:
  - Full-mode journey: intro → tour (next/back/dots) → finish → close (marks seen).
  - Full-mode skip from intro closes and marks seen.
  - Full-mode close (×) mid-tour closes and marks seen.
  - Tour-mode (help icon) opens directly to step 1 tour screen, no intro/finish.
  - Tour-mode Back hidden on step 1, visible/functional from step 2+.
  - Tour-mode Finish (step 6) closes modal without marking seen.
  - Tour-mode close (×) does not mark seen.
- AXE/WCAG AA checks pass: dialog focus management, dot buttons have accessible labels (e.g. `aria-label="Go to step N"`), close button has `aria-label`/`title`, sufficient color contrast for text/buttons per design tokens.
- No breaking changes to `TopHeader` or `app.ts` public APIs beyond the store method signatures needed to pass the open mode.
- Old 3-step images (`step-1-upload.png`, `step-2-job-description.png`, `step-3-optimization.png`) removed only if confirmed unused elsewhere (grep codebase before deleting).

## Assumptions

- "Finish" label on the tour's last-step Next button applies in both full and tour modes (per the design's shared `cNextLabel` logic), even though tour mode has no separate Finish screen — clicking it in tour mode closes the modal directly instead of transitioning to a Finish screen.
- Design's intro/tour/finish copy, icons (`pi-upload`, `pi-bolt`, `pi-briefcase`, `pi-check`), and layout proportions (540px modal width, image area ~240px height) are implemented as shown; no copy changes were requested.
- Existing PostHog events (`welcome_modal_shown`, `welcome_modal_dismissed`, `help_icon_clicked`) are preserved as-is; no new events are required by the task, though the assistant/developer may add step-navigation analytics later if desired (not required for this task).
- The `sc-if` / `sc-for` / `DCLogic` constructs in the design HTML are design-tool-specific templating (not Angular) — they describe conditional rendering and list iteration intent only, translated to Angular `@if`/`@for` and component state in the real implementation.
