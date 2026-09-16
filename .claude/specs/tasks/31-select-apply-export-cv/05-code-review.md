# Code Review — Task 31: Select, Apply & Export Optimized CV

## Summary

- **Overall result: PASS WITH ISSUES**
- The core architecture — top-down selection ownership, `mergedCv` computed signal, client-side export — is sound and well-executed. The backend GET endpoint is correctly secured and follows existing patterns. The export service covers all required sections. However, there are several spec deviations (no Apply/PATCH flow, no per-variant persistence, export always allowed regardless of CV data readiness) and a handful of leftover debug artifacts that must be cleaned up before merge.

---

## Conventions Violations

### Critical (must fix before merge)

1. **`console.log` statements left in production code** — `cv-optimization.ts` lines 227, 271, 324, 361 and `summary-rewrite.ts` line 69. Convention: no debug logging in production code.

2. **`effect()` used for logging in constructor** — `cv-optimization.ts` lines 225–228. The `effect(() => console.log('mergedCv(): ', this.mergedCv()))` block is a debug trace, not a production side-effect. Remove entirely.

3. **`JsonPipe` imported but only used for the LinkedIn panel's raw JSON dump** — `cv-optimization.ts` line 11 / template line 327. The LinkedIn panel renders raw `| json` output in a `<pre>` tag — this is a dev-only view, not production UI. The import itself is not a convention violation, but the raw JSON display in the template (`cv-optimization.html` line 327) bypasses `OptimizationResultPanel` and is inconsistent with all other panels.

4. **`const ActivePrompts = [PromptType.KEYWORD_GAP]`** — `cv-optimization.ts` line 105. This constant gates the optimization run to only `KEYWORD_GAP`. It was `[PromptType.SUMMARY_REWRITE]` in the previous commit and is now narrowed to a single type. This appears to be a development leftover — the optimization should run all prompt types (or at least the full set intended for this task). This will silently skip summary rewrite and bullet upgrade results in production.

### Non-Critical (should fix)

5. **`// const totalJobs = ...` commented-out line** — `cv-optimization.ts` line 244. Dead code should be deleted, not commented out.

6. **`const merged = cv` unused alias** — `cv-export.service.ts` lines 13 and 208 (`const merged = cv`). The variable `merged` is assigned but is just an alias for the parameter `cv`. Either use `cv` directly or remove the alias.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Summary Rewrite: variant selection with radio/clickable cards | Covered | Implemented as clickable cards with radio buttons |
| Summary Rewrite: textarea pre-filled with selected variant text | Covered | `editableText` signal seeded via `effect()` |
| Summary Rewrite: switching variant replaces textarea | Covered | `effect()` on `selectedVariantText` resets `editableText` |
| Summary Rewrite: free editing of textarea | Covered | `onTextChange` updates local signal and emits to parent |
| Summary Rewrite: "Apply selected version" button calling PATCH | **Missing** | No Apply button or `saveUserOutput` call in `SummaryRewrite`. The component emits `summaryTextEdited` to parent which stores it in session state — but never calls `PATCH /optimizations/{id}/user-output`. Per spec §1.6, Apply must persist to DB. |
| Summary Rewrite: success/error indicator on Apply | **Missing** | Follows from missing Apply button above |
| Keyword Gap: checkbox selection per missing keyword | Covered | Checkboxes present in both "Likely have" and "Genuinely lacks" sections |
| Keyword Gap: textarea with selected keywords | **Missing** | No textarea shown after keyword selection. The `KeywordGap` component only emits `keywordToggled` and stores selection in parent; no inline edit textarea exists. Spec §2.1–2.4 requires a textarea. |
| Keyword Gap: "Apply keywords" button calling PATCH | **Missing** | No Apply button or `saveUserOutput` call. |
| Bullet Rewriter: per-bullet Original/AI Rewrite toggle | **Partial** | Implemented as a checkbox selecting the rewritten version; spec calls for a toggle between Original and AI Rewrite (two radio buttons). The checkbox UX only selects the rewritten version, not "use original vs rewrite". |
| Bullet Rewriter: per-bullet textarea for editing | **Missing** | No textarea per bullet. Bullets are select-only (checkbox). |
| Bullet Rewriter: per-bullet "Apply" button calling PATCH | **Missing** | No per-bullet Apply button or `saveUserOutput` call. |
| `PATCH /optimizations/{id}/user-output` called on Apply | **Missing** | `saveUserOutput` method exists in the API service but is never called from any panel component. `optimizationResultIds` are loaded but never passed to panels. |
| Export CV to PDF | Covered | `CvExportService.exportToPdf()` implemented with all 8 sections |
| Export CV to DOCX | Covered | `CvExportService.exportToDocx()` implemented |
| Export buttons visible on main page | Covered | Export section rendered when `jobApplicationId()` is set |
| Export buttons disabled when `cvStructuredData` not ready | **Partial** | Buttons are hidden (not disabled with tooltip) when `!canExportCv()`. Spec §4 says buttons should always be visible and disabled with tooltip "CV data not ready" when extraction not complete. `canExportCv` also returns false if no selections are made, which further deviates — spec says export with zero selections uses original CV data. |
| Export merges session-state edits with original CV | Covered | `applySelectionsToCV()` in `apply-selections.ts` handles summary, bullets, and keywords |
| Export with no optimizations uses original CV data | **Partial** | `canExportCv()` returns `false` if nothing is selected, so export is not accessible with zero selections. Spec allows this. |
| Loading state on export buttons | Covered | `isExportingPdf` / `isExportingDocx` signals used |
| Backend GET endpoint for result summaries | Covered | `GET /optimizations/job-applications/:jobApplicationId/results` |
| Backend GET endpoint: ownership check | Covered | `getOptimizationResultSummaries` checks `application.userId !== userId` |
| `OptimizationResultSummary` type in shared datatypes | Covered | Added to `datatypes.ts` line 373 |
| Frontend `getOptimizationResults()` API method | Covered | Added to `cv-optimization-api.service.ts` line 84 |
| Frontend `saveUserOutput()` API method | Covered (unused) | Method exists but is never called |

