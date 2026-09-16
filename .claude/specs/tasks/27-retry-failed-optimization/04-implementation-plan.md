# Implementation Plan

Task ID: 27-retry-failed-optimization

---

## Resolved Design Decisions (from spec review issues)

### `isRetryable` approach
Use a single `computed<Set<PromptType>>` signal named `retryablePromptTypes` built from all six computed signals and the `results` and `isProcessing` maps. This keeps the template clean — each panel simply checks `retryablePromptTypes().has(PromptType.X)`. No per-call helper function is needed, and the logic is colocated in the component class.

### HTTP pre-SSE failure path
If `runSingleOptimizationProcess` itself errors (HTTP failure before a `runId` is returned), the `error` handler sets `isProcessing` to `false`. Because `results` is not updated, the panel's previous state (the failed SSE entry, or empty map entry) is preserved, keeping the Retry button visible.

### Button position
The Retry button is placed **below** `<app-optimization-result-panel>` in the accordion content, outside the panel component. `OptimizationResultPanel` is not modified. This is consistent across all six panels.

---

## Files Modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add `jobApplicationId` signal, `retryablePromptTypes` computed, `retryOptimization()` method |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Add Retry button block below `<app-optimization-result-panel>` in panels 1–6 |

No new files. No other files touched.

---

## Implementation Steps

### Step 1 — Add `ButtonModule` import to `CvOptimization`

In `cv-optimization.ts`, add `ButtonModule` from `primeng/button` to the `imports` array of the `@Component` decorator.

---

### Step 2 — Add `jobApplicationId` signal

In the `CvOptimization` class body, after the `isProcessing` signal declaration, add:

```
readonly jobApplicationId = signal<string | null>(null);
```

---

### Step 3 — Update `runOptimization` to store `jobApplicationId`

At the top of `runOptimization(jobApplication: JobApplication)`, alongside the existing `results.set(new Map())` and `isProcessing.set(new Map())` resets, add:

```
this.jobApplicationId.set(jobApplication.id);
```

---

### Step 4 — Add `retryablePromptTypes` computed signal

After all existing `computed` signal declarations (after `interviewPrepResult`), add one new `computed<Set<PromptType>>`:

```
readonly retryablePromptTypes = computed<Set<PromptType>>(() => { ... })
```

Logic inside the computed:
- For each of the six typed `PromptType` values (`RESUME_AUTOPSY`, `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE`, `COVER_LETTER`, `INTERVIEW_PREP`):
  - Skip if `jobApplicationId()` is null.
  - Skip if `isProcessing().get(promptType)` is truthy.
  - Include in the set if `results().get(promptType)?.status === 'failed'`.
  - Include in the set if `results().get(promptType)?.status === 'completed'` AND the corresponding computed signal returns `null`.
    - `RESUME_AUTOPSY` → `autopsyResult()`
    - `KEYWORD_GAP` → `keywordGapResult()`
    - `SUMMARY_REWRITE` → `summaryRewriteResult()`
    - `BULLET_UPGRADE` → `bulletUpgradeResult()`
    - `COVER_LETTER` → `coverLetterResult()`
    - `INTERVIEW_PREP` → `interviewPrepResult()`
- Return the resulting `Set<PromptType>`.

Note: `retryablePromptTypes` reads `autopsyResult()` etc. (other computed signals) — Angular's signal graph handles this correctly.

---

### Step 5 — Add `retryOptimization` method

Add a new method to the `CvOptimization` class:

```
retryOptimization(promptType: PromptType): void
```

Implementation:
1. Read `this.jobApplicationId()`. If null, return immediately.
2. `this.isProcessing.update(map => new Map(map).set(promptType, true))`.
3. Call `this.cvOptimizationApiService.runSingleOptimizationProcess(jobApplicationId, promptType)`.
4. Pipe with `switchMap(({ runId }) => this.cvOptimizationApiService.streamOptimizationEvents(jobApplicationId, runId))`.
5. Apply `takeUntilDestroyed(this.destroyRef)`.
6. Subscribe:
   - `next`: set `isProcessing` to `false` for `promptType`, update `results` with the event.
   - `error`: set `isProcessing` to `false` for `promptType` only; do not update `results`.

Use `switchMap` (same as inner pipe in `runOptimization`) so a re-triggered retry for the same `PromptType` cancels the previous in-flight stream. The `isProcessing` flag already prevents double-trigger from the UI, but `switchMap` is the correct RxJS pattern here.

---

### Step 6 — Add Retry button to template (panels 1–6)

For each of the six optimization panels (accordion values "1" through "6"), add the following block **directly after** the closing `</app-optimization-result-panel>` tag:

```
@if (retryablePromptTypes().has(PromptType.X)) {
  <div class="mt-4 flex justify-end">
    <p-button
      label="Retry"
      icon="pi pi-refresh"
      severity="warn"
      [disabled]="isProcessing().get(PromptType.X) ?? false"
      (onClick)="retryOptimization(PromptType.X)"
    />
  </div>
}
```

Replace `PromptType.X` with the correct enum value per panel:
- Panel 1 (ATS Analysis): `PromptType.RESUME_AUTOPSY`
- Panel 2 (Keyword Gap): `PromptType.KEYWORD_GAP`
- Panel 3 (Rewritten Summary): `PromptType.SUMMARY_REWRITE`
- Panel 4 (Bullet Upgrades): `PromptType.BULLET_UPGRADE`
- Panel 5 (Cover Letter): `PromptType.COVER_LETTER`
- Panel 6 (Interview Prep): `PromptType.INTERVIEW_PREP`

Panel 0 (job-upload form) and Panel 7 (LinkedIn, untyped) receive no changes.

---

## Acceptance Checklist

- [ ] `npm exec nx build opticv-web` passes.
- [ ] `npm exec nx typecheck opticv-web` passes.
- [ ] `npm exec nx lint opticv-web` passes.
- [ ] Retry button appears when SSE status is `'failed'`.
- [ ] Retry button appears when SSE status is `'completed'` but the computed signal is `null`.
- [ ] Retry button is not shown before any run is initiated.
- [ ] Retry button is not shown while the panel is processing.
- [ ] Retry button disappears after a successful retry that returns valid data.
- [ ] Clicking Retry calls only the single `PromptType` API endpoint; other panels are unaffected.
- [ ] Rapid double-click is prevented (button disabled once `isProcessing` is true).
- [ ] HTTP error before SSE (no `runId`) leaves button visible.
- [ ] SSE network error leaves button visible.
- [ ] No `any` types introduced.
