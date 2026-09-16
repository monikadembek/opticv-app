# Specification Review

Task ID: 101-keyword-gap-acronym-issues

## Summary

- Overall assessment: **PASS WITH ISSUES**
- The spec is grounded in the raw task and correctly extends it only where the user was explicitly asked and answered clarifying questions (enum style, UI parity, placement field, full-stack scope). Verified against the actual codebase (`seed.ts` required array, `CvStructuredData` shape), its factual claims hold up. It has one internally contradictory sentence in the `'title'` replace-placement rule and a few implementation details (exact badge markup, description wording, `'replace'` semantics for `experience_bullet`/`multiple` when no bullet exists) that are underspecified enough to require implementer judgment calls.

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **`'title'` placement rule is garbled/self-contradictory** (Data / API → Behavior §5, item 5, `'replace'` sub-bullet for `'title'`): the sentence reads "replace the substring in the current experience entry's `title` is ambiguous..." — this appears to be an edit artifact mixing two drafts (one describing an experience-entry-title approach, one describing the fallback). It states the target is ambiguous while also describing what to do about it in the same run-on sentence. The *conclusion* (default to `'multiple'`-like broad replace) is clear and is correctly flagged again in Assumptions, but the sentence itself should be cleaned up for an implementer reading only the Data/API section.
2. **`actionType`/`suggestedPlacement` description wording is a suggestion ("e.g."), not a firm spec.** Section 1 gives example description strings prefixed "e.g.", which is appropriately non-prescriptive for prose fields, but it means the acceptance criteria can't verify exact wording — worth confirming this looseness is intentional (it appears to be, consistent with "follow the style of neighboring properties").
3. **No rule for `'replace'` when `experience_bullet`/`'multiple'` is selected but the term doesn't appear in any bullet or the position is unpicked, versus the already-stated "no chosen position → skip" rule.** The Edge Cases section covers "no chosen position" and "no match found" separately, but doesn't explicitly cross the two: e.g., for `'multiple'` replace, if the term matches in `skills` but not in any experience bullet, is that a partial success (skills replaced, bullets untouched) or does the whole item no-op? The Behavior/Data-API text implies partial (each field scanned independently), but this isn't stated as an explicit rule the way the `experience_bullet`-only case is.
4. **Badge visual spec is described relative to "same visual treatment as the `suggestedPlacement` badge on Missing Keywords,"** but Missing Keywords doesn't currently have a distinct `actionType`-equivalent badge to copy from (only `importance`, `isRequired`, `suggestedPlacement` badges exist) — the spec is explicit enough for a developer to make a reasonable choice, but pixel/color choice for the new `actionType` badge is left undefined (acceptable for a text-only spec per template conventions, but worth flagging as a UI detail not fully locked down).

### Unclear or Ambiguous Sections

- **Data / API section, `'title'` bullet** (see Non-Critical #1) — reads as unclear/garbled on first pass; the actual intended behavior is only recoverable by cross-referencing the Assumptions section.
- **Edge Cases — "Duplicate `term` values"**: states behavior mirrors `selectedKeywords`/`keywordEdits` ("last one wins in the Map"), but doesn't clarify what happens to *rendering* when two list items share the same `term` (e.g., both checkboxes reflect the same shared selection state, potentially confusing a user editing what looks like two distinct rows). This mirrors a pre-existing latent issue in Missing Keywords too, so arguably out of scope, but the spec doesn't explicitly say "this is an accepted pre-existing limitation, not something new to fix."

### Invented or Unsupported Requirements

None. All requirements trace back either to the raw task (`00-raw-task.md`: required property, `actionType` enum with add/replace) or to the four clarifying questions the user explicitly answered during the /spec session (enum style → lowercase union; UI parity → full Missing-Keywords parity; placement → new `suggestedPlacement` property; scope → full stack). The `suggestedPlacement` enum values were reused verbatim from the existing `missingKeywords[].suggestedPlacement` field rather than invented.

## Assumptions Detected

All assumptions are explicitly enumerated in the spec's **Assumptions** section:

1. `actionType`/`suggestedPlacement` as lowercase string-literal unions, not real enums — explicitly stated, and directly traceable to the user's answered clarifying question.
2. Full UX parity with Missing Keywords was intentionally requested, not a simpler variant — explicitly stated, traceable to the user's answered clarifying question.
3. `'title'` placement has no clean target field on `CvStructuredData` and defaults to `'multiple'`-like behavior — explicitly stated, and **verified correct against the actual codebase**: `CvStructuredData` (datatypes.ts) has no CV-level `title` field; `title` only exists per-`CvExperienceItem`. This is a legitimate open question appropriately flagged rather than silently resolved.
4. `PromptVersion.version` bump vs. in-place edit is left as an open question for existing project convention — explicitly stated as out of scope/unresolved, reasonable given it doesn't affect app runtime behavior.
5. Historical `OptimizationResult` rows lacking the new fields are handled defensively (read-only fallback) rather than migrated — explicitly stated, and consistent with the Edge Cases section.

No hidden/implicit assumptions were found beyond what's listed — the spec is unusually thorough in surfacing its own open questions, including a self-flagged internal ambiguity (`title` placement) rather than silently picking an interpretation.

## Recommendation

- **Proceed as-is**, provided the implementer treats Non-Critical Issue #1 (garbled `'title'` sentence) as resolved by the Assumptions section's clearer restatement, and confirms the partial-vs-whole-item semantics for `'multiple'`/`experience_bullet` replace misses (Non-Critical #3) during implementation rather than guessing silently.
- No revision of the specification document itself is required before implementation begins; the issues found are clarity/polish items, not missing or incorrect requirements.
