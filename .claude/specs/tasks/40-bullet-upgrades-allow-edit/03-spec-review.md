# Specification Review

Task ID: 40-bullet-upgrades-allow-edit

Reviewer: Claude Code (automated)

---

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, technically grounded, and faithfully covers the core requirement from the raw task. The inline editing flow, persistence strategy, load/restore path, and export integration are all clearly described. However, several items either exceed what was asked or carry hidden assumptions that are not explicitly listed, and one section contains a minor ambiguity about error handling on the PATCH call that could block implementation.

---

## Findings

### Critical Issues

**1. PATCH error handling not specified**

Section "Persisting to the backend" and "Selection state persistence" describe when and what to call, but never say what happens if the PATCH call fails (network error, 4xx/5xx). The acceptance criteria also do not mention it. A developer implementing this feature cannot infer the expected UX from the spec alone (silent failure? toast? retry?). This must be resolved before implementation.

---

### Non-Critical Issues

**1. Debounce target for selection-toggle persistence is vague**

The spec says "debounced ~500 ms". The tilde makes this ambiguous — is 500 ms the required value, or a suggestion? The implementation should have a single agreed value. Recommend replacing "~500 ms" with a concrete value or noting it is left to developer discretion.

**2. "Edited" badge styling is unspecified**

The spec introduces a visual "Edited" badge but does not describe its appearance (colour, placement relative to the rewritten text, or the PrimeNG/Tailwind component to use). This is unlikely to block implementation but may produce inconsistencies with the rest of the UI.

**3. `applySelectionsToCV` update — call site ambiguity**

The spec says "In `applySelectionsToCV()` (or its call site)". This leaves the implementation location open to interpretation. The function currently lives in `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`. A cleaner spec would commit to one location.

**4. Backend validation of the new `userEditedOutput` payload**

The existing `SaveUserOutputDto` accepts any non-null string. The spec does not address whether the backend should validate that the incoming string is parseable as `BulletUserState`, or whether it should remain a pass-through. Leaving it unspecified is acceptable for now, but should be noted as a deliberate choice.

**5. `activeBulletEditKey` and `editedBulletText` placed on the parent `CvOptimization`**

Storing ephemeral editor state (`activeBulletEditKey`, `editedBulletText`) in the parent component rather than inside `BulletRewriter` is an unusual architectural choice that is not explained in the spec. It is a valid design for keeping the component purely presentational, but the rationale should be stated as an assumption.

---

### Unclear or Ambiguous Sections

**Section "Editing a bullet (inline)" — Step 5: empty-save semantics**

> "If the user empties the textarea entirely and clicks Save, treat it as reverting to the original AI `rewrittenText` (store `null` / remove the key from the map)."

This is correct for the local map, but the spec does not clarify what is written to the backend in this case. Is the edit key omitted from `BulletUserState.edits` in the PATCH payload, or is it sent with `editedText: ""`? These produce different round-trip behaviour on reload.

**Section "Loading persisted state" — parse error handling**

If `userEditedOutput` is present but cannot be parsed as `BulletUserState` (e.g. it was set by an older version of the app that stored free text), the spec does not specify the fallback behaviour. Silent ignore? Log a warning? This is a real scenario given the field is already in use.

---

### Invented or Unsupported Requirements

**1. Persisting `selectedBullets` alongside bullet edits**

The raw task says only: *"allow editing rewritten version of bullet."* Persisting the selection state (`selectedBullets`) to the backend was added during clarification questions (confirmed by the user), so it is user-approved. However, it is not traceable to the raw task text. This is acceptable, but the spec should explicitly note it originated from a clarification session rather than the task itself.

**2. "Save during export" edge case**

> "if the user triggers export while the editor is open, close the editor (cancel, no save) and proceed with export"

The raw task and clarification answers do not mention export interactions. This is a reasonable defensive addition, but it is an invented behaviour that is not grounded in the original task. It should be marked as an assumption.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The existing `PATCH /api/optimizations/:id/user-output` endpoint requires no modification to accept `BulletUserState` JSON | Implicit (stated as "no change needed" without backend validation discussion) |
| 2 | `userEditedOutput` was not previously used for `BULLET_UPGRADE` records (i.e. repurposing is safe) | Not stated |
| 3 | `BulletSelectionKey` uniquely identifies a bullet within a result (no two bullets in the same position share identical `originalText`) | Not stated |
| 4 | Ephemeral edit state (`activeBulletEditKey`, `editedBulletText`) lives in the parent `CvOptimization`, not inside `BulletRewriter` | Implicit in the signals list; rationale not explained |
| 5 | The BULLET_UPGRADE record id is available from `OptimizationResultSummary` when loaded in stored-optimization mode | Implied but not verified against the `OptimizationResultSummary` type (which does include `id`) |
| 6 | Persisting selections was requested by the user (clarification session), not by the original task | Not stated |
| 7 | "Save during export" behaviour (auto-cancel editor) is the correct UX | Invented; not confirmed with user |
| 8 | A debounce of ~500 ms is acceptable for selection-toggle persist calls | Not confirmed |
| 9 | If `userEditedOutput` for a BULLET_UPGRADE record cannot be parsed as `BulletUserState`, it should be silently ignored | Implicit; not stated |

---

## Recommendation

**Revise specification** — address Critical Issue #1 (PATCH error handling) and the two ambiguous sections (empty-save backend payload, parse-error fallback on load) before handing off to implementation. The non-critical issues and assumption gaps can be resolved with small clarifying additions or inline comments in the spec.
