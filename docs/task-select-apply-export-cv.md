# Plan: Select Optimization Changes & Export CV

## Context

The optimization process produces AI results across 6 panels. Currently they are display-only. The goal is to let users select specific suggested changes (summary variant, bullet rewrites, missing keywords, cover letter variant), apply them to a modified copy of their CV, and export that CV as PDF or DOCX. Cover letter and interview prep also get their own export as separate documents. Everything is client-side — no server-side rendering.

---

## Phase 1: Shared types

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Add two types (after the existing result types):

```typescript
export type BulletSelectionKey = {
  company: string;
  title: string;
  originalText: string;
};

export type UserSelections = {
  selectedSummaryAngle: SummaryRewriteVariantAngle | null;
  selectedBullets: BulletSelectionKey[];
  selectedKeywords: string[];           // keywords to add to cv.skills
  selectedCoverLetterIndex: number | null;
};
```

---

## Phase 2: Backend — two new endpoints

### 2a. `GET /cv/:id/structured-data`

**File:** `apps/opticv-be/src/app/cv/cv.controller.ts`

Add a `@Get(':id/structured-data')` method. Call `cvExtractionService.extractStructuredData(id, user.id)` — this already handles the cache-hit path when extraction has run. Return `{ data: CvStructuredData }` (same shape as the existing extract endpoint).

No migration needed — `structuredData` column already exists.

### 2b. `PATCH /optimizations/:id/user-output`

**Files:**
- `apps/opticv-be/src/app/optimization/optimization.controller.ts` — add `@Patch(':id/user-output')` method
- `apps/opticv-be/src/app/optimization/optimization.service.ts` — add `saveUserOutput(id, output, userId)`: verify ownership via `include: { application: { select: { userId: true } } }`, then `prisma.optimizationResult.update({ where: { id }, data: { userEditedOutput } })`
- **New file:** `apps/opticv-be/src/app/optimization/dto/save-user-output.dto.ts` — `SaveUserOutputDto` with `@IsString() userEditedOutput: string`

The `userEditedOutput` column already exists in the schema — no migration needed.

---

## Phase 3: Frontend API service

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`

Add two methods:
```typescript
getCvStructuredData(cvId: string): Observable<{ data: CvStructuredData }>
saveUserOutput(optimizationResultId: string, userEditedOutput: string): Observable<void>
```

---

## Phase 4: JobUpload emits CvStructuredData

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts`

Change the `jobSubmitted` output type from `JobApplication` to:
```typescript
output<{ jobApplication: JobApplication; cvData: CvStructuredData }>()
```

In `onSubmit()`, the `extractedData.data` is already available in the subscribe's `next` handler — emit both together. This avoids a duplicate HTTP call from the orchestrator.

---

## Phase 5: CV merge pure function

**New file:** `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`

```typescript
export function applySelectionsToCV(
  cv: CvStructuredData,
  selections: UserSelections,
  summaryResult: SummaryRewriteResult | null,
  bulletResult: BulletUpgradeResult | null,
  keywordResult: KeywordGapResult | null,
): CvStructuredData
```

Logic (operate on `structuredClone(cv)` so the original is never mutated):

1. **Summary**: if `selectedSummaryAngle` is set, find `summaryResult.variants.find(v => v.angle === selectedSummaryAngle)` and replace `clone.summary` with `variant.text`.
2. **Bullets**: for each `BulletSelectionKey` in `selectedBullets`, find the position in `bulletResult.positions` by `company + title`, find `BulletItem` by `originalText`, get `rewrittenText`. Then find the matching `experience` entry in the clone and replace the matching bullet string (use `.trim()` comparison for safety).
3. **Keywords**: for each keyword string in `selectedKeywords`, find the `KeywordGapMissingKeyword` entry. If `suggestedPlacement === 'skills'` (or `'multiple'` as a safe fallback), append to `clone.skills` if not already present.
4. Return the clone.

---

## Phase 6: Orchestrator updates

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