---

## Plan Deviations

1. **Apply/PATCH flow not implemented** — Plan Steps 4, 5, 6 specify that each panel component receives `optimizationResultId` as an input and calls `saveUserOutput` on Apply. This is entirely absent. `optimizationResultIds` signal is populated in the parent but never passed down as inputs to `SummaryRewrite`, `KeywordGap`, or `BulletRewriter`.

2. **Architecture deviation: top-down selection instead of per-panel `applied` output** — Plan §Step 3 specifies `appliedEdits` signal with `{ summary, keywordsText, bullets }`. Implementation instead uses `UserSelections` with `{ selectedSummaryAngle, customSummaryText, selectedBullets, selectedKeywords }`. The merge logic moves from `CvExportService.mergeCv()` to a standalone `applySelectionsToCV()` utility. This is a valid architectural improvement but is a deliberate deviation.

3. **`CvExportService` signature** — Plan specifies `exportToPdf(cv, edits)` and a private `mergeCv(cv, edits)`. Implementation is `exportToPdf(cv)` with merging done upstream in `mergedCv` computed. This is consistent with the architecture deviation above.

4. **`ActivePrompts` constant limits optimization run** — `cv-optimization.ts` line 105 sets `ActivePrompts = [PromptType.KEYWORD_GAP]`. Plan assumes all prompt types run. This appears unintentional.

5. **Bullet Rewriter interaction model** — Plan §Step 6 specifies two radio buttons (Original / AI Rewrite) per bullet, each with its own textarea and a per-bullet Apply button. Implementation uses a single checkbox (select the rewrite) with no textarea and no Apply button. This is a significant scope reduction.

6. **Keyword Gap textarea** — Plan §Step 5 specifies a textarea that appears when keywords are selected. This textarea is not implemented.

---

## Null Safety Issues

1. **`cv-export.service.ts` line 102** — `merged.summary` is rendered only when truthy (`if (merged.summary)`), which correctly handles null/empty. ✓

2. **`optimization.service.ts` line 178** — `results as OptimizationResultSummary[]` is a type cast without runtime validation. If Prisma returns a record where `status` is an unexpected value, it will silently pass through. Low risk given DB constraints but worth noting.

3. **`cv-optimization.ts` line 395** — `r.promptType as PromptType` — casting without validation. If the BE returns an unknown `promptType`, the map will have an undefined key. Low risk.

---

## Code Smells

1. **`const merged = cv` in `cv-export.service.ts`** (lines 13, 208) — dead alias. `merged` is used throughout the function as if it were a merged copy, but it is just the passed-in `cv` parameter. This is confusing given the function's purpose and the variable name suggests a merge operation happened.

2. **`streamOptimizationEvents` in `cv-optimization-api.service.ts` line 119** — `observer.complete()` is called after the first `job-complete` event, closing the stream. This is pre-existing but means only one SSE event is ever received per `mergeMap` subscription. Not introduced by this task.

3. **`ActivePrompts` constant vs full optimization** — `cv-optimization.ts` line 105 has `const ActivePrompts = [PromptType.KEYWORD_GAP]` which silently limits the run. The original comment on line 244 (`// const totalJobs = Object.values(PromptType).length`) was the correct value but is commented out, replaced by `ActivePrompts.length`. This is a production correctness issue, not just a smell.

---

## Recommendation

**Fix critical issues before merge.**

Critical issues to resolve:

1. Remove all `console.log` statements and the debug `effect()`.
2. Restore `ActivePrompts` to include all intended prompt types (or remove the constant and use `Object.values(PromptType)` directly).
3. Delete the commented-out `totalJobs` line.

The missing Apply/PATCH flow (spec §1.6, §2.4, §3.3) and missing Keyword Gap textarea/Bullet Rewriter textarea+toggle are significant spec gaps, but if the team has consciously descoped those to a follow-up task, the code as reviewed is a valid partial implementation of task 31 — provided the three critical items above are fixed and the scope reduction is explicitly acknowledged.
