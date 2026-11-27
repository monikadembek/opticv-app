# Code Review — 117-implement-cv-builder

Scope: full branch diff `337224b..HEAD` (branch `117-cv-builder` vs. its `dev` merge base). `HEAD~1..HEAD` only touches `apps/opticv-web/src/app/shared/constants.ts`, so it is not representative of the task.

### Summary

- Overall result: **FAIL**
- The backend endpoints, schema migration, quota wiring, DTOs and dashboard entry points match the spec and plan, and the tests are thorough. One regression breaks a core flow the spec requires to keep working. The re-extraction guard runs **before** the cache-hit return in `extractStructuredData`. The CV Optimization flow uses `POST /cv/:id/extract` to *read* structured data, so every builder-created or builder-edited CV can no longer be optimized. A few null-safety and accessibility gaps remain, but those are non-blocking.

### Conventions Violations

#### Critical (must fix before merge)

1. **Re-extraction guard blocks the optimization flow** — `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts:36-38`.
   - `if (doc.manuallyEdited) throw new ForbiddenException({ code: 'MANUAL_EDIT_PROTECTED' })` sits before the `extractionStatus === 'COMPLETED' && structuredData !== null` cache-hit return at L40-45.
   - `job-upload.ts:179-181` calls `extractCvData(cvDocumentId)` (`POST /cv/:id/extract`) right after `createJobApplication` on every optimization run.
   - Result: for any CV with `manuallyEdited === true`, which means **every** builder-created CV and every uploaded CV edited in the builder:
     - the request returns 403 and is retried twice (`retry(2)`)
     - the error handler at `job-upload.ts:205-207` only logs to the console, so `isSubmitting` stays `true` and the user is stuck on a spinner
     - an orphan `JobApplication` row has already been created
   - This contradicts spec Out of scope ("a builder-created/edited CV simply flows into optimization unchanged") and Acceptance ("No breaking changes to existing … optimization flows").
   - The guard's purpose is to prevent *re-running* AI extraction that overwrites manual edits. Returning already-stored data does not do that.
   - Fix: move the guard below the cache-hit branch, so it only fires when extraction would actually run. Add a spec case: `manuallyEdited: true` + `COMPLETED` + data present → returns stored data, no AI call.
   - Plan 3.4 says "confirm the guard is placed before any `doc.storageKey`/`doc.mimeType` access". That requirement still holds after the move, because the cache-hit branch reads neither field.

#### Non-Critical (should fix)

1. **Template-driven forms** — `cv-builder.html` (all inputs), `experience-section.html`, `education-section.html` use `FormsModule` with `[ngModel]`/`(ngModelChange)`. Conventions §2 say "Prefer Reactive forms instead of Template-driven ones". The plan (7.2) deliberately chose signals with no Reactive Forms, so this is a documented trade-off, not an accident. Mentioned for awareness.
2. **No focus management after "Add"** — `cv-builder.ts:163,184,215` (`addCertification`/`addProject`/`addLanguage`), `experience-section.ts:28` (`addItem`), `:46` (`addBullet`), `education-section.ts:26`. Plan 8.5 requires focus to move to the first field of the new entry (WCAG AA focus management, conventions §1). Nothing in `features/cv-builder/` handles focus.
3. **Bullet inputs have no visible label** — `experience-section.html:86-93` uses only `aria-label="Bullet point N"`. This passes AXE, but it is inconsistent with plan 8.5 ("explicit `for`/`id` pairing, not placeholder-only labels"). Low impact.
4. **`$any(...)` in template** — `cv-builder.html:367` `includeGdprClause.set($any($event.target).checked)`. Bypasses template type checking. Prefer a typed handler method, or `[ngModel]`/`(ngModelChange)` as used everywhere else in the file.
5. **Unused file** — `apps/opticv-web/src/app/features/cv-builder/models.ts` exports `CvBuilderMode`, but nothing imports it (mode comes from `cvId()`). Dead code. Remove it, or use it.
6. **Inconsistent empty-string vs. `null` normalization**:
   - Contact fields map `''` → `null` (`cv-builder.ts:160`).
   - `updateCertificationField`, `updateProjectField`, `updateLanguageField` (`cv-builder.ts:174-234`) and both section components' `updateField` store raw `''` for nullable fields (`issuer`, `date`, `description`, `url`, `proficiency`, `title`, …).
   - Clearing a field therefore persists `''` instead of `null`. Templates that check `!== null` would render empty separators or labels.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Migration: nullable `fileName`/`fileSize`/`mimeType`/`storageKey` | Covered | `20260825151358_cv_builder_nullable_file_fields/migration.sql` |
