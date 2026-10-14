# Task Specification

## Source

Azure DevOps Task: 119 — CV optimization billing bug + stuck spinner

## Goal

Fix three defects in the CV optimization run flow:

1. **Billing** — a single logical run charges the `CV_OPTIMIZATION` quota four times instead of once, making it impossible for a FREE-tier user (limit 1) to complete a run.
2. **UI** — a failed or never-arriving job leaves its card spinning indefinitely with no error surfaced.
3. **SSE leak** — the stream endpoint's termination condition can never be satisfied, so every run leaks an event-bus listener and an open HTTP connection until the client disconnects.

## Context

- Frontend trigger: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` → `runOptimization()` (~line 804)
- Frontend API client: `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`
- Backend service: `apps/opticv-be/src/app/optimization/optimization.service.ts`
- Backend controller (SSE): `apps/opticv-be/src/app/optimization/optimization.controller.ts`
- Quota: `apps/opticv-be/src/app/quota/quota.service.ts`, limits in `packages/shared/datatypes/src/lib/datatypes.ts` (`TIER_LIMITS`)

### Current behavior (root cause)

`runOptimization()` iterates `ActivePrompts` (all **7** prompt types, `cv-optimization.ts:157-165`) and calls the **single-job** endpoint once per prompt via `runSingleOptimizationProcess()`. Each call independently invokes `QuotaService.checkAndConsume()` (`optimization.service.ts:159`).

`PROMPT_TYPE_TO_FEATURE` (`optimization.service.ts:28-36`) maps the four CV-subset prompts — `RESUME_AUTOPSY`, `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE` — all to the single feature `CV_OPTIMIZATION`. The remaining three map to their own features: `COVER_LETTER`, `INTERVIEW_PREP`, `LINKEDIN`.

On FREE tier (`CV_OPTIMIZATION: 1`) the observed sequence is: first CV-subset call consumes the credit and returns 202; the next returns 403 `QUOTA_EXCEEDED`; the RxJS `mergeMap` stream then tears down on that error, cancelling the rest.

The bulk endpoint `POST /run` (`triggerOptimization`, `optimization.service.ts:76-136`) already does the right thing for the CV subset: one `checkAndConsume` for `CV_OPTIMIZATION`, then queues all four jobs under one `runId`. The UI never calls it.

### Current behavior (SSE)

`optimization.controller.ts:40` defines `TOTAL_JOBS = Object.values(PromptType).length` → **7**. The stream (`:219-236`) increments `resolved` per event on one `runId` and only calls `unsubscribe()` + `res.end()` when `resolved === TOTAL_JOBS`. Because today every prompt gets its own `runId` and its own stream, `resolved` never exceeds 1 and **no stream ever terminates server-side**. Cleanup happens only via the `req.on('close')` handler when the client goes away.

## Scope

### In scope

- Rework `runOptimization()` to call the bulk `/run` endpoint once for the four CV-subset prompts, and continue calling the single-job endpoint for `COVER_LETTER`, `INTERVIEW_PREP` and `LINKEDIN_REWRITE`.
- Make the SSE stream terminate deterministically based on the number of jobs actually queued for that run.
- Clear per-card processing state and surface an error message whenever a job fails or a trigger request is rejected.
- Expose the existing free retry path for cards in a failed state.
- Unit tests covering the new trigger sequencing, stream termination, and error-state handling.

### Out of scope

- Any change to `TIER_LIMITS` values or tier definitions.
- Refunding quota when a job fails after consumption (quota is consumed at trigger time; failed jobs remain chargeable). Tracked separately.
- BullMQ queue retention settings (`removeOnComplete` / `removeOnFail`) and Redis cost tuning. Tracked separately.
- Reaping `optimization_results` rows stranded in `PROCESSING` by a process restart.
- Any redesign of the results UI beyond the error/retry affordances described here.

## Behavior

### Triggering a run

1. User submits the job application form. `runOptimization()` resets all run-scoped state exactly as it does today.
2. The component issues **one** `POST /optimizations/job-applications/:id/run` request. This consumes one `CV_OPTIMIZATION` credit and queues the four CV-subset jobs under a single `runId`.
3. The component marks the four CV-subset prompts as processing and opens **one** SSE stream for the returned `runId`.
4. For each of `COVER_LETTER`, `INTERVIEW_PREP` and `LINKEDIN_REWRITE`, the component issues a separate `POST /run/:promptType` request, each billing its own feature, and opens a stream for its `runId` as it does today.
5. A failure of any one trigger request must not cancel the others. Each trigger and its stream are handled independently so one rejection cannot tear down the rest.

### Receiving results

6. Each `job-complete` event carries `status: 'completed' | 'failed'`. The frontend must branch on `status` rather than treating every event as success.
7. On `completed`: clear processing for that prompt type and store the result, as today.
8. On `failed`: clear processing for that prompt type and record the event's `error` as that card's error state.
9. A stream must remain open until every job in its run has reported. The current client closes the `EventSource` after the first event; for the bulk stream it must instead stay subscribed until the server signals `run-complete` or the stream errors.

### Stream termination (server)

10. A run must record how many jobs it queued, and the stream must close once that many **terminal** events (completed or failed) have been observed for the run — not a hard-coded count of all prompt types.
11. An idle timeout acts as a backstop: if no event arrives for the run within the timeout, the server emits `run-complete`, unsubscribes and ends the response, so a crashed or stalled worker cannot hold the connection open indefinitely.
12. `req.on('close')` cleanup remains.

### Error presentation

13. When a trigger request is rejected, the affected prompt cards clear their spinner and show the failure reason.
14. A 403 with `code: 'QUOTA_EXCEEDED'` shows a quota-specific message naming the feature that ran out, rather than a generic failure.
15. A card in a failed state exposes the existing retry action, which calls `POST /retry/:promptType`. That endpoint is free — it consumes no quota — and accepts only results whose status is `FAILED` or which do not yet exist (`optimization.service.ts:208-228`).

## Edge Cases

- **Partial quota exhaustion** — the CV-subset run succeeds while `COVER_LETTER` is rejected for its own quota. The four CV cards must proceed normally; only the cover letter card shows the quota error.
- **All quota exhausted** — every trigger is rejected. No spinner may remain; each card shows its error and the page must not stay in the `processing` state (`pageState`, `cv-optimization.ts:348-351`).
- **Job fails after a successful trigger** — the worker writes `FAILED` and emits `status: 'failed'`. The card shows the error and offers the free retry.
- **Worker dies mid-job** — no terminal event is ever emitted. The idle timeout must close the stream; affected cards must leave the processing state rather than spinning forever. Note the DB row stays `PROCESSING` (out of scope), so the free retry path will reject it — the card must not present retry as available in that case.
- **Stream errors or the connection drops** — affected cards clear processing and show a connection error; the run is not silently abandoned mid-spinner.
- **Duplicate trigger while a run is in flight** — behavior is unchanged from today; `runOptimization()` resets state and starts a new run, and quota is consumed again.
- **SSR** — `streamOptimizationEvents()` returns `EMPTY` outside the browser (`cv-optimization-api.service.ts:108-110`); this must be preserved.

## Data / API

No database schema changes. No changes to `TIER_LIMITS`.

### Endpoints (all existing; no new routes)

| Endpoint | Change |
| --- | --- |
| `POST /api/optimizations/job-applications/:id/run` | Now called by the UI. Behavior unchanged: one `CV_OPTIMIZATION` charge, queues the 4 CV-subset jobs under one `runId`. |
| `POST /api/optimizations/job-applications/:id/run/:promptType` | Still used, but only for `COVER_LETTER`, `INTERVIEW_PREP`, `LINKEDIN_REWRITE`. Behavior unchanged. |
| `GET /api/optimizations/job-applications/:id/stream?runId=…` | Termination condition changes from the fixed `TOTAL_JOBS` (7) to the number of jobs queued for that run, plus an idle-timeout backstop. |
| `POST /api/optimizations/job-applications/:id/retry/:promptType` | Unchanged. Surfaced in the UI for failed cards. |

### Models

- `OptimizationJobEvent` (`optimization.types.ts`) already carries `status` and `error`; no change required.
- `SseJobCompleteEvent` (`cv-optimization-api.service.ts:22-27`) already mirrors it; no change required.
- The server needs to associate a queued-job count with a `runId` so the stream knows when a run is complete. The mechanism is an implementation decision for the plan stage.

## Assumptions

- The four CV-subset prompts billing as one `CV_OPTIMIZATION` unit is intended, and the other three billing separately is also intended. This spec preserves both.
- `ActivePrompts` (frontend, all 7) and `CV_SUBSET_PROMPT_TYPES` (backend, 4) are both correct for their purposes; the bug is that the UI used the wrong endpoint, not that either list is wrong.
- Quota consumed by a run that later fails is not refunded. Confirmed out of scope here.
- The idle-timeout duration is not specified by the task; a concrete value is to be chosen at plan stage, long enough not to cut off a legitimately slow OpenAI call.

## Acceptance (DEV)

- `npm exec nx run-many -t build` passes.
- `npm exec nx run-many -t lint` passes.
- `npm exec nx run-many -t typecheck` passes.
- `npm exec nx run-many -t test` passes.
- A FREE-tier user with `CV_OPTIMIZATION` count 0 can complete a full CV-subset run: exactly **one** credit is consumed and all four cards resolve.
- No card remains in a processing state after its run reaches a terminal outcome, for both success and failure paths.
- A 403 `QUOTA_EXCEEDED` renders a quota-specific message on the affected cards, not a spinner.
- The SSE stream closes server-side once a run's queued jobs have all reported, verified by the listener being removed and the response ended.
- Existing tests in `cv-optimization.spec.ts` and `cv-optimization-api.service.spec.ts` are updated to match the new trigger sequencing; tests asserting one single-job call per active prompt will need revision.
- No breaking changes to endpoint contracts.
