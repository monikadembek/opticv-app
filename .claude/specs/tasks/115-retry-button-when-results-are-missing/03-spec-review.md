### Summary

- Overall assessment: **PASS WITH ISSUES**
- Short justification: The specification is detailed, well-grounded in the existing codebase, and structurally sound. However, it contains one direct contradiction of the raw task's explicit wording (quota handling) and one unstated deviation in status semantics (`'pending'` reuse) that should be confirmed before implementation begins.

### Findings

#### Critical Issues

1. **Quota handling contradicts the raw task text.** The raw task states retrying should allow "running this single job **within the quota limits**." The spec's Scope ("Quota consumption changes... retries... remain free") and Data/API section explicitly make the new "not-started" retry path free/no quota check — the opposite of "within the quota limits." The spec does note in a prior conversation turn that this was resolved via a clarifying question and user answer, but the spec document itself does not record this as a documented deviation/assumption from the raw task — it is presented as settled fact with no cross-reference to the raw task's conflicting language. Per the review workflow's Alignment criterion, this must be flagged: either the raw task wording is stale/incorrect (in which case the spec should say so explicitly as a noted deviation), or the requirement was misinterpreted.

#### Non-Critical Issues

1. **`'pending'` status reuse is ambiguous.** `SectionStatus` keeps a `'pending'` value distinct from the new `'not-started'` value, but the spec's Behavior section (`sectionStatus()`) maps a `results()` entry with backend status `PENDING`/`PROCESSING` to `'pending'`, while a **missing** `results()` entry maps to `'not-started'`. The spec doesn't explicitly state what UI treatment `'pending'` receives (it's not one of the three existing badges in `section-card.html` — only `completed`/`processing`/`error` are currently rendered). This pre-existing gap is inherited, not introduced, by this spec, but since the spec is touching `sectionStatus()`'s logic directly adjacent to it, it would benefit from a one-line clarification that `'pending'` styling/behavior is unchanged and out of scope.
2. **No explicit mention of the `runId`/idempotency contract for the newly-created row.** The Data/API section says the created row uses "a new `runId`," but doesn't specify whether `runId` is stored on the `OptimizationResult` row (it isn't part of the described schema fields) — this is consistent with the existing `FAILED` branch's behavior (which also doesn't persist `runId` on the row), so it's not a gap introduced by this spec, but could be called out as "unchanged" for clarity.
3. **Test acceptance criteria don't mention the new frontend badge/empty-state.** The Acceptance section lists unit tests for `sectionStatus()` and `retryablePromptTypes`, but no test criterion for the new `SectionCard` "not-started" badge markup or the empty-state message rendering (component/template test), even though Behavior item 3 and Scope both describe this as in-scope UI work.

#### Unclear or Ambiguous Sections

1. **"Race" edge case description (Edge Cases, 3rd bullet).** The explanation states the second concurrent request "correctly throws `BadRequestException`" — but this depends on timing: if two `retryFailedJob` calls both read `existing === null` before either write commits, both would attempt `create()`, and the second `create()` would violate the `[applicationId, promptType]` unique constraint (a Prisma P2002 error), not cleanly hit the "any other status" branch. The spec's own referenced codebase context (via the earlier exploration) already surfaced a near-identical P2002 race previously found in `checkAndConsume`. This edge case's stated outcome is optimistic and doesn't account for the read-then-write race window; it should either acknowledge the possible P2002 error path or state that handling it is out of scope.
2. **"same shape as the reset performed today for the `FAILED` case" (Scope, Behavior item 6).** This references field-level parity (`structuredOutput`, `textOutput`, `errorMessage`, `promptVersionId`, `inputTokens`, `outputTokens`) but the spec never lists the exact fields Ito be set on `create()`, unlike the reset case where the underlying code (referenced in Context) is explicit. A developer would need to cross-reference the existing `update()` call's field list themselves — acceptable given "Prefer existing conventions," but worth an explicit field list for a create()-vs-update() case since `create()` requires different mandatory fields (e.g. `applicationId`, `promptType`) not present in the `update()` call.

#### Invented or Unsupported Requirements

None. All in-scope items (not-started state, empty-state UI, per-section retry, backend upsert-on-missing) trace to either the raw task or to explicit answers given during the spec's clarification phase (per the prior conversation turns, though those answers/rationale are not captured as an explicit "Assumptions" section within the spec document itself — see Assumptions Detected below).

### Assumptions Detected

The spec does not include an explicit "Assumptions" section (the template does not mandate one by name, but the review workflow requires "All assumptions must be explicitly enumerated"). The following assumptions are present in the spec but not labeled as such:

1. **Retries stay free / no quota check for the new "not-started" case.** Stated as settled behavior in Scope and Data/API, not flagged as an assumption or deviation from the raw task's "within the quota limits" wording. **Not explicitly labeled as an assumption in the spec; should be.** (See Critical Issues #1.)
2. **A new `'not-started'` `SectionStatus` value (rather than reusing `'error'` or `'pending'`) is the correct UX approach.** This is stated directly as a design decision in Scope/Behavior with no "Assumptions" framing, though it does trace to a resolved clarifying question per the conversation history. The spec itself presents it as fact rather than as an assumption inherited from a product decision.
3. **No page-level "Retry all missing" action is needed.** Stated in Out of Scope as a scope boundary; traces to a resolved clarifying question, but again not framed as an assumption in the document.
4. **The malformed-`COMPLETED` (null output) retry case is unaffected and out of scope.** Reasonable inference from the raw task (which only mentions "no results" / unprocessed sections, not malformed ones), correctly kept out of scope, but not explicitly enumerated as an assumption that this pre-existing case is untouched.

### Recommendation

- **Revise specification** — primarily to resolve and explicitly document the quota-handling conflict with the raw task's "within the quota limits" wording (either as a stated, justified deviation, or by correcting the behavior), and to add an explicit "Assumptions" listing for the design decisions enumerated above. The non-critical and ambiguous-section issues (race-condition wording, missing badge/empty-state test criteria, `'pending'` clarification) are minor and can be addressed in the same revision pass without requiring a new round of clarifying questions.
