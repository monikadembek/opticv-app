# Specification Review

Task ID: 29-export-interview-prep
Spec file: 02-spec.md

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured and covers the core task requirements (export buttons, PDF, DOCX). However, one in-scope bullet in the Scope section is self-contradictory (describes a button-disabled state and then immediately declares it not applicable), and the PDF library choice is left open ("jsPDF + html2canvas OR jsPDF with manual layout"), creating ambiguity for the implementer. These are minor but should be resolved before implementation begins.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Ambiguous PDF library approach** (`Scope › In scope`, bullet 2): The spec lists `jsPDF + html2canvas (or jsPDF with manual layout)` without committing to one. These two approaches have meaningfully different outputs (screenshot-based vs. structured text), bundle-size implications, and SSR compatibility requirements. The implementer needs a definitive choice.

2. **Self-contradictory in-scope bullet** (`Scope › In scope`, bullet 5): States "Buttons are disabled when `result` input is not yet available" then immediately parenthesises "(not applicable here since the component only renders when `result` is present)". This creates confusion about whether a disabled state should be implemented at all. The bullet should either be removed from In scope or reworded to clarify it is a non-issue by design.

3. **No unit/integration test requirement stated** (`Acceptance`): The acceptance criteria cover build, typecheck, lint, and manual functional checks, but do not mention adding any automated tests for the export service. Given that the service has two non-trivial async methods, the absence of a test requirement is a gap (not an invented requirement — it is implied by conventions in `rules.md` which state tasks must be completed fully).

#### Unclear or Ambiguous Sections

- **`Behavior › step 1`**: "action bar (or button group)" — the layout term is vague. Both mean the same thing functionally, but "action bar" could imply a fixed/sticky bar whereas "button group" is inline. Not blocking, but could be clarified.
- **`Document Structure`**: The spec says "for each question: ... placeholders to fill (if `needsUserInput`)" but `InterviewPrepResult` has `placeholdersToFill: string[]` as a field. The condition should consistently reference `placeholdersToFill.length > 0` (or `needsUserInput === true`) — currently the spec mixes the two guard conditions.

#### Invented or Unsupported Requirements

None. All requirements trace back to the raw task or to answers given during clarification.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | Export is client-side only (no backend endpoint) | Yes — stated in Goal and Context |
| 2 | All four sections of `InterviewPrepResult` are included in the export | Yes — confirmed by clarification answer |
| 3 | Buttons are always enabled because the component only mounts when `result` is present | Yes — stated in Behavior step 2 and Edge Cases |
| 4 | File names are fixed (`interview-prep.pdf`, `interview-prep.docx`) | Yes — Out of scope states "no custom file naming" |
| 5 | Error feedback is via PrimeNG `MessageService` toast | Yes — stated in Behavior step 5 |
| 6 | SSR guard via `isPlatformBrowser` is required | Yes — stated in Edge Cases |
| 7 | The export service is a singleton (`providedIn: 'root'`) | Yes — stated in Data / API |
| 8 | `jspdf` and `docx` are the chosen libraries | Yes — listed in dependency table (though PDF approach is ambiguous — see Non-Critical Issue #1) |
| 9 | Empty sub-arrays (`trapsToAvoid`, `placeholdersToFill`, `followUps`) suppress their section headings | Yes — stated in Edge Cases |
| 10 | Long text fields must not be truncated and must wrap across PDF pages | Yes — stated in Edge Cases |

---

### Recommendation

**Revise specification** — resolve the ambiguous PDF library approach (pick one: `jsPDF` with manual text layout is recommended for SSR compatibility and bundle size) and clean up the self-contradictory in-scope bullet about disabled state. All other issues are minor and can be addressed inline during implementation.
