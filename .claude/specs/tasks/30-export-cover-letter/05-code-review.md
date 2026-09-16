# Code Review — Task 30: Export Cover Letter to PDF / DOCX

## Summary

- **Overall result: PASS WITH ISSUES**
- The implementation covers all required spec behaviour: salutation deduplication, PDF and DOCX export with formatting, loading/disabled states, error toasts, SSR guard, and unit tests. One critical convention violation exists in `cv-optimization.ts` (a `filter` that hard-codes a single prompt type, breaking all other optimization flows). Several minor issues are also noted below.

---

## Conventions Violations

### Critical (must fix before merge)

**`cv-optimization.ts` line 187 — `filter` restricts pipeline to COVER_LETTER only**

```ts
filter((prompt) => prompt === PromptType.COVER_LETTER),
```

This line was apparently introduced or left in the modified `cv-optimization.ts`. It causes `runOptimization()` to only fire the Cover Letter prompt and skip every other prompt type (Resume Autopsy, Keyword Gap, Summary Rewrite, Bullet Upgrade, Interview Prep). This is a functional regression that breaks the entire optimization page for all other prompt types. If this filter was pre-existing and belongs to a debug/demo mode, it must be reverted to the original multi-prompt pipeline before merge.

---

### Non-Critical (should fix)

1. **`cover-letter-export.service.ts` line 143 — local type alias instead of direct typing**

   ```ts
   type Para = InstanceType<typeof Paragraph>;
   const paragraphs: Para[] = [];
   ```

   `Paragraph` here is a runtime constructor imported from `docx`. `InstanceType<typeof Paragraph>` is verbose and fragile when `Paragraph` is a mock in tests. The plan used this pattern for correctness with dynamic imports; however, a cleaner alternative is `object[]` or simply relying on type inference. This is minor but worth noting.

2. **`cover-letter-editor.ts` — `isBusyPdf` and `isBusyDocx` are `readonly` signals exposed publicly**

   The signals are declared `readonly` which prevents reassignment of the signal reference, but `.set()` can still be called externally (Angular signals are not encapsulated by `readonly`). This is idiomatic Angular and not a bug, but for strict encapsulation they could be `private` with public computed accessors. This is a style preference, not a convention violation.

3. **`cover-letter-export.service.spec.ts` — missing test for `<br>` producing `isBreak` run and for line-break in `exportToDocx`**

   The spec (§ Step 5, test case 5) requires: `<p>Line one<br>Line two</p>` produces one block with an `isBreak` entry between the two text runs. This test is absent from the spec file. The line-break behavior in `exportToDocx` (producing `TextRun({ break: 1 })`) is also not asserted.

4. **`cover-letter-editor.spec.ts` line 152–156 — export buttons test does not assert `disabled` state is absent**

   The plan (Step 6, last bullet) says: "Update existing test at line 125 (`renders Export to PDF and Export to DOCX buttons`) to also assert the buttons are not disabled." The test only checks `textContent` for button labels — it does not assert that the buttons are enabled (no `disabled` attribute). This is a minor spec gap.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Salutation dedup guard in `buildContent()` | Covered | `startsWith` check, exact match, no case folding |
