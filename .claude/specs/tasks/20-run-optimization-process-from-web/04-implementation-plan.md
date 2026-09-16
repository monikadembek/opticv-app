# Implementation Plan

## Task
20 — Trigger optimization process from web, wait for runId and listen to SSE (FE)

## Pre-implementation findings (resolving spec critical issues)

### Critical Issue #1 — Guard scope
**Decision:** Modify the existing `SupabaseGuard.canActivate` directly to fall back to `request.query['token']` when the `Authorization` header is absent. No new guard class or decorator is needed.

### Critical Issue #2 / Review finding #6 — `run-complete` will never fire for single-job runs
`TOTAL_JOBS = Object.values(PromptType).length` = 7 in the controller. The `resolved` counter per SSE connection increments only when a `job-complete` event arrives for that `runId`. A single-job run enqueues 1 job → emits 1 `job-complete` → `resolved = 1` which never equals 7 → `run-complete` is never written.

**Decision:** The frontend must close the `EventSource` after receiving the single `job-complete` event (i.e., call `observer.complete()` + `es.close()` inside the `job-complete` handler, not inside a `run-complete` handler). Do not rely on `run-complete` for single-job runs.

### Critical Issue #2 — `result` shape
`result` is polymorphic: a parsed JSON object (when `promptVersion.outputSchema !== null`) or a plain string (when `outputSchema === null`). The template will use `| json` pipe as a temporary display for all types. This is intentional; proper per-type rendering is a follow-up task.

---

## Files to change

| File | Type |
|------|------|
| `apps/opticv-be/src/app/auth/supabase.guard.ts` | Modify |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts` | Modify |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Modify |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Modify |

---

## Step 1 — Backend: extend `SupabaseGuard` to accept JWT from query param

**File:** `apps/opticv-be/src/app/auth/supabase.guard.ts`

In `canActivate`, replace the current hard-fail on missing `Authorization` header with a two-source token resolution:

1. If `Authorization` header is present and starts with `'Bearer '`, extract the token from it.
2. Otherwise, check `request.query['token']` — if it is a non-empty string, use that.
3. If neither source yields a token, throw `UnauthorizedException`.

The rest of `canActivate` (Supabase JWT validation, `upsertUser`, setting `request.user`) is unchanged.

The `Request` type from Express already has `query` typed as `ParsedQs`; cast `request.query['token']` to `string` with a `typeof` guard before use.

---

## Step 2 — Frontend service: add `SseJobCompleteEvent` type and `streamOptimizationEvents()`

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`

### 2a — Add local interface (top of file, after imports)

```
export interface SseJobCompleteEvent {
  promptType: PromptType;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
```

Import `PromptType` from `@opticv/datatypes` (already imported for other uses — verify it is present).

### 2b — Add injected dependencies to the service class

Inject into the service (using `inject()` function, not constructor):
- `PLATFORM_ID` (from `@angular/core`)
- `Supabase` service (from `../../../core/auth/services/supabase`)

### 2c — Add `streamOptimizationEvents()` method

Signature: `streamOptimizationEvents(jobApplicationId: string, runId: string): Observable<SseJobCompleteEvent>`

Logic:
1. If `!isPlatformBrowser(this.platformId)` → return `EMPTY`.
2. Return `new Observable<SseJobCompleteEvent>(observer => { ... })`.
3. Inside the observable factory:
   - Read `this.supabase.currentSession()?.access_token ?? ''` into `token`.
   - Construct URL: `${environment.apiUrl}/optimizations/job-applications/${jobApplicationId}/stream?runId=${runId}&token=${token}`.
   - Create `const es = new EventSource(url)`.
   - Register `es.addEventListener('job-complete', (e: MessageEvent) => { ... })`:
     - Parse `e.data` with `JSON.parse` → cast to `SseJobCompleteEvent`.
     - Call `observer.next(parsed)`.
     - Call `observer.complete()` and `es.close()` immediately after (single-job run — stream ends after one event).
   - Register `es.onerror = (err) => { observer.error(err); es.close(); }`.
   - Return teardown: `() => es.close()`.

