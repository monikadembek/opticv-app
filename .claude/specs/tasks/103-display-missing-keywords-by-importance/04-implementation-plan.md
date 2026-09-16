# Implementation Plan — Task 103: Display missing keywords by importance

## Reference

- Specification: `02-spec.md`
- Specification review: `03-spec-review.md` (PASS)

## Objective

Sort `missingLikelyHas` and `missingGenuinelyLacks` in
`apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`
by `importance` (Critical → High → Medium → Low), using a stable sort that
preserves relative order within the same importance tier. No template or
shared-datatype changes.

## Files

- Modify: `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`
- Modify: `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.spec.ts`
- No changes to: `keyword-gap.html`, `packages/shared/datatypes/src/lib/datatypes.ts`, any other file.

## Steps

### 1. Add a local importance rank map

In `keyword-gap.ts`, add a module-level constant near the existing
`RING_CIRCUMFERENCE` constant:

- Name: `IMPORTANCE_RANK`.
- Type: a readonly record keyed by `KeywordGapMissingKeyword['importance']`
  (i.e. `'critical' | 'high' | 'medium' | 'low'`), value `number`.
- Values: `critical: 0, high: 1, medium: 2, low: 3`.
- Import `KeywordGapMissingKeyword` as a type from `@opticv/datatypes`
  alongside the existing `KeywordGapResult` import (extend the existing
  `import type { ... } from '@opticv/datatypes'` statement).

### 2. Add a local rank lookup helper

Add a small private function (or inline expression, see step 3) that, given
an `importance` value, returns its numeric rank from `IMPORTANCE_RANK`,
falling back to a value greater than any defined rank (e.g. `4`) for any
value not present in the map — this satisfies the spec's "unknown importance
sorts last" edge case without throwing.

### 3. Sort `missingLikelyHas`

Update the existing computed signal to chain a stable sort after the
existing `filter`:

- Copy the filtered array before sorting (`Array.prototype.sort` mutates in
  place; `.filter()` already returns a new array, so sorting its result
  directly is safe and does not mutate `result().missingKeywords`).
- Sort using a comparator that subtracts the rank of the second item's
  `importance` from the rank of the first item's `importance`
  (`rank(a.importance) - rank(b.importance)`).
- `Array.prototype.sort` in modern JS engines (and per spec, ES2019+) is
  guaranteed stable, so no secondary sort key or index tie-breaker is
  needed.

### 4. Sort `missingGenuinelyLacks`

Apply the identical sort logic (same comparator/helper) to this computed
signal, after its existing `filter`.

### 5. Avoid duplication

Since both computed signals need the same sort step, factor the "stable
sort by importance rank" logic into one private helper method or standalone
function used by both computed signals, rather than duplicating the
comparator inline twice. Keep it colocated in `keyword-gap.ts` (not a
separate file, not exported) per the spec's constraint that the rank map
stays local to this component.

### 6. Update `keyword-gap.spec.ts`

Extend the existing test suite (using the existing `MOCK_RESULT` pattern
already in the file) to cover:

- `missingLikelyHas` returns items ordered Critical → High → Medium → Low
  when the mock's `missingKeywords` contains items with
  `candidateLikelyHas: true` spanning multiple importance levels in
  non-sorted input order.
- `missingGenuinelyLacks` returns items ordered Critical → High → Medium →
  Low, same approach for `candidateLikelyHas: false` items.
- Items with equal `importance` retain their relative input order (stable
  sort) — construct a small case with two same-importance items in a known
  order and assert the output order matches input order.
- Reuse/extend `MOCK_RESULT` or add a dedicated local mock/result fixture
  within the spec file if the existing `MOCK_RESULT` ordering doesn't
  naturally exercise all three assertions above; keep changes additive, do
  not restructure existing passing tests.

No new spec file is created; only `keyword-gap.spec.ts` is extended.

## Out of Scope (unchanged, per spec)

- `keyword-gap.html` — no changes.
- `@opticv/datatypes` — no changes.
- `matchedKeywords`, `underweightedKeywords`, `fabricationWarnings`,
  `acronymIssues` — no ordering changes.
- Selection/editing/bullet-position logic — untouched.

## Verification / Acceptance

Run in this order, fixing any failures before proceeding to the next:

1. `npm exec nx test opticv-web` — new/updated tests in `keyword-gap.spec.ts`
   pass, along with all pre-existing tests in the suite.
2. `npm exec nx typecheck opticv-web` — passes (verifies the
   `IMPORTANCE_RANK` record type and comparator are correctly typed against
   `KeywordGapMissingKeyword['importance']`).
3. `npm exec nx lint opticv-web` — passes.
4. `npm exec nx build opticv-web` — passes.
5. Manual check: open a CV optimization result with missing keywords
   spanning multiple importance levels in both the "Likely have" and
   "Skills to acquire or omit" sections; confirm each section visually
   lists Critical items first, then High, Medium, Low.

## Notes for Implementer

- Do not export `IMPORTANCE_RANK` or the sort helper from the component
  file or add it to `@opticv/datatypes` — the spec explicitly scopes this
  as component-local since it is not needed elsewhere today.
- Do not add visual subheadings, dividers, or grouping by tier — this is a
  pure reordering of the existing flat `@for` lists; the template already
  renders the per-item importance badge.
- Do not touch `exactMatchedKeywords`, `semanticMatchedKeywords`, or any
  other computed signal in the file.
