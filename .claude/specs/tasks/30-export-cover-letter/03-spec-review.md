# Specification Review

## Source

Task ID: 30-export-cover-letter
Spec file: `.claude/specs/tasks/30-export-cover-letter/02-spec.md`
Raw task: `.claude/specs/tasks/30-export-cover-letter/00-raw-task.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec covers all three task requirements (salutation fix, PDF export, DOCX export) and is well-structured. However, two non-critical gaps exist: the spec does not explicitly state how `signoff` (from `CoverLetterResult`) is handled in the export (the raw task says "selected cover letter with user tweaks", which implies the full letter including salutation and sign-off), and the PDF implementation detail for jsPDF run-level bold/italic switching has a known technical gap that could cause implementation ambiguity. No invented requirements are present.

---

### Findings

#### Critical Issues

None.

---

#### Non-Critical Issues

1. **`signoff` not addressed in export.**
   `CoverLetterResult` has a `signoff` field (e.g. "Yours sincerely,"). The `buildContent()` method currently does not append the signoff to the editor content — only the salutation + `fullLetter` is loaded. If the signoff is absent from the editor HTML, it will also be absent from the exported file. The spec does not mention whether the signoff should be appended (in `buildContent()`) or is already expected to be inside `fullLetter`. This is a gap, not an invented requirement.

2. **PDF run-level font switching with jsPDF.**
   jsPDF's text rendering API works on full strings, not inline runs — there is no native inline bold/italic switching within a single line of text. The spec states "render inline runs with `doc.setFont` switching per run" but does not specify how to handle a single paragraph line that mixes normal and bold text (e.g. "This is **bold** and normal"). In practice this requires either concatenating pre-measured text segments at explicit x positions, or falling back to rendering each run on its own line. The spec is underspecified here; the implementer will need to make a judgment call.

3. **`isBusyPdf || isBusyDocx` disabling both buttons.**
   The spec states `[disabled]="isBusyPdf() || isBusyDocx()"` for both buttons — meaning starting a PDF export also disables the DOCX button and vice versa. This is a valid UX choice (prevent simultaneous exports) but it is not explicitly justified. A comment or rationale would help.

4. **Unit test scope for `CoverLetterExportService`.**
   The acceptance criterion says "mock `DOMParser`, assert correct structure is produced." The spec does not clarify what "correct structure" means for the export methods themselves (i.e. whether `jsPDF.save` and `Packer.toBlob` are also mocked/asserted, or only the HTML-parsing helper is tested). This leaves test scope ambiguous.

---

#### Unclear or Ambiguous Sections

- **Behavior § 1 — Salutation fix, pseudocode `else` branch:**
  The pseudocode reads:
  ```
  if salutation is truthy AND fullLetter does NOT start with salutation:
    text = salutation + "\n\n" + fullLetter
  else:
    text = fullLetter
  ```
  The `else` branch collapses two distinct cases: (a) salutation is falsy, and (b) salutation is truthy but already present. This is logically correct but the comment "existing behaviour, unchanged" in the Edge Cases section applies only to case (a). Case (b) is the new behaviour. The pseudocode does not make this distinction visible, which may cause a reviewer to miss that case (b) is new.

- **Behavior § 2 — HTML parsing, `<br>` handling:**
  The spec says `<br>` → "line break within a paragraph" but does not specify how this translates in the export outputs. In PDF: does a `<br>` become a new `doc.text()` call on the next line, or a space? In DOCX: does it become a `Break` run or a new `Paragraph`? This is unspecified.

---

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | `jspdf` and `docx` libraries are already installed (from Task 29) and no new npm dependencies are needed. | Yes — Data/API section. |
| 2 | The salutation from the AI response always uses consistent casing, so case-insensitive comparison is not needed for the prefix check. | Yes — Behavior § 1. |
| 3 | The Quill editor only produces `<p>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<br>` tags in practice (no lists, no tables, no headings). | Partially — stated as scope assumption ("cover letters don't have them") but not verified against actual Quill output. |
| 4 | `signoff` is already embedded inside `fullLetter` (or is not needed in the export), so no special handling is required. | **Not stated.** Implicit. See Non-Critical Issue #1. |
| 5 | The `MessageService` from PrimeNG is already provided in the component's ancestor injector (as established in Task 29 context). | Not stated. Implicit. |
| 6 | Both export formats receive the same HTML string from `editorContent()` — there is no format-specific pre-processing of the editor content. | Not stated. Implicit but reasonable. |

---

### Recommendation

**Revise specification** — address the following before implementation starts:

1. Clarify whether `signoff` should be appended in `buildContent()` so it is included in both the editor and the export, or confirm it is intentionally excluded.
2. Specify how mixed bold/italic inline runs are rendered in jsPDF (either accept plain-text-per-paragraph fallback, or describe the x-offset measurement approach).
3. Specify how `<br>` maps to output in PDF and DOCX.

Issues #3 and #4 (button disable rationale, test scope) are low priority and can be resolved during implementation without a spec update.
