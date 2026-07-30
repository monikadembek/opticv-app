# Implementation Plan: 102-include-missing-position-title

## Source

- Specification: `.claude/specs/tasks/102-include-missing-position-title/02-spec.md`
- Spec review: `.claude/specs/tasks/102-include-missing-position-title/03-spec-review.md` (PASS)

## Preconditions Verified

- Spec review result is PASS.

---

## Step 1 — Shared type: `CvContactInfo`

File: `packages/shared/datatypes/src/lib/datatypes.ts`

- Add `position: string | null;` to the `CvContactInfo` type, immediately after the `name` field (currently lines 5–12).

---

## Step 2 — Backend DTO: `CvContactInfoDto`

File: `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`

- Add a matching field to `CvContactInfoDto` (currently lines 3–21), immediately after `name`:
  ```ts
  @ApiProperty({ nullable: true, example: 'Software Engineer' })
  position!: string | null;
  ```

---

## Step 3 — Extraction prompt

File: `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts`

- In `EXTRACTION_SYSTEM_PROMPT`, add `"position": string or null,` to the `contact` object, immediately after `"name": string or null,` (currently line 5).
- Add a new bullet to the `Rules` section clarifying extraction priority: prefer a professional headline/title shown near the candidate's name; if none exists, fall back to the title of the most recent/current entry in `experience`; use `null` if no position title can be determined.

---

## Step 4 — Backend tests

File: `apps/opticv-be/src/app/ai/services/openai.service.spec.ts`

- No changes required to existing tests — they assert the extraction result is returned verbatim as parsed JSON (e.g. `{ contact: { name: 'Jane' } }`), which is shape-agnostic and unaffected by the new field.
- Add one new test case under `describe('extractCvDataFromFile', ...)` asserting that a `position` value inside `contact` in the mocked `output_text` JSON is returned unchanged in the result (mirrors the existing `'returns parsed JSON object on success'` test, extended with `"position":"Software Engineer"` in the input and expected output). This verifies the pass-through behavior without adding schema validation (none exists today).

---

## Step 5 — Frontend: preview templates

File: `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html`

For each of the 6 `@case` blocks, add a new `@if (cv()!.contact.position) { ... }` block immediately after the existing `@if (cv()!.contact.name) { ... }` block and before the contact-details block (email/phone/etc.). Style each position line as visually secondary to the name (smaller size / lighter weight or color), consistent with that template's existing secondary-text styling (matching the contact-line font-family/color pattern already used in the same template block).

Exact insertion points:

1. **`default`** (case starts line 3) — insert after the name `@if` block closing at line 35, before line 36 (`</div>` closing the name column). Position line goes inside the same left-hand `<div>` as the name, below it.
2. **`classic`** (case starts line 231) — insert after the name `@if` block closes at line 254, before the contact-details `@if` at line 255.
3. **`modern`** (case starts line 476) — insert after the name `@if` block closes at line 499, before the contact-details `@if` at line 500.
4. **`corporate`** (case starts line 741) — insert after the name `@if` block closes at line 774, before the contact-details `@if` at line 775 (still inside the header band `<div>`).
5. **`minimal`** (case starts line 1015) — insert after the name `@if` block closes at line 1040, before the contact-details `@if` at line 1041 (still inside the centered `<div>`).
6. **`impact`** (case starts line 1270) — insert after the name `@if` block closes at line 1294, before the contact-details `@if` at line 1295.

Note: exact line numbers will shift after each edit is applied within the same file — apply edits top-to-bottom (default → classic → modern → corporate → minimal → impact) and re-locate each subsequent insertion point by the `@if (cv()!.contact.name)` / name-closing-brace pattern rather than by absolute line number.

---

## Step 6 — Frontend: PDF export (jsPDF)

File: `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

Update all 3 header layout branches in the `// ── Contact / Header ──` section (starting line 611) to render `cv.contact.position` directly below the name, using a smaller/lighter font than the name (reuse `profile.contactSize`/grey color pattern already used for contact lines) and advancing the `y` cursor accordingly:

