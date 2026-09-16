# Code Review

Task ID: 29-export-interview-prep
Reviewer: Claude Code (senior fullstack engineer persona)
Date: 2026-05-23

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The core implementation is solid: SSR guard, dynamic imports, structured PDF layout, and DOCX generation all follow the plan. The component integration, signal-based busy state, error handling, and tests are well-executed. However, there is one notable unintended regression in `cv-optimization.ts` (a `filter()` call that restricts all optimizations to `INTERVIEW_PREP` only), one template convention violation (dynamic class interpolation instead of `[class]` binding), and a few minor issues described below.

---

### Conventions Violations

#### Critical (must fix before merge)

1. **`cv-optimization.ts` line 187 — Unintended regression: `filter` hard-gates all optimization to INTERVIEW_PREP only**

   ```ts
   from(Object.values(PromptType))
     .pipe(
       filter((prompt) => prompt === PromptType.INTERVIEW_PREP),  // ← THIS LINE
       mergeMap(...)
   ```

   This was added as an unstaged local change (visible in `git diff HEAD`) and appears to be a leftover debug/development artefact. It makes `runOptimization()` only ever run the `INTERVIEW_PREP` prompt, silently breaking every other optimization type (ATS score, keyword gap, summary rewrite, bullet upgrade, cover letter). This line must be removed before merge — it is not in the spec or plan for this task.

2. **`interview-prep.html` lines 32–33, 37–38 — Dynamic class via string interpolation instead of `[class]` binding**

   ```html
   class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {{ categoryClass(q.category) }}"
   ```

   The conventions file explicitly states: **"Do NOT use `ngClass`, use `class` bindings instead."** String interpolation of `{{ expr }}` inside a `class` attribute is the same anti-pattern — it mixes static and dynamic classes via template string rather than a proper binding. The correct pattern is:

   ```html
   class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
   [class]="categoryClass(q.category)"
   ```

   Or split into static and dynamic parts using `[class.xxx]`. This applies to both the category badge (line 32–33) and likelihood badge (lines 37–38).

#### Non-Critical (should fix)

1. **`interview-prep-export.service.ts` line 76 — `replace('_', ' ')` replaces only the first underscore**

   `String.replace()` with a string pattern replaces only the first match. Category values like `candidate_specific` would render as `candidate specific` correctly, but if any value had multiple underscores, the trailing ones would remain. Using `replaceAll('_', ' ')` is safer and matches intent. The same applies to the same pattern used in `interview-prep.html` lines 33 and 38.

2. **`interview-prep-export.service.ts` line 219 — DOCX category/likelihood label strip underscores but remove them entirely instead of replacing with space**

   ```ts
   { text: `Category: ${q.category.replace('_', '')}`, bold: true },
   // and
   { text: `  Likelihood: ${q.likelihood.replace('_', '')}`, }
   ```

   The PDF section (line 76) correctly replaces `'_'` with `' '` (space). The DOCX section replaces with `''` (empty string), so `candidate_specific` becomes `candidatespecific`. This is inconsistent with the PDF output and likely a typo. Should be `.replace('_', ' ')` (or `replaceAll`).

3. **`interview-prep.spec.ts` — Missing DOM-level button disabled state assertions for concurrent export prevention**

   The plan specifies: *"disables both buttons while PDF export is in progress — assert both buttons have `disabled` attribute."* The tests at lines 225–249 only check `isBusyPdf()` / `isBusyDocx()` signals, but do not assert that both `<p-button>` elements have `[disabled]` set in the DOM. This means the template binding `[disabled]="isBusyPdf() || isBusyDocx()"` is untested at the DOM level. Low severity, but the plan asked for it.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| "Export to PDF" button in `InterviewPrep` | Covered | Template line 2 |
