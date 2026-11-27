# Implementation Plan

## Source

Task ID: 117-implement-cv-builder

Inputs:
- `.claude/specs/tasks/117-implement-cv-builder/02-spec.md`
- `.claude/specs/tasks/117-implement-cv-builder/03-spec-review.md` (PASS WITH ISSUES)

This plan resolves the review's two Critical Issues by fixing the spec's own inconsistencies at planning time, without inventing new requirements:

- **Edit-a-never-extracted-CV**: the Edit row action is simply not rendered for a CV whose `structuredData` is not yet available (`extractionStatus !== 'COMPLETED'` or `structuredData === null`), matching Behavior's "works for both uploaded+extracted CVs and builder-created CVs" framing. `GET /cv/:id/structured-data`'s existing `NotFoundException` behavior is untouched and becomes a defensive-only path (route guard / not-found handling) since the UI won't normally route a user there.
- **DTO fix framing**: implemented as a labeled prerequisite fix (Phase 1, step 1.1), not presented as a task-derived requirement.

---

## Phase 0 — Shared types (`packages/shared/datatypes`)

### 0.1 Extend `LimitedFeature` and `TIER_LIMITS`
File: `packages/shared/datatypes/src/lib/datatypes.ts`

- Add `'CV_BUILDER'` to the `LimitedFeature` union (currently `'CV_OPTIMIZATION' | 'COVER_LETTER' | 'INTERVIEW_PREP' | 'LINKEDIN'`).
- Add `CV_BUILDER` to each tier's `features` map in `TIER_LIMITS`: `FREE: 1`, `BASIC: 5`, `PRO: 10`.

### 0.2 Update `CvDocument` type
File: `packages/shared/datatypes/src/lib/datatypes.ts`

- `fileName: string` → `fileName: string | null`
- `storageKey: string` → `storageKey: string | null`
- `fileSize: number` → `fileSize: number | null`
- `mimeType: string` → `mimeType: string | null`
- Add `manuallyEdited: boolean`

### 0.3 Update `CvDocumentListItem` (Pick type used by dashboard list)
File: `packages/shared/datatypes/src/lib/datatypes.ts`

- Reflect the same nullability for `fileName`/`fileSize`/`mimeType` (matches `CvDocument`).
- Add `storageKey: string | null` to the `Pick` so the frontend can decide whether to show the Download action (currently not included in this list-item projection at all — must be added).
- Add `manuallyEdited: boolean` so the frontend can hide/disable the extract/re-parse action.

### 0.4 Move `DEFAULT_GDPR_CLAUSE` — no change
Confirmed: `DEFAULT_GDPR_CLAUSE` already lives in `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` (frontend-only), not in shared datatypes. The builder imports it from that existing location (see 3.7). No move needed — `cv-optimization` and `cv-builder` are both frontend feature folders.

### 0.5 Build shared types
Run `npm exec nx build datatypes` after 0.1–0.3 so both apps pick up the updated types (Nx `^build` dependency should also trigger this automatically for backend/frontend builds, but this step de-risks local dev).

---

## Phase 1 — Backend: DTO prerequisite fix, Prisma schema, quota wiring

### 1.1 Prerequisite fix: `CvStructuredDataDto` drift
File: `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`

- Add `gdprClause: string | null` and `other: string | null` fields to `CvStructuredDataDto`, matching the `CvStructuredData` shared type, with `@ApiProperty` decorators consistent with the file's existing style (Swagger-only class, no class-validator decorators — matches current convention).
- This is a discovered defect fix bundled as a prerequisite, not a task-derived requirement: the new `POST /cv/manual`/`PATCH /cv/:id/structured-data` endpoints serialize/document their `CvStructuredData` payload via this DTO, so the drift must be closed before those endpoints are added.

### 1.2 Prisma schema changes
File: `apps/opticv-be/prisma/schema.prisma`

- `LimitedFeature` enum: add `CV_BUILDER`.
- `CvDocument` model:
  - `fileName String` → `fileName String?`
  - `fileSize Int` → `fileSize Int?`
  - `mimeType String` → `mimeType String?`
  - `storageKey String` → `storageKey String?`
  - Add `manuallyEdited Boolean @default(false)`

### 1.3 Generate and apply migration
- Run `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma` with a descriptive name (e.g. `cv_builder_nullable_file_fields`).
- Run `npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma` to refresh the generated client (`apps/opticv-be/src/generated/prisma/`).

### 1.4 Wire `QuotaModule` into `CvModule`
File: `apps/opticv-be/src/app/cv/cv.module.ts`

- Add `QuotaModule` to `imports`.

### 1.5 Add tier/period resolution helper to `CvService`
File: `apps/opticv-be/src/app/cv/cv.service.ts`

