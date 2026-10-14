# Implementation Plan — Task 119

## Preconditions

- Spec review verdict: **PASS WITH ISSUES** → planning proceeds.
- The review's three critical issues are resolved below in **Resolved Design Decisions** before any step is executed.

## Environment blocker (must clear first)

`df` reports drive `C:` at **100% full (1.2 MB free of 477 GB)**. `nx build`, `nx test` and `prisma generate` will fail. Free disk space before starting; no step in this plan can be verified until then.

---

## Resolved Design Decisions

These close the gaps the spec review flagged. They introduce no requirements beyond the spec.

### D1 — Job-count registry (review Critical Issue 2)

`OptimizationEventBus` gains an in-process run registry: a `Map<runId, { expected: number; seen: Set<PromptType> }>`.

- `registerRun(runId, expected)` — called by the service immediately before it enqueues jobs.
- `emit()` records the prompt type in `seen`.
- `subscribe()` exposes whether the run is complete (`seen.size >= expected`).
- The entry is deleted when the run completes or its stream closes.

Counting **distinct prompt types**, not raw events, resolves the ambiguity the review raised about BullMQ `attempts: 2` re-emitting a terminal event for the same prompt.

This stays in-process, matching the existing `EventEmitter`. That inherits the single-instance constraint already present in the current design (review assumption 6); it is not made worse. Persisting run state across restarts is **out of scope**.

### D2 — Client learns of completion via `run-complete` (review Critical Issue 3)

`streamOptimizationEvents()` currently calls `observer.complete()` on the first `job-complete` event. It must instead:

- emit each `job-complete` event via `observer.next()` without completing,
- register a listener for the `run-complete` event and call `observer.complete()` there,
- keep `es.close()` in the teardown and on error.

This makes one stream carry N results, which the bulk run requires.

### D3 — Frontend work is narrower than the spec implies (review Critical Issue 1)

Already present and to be **reused, not rebuilt**:

- `sectionStatus()` (`cv-optimization.ts:648-657`) already returns `'error'` when a result's status is `'failed'`.
- `retryablePromptTypes` (`:407-434`) already computes retryability.
- `cv-optimization.html` already renders a Retry button per prompt type (lines 162, 242, 297, 359, 409, 453, 496).

The genuine gaps are only:

- `isProcessing` is never cleared on the error path (`:884` only logs),
- no error *message* is ever captured or displayed.

### D4 — FREE tier grants `LINKEDIN: 0` (review assumption 7)

Verified in `TIER_LIMITS` (`datatypes.ts:90-99`): FREE allows `CV_OPTIMIZATION: 1`, `COVER_LETTER: 1`, `INTERVIEW_PREP: 1`, `LINKEDIN: 0`.

Because `QuotaService.checkAndConsume` throws **`FEATURE_NOT_AVAILABLE`** when the limit is `0` (`quota.service.ts:24-32`) and `QUOTA_EXCEEDED` only when a non-zero limit is used up, a FREE user's normal run will **always** produce `FEATURE_NOT_AVAILABLE` for LinkedIn. The client must handle both codes. This is existing intended behavior, not a defect introduced here.

---

## Backend

### Step B1 — Add the run registry to `OptimizationEventBus`

**File:** `apps/opticv-be/src/app/optimization/optimization-event-bus.ts`

- Add a private `Map` keyed by `runId` holding `expected: number` and `seen: Set<PromptType>`.
- Add `registerRun(runId: string, expected: number): void`.
- In `emit()`, add the event's `promptType` to `seen` for that run when the run is registered.
- Add `isRunComplete(runId: string): boolean` returning `seen.size >= expected`; return `false` for an unregistered run so an unknown id never reports complete.
- Add `releaseRun(runId: string): void` deleting the entry.
- Keep `setMaxListeners(50)`.

Guard every registry read against a missing entry — `Map.get` returns `T | undefined`.

### Step B2 — Register runs when enqueuing

**File:** `apps/opticv-be/src/app/optimization/optimization.service.ts`

