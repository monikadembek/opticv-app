# Code Review: 115 — Retry button when results are missing

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation correctly covers the spec's backend and frontend behavior (three-way branch in `retryFailedJob`, `'not-started'` status derivation, retryable-set inclusion, badge, empty-state, and Retry button for all 7 sections), with matching test coverage for the required cases. However, the diff introduces a visual bug in the badge CSS (`border-radius: 50%` on a flex row containing an icon + text label, applied to `.status-processing`, `.status-error`, and the new `.status-not-started`) and edits two existing status classes outside this task's scope, and the "visually different" requirement for the not-started badge (spec item 3) is not met since it reuses the exact same color/background as the processing badge.

## Conventions Violations

### Critical (must fix before merge)

1. **`section-card.css:89-122`** — `border-radius: 50%` combined with `background: var(--color-amber-50)` and `padding: 2px` was added to `.status-processing`, `.status-error`, and copied into the new `.status-not-started`. A `border-radius: 50%` circle clip on a `display: flex` row containing an icon plus a text label (e.g. "Not started", "Error", "Processing") will visually clip/cut off the label text instead of rendering a rounded badge — this looks like a copy-paste mistake from `.status-completed` (which is a short pill and doesn't have this problem). Confirmed via `git diff 8650cec HEAD` that these three properties were newly added to `.status-processing` and `.status-error` in this task's commits — they did not exist before. This needs to be fixed (e.g. `border-radius: 9999px` like `.status-completed`, or remove the radius/background entirely) before merge, and should not have touched `.status-processing`/`.status-error` at all per "Minimal footprint" (rule in `.claude/context/rules.md`).

### Non-Critical (should fix)

1. **`section-card.css:112-122`** — `.status-not-started` uses `color: var(--warning)` and `background: var(--color-amber-50)` — the identical color pair used by `.status-processing`. Spec item 3 ("Section card rendering for `'not-started'`") requires the badge be "visually different from the existing `'error'` state (different icon/copy)" and the implementation plan (Step 5.2) explicitly called for "a neutral color token (e.g. `var(--text-muted)`)" rather than reusing an existing status color. As implemented, the not-started badge is visually indistinguishable in color from the processing badge (only the icon/text differ), which weakens the intended distinct "not started" visual state.
2. **`cv-optimization.html`** (7 occurrences, e.g. lines 157-161, 238-241) — the empty-state message uses ad hoc Tailwind utility classes (`text-sm text-(--text-muted) m-0`) repeated 7 times inline, rather than the shared `.section-empty-state` CSS class called for in Implementation Plan Step 6.3 ("Add a shared `.section-empty-state` CSS rule"). Not a functional defect, but a deviation from the plan and a duplicated-style code smell (see Code Smells below).

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Backend: `retryFailedJob` accepts missing row, creates `PENDING` row, enqueues, no quota check | Covered | `optimization.service.ts:209-279`; matches spec exactly |
| Backend: existing `FAILED` row still resets/enqueues unchanged | Covered | same method, `existing.status === 'FAILED'` branch preserved |
| Backend: existing row in other status still throws `BadRequestException` | Covered | tests for `COMPLETED`, `PENDING`, `PROCESSING` all present |
| Frontend: `SectionStatus` gains `'not-started'` | Covered | `models.ts:1-7` |
| Frontend: `sectionStatus()` returns `'not-started'` for missing result (not processing) | Covered | `cv-optimization.ts:648-657`; test at spec.ts:985-989 |
| Frontend: `retryablePromptTypes` includes not-started sections | Covered | `cv-optimization.ts:421-431` (`status === undefined` branch); tests at spec.ts:937-952 |
| Frontend: `'Not started'` badge in `SectionCard` header | Partial | Rendered (`section-card.html:60-64`), but not visually distinct from `'processing'` badge — see Non-Critical #1 |
| Frontend: empty-state message + Retry button in section body | Covered | present in all 7 sections in `cv-optimization.html`, but not using shared CSS class per plan — see Non-Critical #2 |
| Frontend: Retry button behavior identical to existing (reuses `retryOptimization()`) | Covered | unchanged `retryOptimization()` used for both error/not-started |
| Applies uniformly to all 7 `PromptType` sections | Covered | ATS Analysis, Keywords, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Updates all have matching blocks |
| Out of scope: no "Retry all missing" page action added | Covered | none added |
| Out of scope: no quota consumption changes | Covered | `checkAndConsume` not called in either `retryFailedJob` branch; tests assert this |
| Accessibility: `ariaLabel` per section Retry button | Covered | e.g. `ariaLabel="Retry ATS Analysis"` etc., one per section |

## Plan Deviations

1. Implementation Plan Step 5.2 specified using an existing neutral color token for `.status-not-started` and explicitly said "do not invent a new CSS variable" — implementation reused `var(--warning)`/`var(--color-amber-50)` (the processing-badge colors) instead, and also modified `.status-processing`/`.status-error` (not mentioned as in-scope for this step).
2. Implementation Plan Step 6.3 called for a shared `.section-empty-state` CSS rule in the page stylesheet; the actual empty-state markup uses inline Tailwind utility classes duplicated across all 7 sections instead of a shared class.

## Null Safety Issues

None.

## Code Smells

1. **Duplication** — the empty-state paragraph markup (`@if (sectionStatus(PromptType.X) === 'not-started') { <p class="text-sm text-(--text-muted) m-0">This section hasn't been processed yet.</p> }`) is repeated verbatim 7 times across `cv-optimization.html` (lines ~157-161, 238-241, 292-296, 354-358, 405-408, 448-452, 491-495). This mirrors the pre-existing repetition pattern already present in the file for the Retry button blocks, so it's consistent with the surrounding code's style, but it does compound an existing duplication smell rather than reducing it (a shared class per the plan would have at least deduplicated the styling, if not the markup).

## Recommendation

- Fix critical issues before merge (the `border-radius: 50%` badge CSS bug affecting `.status-processing`, `.status-error`, and `.status-not-started`).