- Add a private method mirroring `OptimizationService.resolveTierAndPeriod(userId)` (reads `Subscription`, applies `getEffectiveTier`, falls back to `FREE`/no period when no subscription row exists). Reuse the same helper/util if `getEffectiveTier` is already exported from a shared location (confirm import path used in `optimization.service.ts`); do not duplicate the tier-downgrade logic inline.
- Inject `QuotaService` into `CvService`'s constructor.

---

## Phase 2 — Backend: new endpoints

### 2.1 `CvStructuredData` request validation
File: `apps/opticv-be/src/app/cv/dto/cv-request.dto.ts` (new file)

- Since the CV module has no existing class-validator request DTOs (upload is file-based, validated manually in the service), create a minimal request DTO for the two new JSON-body endpoints. Mirror the shape of `CvStructuredDataDto` (Swagger `@ApiProperty` per field) — no class-validator decorators are required beyond what the rest of the module does, per spec's "no new required-field validation" assumption. Keep this DTO structurally identical to `CvStructuredDataDto` (all fields optional/nullable, matching `CvStructuredData`'s nullable shape) so the same object can be reused as both request and response documentation where practical.

### 2.2 `POST /cv/manual` — service method
File: `apps/opticv-be/src/app/cv/cv.service.ts`

Add `createManualCv(data: CvStructuredData, userId: string): Promise<CvDocument>`:
1. Resolve `{ tier, periodStart, periodEnd, cancelAtPeriodEnd }` via the helper from 1.5.
2. Call `this.quotaService.checkAndConsume(userId, 'CV_BUILDER', tier, periodStart, periodEnd, cancelAtPeriodEnd)` — throws `ForbiddenException` (`QUOTA_EXCEEDED`/`FEATURE_NOT_AVAILABLE`) on gate failure; let it propagate.
3. Create the `CvDocument` row: `userId`, `structuredData: data`, `storageKey: null`, `fileName: null`, `fileSize: null`, `mimeType: null`, `parseStatus: 'COMPLETED'`, `extractionStatus: 'COMPLETED'`, `manuallyEdited: true`, `isActive: true`.
4. Return the created row.

### 2.3 `POST /cv/manual` — controller endpoint
File: `apps/opticv-be/src/app/cv/cv.controller.ts`