- In `triggerOptimization()`, call `registerRun(runId, CV_SUBSET_PROMPT_TYPES.length)` before the `queue.add` loop.
- In `triggerSingleJob()`, call `registerRun(runId, 1)` before `queue.add` — but only when the caller did **not** pass an existing `runId`, since a caller-supplied id may belong to a run already registered. When `runId` was supplied, leave the existing registration untouched.
- In `retryFailedJob()`, call `registerRun(runId, 1)` before `queue.add`.
- Inject `OptimizationEventBus` into `OptimizationService` (it is already a provider in `optimization.module.ts:21`, so no module change).

Quota logic is untouched in all three methods.

### Step B3 — Fix stream termination

**File:** `apps/opticv-be/src/app/optimization/optimization.controller.ts`

- Delete the `TOTAL_JOBS` constant (line 40) and the `resolved` counter.
- In the subscribe handler, after writing each `job-complete` event, ask the bus `isRunComplete(runId)`; when true, write `run-complete`, `unsubscribe()`, `releaseRun(runId)`, `res.end()`.
- Add an idle timeout: a timer reset on every event for the run. On expiry, write `run-complete`, `unsubscribe()`, `releaseRun(runId)`, `res.end()`.
- Include a boolean in the `run-complete` payload distinguishing a timeout close from a normal one, so the client can tell the two apart (review Non-Critical 8).
- Clear the timer in the existing `req.on('close')` handler alongside `unsubscribe()`, and call `releaseRun(runId)` there too.
- Keep the `res.writableEnded` guard.

**Idle timeout value: 180 seconds.** Chosen as a concrete value per review Non-Critical 6 — comfortably longer than an OpenAI structured-output call, short enough that a dead worker frees the connection promptly. Define it as a named module constant.

### Step B4 — Backend tests

**File:** `apps/opticv-be/src/app/optimization/optimization.controller.spec.ts` (extend; `describe('streamOptimization')` does not yet exist)

- A run of N jobs ends the response only after N distinct prompt types report.
- A duplicate terminal event for the same prompt type does not end the run early.
- A run with a failed job still reaches completion (terminal includes `'failed'`).
- The idle timeout ends the response and marks the payload as a timeout.
- `req.on('close')` unsubscribes, clears the timer and releases the run.

**File:** `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` (extend)

- `triggerOptimization` registers the run with the CV-subset length and still consumes `CV_OPTIMIZATION` exactly once.
- `triggerSingleJob` with no `runId` registers a run of 1; with a supplied `runId` it does not re-register.

---

## Frontend

### Step F1 — Keep the stream open for the whole run

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`

- In `streamOptimizationEvents()`, remove `observer.complete()` and `es.close()` from the `job-complete` listener; call only `observer.next(parsed)`.
- Add a `run-complete` listener calling `observer.complete()`.
- Leave `es.onerror`, the teardown closure and the `isPlatformBrowser` / `EMPTY` SSR guard exactly as they are.

### Step F2 — Split the trigger into bulk + per-feature calls

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

In `runOptimization()`, keep the whole state-reset block and the `posthog.capture('optimization_started')` call unchanged. Replace the single `from(Object.values(PromptType))` pipeline with two independent subscriptions:

1. **CV subset** — one `runFullOptimizationProcess(jobApplication.id)` call. On success, mark `RESUME_AUTOPSY`, `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE` as processing and subscribe to one stream on the returned `runId`.
2. **Per-feature prompts** — `COVER_LETTER`, `INTERVIEW_PREP`, `LINKEDIN_REWRITE`, each via `runSingleOptimizationProcess`, each opening its own stream.

Both use `takeUntilDestroyed(this.destroyRef)`.

Each trigger must be isolated so one rejection cannot tear down the others (spec §5). Apply `catchError` **per trigger**, inside the merge, so a 403 on one does not unsubscribe the rest — this is the specific defect that made the original `mergeMap` cascade.

Add a module-level constant for the four CV-subset prompt types, mirroring the backend's `CV_SUBSET_PROMPT_TYPES`. Keep `ActivePrompts` as-is; it is still correct for `isProcessingAny`, `hasPartialStoredResults` and `allSectionIds`.

### Step F3 — Clear processing state and capture the error

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

- Add a `runErrors` signal: `Map<PromptType, string>`, reset in `runOptimization()` alongside the other resets.
- On a trigger rejection, clear `isProcessing` for **every** prompt type that trigger covered (all four for the bulk call; the single type otherwise) and record a message for each.
- Message selection from the error body: `QUOTA_EXCEEDED` → out-of-credits wording; `FEATURE_NOT_AVAILABLE` → not-available-on-this-plan wording (required by D4 for LinkedIn on FREE); anything else → a generic failure message. Read the code defensively — the body is `unknown` and every field may be absent.
- In the stream `next` handler, branch on `event.status`: `'completed'` stores the result as today; `'failed'` clears processing and records `event.error` (which is optional — fall back to a generic message).
- In the stream `error` handler, clear processing for that stream's prompt types and record a connection-failure message. It must no longer only `console.error`.
- On `run-complete` with the timeout flag set, clear processing for any prompt type in that run still marked processing, and record a timeout message.

Use `update()` on signals, never `mutate` (conventions §3).

### Step F4 — Surface the message on the card

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

- Add a `runErrors()` message block to each of the seven section bodies, rendered with `@if`, placed next to the existing `'not-started'` message.
- Do **not** add retry buttons — all seven already exist. Do not alter `sectionStatus()` or `retryablePromptTypes`.
- Give the message container `role="alert"` so it is announced (conventions §1, WCAG AA).
- Use `class` bindings only, never `ngClass`; native control flow only.

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css` — add styling for the error text, following the existing `.load-error` / `.retry-action` patterns and meeting AA contrast.

