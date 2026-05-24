# Spec Review — Task 31: Select and Apply Optimizations, Export Optimized CV

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification covers all four major requirements from the raw task (summary rewrite selection/editing, keyword gap selection, bullet upgrades selection, and PDF/DOCX export) and is well-structured overall. However, there are two non-critical issues around the Keyword Gap interaction design that introduce ambiguity, one unclear section in the Bullet Rewriter PATCH serialization strategy, and one implicit assumption (A2) that could become a blocking gap during implementation if unresolved. No invented requirements or critical structural problems were found.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **Keyword Gap — "selecting a suggested reformulation" vs. checkbox UX (Behavior §2)**
   The raw task answer says "selecting a suggested reformulation" (Q2a answer), but the spec describes the interaction as checking checkboxes next to missing keywords that then populate a textarea. The raw task states there _is no_ AI-generated reformulation suggestion per keyword (Q2c: "there is not"), which the spec acknowledges. However the phrase "suggested reformulation selection" still appears in the **Scope** section ("Keyword Gap panel: suggested reformulation selection + inline textarea editing"). This creates a terminology inconsistency — the Scope heading implies something exists that the Behavior section says does not. The Scope line should be reworded to match actual behavior (keyword selection + textarea).

2. **Keyword Gap — textarea always visible vs. conditional (Behavior §2, step 1)**
   The spec says the textarea "appears (or is shown inline)" when one or more keywords are selected, but leaves both options open. This is ambiguous for implementation — should the textarea be hidden until at least one keyword is checked, or always visible? A definitive choice should be stated.

3. **Bullet Rewriter — PATCH serialization overwrites on every Apply (Behavior §3, step 3)**
   The spec says each per-bullet Apply call sends _all_ currently-applied bullets as a JSON array in a single `userEditedOutput` string. This means each Apply rewrites the entire `BULLET_UPGRADE` userEditedOutput. This design decision is correct but should explicitly note: (a) the first bullet applied will write a single-element array, and (b) if the PATCH fails mid-session (some bullets already saved, new one not), the DB state and session state diverge. The edge cases section does not cover this partial-failure scenario.

4. **Keyword Gap — "Apply keywords" button visibility (Behavior §2)**
   The spec doesn't specify when the "Apply keywords" button is shown — is it always visible, or only after at least one keyword is selected? This should be stated.

5. **Export button placement (Behavior §4)**
   The spec says buttons are on the "main `CvOptimization` page" but doesn't specify the exact position in the page layout (top, bottom, near the panels, in a sticky footer, etc.). This is minor but worth clarifying to avoid ambiguity during UI implementation.

---

### Unclear or Ambiguous Sections

- **Behavior §2 (Keyword Gap), step 1:** The textarea visibility condition ("appears (or is shown inline)") is not resolved — two options are left open. Implementation requires a single decision.
- **Behavior §3 (Bullet Rewriter), step 3:** The phrase "aggregates all currently-applied bullets (from session state) plus this one" does not describe what happens if this bullet was _previously_ applied (is it replaced or duplicated?). It should clarify that re-applying the same bullet index replaces the existing entry in the array.
- **Data / API — Session state:** The spec says "New signal or computed values in `CvOptimization` component (or a new `OptimizationEditsStore`)". This `or` leaves the architectural choice unresolved for implementation.

---

### Invented or Unsupported Requirements

None.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| A1 | Keywords joined one-per-line in textarea; split by newline + comma on export | Yes (Assumptions §A1) |
| A2 | `OptimizationResult.id` is accessible from SSE event or needs a separate GET | Yes (Assumptions §A2) |
| A3 | `CvStructuredData` is already in the component; fallback GET if not | Yes (Assumptions §A3) |
| A4 | `docx` and `jsPDF` libraries are already installed | Yes (Assumptions §A4) |
| A5 | `recommend_cut` bullets export as original text, no removal UI in this task | Yes (Assumptions §A5) |
| Implicit | The `OptimizationResult.id` is distinct from `PromptType` — i.e., the PATCH endpoint requires the DB record UUID, not the enum string | Not stated; implied by API section but never made explicit |
| Implicit | `CvStructuredData` experience items are positionally stable (positionIndex/bulletIndex used as keys) and won't reorder between optimization load and export | Not stated anywhere |
| Implicit | The "Apply selected version" button is only enabled when a variant is selected (not shown when no variant is chosen) | Not stated; no disabled/hidden state described for this button |

---

## Recommendation

**Revise specification** — resolve the three ambiguous UX decisions (keyword textarea visibility condition, bullet re-apply replacement vs. duplication behavior, `AppliedEdits` state location) and add the missing edge case for partial bullet PATCH failure. The implicit assumption about positional stability of `CvStructuredData.experience` items should be made explicit in the Assumptions section, as it is load-bearing for the bullet merge logic.
