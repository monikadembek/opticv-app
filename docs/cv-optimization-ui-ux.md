The core problem with a 15-20 screen results page is almost always the same: everything is rendered flat and expanded at once, with no hierarchy of "what matters most" vs "supporting detail." The fix is rarely one trick — it's usually a combination of:

1. Progressive disclosure — collapse most sections by default (PrimeNG Accordion/Panel), show only a summary line + score/status per section, expand on click
2. A top-level summary/dashboard — an overall score, key strengths/issues at a glance, before any detail — so users get value in the first screen even if they never scroll further
3. Tabs or a stepper for categories — if results group into say "Content," "Formatting," "Keywords," "ATS Compatibility," etc., tabs let users jump to what they care about instead of scrolling through all of it
4. Priority-first ordering — surface high-impact issues before minor nitpicks, so scrolling further is optional, not mandatory
5. Sticky navigation / jump links — a mini table-of-contents pinned to the side so users can skip to sections instead of scrolling linearly

# CV Optimization Results Page — UI/UX Improvement Plan

## Context

The CV optimization results page (`cv-optimization.html`/`.ts`) renders 7-9 result sections (ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Profile, plus Job Posting) stacked vertically. Once an optimization run completes, the page is reportedly 15-20 screens of scrolling — a real risk that users won't read through it or won't discover value further down (e.g. Cover Letter, Interview Prep, LinkedIn Profile near the bottom).

Investigation shows the infrastructure to solve this already exists and is simply unused: every section is wrapped in a collapsible `app-section-card` component with a working `collapsed` model, there's a sidebar (`app-optim-sidebar`) with jump-to-section nav, live ATS/keyword score rings, per-section status icons, and an existing "Expand All / Collapse All" button. The actual bug: `collapsedSections` in `cv-optimization.ts` (line 255) initializes to an **empty Set**, so every section renders fully expanded by default — the entire wall of content is what a user sees immediately on page load, before they've had a chance to decide what to look at.

The fix is therefore behavioral/UX, not a rebuild: change default state, and add a lightweight summary so users get the headline result without scrolling.

## v1 Plan (in progress / sent to Ultraplan for refinement)

### 1. Default to "first section open, rest collapsed"

In `cv-optimization.ts`, `collapsedSections` (line 255) currently starts empty. Add one-time initialization (via `effect()` guarded by an `initializedDefaults` flag, so it only fires once per optimization run and doesn't fight the user's manual toggles) that sets it to `new Set(allSectionIds().filter(id => id !== PromptType.RESUME_AUTOPSY))` once results start arriving (`pageState()` becomes `processing`/`completed`).

**Why ATS Analysis stays open:** it's first in section order, already has a live projected score, and is the section users conceptually check first ("did this work / how good is my CV now"). Collapsing the other 6 removes ~90% of the initial wall of text — Keyword Gap alone is a 510-line template.

Nav-driven expansion needs no fix: `handleSectionClick` (cv-optimization.ts ~538) already un-collapses a section before scrolling to it, so sidebar/mobile-tab clicks will correctly open a collapsed section.

### 2. Add a compact Scorecard strip above the section list

In `cv-optimization.html`, insert a new block inside `.optim-content`, after the heading/Expand-All row and before the first `app-section-card`, guarded by `@if (pageState() === 'processing' || pageState() === 'completed')`:

- The two SVG score rings (ATS score, keyword score) — same visual as already exists in `optim-sidebar.html`, reusing the same computed values (`atsScore()`, `liveKeywordScore()`) already available on the page component.
- A compact one-line-per-section status list (icon + label + completed/processing/error), using `sectionStatuses()`/`processingSet()` (already computed for the sidebar). Clicking a line calls the existing `handleSectionClick(id)`.

This gives users the full-page headline (both scores + which sections are done/pending/failed) in the first viewport, with zero new visual language and zero new dependencies — it's the same iconography and rings already in the sidebar, just surfaced in the main content too.

