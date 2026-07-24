# Code Review — Task 97: CV Optimization Tabs

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation correctly adds a two-tab structure (PrimeNG `Tabs`), scopes Collapse/Expand All, sidebar/mobile-tabs nav filtering, and export-footer visibility to the active tab, matching almost all spec requirements. Build passes; on a clean re-run the full test suite is **1110/1110 passing** (51/51 test files) — the `nx test` task was marked failed only by one unhandled router rejection (`NG04002: Cannot match any routes. URL Segment: 'login'`) surfacing from `app.spec.ts` during teardown, unrelated to `cv-optimization` and not an assertion failure (a separate, noisier run additionally hit `vitest-pool-runner` worker timeouts in two other unrelated spec files — both are test-runner/environment flakiness, not code defects introduced by this task). One visible-copy deviation from the spec ("Resume Analysis" instead of "CV Analysis" as the first tab's label) should be fixed before merge.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html:137` — the first tab's label reads `Resume Analysis`, not `CV Analysis` as specified (see Specification Coverage below). This appears to be a copy-paste from `NAV_GROUPS`'s pre-existing group name (`optim-sidebar.ts:26`) rather than the new tab title defined in the spec.

## Specification Coverage

| Requirement | Status | Note |
| ----------- | ------------------------------ | ---- |
| Tab bar with "CV Analysis" / "Additional Materials" labels, below heading/actions row, above Job Posting | Partial | Tab bar is correctly positioned, but the first tab's visible label is "Resume Analysis" instead of "CV Analysis" (`cv-optimization.html:137`). The `value="cv-analysis"` internal id is correct; only the user-facing label text is wrong. |
| Job Posting always visible regardless of active tab | Covered | Both live (`app-section-card`) and stored (`app-job-info-banner`) variants render before `<p-tabs>`, unaffected by `activeResultsTab`. |
| Only active tab's group sections render below Job Posting | Covered | `<p-tabpanel value="cv-analysis">` / `<p-tabpanel value="additional-materials">` correctly split the 7 `app-section-card` blocks per spec's grouping. |
| Default active tab = "CV Analysis" | Covered | `activeResultsTab = signal<ActiveResultsTab>('cv-analysis')` (`cv-optimization.ts:262`); reset to `'cv-analysis'` in `runOptimization()` (`cv-optimization.ts:772`). |
| Sidebar / mobile-tabs show only Job Posting + active group items | Covered | `OptimSidebar.visibleNavGroups` (`optim-sidebar.ts:92-100`) and `MobileTabs.navItems` (`mobile-tabs.ts:30-38`) both filter `NAV_GROUPS` identically by `activeTab()`. |
| Collapse/Expand All scoped to active tab | Covered | `activeTabSectionIds`, `allSectionsCollapsed`, and `toggleAllSections()` (`cv-optimization.ts:451-459, 594-603`) all key off `activeResultsTab()`; inactive tab's collapse state is preserved in the same `Set`. |
| Per-tab lazy default-expand-first-section | Covered | The constructor effect at `cv-optimization.ts:490-511` runs once per tab (tracked via `initializedTabDefaults`), expanding `RESUME_AUTOPSY` for cv-analysis / `COVER_LETTER` for additional-materials, matching the plan's "Resolved Ambiguities" note on lazy timing. |
| Export footer only visible on "CV Analysis" tab | Covered | `@if (canExportCv() && jobApplicationId() && activeResultsTab() === 'cv-analysis')` (`cv-optimization.html:479-480`). |
| Scrollspy re-scoped on tab switch | Covered | The scrollspy effect (`cv-optimization.ts:462-469`) reads `this.activeResultsTab()` so it re-runs `setupScrollspy()` (which re-queries `[data-section]` from the live DOM) whenever the tab changes. |
| Bullet/keyword in-progress edit cancelled on tab switch | Covered | `onResultsTabChanged()` (`cv-optimization.ts:605-610`) calls `onBulletEditCancelled()` and `onKeywordEditCancelled()` before switching, matching the plan's resolved-ambiguity note that Cover Letter/Summary have no equivalent in-progress signal to cancel. |
| `hasPartialStoredResults` warning stays global (not tab-scoped) | Covered | Rendered unconditionally before `<p-tabs>` (`cv-optimization.html:123-130`). |
| Tab bar keyboard-navigable / ARIA via PrimeNG | Covered | `<p-tabs>/<p-tablist>/<p-tab>/<p-tabpanels>/<p-tabpanel>` used as specified; no manual ARIA attributes added, consistent with the plan's stated approach. |
| Unit tests for tab switching, per-tab collapse scoping, export footer visibility, sidebar/mobile-tabs filtering, scrollspy re-scoping | Covered | Present in `cv-optimization.spec.ts` (`activeResultsTab / onResultsTabChanged`, `export footer visibility`, `default-collapse effect`, `allSectionsCollapsed / toggleAllSections` describe blocks) and in both `optim-sidebar.spec.ts` / `mobile-tabs.spec.ts` (activeTab filtering cases). |
| No route/query-param change, no data-loading change | Covered | `ngOnInit`, `forkJoin`, SSE streaming logic untouched; no new route or query param introduced. |

## Plan Deviations

- The implementation plan itself documents one deviation from the original spec/plan already (custom `results-tabs` component → PrimeNG `Tabs`), and this is fully reflected in the code — no further deviation there.
- Beyond what the plan documents: the plan's own "Files Changed" section (`04-implementation-plan.md:70`) shows the tab label as `CV Analysis` in its `<p-tab>` snippet, but the actual committed HTML uses `Resume Analysis` (`cv-optimization.html:137`). This is a deviation from the plan itself, not just the spec — the plan's snippet and the shipped code disagree on this one string.

## Null Safety Issues

None. All new signals/computeds have appropriate defaults (`activeResultsTab` defaults to `'cv-analysis'`, `initializedTabDefaults` defaults to an empty `Set`), and the new `onResultsTabChanged` guards against non-tab values from PrimeNG's untyped `valueChange` emission before using them.

## Code Smells

None introduced by this task. The filtering logic in `OptimSidebar.visibleNavGroups` and `MobileTabs.navItems` is duplicated (same `g.group === 'Job Posting' || (activeTab() === 'cv-analysis' ? ... : ...)` predicate) across the two components; this mirrors the pre-existing duplication pattern between these two components (they already duplicated `NAV_GROUPS`-driven rendering before this task) and is within the stated "minimal footprint" scope — flagging as an observation only, not a blocking issue.

## Recommendation

- Fix critical issues before merge: correct the tab label text at `cv-optimization.html:137` from `Resume Analysis` to `CV Analysis` to match the spec and the implementation plan's own snippet. This is a one-line, low-risk fix; once applied, the PR is ready to merge.
