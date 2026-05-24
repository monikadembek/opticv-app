# Implementation Plan — Task 31: Select, Apply & Export Optimized CV

## Pre-Implementation Notes

### Resolved ambiguities from spec review (decisions made for implementation)

- **Keyword textarea visibility:** Hidden until at least one keyword is checked. Shown immediately when first checkbox is ticked.
- **Keyword "Apply" button visibility:** Always visible but disabled until at least one keyword is selected.
- **Bullet re-apply behavior:** Re-applying the same `(positionIndex, bulletIndex)` replaces the existing entry in the session state array (upsert by index pair).
- **State location:** `AppliedEdits` lives as signals on the `CvOptimization` parent component and is passed down via `input()` to panels + `CvExportService`. No separate NgRx store.
- **Export button placement:** Below the accordion panels, grouped together at the bottom of the page.
- **"Apply selected version" button:** Hidden (not just disabled) when no variant is selected.
- **Partial bullet PATCH failure:** On PATCH error, session state is not updated — DB and session may diverge mid-session. This is acceptable (session-only state, no recovery UI required).
- **`OptimizationResult.id` gap:** The SSE event does not include the DB record UUID. A new backend GET endpoint is required to fetch result IDs before the Apply buttons can call PATCH. See Step 1 below.
- **`CvStructuredData` gap:** Not currently available in `CvOptimization`. The `extractCvData()` method already exists in `CvOptimizationApiService` and returns `CvStructuredData`. It must be called and stored as a signal after job application creation.

---

## Implementation Steps

### Step 1 — Backend: Add GET endpoint for optimization results

**File:** `apps/opticv-be/src/app/optimization/optimization.controller.ts`
**File:** `apps/opticv-be/src/app/optimization/optimization.service.ts`

**Why:** The PATCH `/optimizations/{id}/user-output` endpoint requires the `OptimizationResult.id` (DB UUID). This UUID is never sent to the frontend via SSE. A new GET endpoint is needed so the frontend can load result IDs after an optimization run completes.

**New endpoint:** `GET /optimizations/job-applications/:jobApplicationId/results`

- Returns an array of `{ id, promptType, status, userEditedOutput }` for all `OptimizationResult` records belonging to the given `jobApplicationId`.
- Validates that the job application belongs to the authenticated user (same auth check pattern as existing endpoints).
- Response shape (new DTO `OptimizationResultSummaryDto`):
  ```
  id: string
  promptType: PromptType
  status: OutputStatus
  userEditedOutput: string | null
  ```

**New files:**
- `apps/opticv-be/src/app/optimization/dto/optimization-result-summary.dto.ts`

**Modified files:**
- `apps/opticv-be/src/app/optimization/optimization.controller.ts` — add `@Get('job-applications/:jobApplicationId/results')` handler
- `apps/opticv-be/src/app/optimization/optimization.service.ts` — add `getResultSummaries(jobApplicationId, userId)` method using `PrismaService`

---

