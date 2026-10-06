# Specification Review — Task 119

## Summary

- **Overall assessment:** PASS WITH ISSUES
- **Justification:** The specification correctly identifies and grounds both bugs named in the raw task, and its central design decision — routing the four CV-subset prompts through the bulk `/run` endpoint while keeping the other three on the single-job endpoint — is verified against the code and sound. However, the spec materially overstates the frontend work: `sectionStatus()`, `retryablePromptTypes` and per-card retry buttons for all seven prompts already exist, which the spec does not acknowledge. It also introduces a third defect (the SSE termination leak) that is real and verified but absent from the raw task, and leaves the new server-side job-count mechanism unspecified.

## Findings

### Critical Issues

1. **Behavior §13–15 and Scope describe frontend work that already exists.** The spec presents per-card error display and the retry affordance as work to be added. Verified in the code: `sectionStatus()` (`cv-optimization.ts:648-657`) already returns `'error'` for `status === 'failed'`; `retryablePromptTypes` (`:407-434`) already computes retryability including the `status === undefined` and `'failed'` cases; and `cv-optimization.html` already renders a Retry button for all seven prompt types (lines 162, 242, 297, 359, 409, 453, 496). An implementer following this spec would likely rebuild existing behavior. The genuine gap is narrower: the error *message* is never captured or displayed (no error-text state exists), and `isProcessing` is never cleared on the error path (`:884`). The spec must distinguish what exists from what is missing.

2. **The queued-job-count mechanism is unspecified (§ Models, Behavior §10).** The spec states the server "needs to associate a queued-job count with a `runId`" and defers the mechanism to the plan stage. This is the load-bearing element of the SSE fix, and the current `OptimizationEventBus` (`optimization-event-bus.ts`) is a bare in-process `EventEmitter` with no run registry and no count. Deferring it leaves the single most consequential design decision of the task unmade — including whether run state must survive a process restart, which the observed production incident makes directly relevant.

3. **Behavior §9 conflicts with the current client and does not say how the client learns a run is finished.** `streamOptimizationEvents()` calls `observer.complete()` and `es.close()` on the *first* `job-complete` event (`cv-optimization-api.service.ts:117-122`). The spec says the client must instead stay subscribed until `run-complete`, but the client never registers a listener for the `run-complete` event the server emits (`optimization.controller.ts:227-232`). The spec does not state that this listener must be added, so the termination contract has a hole on the client side.

### Non-Critical Issues

4. **The third defect is not traceable to the raw task.** The SSE leak (Goal §3) is verified and consequential, but the raw task names only two bugs. Scope creep within a spec is a process concern even when the finding is correct; it should be explicitly marked as discovered-during-analysis, or split into its own task.

5. **Acceptance criteria are not all verifiable as written.** "No card remains in a processing state after its run reaches a terminal outcome" has no stated observation point, and the criterion for the stream closing ("verified by the listener being removed and the response ended") describes an internal state with no described means of assertion.

6. **The idle-timeout value is deferred with only a qualitative constraint** ("long enough not to cut off a legitimately slow OpenAI call"). Since this timeout is the only backstop against the exact production failure that motivated the task, leaving it unbounded invites an arbitrary choice at implementation time.

7. **Behavior §4 says the three non-CV prompts open a stream "as it does today"** — but "today" is precisely the broken single-event-then-close client described in §9. The two statements are in tension about which client behavior is being preserved.

8. **`run-complete` currently carries no payload distinguishing normal completion from an idle-timeout close** (`optimization.controller.ts:227-231`). The spec requires the server to emit `run-complete` on timeout (§11) but does not say whether the client should treat a timeout-triggered completion differently from a genuine one — which matters, because §Edge Cases requires the worker-died case to suppress the retry affordance.

### Unclear or Ambiguous Sections

- **§ Behavior 10** — "terminal events (completed or failed)" is clear, but the spec does not say what happens if the same prompt type reports twice (BullMQ `attempts: 2` means a job can be retried, and the processor re-throws after writing `FAILED`, `optimization.processor.ts:152`). Whether the count is per-event or per-distinct-prompt-type is undefined, and the difference decides whether a stream closes early.
- **§ Edge Cases, "Worker dies mid-job"** — instructs that "the card must not present retry as available in that case," but does not define how the client distinguishes this from an ordinary failure. Given `retryablePromptTypes` currently marks `status === undefined` as retryable, satisfying this requires changing existing logic the spec does not mention.
- **§ Edge Cases, "All quota exhausted"** — requires `pageState` not to remain `'processing'`. Since `pageState` derives from `isProcessingAny()` over `ActivePrompts`, this is satisfied automatically once §13 clears the flags; stating it as a separate requirement is harmless but redundant.
- **§ Scope, "Unit tests covering … stream termination"** — the backend has no existing spec file for the controller's SSE path; whether this implies a new test file or extension of `optimization.service.spec.ts` is unstated.

### Invented or Unsupported Requirements

- **The SSE termination fix (Goal §3, Behavior §10–12)** is not present in, or implied by, the raw task. It is technically justified and was surfaced by code analysis, but it originates from the reviewer-author's investigation rather than the task. Flagged per the workflow's alignment criterion; it is a correct finding, not a fabrication.
- **The idle timeout (§11)** follows from the above and is likewise not task-derived.
- **"Expose the existing free retry path for cards in a failed state" (Scope)** is not in the raw task, which mentions only surfacing the error message. It is also, per Critical Issue 1, largely already implemented.

All other requirements trace to the raw task's two named bugs and its stated preferred fix (use the bulk endpoint).

## Assumptions Detected

Explicitly stated in the spec (§ Assumptions):

1. The CV-subset-as-one-unit billing and separate billing for the other three features are both intended. **Stated.**
2. `ActivePrompts` (7) and `CV_SUBSET_PROMPT_TYPES` (4) are each correct for their purpose. **Stated.**
3. Quota is not refunded for failed runs. **Stated**, and consistent with the Out-of-scope list.
4. The idle-timeout duration is deferred to the plan stage. **Stated.**

Implicit, not stated in the spec:

5. **The four CV-subset jobs and the three others can share the results UI while arriving over different streams with different `runId`s.** The spec assumes this composes cleanly; nothing verifies that `results()` keyed by prompt type is insensitive to run identity. (It appears to be, but the assumption is unstated.)
6. **`OptimizationEventBus` being in-process is acceptable.** A single-instance deployment is assumed; the run/count registry implied by §10 inherits that constraint, and horizontal scaling would break both it and the existing event delivery.
7. **The three non-CV prompts each have quota available on FREE tier.** The spec's "Partial quota exhaustion" edge case implies they may not, but the spec never states what FREE actually grants for `COVER_LETTER`, `INTERVIEW_PREP` and `LINKEDIN` — so whether a FREE user's normal run is *expected* to show three quota errors every time is left open. This materially affects whether the fixed flow looks correct to a tester.
8. **Existing per-card retry UI and `sectionStatus` error state are to be reused rather than rebuilt.** Never stated; see Critical Issue 1.

## Recommendation

**Revise specification.**

The core design is sound and should be kept. Before implementation, the spec should: (a) correct §13–15 and Scope to reflect the error-display and retry infrastructure that already exists, narrowing the frontend work to capturing error text and clearing `isProcessing` on the error path; (b) resolve the queued-job-count mechanism, or state explicitly that the plan stage owns it as a named open decision; (c) close the client-side `run-complete` gap in §9; and (d) record assumption 7 above, since it determines what a correct FREE-tier run is expected to look like. The SSE-leak scope addition should be confirmed with the task owner or split into its own task rather than carried implicitly.
