# Specification Review: Task 77 — Save the selected cover letter and the eventual edited version

## Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification is well-grounded in the actual codebase (verified against `cover-letter-editor.ts`, `cv-optimization.ts`, and `datatypes.ts`) and faithfully mirrors the existing summary/bullet persistence patterns referenced in the task. It correctly identifies all files, types, and endpoints needed, with no invented backend/API requirements. However, it contains one significant clarity gap around the "apply once" restore-guard mechanism that is asserted but not concretely specified, plus a few smaller ambiguities that could cause divergent implementations.

---

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **"Apply once" restore guard has no concrete mechanism.** The spec says (Scope, bullet 3): "This restore-preference logic must only apply on the initial application of a given `result()`... Reuse the existing `safeIndex`-based effect structure; do not introduce a second effect that fights the first." However, the *current* `CoverLetterEditor` effect (`cover-letter-editor.ts:51-57`) has no "apply once" semantics today — it unconditionally re-syncs `selectedVariantIndex`/`editorContent` on every change to `result()`. There is no existing guard to "reuse." The spec should either (a) explicitly instruct adding a boolean flag (e.g., `private hasAppliedInitialState = false`, analogous to `userHasInteracted`) inside the single effect, or (b) explain why `result()` is expected to only ever change once in practice (which is true operationally — a `COVER_LETTER` result is set once per load/run per the `Map`-based `results()` signal in `cv-optimization.ts` — but the spec doesn't state this justification). Left as-is, an implementer must infer the mechanism themselves, which risks inconsistent solutions.

2. **`UserSelections` vs. dedicated signals — spec defers the decision without a tiebreaker.** Scope bullet 5 says to add cover-letter selection state "either as new fields on `UserSelections`... or as dedicated component signals... follow whichever existing convention is cleaner at the call site; prefer adding to `UserSelections` for consistency with the summary pattern." This is a soft preference, not a decision. Since `UserSelections` (`datatypes.ts:470-475`) is also consumed by `applySelectionsToCV` (CV-merge logic unrelated to cover letters), adding cover-letter fields there could be seen as scope creep on a type used for a different purpose (building the merged CV, not the cover letter). The spec should decide explicitly rather than leave it to implementation-time judgment, since it affects the shape of `CoverLetterUserState`-adjacent code across the file.

3. **No mention of resetting cover-letter selection state in `retryOptimization()`.** The spec (Scope bullet 5, last line) says to reset `coverLetterResultId` "wherever `summaryRewriteResultId` is reset when starting a fresh optimization run (`runOptimization()` / `resetSelections`)." Looking at the actual code, `summaryRewriteResultId` is reset only in `runOptimization()` (line 644), not in `retryOptimization()` (lines 699-732) — and `retryOptimization` for `PromptType.COVER_LETTER` would regenerate a `COVER_LETTER` result while `coverLetterResultId` still points at the old result. This is actually consistent with current summary/bullet behavior (not reset on individual retry either), so it's not a bug introduced by this task, but the spec doesn't call out this pre-existing edge case at all, and a reviewer/implementer may reasonably wonder whether retry-of-cover-letter-only should reset `coverLetterResultId`. Worth an explicit note that this mirrors existing (arguably imperfect) retry behavior for summary/bullet, so it's intentionally out of scope.

### Unclear or Ambiguous Sections

1. **Section "Behavior", step 2**: "the parent updates its selection state and (debounced 500ms) calls `PATCH /optimizations/:id/user-output`... resolving the `COVER_LETTER` result id first if not yet cached." This matches `persistSummaryState()`'s lookup-on-demand pattern, but the spec doesn't clarify whether the same known race exists here as with summary/bullet: if the user edits before the initial SSE/run flow has actually created the `OptimizationResult` row server-side (e.g., `COVER_LETTER` job hasn't completed yet), `getOptimizationResults` lookup would find nothing and the save would silently no-op (per the existing `if (bulletResult) {...}` pattern with no `else`). This matches existing behavior exactly, so it's not a new gap, but the spec doesn't explicitly carry over this known limitation for reviewer awareness.

2. **`CoverLetterEditor` constructor effect wording**: "if `initialSelectedVariant` matches a variant's `hookType` in `result().variants`, select that variant's index instead of `safeIndex()`" — it's unclear whether this comparison should happen inside the single effect (reading `initialSelectedVariant()` and `initialEditedContent()` as signals inside the effect body, which is the idiomatic Angular approach) or whether these are meant to be read once outside reactive tracking. Given `input()` values are signals, the natural implementation reads them inside the effect, but combined with issue #1 above (the "apply once" guard), there's a subtlety: if `initialSelectedVariant`/`initialEditedContent` inputs are read inside the effect, they'd also need to be excluded from re-triggering the guard when the *user's own* `variantSelected`/`contentEdited` outputs don't change these input signals (parent only rebinds inputs on reload, not on every keystroke) — so this should work correctly, but the spec doesn't spell out this reasoning, leaving it to be discovered during implementation.

### Invented or Unsupported Requirements

None. Every requirement traces back to the task ("save the selected cover letter and the eventual edited version," "reload that information when user opens stored cv optimization") or to the explicitly-referenced existing summary/bullet pattern. The spec correctly scopes out backend/Prisma changes, AI prompt changes, and export logic changes, consistent with the task's minimal framing.

---

## Assumptions Detected

1. **"No backend or Prisma changes are required."** Explicitly stated in the spec's Context section and justified by evidence (existing `userEditedOutput` column, existing PATCH/GET endpoints, existing `COVER_LETTER` prompt type with `@@unique` constraint). Verified correct — not stated in the raw task but reasonably inferred and explicitly called out as an assumption/pattern-match to bugs 75/76.
2. **`result()` (the `CoverLetterResult` input) changes at most once per component lifetime in normal operation**, making the "apply once" guard mostly a defensive correctness requirement rather than a frequently-exercised path. Not explicitly stated in the spec — this is an implicit assumption underlying issue #1 above and should be made explicit.
3. **`UserSelections` is the preferred location for new state fields**, per "prefer adding to `UserSelections` for consistency with the summary pattern." Explicitly stated as a preference in the spec (not hidden), but see Non-Critical Issue #2 — it's a preference, not a firm decision, which itself is an acknowledged-but-unresolved assumption.
4. **Retry-of-single-prompt-type does not need to reset cached result IDs**, mirrored from existing summary/bullet behavior. Not explicitly stated in the spec (see Non-Critical Issue #3) — this is an implicit assumption inherited silently from the existing pattern.
5. **PrimeNG `<p-editor>`'s `(ngModelChange)` handler is the correct place to wire the new `contentEdited` output**, per Scope bullet 3's "The `(ngModelChange)` handler on `<p-editor>`... updates `editorContent` and emits `contentEdited`." Verified against the current template pattern is reasonable given `editorContent` is already bound via `ngModel`-style binding in the existing component, though the review did not read `cover-letter-editor.html` directly to confirm the exact binding syntax currently in use.

---

## Recommendation

- **Proceed as-is**, with the implementer expected to resolve the three Non-Critical Issues via judgment calls consistent with the existing summary/bullet pattern (which is itself well-precedented in the codebase). None of the issues found are blocking or reflect invented/misaligned requirements — they are clarity gaps that an experienced implementer familiar with the referenced `persistSummaryState()`/`loadStoredOptimization()` code can resolve by direct analogy. If stricter unambiguous sign-off is desired before implementation, consider a lightweight revision to explicitly decide the `UserSelections`-vs-dedicated-signals question (issue #2) and state the "apply once" guard mechanism (issue #1) concretely.
