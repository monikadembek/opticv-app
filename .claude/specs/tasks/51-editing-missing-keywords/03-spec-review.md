# Spec Review — Task 51: Editing missing keywords

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, thorough, and correctly mirrors the bullet-rewriter reference pattern the task describes. All explicit task requirements are covered. However, two edge case behaviors are contradictory/underspecified (empty-save handling), and one requirement — the "Edited" badge — is added beyond what the raw task states. These are minor issues that should be clarified or acknowledged before implementation begins.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **"Edited" badge not in raw task.**
   The raw task says: "Save - makes call to user-output." It does not mention showing an "Edited" badge. The spec adds this in both Scope and Behavior (step 5) and Acceptance criteria. This is a reasonable inference from the bullet-rewriter reference, but it is an added requirement not stated in the task. Should be confirmed with PO or explicitly marked as an assumption.

2. **Empty-save behavior is contradictory.**
   Edge Cases states: "do not save — keep edit mode open (or show no badge)." The parenthetical "or show no badge" contradicts "keep edit mode open" — these are two distinct behaviors. The implementation should follow one deterministic path. Recommend removing the parenthetical and committing to one: either stay in edit mode (preferred, consistent with "do not save") or close and show nothing.

3. **Hydration source not fully specified.**
   The Data/API section says edits are "hydrated back on load" from the `saveUserOutput` payload, but does not specify which existing service method or lifecycle hook performs this hydration (e.g., `ngOnInit`, an effect reacting to a loaded result signal, etc.). The bullet-rewriter pattern should be the reference, but a pointer to the exact mechanism would remove ambiguity for the implementer.

---

### Unclear or Ambiguous Sections

- **Behavior step 2 — "Hides the Edit button":** It says the Edit button is hidden when in edit mode. But step 1 says the button is "visible at all times when not in edit mode." This implies Edit is hidden during edit mode for *that specific row* only (not all rows). This is the correct interpretation but is worth stating explicitly to avoid confusion.

- **Edge Case — "same text as original":** The spec says no "Edited" badge is shown if saved text equals original, and the Map entry is "removed or not added." The "or" is ambiguous — specify one: if the user edits back to the original and saves, remove the existing entry from the Map.

- **Data/API — `UserSelections` type change:** The spec says `keywordEdits` must be added to "the `UserSelections` / user output state type" but does not name the exact TypeScript type or file that owns this structure. Identifying the actual type (e.g., in `datatypes.ts` or local to `cv-optimization.ts`) would make the change unambiguous.

---

### Invented or Unsupported Requirements

1. **"Edited" badge** — present in the spec (Scope, Behavior step 5, Acceptance) but absent from the raw task. Inferred from the bullet-rewriter reference. Not strictly invented, but goes beyond what was asked.

2. **"Saving unchanged text does not show Edited badge"** — Acceptance criterion not mentioned in the task. Reasonable guard, but technically unsupported by the raw task.

3. **"Only one keyword in edit mode at a time"** — Inferred from the bullet-rewriter pattern; not stated in the raw task. The raw task says "Similar to how it is implemented in Bullet upgrades section," which does imply this constraint, so this is well-grounded but should be listed as an assumption rather than a hard requirement.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | Original keyword string is unique within a result (used as Map key) | Yes |
| 2 | State lives in `cv-optimization.ts`; `keyword-gap` is purely presentational | Yes |
| 3 | Styling/button design matches bullet-rewriter for visual consistency | Yes |
| 4 | "Edited" badge should be shown (inferred from bullet-rewriter) | Implicit — mentioned in Scope/Behavior but not listed as an assumption |
| 5 | One active edit at a time (inferred from bullet-rewriter pattern) | Implicit — mentioned in Scope but not listed as an assumption |
| 6 | Hydration follows the same lifecycle pattern as bullet-rewriter | Implicit — not listed as an assumption |
| 7 | `keywordEdits` is serialized as `Record<string, string>` (Map → plain object) in the API payload | Yes (Data/API section) |

Assumptions 4, 5, and 6 are implicit — they appear in the body but are not listed in the **Assumptions** section. They should be moved there for completeness.

---

## Recommendation

**Revise specification** — minor revisions only:

1. Resolve the empty-save contradictory behavior (pick one path).
2. Move implicit assumptions (badge, single active edit, hydration mechanism) into the Assumptions section.
3. Clarify the "same text" edge case ("removed or not added" → commit to one).
4. Either list the "Edited" badge as an explicit assumption/inference, or confirm it with the PO.
5. Name the exact TypeScript type/file that requires the `keywordEdits` field addition.