**Small supporting refactor:** promote `strokeColor`/`scoreDash`/`scoreCircumference` out of `OptimSidebar` into a shared pure-function util (e.g. `score-ring.util.ts`) so both the sidebar and the new Scorecard use the same math instead of duplicating it.

### Explicitly out of scope (v1)

- No new PrimeNG modules (Accordion, Stepper) — the hand-rolled `section-card` + Set-based collapse state already does the job; swapping it would mean re-plumbing help dialogs, status badges, and scroll anchors for no real benefit.
- No changes to the 7 content child components (ats-score, keyword-gap, summary-rewrite, bullet-rewriter, cover-letter-editor, interview-prep, linkedin-updates). Their internal density is a separate concern from page-level navigation/overwhelm.
- No changes to `section-card.ts`/`.html` — its `collapsed` model is already correctly wired; behavior is fully controlled by the parent's state.

### Files to change

- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` — default-collapse init logic
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` — Scorecard block
- `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts` — extract ring math to shared util
- New: `apps/opticv-web/src/app/features/cv-optimization/score-ring.util.ts` (or similar shared location)

### Verification

1. `npm exec nx serve opticv-web`, run/open a completed CV optimization result.
2. Confirm on load: ATS Analysis section is open, all other sections (Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Profile) are collapsed — page should be roughly 2-3 screens instead of 15-20.
3. Confirm the Scorecard strip shows both score rings and a status line per section, matching what's shown in the sidebar.
4. Click a status line in the Scorecard and a nav item in the sidebar/mobile tabs — confirm the target section auto-expands and the page scrolls to it.
5. Click "Expand All" — confirm all sections open as before (existing behavior, should be unaffected).
6. Manually collapse/expand a section, confirm the one-time default-init effect doesn't override manual toggles on next reactive update (e.g. when a processing section transitions to completed).
7. Run `npm exec nx test opticv-web` for the cv-optimization feature to confirm no regressions in existing collapse/expand or scoring logic tests.

## v2 Idea (parked — not yet decided)

**Single-section view with Prev/Next navigation**, wizard-style: show only the section currently selected in the sidebar, with Prev/Next buttons that step through the sidebar's ordered section list, instead of an always-scrollable page with all sections stacked (collapsed or not).

### Why it's tempting

- Even less on screen at once than "collapse all but one" — true 1-2 screens per step instead of a long collapsed-header list.
- Forces a clear reading order and gives a strong sense of progress (e.g. "3 of 8"), which directly addresses the fear that users won't make it through all the content.
- Natural fit with the existing sidebar, which already has an ordered section list with active-section highlighting — Prev/Next is just "select adjacent sidebar item."

### Why it's a bigger decision than v1

- It's a real mode switch, not an incremental tweak: `.optim-content` would need to show/hide sections conditionally rather than just toggling `collapsed` on `section-card`.
- Users lose the ability to eyeball or compare multiple sections at once (e.g. glance at Keyword Gap while skimming Bullet Upgrades) — the current scrollable-with-collapse model still allows that; a wizard model doesn't.
- Needs new decisions: what happens to scroll position on Prev/Next; whether the Scorecard overview becomes its own "step 0"; how this interacts with the export footer (currently users can scroll to review everything before exporting — a single-section view changes that review flow).

### Open question

Decide whether v2 should **replace** the v1 "collapse all but ATS" approach, be offered as an alternate **view-mode toggle** (accordion view vs. step-through view), or stay a parked idea while v1 ships first and real usage/feedback informs whether the extra mode-switch complexity is worth it.

## v3 Idea (parked — not yet decided)

**Split result sections into two groups by content type**, shown as separate tabs (or eventually separate routes), instead of one long page mixing both:

- **Group A — "CV Analysis"**: ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades. These relate directly to editing/improving the resume itself.
- **Group B — "Additional Materials"**: Cover Letter, Interview Prep, LinkedIn Profile. Supplementary job-application materials, not resume edits.

