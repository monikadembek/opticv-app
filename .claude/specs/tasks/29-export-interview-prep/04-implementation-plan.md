# Implementation Plan

Task ID: 29-export-interview-prep
Spec: 02-spec.md | Review: 03-spec-review.md (PASS WITH ISSUES — issues addressed below)

> **Review fixes applied in this plan:**
> - PDF approach resolved: use **jsPDF with manual text layout** (no html2canvas; avoids DOM screenshot, SSR-safe, smaller bundle).
> - Self-contradictory "buttons disabled" in-scope bullet is ignored — buttons are always enabled when the component is mounted.

---

## Step 1 — Install dependencies

Install two new packages into the workspace root (they are frontend-only at runtime):

```
npm install jspdf docx
npm install --save-dev @types/jspdf
```

> Note: `jspdf` ships its own types; `@types/jspdf` may not be needed — verify after install. `docx` includes its own types.

---

## Step 2 — Create `InterviewPrepExportService`

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/interview-prep-export.service.ts`

### Class shape

```ts
@Injectable({ providedIn: 'root' })
export class InterviewPrepExportService {
  private readonly platformId = inject(PLATFORM_ID);

  async exportToPdf(result: InterviewPrepResult): Promise<void> { ... }
  async exportToDocx(result: InterviewPrepResult): Promise<void> { ... }
}
```

### `exportToPdf` implementation notes

- Import `jsPDF` dynamically: `const { jsPDF } = await import('jspdf')` to avoid SSR issues and keep the initial bundle lean.
- Guard with `if (!isPlatformBrowser(this.platformId)) return;` at the top.
- Create `new jsPDF({ unit: 'pt', format: 'a4' })`.
- Use a cursor-based layout: track `y` position, call `doc.text()` for each line, advance `y` by line height, and call `doc.addPage()` when `y` exceeds the page bottom margin (`~780pt`).
- Define page constants: `marginLeft = 40`, `marginRight = 555`, `pageBottom = 780`, `lineHeight = 14`.
- Helper: `addWrappedText(doc, text, x, y, maxWidth, lineHeight)` — calls `doc.splitTextToSize()` then iterates lines, calling `addPage()` when needed. Returns the new `y` position.
- Helper: `addSection(doc, title, y)` — renders section heading in bold (font size 13), returns new `y`.
- Helper: `addHeading(doc, text, y)` — renders a sub-heading in bold (font size 11), returns new `y`.
- Helper: `addBody(doc, text, y)` — renders normal text (font size 10), returns new `y`.

**Section rendering order:**

1. Document title: "Interview Preparation" (font size 16, bold) at top.
2. **Interview Questions** heading.
   - For each question:
     - `Q{i+1}` + category + likelihood (if present) on one line (bold, size 10).
     - Question text (bold, size 11).
     - "Assessing: {whatTheyreAssessing}" (italic via font style).
     - Answer structure label + suggested answer.
     - If `needsUserInput && placeholdersToFill.length > 0`: "Fill in: {placeholders joined by ', '}".
     - If `trapsToAvoid.length > 0`: "Traps to avoid:" heading, then each trap as "- {trap}".
     - If `followUps.length > 0`: "Follow-up questions:" heading, then each as "Q: {followUpQuestion}" + "Guidance: {guidance}".
     - Add 8pt gap after each question.
3. **Questions to Ask Interviewer** heading (skip if `questionsToAskInterviewer.length === 0`).
   - For each: "{i+1}. {question}" (bold) + "{rationale}" (normal).
4. **Stress-Test Questions** heading (skip if `stressTestQuestions.length === 0`).
   - For each: question (bold) + whyItllComeUp (normal, italic) + recommendedAnswer (normal).
5. **Preparation Tips** heading (skip if `preparationTips.length === 0`).
   - For each tip: "• {tip}".

- Trigger download: `doc.save('interview-prep.pdf')`.

### `exportToDocx` implementation notes

- Import `docx` dynamically: `const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx')`.
- Guard with `if (!isPlatformBrowser(this.platformId)) return;` at the top.
- Build an array of `Paragraph` objects covering all four sections in the same order as PDF above.
- Use `HeadingLevel.HEADING_1` for section titles, `HeadingLevel.HEADING_2` for per-question sub-titles.
- Use `TextRun` with `bold: true` / `italics: true` where appropriate.
- Omit empty-array sub-sections (same conditions as PDF).
- Create `new Document({ sections: [{ children: paragraphs }] })`.
- Serialize: `const blob = new Blob([await Packer.toBuffer(doc)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })`.
- Trigger download using `URL.createObjectURL(blob)` + a temporary `<a>` element with `download="interview-prep.docx"`, appended to `document.body`, `.click()`-ed, then removed, then `URL.revokeObjectURL(url)`.

