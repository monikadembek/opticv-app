# Implementation Plan

## Source

Task ID: 30-export-cover-letter
Spec: `02-spec.md` | Review: `03-spec-review.md` (PASS WITH ISSUES)

## Review Issue Resolutions

Before implementation begins, two spec gaps are resolved here:

**Signoff handling:** The existing `buildContent()` does not append `signoff`, and the existing tests do not assert it. The AI is expected to include the sign-off inside `fullLetter`. `buildContent()` and the export service will not touch `signoff`. No change from current behavior.

**`<br>` in export output:**
- PDF: each `<br>` inside a paragraph advances `y` by one `lineHeight` (same as a new line of text).
- DOCX: each `<br>` becomes a `new TextRun({ break: 1 })` appended to the run sequence inside the current `Paragraph`.

**Mixed-style inline runs in jsPDF:** jsPDF cannot render mixed bold/italic within one `doc.text()` call. Each run in a paragraph is rendered as a separate `doc.text()` call at the correct x offset, using `doc.getTextWidth()` to advance the cursor. When a run would overflow `maxWidth`, it wraps to the next line and resets `x` to `marginLeft`.

---

## Files to Create

| File | Type |
|------|------|
| `apps/opticv-web/src/app/features/cv-optimization/services/cover-letter-export.service.ts` | New service |
| `apps/opticv-web/src/app/features/cv-optimization/services/cover-letter-export.service.spec.ts` | New unit tests |

## Files to Modify

| File | Change |
|------|--------|
| `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.ts` | Salutation fix + inject export service + loading signals + export handlers |
| `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.html` | Wire export buttons |
| `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.spec.ts` | Add salutation-dedup tests + export button tests |

---

## Implementation Steps

### Step 1 — Fix salutation duplication in `cover-letter-editor.ts`

**File:** `cover-letter-editor.ts`

Update `buildContent(index: number)`:

- Current logic: if `salutation` is truthy, always prepend it.
- New logic: if `salutation` is truthy **and** `variants[index].fullLetter.trimStart()` does **not** start with `salutation`, then prepend. Otherwise use `fullLetter` as-is.
- Use `.startsWith()` for the prefix check — exact match, no case folding.

No other changes to the component in this step.

---

### Step 2 — Create `CoverLetterExportService`

**File:** `cover-letter-export.service.ts`

#### 2a. Internal HTML block model

Define a private interface (module-level, not exported):

```
interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
  isBreak?: true;
}

interface ParagraphBlock {
  runs: InlineRun[];
}
```

#### 2b. Private `parseHtml(html: string): ParagraphBlock[]` method

- Call `new DOMParser().parseFromString(html, 'text/html')`.
- Query all `<p>` elements from the parsed document body.
- For each `<p>`, walk its child nodes recursively:
  - Track current `bold` and `italic` state, initialized to `false`.
  - On entering `<strong>` or `<b>`: set `bold = true` for children.
  - On entering `<em>` or `<i>`: set `italic = true` for children.
  - On `<br>`: push `{ text: '', bold: false, italic: false, isBreak: true }`.
  - On `Text` nodes: push `{ text: node.textContent ?? '', bold, italic }`.
  - Ignore all other element types (no nested `<p>`, no lists).
- Return an array of `ParagraphBlock`, one per `<p>`.
- If `html` is empty or produces no `<p>` elements, return `[]`.

#### 2c. `exportToPdf(html: string): Promise<void>`

- Guard: `if (!isPlatformBrowser(this.platformId)) return;`
- Dynamic import `jsPDF`.
- Create `new jsPDF({ unit: 'pt', format: 'a4' })`.
- Constants: `marginLeft = 56`, `maxWidth = 503` (595 − 2×46 ≈ A4 minus margins), `pageBottom = 782` (842 − 60), `lineHeight = 14`, `fontSize = 11`.
- `y = 60` initial cursor.

For each `ParagraphBlock`:
- `x = marginLeft`
- For each `InlineRun` in `block.runs`:
  - If `isBreak`: advance `y += lineHeight`, reset `x = marginLeft`, continue.
  - Set font: `doc.setFont('helvetica', bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal')`.
  - `doc.setFontSize(fontSize)`.
  - Split `run.text` by spaces, reassemble words into segments that fit `maxWidth - (x - marginLeft)` using `doc.getTextWidth()`.
  - For each segment that fits on the current line: `doc.text(segment, x, y)`, advance `x += doc.getTextWidth(segment)`.
  - When a word would overflow: advance `y += lineHeight`, reset `x = marginLeft`, check page break (`if y > pageBottom: doc.addPage(), y = 60`), render word.
- After all runs in the block: `y += lineHeight + 10` (paragraph gap), reset `x = marginLeft`.

- `doc.save('cover-letter.pdf')`.

#### 2d. `exportToDocx(html: string): Promise<void>`

- Guard: `if (!isPlatformBrowser(this.platformId)) return;`
- Dynamic import `{ Document, Packer, Paragraph, TextRun }` from `'docx'`.
- `const paragraphs: InstanceType<typeof Paragraph>[] = []`

For each `ParagraphBlock`:
- Build an array of `TextRun` children:
  - For normal runs: `new TextRun({ text: run.text, bold: run.bold, italics: run.italic, size: 24 })`.
  - For `isBreak` runs: `new TextRun({ break: 1 })`.
- Push `new Paragraph({ children, spacing: { after: 160 } })`.
- Push an empty spacer paragraph: `new Paragraph({ children: [] })`.