1. **Center branch** (`profile.nameAlign === 'center'`, lines 613–621): after drawing `cv.contact.name` and before advancing to contact parts, if `cv.contact.position` is present, draw it centered below the name (own font size/color, then increase `y` by an appropriate line height) before the existing `y += 26` / contact-parts logic.
2. **Right-block branch** (`contactAlign === 'right-block'`, lines 648–677): after drawing `cv.contact.name` at `marginLeft, y` (line 664), if `cv.contact.position` is present, draw it below the name at `marginLeft` with incremented `y`, adjusting the final `y = Math.max(...)` calculation (line 677) to account for the extra line.
3. **Left/band branch** (else branch, lines 678–734): after drawing `cv.contact.name` (line 711) and its `y += 20` (line 712), if `cv.contact.position` is present, draw it below the name at `marginLeft` before the contact-parts block, incrementing `y` accordingly. If `profile.headerBand` is true, ensure `bandHeight` calculation (lines 688–691) accounts for the extra position line when present.

In all 3 branches: skip rendering entirely (no `y` advance, no gap) when `cv.contact.position` is falsy, matching the existing pattern for `cv.contact.name`.

---

## Step 7 — Frontend: DOCX export (docx.js)

File: `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

Update both layout branches in the `// ── Contact ──` section (starting line 1062):

1. **`profile.contactRightStack` branch** (lines 1071–1104): after the name/first-contact `Paragraph` (lines 1074–1099), if `cv.contact.position` is present, insert a new `Paragraph` with a `TextRun` for the position (smaller size/lighter color than name, e.g. matching the `18`/`'666666'` styling used for contact parts) before the loop over `restContacts`.
2. **Default branch** (lines 1105–1136): after the name `Paragraph` (lines 1106–1123), if `cv.contact.position` is present, insert a new `Paragraph` with a `TextRun` for the position (same secondary styling as above, same `contactAlign` alignment) before the `contactParts` paragraph.

In both branches: only push the position `Paragraph` when `cv.contact.position` is truthy, matching the existing `if (cv.contact.name)` guard pattern.

---

## Step 8 — Out-of-scope confirmation (no action)

- Do not modify the optimization service/processor — `contact` (including the new `position` field) already passes through `structuredData` unchanged; no code path there filters or rewrites `contact` fields.
- Do not add DB migrations — `structuredData` is a JSON column.
- Do not search for or add a manual contact-editing UI unless one is discovered to already exist with per-field inputs for `name`/`email`/etc.; if found during implementation, add a parallel `position` input for consistency (per spec Assumptions), otherwise skip.

---

## Verification Checklist

- [ ] `npm exec nx build opticv-be`
- [ ] `npm exec nx build opticv-web`
- [ ] `npm exec nx typecheck opticv-be`
- [ ] `npm exec nx typecheck opticv-web`
- [ ] `npm exec nx test opticv-be` (includes new `position` pass-through test)
- [ ] `npm exec nx lint opticv-be`
- [ ] `npm exec nx lint opticv-web`
- [ ] Manual: upload a CV with a clear position/title near the name → verify it appears below the name in all 6 preview templates, in the downloaded PDF, and in the downloaded DOCX.
- [ ] Manual: upload a CV with no discernible position title → verify no extra line/gap appears anywhere (preview, PDF, DOCX).

---

## Files Changed Summary

- `packages/shared/datatypes/src/lib/datatypes.ts` (modified)
- `apps/opticv-be/src/app/cv/dto/cv-response.dto.ts` (modified)
- `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts` (modified)
- `apps/opticv-be/src/app/ai/services/openai.service.spec.ts` (modified — new test case)
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html` (modified — 6 template blocks)
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` (modified — PDF: 3 branches, DOCX: 2 branches)

No new files are created; no files are deleted.
