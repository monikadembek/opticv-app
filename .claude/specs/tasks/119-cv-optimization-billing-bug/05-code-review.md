# Code Review — Task 119: CV optimization billing bug + stuck spinner

Reviewed commits: `3478f46` (SSE termination), `17117e1` (billing / trigger / error state), against spec `02-spec.md` and plan `04-implementation-plan.md`.

## Summary

- Overall result: **PASS WITH ISSUES**
- The core defects are fixed. The UI now calls the bulk `/run` endpoint once for the four CV-subset prompts, each trigger is isolated with its own `catchError`, and the SSE stream closes once the expected number of distinct prompt types has reported, with a 180 s idle-timeout backstop. Spinners clear on every failure path. The new code follows conventions and has thorough tests. Two correctness issues remain. First, a card rejected for quota or plan reasons shows a Retry button that runs the job for free through the no-quota retry endpoint. Second, a BullMQ second-attempt success inside a bulk run leaves the earlier failure message on screen under a valid result.

## Conventions Violations

### Critical (must fix before merge)

1. **Quota/plan bypass is presented on quota-rejected cards** — `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts:478-489` (`retryablePromptTypes`) together with `apps/opticv-be/src/app/optimization/optimization.service.ts:219-269` (`retryFailedJob`).
   `triggerOptimization` / `triggerSingleJob` call `checkAndConsume` (lines 87, 165) *before* upserting result rows, so a 403 leaves no row. `retryablePromptTypes` treats `status === undefined` as retryable, and `retryFailedJob` accepts an absent row and performs no quota or feature check. Concrete path: a FREE user runs an optimization, and LinkedIn is rejected with `FEATURE_NOT_AVAILABLE` (plan D4: this happens on **every** FREE run). The card then shows "LinkedIn is not available on your current plan. Upgrade to unlock it." next to a working **Retry** button, and clicking it generates the LinkedIn rewrite for free. The same applies to the four CV cards after a `QUOTA_EXCEEDED` on the bulk run, which makes the `CV_OPTIMIZATION` limit bypassable. The backend gap predates this task, and Task 115 made rejected cards retryable. This task, though, turns the bypass into an always-visible prompt beside an "upgrade" message, and spec §15 / plan F5 explicitly keep trigger-rejected prompts retryable. Within this task's scope, prompts rejected with `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` should be excluded from `retryablePromptTypes`, the same way `stalledPrompts` already is. Closing the backend hole (quota/feature check in `retryFailedJob` for rows that do not exist) needs a follow-up decision.

   **Status: Fixed on the frontend.** A new `planBlockedPrompts` signal records prompts whose trigger was rejected with `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE`. It is reset on each run, and `retryablePromptTypes` skips those prompts. Covered by the test "does not offer the free retry for quota or plan rejections". **Backend: Fixed.** `retryFailedJob` still retries a `FAILED` row for free. For a missing row it now calls `checkAndConsume` for the prompt's feature, unless the prompt is in the CV subset and a sibling CV-subset row exists for the application (the `CV_OPTIMIZATION` credit was already charged). The check is `isCvSubsetPaid()`. A never-paid retry therefore gets the same `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` 403 as a normal trigger, which also closes the reopened-optimization path. Swagger documents the new 403.

2. **Stale error message after a BullMQ second-attempt success** — `cv-optimization.ts` `handleJobEvent()` (diff hunk around line 1000 of the new file).
   `optimization.processor.ts:146-152` emits `status: 'failed'` and then rethrows, and jobs are queued with `attempts: 2`. In a bulk run, a first-attempt failure records a `runErrors` entry. If the second attempt succeeds while the stream is still open (other CV prompts pending), the `completed` event stores the result but never clears `runErrors` for that prompt. The template (`cv-optimization.html`, `@if (runErrors().get(...))` blocks) then renders the red `role="alert"` failure text under a valid result. `handleJobEvent` should clear the prompt's run error on `completed`. Related, and partly pre-existing: because the bus counts the first `failed` as terminal (plan D1), a single-prompt run (cover letter, interview prep, LinkedIn, retry) closes on the attempt-1 failure. Its attempt-2 result is never streamed and only appears after a reload, and the card offers Retry while attempt 2 may still be running. The old client also closed on the first event, so the single-job half of this is not a regression.

### Non-Critical (should fix)

