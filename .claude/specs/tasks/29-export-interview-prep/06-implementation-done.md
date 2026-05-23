# Implementation Done

Task ID: 29-export-interview-prep
Spec: 02-spec.md | Review: 03-spec-review.md (PASS WITH ISSUES) | Plan: 04-implementation-plan.md

---

## Summary

Client-side PDF and DOCX export was added to the `InterviewPrep` component. A new singleton `InterviewPrepExportService` was created with `exportToPdf` and `exportToDocx` methods. Both methods use dynamic imports, SSR guards, and cover all four data sections. The component was updated with busy signals and error-toast handling. Unit tests covering all export scenarios were added to the component spec file. Dependencies `jspdf` and `docx` were installed.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| "Export to PDF" button rendered in `InterviewPrep` component | Implemented | |
| "Export to DOCX" button rendered in `InterviewPrep` component | Implemented | |
| Client-side PDF generation using jsPDF with manual layout | Implemented | Dynamic import used |
| Client-side DOCX generation using `docx` npm package | Implemented | Dynamic import used |
| All four sections of `InterviewPrepResult` included in PDF | Implemented | |
| All four sections of `InterviewPrepResult` included in DOCX | Implemented | |
| Buttons always enabled when component is mounted (no disabled-by-data state) | Implemented | |
| Loading/busy state on buttons while file is being generated | Implemented | `isBusyPdf` and `isBusyDocx` signals; both buttons disabled during either export |
| PDF download triggers file named `interview-prep.pdf` | Implemented | `doc.save('interview-prep.pdf')` |
| DOCX download triggers file named `interview-prep.docx` | Implemented | Anchor element with `download="interview-prep.docx"` |
| Error handling via PrimeNG `MessageService` toast (`severity: 'error'`) | Implemented | |
| Button state resets after error | Implemented | `finally` block resets busy signal |
| SSR guard via `isPlatformBrowser` before download logic | Implemented | Both export methods guard at entry |
| **Document structure — Interview Questions section** | | |
| — Question text rendered | Implemented | |
| — Category rendered | Implemented | |
| — Likelihood rendered if present | Implemented | |
| — `whatTheyreAssessing` rendered | Implemented | |
| — Answer structure label + suggested answer rendered | Implemented | |
| — `placeholdersToFill` omitted if `needsUserInput` is false or array is empty | Implemented | Condition: `q.needsUserInput && q.placeholdersToFill.length > 0` |
| — `trapsToAvoid` section omitted if array is empty | Implemented | |
| — `followUps` section omitted if array is empty | Implemented | |
| **Document structure — Questions to Ask Interviewer section** | | |
| — Numbered question + rationale pairs | Implemented | |
| — Section omitted if array is empty | Implemented | |
| **Document structure — Stress-Test Questions section** | | |
| — Question, whyItllComeUp, recommendedAnswer rendered | Implemented | |
| — Section omitted if array is empty | Implemented | |
| **Document structure — Preparation Tips section** | | |
| — Bulleted list of tips | Implemented | Bullet paragraphs in DOCX; `•` prefix in PDF |
| — Section omitted if array is empty | Implemented | |
| Long text fields not truncated; wrap across PDF pages | Implemented | `addWrappedText` uses `splitTextToSize` and `checkPage` |
| `jspdf` installed as dependency | Implemented | `^4.2.1` |
| `docx` installed as dependency | Implemented | `^9.6.1` |
| New service file created | Implemented | |
| Component `.ts` modified | Implemented | |
| Component `.html` modified | Implemented | |
| Component `.spec.ts` updated with export tests | Implemented | |
| Unit tests: renders both export buttons | Implemented | |
| Unit tests: `isBusyPdf` true while export in progress | Implemented | |
| Unit tests: `isBusyDocx` true while export in progress | Implemented | |
| Unit tests: both buttons disabled while PDF export runs | Implemented | |
| Unit tests: both buttons disabled while DOCX export runs | Implemented | |
| Unit tests: `messageService.add` called with `severity: 'error'` on PDF failure | Implemented | |
| Unit tests: `messageService.add` called with `severity: 'error'` on DOCX failure | Implemented | |
| Unit tests: `isBusyPdf` resets to `false` after export completes | Implemented | |
| Unit tests: `isBusyDocx` resets to `false` after export completes | Implemented | |

---

## Files

### Created

| Path |
|---|
| `apps/opticv-web/src/app/features/cv-optimization/services/interview-prep-export.service.ts` |

### Modified

| Path |
|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.ts` |
| `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.html` |
| `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.spec.ts` |
| `package.json` |
| `package-lock.json` |

---

## Components

| Component | Status |
|---|---|
| `InterviewPrep` (modified) | Exist |
| `InterviewPrepExportService` (created) | Exist |

---

## Stores

None planned or implemented.

---

## Deviations

| # | Deviation |
|---|---|
| 1 | DOCX export uses `Packer.toBlob(document)` instead of `Packer.toBuffer(doc)` wrapped in `new Blob([...])` as described in the plan. The outcome is identical; `toBlob` is the direct Blob API of the `docx` library. |
| 2 | Template button group has an extra `size="small"` attribute not mentioned in the plan template snippet. |
| 3 | Error toast `detail` messages are split by format: PDF failure uses "Could not generate the PDF. Please try again." and DOCX failure uses "Could not generate the DOCX. Please try again." — the plan specified a single generic message "Could not generate the file. Please try again." |
| 4 | Test suite includes additional tests beyond the plan's listed cases: `sets isBusyPdf to true while PDF export is in progress`, `sets isBusyDocx to true while DOCX export is in progress`, `re-enables both buttons after PDF export completes`, `re-enables both buttons after DOCX export completes`. |

---

## Additional Implementation

None.
