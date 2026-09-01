# Task Specification

## Source

Azure DevOps Task: 117

## Goal

Implement a CV Builder feature that lets users create a CV from scratch inside the app (no file upload required), and reuse the same form to fix up AI-extracted CV data that came out wrong (e.g. bad column/table PDF parsing — task #74).

Two entry points power one reusable structured-data form:

1. **Create CV from scratch** — blank form → new `CvDocument` (no underlying file) → `POST`.
2. **Edit CV** — form pre-filled from an existing CV's `structuredData` (uploaded + AI-extracted, or previously builder-created) → in-place `PATCH` of the same `CvDocument`.

## Context

- Backend: `apps/opticv-be/src/app/cv/` (new builder logic lives alongside existing `CvController`/`CvService`), `apps/opticv-be/src/app/quota/` (quota gating), `apps/opticv-be/prisma/schema.prisma` (migration).
- Frontend: new lazy-loaded feature `apps/opticv-web/src/app/features/cv-builder/` (route-based, following the `cv-optimization` feature's structure/pattern), plus new entry points in `apps/opticv-web/src/app/features/dashboard/`.
- Shared types: `packages/shared/datatypes/src/lib/datatypes.ts` (`CvStructuredData`, `LimitedFeature`, `TierLimits`).
- No new data model — `CvStructuredData` already is the CV builder's data model. Everything downstream (templates, accent colors, A4 preview, PDF/DOCX export, CV Optimization flow) already works on `CvStructuredData` and needs no changes once a `CvDocument` has `structuredData` populated.

## Scope

### In scope

- New Prisma migration: make `CvDocument.storageKey`, `fileName`, `fileSize`, `mimeType` nullable, to support builder-created CVs with no underlying file.
- New `parseStatus`/`extractionStatus` handling for builder CVs: mark as not-applicable/complete (exact enum value TBD in Data/API section below — see Assumptions).
- New backend endpoints on `CvController`/`CvService`:
  - `POST /cv/manual` — create a `CvDocument` from a `CvStructuredData` payload, gated by the new `CV_BUILDER` quota.
  - `PATCH /cv/:id/structured-data` — update `structuredData` on an existing `CvDocument` (in-place edit), autosave-friendly.
- New `LimitedFeature` value `CV_BUILDER` added to the shared type union, with `TIER_LIMITS[tier].features.CV_BUILDER` entries: `FREE: 1`, `BASIC: 5`, `PRO: 10`. Gated via the existing `QuotaService.checkAndConsume()` / `UsageQuota` mechanism (monthly, resets on billing period, same as other `LimitedFeature`s) — no new quota mechanism needed.
- Re-extraction guard: once a `CvDocument`'s `structuredData` has been manually edited via the builder (create or edit), the existing `POST /cv/:id/extract` endpoint must be blocked (or require explicit confirmation) to avoid silently discarding manual corrections. Requires a new flag/marker on `CvDocument` to track "manually edited" state (see Data/API).
- Frontend: new lazy-loaded route-based feature `cv-builder` with:
  - Multi-section accordion form (reusing the `SectionCard` component pattern from `cv-optimization`), covering full `CvStructuredData` parity: Contact, Summary, Experience (repeatable, with bullets), Education, Skills, Certifications, Projects, Languages, Other/Additional Info, GDPR clause.
  - Live A4 preview alongside the form via the existing `CvA4Preview` component (unmodified).
  - GDPR clause section reusing the exact checkbox logic/state pattern from task #104 (`includeGdprClause` / `originalGdprClause`, `DEFAULT_GDPR_CLAUSE`).
  - Routes: `/cv-builder` (create, blank form) and `/cv-builder/:id` (edit, pre-filled from an existing CV's `structuredData`), both behind `authGuard`.
- New dashboard entry points:
  - "Create CV" action (e.g. button near existing CV list / empty state) → navigates to `/cv-builder`.
  - "Edit" row action in `cv-file-list` (alongside existing Optimize/Download/Delete) → navigates to `/cv-builder/:id`.
- Template/export gating (`allowedTemplates` per tier) applies identically to builder CVs as to uploaded CVs — no special-casing, since both are `CvDocument` rows flowing through the same preview/export pipeline.
- Frontend quota-exceeded handling: surface `QUOTA_EXCEEDED`/`FEATURE_NOT_AVAILABLE` errors from `POST /cv/manual` the same way existing `QuotaErrorPayload` errors are surfaced elsewhere in the app.
- Update `CvStore` after create/edit so the dashboard CV list stays in sync (mirrors existing `updateCvList()` usage after upload/delete).
- Fix the drift found during research: `CvStructuredDataDto` (`apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`) is missing `gdprClause` and `other` fields present on the `CvStructuredData` type — align the DTO as part of this task since the builder payload depends on the full shape being validated/serialized correctly.

### Out of scope

- Any change to the AI extraction pipeline itself (`CvExtractionService`, extraction prompts).
- Changes to `maxStoredCvs` cap-style logic or `uploadCv()` — builder CVs use the new separate `CV_BUILDER` quota, not `maxStoredCvs`.
- Changes to `applySelectionsToCV` or the CV Optimization AI-selection flow — a builder-created/edited CV simply flows into optimization unchanged once `structuredData` is populated.
- Version history / undo for structured-data edits (PATCH simply overwrites `structuredData`).
- Autosave debounce/interval implementation details beyond "autosave-friendly" endpoint shape — exact frontend autosave trigger (interval vs. on-blur vs. explicit Save button) is a UI implementation decision left to the implementation-plan phase.
- Multi-user/collaborative editing, offline support.

## Behavior

### Create flow

1. User clicks "Create CV" on the dashboard.
2. Frontend navigates to `/cv-builder` with a blank form (all sections empty/default).
3. User fills in sections via the accordion; live A4 preview updates as they type (client-side, no network calls per keystroke).
4. User clicks "Save" (or equivalent).
5. Frontend calls `POST /cv/manual` with the current `CvStructuredData` payload.
6. Backend: `SupabaseGuard` authenticates; `QuotaService.checkAndConsume(userId, 'CV_BUILDER', tier, periodStart, periodEnd, cancelAtPeriodEnd)` gates the request — throws `ForbiddenException` with `QUOTA_EXCEEDED` or `FEATURE_NOT_AVAILABLE` if the tier's monthly `CV_BUILDER` quota is exhausted or zero.
7. On success, backend creates a new `CvDocument` row: `structuredData` = payload, `storageKey`/`fileName`/`fileSize`/`mimeType` = `null`, `parseStatus`/`extractionStatus` set to the not-applicable/complete value (see Data/API), manually-edited flag set to `true`.
8. Frontend updates `CvStore` (adds new CV to `cvList`) and navigates back to the dashboard (or to the CV's detail/preview, TBD in implementation plan).

### Edit flow

1. User clicks "Edit" on a CV row in `cv-file-list` (works for both uploaded+extracted CVs and builder-created CVs).
2. Frontend navigates to `/cv-builder/:id`.
3. Frontend fetches the CV's current `structuredData` via existing `GET /cv/:id/structured-data` (throws `NotFoundException` if extraction never completed and no builder data exists yet — same as today).
4. Form pre-fills from the fetched `CvStructuredData`; live A4 preview shows current state.
5. User edits fields; clicks "Save".
6. Frontend calls `PATCH /cv/:id/structured-data` with the full updated `CvStructuredData` payload.
7. Backend: `SupabaseGuard` authenticates; ownership check (`doc.userId !== userId` → `ForbiddenException`, mirroring `deleteCv()`'s pattern); no quota consumption on edit (only creation consumes the `CV_BUILDER` quota — editing an already-owned CV is unlimited).
8. Backend overwrites `structuredData`, sets manually-edited flag to `true`.
9. Frontend updates `CvStore` and confirms save (toast, mirroring task #116's clipboard-copy toast pattern).

### Re-extraction guard

- Once a `CvDocument`'s manually-edited flag is `true`, the frontend hides or disables the "extract"/"re-parse" action for that CV, and `POST /cv/:id/extract` on the backend returns a `ForbiddenException` (new error code, e.g. `MANUAL_EDIT_PROTECTED`) if called anyway.

### GDPR clause

- Builder form's GDPR section renders the same checkbox UI/copy as `ExportFooter`'s "Compliance" section (native `<input type="checkbox">`, `accent-primary` styling, same title text).
- On save, the builder computes `structuredData.gdprClause` using the same logic as `applySelectionsToCV`'s final step: `null` if unchecked, else the original clause or `DEFAULT_GDPR_CLAUSE`.

## Edge Cases

- **Quota exhausted on create**: `POST /cv/manual` returns `403` with `QuotaErrorPayload` (`QUOTA_EXCEEDED`, includes `limit`, `resetsAt`, `cancelAtPeriodEnd`) or `FEATURE_NOT_AVAILABLE` if the tier's `CV_BUILDER` limit is `0`. Frontend surfaces this the same way other quota errors are shown elsewhere (existing pattern, not new UI).
- **Edit a CV that has never been extracted** (`extractionStatus !== 'COMPLETED'`, `structuredData === null`): `GET /cv/:id/structured-data` throws `NotFoundException` today. Builder's edit route must handle this — either block editing until extraction completes, or (if the CV is itself already a builder-created CV) proceed normally since builder CVs always have `structuredData` populated at creation. Exact UX for this case (e.g. showing an error vs. redirecting) is left to implementation planning.
- **Editing someone else's CV**: ownership check on `PATCH /cv/:id/structured-data` returns `403 Forbidden`, mirroring `deleteCv()`.
- **Re-extraction attempted after manual edit**: blocked per the Re-extraction guard behavior above.
- **Empty/partial form on save**: all `CvStructuredData` fields are already nullable/array-typed with no required fields at the type level (`contact.name: string | null`, etc.) — the builder does not need to enforce any field as mandatory beyond what the UI reasonably nudges (e.g. name/email likely encouraged but not blocking save). No new validation rules invented here; if strict validation is desired it should be scoped as a follow-up, since the raw task doesn't specify field-level requiredness.
- **Download action on a builder-created CV with no file**: since `storageKey` is now nullable, the existing "Download" row action in `cv-file-list` must not be shown (or must be disabled) for CVs where `storageKey === null`.
- **Race on quota consumption**: already handled by existing `QuotaService.checkAndConsume()` transaction + retry-on-`P2002` logic — no new handling needed.

## Data / API

### Prisma schema changes (`apps/opticv-be/prisma/schema.prisma`)

- `CvDocument.storageKey`: `String` → `String?`
- `CvDocument.fileName`: `String` → `String?`
- `CvDocument.fileSize`: `Int` → `Int?`
- `CvDocument.mimeType`: `String` → `String?`
- New field to track manual edits, e.g. `CvDocument.manuallyEdited Boolean @default(false)` — set to `true` on both create-via-builder and edit-via-builder; read by the re-extraction guard.
- `parseStatus`/`extractionStatus` for builder CVs: **assumption** — reuse existing `ParseStatus`/`ExtractionStatus` enums, setting both to `COMPLETED` for builder-created CVs (since there's no parse/extraction step to run, and downstream code already gates on `extractionStatus === 'COMPLETED'` in `getStructuredData()`). No new enum value added, to avoid touching every switch/consumer of these enums. Flag explicitly for confirmation during implementation planning if a dedicated `NOT_APPLICABLE` value is preferred.

### Shared types (`packages/shared/datatypes/src/lib/datatypes.ts`)

- `LimitedFeature` union: add `'CV_BUILDER'`.
- `TIER_LIMITS`: add `CV_BUILDER` entries — `FREE: 1`, `BASIC: 5`, `PRO: 10` — to each tier's `features` map.
- `CvDocument` type: `fileName`, `storageKey` (and `fileSize`, `mimeType` if typed) become `| null` to match nullable schema columns; add `manuallyEdited: boolean`.

### New/changed backend endpoints (`CvController`)

- `POST /cv/manual`
  - Body: `CvStructuredData`.
  - Guards: `SupabaseGuard`.
  - Gating: `QuotaService.checkAndConsume(userId, 'CV_BUILDER', tier, periodStart, periodEnd, cancelAtPeriodEnd)`.
  - Response: created `CvDocument`.
  - Errors: `403 QUOTA_EXCEEDED` / `403 FEATURE_NOT_AVAILABLE`.
- `PATCH /cv/:id/structured-data`
  - Body: `CvStructuredData`.
  - Guards: `SupabaseGuard`.
  - Ownership check: `404`/`403` if `doc.userId !== userId`.
  - No quota consumption.
  - Sets `manuallyEdited = true`.
  - Response: updated `CvDocument`.
- `POST /cv/:id/extract` (existing, modified)
  - New guard clause: if `doc.manuallyEdited === true`, throw `ForbiddenException` with a new error code (e.g. `MANUAL_EDIT_PROTECTED`).

### DTO fix

- `CvStructuredDataDto` (`apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`): add missing `gdprClause` and `other` fields to match the `CvStructuredData` type, so the builder's payload validates/serializes correctly on both new endpoints.

## Assumptions

- **`parseStatus`/`extractionStatus` for builder CVs**: set to `COMPLETED` on both (reusing existing enum values) rather than introducing a new "not applicable" enum value, to minimize blast radius on existing switches/consumers. Confirm during implementation planning.
- **Field-level validation**: no new required-field validation is introduced beyond the existing nullable `CvStructuredData` shape; the raw task and research doc don't specify mandatory fields for the builder form.
- **Save UX (autosave vs. explicit Save button)**: left as an implementation-plan-level UI decision; this spec only commits to the PATCH/POST endpoint shapes being autosave-friendly (idempotent full-payload overwrite).
- **Post-save navigation**: exact destination after Create/Edit save (dashboard vs. CV detail/preview) left to implementation planning.
- **Manually-edited flag naming**: `manuallyEdited` is a proposed field name; final naming decided at implementation time.

## Acceptance (DEV)

- Build passes (`npm exec nx run-many -t build`).
- Typecheck passes (`npm exec nx run-many -t typecheck`).
- Lint passes (`npm exec nx run-many -t lint`).
- New Prisma migration applied cleanly; existing `uploadCv()`/download/export code paths updated to handle nullable `storageKey`/`fileName`/`fileSize`/`mimeType` without runtime errors.
- Unit tests added for: `POST /cv/manual` (success, quota-exceeded, feature-not-available), `PATCH /cv/:id/structured-data` (success, ownership failure), re-extraction guard on `POST /cv/:id/extract` when `manuallyEdited === true`.
- Frontend: new `cv-builder` feature builds and renders; accordion sections cover full `CvStructuredData` parity; `CvA4Preview` reflects live form state; GDPR checkbox behavior matches `ExportFooter`'s existing logic.
- Dashboard: "Create CV" and "Edit" entry points present and functional; `CvStore` stays in sync after create/edit.
- No breaking changes to existing upload/extract/download/delete/optimization flows.
- AXE checks pass on the new builder form; WCAG AA (focus management, contrast, ARIA) followed per project Angular conventions.
