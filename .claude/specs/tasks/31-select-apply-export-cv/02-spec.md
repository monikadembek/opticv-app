# Task Specification

## Source

Azure DevOps Task: 31 — Select and apply optimizations, export optimized CV to PDF and DOCX

## Goal

Allow users to select, optionally edit, and apply AI-suggested optimizations (summary rewrite, keyword gap, bullet upgrades) to their CV, then export the full merged CV as PDF or DOCX using a client-side layout template.

## Context

This builds on the existing `cv-optimization` feature. The optimization panels (`SummaryRewrite`, `KeywordGap`, `BulletRewriter`) currently display AI results read-only. The `CvStructuredData` (summary, experience bullets, skills) is already stored in the DB as structured JSON on `CvDocument.structuredData`. Client-side export already exists for cover letter (`CoverLetterExportService`) and interview prep (`InterviewPrepExportService`) using `jsPDF` + `docx`.

---

## Scope

### In scope

- **Summary Rewrite panel:** variant selection + inline textarea editing + "Apply" button
- **Keyword Gap panel:** suggested reformulation selection + inline textarea editing + "Apply" button
- **Bullet Rewriter panel:** per-bullet selection between original and AI-rewritten, with inline editing + per-bullet "Apply" button
- **Save applied output** to `optimization_results.userEditedOutput` via existing `PATCH /optimizations/{id}/user-output` endpoint
- **Export optimized CV to PDF** — merges session-state edits with original `CvStructuredData`, renders with a fixed layout template
- **Export optimized CV to DOCX** — same merge, different output format
- Two export buttons on the main `CvOptimization` page

### Out of scope

- Multiple export layout templates (future)
- Persisting selection/edit state across page reloads (session-only)
- Applying keyword changes directly to the CV database record
- Applying summary/bullet changes directly to `CvDocument.structuredData`
- Backend-side export rendering
- LinkedIn Rewrite, ATS Score, Interview Prep, Cover Letter panels (unchanged)

---

## Behavior

### 1. Summary Rewrite — Select, Edit, Apply

**Current state:** Panel displays 3 variants (achievement_led, identity_led, mission_led) as read-only cards.

**New behavior:**

1. Each variant card gets a radio button or selection indicator. No variant is pre-selected on load.
2. When the user selects a variant, a `<textarea>` appears immediately below the variant list, pre-filled with that variant's text.
3. Switching to a different variant replaces the textarea content (any unsaved edits are lost — no per-variant tracking).
4. The user may freely edit the textarea text.
5. An "Apply selected version" button is shown below the textarea.
6. Clicking "Apply selected version":
   - Calls `PATCH /optimizations/{id}/user-output` with `{ userEditedOutput: <textarea value> }` where `id` is the `OptimizationResult` record for `SUMMARY_REWRITE`.
   - On success: stores the value in component/session state as the applied summary; shows a brief success indicator on the button.
   - On error: shows an inline error message; does not clear the textarea.
7. The applied summary is held in session state for use during export.

### 2. Keyword Gap — Select, Edit, Apply

**Current state:** Panel displays matched, missing, and underweighted keywords as read-only chips/lists.

**New behavior:**

1. For each **missing keyword**, display the keyword name. Since there is no AI-generated reformulation suggestion, the user interaction is:
   - A checkbox or selection indicator next to each missing keyword.
   - When one or more keywords are selected, a `<textarea>` appears (or is shown inline) pre-filled with the selected keywords joined as a comma-separated list (or one per line — see Assumption A1).
2. The user may freely edit the textarea content (e.g., rephrase how they will incorporate keywords).
3. An "Apply keywords" button is shown.
4. Clicking "Apply keywords":
   - Calls `PATCH /optimizations/{id}/user-output` with `{ userEditedOutput: <textarea value> }` for the `KEYWORD_GAP` result record.
   - On success: stores value in session state; shows success indicator.
   - On error: shows inline error.
5. The applied keywords text is held in session state for export (appended to the skills section of the exported CV).

### 3. Bullet Rewriter — Select, Edit, Apply (per bullet)

**Current state:** Panel shows bullets grouped by position (company/title), each with original text, weakness note, and AI-rewritten version (where `action === 'rewrite'`).

**New behavior:**

1. For each bullet where `action === 'rewrite'`:
   - Show two options: "Original" and "AI Rewrite" (radio buttons or toggle).
   - Default selection: "AI Rewrite" pre-selected.
   - When "AI Rewrite" is selected, show a `<textarea>` pre-filled with `bullet.rewritten`.
   - When "Original" is selected, show a `<textarea>` pre-filled with `bullet.text` (the original).
   - The user may edit the textarea freely.
   - An "Apply" button per bullet.
2. For bullets where `action === 'keep_as_is'` or `action === 'recommend_cut'`: display read-only with a label (no selection/edit UI).
3. Clicking per-bullet "Apply":
   - Aggregates all currently-applied bullets (from session state) plus this one.
   - Calls `PATCH /optimizations/{id}/user-output` with `{ userEditedOutput: <serialized JSON string of all applied bullets> }` for the `BULLET_UPGRADE` result record. The serialized format is a JSON array of `{ positionIndex, bulletIndex, text }` objects.
   - On success: stores in session state; shows success indicator on the bullet's Apply button.
   - On error: shows inline error near the bullet.