### Step 2 — Frontend: Extend API service with new methods

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`

**Add method:** `getOptimizationResults(jobApplicationId: string): Observable<OptimizationResultSummary[]>`
- Calls `GET /optimizations/job-applications/{jobApplicationId}/results`

**Add method:** `saveUserOutput(optimizationResultId: string, userEditedOutput: string): Observable<void>`
- Calls `PATCH /optimizations/{optimizationResultId}/user-output`
- Body: `{ userEditedOutput }`

**Add shared type** (in `@opticv/datatypes` or locally in the service file — prefer datatypes if used in both FE and BE):
```
OptimizationResultSummary { id, promptType, status, userEditedOutput }
```

Add to `packages/shared/datatypes/src/lib/datatypes.ts`.

---

### Step 3 — Frontend: Extend `CvOptimization` parent component state

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

**Add signals:**

```
cvStructuredData = signal<CvStructuredData | null>(null)
optimizationResultIds = signal<Map<PromptType, string>>(new Map())  // PromptType → OptimizationResult.id
appliedEdits = signal<AppliedEdits>({ summary: null, keywordsText: null, bullets: [] })
isExportingPdf = signal(false)
isExportingDocx = signal(false)
```

**Add `AppliedEdits` type** (local to this file or in datatypes):
```
AppliedEdits {
  summary: string | null
  keywordsText: string | null
  bullets: AppliedBullet[]   // { positionIndex, bulletIndex, text }
}
```

**Modify `runOptimization()`:** After job application is created and `extractCvData()` completes, store result in `cvStructuredData` signal. The `extractCvData()` call already exists in the service — wire up its response here.

**Add `loadOptimizationResultIds(jobApplicationId)`:** Calls `getOptimizationResults()`, populates `optimizationResultIds` map. Called after `runOptimization()` completes all SSE events (in the `run-complete` handler or after the observable completes).

**Add `applyEdit(promptType, value)` method:** Updates `appliedEdits` signal. Called by child components via `output()`.

**Add `exportPdf()` / `exportDocx()` methods:** Set loading signals, call `CvExportService`, reset loading signals on completion.

---

### Step 4 — Frontend: Update `SummaryRewrite` component

**Files:**
- `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.html`

**Add inputs:**
```
optimizationResultId = input<string | null>(null)
```

**Add outputs:**
```
applied = output<string>()   // emits textarea value on successful Apply
```

**Add local signals:**
```
selectedAngle = signal<SummaryRewriteVariantAngle | null>(null)
editedText = signal<string>('')
isSaving = signal(false)
saveError = signal<string | null>(null)
saveSuccess = signal(false)
```

**Add computed:**
```
selectedVariantText = computed(() => {
  const angle = selectedAngle();
  if (!angle) return null;
  return result().variants.find(v => v.angle === angle)?.text ?? null;
})
```

**Behavior — `selectVariant(angle)`:**
- Sets `selectedAngle` to the new angle.
- Sets `editedText` to the new variant's text (replaces any previous edit).
- Resets `saveError` and `saveSuccess`.

**Behavior — `applySelected()`:**
- Guards: `optimizationResultId()` must be non-null, `selectedAngle()` must be non-null.
- Sets `isSaving(true)`, clears `saveError`.
- Calls `saveUserOutput(optimizationResultId(), editedText())`.
- On success: sets `saveSuccess(true)`, emits `applied.emit(editedText())`, resets `saveSuccess` after 2s.
- On error: sets `saveError` with message, does not emit.
- Always sets `isSaving(false)` in finalize.

**Template changes (`summary-rewrite.html`):**
- Each variant card: add radio button (or clickable highlight) bound to `selectedAngle()`.
- Below variant list: `@if (selectedAngle())` block containing:
  - `<textarea>` bound two-way to `editedText` signal (use signal setter on `(input)` event).
  - "Apply selected version" `<button>` — disabled when `isSaving()`, shows spinner when saving.
  - Inline success message when `saveSuccess()`.
  - Inline error message when `saveError()`.

---

### Step 5 — Frontend: Update `KeywordGap` component

**Files:**
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html`

**Add inputs:**
```
optimizationResultId = input<string | null>(null)
```

**Add outputs:**
```
applied = output<string>()
```

**Add local signals:**
```
selectedKeywords = signal<Set<string>>(new Set())
editedText = signal<string>('')
isSaving = signal(false)
saveError = signal<string | null>(null)
saveSuccess = signal(false)
```

**Add computed:**
```
hasSelection = computed(() => selectedKeywords().size > 0)
```

**Behavior — `toggleKeyword(keyword: string)`:**
- Adds or removes keyword from `selectedKeywords` set (immutable update — create new Set).
- Rebuilds `editedText` from current selection: selected keywords joined by `\n`.
- Only rebuilds textarea if user has not yet manually edited it (track with a `userHasEdited` flag signal).

**Behavior — `onTextareaInput(value: string)`:**
- Sets `editedText(value)`, sets `userHasEdited(true)`.

**Behavior — `applyKeywords()`:**
- Guards: `optimizationResultId()` non-null, `hasSelection()` true.
- Sets `isSaving(true)`.
- Calls `saveUserOutput(optimizationResultId(), editedText())`.
- On success: emits `applied.emit(editedText())`, sets `saveSuccess(true)`, resets after 2s.
- On error: sets `saveError`.
- Always: `isSaving(false)`.

