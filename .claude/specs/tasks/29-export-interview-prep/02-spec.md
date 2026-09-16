# Task Specification

## Source

Azure DevOps Task: 29 — Export interview prep output to PDF or DOCX

## Goal

Add "Export to PDF" and "Export to DOCX" buttons inside the `InterviewPrep` component that generate and download the full interview prep output client-side using browser libraries.

## Context

The `InterviewPrep` component (`apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/`) is a presentational component that receives a fully typed `InterviewPrepResult` object via an `input()`. It renders four sections: Interview Questions, Questions to Ask Interviewer, Stress-Test Questions, and Preparation Tips.

Export is entirely client-side — no backend changes required.

## Scope

### In scope

- Two export buttons ("Export to PDF", "Export to DOCX") rendered inside the `InterviewPrep` component
- Client-side PDF generation using **jsPDF** + **html2canvas** (or **jsPDF** with manual layout)
- Client-side DOCX generation using **docx** (npm package)
- All four sections of `InterviewPrepResult` included in both export formats
- Buttons are disabled when `result` input is not yet available (not applicable here since the component only renders when `result` is present — see Edge Cases)
- Loading/busy state on buttons while file is being generated

### Out of scope

- Backend endpoint changes
- Export of other optimization results (cover letter, skills gap, etc.)
- Custom file naming by the user
- Export format options beyond PDF and DOCX

## Behavior

1. The `InterviewPrep` component renders an action bar (or button group) at the top of its output, containing two buttons: **"Export to PDF"** and **"Export to DOCX"**.
2. Since the component is only mounted when `result` is available (parent uses `@if (interviewPrepResult(); as result)`), the buttons are always enabled when visible.
3. **Export to PDF:**
   - User clicks the button; a spinner/loading state appears on the button.
   - A client-side PDF is generated from the `InterviewPrepResult` data (structured text layout, not a screenshot of the DOM).
   - The browser triggers a file download named `interview-prep.pdf`.
   - Button returns to normal state after download starts.
4. **Export to DOCX:**
   - User clicks the button; a spinner/loading state appears on the button.
   - A client-side DOCX file is generated from the `InterviewPrepResult` data using the `docx` library.
   - The browser triggers a file download named `interview-prep.docx`.
   - Button returns to normal state after download starts.
5. If generation throws an error, show a PrimeNG `MessageService` toast (severity: `error`) and reset the button state.

## Document Structure (both formats)

All four sections are exported in order:

1. **Interview Questions** — for each question: question text, category, likelihood (if present), what they're assessing, suggested answer (with answer structure label), placeholders to fill (if `needsUserInput`), traps to avoid (if any), follow-up questions with guidance.
2. **Questions to Ask Interviewer** — numbered list of question + rationale pairs.
3. **Stress-Test Questions** — for each: question, why it'll come up, recommended answer.
4. **Preparation Tips** — bulleted list.

## Edge Cases

- The component only renders when the parent passes a valid `result`, so there is no "no data" state to handle inside the component itself.
- Arrays that may be empty (`trapsToAvoid`, `placeholdersToFill`, `followUps`) — omit the section heading entirely if the array is empty.
- Very long text fields (e.g., `suggestedAnswer`) must not be truncated; allow text wrapping across pages in PDF.
- SSR: file generation uses browser APIs (`Blob`, `URL.createObjectURL`). Guard with `isPlatformBrowser` before invoking download logic.

## Data / API

No API changes. Input data comes from the existing `result: InterviewPrepResult` component input.

**New dependencies to install (frontend only):**

| Package | Purpose |
|---|---|
| `jspdf` | PDF generation |
| `docx` | DOCX generation |

No new shared datatypes needed.

**New files:**

- `apps/opticv-web/src/app/features/cv-optimization/services/interview-prep-export.service.ts` — singleton service (`providedIn: 'root'`) with two public methods:
  - `exportToPdf(result: InterviewPrepResult): Promise<void>`
  - `exportToDocx(result: InterviewPrepResult): Promise<void>`

**Modified files:**

- `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.ts` — inject export service, add `isBusyPdf` and `isBusyDocx` signals, add `onExportPdf()` and `onExportDocx()` handlers
- `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.html` — add button group at top of template

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes with no errors
- `npm exec nx typecheck opticv-web` passes
- `npm exec nx lint opticv-web` passes
- Clicking "Export to PDF" downloads a valid, readable `interview-prep.pdf` containing all four sections
- Clicking "Export to DOCX" downloads a valid `interview-prep.docx` that opens correctly in Word / LibreOffice
- Buttons show a loading indicator while generating
- No console errors on generation; error toast appears if generation fails
- SSR guard in place — no `window`/`document` access at server render time