4. Applied bullet texts are held in session state keyed by `(positionIndex, bulletIndex)` for export merge.

### 4. Export — Full Optimized CV

**Trigger:** Two buttons on the main `CvOptimization` page — "Export optimized CV to PDF" and "Export optimized CV to DOCX". Both always visible (not gated on whether optimizations have been applied).

**Data assembly (client-side merge):**

The export service reads:
- Original `CvStructuredData` (already available in the component from the job application load flow).
- Session-state applied values:
  - Applied summary → replaces `structuredData.summary`
  - Applied keywords text → parsed back to array, merged with (appended to) `structuredData.skills`, deduplicating by case-insensitive match
  - Applied bullets → for each `(positionIndex, bulletIndex)` in session state, replace the corresponding entry in `structuredData.experience[positionIndex].bullets[bulletIndex]`
- If no optimization has been applied for a section, the original CV data for that section is used unchanged.

**Layout template (v1 — single template):**

A clean single-column layout with the following section order:
1. Contact info (name, email, phone, location, LinkedIn, website)
2. Summary
3. Experience (grouped by position: title, company, location, dates, bullets)
4. Education
5. Skills (comma-separated or as a list)
6. Certifications
7. Projects
8. Languages

The template is implemented in a new `CvExportService` (client-side Angular service) using `jsPDF` for PDF and `docx` for DOCX, following the same pattern as `CoverLetterExportService` and `InterviewPrepExportService`.

**PDF output:** `optimized-cv.pdf`
**DOCX output:** `optimized-cv.docx`

**Loading state:** While export is generating, the clicked button shows a loading/spinner state and is disabled. The other button remains enabled.

---

## Edge Cases

- **No optimizations applied:** Export uses 100% original CV data — this is valid and expected.
- **Empty summary in original CV:** If `structuredData.summary` is null and no summary has been applied, the Summary section is omitted from the export.
- **Empty skills array:** If no skills exist and no keywords applied, the Skills section is omitted.
- **`CvStructuredData` not yet extracted:** Export buttons should be disabled with a tooltip ("CV data not ready") if `extractionStatus !== 'COMPLETED'`.
- **PATCH failure on Apply:** The session-state value is NOT updated on failure; the textarea retains its content so the user can retry.
- **Bullet with `action !== 'rewrite'`:** No Apply button is shown; these bullets always export as their original text.
- **Switching summary variant after Apply:** Replaces textarea content; a new Apply is required to update the applied session state and DB value.

---

## Data / API

### Existing endpoint used (no changes needed)

```
PATCH /optimizations/{id}/user-output
Body: { userEditedOutput: string }
```

Where `id` is the `OptimizationResult.id` for the relevant `PromptType`. The `id` values are available from the SSE job complete events already stored in the component.

### Session state additions (frontend only)

New signal or computed values in `CvOptimization` component (or a new `OptimizationEditsStore`):

```typescript
type AppliedSummary = string | null;

type AppliedBullet = {
  positionIndex: number;
  bulletIndex: number;
  text: string;
};

type AppliedEdits = {
  summary: AppliedSummary;
  keywordsText: string | null;       // raw textarea value from keyword gap
  bullets: AppliedBullet[];
};
```

### New frontend service

**`CvExportService`** at `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

```typescript
interface CvExportService {
  exportToPdf(cv: CvStructuredData, edits: AppliedEdits): void;
  exportToDocx(cv: CvStructuredData, edits: AppliedEdits): void;
}
```

---

## Assumptions

- **A1:** For Keyword Gap, selected keywords are joined one per line in the textarea as a starting point for the user to edit. On export, the applied `keywordsText` is split by newline and comma, trimmed, and merged into `skills[]`.
- **A2:** The `OptimizationResult.id` for each `PromptType` is accessible from the SSE event or a separate fetch. If not directly available, a GET endpoint to fetch optimization results by `jobApplicationId` may be needed — to be confirmed during implementation.
- **A3:** `CvStructuredData` is already available in the `CvOptimization` component (fetched as part of job application load). If not, a `GET /cv/{id}` call will be added.
- **A4:** The `docx` and `jsPDF` libraries are already installed (used by existing export services).
- **A5:** For bullets with `action === 'recommend_cut'`, they are displayed with a "Suggested: remove" label but are still exported as original text (no removal behavior in this task).

---

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- Type check passes (`npm exec nx typecheck opticv-web`)
- Lint passes (`npm exec nx lint opticv-web`)
- Summary Rewrite: selecting a variant shows textarea; editing and clicking Apply calls PATCH and stores in session state
- Keyword Gap: selecting keywords populates textarea; Apply calls PATCH
- Bullet Rewriter: per-bullet original/rewrite toggle + textarea; Apply calls PATCH
- "Export optimized CV to PDF" downloads a valid PDF containing all CV sections with applied edits merged in
- "Export optimized CV to DOCX" downloads a valid DOCX with the same content
- Export with zero applied optimizations exports the original CV data without errors
- Export buttons disabled when `extractionStatus !== 'COMPLETED'`
- No breaking changes to existing read-only panel behavior or other optimization panels