**Template changes (`keyword-gap.html`):**
- Each missing keyword chip: add checkbox. `checked` bound to `selectedKeywords().has(keyword)`, `(change)` calls `toggleKeyword(keyword)`.
- `@if (hasSelection())` block containing:
  - `<textarea>` bound to `editedText()`, `(input)` calls `onTextareaInput($event.target.value)`.
  - "Apply keywords" `<button>` — always rendered, disabled when `!hasSelection() || isSaving()`.
  - Success/error messages.

---

### Step 6 — Frontend: Update `BulletRewriter` component

**Files:**
- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html`

**Add inputs:**
```
optimizationResultId = input<string | null>(null)
```

**Add outputs:**
```
bulletApplied = output<AppliedBullet>()
```

**Add local signals:**
```
// Map key: `${positionIndex}-${bulletIndex}` → { choice: 'original'|'rewrite', editedText: string, saving: boolean, error: string|null, success: boolean }
bulletStates = signal<Map<string, BulletEditState>>(new Map())
```

**Type `BulletEditState`** (local):
```
{ choice: 'original' | 'rewrite'; editedText: string; saving: boolean; error: string | null; success: boolean }
```

**Behavior — `initBulletState(positionIndex, bulletIndex, bullet)`:**
- Called lazily when a `rewrite` bullet is first rendered (via `ngOnInit` or `@for` track).
- Default state: `choice: 'rewrite'`, `editedText: bullet.rewritten ?? ''`.

**Behavior — `selectChoice(key, choice, bullet)`:**
- Updates `bulletStates` entry: sets `choice`, resets `editedText` to `bullet.rewritten` (if rewrite) or `bullet.text` (if original).

**Behavior — `onBulletInput(key, value)`:**
- Updates `editedText` for the given key in `bulletStates`.

**Behavior — `applyBullet(positionIndex, bulletIndex, key)`:**
- Gets current state for key.
- Sets `saving: true` for that entry.
- Serializes the full set of currently-applied bullets (from parent via a read of `appliedEdits` signal — passed as input, or recalculated from all success states in `bulletStates`).
- Calls `saveUserOutput(optimizationResultId(), JSON.stringify(allAppliedBullets))`.
  - `allAppliedBullets` = array of `{ positionIndex, bulletIndex, text }` for all bullets that have `success: true` in `bulletStates`, plus the current one being applied (upsert).
- On success: sets `success: true` for key, emits `bulletApplied.emit({ positionIndex, bulletIndex, text })`.
- On error: sets `error` message for key.
- Always: sets `saving: false`.

**Template changes (`bullet-rewriter.html`):**
- For `action === 'rewrite'` bullets: replace the existing read-only original/rewritten display with:
  - Two radio buttons: "Original" / "AI Rewrite".
  - `<textarea>` showing `bulletStates().get(key)?.editedText`.
  - "Apply" button per bullet — disabled when `saving`.
  - Per-bullet success/error inline messages.
- `action === 'keep_as_is'` and `action === 'recommend_cut'`: unchanged (read-only).

---

### Step 7 — Frontend: Wire outputs in `CvOptimization` parent

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

**Pass new inputs to child components in template:**
```html
<app-summary-rewrite
  [result]="summaryRewriteResult()!"
  [optimizationResultId]="optimizationResultIds().get(PromptType.SUMMARY_REWRITE) ?? null"
  (applied)="onSummaryApplied($event)"
/>

<app-keyword-gap
  [result]="keywordGapResult()!"
  [optimizationResultId]="optimizationResultIds().get(PromptType.KEYWORD_GAP) ?? null"
  (applied)="onKeywordsApplied($event)"
/>

<app-bullet-rewriter
  [result]="bulletUpgradeResult()!"
  [optimizationResultId]="optimizationResultIds().get(PromptType.BULLET_UPGRADE) ?? null"
  (bulletApplied)="onBulletApplied($event)"
/>
```

**Add handler methods in `.ts`:**
- `onSummaryApplied(text: string)` → `appliedEdits.update(e => ({ ...e, summary: text }))`
- `onKeywordsApplied(text: string)` → `appliedEdits.update(e => ({ ...e, keywordsText: text }))`
- `onBulletApplied(bullet: AppliedBullet)` → upserts into `appliedEdits().bullets` array by `(positionIndex, bulletIndex)`.

**Add export buttons to template** (below the accordion):
```html
<button (click)="exportPdf()" [disabled]="isExportingPdf() || !cvStructuredData()">
  @if (isExportingPdf()) { <spinner /> } Export optimized CV to PDF