This is a different lever than v1/v2: those two change _disclosure_ (collapsed vs. expanded, all-at-once vs. step-through) within a single flat list of sections. v3 changes the _information architec
ture_ — it splits the page along a real conceptual seam (editing your CV vs. prepping other materials), which are genuinely different tasks/mindsets for the user. It's compatible with v1 or v2 being
applied independently within each group/tab.

### Why it's promising

- The grouping isn't invented — it already exists in the code. `NAV_GROUPS` in `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts:10-65` already groups sideb
  ar nav items into "Job Posting", "Resume Analysis" (= Group A), and "Additional Materials" (= Group B), so the sidebar needs no restructuring of its data — just needs to render/link per active tab.
- The export footer (PDF/DOCX export) has **zero dependency on Group B**. `canExportCv` (`cv-optimization.ts:368-373`) and `mergedCv()` (`cv-optimization.ts:298-314`) are computed purely from CV str
  uctured data, summary rewrite, bullet upgrades, and keyword gap — all Group A. `coverLetterResult`, `interviewPrepResult`, and `linkedInResult` never enter that computation. So the export footer can
  live only on the "CV Analysis" tab with no functional change.
- Splitting the page in two immediately halves the worst-case scroll length regardless of which v1/v2 disclosure pattern is layered on top.

### Two implementation shapes, very different cost

**(a) Tabs on one route (no URL change)** — recommended pragmatic path.

- Sidebar: presentationally free, since `NAV_GROUPS` already matches the split.
- Export footer: trivial, render it only under the "CV Analysis" tab.
- Data loading: no change needed. All data currently loads imperatively in `ngOnIni86`, a `forkJoin` of job application + optimization results + structured data, populat
  ing ~15 signals directly on the component). Since both tabs are views within the same still-mounted component, this stays exactly as-is.
- Navigation: `handleSectionClick`/`sectionClicked` (`cv-optimization.ts:538-549`) currently just scrolls to `#section-{id}`, assuming every section is a DOM sibling on one page — this needs a moder
  ate, self-contained change: if the clicked item's group differs from the active taboll (likely needs a short delay/`afterNextRender` for the new tab's DOM to exist). The
  `IntersectionObserver`-based scrollspy (`setupScrollspy`, `cv-optimization.ts:488-514`) also needs to be scoped to only observe the active tab's rendered sections, not sections hidden in the inacti
  ve tab.
- **Overall verdict: moderate** — the only real work is in `handleSectionClick` + `lse is free or trivial.

**(b) Separate routes** (e.g. `/cv-optimization/:id/analysis`, `/cv-optimization/:id/materials`).

- Same sidebar/export-footer benefits as (a).
- Data loading: **significant**. `apps/opticv-web/src/app/app.routes.ts:34-49` currently defines `cv-optimization/:jobApplicationId` as a single flat route (no children, no resolver) that loads the
  one `CvOptimization` component. There is no shared service/store — all ~15 signals of state live directly on that component instance. Splitting into two sibling routes means either lifting all of th
  is into a route-provided shared store/service (a real refactor, e.g. extracting a ` route components can read the same loaded data, or accepting duplicate loads per rout
  e (wasteful, worse UX on tab switch).
- **Overall verdict: significant** — genuine architectural work before any UI benefit is realized.

### Recommendation

Pursue **(a) tabs on one route** first: it captures the full information-architectuper view, natural conceptual grouping, already-matching sidebar data) for moderate cos
t confined to two functions. Treat **(b) separate routes** as a possible later follow-up only if there's a concrete reason to want shareable/bookmarkable URLs per tab or independent route-level code
-splitting — not needed to solve the "page is too long" problem itself.

### Open question

Decide whether v3 (tab split) should be pursued instead of, before, or alongside v1d) — e.g. v3 could ship first to halve the problem structurally, with v1's collapse-by
-default and Scorecard applied independently within each tab afterward.
