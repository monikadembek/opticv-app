# Task Specification

## Source

Azure DevOps Task: 103 — Display missing keywords by importance

## Goal

Sort the two "missing keywords" lists in the Keyword Gap section by importance level, so Critical items appear first, then High, Medium, and Low, within both the "likely have" and "genuinely lacks" groups.

## Context

The Keyword Gap feature (`PromptType.KEYWORD_GAP`) already exists end-to-end: the AI extraction, the shared data model, and the results UI are all implemented. Each missing keyword already carries an `importance: 'critical' | 'high' | 'medium' | 'low'` field (`KeywordGapMissingKeyword` in `packages/shared/datatypes/src/lib/datatypes.ts`), produced by the existing `KEYWORD_GAP` prompt — no AI/prompt change is needed.

In `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`, two computed signals already split missing keywords by whether the candidate likely has the skill:

```ts
readonly missingLikelyHas = computed(() =>
  this.result().missingKeywords.filter((k) => k.candidateLikelyHas),
);

readonly missingGenuinelyLacks = computed(() =>
  this.result().missingKeywords.filter((k) => !k.candidateLikelyHas),
);
```

These filter but do not sort. In `keyword-gap.html`, `missingLikelyHas()` and `missingGenuinelyLacks()` are each rendered via `@for (item of ...; track item.keyword)` (lines ~90 and ~241) in whatever order the AI returned them, with an existing color-coded importance badge shown per item. This task adds a sort step so both lists render Critical → High → Medium → Low.

## Scope

### In scope

- Sort `missingLikelyHas` and `missingGenuinelyLacks` by `importance` (critical, high, medium, low) in `keyword-gap.ts`.
- Within the same importance level, preserve the existing relative order from the AI response (stable sort, no secondary sort key).
- Define the importance rank order as a local constant/map inside `keyword-gap.ts` (not exported from `@opticv/datatypes`), since it is only used by this component today.

### Out of scope

- No AI/prompt changes — `importance` is already returned by the `KEYWORD_GAP` prompt.
- No changes to the shared `KeywordGapResult` / `KeywordGapMissingKeyword` types.
- No database or Prisma schema changes — results are stored as JSON (`OptimizationResult.structuredOutput`).
- No new visual grouping/subheadings by importance tier — items remain in a flat list per section (`missingLikelyHas`, `missingGenuinelyLacks`); only their order changes. The existing per-item importance badge continues to convey the level visually.
- No changes to `matchedKeywords`, `underweightedKeywords`, `fabricationWarnings`, or `acronymIssues` ordering.
- No changes to selection, editing, or bullet-position logic (`selectedKeywords`, `keywordEdits`, `keywordBulletPositions`, etc.).

## Behavior

1. Define a local rank map in `keyword-gap.ts`, e.g. `{ critical: 0, high: 1, medium: 2, low: 3 }`, used to compare two `KeywordGapMissingKeyword` items by `importance`.
2. Apply a stable sort using this rank map inside the `missingLikelyHas` computed signal, after the existing `filter`.
3. Apply the same stable sort inside the `missingGenuinelyLacks` computed signal, after the existing `filter`.
4. No template (`keyword-gap.html`) changes are required — the existing `@for` loops iterate the (now sorted) computed signals directly.
5. Sorting is derived state (via `computed()`), so it automatically re-evaluates whenever `result()` changes (e.g. after score recomputation in `recompute-scores.ts`), consistent with existing reactive patterns in this component.

## Edge Cases

- Empty `missingKeywords` array: both computed signals resolve to empty arrays; existing `@if (missingLikelyHas().length > 0)` / `@if (missingGenuinelyLacks().length > 0)` guards already handle hiding empty sections — unaffected by this change.
- All items share the same importance level: stable sort means order is unchanged from the AI response (equivalent to current behavior).
- Any unexpected/unknown `importance` value (should not occur given the AI's constrained output schema, but defensively): items with a value not present in the rank map should sort after all known levels, so a data anomaly doesn't crash the sort or silently jump to the top.

## Data / API

- No changes to `packages/shared/datatypes/src/lib/datatypes.ts`.
- No changes to any DTO, REST endpoint, or Prisma schema.
- No DB migration.
- Only file touched: `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` (and its spec file, `keyword-gap.spec.ts`, for new/updated tests).

## Assumptions

- Sort order requested is Critical → High → Medium → Low, applied independently within both the "likely have" and "genuinely lacks" sections (confirmed by task description).
- No secondary sort key is needed within the same importance tier — original AI response order is preserved via a stable sort (confirmed with user).
- The importance rank order is defined locally in the component rather than as a shared constant, since it is not currently needed elsewhere (confirmed with user).
- No new visual subheadings/dividers per importance tier are added — this is a pure reordering of the existing flat lists (confirmed with user).

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx typecheck opticv-web` passes.
- `npm exec nx lint opticv-web` passes.
- `npm exec nx test opticv-web` passes, including new/updated tests in `keyword-gap.spec.ts` verifying:
  - `missingLikelyHas` returns items ordered Critical → High → Medium → Low.
  - `missingGenuinelyLacks` returns items ordered Critical → High → Medium → Low.
  - Items with equal importance retain their relative input order.
- Manual check: open a CV optimization result with missing keywords spanning multiple importance levels in both the "Likely have" and "Skills to acquire or omit" sections, and confirm each section visually lists Critical items first, then High, Medium, Low.
