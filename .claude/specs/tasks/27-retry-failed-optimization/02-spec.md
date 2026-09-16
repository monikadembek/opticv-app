# Task Specification

## Source

Azure DevOps Task: 27 — Add functionality to retry failed optimization run

## Goal

Add a per-panel "Retry" button to each optimization accordion panel. The button appears only when the optimization has failed (SSE status `'failed'`) or when the SSE status was `'completed'` but the parsed result failed the type-guard check (i.e. the computed signal returns `null`). Clicking Retry re-runs only that single `PromptType` without re-running the others.

## Context

The feature lives in `apps/opticv-web/src/app/features/cv-optimization/`.

`CvOptimization` component (`cv-optimization.ts`) manages all state via two signals:

- `results: Signal<Map<PromptType, SseJobCompleteEvent>>` — keyed by `PromptType`, holds the raw SSE event.
- `isProcessing: Signal<Map<PromptType, boolean>>` — tracks in-flight state per `PromptType`.

Computed signals (`autopsyResult`, `keywordGapResult`, etc.) apply type-guards to the raw `result` field and return `null` when the data is missing or malformed.

A full optimization run requires `jobApplication.id` (string), which is currently only available within `runOptimization(jobApplication)` — it is not stored in component state.

## Scope

### In scope

- Store `jobApplicationId` as a component signal after a run is initiated, so retry can reference it.
- Add a `retryOptimization(promptType: PromptType): void` method to `CvOptimization` that runs `runSingleOptimizationProcess` + `streamOptimizationEvents` for one `PromptType` only, with the same signal-update logic as the existing `runOptimization`.
- Add a "Retry" button inside each accordion panel's content area (inside the `<app-optimization-result-panel>` or alongside it), visible only when the panel is in a retryable state.
- The button must be disabled/hidden while a retry (or the original run) for that panel is processing.

### Out of scope

- Backend changes.
- Retrying all panels at once.
- Changing the initial full optimization flow.
- The LinkedIn Updates panel (value "7") — it does not yet use a typed computed signal; keep it as-is.

## Behavior

1. When `runOptimization(jobApplication)` is called, store `jobApplication.id` in a new `jobApplicationId` signal (`signal<string | null>(null)`), reset on each new submission alongside `results` and `isProcessing`.

2. A panel is in **retryable state** when ALL of the following are true:
   - `jobApplicationId()` is not null (a run has been started).
   - `isProcessing().get(promptType)` is falsy (not currently processing).
   - The panel has a result entry OR has been started but the computed signal is `null` — concretely:
     - `results().get(promptType)?.status === 'failed'`, **OR**
     - `results().get(promptType)?.status === 'completed'` and the corresponding computed signal returns `null` (invalid data shape).

3. A `retryOptimization(promptType: PromptType)` method is added to the component:
   - Guards early if `jobApplicationId()` is null.
   - Sets `isProcessing` to `true` for that `promptType`.
   - Calls `runSingleOptimizationProcess(jobApplicationId(), promptType)`.
   - On success, opens `streamOptimizationEvents(jobApplicationId(), runId)`.
   - On `next` event: sets `isProcessing` to `false` and updates `results` for that `promptType`.
   - On `error`: sets `isProcessing` to `false`; does **not** update `results` (keeps the previous failed entry so the Retry button remains visible).
   - Uses `takeUntilDestroyed(this.destroyRef)` for cleanup.

4. In the template, each optimization panel (values "1"–"6") gains a "Retry" button inside its `<p-accordion-content>`:
   - Rendered with `@if (isRetryable(promptType))` using a helper `computed` or inline template expression.
   - Calls `retryOptimization(promptType)` on click.
   - Is disabled while `isProcessing().get(promptType)` is truthy.
   - Styled with PrimeNG `p-button` (severity `"warn"` or `"secondary"`) with an icon (e.g. `pi pi-refresh`).
   - Positioned below the `<app-optimization-result-panel>` content, or inside an error state slot if the panel exposes one.

5. The button is **not shown** when:
   - No run has been initiated yet (`jobApplicationId()` is null).
   - The panel is currently processing.
   - The result is `'completed'` and the computed signal returned a valid (non-null) value.

## Edge Cases

- If `retryOptimization` is called while `jobApplicationId` is null (e.g. state was reset), the method returns immediately — no API call is made.
- A retry resets only the specific `PromptType` entry in `isProcessing`; all other panels are unaffected.
- If the stream errors (network failure), the button must remain visible so the user can retry again.
- Rapid double-click: the button is disabled immediately on first click (via the `isProcessing` flag), preventing duplicate requests.

## Data / API

No new API endpoints. Retry reuses:

- `POST /api/optimizations/job-applications/{jobApplicationId}/run/{promptType}` → `{ runId: string }`
- `GET /api/optimizations/job-applications/{jobApplicationId}/stream?runId={runId}&token={token}` (SSE)

Both are already implemented in `CvOptimizationApiService`.

## Implementation Notes

- Add `readonly jobApplicationId = signal<string | null>(null)` to `CvOptimization`.
- Add a helper `isRetryable(promptType: PromptType, computedResult: unknown): boolean` — pure function or inline logic — to keep template expressions readable. Alternatively, expose one `computed<Set<PromptType>>` of all retryable types.
- Do not add the Retry button to panel "0" (the job-upload form) or panel "7" (LinkedIn, untyped).
- Follow existing `takeUntilDestroyed` + `switchMap` patterns from `runOptimization`.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`).
- Type-check passes (`npm exec nx typecheck opticv-web`).
- Lint passes (`npm exec nx lint opticv-web`).
- Retry button appears when SSE status is `'failed'`.
- Retry button appears when SSE status is `'completed'` but the computed signal returns `null`.
- Retry button is absent while the panel is processing.
- Retry button is absent after a successful retry that returns valid data.
- Clicking Retry re-issues only the single `PromptType` API call; other panels are unaffected.
- Retry button is not shown before any run has been initiated.
- No `any` types introduced.
