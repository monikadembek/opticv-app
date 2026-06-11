# Specification Review

## Task ID: 41-adding-missing-bullets-and-removing-bullets

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec covers all four requirements from the raw task, follows project conventions, and is sufficiently detailed for implementation. Two non-critical issues need attention before implementation begins: a type reference to an undeclared type (`MissingBulletSelectionKey`) and a minor ambiguity in how `onMissingBulletEditStarted` resolves the suggestion text to pre-fill the textarea. No critical blockers exist.

---

### Findings

#### Critical Issues

None.

---

#### Non-Critical Issues

1. **Undeclared type `MissingBulletSelectionKey`** (§ Behavior › 1, § Frontend component changes › `bullet-rewriter.ts`)
   - The spec states "Checking adds a `MissingBulletSelectionKey` to `selectedMissingBullets`" and lists it as an output type, but this type is never defined anywhere — neither in `datatypes.ts` nor in the spec's Data/API section.
   - The `BulletUserState` extension uses an inline anonymous type `Array<{ forPosition: string; suggestedBullet: string; editedText?: string }>` instead.
   - Recommendation: either declare `MissingBulletSelectionKey` as a named type in `datatypes.ts` (analogous to `BulletSelectionKey`), or consistently use the anonymous inline type throughout and remove the `MissingBulletSelectionKey` reference.

2. **`onMissingBulletEditStarted` pre-fill logic underspecified** (§ Frontend component changes › `cv-optimization.ts`)
   - The handler is described as "set `activeBulletEditKey` + load existing edit or suggestion text into `editedBulletText`", but the spec doesn't clarify how the handler retrieves `suggestion.suggestedBullet` from just the composite key string (which is the only value emitted by `missingBulletEditStarted`).
   - The parent component receives only the key string; it needs to reverse-parse `forPosition` and `suggestedBullet` from `"${forPosition}|${suggestedBullet}"` or look it up in the `bulletUpgradeResult` to get the original text for pre-filling. This lookup/parsing step is not specified.
   - Recommendation: specify that the handler splits the composite key on `|` to extract `forPosition` and `suggestedBullet`, then looks up the suggestion in `bulletUpgradeResult.missingBulletSuggestions` to retrieve `suggestedBullet` as the fallback text.

3. **`missingBulletEdits` declared as `Signal<Map<string, string>>`** (§ Frontend component changes › `cv-optimization.ts`)
   - The existing `bulletEdits` signal in `cv-optimization.ts` is already a `Signal<Map<string, string>>`. Mutating a `Map` inside a signal does not trigger Angular's signal change detection — the same pattern from Task 40 may or may not work correctly depending on how it is updated. The spec does not address how the map signal is updated (e.g. whether a new `Map` instance must be created on each update).
   - This is a non-critical note as it mirrors the existing Task 40 pattern. Recommend confirming the existing approach is consistent and documenting it if it uses a specific update strategy.

4. **`getMissingDisplayText` signature incomplete** (§ Frontend component changes › `bullet-rewriter.ts`)
   - The method signature listed is `getMissingDisplayText(forPosition, suggestedBullet): string`, but it needs access to `missingBulletEdits` to resolve edited text. Since `missingBulletEdits` is an input signal on the component, this is implicit — the spec could make it explicit by noting the method reads from the `missingBulletEdits()` input signal.

---

#### Unclear or Ambiguous Sections

1. **§ Behavior › 3 — Border color for `recommend_cut`**: "highlights red / amber" — both colors are mentioned as alternatives (`e.g. border-red-400`). The implementation should pick one. Minor, but it leaves a visual decision open.

2. **§ Frontend component changes › `bullet-rewriter.ts` — `missingBulletEditCancelled` output**: The spec lists `missingBulletEditCancelled: OutputEmitterRef<void>` as a new output, but later states "reuse `onBulletEditCancelled()` logic" in `cv-optimization.ts`. It is unclear whether a separate output is needed or whether the existing `editCancelled` output is reused. The spec should clarify whether this is a new output or whether `editCancelled` is shared between rewrite and missing-bullet editors.

---

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | `forPosition + suggestedBullet` composite key (pipe-delimited) is unique per missing suggestion | Yes — §Assumptions |
| 2 | `recommend_cut` removal is opt-in (bullet kept by default) | Yes — §Assumptions |
| 3 | Missing bullets appended to the **end** of the position's bullet list | Yes — §Assumptions |
| 4 | `forPosition` matches CV experience via `"${title} at ${company}"` concatenation | Yes — §Assumptions |
| 5 | Missing bullet edits use a separate map (`missingBulletEdits`), not reusing `bulletEdits` | Yes — §Assumptions |
| 6 | One editor open at a time across both rewrite and missing-bullet editors (shared `activeBulletEditKey`) | Yes — §Edge Cases |
| 7 | No backend changes required — existing `PATCH` endpoint and `userEditedOutput` field absorb new state | Yes — §Data/API |
| 8 | New `BulletUserState` fields are optional for backward compatibility | Yes — §Behavior › 4 |
| 9 | Deselecting a missing bullet retains its edit in `missingBulletEdits` | Yes — §Edge Cases |
| 10 | `missingBulletEditStarted` emits composite key string (not a structured object) | Implicit — stated in outputs table but pre-fill resolution not fully specified (see Non-Critical Issue #2) |

---

### Recommendation

**Revise specification** — address Non-Critical Issues #1 (undeclared type) and #2 (pre-fill resolution logic) before implementation. Issues #3 and #4 are minor clarifications that can be resolved during implementation. Ambiguity in §Unclear #2 (shared vs. separate cancel output) should also be resolved to avoid an implementation decision being made without product intent.