Add signals:
```typescript
readonly cvData = signal<CvStructuredData | null>(null);
readonly jobApplication = signal<JobApplication | null>(null);
readonly selections = signal<UserSelections>({
  selectedSummaryAngle: null,
  selectedBullets: [],
  selectedKeywords: [],
  selectedCoverLetterIndex: null,
});
readonly isExporting = signal(false);
```

Update `runOptimization` to accept `{ jobApplication, cvData }` and set both signals.

Add a `mergedCv` computed:
```typescript
readonly mergedCv = computed(() => {
  const cv = this.cvData();
  if (!cv) return null;
  return applySelectionsToCV(cv, this.selections(), this.summaryRewriteResult(), this.bulletUpgradeResult(), this.keywordGapResult());
});
```

Add `canExportCv` computed (true when at least one CV selection exists):
```typescript
readonly canExportCv = computed(() =>
  this.mergedCv() !== null && (
    this.selections().selectedSummaryAngle !== null ||
    this.selections().selectedBullets.length > 0 ||
    this.selections().selectedKeywords.length > 0
  )
);
```

Add selection handler methods:
- `onAngleSelected(angle: SummaryRewriteVariantAngle)`
- `onBulletToggled(key: BulletSelectionKey)` — toggles key in/out of array
- `onKeywordToggled(keyword: string)` — toggles string in/out of array
- `onCoverLetterVariantSelected(index: number)`

Add export methods (inject `CvExportService`):
- `exportCvAsPdf()`, `exportCvAsDocx()` — use `mergedCv()`
- `exportCoverLetterAsPdf()`, `exportCoverLetterAsDocx()` — cover letter export handled inside `CoverLetterEditor` directly (see Phase 7d)
- `exportInterviewPrep()` — triggered by the interview-prep component output

File name for exports derived from `jobApplication().companyName` + `jobApplication().jobTitle`.

---

## Phase 7: Per-component selection UI

### 7a. SummaryRewrite

**Files:** `components/summary-rewrite/summary-rewrite.ts` + `.html`

- Add `selectedAngle = input<SummaryRewriteVariantAngle | null>(null)`
- Add `angleSelected = output<SummaryRewriteVariantAngle>()`
- Each variant card gets a "Use this variant" `p-button` (or radio). On click, emit `angleSelected`. Active card styled via comparison with `selectedAngle()`.

### 7b. BulletRewriter

**Files:** `components/bullet-rewriter/bullet-rewriter.ts` + `.html`

- Add `selectedBullets = input<BulletSelectionKey[]>([])`
- Add `bulletToggled = output<BulletSelectionKey>()`
- For bullets with `action === 'rewrite'` and a `rewrittenText`, add a checkbox before the "Original" row. Checked state = `selectedBullets().some(b => b.originalText === item.originalText && b.company === pos.company && b.title === pos.title)`. On change emit `bulletToggled`.
- Bullets with `action !== 'rewrite'` get no checkbox.

### 7c. KeywordGap

**Files:** `components/keyword-gap/keyword-gap.ts` + `.html`

- Add `selectedKeywords = input<string[]>([])`
- Add `keywordToggled = output<string>()`
- Only the "Likely have — add to your CV" section (`missingLikelyHas()`) gets checkboxes. Checked = `selectedKeywords().includes(item.keyword)`. On change emit `keywordToggled(item.keyword)`.
- "Skills to acquire or omit" section stays display-only.

### 7d. CoverLetterEditor

**Files:** `components/cover-letter-editor/cover-letter-editor.ts` + `.html`

- Inject `CvExportService` directly (the editor content lives here, so export is cleanest from inside the component)
- Wire the existing disabled "Export to PDF" and "Export to DOCX" buttons by removing `[disabled]="true"` and `pTooltip`; bind `(onClick)="exportAsPdf()"` / `exportAsDocx()`
- Also add `variantSelected = output<number>()` — emitted from the existing `selectVariant()` so the parent can track `selectedCoverLetterIndex`

### 7e. InterviewPrep

**Files:** `components/interview-prep/interview-prep.ts` + `.html`

- Add `exportRequested = output<void>()`
- Add an "Export Interview Prep" `p-button` at the bottom of the template. On click emit `exportRequested`.