Imports to add: `PLATFORM_ID`, `isPlatformBrowser` (from `@angular/common`), `EMPTY`, `Observable` (from `rxjs`).

---

## Step 3 — Component: wire run → stream per PromptType

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### 3a — Add/update class fields

- Remove the unused `runId = ''` property.
- Remove the unused `streaming` signal (if not referenced in the template — verify first).
- Change `results` signal type to `Map<PromptType, SseJobCompleteEvent>` (import `SseJobCompleteEvent` from the service).
- Add `readonly PromptType = PromptType` property to expose the enum to the template.
- Inject `DestroyRef` (from `@angular/core`) using `inject()`.

### 3b — Rewrite `runOptimization()`

```
runOptimization(jobApplication: JobApplication): void {
  this.results.set(new Map());

  from(Object.values(PromptType)).pipe(
    mergeMap(
      (promptType) =>
        this.cvOptimizationApiService
          .runSingleOptimizationProcess(jobApplication.id, promptType)
          .pipe(
            switchMap(({ runId }) =>
              this.cvOptimizationApiService.streamOptimizationEvents(
                jobApplication.id,
                runId,
              )
            ),
          ),
      3,
    ),
    takeUntilDestroyed(this.destroyRef),
  ).subscribe({
    next: (event: SseJobCompleteEvent) => {
      this.results.update((map) => new Map(map).set(event.promptType, event));
    },
    error: (err) => console.error('Optimization stream error', err),
  });
}
```

Concurrency is bounded to 3 simultaneous PromptType runs via the `mergeMap` concurrency parameter.

### 3c — Imports to add/update

- `from`, `mergeMap`, `switchMap` from `rxjs`
- `takeUntilDestroyed` from `@angular/core/rxjs-interop`
- `DestroyRef` from `@angular/core`
- `SseJobCompleteEvent` from the service file
- `PromptType` from `@opticv/datatypes` (likely already imported)

---

## Step 4 — Template: render results per PromptType

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Add `JsonPipe` to the component's `imports` array in `cv-optimization.ts`.

For each of the 7 accordion panels, replace the static "Coming soon" content with a conditional block using Angular's native `@if` / `@else` control flow:

```
@if (results().get(PromptType.RESUME_AUTOPSY); as r) {
  <pre class="whitespace-pre-wrap text-sm">{{ r.result | json }}</pre>
} @else {
  <p class="m-0">Coming soon</p>
}
```

Apply the same pattern to the remaining 6 panels with their respective `PromptType` values:
- Panel 1: `PromptType.RESUME_AUTOPSY`
- Panel 2: `PromptType.KEYWORD_GAP`
- Panel 3: `PromptType.SUMMARY_REWRITE`
- Panel 4: `PromptType.BULLET_UPGRADE`
- Panel 5: `PromptType.COVER_LETTER`
- Panel 6: `PromptType.INTERVIEW_PREP`
- Panel 7: `PromptType.LINKEDIN_REWRITE`

The "ATS analysis" panel (currently "Coming soon — ATS match score / ATS autopsy") does not map to a current `PromptType` — leave it unchanged.

---

## Step 5 — Verify

1. Run `npm exec nx run-many -t typecheck` — must pass with zero errors.
2. Start BE (`npm run start-be:dev`) and FE (`npm exec nx serve opticv-web`).
3. Log in, navigate to CV Optimization page.
4. Submit the job upload form.
5. Browser DevTools → Network → EventStream: verify 7 SSE connections open, each closes after one `job-complete` event.
6. Verify all 7 accordion panels update with result content (no longer show "Coming soon").
7. Navigate away from the page: all SSE connections must show as cancelled/closed in the Network tab.
8. Re-submit the form: accordion panels clear and reload with fresh results.
9. Confirm no TypeScript `any` usage introduced.
