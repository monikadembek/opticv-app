# Task Specification

## Source

Azure DevOps Task: 96 — CV Optimization Results Page — UI/UX Improvement (collapse sections by default)

## Goal

On the CV optimization results page, default all result sections to collapsed except the first one (ATS Analysis / Resume Autopsy) once results start arriving, instead of rendering every section fully expanded on load. This applies to both freshly-run optimizations and previously-stored optimizations opened for viewing.

## Context

`apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` — `CvOptimization` component. Each result section is rendered inside a collapsible `SectionCard` component, controlled by `collapsedSections: Signal<ReadonlySet<string>>` (line 255). `collapsedSections` currently initializes to an empty `Set`, so every section renders expanded regardless of how results were obtained (live SSE run via `runOptimization()`, or a stored optimization loaded via `loadStoredOptimization()`).

Relevant existing signals/computed:

- `pageState` (`computed`, line 320): `'initial' | 'processing' | 'completed'`, derived from `jobApplicationId()` and `isProcessingAny()`.
- `allSectionIds` (`computed`, line 408): ordered list of all section ids for the current run, including `'JOB_POSTING'` when a job application/posting exists.
- `isSectionCollapsed`, `onSectionCollapsedChange`, `toggleAllSections`, `handleSectionClick` (lines 516–549): existing collapse/expand mechanics. `handleSectionClick` already un-collapses a section before scrolling to it — no change needed there.
- `runOptimization()` (line 693): resets all run-scoped signals (`results`, `isProcessing`, `selections`, etc.) at the start of a new live optimization run.

## Scope

### In scope

- Add a new private/internal boolean signal `initializedDefaults` to `CvOptimization`.
- Add a new `effect()` in the constructor that, once per "run" (live or stored), sets `collapsedSections` to `new Set(allSectionIds().filter(id => id !== PromptType.RESUME_AUTOPSY))` the first time `pageState()` becomes `'processing'` or `'completed'`, guarded so it only fires once until reset.
- Reset `initializedDefaults` to `false` inside `runOptimization()`'s existing reset block, so starting a new live optimization from the same component instance re-applies the default collapse behavior.
- Apply the same default-collapse behavior when a stored optimization is loaded (`loadStoredOptimization()` / `isStoredMode`), since `pageState()` also becomes `'processing'`/`'completed'` in that path — no separate branching needed if the effect is driven purely by `pageState()` + the guard flag.

### Out of scope

- Any changes to `handleSectionClick`, sidebar navigation, or mobile tab navigation — these already correctly expand a collapsed section before scrolling.
- Any changes to `toggleAllSections`, `isSectionCollapsed`, `onSectionCollapsedChange`, or the `SectionCard` component itself.
- Any changes to section ordering, `allSectionIds`, or which sections exist.
- Any visual/styling changes to `SectionCard` or the "Expand All / Collapse All" button.
- Persisting collapse state across page reloads/navigation (not requested; current behavior is in-memory only).

## Behavior

1. Component initializes; `collapsedSections` starts as an empty `Set` (unchanged) and `initializedDefaults` starts as `false`.
2. A new `effect()` runs on every change to `pageState()` (and reads the `initializedDefaults` guard):
   - If `initializedDefaults()` is already `true`, do nothing.
   - If `pageState()` is `'initial'`, do nothing (no results yet, nothing to collapse).
   - If `pageState()` is `'processing'` or `'completed'`:
     - Compute `new Set(allSectionIds().filter(id => id !== PromptType.RESUME_AUTOPSY))`.
     - Set `collapsedSections` to this new Set.
     - Set `initializedDefaults` to `true` so this effect body doesn't run again until reset.
3. This applies identically whether `pageState()` transitions to `'processing'`/`'completed'` via a live SSE run (`runOptimization()`) or via loading a stored optimization (`loadStoredOptimization()`), since both paths drive `jobApplicationId` and `isProcessingAny()`, which `pageState()` derives from.
4. Because the effect is guarded by `initializedDefaults`, any subsequent manual collapse/expand toggles by the user (via `onSectionCollapsedChange`, `toggleAllSections`, or `handleSectionClick`) are never overwritten by this effect — it only ever sets defaults once per guard-cycle.
5. `runOptimization()` (start of a new live run) additionally sets `initializedDefaults` back to `false`, alongside its existing resets of `results`, `isProcessing`, `selections`, etc. This means: if a user runs a second optimization without navigating away from the page, the new run's sections again default to "first open, rest collapsed" once its results start arriving.
6. ATS Analysis / Resume Autopsy (`PromptType.RESUME_AUTOPSY`) is always excluded from the collapsed set by this initialization, i.e. it starts expanded. All other sections present in `allSectionIds()` at the time the effect fires (including `'JOB_POSTING'` if present) start collapsed.
7. Nav-driven expansion (sidebar links, mobile tabs) is unaffected — `handleSectionClick` already un-collapses the target section before scrolling, independent of this initialization logic.

## Edge Cases

- **Section only appears later:** `allSectionIds()` is read at the moment the effect fires (first `processing`/`completed` transition). If `'JOB_POSTING'` or another section becomes available only after that point, it is not retroactively added to `collapsedSections` — it will render using its default (uncollapsed, since it's absent from the Set) unless the user or another mechanism collapses it. This matches current `Set`-based membership semantics (absence = not collapsed) and requires no special handling.
- **`pageState()` returns to `'initial'`:** e.g. if `jobApplicationId` is cleared. The effect does nothing in this branch; `collapsedSections` is left as-is (not reset to empty) unless `runOptimization()` or another explicit reset runs. This matches the fact that `runOptimization()` is the only place that currently clears run-scoped state.
- **User manually expands/collapses before `initializedDefaults` guard fires:** Not possible in practice since sections aren't interactive/visible until `pageState()` leaves `'initial'`, which is exactly when the guard fires.
- **Stored optimization with only `RESUME_AUTOPSY` completed (partial results):** `allSectionIds()` still lists all `ActivePrompts` regardless of which have results yet (per existing `allSectionIds` computed) — sections without results simply show their pending/processing/error state while collapsed, same as any other collapsed section today.
- **Multiple effect re-runs before guard flips:** Since `initializedDefaults` is set synchronously within the same effect execution that computes the new `collapsedSections`, there is no window for a duplicate write.

## Data / API

No backend, API, or database changes. Purely frontend component-state logic in `cv-optimization.ts`.

- No new inputs/outputs on `SectionCard`, `OptimSidebar`, or `MobileTabs`.
- No changes to `@opticv/datatypes`.

## Acceptance (DEV)

- On a fresh optimization run, once the first SSE result arrives (`pageState()` → `'processing'`), all sections except ATS Analysis render collapsed; ATS Analysis renders expanded.
- On opening a stored/previously-completed optimization, the same default collapse state applies on load.
- Manually expanding/collapsing any section (including via "Expand All / Collapse All") after the initial default is applied is never overridden by the effect.
- Clicking a sidebar or mobile-tab nav item for a collapsed section expands it and scrolls to it (existing `handleSectionClick` behavior, unchanged).
- Running a second optimization from the same page instance (without full reload) re-applies the "first open, rest collapsed" default for the new run's results.
- `npm exec nx test opticv-web` passes, including new/updated unit tests covering the default-collapse effect (initial live run, stored-mode load, guard preventing re-fire, reset on second `runOptimization()` call).
- `npm exec nx lint opticv-web` and `npm exec nx typecheck opticv-web` pass.
- No breaking changes to `SectionCard`, `OptimSidebar`, `MobileTabs`, or other consumers of `collapsedSections`/`isSectionCollapsed`.
