Task 97: UX/UI - CV optimization page - split results into 2 groups displayed in separate tabs

Description:

**Split result sections into two groups by content type**, shown as separate tabs, instead of one long page mixing both:

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