# Spec Review — Task 53: Reset selected summary rewrite

## Summary

- **Overall assessment:** PASS WITH ISSUES
- The spec correctly captures the full intent of the raw task and adds appropriate implementation detail. All requirements trace back to the original task. One non-critical gap exists: the spec does not mention how `applySelectionsToCV()` behaves after reset (it will naturally revert to the original summary, but this is an implicit assumption rather than a stated one). A minor ambiguity exists around whether the `editableText` reset should happen via extending the existing effect or adding a second one — the spec lists both options without committing, which leaves a decision open for the implementer.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **Behavior step 7 — undecided implementation approach:** The spec states "extend the effect (or add a second one)" to reset `editableText` to `''`. This leaves the implementer with two options without guidance on which to prefer. A spec should commit to one approach to avoid ambiguity at implementation time.

2. **`applySelectionsToCV()` not mentioned:** The spec describes CV reversion as an acceptance criterion ("The CV preview reverts to the original summary after reset") but does not explain the mechanism. The actual reversion happens because `applySelectionsToCV()` already falls back to the original summary when both `selectedSummaryAngle` and `customSummaryText` are `null`. This should be noted explicitly as assumed behavior rather than left implicit.

3. **Output naming inconsistency:** The spec uses `angleReset` as the output name (following the `angleSelected` pattern), which is reasonable — but the raw task uses the term "reset button" without naming conventions. This is fine but worth noting as a naming decision.

---

### Unclear or Ambiguous Sections

- **Behavior step 7:** "extend the effect (or add a second one)" — undecided. See Non-Critical Issue #1 above.

---

### Invented or Unsupported Requirements

None. All requirements (Reset button, deselect variant, hide textarea, revert to original) originate directly from the raw task. The placement detail (same row, `ml-auto`) was confirmed by the author during the clarification phase and is not invented.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The Reset button is visible only when a variant is selected (gated by `@if (selectedAngle())`) | Yes — Behavior step 1 |
| 2 | `applySelectionsToCV()` already falls back to the original summary when both selections are `null` | No — implicit, not mentioned |
| 3 | The button placement was confirmed by the PO during clarification (same row, right-aligned) | Yes — Behavior step 2 |
| 4 | No visual "Original selected" state is needed after reset — UI simply returns to unselected state | Yes — Out of scope + confirmed in clarification |
| 5 | `editableText` must be explicitly reset because the existing `effect()` only runs when `selectedVariantText()` is non-null | Yes — Behavior step 7 |
| 6 | No backend changes are required | Yes — Data / API section |

---

## Recommendation

**Proceed as-is**, after optionally patching the two non-critical issues:

1. Commit to one `editableText` reset approach in Behavior step 7 (recommend: extend the existing effect to handle the `null` branch).
2. Add a one-sentence note in Behavior or Data/API confirming that `applySelectionsToCV()` handles the revert automatically when both fields are `null`.
