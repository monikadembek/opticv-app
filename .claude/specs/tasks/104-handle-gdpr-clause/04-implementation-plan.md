# Implementation Plan: Task 104 — Handle GDPR Clause

## Source

- Specification: `specs/tasks/104-handle-gdpr-clause/02-spec.md`
- Specification review: `specs/tasks/104-handle-gdpr-clause/03-spec-review.md` (PASS WITH ISSUES — no blocking findings)

## Preconditions Confirmed

- Review result is PASS WITH ISSUES, not FAIL — planning may proceed.
- All non-critical review findings are informational (ambiguity notes, assumption bookkeeping) and do not change scope; this plan follows `02-spec.md` as written.

---

## Step 1 — Shared type: add `gdprClause` to `CvStructuredData`

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

- Add `gdprClause: string | null;` as a new field on the `CvStructuredData` type (after `other`, matching the field's introduction order in the extraction schema in Step 2).
- No other type in this file changes.

---

## Step 2 — Backend extraction prompt: extract `gdprClause`

**File:** `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts`

- Add `"gdprClause": string or null` to the JSON schema block in `EXTRACTION_SYSTEM_PROMPT`, placed after `"other": string or null`.
- Add a new rule to the `Rules:` list clarifying: capture an existing GDPR/data-processing consent statement verbatim if present in the source CV text, else `null`. Do not summarize or truncate.

---

## Step 3 — Frontend default clause constant

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts` (existing file already exporting shared cv-optimization constants such as `DEFAULT_ACCENT_COLOR`, `CV_TEMPLATES`)

- Add and export a new constant `DEFAULT_GDPR_CLAUSE: string` with the exact text from spec Behavior §3:
  > I hereby give consent for my personal data included in this application to be processed for the purposes of the recruitment process, in accordance with Regulation (EU) 2016/679 (GDPR).

This keeps the default text alongside other export/template-level constants already imported by `cv-optimization.ts`, `export-footer.ts`, and `cv-export.service.ts`, avoiding a new file for a single constant.

---

## Step 4 — Merge logic: `applySelectionsToCV`

**File:** `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`

- Add two new parameters to `applySelectionsToCV`:
  - `includeGdprClause: boolean` (required, no default — caller always has this state)
  - `originalGdprClause: string | null` (required — the untouched value from the originally extracted `CvStructuredData`, distinct from `cv.gdprClause` because `cv` here is already the clone source; per spec §8 the original must be tracked separately from the toggle so re-checking restores it)
- At the end of the function (before `return clone;`), set:
  - `clone.gdprClause = !includeGdprClause ? null : (originalGdprClause ?? DEFAULT_GDPR_CLAUSE)`
- Import `DEFAULT_GDPR_CLAUSE` from `../cv-templates` (Step 3).
- Note: `structuredClone(cv)` at the top already deep-copies whatever `cv.gdprClause` is; this new logic overwrites `clone.gdprClause` unconditionally based on the two new parameters, so the source `cv.gdprClause` value itself is irrelevant to the output — only `originalGdprClause` (passed explicitly) and `includeGdprClause` matter. This satisfies edge case "toggling never mutates the originally extracted `gdprClause` value."

---

## Step 5 — `cv-optimization.ts`: state and wiring

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### 5a. New state signal

- Add `readonly includeGdprClause = signal<boolean>(false);` alongside other top-level signals (near `selections`).

### 5b. Initialize on new optimization run

- In `runOptimization()`, after `this.cvStructuredData.set(extractedData);`, add:
  `this.includeGdprClause.set(extractedData.gdprClause !== null);`

### 5c. Initialize on stored/loaded optimization

- In `loadStoredOptimization()`, in the `next: ({ data }) => { this.cvStructuredData.set(data); ... }` callback, add:
  `this.includeGdprClause.set(data.gdprClause !== null);`
  (Same signal-setting site as `cvStructuredData`, so initial state is derived from the loaded CV's original extracted value, consistent with a fresh run.)

### 5d. Wire into `mergedCv` computed

- Update the call inside `mergedCv` to `applySelectionsToCV(...)` to pass the two new arguments at the end:
  - `this.includeGdprClause()`
  - `this.cvStructuredData()?.gdprClause ?? null` (the original extracted clause, read from the signal holding the untouched extracted data — not from any merged/derived value)

### 5e. Toggle handler

- Add a new method:
  ```
  onGdprClauseToggled(checked: boolean): void
  ```
  Body: `this.includeGdprClause.set(checked);`
- No persistence call is required (`gdprClause`/`includeGdprClause` is not part of any `UserSelections`/`BulletUserState`/etc. persisted state per spec's Data/API section — no backend/DB changes are in scope). Confirm no `persist*Subject.next()` call is added here.

### 5f. Template wiring

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

- Locate the `<app-export-footer>` element (existing bindings for `selectedTemplate`, `accentColor`, `mergedCv`, etc.).
- Add a new two-way binding: `[(includeGdprClause)]="includeGdprClause"` (matches the `model()` pattern already used for `selectedTemplate`/`accentColor` in Step 6).

---

## Step 6 — `export-footer` component: checkbox UI

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`

- Add `readonly includeGdprClause = model<boolean>(false);` alongside the existing `selectedTemplate`/`accentColor` `model()` inputs.

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html`

- Add a new checkbox control inside the `template-selector` div (grouped with the other footer controls, per spec Behavior §4 "placement alongside existing footer controls"), following the native checkbox convention from `bullet-rewriter.html`:
  ```html
  <label class="gdpr-checkbox-label flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      [checked]="includeGdprClause()"
      (change)="includeGdprClause.set($any($event.target).checked)"
      class="accent-primary shrink-0"
      title="Include if you're applying to companies based in the EU, EEA, UK, or Switzerland"
      aria-label="Include GDPR clause"
    />
    <span class="text-xs md:text-sm">GDPR Clause</span>
  </label>
  ```
- Per spec Behavior §4: visible label text is "GDPR Clause"; the `title` attribute (tooltip) carries the longer sentence verbatim. This matches the spec review's flagged-but-accepted interpretation — no change to that reading since the review recommended proceeding as-is.
- No new CSS file changes are required if Tailwind utility classes suffice; only add to `export-footer.css` if visual alignment with sibling controls needs adjustment after visual check (in scope of Step 10 manual verification, not written here as a code change).

---

## Step 7 — Template rendering: `cv-template-preview.html`

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html`

The component receives `cv()` as a `CvStructuredData | null` input (existing pattern used throughout, e.g. `cv()!.languages`). Add a GDPR clause block immediately after each of the six templates' `@if (cv()!.languages.length > 0) { ... }` block closes, i.e. as the last element inside each `@case` body, right before that case's closing `</div>` (the outer template wrapper div) and before the `}` that ends the `@case`.

Insertion points (line numbers as currently read; will shift slightly after edits are applied sequentially — insert at the same *relative* position, immediately after the Languages block's closing `}` and before the case's final `</div>`):

1. `@case ('default')` — after line 233 (`}` closing Languages block), before line 234 (`</div>`)
2. `@case ('classic')` — after line 482, before line 483
3. `@case ('modern')` — after line 758, before line 759
4. `@case ('corporate')` — after line 1043, before line 1044
5. `@case ('minimal')` — after line 1311, before line 1312
6. `@case ('impact')` — after line 1613, before line 1614

For each of the six insertions, add a block of this shape (styling values reused from that same case's existing Languages heading styling for visual consistency — plain text, no heading label per spec, since spec Behavior §5 only requires the clause text itself, not a "GDPR" section heading):

```html
@if (cv()!.gdprClause) {
<div
  style="margin-top: 12px; font-size: 8px; line-height: 1.5; color: #555"
>
  {{ cv()!.gdprClause }}
</div>
}
```

- Use `@if (cv()!.gdprClause) { ... }` — guards against `null` per edge case "no empty headers or placeholders."
- Exact color/size values should visually match each template's smallest existing body text style (e.g. `color: #64748b` in modern/corporate/impact vs `color: #555` in default) — use each case's own existing muted-text color already present in its Languages/Projects rendering rather than a single hardcoded value across all six, for visual consistency with that template's palette. Confirm the specific hex per case by inspecting the nearest existing muted-text style in that same `@case` block before writing the final value.
- No new component inputs/outputs needed — `cv()` already carries `gdprClause` once Step 1's type change lands.

---

## Step 8 — PDF export: `cv-export.service.ts` → `exportToPdf()`

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

- Locate the `// ── Languages ──` block (around line 914–923, ending with `addWrappedText(langLine, profile.bodySize, 'normal');` before `doc.save('optimized-cv.pdf');`).
- After that block and before `doc.save(...)`, add:
  ```
  if (cv.gdprClause) {
    y += 10;
    checkPage(20);
    setGrey();
    addWrappedText(cv.gdprClause, 8, 'italic');
    setBlack();
  }
  ```
- Rationale for style choices: reuses the existing `addWrappedText` helper (auto-paginating via internal `checkPage()` calls per line, matching spec Behavior §6's "existing `checkPage()` auto-pagination"), uses `setGrey()`/`setBlack()` helpers already defined earlier in the method for muted disclaimer-style text, and an 8pt italic size distinct from `profile.bodySize` to visually mark it as a footer/legal note rather than CV content — consistent with how `addWrappedText(proj.technologies.join(', '), 9, 'italic')` is used elsewhere for de-emphasized text.
- Guard with `if (cv.gdprClause)` — no rendering when `null`, matching the edge case.

---

## Step 9 — DOCX export: `cv-export.service.ts` → `exportToDocx()`

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`

- Locate the `// ── Languages ──` block (around line 1375–1384, ending with `children.push(para(langLine));` before `const document = new Document(...)`).
- After that block, add:
  ```
  if (cv.gdprClause) {
    children.push(para(cv.gdprClause, false, true, 16, '666666'));
  }
  ```
- Uses the existing `para()` helper (`text, bold, italic, size, color, align`) already used identically for de-emphasized text (compare `para(proj.technologies.join(', '), false, true, 18, '666666')` for Projects' technologies line) — italic, smaller size (16 half-points ≈ 8pt, one step below `profile.bodySize` used elsewhere), grey color, matching the PDF path's visual treatment for consistency between the two export formats.
- Guard with `if (cv.gdprClause)` — no paragraph pushed when `null`.

---

## Step 10 — Tests

Per Acceptance (DEV): "tests added (extraction prompt/type change; `applySelectionsToCV` merge logic for the three `includeGdprClause`/original-clause combinations; export-footer checkbox initial state and toggle; template rendering presence/absence of clause; PDF/DOCX export inclusion)."

### 10a. `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`

Add test cases covering the three merge combinations from spec Behavior §3:
- `includeGdprClause = false` → merged `gdprClause` is `null` (regardless of `originalGdprClause`).
- `includeGdprClause = true`, `originalGdprClause` non-null → merged `gdprClause` equals `originalGdprClause` exactly.
- `includeGdprClause = true`, `originalGdprClause = null` → merged `gdprClause` equals `DEFAULT_GDPR_CLAUSE` (imported from `../cv-templates` in the spec file).
- Existing calls to `applySelectionsToCV` in this spec file must be updated to pass the two new required parameters (no defaults were added in Step 4), or the test suite will fail to compile.

### 10b. `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts`

- Test that the checkbox reflects `includeGdprClause()` input value (checked/unchecked).
- Test that toggling the checkbox's `(change)` event updates the `includeGdprClause` model output (two-way binding via `model()` — assert via `fixture.componentRef.setInput` / signal read, matching existing patterns for `selectedTemplate`/`accentColor` tests in this spec file if present).
- Test the `title` attribute value equals the spec-mandated tooltip sentence.

### 10c. `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-preview-pipes.spec.ts` (or a new/adjacent spec targeting `cv-template-preview` rendering — follow this file's existing scope; if it only covers pipes, add rendering assertions to whichever spec already exercises `cv-template-preview` component rendering, or create `cv-template-preview.spec.ts` following this feature folder's per-component spec convention)

- For at least one representative template (or all six, per existing test breadth in this suite), assert:
  - When `cv().gdprClause` is a non-null string, the rendered DOM contains that text.
  - When `cv().gdprClause` is `null`, no GDPR clause text/element is rendered.

### 10d. `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts`

- Test `exportToPdf()`: when `cv.gdprClause` is non-null, the generated PDF content includes the clause text (following this spec file's existing assertion approach for other sections, e.g. Languages); when `null`, it is absent.
- Test `exportToDocx()`: same non-null/null assertions for the DOCX output's paragraph children, following this spec file's existing assertion approach for Languages.

### 10e. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

- Test `includeGdprClause` initializes to `true` when `runOptimization()` receives `extractedData.gdprClause !== null`, and `false` when it is `null`.
- Test the same initialization behavior for `loadStoredOptimization()` (mock the `getStructuredData` response with both a non-null and null `gdprClause`).
- Test `onGdprClauseToggled()` updates the `includeGdprClause` signal.

### 10f. Backend extraction prompt

- No existing spec file targets `extract-cv-data.prompt.ts` (it is a plain string constant, not a service/class). Per Acceptance's "tests added (extraction prompt/type change)," add a minimal new spec file `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.spec.ts` asserting `EXTRACTION_SYSTEM_PROMPT` contains the string `"gdprClause"` in its schema section — a smoke-level test consistent with how a prompt-constant change can be verified without invoking the OpenAI API. Confirm this matches the backend's existing test conventions (Jest) before writing; if no analogous prompt-string test exists elsewhere in `apps/opticv-be`, keep this test minimal (schema string containment) rather than inventing broader coverage.

---

## Step 11 — Type-check and build verification

- `npm exec nx typecheck opticv-web`
- `npm exec nx typecheck opticv-be`
- `npm exec nx build datatypes` (shared type change must build cleanly before dependent apps)
- `npm exec nx test opticv-web`
- `npm exec nx test opticv-be`
- `npm exec nx lint opticv-web`
- `npm exec nx lint opticv-be`

---

## Files Summary

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-templates.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.html`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts`
- `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-preview-pipes.spec.ts` (or a new adjacent spec — see Step 10c)

### Created

- `apps/opticv-be/src/app/ai/prompts/extract-cv-data.prompt.spec.ts`
- Possibly `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-preview/cv-template-preview.spec.ts` (only if Step 10c determines no existing spec covers component rendering)