### Step F5 — Suppress retry where it cannot succeed

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

Spec edge case "Worker dies mid-job" requires that retry not be offered when the DB row is stranded in `PROCESSING`, because `retryFailedJob` rejects anything whose status is not `FAILED` (`optimization.service.ts:208-228`).

- In `retryablePromptTypes`, exclude prompt types whose run ended via the idle-timeout path.
- Track those in a dedicated signal set rather than overloading `runErrors`, so the two concerns stay separable.

Prompts that failed normally, or were rejected at trigger time, remain retryable — their rows are `FAILED` or absent, both of which the endpoint accepts.

### Step F6 — Frontend tests

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.spec.ts`

- `streamOptimizationEvents` emits multiple `job-complete` events before completing.
- It completes on `run-complete`.
- SSR still returns `EMPTY`.

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

Existing tests assert one single-job call per active prompt and **will fail** — update them.

- `runOptimization` issues exactly one bulk call plus three single-job calls.
- A 403 on one trigger does not prevent the others from running.
- `QUOTA_EXCEEDED`, `FEATURE_NOT_AVAILABLE` and generic errors each clear processing and record their distinct message.
- A `'failed'` stream event clears processing and records the error.
- A stream error clears processing for that run's prompts.
- A timeout `run-complete` clears processing and suppresses retry for those prompts.
- No prompt remains processing after any terminal outcome, so `pageState` leaves `'processing'`.

---

## Execution Order

1. Clear the disk-space blocker.
2. B1 → B2 → B3 (backend compiles and streams terminate).
3. B4 (backend green).
4. F1 (client consumes a multi-event stream).
5. F2 → F3 (billing fixed, state cleared).
6. F4 → F5 (message visible, retry correct).
7. F6 (frontend green).
8. Full verification.

Backend precedes frontend: F1 depends on the server actually emitting `run-complete`, which only exists after B3.

## Verification

- `npm exec nx run-many -t build`
- `npm exec nx run-many -t lint`
- `npm exec nx run-many -t typecheck`
- `npm exec nx run-many -t test`
- `npm exec nx format:check`

Manual, against a FREE account with `CV_OPTIMIZATION` count reset to 0: one run consumes exactly **one** `CV_OPTIMIZATION` credit; all four CV cards resolve; cover letter and interview prep each consume their own credit; LinkedIn shows the not-available message (D4); no card is left spinning.

## Files

**Modified — backend (5)**

- `apps/opticv-be/src/app/optimization/optimization-event-bus.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`

**Modified — frontend (5)**

- `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

**Created:** none.

**Unchanged:** `optimization.module.ts` (the event bus is already a provider), `optimization.processor.ts`, `quota.service.ts`, `datatypes.ts`, Prisma schema.