| `manuallyEdited` flag | Covered | Schema + migration + shared type + list DTO |
| Builder CVs `parseStatus`/`extractionStatus` = `COMPLETED` | Covered | `cv.service.ts` `createManualCv` |
| `POST /cv/manual` with `CV_BUILDER` quota | Covered | Controller + service + `resolveTierAndPeriod` |
| `PATCH /cv/:id/structured-data`, ownership check, no quota | Covered | Collapsed 404 pattern (see Plan Deviations) |
| `LimitedFeature` `CV_BUILDER` + `TIER_LIMITS` (1/5/10) | Covered | `datatypes.ts`; labels added in `constants.ts`, `settings.ts`, `cv-optimization.ts` |
| Re-extraction guard (`MANUAL_EDIT_PROTECTED`) | Partial | Guard exists, but it also blocks the cache-hit read path and so breaks optimization (Critical #1) |
| `CvStructuredDataDto` drift fix (`gdprClause`, `other`) | Covered | `gdprClause` added (`other` already existed) |
| Lazy `cv-builder` routes `/cv-builder`, `/cv-builder/:id` behind `authGuard` | Covered | `app.routes.ts` |
| Accordion form with full `CvStructuredData` parity | Covered | All 10 sections present |
| Live `CvA4Preview` | Covered | Component was modified, though (see Plan Deviations) |
| GDPR checkbox logic matches `ExportFooter`/`applySelectionsToCV` | Covered | `computeGdprClause()` |
| Dashboard "Create CV" (header + empty state) | Covered | `dashboard.html`, `cv-file-list.html` |
| Dashboard "Edit" row action | Covered | Disabled when `extractionStatus !== 'COMPLETED'` |
| Download hidden when `storageKey === null` | Covered | `cv-file-list.html` `@if (file.storageKey)` |
| Quota errors surfaced via existing pattern | Covered | Global interceptor; builder suppresses duplicate toast |
| `CvStore` synced after create/edit | Covered | `syncCvStore()` |
| Nullable file fields handled in download/delete/account-delete | Covered | `getDownloadUrl`, `deleteCv`, `users.service.ts:264` |
| Builder CV flows into optimization unchanged | **Missing** | Broken by Critical #1 |
| Unit tests: manual create (success / quota / feature-NA), PATCH (success / ownership), guard | Covered | `cv.service.spec.ts`, `cv-extraction.service.spec.ts`, `cv.controller.spec.ts`, `cv-request.dto.spec.ts` |
| AXE / WCAG AA on builder form | Partial | Labels present; focus management after Add missing (Non-Critical #2) |

### Plan Deviations

1. **`CvA4Preview` modified** (`cv-optimization/components/cv-a4-preview/cv-a4-preview.ts`). The spec (Scope) and plan 8.3 both say "unmodified". The change:
   - replaces `pendingMeasure` gating with an effect-driven `doMeasure()` on every `cv`/`templateId`/`accentColor` change, plus an unconditional ResizeObserver re-measure
   - guards `document.fonts`

   The comment explains the motivation: equal-height consecutive renders never fired ResizeObserver, which a live-typing preview exposes. The change is justified, but it is out of plan, and it affects the shared component used by `cv-optimization` too. It should be called out in the done-report and regression-tested on the optimization page.
2. **Request DTO uses class-validator decorators** (`cv-request.dto.ts`). Plan 2.1 said "no class-validator decorators are required". The implementation adds full `@IsOptional`/`@IsString`/`@ValidateNested` validation, which is consistent with the global `ValidationPipe({ whitelist: true, transform: true })` in `main.ts`, and adds `cv-request.dto.spec.ts`. This is an improvement and it is necessary: with `whitelist: true`, an undecorated DTO would have stripped every property.
3. **Separate `CvDocumentDto` added** (`cv-response.dto.ts`) as the 201/200 response type. Not in plan, but needed for Swagger docs of the new endpoints.
4. **Extra `storageKey`/`fileName` guard in extraction** (`cv-extraction.service.ts:55-59`, `BadRequestException`). Not in plan; defensive and reasonable.
5. **`users.service.ts:264`** — skips `r2.delete` for null `storageKey` during account deletion. Not listed in the plan's file summary, but required by the nullable-field acceptance criterion.
6. **Skills input** is a single comma-separated text field (`skillsText` signal + `skills` computed). Plan 7.5 allowed this ("implementer's choice").
7. **`upload-cv.ts` / `upload-cv.html`** — null-safe `fileSize`/`mimeType` handling. Not in plan; this is fallout from the type change.

### Null Safety Issues

1. **`cv-file-list.html:63,87,90`** — `getMimeLabel(file.mimeType)` and `formatFileSize(file.fileSize)` are called with `null` for builder CVs.
   - `shared/utils.ts:1,13` both take non-null parameters.
   - `formatFileSize(null)` renders the string `"null B"`.
   - `getMimeLabel(null)` returns `null` (empty type badge), and the file icon falls through to `pi-file-word`.
   - `file.fileName` renders empty.
   - Strict templates don't catch this because PrimeNG's `let-file` context is `any`.
   - The type mismatch is real, and the user-visible output is broken for every builder CV row.
2. **`cv.service.ts:213-216`** — `toUploadCvResponse` uses four non-null assertions (`doc.fileName!` etc.). A comment justifies them and they are safe today (only called from `uploadCv`). Narrowing the parameter type to non-null at the call site would remove the `!` entirely. Minor.
3. **`cv.service.ts:283`, `:306`** — `doc as unknown as CvDocument` double casts on the Prisma result. These hide the `Json` → `CvStructuredData` and `Date` → `Date | string` mismatches rather than mapping them. Same pattern as the existing `getStructuredData`, so it is consistent, but it remains unchecked.
4. **`job-info-banner.html:18-25`, `optimization-list.html:71`, `job-upload.html:12` (`optionLabel="fileName"`)** — these consume `cvDocument.fileName`, which is now `string | null`. Builder CVs render a blank label in the CV dropdown, the optimization list and the banner. `job-info-banner` guards with `@if`; the other two do not.

### Code Smells

1. **Duplicated `resolveTierAndPeriod`** — `cv.service.ts:49-77` re-implements the same subscription → tier/period resolution as `OptimizationService.resolveTierAndPeriod`. Plan 1.5 explicitly said "Reuse the same helper/util … do not duplicate". The helper reuses `getEffectiveTier`, but the subscription query and fallback logic are copied. This belongs in a shared method, for example on `QuotaService` or a small subscription util.
2. **Duplicated empty-item literals** — `{ name: '', issuer: null, date: null }`, `{ name: '', description: null, technologies: [], url: null }` and `{ language: '', proficiency: null }` are inline in `cv-builder.ts:164-219`. `EMPTY_EXPERIENCE_ITEM`/`EMPTY_EDUCATION_ITEM` are named constants in the sub-components. Lift these into the same kind of constants for consistency.
3. **Repeated `split(',').map(trim).filter(length)`** — `cv-builder.ts:96-99` (skills) and `:206-209` (project technologies). Extract a small `parseCommaList()` helper.
4. **`CvBuilder` handles four repeatable sections inline** (certifications, projects, languages, plus skills), about 75 lines of near-identical add/remove/update methods. Plan 6.1 accepted this deliberately. Acceptable at the current size (`cv-builder.ts` 290 lines, `cv-builder.html` 391 lines), but these sections are the obvious candidates for extraction if the form grows.
5. **Magic string** — `'MANUAL_EDIT_PROTECTED'` is inline in `cv-extraction.service.ts:37`. The quota error codes appear to be shared constants or types; this code is not exported to `@opticv/datatypes`, so the frontend cannot reference it in a typed way. Plan 2.7 chose not to add a shared type. Noting for consistency.

### Recommendation

- **Fix critical issues before merge** — move the `MANUAL_EDIT_PROTECTED` guard below the cache-hit return in `cv-extraction.service.ts` and add the corresponding test. Also strongly recommended before merge:
  - fix the `null`-rendering in `cv-file-list.html` (Null Safety #1), which is user-visible on every builder CV
  - regression-check the optimization page after the `CvA4Preview` change
