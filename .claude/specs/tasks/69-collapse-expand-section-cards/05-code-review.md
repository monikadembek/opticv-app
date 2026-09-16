# Code Review: Task 69 — Collapse/Expand Section Cards

## Summary

- Overall result: **PASS WITH ISSUES**
- The core per-card collapse/expand implementation (`SectionCard`, sidebar/mobile-tab force-expand-on-navigate) matches the spec and plan closely, with good accessibility (`aria-expanded`, `aria-label`, `hidden` attribute, focus-visible styles) and solid test coverage. However, the second commit adds a page-level "Collapse All / Expand All" button that is **explicitly listed as out of scope** in both the spec (`02-spec.md` §Out of scope: "A page-level 'collapse all' / 'expand all' control (not requested)") and the implementation plan's Non-Goals. `docs/tasks-list.md` was also edited within this task's commits to retroactively add that requirement to the task description, which reads as scope being backfilled into the docs rather than the implementation following an approved spec.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

1. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html:44-56` — The "Expand All / Collapse All" `p-button` and its supporting logic (`toggleAllSections()`, `allSectionsCollapsed`, `allSectionIds` in `cv-optimization.ts:380-390,479-485`) implement a feature explicitly marked out of scope in `02-spec.md` ("A page-level 'collapse all' / 'expand all' control (not requested)") and in `04-implementation-plan.md`'s "Explicit Non-Goals" section. Per the code-review workflow rules, this is reported as a plan/spec deviation rather than rewritten — flagging for a scope decision (accept as an approved addition, or revert to match the frozen spec).

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Toggle affordance (chevron) in `SectionCard` header | Covered | `section-card.html:20-33` |
| Local collapsed signal, default expanded | Covered | `section-card.ts:22` (`model<boolean>(false)`) |
| Toggle collapses/expands body, preserves content (no destroy/recreate) | Covered | `section-card.html:35-39` uses `[style.display]` + `[attr.hidden]`, not structural `@if` — matches the plan's corrected approach |
| Parent can force-expand a collapsed card | Covered | `[(collapsed)]`-style two-way binding via `model()`; `cv-optimization.ts:465-477` |
| `handleSectionClick` expands collapsed card before scrolling | Covered | `cv-optimization.ts:487-498` |
| Keyboard/screen-reader accessible toggle (`aria-expanded`, accessible name) | Covered | `section-card.html:23-24`; verified in `section-card.spec.ts:96-133` |
| Status badge visible regardless of collapsed state | Covered | Badges are siblings of the collapsible body, in `.section-card__header` (`section-card.html:9-19`), unaffected by body's `hidden`/`display` |
| Applied uniformly to all 8 `app-section-card` instances | Covered | `cv-optimization.html` — Job Posting (82-93), ATS Analysis (115), Keyword Gap (144), Summary Rewrite (184), Bullet Upgrades (216), Cover Letter (260), Interview Prep (286), LinkedIn Profile (312) all wired with `[collapsed]`/`(collapsedChange)` |
| Scrollspy unaffected by collapse (element stays in DOM) | Covered | `setupScrollspy()` unchanged; body hidden via `display`/`hidden` attr, `[data-section]` element (the card root) remains observed |
| No persistence across reloads | Covered | `collapsedSections` is a plain in-memory signal, reset on component re-init |
| No auto-collapse by status | Covered | No status-based logic added to collapse state |
| No refactor to PrimeNG panel/accordion | Covered | Existing custom HTML/CSS structure retained |
| Page-level collapse all / expand all control | **Out of scope, but implemented** | `cv-optimization.html:44-56`, `cv-optimization.ts:388-390,479-485` — see Plan Deviations |

## Plan Deviations

1. **Page-level "Collapse All / Expand All" button added despite being an explicit non-goal.** Spec (`02-spec.md`, "Out of scope") and plan (`04-implementation-plan.md`, "Explicit Non-Goals") both state this control is not requested / not to be implemented. Commit `ce3b4fd` ("Task 69: Implement page level collapse all / expand all functionality") adds `allSectionIds`, `allSectionsCollapsed`, `toggleAllSections()` in `cv-optimization.ts`, wires a new `p-button` in `cv-optimization.html:44-56`, and adds a matching test suite in `cv-optimization.spec.ts`.
2. **`docs/tasks-list.md` amended within this task's commit range** to add "add a page-level 'collapse all' / 'expand all' button..." as a bullet under Task 69's description, and the status was changed from `todo` to `in progress`. Since `02-spec.md` and `04-implementation-plan.md` were not updated to reflect this scope change, the spec/plan and the actual implementation are now inconsistent artifacts for this task.
3. **CSS class rename not in plan:** `.optim-heading-wrap` renamed to `.optim-heading-actions` with `justify-content: space-between` replaced by `gap: var(--space-3, 12px)` (`cv-optimization.css:39-41`). This is a direct consequence of adding the second button next to "New Optimization" and isn't itself a functional problem, but it's further evidence of the undocumented scope addition rather than a plan step.

## Null Safety Issues

None. `SectionStatus` is `undefined`-safe via existing `@if (status() === ...)` checks (unchanged); new code (`collapsed`, `allSectionIds`, `collapsedSections`) does not introduce new nullable access paths.

## Code Smells

None significant. `allSectionsCollapsed` (`cv-optimization.ts:388-390`) and `toggleAllSections()` (`cv-optimization.ts:479-485`) are small, single-purpose, and follow the existing signal-based patterns (`update`/`set`, no `mutate`) — the issue with this code is scope, not quality.

## Recommendation

- **Fix critical issues before merge** — no code defects block merging, but the page-level collapse-all/expand-all addition should go through an explicit scope decision (update `02-spec.md`/`04-implementation-plan.md` to reflect the approved addition, or split it out of this task) before merge, since it directly contradicts the frozen spec and plan for Task 69.