| New `CoverLetterExportService` with `exportToPdf` and `exportToDocx` | Covered | |
| Export reads from `editorContent()` signal | Covered | |
| Basic formatting: bold, italic, paragraph breaks | Covered | |
| Loading state on each export button while async export runs | Covered | `isBusyPdf`, `isBusyDocx` signals |
| Both buttons disabled while either export is running | Covered | `[disabled]="isBusyPdf() \|\| isBusyDocx()"` |
| Error toast on export failure using `MessageService` | Covered | |
| Enable and wire up both export buttons | Covered | `[disabled]` and tooltip removed |
| SSR guard (returns early if not browser) | Covered | `isPlatformBrowser` check |
| `exportToPdf`: A4, pt units, margins, per-run font switching | Covered | |
| `exportToPdf`: page break when `y > pageBottom` | Covered | `checkPage()` helper |
| `exportToPdf`: word-level wrapping with `getTextWidth` | Covered | |
| `exportToDocx`: `TextRun` with bold/italics per run | Covered | |
| `exportToDocx`: `<br>` → `TextRun({ break: 1 })` | Covered | |
| `exportToDocx`: spacer empty paragraph between blocks | Covered | |
| `exportToDocx`: anchor download trigger | Covered | |
| Unit tests for `CoverLetterExportService` | Partial | Missing `<br>` / isBreak test (spec case 5) |
| Unit tests: salutation dedup cases | Covered | Both present-and-absent cases tested |
| Unit tests: export buttons enabled by default | Partial | Labels tested; `disabled` absence not asserted |
| Unit tests: loading signal resets after export | Covered | |
| Unit tests: error toast on failure | Covered | |
| `TooltipModule` removed from component imports | Covered | Not present in `cover-letter-editor.ts` imports |
| No backend changes | Covered | |

---

## Plan Deviations

1. **`maxWidth` constant differs from plan.** The plan states `maxWidth = 503` with the note "595 − 2×46 ≈ A4 minus margins". The actual A4 width in jsPDF pt units is 595.28pt; with `marginLeft = 56` and a symmetric right margin, the usable width would be `595.28 − 56 − 56 = 483.28`. The value used (`503`) is inconsistent with the stated formula and will cause text to overflow into the right margin by approximately 20pt. This may be a deliberate choice (accounting for jsPDF's internal A4 dimension), but is not explained. Worth verifying against a real export.

2. **`cover-letter-export.service.spec.ts` does not test `parseHtml` structure directly.** The plan notes testing `parseHtml` indirectly through `exportToPdf` / `exportToDocx`; the bold/italic assertions confirm this path is exercised. However, the structural assertion (producing a `ParagraphBlock` with specific `runs`) is inferred rather than explicit. This is acceptable per the plan's own alternative.

3. **`isBusyPdf` and `isBusyDocx` are not marked `readonly` in `cover-letter-editor.ts` spec.** The plan says `readonly isBusyPdf = signal(false)`. The actual code does use `readonly`, which is correct — no deviation.

---

## Null Safety Issues

1. **`cover-letter-editor.ts` line 94 — `variants[index]` access without bounds check**

   ```ts
   const fullLetter = variants[index].fullLetter;
   ```

   `variants[index]` can be `undefined` if `index` is out of bounds. `safeIndex()` already guards against `-1 → 0` for the effect-triggered path, but `selectVariant(index: number)` accepts any `number` from the template without validation. If a caller passes an out-of-bounds index, this throws at runtime. This is a pre-existing issue (not introduced by this task), but worth flagging as it sits adjacent to the modified `buildContent()`.

---

## Code Smells

1. **Magic value `503` for `maxWidth` in `exportToPdf`** — The derivation is non-obvious. A named constant with an inline comment explaining `A4pt − 2×marginLeft` or a computed value would be clearer and less error-prone if margins are later changed.

2. **`cv-optimization.ts` `filter` line (see Critical above)** — If this is an accidental debug artifact, it's a code smell as well as a critical bug. If it was intentional for a demo scope, it must be removed before production.

3. **`cover-letter-export.service.spec.ts` — top-level mock variables (`saveMock`, `toBlob`, etc.) are module-scoped** — `vi.clearAllMocks()` in `beforeEach` resets them correctly, so this is fine in practice. But the `toBlob.mockResolvedValue(...)` call inside `beforeEach` is redundant given the top-level `vi.fn().mockResolvedValue(...)`. Minor duplication.

---

## Recommendation

**Fix critical issues before merge.**

The `filter(prompt === COVER_LETTER)` line in `cv-optimization.ts` must be removed or reverted — it silently disables all optimization flows except cover letter. All other findings are minor and can be addressed as follow-up.
