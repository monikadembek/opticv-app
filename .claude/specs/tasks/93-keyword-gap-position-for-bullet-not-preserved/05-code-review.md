# Code Review — Task 93: Keywords gap section position not preserved

## Summary

- Overall result: **PASS**
- The implementation faithfully replaces label-based `forPosition` matching with index-based `experienceIndex` matching across the shared type, `keyword-gap` component I/O, `cv-optimization.ts` state/persist/restore logic, and `apply-selections.ts`, exactly as specified in the plan. All new/updated tests for the affected files pass; `nx typecheck opticv-web` succeeds (a pre-existing, unrelated `tsconfig` `emitDeclarationOnly` config error blocks the Nx typecheck target itself, not this change). 10 unrelated test failures exist in `supabase.spec.ts` and `app.spec.ts` (auth/session and routing), with no relation to this task's files.

## Conventions Violations

### Critical (must fix before merge)

None.

### Non-Critical (should fix)

None.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `BulletUserState.keywordBulletPositions` uses `experienceIndex: number` instead of `forPosition: string` | Covered | `datatypes.ts:568` |
| `keyword-gap.ts` input/output/`getKeywordPosition` use index-based contract | Covered | `keyword-gap.ts:28,35-38,88-95` |
| `keyword-gap.html` `<select>` binds option value to index, displays label text | Covered | both duplicated blocks updated (lines ~182-197, ~320-335) |
| "Pick a position" warning uses explicit `=== null` check (falsy-zero fix) | Covered | `keyword-gap.html:199` uses `getKeywordPosition(item.keyword) === null` |
| `cv-optimization.ts` signal type, event handler, restore, persist all use `Map<string, number>` / `experienceIndex` | Covered | signal at line 250, handler at 909-923, restore at 643-647, persist at 1074-1080 |
| `apply-selections.ts` resolves target experience entry by index with bounds check; `atFormat` branch removed from this path | Covered | lines 101-110; unrelated `selectedMissingBullets` `atFormat` branch correctly left untouched (out of scope) |
| Test coverage: `cv-optimization.spec.ts` restore/persist | Covered | describe blocks at 2457, 2502 |
| Test coverage: `keyword-gap.spec.ts` position picker | Covered | describe block at 200 |
| Test coverage: `apply-selections.spec.ts` index-based insertion incl. out-of-bounds/negative/missing | Covered | describe block at 307 |
| No breaking changes to `summary`/`skills`/`title`/`multiple` placements | Covered | untouched code paths, existing tests for these still pass |

## Plan Deviations

None. Implementation matches the plan step-by-step, including the exact bounds-check logic and the falsy-zero fix called out in Step 3.

## Null Safety Issues

None found. `getKeywordPosition` uses `?? null` (keyword-gap.ts:89); `apply-selections.ts` explicitly guards `undefined` and out-of-bounds indices before array access (lines 103-105); `loadStoredOptimization`'s restore loop (cv-optimization.ts:643-647) will store `undefined` into the map if legacy `forPosition`-shaped JSON is encountered (no `experienceIndex` field), but this degrades safely: `getKeywordPosition` converts it to `null` via `??`, and `apply-selections.ts`'s `=== undefined` check skips insertion — matching the spec's accepted degraded-fallback behavior for pre-fix stored data.

## Code Smells

None. Changes are minimal and localized to the specified files; no duplication introduced; the two near-identical `<select>` blocks in `keyword-gap.html` are pre-existing duplication (likely-has vs genuinely-lacks sections) unrelated to this task's scope.

## Recommendation

- **Merge as-is**