- New route `@Post('manual')`, `@HttpCode(HttpStatus.CREATED)`, body typed as `CvStructuredData` (via the new request DTO for Swagger docs), guarded by the class-level `SupabaseGuard` (no extra guard needed — matches `getUserCvs`/`deleteCv` pattern of relying on the controller-level guard).
- `@ApiOperation`/`@ApiResponse` docs matching the style of existing routes (201 success type, 403 quota-error cases per spec's Data/API section).
- Delegates to `this.cvService.createManualCv(body, user.id)`.

### 2.4 `PATCH /cv/:id/structured-data` — service method
File: `apps/opticv-be/src/app/cv/cv.service.ts`

Add `updateStructuredData(id: string, data: CvStructuredData, userId: string): Promise<CvDocument>`:
1. Fetch `doc` by `id` only.
2. Ownership check: `if (!doc || doc.userId !== userId) throw new NotFoundException('CV document not found.')` — use the collapsed single-exception pattern (matches `getStructuredData`/`extractStructuredData`, the more recent and safer convention flagged by the backend exploration), not the split `NotFoundException`/`ForbiddenException` pattern used by `deleteCv`/`getDownloadUrl`. Note: this deviates from the spec's literal "mirroring `deleteCv()`'s pattern" wording, but resolves the ownership-check inconsistency the backend exploration flagged, without changing observable behavior for the caller (both patterns ultimately reject non-owners) — flag this choice in the done-report for confirmation.
3. No quota consumption.
4. Update: `structuredData: data`, `manuallyEdited: true`. Do not touch `parseStatus`/`extractionStatus`/file fields.
5. Return the updated row.

### 2.5 `PATCH /cv/:id/structured-data` — controller endpoint
File: `apps/opticv-be/src/app/cv/cv.controller.ts`

- New route `@Patch(':id/structured-data')`, `@HttpCode(HttpStatus.OK)`, body typed as `CvStructuredData`.
- Delegates to `this.cvService.updateStructuredData(id, body, user.id)`.
- Import `Patch` from `@nestjs/common`.

### 2.6 Re-extraction guard
File: `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`

In `extractStructuredData`, immediately after the existing ownership check (`if (!doc || doc.userId !== userId) throw new NotFoundException(...)`):
- Add: `if (doc.manuallyEdited) throw new ForbiddenException({ code: 'MANUAL_EDIT_PROTECTED' });`

### 2.7 Shared `QuotaErrorPayload`/error-code type update
File: `packages/shared/datatypes/src/lib/datatypes.ts`

- `QuotaErrorPayload`'s `feature: LimitedFeature` already covers `CV_BUILDER` once 0.1 lands — no separate change needed here.
- Add a new payload variant (or minimal type) for `MANUAL_EDIT_PROTECTED` if the frontend needs to type-narrow it explicitly (see 3.x below); otherwise the generic `err?.error?.message` fallback pattern used elsewhere in the frontend (e.g. `dashboard.ts` delete-error handling) is sufficient and no new shared type is required. Decision: use the generic message-fallback pattern — do not add a new discriminated union member, since no interceptor-level special-casing (like the quota toast) is required by the spec for this error.

---

## Phase 3 — Backend: existing code paths handling nullable file fields

Per Acceptance criteria: "existing `uploadCv()`/download/export code paths updated to handle nullable `storageKey`/`fileName`/`fileSize`/`mimeType` without runtime errors."

### 3.1 `CvService.uploadCv()` / `toUploadCvResponse()`
File: `apps/opticv-be/src/app/cv/cv.service.ts`

- `uploadCv()` always sets these fields from the uploaded file, so no logic change is needed — only confirm TypeScript still compiles cleanly against the now-nullable Prisma-generated types (the create payload always supplies non-null values here, so no `!`/cast should be needed).

### 3.2 `CvService.getDownloadUrl()`
File: `apps/opticv-be/src/app/cv/cv.service.ts`

- Add an explicit guard before generating the presigned URL: `if (!doc.storageKey) throw new NotFoundException('This CV has no downloadable file.')` (builder-created CVs have `storageKey === null`). Replaces the current `InternalServerErrorException` fallback for the "missing storage key" case, since it's now an expected state, not a data-integrity error.

### 3.3 `CvService.deleteCv()`
File: `apps/opticv-be/src/app/cv/cv.service.ts`

- `await this.r2.delete(doc.storageKey)` will now receive `null` for builder-created CVs. Guard: only call `this.r2.delete(...)` `if (doc.storageKey)`.

### 3.4 `CvExtractionService.extractStructuredData()`
File: `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts`

- Already blocked for manually-edited CVs by 2.6 before reaching the `isPdf`/`r2.download(doc.storageKey)` branch. No further null-handling needed since the guard fires first, but confirm the guard is placed before any `doc.storageKey`/`doc.mimeType` access.

### 3.5 CV export services (PDF/DOCX) and template preview
Files: `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` and related.

- These operate on `CvStructuredData` (already fully populated after builder create/edit), not on `storageKey`/`fileName` — confirm no export code path reads `CvDocument.fileName`/`storageKey` directly for filename generation etc.; if any does (e.g. using `fileName` as a default export filename), add a fallback (e.g. `contact.name` or a generic "CV" default) for the null case. Locate via `Grep` for `.fileName` usages in the export services during implementation; this plan does not presuppose a specific occurrence since none was confirmed during research.

### 3.6 Backend unit test updates
Files: `apps/opticv-be/src/app/cv/cv.service.spec.ts`, `apps/opticv-be/src/app/cv/cv.controller.spec.ts`

- Update existing mocks/fixtures that construct `CvDocument`-shaped objects to remain valid against the new nullable fields (no behavior change expected, but TS types will now require handling `| null`).

---

## Phase 4 — Backend: new unit tests

File: `apps/opticv-be/src/app/cv/cv.service.spec.ts`

- `createManualCv`: success path (quota consumed, document created with nulled file fields, `manuallyEdited: true`, `parseStatus`/`extractionStatus: 'COMPLETED'`); quota-exceeded path (`QuotaService.checkAndConsume` rejects → `ForbiddenException` propagates); feature-not-available path (limit `0` → `ForbiddenException`).
- `updateStructuredData`: success path (structuredData overwritten, `manuallyEdited` set true, no quota call made); ownership-failure path (`doc.userId !== userId` → `NotFoundException`).
- `getDownloadUrl`: new case — `storageKey === null` → `NotFoundException`, not `InternalServerErrorException`.
- `deleteCv`: new case — `storageKey === null` → `r2.delete` not called, delete still succeeds.

File: `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts`

- Re-extraction guard: `manuallyEdited: true` → `extractStructuredData` throws `ForbiddenException` with `MANUAL_EDIT_PROTECTED` code before any AI/storage call is attempted.

File: `apps/opticv-be/src/app/cv/cv.controller.spec.ts`

- New route wiring tests for `POST /cv/manual` and `PATCH /cv/:id/structured-data` (delegate to the correct service methods with correct args), matching the existing controller-spec style (thin delegation tests).

---

## Phase 5 — Frontend: HTTP service + store

### 5.1 `CvApiService` — new methods
File: `apps/opticv-web/src/app/core/services/cv-api.service.ts`

- `createManualCv(data: CvStructuredData): Observable<CvDocument>` → `POST ${environment.apiUrl}/cv/manual`.
- `updateStructuredData(id: string, data: CvStructuredData): Observable<CvDocument>` → `PATCH ${environment.apiUrl}/cv/${id}/structured-data`.
- Both follow the file's existing pattern: injected `HttpClient`, typed `Observable<T>`, no manual try/catch (errors surface via subscriber `error` callback / global `quotaErrorInterceptor`).

### 5.2 `CvStore` — no new methods required
File: `apps/opticv-web/src/app/core/stores/cv.store.ts`

- Confirmed: `updateCvList()` (full replace) is sufficient. Calling components (cv-builder container, dashboard) compute the new array locally (prepend for create, map-replace for edit) and call `cvStore.updateCvList(newList)`, mirroring the existing `deleteCv` pattern in `dashboard.ts`. No store change needed.

### 5.3 Reuse `CvOptimizationApiService.getStructuredData()` for edit-mode fetch
File: `apps/opticv-web/src/app/features/cv-optimization/services/cv-optimization-api.service.ts`

- No change — the builder's edit route reuses the existing `getStructuredData(cvId)` method (`GET /cv/:id/structured-data`) as-is, per spec.
- Decision: since this method lives in the `cv-optimization` feature folder, either (a) import it cross-feature (acceptable — it's a stateless HTTP wrapper, not feature-private state) or (b) add the same method to `CvApiService` for a cleaner feature boundary. Choose (b) for consistency with 5.1 keeping all `cv-builder`'s backend calls in one service: add `getStructuredData(id: string): Observable<{ data: CvStructuredData }>` to `CvApiService`, mirroring the existing implementation exactly (`GET ${environment.apiUrl}/cv/${id}/structured-data`).

---

## Phase 6 — Frontend: `cv-builder` feature scaffold

### 6.1 Directory structure
New folder: `apps/opticv-web/src/app/features/cv-builder/`

```
cv-builder/
  cv-builder.ts
  cv-builder.html
  cv-builder.css
  cv-builder.spec.ts
  models.ts
  components/
    experience-section/
      experience-section.ts / .html / .css / .spec.ts
    education-section/
      education-section.ts / .html / .css / .spec.ts
```

Only `experience` and `education` need dedicated sub-components (repeatable, multi-field, nested-array-of-bullets for experience) — the remaining sections (Contact, Summary, Skills, Certifications, Projects, Languages, Other, GDPR) are simple enough to inline directly in `cv-builder.html` within `SectionCard` wrappers, consistent with "keep components small" but avoiding over-fragmentation for single-field or simple-list sections. Certifications/Projects/Languages are also repeatable lists but with fewer fields than Experience — inline `@for` blocks with local add/remove methods on the container component are sufficient (no need for dedicated sub-components), matching the "don't over-abstract" rule.

### 6.2 Route registration
File: `apps/opticv-web/src/app/app.routes.ts`

Add, immediately after the `cv-optimization` route block (after line 49):

```ts
{
  path: 'cv-builder/:id',
  loadComponent: () =>
    import('./features/cv-builder/cv-builder').then((m) => m.CvBuilder),
  canActivate: [authGuard],
},
{
  path: 'cv-builder',
  loadComponent: () =>
    import('./features/cv-builder/cv-builder').then((m) => m.CvBuilder),
  canActivate: [authGuard],
},
```

(Order matches the existing `cv-optimization/:jobApplicationId` before `cv-optimization` convention — more specific route first.)

### 6.3 `models.ts`
File: `apps/opticv-web/src/app/features/cv-builder/models.ts`

- No new domain types needed beyond what `@opticv/datatypes` already exports (`CvStructuredData` and its sub-shapes). This file, if created, holds only cv-builder-local UI state types (e.g. a `CvBuilderMode = 'create' | 'edit'` type) — keep minimal, do not duplicate `CvStructuredData`'s shape.

---

## Phase 7 — Frontend: `CvBuilder` container component

File: `apps/opticv-web/src/app/features/cv-builder/cv-builder.ts`

### 7.1 Component shape
- Standalone component, `OnPush`, no `standalone: true` (default in Angular 21).
- Injects: `CvApiService`, `CvStore`, `MessageService`, `Router`, `ActivatedRoute` (for `:id` route param), `DestroyRef`.
- Mode resolution: read `route.snapshot.paramMap.get('id')` (or a reactive `input()` if using component-input-binding — confirm project convention by checking how `cv-optimization` reads `:jobApplicationId`; mirror that exact mechanism for consistency) to determine create vs. edit mode.

### 7.2 State (signals, no Reactive Forms — matches `cv-optimization` convention)
- `contact = signal<CvContactInfo>({ name: null, position: null, email: null, phone: null, location: null, linkedin: null, website: null })`
- `summary = signal<string | null>(null)`
- `experience = signal<CvExperienceItem[]>([])`
- `education = signal<CvEducationItem[]>([])`
- `skills = signal<string[]>([])`
- `certifications = signal<CvCertification[]>([])`
- `projects = signal<CvProject[]>([])`
- `languages = signal<CvLanguage[]>([])`
- `other = signal<string | null>(null)`
- `includeGdprClause = signal<boolean>(false)`
- `originalGdprClause = signal<string | null>(null)` (tracks the fetched/original clause text, same pattern as `cv-optimization.ts`)
- `selectedTemplate = signal<CvTemplateId>('default')`, `accentColor = signal<string>(DEFAULT_ACCENT_COLOR)` (for the live preview only — export/template selection itself is out of scope for the builder's own save action; these exist purely to drive `CvA4Preview`)
- `saving = signal<boolean>(false)`
- `loading = signal<boolean>(false)` (edit-mode initial fetch)
- `loadError = signal<string | null>(null)`
- `cvId = signal<string | null>(null)` (set from route param in edit mode; used as the PATCH target)

### 7.3 Derived state
- `mergedCv = computed<CvStructuredData>(() => ({ contact: this.contact(), summary: this.summary(), experience: this.experience(), education: this.education(), skills: this.skills(), certifications: this.certifications(), projects: this.projects(), languages: this.languages(), other: this.other(), gdprClause: this.computeGdprClause() }))` — feeds `CvA4Preview` directly, recomputes on every keystroke (client-side only, no network calls, per spec's Create flow step 3).
- `computeGdprClause(): string | null` — private helper reusing the exact logic from `apply-selections.ts`: `!includeGdprClause() ? null : (originalGdprClause() ?? DEFAULT_GDPR_CLAUSE)`.

### 7.4 Lifecycle: edit-mode data load
- `ngOnInit` (or a constructor `effect`, matching `cv-optimization.ts`'s convention — confirm which is used there and mirror it): if `cvId()` is set, call `cvApiService.getStructuredData(cvId())`.
  - On success: populate all signals from `data`, set `includeGdprClause.set(!!data.gdprClause)`, `originalGdprClause.set(data.gdprClause)` (mirrors `cv-optimization.ts:793`).
  - On error (404 — not-yet-extracted or not found): set `loadError` and render an inline error state (per the resolved ambiguity in this plan's header — this is a defensive fallback path only, since the UI won't normally link here for such CVs; still must be handled gracefully, not left to crash).

### 7.5 Add/remove helpers for repeatable sections
Plain signal-array mutation methods, e.g.:
```ts
addExperience(): void { this.experience.update((list) => [...list, EMPTY_EXPERIENCE_ITEM]); }
removeExperience(index: number): void { this.experience.update((list) => list.filter((_, i) => i !== index)); }
updateExperienceField(index: number, patch: Partial<CvExperienceItem>): void { ... }
addExperienceBullet(expIndex: number): void { ... }
removeExperienceBullet(expIndex: number, bulletIndex: number): void { ... }
```
Same pattern replicated for `education`, `certifications`, `projects`, `languages`, and `skills` (skills is `string[]`, simplest case — add/remove by index or comma-split input, implementer's choice, not spec-mandated).

### 7.6 Save handler
```ts
save(): void {
  this.saving.set(true);
  const payload = this.mergedCv();
  const request$ = this.cvId()
    ? this.cvApiService.updateStructuredData(this.cvId()!, payload)
    : this.cvApiService.createManualCv(payload);
  request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
    next: (doc) => {
      this.saving.set(false);
      this.syncCvStore(doc);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'CV saved' });
      this.router.navigate(['/dashboard']);
    },
    error: (err) => {
      this.saving.set(false);
      // QUOTA_EXCEEDED/FEATURE_NOT_AVAILABLE already toasted globally by quotaErrorInterceptor — no duplicate toast here.
      if (err?.error?.code !== 'QUOTA_EXCEEDED' && err?.error?.code !== 'FEATURE_NOT_AVAILABLE') {
        this.messageService.add({ severity: 'error', summary: 'Save failed', detail: err?.error?.message ?? 'Could not save CV. Please try again.' });
      }
    },
  });
}
```
- Post-save navigation: `/dashboard` (spec left this as an implementation decision — dashboard is chosen since it's the only entry point that currently exists for viewing the CV list; no CV detail/preview route exists elsewhere in the app to navigate to instead).
- Save UX: explicit "Save" button (not autosave) — chosen because (a) it's the simplest implementation consistent with "left to implementation planning," (b) it avoids partial/incomplete-payload PATCH races given `CvStructuredData` has no required fields, and (c) it matches the one-shot nature of the existing `cv-optimization` save/apply actions (e.g. "Apply selected version" buttons) rather than introducing a new autosave-debounce pattern nowhere else used in the codebase.

### 7.7 `syncCvStore(doc: CvDocument)`
```ts
private syncCvStore(doc: CvDocument): void {
  const listItem = toListItem(doc); // map CvDocument -> CvDocumentListItem shape
  const current = this.cvStore.cvList();
  const exists = current.some((c) => c.id === doc.id);
  const updated = exists
    ? current.map((c) => (c.id === doc.id ? listItem : c))
    : [listItem, ...current];
  this.cvStore.updateCvList(updated);
}
```
- `toListItem` is a small local mapping function (or inline object literal) projecting the full `CvDocument` response down to the `CvDocumentListItem` shape used by the store/list, mirroring the fields already selected by the backend's `getUserCvs()` (`id, fileName, fileSize, mimeType, createdAt, parsedText, parseStatus`) plus the newly-added `storageKey`, `manuallyEdited` (from 0.3).

---

## Phase 8 — Frontend: `CvBuilder` template

File: `apps/opticv-web/src/app/features/cv-builder/cv-builder.html`

### 8.1 Layout
- Two-column layout: form (accordion of `SectionCard`s) on one side, `CvA4Preview` live preview on the other — mirrors `cv-optimization.html`'s general page structure (sidebar/content split), reusing existing layout CSS classes/patterns from that file where applicable (e.g. container/grid classes) rather than inventing new layout primitives.
- Loading state (`loading()`) for edit-mode fetch: simple spinner/placeholder, consistent with existing loading patterns (e.g. `p-table`'s `loading` state look, or a basic centered `pi-spinner`).
- `loadError()` state: inline error message with a way back to dashboard (no retry-fetch button required by spec — simplest handling).

### 8.2 Sections (each wrapped in `<app-section-card>`, no `status`/`helpTitle` inputs needed since there's no async processing state)
1. **Contact** — `SectionCard` with plain inputs bound to `contact()` fields (`name`, `position`, `email`, `phone`, `location`, `linkedin`, `website`) via `[value]`+`(input)` or two-way signal binding, consistent with the no-Reactive-Forms convention.
2. **Summary** — `SectionCard` with a `textarea` bound to `summary()`.
3. **Experience** — `SectionCard` containing `<app-experience-section>` (or inline `@for` if kept simple), with per-entry fields (title, company, location, dates, current checkbox) and a nested bullets `@for` with add/remove.
4. **Education** — `SectionCard` containing `<app-education-section>` (or inline), repeatable entries (degree, institution, location, dates, field).
5. **Skills** — `SectionCard`, simple tag-style input or comma-separated list bound to `skills()`.
6. **Certifications** — `SectionCard`, inline `@for` (name, issuer, date) with add/remove.
7. **Projects** — `SectionCard`, inline `@for` (name, description, technologies, url) with add/remove.
8. **Languages** — `SectionCard`, inline `@for` (language, proficiency) with add/remove.
9. **Other/Additional Info** — `SectionCard`, `textarea` bound to `other()`.
10. **GDPR clause** — `SectionCard`, reusing the exact markup from `export-footer.html:124-142` (native `<input type="checkbox">`, `accent-primary` class, `.gdpr-card`/`.gdpr-card-title`/`.gdpr-card-description` classes — copy the CSS rules for these classes from `export-footer.css` into `cv-builder.css`, or extract to a shared stylesheet if the project has a shared-styles location; confirm during implementation whether `export-footer.css`'s relevant rules are already global/Tailwind-based vs. component-scoped before deciding copy vs. share).

### 8.3 Live preview
```html
<app-cv-a4-preview
  [cv]="mergedCv()"
  [templateId]="selectedTemplate()"
  [accentColor]="accentColor()"
/>
```
Unmodified component, per spec.

### 8.4 Save action
- A "Save" button (primary, `p-button`), disabled while `saving()`, calling `save()`. Placed in a fixed/sticky position or page header — implementer's choice for exact placement, not spec-mandated (spec explicitly defers this).

### 8.5 Accessibility
- Every form field has an associated `<label>` (explicit `for`/`id` pairing, not placeholder-only labels).
- The GDPR checkbox retains its existing `aria-label="Include GDPR clause"` from the reused markup.
- Repeatable-section add/remove buttons have accessible names (e.g. `aria-label="Remove experience entry"` rather than icon-only with no label).
- Focus management: after "Add" on a repeatable section, focus should move to the first field of the newly-added entry (matches WCAG AA focus-management requirement in conventions).
- Run AXE checks against the rendered page as part of manual verification (per Acceptance criteria) — no automated AXE test harness currently exists in the repo per the explored files, so this is a manual dev-time check unless an existing AXE test setup is found during implementation (search for `axe` usage in `*.spec.ts` before assuming none exists).

---

## Phase 9 — Frontend: dashboard entry points

### 9.1 "Create CV" action
File: `apps/opticv-web/src/app/features/dashboard/dashboard.html`

- Add a `p-button` (e.g. "Create CV", `routerLink="/cv-builder"`) near the existing stats/header area, or as an additional empty-state action in `cv-file-list.html`'s empty state (alongside "Upload your first CV") — both locations are reasonable per spec ("e.g. button near existing CV list / empty state"); place it in both: a persistent header-level button in `dashboard.html` (always visible, not just empty state) and an additional button in `cv-file-list.html`'s empty state for discoverability when the list is empty.

File: `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html`

- In the empty-state block (lines 6–16), add a second button next to "Upload your first CV": `<p-button label="Create CV from scratch" icon="pi pi-plus" routerLink="/cv-builder" />` (secondary/outlined styling to visually subordinate to the primary upload CTA, avoiding decision paralysis — implementer's styling choice).

### 9.2 "Edit" row action
File: `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.ts`

- Add method:
```ts
editCv(file: CvDocumentListItem): void {
  this.router.navigate(['/cv-builder', file.id]);
}
```
(Mirrors `optimizeCv()` — pure navigation, no store interaction needed at click time.)

File: `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html`

- Add an Edit button to the row-actions block (lines 84–110), positioned before Download (per spec: "alongside existing Optimize/Download/Delete"):
```html
<p-button
  icon="pi pi-pencil"
  severity="secondary"
  size="small"
  [text]="true"
  styleClass="action-icon-btn"
  title="Edit"
  (onClick)="editCv(file)"
/>
```
- **Conditional visibility rule** (resolving the spec review's flagged ambiguity): show Edit unconditionally for any CV row that appears in this list — `getUserCvs()` only returns rows that exist, and per the create-flow (2.2), builder-created CVs always have `structuredData` populated at creation, so `extractionStatus` is always `'COMPLETED'` for them. For uploaded CVs, `extractionStatus` may still be `'PENDING'`/`'FAILED'` if extraction hasn't run yet. Since `CvDocumentListItem` doesn't currently expose `extractionStatus` (only `parseStatus`), and the spec's Edge Cases section left this branch genuinely undecided, this plan makes the following explicit implementation decision: **add `extractionStatus` to `CvDocumentListItem`'s Pick type (extends 0.3) and conditionally disable (not hide) the Edit button** when `extractionStatus !== 'COMPLETED'`, with a `title`/tooltip explaining why ("Extract structured data first"). This is more discoverable than hiding and fails safe (the disabled button can never trigger the defensive 404 path in 7.4). Flag this decision explicitly in the done-report since it narrows one of the spec review's open branches at implementation time rather than at spec time.

### 9.3 Download action — hide/disable for builder CVs
File: `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html`

- Wrap the existing Download button (lines 92–100) in `@if (file.storageKey) { ... }` (requires `storageKey` added to `CvDocumentListItem` per 0.3).

---

## Phase 10 — Frontend: unit tests

- `cv-builder.spec.ts`: create-mode initial state (all fields empty/default), edit-mode fetch-and-populate, save success (create path calls `createManualCv`, navigates, syncs store), save success (edit path calls `updateStructuredData` with existing `cvId`), save error (non-quota error shows toast), GDPR clause computation (checked/unchecked × original-clause-present/absent — 4 cases mirroring `apply-selections.spec.ts` if it exists, confirm and reuse test structure), add/remove experience entry and bullet, add/remove education/certification/project/language entry.
- `cv-file-list.spec.ts`: Edit button navigates to `/cv-builder/:id`; Edit button disabled when `extractionStatus !== 'COMPLETED'`; Download button hidden when `storageKey === null`.
- `dashboard.spec.ts`: "Create CV" button present and links to `/cv-builder` (update existing spec only if the new button changes any existing assertions/snapshot).
- `cv-api.service.spec.ts` (if one exists — confirm during implementation; create if the file doesn't exist and the project convention is to test all API services): `createManualCv`/`updateStructuredData`/`getStructuredData` issue correct HTTP calls.

---

## Phase 11 — Verification checklist (maps to spec's Acceptance section)

1. `npm exec nx build datatypes` then `npm exec nx run-many -t build` — passes.
2. `npm exec nx run-many -t typecheck` — passes (catches all nullable-field fallout across both apps).
3. `npm exec nx run-many -t lint` — passes.
4. `npm exec prisma migrate dev` applied cleanly against local DB; `npm exec prisma generate` run.
5. `npm exec nx test opticv-be` — new + updated tests pass (Phase 4).
6. `npm exec nx test opticv-web` — new + updated tests pass (Phase 10).
7. Manual dev-server verification (`npm run start-be:dev` + `npm exec nx serve opticv-web`):
   - Create flow: dashboard → "Create CV" → fill sections → preview updates live → Save → toast → redirected to dashboard → new CV appears in list.
   - Edit flow: dashboard → "Edit" on an existing extracted CV → form pre-fills → change a field → preview updates → Save → toast → list reflects update.
   - Quota: exhaust `CV_BUILDER` quota (e.g. temporarily lower `TIER_LIMITS.FREE.features.CV_BUILDER` or create up to the limit) → verify the global quota toast appears and no CV is created.
   - Re-extraction guard: attempt `POST /cv/:id/extract` (e.g. via Swagger UI at `/swagger`) on a manually-edited CV → verify `403 MANUAL_EDIT_PROTECTED`.
   - Download hidden for builder-created CV row; present for uploaded CVs.
   - Edit disabled for an uploaded CV that hasn't been extracted yet (if reproducible in dev).
   - AXE check on `/cv-builder` page (browser extension or manual review) — no critical violations; keyboard-only navigation through all sections and the Save button.
8. No regressions in existing upload/extract/download/delete/optimization flows — spot-check each from the dashboard and `cv-optimization` pages.

---

## Summary of files created/modified

### Created
- `apps/opticv-be/src/app/cv/dto/cv-request.dto.ts`
- `apps/opticv-be/prisma/migrations/<timestamp>_cv_builder_nullable_file_fields/migration.sql` (generated by Prisma CLI)
- `apps/opticv-web/src/app/features/cv-builder/cv-builder.ts`
- `apps/opticv-web/src/app/features/cv-builder/cv-builder.html`
- `apps/opticv-web/src/app/features/cv-builder/cv-builder.css`
- `apps/opticv-web/src/app/features/cv-builder/cv-builder.spec.ts`
- `apps/opticv-web/src/app/features/cv-builder/models.ts`
- `apps/opticv-web/src/app/features/cv-builder/components/experience-section/experience-section.ts` (+ `.html`, `.css`, `.spec.ts`)
- `apps/opticv-web/src/app/features/cv-builder/components/education-section/education-section.ts` (+ `.html`, `.css`, `.spec.ts`)

### Modified
- `packages/shared/datatypes/src/lib/datatypes.ts` — `LimitedFeature`, `TIER_LIMITS`, `CvDocument`, `CvDocumentListItem` (add `CV_BUILDER`, nullable file fields, `manuallyEdited`, `storageKey`, `extractionStatus` on list item)
- `apps/opticv-be/prisma/schema.prisma` — `LimitedFeature` enum, `CvDocument` model
- `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts` — `CvStructuredDataDto` add `gdprClause`, `other`
- `apps/opticv-be/src/app/cv/cv.module.ts` — import `QuotaModule`
- `apps/opticv-be/src/app/cv/cv.service.ts` — tier/period helper, `createManualCv`, `updateStructuredData`, nullable-field guards in `getDownloadUrl`/`deleteCv`
- `apps/opticv-be/src/app/cv/cv.controller.ts` — `POST /cv/manual`, `PATCH /cv/:id/structured-data`
- `apps/opticv-be/src/app/cv/services/cv-extraction.service.ts` — re-extraction guard (`MANUAL_EDIT_PROTECTED`)
- `apps/opticv-be/src/app/cv/cv.service.spec.ts` — new + updated tests
- `apps/opticv-be/src/app/cv/cv.controller.spec.ts` — new route tests
- `apps/opticv-be/src/app/cv/services/cv-extraction.service.spec.ts` — guard test
- `apps/opticv-web/src/app/app.routes.ts` — `cv-builder`, `cv-builder/:id` routes
- `apps/opticv-web/src/app/core/services/cv-api.service.ts` — `createManualCv`, `updateStructuredData`, `getStructuredData`
- `apps/opticv-web/src/app/features/dashboard/dashboard.html` — "Create CV" button
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.ts` — `editCv()` method
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html` — Edit button, conditional Download, empty-state "Create CV" button
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.spec.ts` — updated/new tests
- `apps/opticv-web/src/app/features/dashboard/dashboard.spec.ts` — updated if needed
- `docs/tasks-list.md` — mark task 117 in progress/done per project convention once implementation lands (not part of this plan's execution, noted for completeness)
