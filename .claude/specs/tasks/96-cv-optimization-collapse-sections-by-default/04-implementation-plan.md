# Implementation Plan: 96-cv-optimization-collapse-sections-by-default

## Source

- Specification: `.claude/specs/tasks/96-cv-optimization-collapse-sections-by-default/02-spec.md`
- Specification review: `.claude/specs/tasks/96-cv-optimization-collapse-sections-by-default/03-spec-review.md` (PASS)

## Scope of This Plan

Single file change, plus its accompanying unit test file. No other files in the
repo are touched.

- Modify: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- Modify: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

---

## Step 1 — Add the `initializedDefaults` signal

**File:** `cv-optimization.ts`

Add a new private boolean signal next to the existing `collapsedSections`
signal declaration (around line 255), initialized to `false`.

- Name: `initializedDefaults`
- Type: `signal<boolean>(false)`
- Visibility: `private readonly` (internal guard flag, not read by the
  template or any other consumer per spec Scope).

Placement rationale: keep it adjacent to `collapsedSections` since the two
are logically paired (one guards writes to the other).

---

## Step 2 — Add the default-collapse `effect()` in the constructor

**File:** `cv-optimization.ts`, inside the existing `constructor()` (currently
lines 423–448).

Add a new `effect()` block. Order relative to the three existing effects in
the constructor does not matter functionally (each effect tracks its own
independent signal reads), so append it as the fourth effect for minimal
diff/no reordering of existing code.

Logic (must match spec Behavior section exactly, no deviation):

1. Read `pageState()`.
2. If `this.initializedDefaults()` is `true`, return (no-op).
3. If `pageState()` is `'initial'`, return (no-op).
4. Otherwise (`'processing'` or `'completed'`):
   - Compute `new Set(this.allSectionIds().filter((id) => id !== PromptType.RESUME_AUTOPSY))`.
   - Call `this.collapsedSections.set(...)` with that new Set.
   - Call `this.initializedDefaults.set(true)`.

Notes:

- `allSectionIds()` must be read from inside the effect body (not hoisted
  outside/cached), per spec Behavior step 2 and the spec review's noted
  assumption — this is intentional: it becomes a tracked dependency of the
  effect, but since the guard flag is set synchronously within the same
  effect execution, there is no re-entrancy or duplicate-write window (spec
  Edge Cases, item 5).
- Do not read/write `initializedDefaults` before checking `pageState()` in a
  way that changes evaluation order from the 3 branches above — follow the
  guard-first ordering so the effect body is a plain sequential guard clause,
  matching spec Behavior step 2 sub-bullets literally.
- No new imports are required: `PromptType` is already imported (line 39),
  `effect` is already imported (line 7).

---

## Step 3 — Reset `initializedDefaults` in `runOptimization()`

**File:** `cv-optimization.ts`, inside `runOptimization()` (currently lines
693–760).

Add `this.initializedDefaults.set(false);` to the existing block of
run-scoped resets at the top of the method (the block currently spanning
lines 694–716, e.g. alongside `this.results.set(new Map())`,
`this.isProcessing.set(new Map())`, etc.).

Placement: anywhere within that existing contiguous reset block is
acceptable; group it with the other simple `.set(...)` reset calls for
readability, before `this.jobApplicationId.set(jobApplication.id)` (line 717)
since that line is what will cause `pageState()` to transition and
re-trigger the effect.

Do **not** add a reset call anywhere else (e.g. `loadStoredOptimization()`)
per spec Scope — stored-mode reuses the same guard because a component
instance only loads one stored optimization per navigation.

---

## Step 4 — No changes required elsewhere

Per spec Scope/Out of scope, explicitly verify (no edits needed) that the
following remain untouched:

- `handleSectionClick` (lines 538–549)
- `toggleAllSections` (lines 530–536)
- `isSectionCollapsed` / `onSectionCollapsedChange` (lines 516–528)
- `allSectionIds` computed (lines 408–417)
- `loadStoredOptimization()` (lines 562–691) — no direct edit; it drives
  `pageState()` indirectly via `jobApplicationId`/`isProcessingAny`, which is
  sufficient for the new effect to fire.
- `SectionCard`, `OptimSidebar`, `MobileTabs` components — no interface
  changes.

---

## Step 5 — Unit tests

**File:** `cv-optimization.spec.ts`

Add a new `describe('default-collapse effect', ...)` block (place it near
the existing `describe('collapsedSections / isSectionCollapsed /
onSectionCollapsedChange', ...)` block at line 1612, or immediately after
it, to keep collapse-related test groups colocated).

Required test cases (per spec Acceptance):

1. **Live run — initial state stays uncollapsed while `pageState` is
   `'initial'`.**
   Assert `collapsedSections()` remains an empty `Set` before
   `jobApplicationId` is set.

2. **Live run — first transition to `'processing'` collapses all sections
   except `RESUME_AUTOPSY`.**
   Drive the component into `'processing'` (e.g. via the same mechanism
   `runOptimization`/existing `pageState` tests at line 1526 use — set
   `jobApplicationId` and mark a prompt as processing), then assert:
   - `collapsedSections()` contains every id from `allSectionIds()` except
     `PromptType.RESUME_AUTOPSY`.
   - `collapsedSections()` does NOT contain `PromptType.RESUME_AUTOPSY`.

3. **Stored-mode load — same default applies.**
   Use the existing `loadStoredOptimization` test setup pattern (see
   `describe('loadStoredOptimization (ngOnInit with jobApplicationId)', ...)`
   at line 1144) and assert the same collapsed-set shape once loading
   completes and `pageState()` is `'completed'`.

4. **Guard prevents re-fire after manual toggle.**
   After the initial default-collapse fires, manually call
   `onSectionCollapsedChange` (or `toggleAllSections`) to change
   `collapsedSections`, then trigger another `pageState()`-affecting signal
   change (e.g. toggle `isProcessing` for an unrelated prompt) and assert
   `collapsedSections()` still reflects the user's manual change, not a
   reapplied default.

5. **Reset on second `runOptimization()` call.**
   After the first run's default has applied and the user has manually
   changed `collapsedSections`, call `runOptimization()` again with new
   `JobSubmittedData`, drive `pageState()` back to `'processing'`, and assert
   the default collapse (all except `RESUME_AUTOPSY`) is re-applied,
   overriding the prior manual state.

Testing mechanics:

- Follow existing patterns already in the file for triggering change
  detection after signal writes (`fixture.detectChanges()`) so effects flush,
  consistent with how the existing `pageState` describe block (line 1526)
  and `runOptimization` describe blocks (lines 617, 1460) are structured.
- No new mocks/providers are required — all dependencies needed are already
  stubbed in the file's existing `TestBed.configureTestingModule` setup
  (line 193).
- Do not modify any existing test in the file; only add the new
  `describe` block and its `it` cases.

---

## Step 6 — Verification Commands

Run in this order after implementation:

```bash
npm exec nx test opticv-web
npm exec nx lint opticv-web
npm exec nx typecheck opticv-web
```

All three must pass with no new failures, per spec Acceptance (DEV).

---

## Out of Scope (confirmed, do not implement)

- Any visual/styling changes to `SectionCard` or "Expand All / Collapse All".
- Persisting collapse state across reloads/navigation.
- Any change to section ordering or which sections exist in `allSectionIds`.
- Any change to `OptimSidebar` or `MobileTabs`.

---

## Files Touched Summary

- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` (modified)
