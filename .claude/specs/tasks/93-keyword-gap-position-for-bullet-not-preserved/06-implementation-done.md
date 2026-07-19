# Implementation Done — Task 93: Keywords gap section position not preserved

## Summary

The "which experience entry" reference for a keyword's `experience_bullet` placement was changed from a derived label string (`forPosition: "${company} - ${title}"`) to a stable index (`experienceIndex: number`), across the shared type, the `keyword-gap` component's I/O, `cv-optimization.ts`'s state/persist/restore logic, and `apply-selections.ts`'s CV-merge logic. Test coverage was added/updated in `cv-optimization.spec.ts`, `keyword-gap.spec.ts`, and `apply-selections.spec.ts` for the new index-based path, including stored-mode restoration and out-of-bounds/missing-entry handling.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Change keyword's experience-entry reference from label string to `experienceIndex: number` | Implemented | |
| Update `keywordBulletPositions` signal, save, and restore logic in `cv-optimization.ts` to store/restore by index | Implemented | |
| Update `keyword-gap.ts` / `keyword-gap.html` so `<select>` binds to index while displaying label as option text | Implemented | |
| Update `apply-selections.ts` to resolve target experience entry by index; remove dead `atFormat` matching branch from this path | Implemented | `atFormat` branch in the separate `selectedMissingBullets` loop was left untouched (explicitly out of scope) |
| Update shared type `BulletUserState.keywordBulletPositions` to carry `experienceIndex` | Implemented | |
| Add test coverage for stored-mode restoration of `experience_bullet` keyword placement in `cv-optimization.spec.ts` | Implemented | |
| Add component-level test coverage in `keyword-gap.spec.ts` for the position picker | Implemented | |
| `onKeywordBulletPositionSelected` emits `{ keyword, experienceIndex }` instead of `{ keyword, forPosition }` | Implemented | |
| Stored index rehydrated directly on `loadStoredOptimization`, no string matching | Implemented | |
| Out-of-bounds stored index falls back to unselected in `<select>`; `apply-selections.ts` skips insertion | Implemented | |
| `getKeywordPosition` returns `number \| null` | Implemented | |
| "Pick a position" warning uses explicit `=== null` check (avoids falsy-zero bug for index 0) | Implemented | |
| No breaking changes to `summary`/`skills`/`title`/`multiple` placement types | Implemented | |
| No backend/Prisma/DTO changes | Implemented | none made |

## Files

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`
- `docs/tasks-list.md`

### Created

None.

## Components

| Component | Status |
| --- | --- |
| `KeywordGap` (`keyword-gap.ts` / `keyword-gap.html`) | Exist |

## Stores

Not applicable — no NgRx Signals store was introduced or modified for this task; state lives in component signals on `CvOptimization` (`keywordBulletPositions`, `experiencePositionLabels`).

## Deviations

None. Implementation matches `04-implementation-plan.md` step-by-step.

## Additional Implementation

None.
