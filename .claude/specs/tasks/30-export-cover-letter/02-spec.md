# Task Specification

## Source

Azure DevOps Task: 30 — Export selected cover letter to PDF or DOCX

## Goal

Fix a salutation-duplication bug in the cover letter editor, then implement PDF and DOCX export of the currently-edited cover letter (including user tweaks), preserving basic formatting (bold, italic, paragraphs) from the Quill editor.

## Context

Feature lives entirely in the Angular frontend under:
`apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/`

Export follows the pattern established in Task 29:
`apps/opticv-web/src/app/features/cv-optimization/services/interview-prep-export.service.ts`

The Quill editor (`p-editor`) stores its content as HTML in the `editorContent` signal. Export buttons already exist in the template but are disabled with "Coming soon" tooltips.

No backend changes are required for this task.

## Scope

### In scope

- Fix salutation duplication: guard in `buildContent()` to not prepend salutation when `fullLetter` already starts with it
- New `CoverLetterExportService` with `exportToPdf(html: string): Promise<void>` and `exportToDocx(html: string): Promise<void>` methods
- Export reads from `editorContent()` signal (post-user-edits HTML)
- Basic formatting preserved: bold, italic, paragraph breaks — no tables, no lists (cover letters don't have them)
- Loading state on each export button while the async export runs
- Error toast on export failure (reuse PrimeNG `MessageService` pattern from interview-prep component)
- Enable and wire up the two existing export buttons in `cover-letter-editor.html`
- Unit tests for the service and updated component tests

### Out of scope

- Backend/prompt fix so `fullLetter` never embeds the salutation (separate concern)
- Preserving underline, strikethrough, font-size or color from the editor
- Saving the edited letter to the database
- Any new UI components

## Behavior

### 1. Salutation fix

In `cover-letter-editor.ts`, `buildContent(index)`:

Before prepending `salutation`, check whether `variants[index].fullLetter` already starts with the salutation string (after trimming). If it does, skip the prepend. Case-insensitive comparison is not required — the salutation comes from the same AI response so casing is consistent.

```
if salutation is truthy AND fullLetter does NOT start with salutation:
  text = salutation + "\n\n" + fullLetter
else:
  text = fullLetter
```

### 2. CoverLetterExportService

New file: `apps/opticv-web/src/app/features/cv-optimization/services/cover-letter-export.service.ts`

- `@Injectable({ providedIn: 'root' })`
- Injects `PLATFORM_ID`; both methods return early if not browser

**HTML parsing helper (private):**
Parse the HTML string from the Quill editor into a structured list of blocks:
- `<p>` → paragraph block
- `<strong>` / `<b>` inside a paragraph → bold run
- `<em>` / `<i>` inside a paragraph → italic run
- `<br>` → line break within a paragraph
- Strip all other tags

Use the browser's `DOMParser` API (`new DOMParser().parseFromString(html, 'text/html')`) — no third-party HTML parser needed.

**`exportToPdf(html: string): Promise<void>`**

- Dynamic import: `const { jsPDF } = await import('jspdf')`
- A4 format, pt units, margins: left 56pt, right 56pt, top 60pt, bottom 60pt
- For each paragraph block:
  - Render inline runs with `doc.setFont('helvetica', style)` switching per run (bold, italic, bolditalic, normal)
  - After each paragraph, add 10pt vertical gap
  - Respect page bottom — call `doc.addPage()` and reset `y` when needed
- Save as `cover-letter.pdf`

**`exportToDocx(html: string): Promise<void>`**

- Dynamic import: `const { Document, Packer, Paragraph, TextRun } = await import('docx')`
- For each paragraph block, create a `Paragraph` with an array of `TextRun` children reflecting bold/italic state of each run
- Empty paragraph between blocks (`new Paragraph({ children: [] })`)
- Create `Document`, pack to blob, trigger download as `cover-letter.docx` via anchor click (same pattern as `interview-prep-export.service.ts`)

### 3. Component wiring

In `cover-letter-editor.ts`:

- Inject `CoverLetterExportService` and `MessageService`
- Add two loading signals: `isBusyPdf = signal(false)`, `isBusyDocx = signal(false)`
- Add `onExportPdf()` and `onExportDocx()` async methods:
  - Set busy signal to true
  - Call the export service with `this.editorContent()`
  - On error, call `this.messageService.add({ severity: 'error', summary: 'Export failed', detail: '...' })`
  - Finally set busy signal to false

In `cover-letter-editor.html`:

- Remove `[disabled]="true"` and `pTooltip="Coming soon"` from both export buttons
- Add `[loading]="isBusyPdf()"` / `[loading]="isBusyDocx()"` and `[disabled]="isBusyPdf() || isBusyDocx()"` to both buttons
- Wire `(onClick)="onExportPdf()"` / `(onClick)="onExportDocx()"`

## Edge Cases

- `editorContent()` is empty string: export should produce an empty document, not throw
- `fullLetter` starts with only part of the salutation (partial match): do NOT skip prepend — only skip on full prefix match
- `salutation` is empty string (falsy): skip prepend entirely (existing behaviour, unchanged)
- Export called during SSR: `isPlatformBrowser` guard returns early, no error
- `jspdf` / `docx` dynamic import fails (network, bundle issue): caught by the try/catch in the component method, error toast shown

## Data / API

No API or DB changes. All data is in-memory:

- Input to export: `editorContent(): string` — Quill HTML from the component signal
- Output: browser file download

Libraries already installed (used by Task 29):
- `jspdf` — PDF generation
- `docx` — DOCX generation

No new dependencies needed.

## Acceptance (DEV)

- Build passes: `npm exec nx build opticv-web`
- Type-check passes: `npm exec nx typecheck opticv-web`
- Unit tests added for `CoverLetterExportService` (mock `DOMParser`, assert correct structure is produced)
- Unit tests updated in `cover-letter-editor.spec.ts`:
  - Salutation-already-present case: editor content does not duplicate salutation
  - Salutation-absent case: salutation is prepended (existing behaviour)
- Export buttons are enabled and trigger downloads in the browser
- Clicking "Export to PDF" with edited content produces a downloadable `cover-letter.pdf`
- Clicking "Export to DOCX" produces a downloadable `cover-letter.docx`
- Bold/italic text in the editor is reflected in both output files
- No breaking changes to other panels in `cv-optimization`
