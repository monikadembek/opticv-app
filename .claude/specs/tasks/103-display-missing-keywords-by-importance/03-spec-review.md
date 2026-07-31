# Specification Review — Task 103: Display missing keywords by importance

### Summary

- Overall assessment: **PASS**
- The specification's core requirement (sort both missing-keyword lists Critical → High → Medium → Low) is a direct, faithful translation of the raw task's two bullet points. It is grounded in the actual current codebase state (verified `importance` field already exists on `KeywordGapMissingKeyword`, verified the two computed signals filter but don't sort), scopes out only things the raw task does not ask for, and provides concrete, implementable behavior, edge cases, and acceptance criteria.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

- The spec asserts "Only file touched: `keyword-gap.ts`" but the Acceptance section also expects `keyword-gap.spec.ts` to be updated with new tests. The Data/API section does parenthetically mention the spec file, so this is not a contradiction, just slightly imprecise phrasing ("only file touched" vs. "only production file touched"). Low impact.
- The "unknown importance value sorts last" edge case (Edge Cases, bullet 3) is a defensive-programming addition not explicitly requested by the raw task or by the user's clarifying answers. It's reasonable and low-risk, but it is technically a small implementation detail invented by the spec author rather than derived from the task. Worth a conscious sign-off during implementation review, though not a blocker.

#### Unclear or Ambiguous Sections

None. Behavior, Edge Cases, and Acceptance sections are concrete enough to implement without further guessing.

#### Invented or Unsupported Requirements

None. All in-scope items trace back to the raw task's two bullets ("display missing keywords... in order of importance" for both the likely-has and genuinely-lacks groups). All out-of-scope exclusions (no prompt/schema/DB changes, no new visual subheadings, no changes to other keyword categories) are reasonable scope boundaries, not additional requirements.

### Assumptions Detected

All assumptions are explicitly enumerated in the spec's "Assumptions" section:

1. Sort order is Critical → High → Medium → Low, applied independently to both sections — stated as derived directly from the task description.
2. No secondary sort key within a tier (stable sort preserves AI response order) — stated as confirmed with user.
3. Importance rank order defined locally in the component, not as a shared `@opticv/datatypes` constant — stated as confirmed with user.
4. No new visual subheadings/dividers per tier; existing flat list layout is preserved — stated as confirmed with user.

One additional implicit assumption exists but is not listed as such in the "Assumptions" section (it appears only in "Edge Cases"): that keywords with an importance value outside the known four levels should sort last rather than erroring or sorting first. This is a defensive-programming choice, not confirmed with the user, and is not flagged as an assumption in the dedicated section — a minor structural gap.

### Recommendation

- **Proceed as-is**
