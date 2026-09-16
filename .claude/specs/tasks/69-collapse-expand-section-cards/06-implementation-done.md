# Implementation Done: Task 69 — Collapse/Expand Section Cards

## Summary

`SectionCard` gained a per-instance collapse/expand toggle (chevron button in the header) backed by a two-way-bindable `collapsed` model signal, with the body (`ProcessingPlaceholder` or projected content) hidden via `[style.display]` + `[attr.hidden]` rather than structural removal, preserving projected component state across toggles. `cv-optimization.ts`/`cv-optimization.html` wire all 8 `app-section-card` instances to a `collapsedSections` signal tracked per section id, and `handleSectionClick` force-expands a collapsed section before scrolling to it on sidebar/mobile-tab navigation. Additionally, a page-level "Collapse All / Expand All" button was implemented in `cv-optimization.html`/`cv-optimization.ts`.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Collapse/expand toggle affordance (chevron icon, clickable) in `SectionCard` header | Implemented | `section-card.html:20-33` |
| Collapsed/expanded state local to each `SectionCard` instance, default expanded | Implemented | `section-card.ts:22`, `model<boolean>(false)` |
| Clicking toggle collapses/expands body (hides/shows `ng-content`/`ProcessingPlaceholder`) | Implemented | `section-card.html:35-45` |
| Parent can force-expand a collapsed card | Implemented | Two-way `[(collapsed)]` binding via `model()`; `cv-optimization.ts:465-477` |
| `handleSectionClick` expands collapsed card before scrolling | Implemented | `cv-optimization.ts:487-498` |
| Toggle keyboard-operable, focusable `<button>`, `aria-expanded`, accessible name | Implemented | `section-card.html:20-27` |
| Toggle applied uniformly to all 8 `app-section-card` instances (incl. Job Posting) | Implemented | `cv-optimization.html`: Job Posting (82-93), ATS Analysis (115-141), Keyword Gap (144-181), Summary Rewrite (184-213), Bullet Upgrades (216-257), Cover Letter (260-283), Interview Prep (286-309), LinkedIn Profile (312-335) |
| No persistence of collapsed state across reloads/sessions | Implemented | `collapsedSections` is an in-memory signal only, no storage/backend calls |
| No auto-collapse based on `status` | Implemented | No status-based logic added to collapse state |
| No refactor of `SectionCard` to PrimeNG `p-panel`/`p-accordion` | Implemented | Existing custom HTML/CSS structure retained |
| Status badge remains visible regardless of collapsed state | Implemented | Badges are siblings of the body inside `.section-card__header`, unaffected by body's hidden/display |
| Scrollspy unaffected by collapse (element stays in DOM) | Implemented | `setupScrollspy()` unmodified; `[data-section]` element (card root) remains in DOM and observed |
| Page-level "collapse all" / "expand all" control | Not in original spec | See Additional Implementation |

## Files

### Modified

- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.css`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `docs/tasks-list.md`

### Created

None.

## Components

| Component (per plan) | Status |
| --- | --- |
| `SectionCard` (`section-card.ts`) | Exist |
| `CvOptimization` (`cv-optimization.ts`) | Exist |

## Stores

Not applicable — no NgRx Signals store changes were planned or made; state is local component signals.

## Deviations

- `cv-optimization.css`: `.optim-heading-wrap` renamed to `.optim-heading-actions`; `justify-content: space-between` replaced with `gap: var(--space-3, 12px)`. Not listed in the plan's affected-files list (which did not include `cv-optimization.css`).
- `docs/tasks-list.md` was modified within this task's commits: Task 69's status changed from `todo` to `in progress` with a date, and a bullet describing the page-level collapse-all/expand-all control was added to its description.

## Additional Implementation

> Additional implementation not covered by the original documents.

- Page-level "Collapse All / Expand All" button added to `cv-optimization.html:44-56`, next to the "New Optimization" button, with supporting logic in `cv-optimization.ts`: `allSectionIds` (computed, `cv-optimization.ts:380-386`), `allSectionsCollapsed` (computed, `cv-optimization.ts:388-390`), `toggleAllSections()` (`cv-optimization.ts:479-485`). This control and its behavior are listed under "Out of scope" in `02-spec.md` and under "Explicit Non-Goals" in `04-implementation-plan.md`.
- Corresponding test coverage for the above was added in `cv-optimization.spec.ts` (`allSectionsCollapsed / toggleAllSections` describe block).