</button>
<button (click)="exportDocx()" [disabled]="isExportingDocx() || !cvStructuredData()">
  @if (isExportingDocx()) { <spinner /> } Export optimized CV to DOCX
</button>
```

Buttons are disabled (not hidden) when `cvStructuredData()` is null (extraction not complete).

---

### Step 8 — Frontend: Create `CvExportService`

**New file:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

**Pattern:** Follows `CoverLetterExportService` exactly — `providedIn: 'root'`, `isPlatformBrowser` guard, uses `jsPDF` and `docx`.

**Public methods:**
```
exportToPdf(cv: CvStructuredData, edits: AppliedEdits): Promise<void>
exportToDocx(cv: CvStructuredData, edits: AppliedEdits): Promise<void>
```

**Private method `mergeCv(cv, edits): CvStructuredData`:**
- Returns a new `CvStructuredData` object (do not mutate input).
- Summary: if `edits.summary` is non-null, replace `cv.summary`.
- Skills: if `edits.keywordsText` is non-null, split by `/[\n,]/`, trim, filter empty, deduplicate case-insensitively against `cv.skills`, append new ones to `cv.skills`.
- Experience bullets: for each `{ positionIndex, bulletIndex, text }` in `edits.bullets`, replace `cv.experience[positionIndex].bullets[bulletIndex]`.
- All other fields copied unchanged.

**PDF layout (`exportToPdf`):**

Uses `jsPDF` (`new jsPDF({ unit: 'pt', format: 'a4' })`). Single-column layout. Renders sections in this order:

1. **Contact** — Name in large bold, then email · phone · location · LinkedIn · website on one or two lines.
2. **Summary** — Section heading "Summary", paragraph text with word-wrap.
3. **Experience** — Section heading "Experience". For each position: title + company bold, dates right-aligned, location, then bullets as `• text` lines.
4. **Education** — Section heading "Education". Degree + institution bold, dates, field.
5. **Skills** — Section heading "Skills". Comma-separated on one or more lines.
6. **Certifications** — Section heading "Certifications" (omit if empty). Name, issuer, date per line.
7. **Projects** — Section heading "Projects" (omit if empty). Name bold, description, technologies.
8. **Languages** — Section heading "Languages" (omit if empty). Language: proficiency.

Null/empty sections are omitted. Page breaks inserted when `y` exceeds page height minus bottom margin. Output filename: `optimized-cv.pdf`.

**DOCX layout (`exportToDocx`):**

Uses `docx` library. Same section order as PDF. Uses `HeadingLevel.HEADING_2` for section headings, `Paragraph` with `TextRun` for content. Bold names/titles. Bullet points use `bullet` list style. Output filename: `optimized-cv.docx`.

---

## Files Changed / Created

### New files
| Path | Description |
|------|-------------|
| `apps/opticv-be/src/app/optimization/dto/optimization-result-summary.dto.ts` | Response DTO for new GET endpoint |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` | Client-side CV export service |

### Modified files
| Path | Change |
|------|--------|
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | Add `GET job-applications/:jobApplicationId/results` endpoint |
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | Add `getResultSummaries()` method |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `OptimizationResultSummary`, `AppliedBullet`, `AppliedEdits` types |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts` | Add `getOptimizationResults()` and `saveUserOutput()` methods |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add signals, handlers, export methods, load result IDs and CV data |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Wire inputs/outputs to panels, add export buttons |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts` | Add selection/edit/apply logic |
| `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.html` | Add radio buttons, textarea, Apply button |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` | Add checkbox/textarea/apply logic |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` | Add checkboxes, conditional textarea, Apply button |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts` | Add per-bullet toggle/edit/apply logic |
| `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html` | Add radio toggles, textarea, per-bullet Apply button |

---

## Implementation Order

1. **Step 1** (BE endpoint) — unblocks all Apply functionality
2. **Step 2** (API service methods) — unblocks frontend wiring
3. **Step 3** (parent component signals + CV data loading) — unblocks panel inputs
4. **Steps 4–6** (panels in any order — independent of each other)
5. **Step 7** (wire outputs in parent + export buttons)
6. **Step 8** (CvExportService) — can be done in parallel with Steps 4–6