---

## Step 3 — Update `InterviewPrep` component

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.ts`

### Changes

1. Add imports: `signal`, `inject` from `@angular/core`; `InterviewPrepExportService` from the new service; `MessageService` from `primeng/api`.
2. Inject services:
   ```ts
   private readonly exportService = inject(InterviewPrepExportService);
   private readonly messageService = inject(MessageService);
   ```
3. Add two signals:
   ```ts
   readonly isBusyPdf = signal(false);
   readonly isBusyDocx = signal(false);
   ```
4. Add two async handler methods:
   ```ts
   async onExportPdf(): Promise<void> { ... }
   async onExportDocx(): Promise<void> { ... }
   ```
   Each method:
   - Sets the corresponding busy signal to `true`.
   - Calls the export service method inside a `try/catch`.
   - In `catch`: calls `this.messageService.add({ severity: 'error', summary: 'Export failed', detail: 'Could not generate the file. Please try again.' })`.
   - In `finally`: sets the busy signal back to `false`.
5. Add `Button` from `primeng/button` and `ToastModule` from `primeng/toast` to the `imports` array.
   - Note: `MessageService` is provided globally via `app.config.ts` — do not re-provide it in the component.

---

## Step 4 — Update `InterviewPrep` template

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.html`

Add a button group **above** the existing `<div class="space-y-8">` wrapper:

```html
<div class="flex gap-2 mb-4">
  <p-button
    label="Export to PDF"
    icon="pi pi-file-pdf"
    [loading]="isBusyPdf()"
    [disabled]="isBusyPdf() || isBusyDocx()"
    (onClick)="onExportPdf()"
  />
  <p-button
    label="Export to DOCX"
    icon="pi pi-file-word"
    [loading]="isBusyDocx()"
    [disabled]="isBusyPdf() || isBusyDocx()"
    (onClick)="onExportDocx()"
  />
</div>
```

- Both buttons are disabled while either export is in progress (prevents concurrent exports).
- Wrap the button group and existing content in a single root element if the template does not already have one. The current template has a single `<div class="space-y-8">` root — place the button group before it and wrap both in a `<div class="flex flex-col">` or a `<ng-container>`.

---

## Step 5 — Update `InterviewPrep` spec

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.spec.ts`

Add to `TestBed.configureTestingModule` providers:
```ts
providers: [MessageService]
```

Add a new `describe('export buttons')` block with the following tests:
- `renders "Export to PDF" and "Export to DOCX" buttons`
- `disables both buttons while PDF export is in progress` — spy on `InterviewPrepExportService.exportToPdf` to return a never-resolving promise; call `onExportPdf()`; assert `isBusyPdf()` is `true` and both buttons have `disabled` attribute.
- `disables both buttons while DOCX export is in progress` — same pattern with `exportToDocx`.
- `calls messageService.add with error severity when PDF export throws` — spy on `exportToPdf` to reject; spy on `MessageService.add`; call `onExportPdf()`; await; assert `messageService.add` called with `{ severity: 'error', ... }`.
- `calls messageService.add with error severity when DOCX export throws` — same for DOCX.
- `resets isBusyPdf to false after export completes` — resolve spy; assert signal is `false`.
- `resets isBusyDocx to false after export completes`.

---

## Step 6 — Verify

Run in order:

```bash
npm exec nx typecheck opticv-web
npm exec nx lint opticv-web
npm exec nx test opticv-web
npm exec nx build opticv-web
```

All must pass before the task is considered done.

---

## Files changed

| Action | Path |
|---|---|
| **Created** | `apps/opticv-web/src/app/features/cv-optimization/services/interview-prep-export.service.ts` |
| **Modified** | `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.ts` |
| **Modified** | `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.html` |
| **Modified** | `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.spec.ts` |
| **Modified** | `package.json` (new deps: `jspdf`, `docx`) |