---

## Phase 8: Export section in orchestrator template

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Bind the new inputs/outputs on each child component in the accordion.

Add an export section below the accordion (inside a `@if` guard so it only shows when there are results):

```html
@if (canExportCv() || coverLetterResult() || interviewPrepResult()) {
  <div class="border-t border-surface-200 pt-6 mt-6">
    <h3>Export</h3>
    <div class="flex flex-wrap gap-3">
      @if (canExportCv()) {
        <p-button label="Export CV as PDF" (onClick)="exportCvAsPdf()" [loading]="isExporting()" />
        <p-button label="Export CV as DOCX" (onClick)="exportCvAsDocx()" [loading]="isExporting()" />
      } @else {
        <p class="text-sm text-surface-400">Select at least one change above to export a modified CV.</p>
      }
      @if (interviewPrepResult()) {
        <p-button label="Export Interview Prep" (onClick)="exportInterviewPrep()" [loading]="isExporting()" />
      }
    </div>
  </div>
}
```

Cover letter export buttons stay inside `CoverLetterEditor` (Phase 7d).

---

## Phase 9: Install export libraries + CvExportService

Install (root `package.json` `dependencies`, browser-only):
```
npm install jspdf html2canvas docx
```

**New file:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

`@Injectable({ providedIn: 'root' })`, lazy-loads libraries via dynamic `import()` to avoid bloating the initial bundle.

Methods:
- `exportCvAsPdf(cv: CvStructuredData, fileName: string)` — builds PDF using `jspdf` with manual layout: contact block, summary paragraph, experience bullets, skills list, education, certifications. Adds new pages when `y` exceeds threshold.
- `exportCvAsDocx(cv: CvStructuredData, fileName: string)` — uses `docx` package: section headings as `HeadingLevel.HEADING_2`, bullet points as `ListParagraph`, contact as plain paragraphs.
- `exportCoverLetterAsPdf(htmlContent: string, fileName: string)` — renders HTML into a hidden `div`, captures with `html2canvas`, embeds in `jspdf`.
- `exportCoverLetterAsDocx(htmlContent: string, fileName: string)` — strips HTML to plain paragraphs (split on `<p>` tags), builds `docx` document.
- `exportInterviewPrepAsDocx(data: InterviewPrepResult, fileName: string)` — formats questions, suggested answers, traps-to-avoid, questions-to-ask-interviewer, stress tests, and prep tips as structured `docx` document.

Internal download trigger:
```typescript
private triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}
```

---

## Files to create (new)

| File | Purpose |
|------|---------|
| `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` | Pure CV merge function |
| `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` | PDF/DOCX export logic |
| `apps/opticv-be/src/app/optimization/dto/save-user-output.dto.ts` | PATCH body DTO |

## Files to modify (existing)

**Backend:**
- `apps/opticv-be/src/app/cv/cv.controller.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`

**Shared types:**
- `packages/shared/datatypes/src/lib/datatypes.ts`

**Frontend:**
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/summary-rewrite/summary-rewrite.ts` + `.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts` + `.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` + `.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.ts` + `.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.ts` + `.html`
- `package.json` (root) — add `jspdf`, `html2canvas`, `docx`

---

## Verification

1. Run `npm exec nx serve opticv-web` and `npm run start-be:dev`
2. Upload a CV, paste a job description, run optimization
3. In Summary Rewrite panel — click a variant → check it highlights and `selections().selectedSummaryAngle` updates
4. In Bullet Rewriter — check/uncheck bullets → verify toggles work
5. In Keyword Gap — check keywords in "Likely have" section
6. Confirm "Export CV as PDF/DOCX" buttons appear after making at least one selection
7. Click export → verify a file downloads with the correct CV structure and the selected changes applied
8. In Cover Letter Editor — pick a variant → click "Export to PDF" / "Export to DOCX" → verify file downloads
9. In Interview Prep — click "Export Interview Prep" → verify DOCX downloads with all sections
10. Run `npm exec nx typecheck opticv-web` and `npm exec nx typecheck opticv-be` — no errors