| "Export to DOCX" button in `InterviewPrep` | Covered | Template line 10 |
| Loading/busy state on buttons | Covered | `[loading]` binding, `isBusyPdf`/`isBusyDocx` signals |
| Both buttons disabled while either is busy | Covered | `[disabled]="isBusyPdf() \|\| isBusyDocx()"` |
| Client-side PDF via jsPDF with manual text layout | Covered | `exportToPdf` in service |
| Client-side DOCX via `docx` library | Covered | `exportToDocx` in service |
| All four sections in PDF | Covered | Lines 69–139 in service |
| All four sections in DOCX | Covered | Lines 211–298 in service |
| Empty-array sub-sections omitted | Covered | Guards on `trapsToAvoid`, `followUps`, `placeholdersToFill`, sections 2–4 |
| Download as `interview-prep.pdf` | Covered | `doc.save('interview-prep.pdf')` |
| Download as `interview-prep.docx` | Covered | `anchor.download = 'interview-prep.docx'` |
| SSR guard with `isPlatformBrowser` | Covered | Both export methods, lines 10 and 145 |
| Error toast via `MessageService` on failure | Covered | `catch` block in both component handlers |
| Dynamic import for jsPDF and docx | Covered | `await import('jspdf')` and `await import('docx')` |
| `isBusyPdf` / `isBusyDocx` signals reset in `finally` | Covered | `finally` blocks in component |
| No `html2canvas` (plan deviation from spec) | Covered | Plan explicitly resolved this — jsPDF manual layout used |
| `MessageService` not re-provided in component | Covered | Not in `providers:` array |
| New dependencies `jspdf` and `docx` in package.json | Covered | Both present |

---

### Plan Deviations

1. **`exportToDocx` uses `Packer.toBlob()` instead of `Packer.toBuffer()` (plan step 2)**

   The plan says: `const blob = new Blob([await Packer.toBuffer(doc)], ...)`. The implementation uses `const blob = await Packer.toBlob(document)` (line 301). `Packer.toBlob()` is a convenience method that does the same thing internally. This is a valid and cleaner deviation — no functional difference.

2. **`interview-prep.html` wraps the button group and existing content without an additional outer element**

   The plan (step 4) says to wrap both in `<div class="flex flex-col">` or `<ng-container>` if needed. The template has no wrapping element — the button group `<div>` is placed directly before `<div class="space-y-8">` as siblings. Angular components require a single root element; the current template has two sibling root `<div>`s, which is valid in Angular 17+ (multi-root templates are supported). No functional issue, but worth noting.

3. **`ToastModule` not imported in component (plan step 3)**

   The plan says to add `ToastModule` from `primeng/toast` to the `imports` array. The component (`interview-prep.ts`) does not import `ToastModule`. The `<p-toast>` component is presumably provided at a higher level; if so, this omission is correct and the plan was wrong to suggest it. If `<p-toast>` is needed in this template, it would be missing. Worth verifying at runtime whether toasts actually appear.

---

### Null Safety Issues

1. **`interview-prep-export.service.ts` line 84 — `q.placeholdersToFill` accessed without null check when `needsUserInput` is true**

   The guard `if (q.needsUserInput && q.placeholdersToFill.length > 0)` assumes `placeholdersToFill` is always a defined array. Per the `InterviewPrepResult` type, if `placeholdersToFill` can be `undefined` when `needsUserInput` is `false`, the `q.placeholdersToFill.length` access would throw when `needsUserInput` is `true` but `placeholdersToFill` is undefined. This depends on the actual type definition — if the type guarantees `placeholdersToFill` is always an array, this is fine. Recommend verifying the type in `@opticv/datatypes`.

---

### Code Smells

1. **`interview-prep-export.service.ts` lines 154–199 — Seven local helper factory functions defined inline in `exportToDocx`**

   `heading1`, `heading2`, `body`, `bold`, `italic`, `mixed`, `bullet`, and `spacer` are all defined inside the async method body on every call. This is a minor style concern (they could be private static methods or module-level helpers), but given the 1000-line file limit and the file being 312 lines total, it is not a practical problem.

2. **`interview-prep-export.service.ts` line 150 — `type Para = InstanceType<typeof Paragraph>` is a local workaround for typing the paragraphs array**

   This is a reasonable pragmatic solution for typing the array without importing the constructor type directly. No action needed, but it is slightly unusual.

3. **`interview-prep-export.service.ts` — Magic numbers for font sizes and spacing (e.g., `50`, `780`, `14`, `40`, `515`)**

   These are all in `exportToPdf` and are used as layout constants without named grouping. The spec acknowledges these values (margin 40, pageBottom 780, lineHeight 14), but extracting them as named `const` at the top of the method (which the implementation does — lines 16–20) is already done. No action needed.

---

### Recommendation

**Fix critical issues before merge.**

Two issues must be addressed:

1. Remove the `filter((prompt) => prompt === PromptType.INTERVIEW_PREP)` line from `cv-optimization.ts` — this is a regression that breaks all other optimization types.
2. Fix the template `{{ categoryClass(...) }}` / `{{ likelihoodClass(...) }}` interpolations in `interview-prep.html` to use proper `[class]` bindings per project conventions.

The DOCX `replace('_', '')` → should be `replace('_', ' ')` typo (non-critical item 2) is also strongly recommended to fix as it produces garbled output in the DOCX file.
