## Summary

Added default-collapse behavior to the CV optimization results page: once results begin arriving (`pageState()` transitions to `'processing'` or `'completed'`), all sections collapse except ATS Analysis (`RESUME_AUTOPSY`), which stays expanded. This is implemented via a new guarded `effect()` in the `CvOptimization` component constructor, backed by a new `initializedDefaults` signal that is reset at the start of each new live optimization run (`runOptimization()`). Applies identically to live SSE runs and to stored/previously-completed optimizations loaded on navigation. Accompanying unit tests were added to `cv-optimization.spec.ts`.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Add private `initializedDefaults` boolean signal | Implemented | `cv-optimization.ts:256` |
| Add `effect()` that sets `collapsedSections` to all section ids except `RESUME_AUTOPSY` on first `pageState()` transition to `'processing'`/`'completed'` | Implemented | `cv-optimization.ts:450-461` |
| Guard so the effect only fires once until reset | Implemented | Guard check on `initializedDefaults()` at top of effect body |
| Reset `initializedDefaults` to `false` inside `runOptimization()`'s reset block | Implemented | `cv-optimization.ts:710` |
| Same default-collapse behavior applies to stored optimization load (`loadStoredOptimization()`) without separate branching | Implemented | Effect is driven purely by `pageState()`; no stored-mode-specific code added |
| No changes to `handleSectionClick`, sidebar/mobile nav | Implemented | Unchanged |
| No changes to `toggleAllSections`, `isSectionCollapsed`, `onSectionCollapsedChange`, `SectionCard` | Implemented | Unchanged |
| No changes to section ordering, `allSectionIds`, or which sections exist | Implemented | Unchanged |
| No visual/styling changes to `SectionCard` or "Expand All / Collapse All" | Implemented | No template/style changes |
| No persistence of collapse state across reloads/navigation | Implemented | In-memory only, as specified |
| Unit tests: initial state stays uncollapsed | Implemented | `cv-optimization.spec.ts:1649-1654` |
| Unit tests: first transition to processing collapses all but `RESUME_AUTOPSY` | Implemented | `cv-optimization.spec.ts:1656-1671` |
| Unit tests: stored-mode load applies same default | Implemented | `cv-optimization.spec.ts:1673-1688` |
| Unit tests: guard prevents re-fire after manual toggle | Implemented | `cv-optimization.spec.ts:1690-1708` |
| Unit tests: reset on second `runOptimization()` call re-applies default | Implemented | `cv-optimization.spec.ts:1710-1727` |

## Files

### Modified

- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `docs/tasks-list.md`

### Created

- `docs/cv-optimization-ui-ux.md`

## Components

Not applicable — no new components were introduced or planned for this task.

## Stores

Not applicable — no new stores were introduced or planned for this task.

## Deviations

None.

## Additional Implementation

None.