- Create `new Document({ sections: [{ children: paragraphs }] })`.
- `const blob = await Packer.toBlob(document)`.
- Trigger download via anchor: create `<a>`, set `href = URL.createObjectURL(blob)`, set `download = 'cover-letter.docx'`, append to `window.document.body`, `.click()`, remove, `URL.revokeObjectURL(url)`.

---

### Step 3 — Wire export into `CoverLetterEditor` component

**File:** `cover-letter-editor.ts`

- Import and inject `CoverLetterExportService` via `inject()`.
- Import and inject `MessageService` via `inject()`.
- Add `readonly isBusyPdf = signal(false)` and `readonly isBusyDocx = signal(false)`.
- Add `async onExportPdf(): Promise<void>`:
  - `this.isBusyPdf.set(true)`
  - `try { await this.exportService.exportToPdf(this.editorContent()); }`
  - `catch { this.messageService.add({ severity: 'error', summary: 'Export failed', detail: 'Could not generate the PDF. Please try again.' }); }`
  - `finally { this.isBusyPdf.set(false); }`
- Add `async onExportDocx(): Promise<void>`: same pattern with `isBusyDocx` and DOCX detail text.

---

### Step 4 — Update `cover-letter-editor.html`

Replace the two disabled export buttons:

**PDF button:**
- Remove `[disabled]="true"` and `pTooltip="Coming soon"` and `tooltipPosition`.
- Add `(onClick)="onExportPdf()"`.
- Add `[loading]="isBusyPdf()"`.
- Add `[disabled]="isBusyPdf() || isBusyDocx()"`.

**DOCX button:**
- Remove `[disabled]="true"` and `pTooltip="Coming soon"` and `tooltipPosition`.
- Add `(onClick)="onExportDocx()"`.
- Add `[loading]="isBusyDocx()"`.
- Add `[disabled]="isBusyPdf() || isBusyDocx()"`.

Remove `TooltipModule` from the component's `imports` array in `cover-letter-editor.ts` if it is no longer used elsewhere in the template.

---

### Step 5 — Unit tests for `CoverLetterExportService`

**File:** `cover-letter-export.service.spec.ts`

Test the `parseHtml` method indirectly through `exportToPdf` and `exportToDocx`, or test it directly if exposed as package-private for testing purposes. Use `TestBed` with `PLATFORM_ID` set to `'browser'`.

Mock `DOMParser` if running in a non-browser Vitest environment, or rely on jsdom (already available via Vitest's `jsdom` environment).

Test cases:

1. **Empty HTML** — `exportToPdf('')` and `exportToDocx('')` resolve without throwing.
2. **Plain paragraph** — single `<p>Hello world</p>` produces one `ParagraphBlock` with one run `{ text: 'Hello world', bold: false, italic: false }`.
3. **Bold run** — `<p><strong>Bold</strong> text</p>` produces one block with two runs: `{ text: 'Bold', bold: true }` and `{ text: ' text', bold: false }`.
4. **Italic run** — `<p><em>Italic</em></p>` produces `{ text: 'Italic', italic: true }`.
5. **Line break** — `<p>Line one<br>Line two</p>` produces one block with runs including an `isBreak` entry between the two text runs.
6. **Multiple paragraphs** — `<p>A</p><p>B</p>` produces two `ParagraphBlock` entries.
7. **SSR guard** — When `PLATFORM_ID` is `'server'`, both export methods return early and do not throw.

For PDF/DOCX output verification: mock `jspdf` and `docx` dynamic imports using `vi.mock()`. Assert that `doc.save('cover-letter.pdf')` and `Packer.toBlob` are called.

---

### Step 6 — Update `cover-letter-editor.spec.ts`

**Add to existing `MOCK_RESULT`:** No structural change needed — `MOCK_RESULT` already has distinct `salutation` and `fullLetter` values.

**Add a new mock:** `MOCK_RESULT_SALUTATION_IN_LETTER` — same as `MOCK_RESULT` but one variant's `fullLetter` starts with the salutation string.

**New test cases:**

1. **Salutation not duplicated when already in `fullLetter`:** Set `result` to `MOCK_RESULT_SALUTATION_IN_LETTER`. After `fixture.detectChanges()`, assert `component.editorContent()` does NOT contain the salutation twice.
2. **Salutation prepended when absent from `fullLetter`:** Existing test at line 91 covers this — verify it still passes after the fix.
3. **Export buttons are enabled by default:** Query both buttons and assert they are not disabled and have no `pTooltip` attribute.
4. **Mock `CoverLetterExportService`** in `TestBed` providers with a `jasmine.createSpyObj` / `vi.fn()` stub returning `Promise.resolve()`.
5. **`onExportPdf` sets `isBusyPdf` to true during export and false after:** Use a deferred promise in the stub to observe the intermediate state.
6. **Error toast on export failure:** Stub throws; assert `MessageService.add` called with `severity: 'error'`.

Update existing test at line 125 (`renders Export to PDF and Export to DOCX buttons`) to also assert the buttons are not disabled.

---

## Verification Checklist

- [ ] `npm exec nx typecheck opticv-web` — no type errors
- [ ] `npm exec nx test opticv-web` — all existing and new tests pass
- [ ] `npm exec nx build opticv-web` — build succeeds
- [ ] Manual: click "Export to PDF" in browser — `cover-letter.pdf` downloads with correct content
- [ ] Manual: click "Export to DOCX" in browser — `cover-letter.docx` downloads with correct content
- [ ] Manual: edit text in Quill to include bold/italic — formatting visible in both exported files
- [ ] Manual: type salutation at top of `fullLetter` in a mock response — it appears only once in the editor
