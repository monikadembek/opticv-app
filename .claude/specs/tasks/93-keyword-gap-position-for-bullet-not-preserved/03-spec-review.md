### Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification correctly identifies and grounds its root-cause analysis in the actual codebase (verified: label-based matching in `cv-optimization.ts`/`apply-selections.ts`), and every requirement traces back either to the raw task's bug description or to an explicit user clarification captured during spec authoring. The main issues are: the specific technical solution (index-based matching) is a design decision not present in the raw task text, one behavior (silent data loss for pre-existing stored records) is asserted as "acceptable" without task-level authorization, and the added test-coverage requirements go beyond what the task literally asked for. None of these are fatal, but they should be surfaced before implementation.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Silent data loss for existing stored records not explicitly flagged as a risk decision.** Data / API section states: "existing stored records with the old `forPosition` shape will simply fail to match on restore and fall back to unselected — acceptable per the same degraded-fallback behavior in Edge Cases." This means any user who previously selected an experience-bullet placement, saved it, and reopens after this fix ships will silently lose that selection once — which is arguably the *exact* bug being fixed, reintroduced once, for a different reason. The raw task does not authorize this tradeoff. Recommend explicitly calling this out as a one-time known limitation for the PO/reviewer to accept, rather than folding it quietly into "Edge Cases."
2. **Test-coverage requirements exceed the raw task's stated scope.** The raw task only says the behavior "must be fixed" — it does not mention tests. The spec's "In scope" and "Acceptance (DEV)" sections add three separate new/updated test suites. This is reasonable engineering practice, but per review rules it should be labeled as spec-added rather than task-derived (see "Invented or Unsupported Requirements" below).
3. **`getKeywordPosition` return type left ambiguous.** Data / API section says it returns "`number | null` (or a sentinel)" — the parenthetical hedge means the exact contract isn't fully pinned down, which could cause inconsistent implementation choices (e.g., `-1` vs `null` vs `undefined`).

#### Unclear or Ambiguous Sections

- **Edge Cases, bullet 2**: "`apply-selections.ts` should also skip insertion in this case (`expIndex` check already guards with `!== -1`/bounds check)" — this references current label-matching guard logic (`findIndex` returning `-1`) as if it directly carries over to index-based lookup, but a direct array index lookup (`clone.experience[experienceIndex]`) doesn't naturally produce `-1`; it needs an explicit bounds check (`experienceIndex >= 0 && experienceIndex < clone.experience.length`). The spec's Behavior section #7 doesn't state this check explicitly. Minor implementation-detail gap, not a blocker.
- **Scope, "Out of scope" bullet 4**: "index-based matching does not fully solve this either" (reordering/removal of experience entries) — acknowledged but left unresolved. Since this is the same class of problem as the bug being fixed (a stale reference silently failing), a reviewer could reasonably ask why one instance of stale-reference failure is being fixed while a highly similar one is explicitly deferred. Not a contradiction, but worth a sentence explaining why reordering is out of scope while label-drift is in scope (likely: reordering is rare/user-driven and out of scope for this bug ticket, whereas label drift happens routinely on every reload).

#### Invented or Unsupported Requirements

- The **specific fix mechanism** — replacing label-based matching with `experienceIndex`-based matching — is not stated or implied in the raw task. It is present in the spec because the user explicitly selected this approach during the clarification phase (confirmed via `AskUserQuestion` in the authoring session, both times choosing the "Recommended" option). Per this workflow's rule ("You MUST NOT invent new specifications... list assumptions explicitly"), this should be flagged: it is a *user-authorized* addition, not a task-derived requirement, and the spec should ideally note explicitly that the resolution approach came from developer/PO clarification rather than the original bug report. Currently the spec presents it as settled fact without flagging its provenance.
- The **three new/expanded test suites** (`cv-optimization.spec.ts`, `keyword-gap.spec.ts`, `apply-selections.spec.ts`) are spec-added, not task-derived. Good engineering practice, but not literally requested by the task.

### Assumptions Detected

- "Index-based matching... is the agreed approach" (Scope, Out of scope #4) — explicitly stated as agreed via clarification; correctly flagged as a decision in the spec, though not labeled as "assumption" per se.
- Backward-compatibility for previously-stored `forPosition` records is *not* required — stated in Data/API section, but framed as an acceptable side effect rather than an explicit assumption requiring sign-off. Should be listed as an assumption: "Pre-existing stored `keywordBulletPositions` records using the old string-label shape are not migrated and will silently reset to unselected after this fix ships."
- Assumes `cvStructuredData().experience` order is stable within a given optimization/session and only changes rarely (e.g., not resorted per render) — implicit in the index-based approach; not explicitly stated as an assumption in the spec.
- Assumes no other consumer of `BulletUserState.keywordBulletPositions` or the `forPosition` field exists elsewhere in the codebase that would break from the shape change (spec doesn't mention checking for other consumers).

### Recommendation

- **Proceed as-is**, provided the following two items are addressed before or during implementation (not blocking spec re-authoring):
  1. Explicitly call out the one-time silent-reset-on-upgrade behavior for pre-existing stored data as a known, accepted limitation (get sign-off if this is a live production concern).
  2. Confirm no other code path reads/writes `keywordBulletPositions[].forPosition` beyond the files already identified in Context.