3. **Raw worker error text shown to users** — `cv-optimization.ts` `handleJobEvent`: `event.error || GENERIC_FAILURE_MESSAGE`. `event.error` is `err.message` from the processor (`optimization.processor.ts:134`). It can contain internal text such as `"Prompt version for X has no outputSchema — cannot generate structured output"` or raw OpenAI/Prisma messages. Consider always showing the generic message and keeping the raw error in logs and PostHog.
4. **Duplicate quota messaging** — `quotaErrorInterceptor` (`core/interceptors/quota-error-interceptor.ts`) already toasts on `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE`, and the cards now repeat the message inline. This is acceptable per spec §14, but a FREE user now gets a LinkedIn toast plus an inline alert on every run.
5. **Seven simultaneous `role="alert"` regions** — `cv-optimization.html`. A rejected bulk trigger fires four assertive announcements at once (plus toasts). This is WCAG-compliant but noisy for screen-reader users. `role="status"` / `aria-live="polite"` would be gentler.
6. **Side effect at Observable construction** — `cv-optimization.ts` `trackRun()` calls `clearRunErrors(prompts)` when the Observable is *built*, not when it is subscribed. This is harmless today because every caller subscribes immediately, but it is surprising for a function that returns a cold Observable. Wrapping it in `defer()` would make it lazy.
7. **Naming inconsistency for module constants** — `cv-optimization.ts`: `CvSubsetPrompts` / `PerFeaturePrompts` (PascalCase, matching the existing `ActivePrompts`) next to `FEATURE_LABELS`, `GENERIC_FAILURE_MESSAGE` etc. (UPPER_SNAKE). Pick one style for the new constants.
8. **Import ordering** — `cv-optimization.ts`: `LimitedFeature` is inserted between `JobApplication` and `JobApplicationWithCv`, which breaks the existing alphabetical order of the `@opticv/datatypes` import.
9. **Leftover `console.log`** — `handleJobEvent` keeps `console.log('SSE - job complete event:', event)`. It was carried over from the old code, but the code was moved and could have been dropped (the event already goes to PostHog).

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| §1 Reset run-scoped state on submit | Covered | `runErrors` and `stalledPrompts` added to the reset block. |
| §2 One bulk `/run` call for the CV subset | Covered | `trackRun(..., CvSubsetPrompts, runFullOptimizationProcess(...))`. Test: "issues exactly one bulk call plus one single-job call per per-feature prompt". |
| §3 Mark four CV prompts processing, one stream for bulk `runId` | Covered | `setProcessing(prompts, true)` inside `switchMap`. |
| §4 Separate single-job calls for cover letter / interview prep / LinkedIn | Covered | `PerFeaturePrompts.map(...)`. |
| §5 One rejection must not cancel others | Covered | Per-trigger `catchError` → `EMPTY`. Tested. |
| §6–8 Branch on `status`; store result / record error | Partial | Branching is correct, but `completed` does not clear a prior `runErrors` entry (Critical #2). |
| §9 Stream stays open until `run-complete` | Covered | `cv-optimization-api.service.ts` no longer completes on `job-complete`. |
| §10 Server closes after N terminal events for the run | Covered | `OptimizationEventBus` registry counting distinct prompt types. A first-attempt `failed` counts as terminal (see Critical #2). |
| §11 Idle-timeout backstop | Covered | `STREAM_IDLE_TIMEOUT_MS = 180_000`, `timedOut: true` in payload. |
| §12 `req.on('close')` cleanup | Covered | Also clears the timer and releases the run. |
| §13 Rejected trigger clears spinner and shows reason | Covered | `failPrompts(prompts, triggerErrorMessage(err))`. |
| §14 Quota-specific message naming the feature | Covered | `FEATURE_LABELS` + `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` branches. |
| §15 Failed card exposes free retry | Covered | Existing buttons reused. Also exposed on quota-rejected cards (Critical #1). |
| Edge: worker dies mid-job → no retry offered | Covered | `stalledPrompts` excluded in `retryablePromptTypes`. |
| Edge: stream error → clear processing, connection message | Covered | `handleStreamError`. |
| Edge: all quota exhausted → page leaves `processing` | Covered | Test "leaves the processing page state once every run reaches a terminal outcome". |
| Edge: SSR returns `EMPTY` | Covered | Guard unchanged. |
| Acceptance: build / lint / typecheck / test pass | Not verified | Not run as part of this review. |
| Acceptance: listener removed and response ended on completion | Covered | Controller spec `streamOptimization` suite. |

## Plan Deviations

1. **F1 — timed-out `run-complete` errors instead of completing.** The plan said the `run-complete` listener calls `observer.complete()`. The implementation calls `observer.error(new OptimizationStreamTimeoutError())` when `timedOut` is true, and adds two new exports (`SseRunCompleteEvent`, `OptimizationStreamTimeoutError`) to `cv-optimization-api.service.ts`. The plan's "Models: no change required" no longer holds for the frontend service.
2. **B1 — auto-release inside `emit()`.** The plan deletes the run entry "when the run completes or its stream closes". The implementation also releases inside `emit()` immediately after listeners run, so runs nobody streams are not retained. This is consistent with the intent but not stated in the plan.
3. **`retryOptimization()` refactored.** The plan did not list changes to the retry flow. It now goes through the shared `trackRun()` helper, which clears and records `runErrors` for retries too.
4. **Extra "completed with unresolved prompts" fallback.** `trackRun()`'s `complete` handler marks any still-processing prompt as failed with the generic message. This step is not in the plan.
5. **`docs/tasks-list.md` modified.** This file is not in the plan's file list.
6. **Test gap vs plan B4/B2.** `retryFailedJob`'s new `registerRun(runId, 1)` has no dedicated service test. Only `triggerOptimization` and `triggerSingleJob` registration are covered.

## Null Safety Issues

None. `Map.get` results are guarded (`this.runs.get(runId)?.seen`, `if (!run) return false`), and `triggerErrorMessage` narrows `unknown` defensively.

## Code Smells

1. **Registry entry leak on enqueue failure** — `optimization.service.ts`: `registerRun` is called before `queue.add`. If `queue.add` throws (Redis down), the entry stays in `runs` forever unless a stream later opens and closes for that `runId`. The leak is small, but it is unbounded over the process lifetime.
2. **Subscribe-after-completion race degrades to a 180 s timeout.** If every job in a run emits before the client's `EventSource` connects (for example a fast failure), the run is already released. The stream then waits the full idle timeout and reports `timedOut`, so the card is marked stalled with no retry offered, even though the DB row is `FAILED`/`COMPLETED`. The missed-event race itself predates this task, since there is no replay on the in-process emitter. The new consequence is the misleading "stalled" state.
3. **Magic strings for user-facing copy** are well extracted into constants. No duplication issues found across the seven template blocks beyond the existing per-section structure.

## Recommendation

- **Fix critical issues before merge.** Exclude quota- and plan-rejected prompts from `retryablePromptTypes`, and clear `runErrors` on a `completed` event. Track the backend `retryFailedJob` quota check as a follow-up.
