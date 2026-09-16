# Task Specification

## Source
Azure DevOps Task: 20 — Trigger optimization process from web, wait for runId and listen to SSE (FE)

## Goal
After the job upload form submits successfully (job application created + CV data extracted), the frontend must:
1. Trigger a single-type optimization run per `PromptType` and receive a `runId`.
2. Open an SSE connection to stream `OptimizationJobEvent` results.
3. Display the streamed result text live inside the relevant accordion panel as each job completes.

## Context
The `cv-optimization` page already handles form submission via `JobUpload` and emits a `JobApplication` on success. The backend exposes:
- `POST /optimizations/job-applications/:id/run/:promptType` → `{ runId: string }`
- `GET /optimizations/job-applications/:id/stream?runId=…` — SSE stream emitting `job-complete` events (`OptimizationJobEvent`) and a final `run-complete` event.

The `SupabaseGuard` on the backend only reads the JWT from `Authorization: Bearer` header. `EventSource` cannot set custom headers, so the backend SSE endpoint needs a small modification to also accept the token via a `token` query param.

## Scope

### In scope
- Trigger `runSingleOptimizationProcess` (one call per `PromptType`, sequentially or in parallel — see Behavior).
- Implement `streamOptimizationEvents()` in `CvOptimizationApiService` using native `EventSource` wrapped in an Observable, guarded with `isPlatformBrowser` for SSR.
- Update `SupabaseGuard` (or extract a variant) to also accept a JWT from the `token` query param — applied only to the SSE stream endpoint.
- Consume the stream in `CvOptimization` component: store results in the `results` signal map keyed by `PromptType`.
- Display each result's text inside the corresponding accordion panel, replacing the "Coming soon" placeholder.
- Handle `run-complete` event to mark streaming as finished.
- Handle SSE `error` events gracefully (log, set error state in signal).

### Out of scope
- Triggering all 7 PromptTypes at once via the full-run endpoint (`/run` without `:promptType`).
- Streaming partial/chunk tokens (results arrive as complete strings, not token-by-token).
- Persistent storage or page-reload recovery of results.
- UI polish / design beyond showing the result text in the panel.

## Behavior

### Step-by-step flow

1. User fills the form and submits → `JobUpload` emits `jobSubmitted` with the `JobApplication`.
2. `CvOptimization.runOptimization()` is called.
3. For **each** of the 7 `PromptType` values (in order or in parallel):
   a. Call `POST /optimizations/job-applications/:id/run/:promptType` — receives `{ runId }`.
   b. Immediately open an SSE connection: `GET /optimizations/job-applications/:id/stream?runId=<runId>&token=<access_token>`.
   c. On `job-complete` event: update `results` signal map — `results.update(map => new Map(map).set(event.promptType, event))`.
   d. On `run-complete` event (for that single-job run, fired right after the one job completes): close the `EventSource`.
   e. On SSE error: log the error, close the `EventSource`.
4. As each result lands in the `results` map, the corresponding accordion panel renders the result text.

> **Note:** Because the backend `run-complete` fires after `TOTAL_JOBS` completions (`Object.values(PromptType).length === 7`), and each single-job run has only 1 job, the `run-complete` fires immediately after the single `job-complete`. The frontend should close the stream upon receiving `run-complete` or upon the `EventSource` closing naturally.

### Template binding
Each accordion panel checks `results().get(PromptType.X)` and renders the text output if present, otherwise shows the existing "Coming soon" text.

## Edge Cases

- **SSR guard:** `EventSource` is browser-only. Wrap in `isPlatformBrowser` check; return `EMPTY` on the server.
- **Unauthenticated / expired token:** SSE will return 401; `EventSource.onerror` fires → observer errors → component logs error.
- **Component destroyed before stream completes:** The Observable teardown (returned from `new Observable`) closes the `EventSource`. Use `takeUntilDestroyed()` in the component to unsubscribe when the component is destroyed.
- **Multiple form submissions:** Re-submitting resets the `results` signal map to an empty `Map` before triggering new runs.

## Data / API

### Backend change — `SupabaseGuard` token from query param

**File:** `apps/opticv-be/src/app/auth/supabase.guard.ts`

Modify `canActivate` to fall back to `request.query['token']` when the `Authorization` header is absent:

```
token = authHeader?.slice(7) ?? request.query['token']
```

Apply this only when the token source is a query param (consider a decorator or a separate guard variant scoped to the SSE endpoint to avoid broadening auth surface area).

### Frontend — new method in `CvOptimizationApiService`

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`

```
streamOptimizationEvents(jobApplicationId: string, runId: string): Observable<MessageEvent>
```

- Inject `PLATFORM_ID` and `Supabase` service.
- On browser: construct URL with `?runId=<runId>&token=<access_token>`.
- Create `EventSource`, map `onmessage` / `onerror` to observer, close on teardown.
- Listen to named events `job-complete` and `run-complete` using `eventSource.addEventListener`.

### Shared types

No changes needed. `OptimizationJobEvent` from `optimization.types.ts` is backend-only; the frontend receives raw `MessageEvent.data` (JSON string) and parses it. Add a local type alias in the service or component if needed:

```typescript
// local, frontend-only
export interface SseJobCompleteEvent {
  promptType: PromptType;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
```

### SSE events (existing backend, no change)

| Event name    | Payload fields                                        |
|---------------|-------------------------------------------------------|
| `job-complete`| `{ promptType, status, result?, error? }`             |
| `run-complete`| `{ runId, completedAt }`                              |

## Key files

| File | Change |
|------|--------|
| `apps/opticv-be/src/app/auth/supabase.guard.ts` | Accept JWT from `token` query param (SSE auth) |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts` | Add `streamOptimizationEvents()` using `EventSource` Observable |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Call run + stream per PromptType; update `results` signal |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Render result text in each accordion panel |

## Acceptance (DEV)

- Build passes: `npm exec nx run-many -t typecheck build`
- Start BE + FE, submit the job upload form
- Browser DevTools → Network → EventStream: one SSE connection per PromptType opens and closes after receiving `run-complete`
- Each accordion panel updates with the returned text as results arrive (no "Coming soon" for completed types)
- Navigate away from the page: all `EventSource` connections close (verified in Network tab — no lingering connections)
- Resubmit the form: previous results are cleared and new ones load correctly
- No TypeScript errors, no `any` usage
