# Specification Review — Task 138: CV names + unified "My CVs" table

Reviewed: `02-spec.md` against `00-raw-task.md`, the clarification answers from the spec phase, and the current codebase.

### Summary

- Overall assessment: **PASS WITH ISSUES**
- Justification: The spec covers every explicit requirement of the raw task (DB, shared types, backend, frontend, tests, verification). Where it departs from the raw task (flat `name` on `POST /cv/manual`, `name` in `GET :id/structured-data`, blocked empty-name save, source-only analytics), each departure is backed by a recorded clarification. Two points need a decision before implementation: who owns the Rename dialog's open/saving state is described inconsistently, and the migration's 100-character overflow risk is handed to the implementer instead of being settled. The rest is minor wording and precision.

### Findings

#### Critical Issues

1. **Rename dialog state ownership is contradictory** (Behavior §7, "Rename dialog" and the `dashboard.ts handles renameCv` paragraph).
   The spec says the dialog may live in `cv-file-list` or in a child component, which communicates only by emitting `renameCv`. It also says `dashboard.ts` closes the dialog on success, leaves it open on error, and that Save is disabled "while a save is running". If the dialog lives in `cv-file-list`, the spec gives `dashboard.ts` no way to close it or to signal that a save is in progress: there is no input or output for that state and no callback contract. The implementer would have to invent the mechanism (a `renaming`/`renameDone` input, a callback in the emitted payload, or moving the API call into the list). The spec should state which component owns `visible` and `saving`, and how the success or error result gets back to the dialog.

2. **Backfill overflow risk is left as an "implementer check"** (Behavior §1, note under step 2).
   `fileName` is an unbounded `String?` in `schema.prisma`, and `uploadCv` stores `file.originalname` without truncating it. So any existing row whose name is still over 100 characters after the extension is stripped will make the `UPDATE` fail against `VARCHAR(100)`, and `migrate deploy` will abort on staging or production. The raw task's SQL has no truncation, but new uploads are required to be cut to 100 characters (§2). The spec leaves the choice of whether to add `LEFT(…, 100)` to the implementer, who may not be able to inspect production data. This is a decision the spec should make, not defer. It is not a new requirement, because it applies the task's own 100-character rule to backfilled rows.

#### Non-Critical Issues

1. **Trim transform must tolerate non-string input** (Behavior §3, §4).
   `@Transform(trim)` runs before `class-validator`. If `name` is a number or an object, a naive `value.trim()` throws, and the client gets a 500 instead of the 400 that §4 specifies for "not a string". The spec should say the transform only trims strings (e.g. `typeof value === 'string' ? value.trim() : value`).

2. **Builder `forkJoin` vs. sequence leaves `syncCvStore` input ambiguous** (Behavior §9).
   `updateStructuredData` and `renameCv` each return a `CvDocument`. If the two run in parallel, it isn't defined which response's `updatedAt` and `name` go into `syncCvStore`. Running them in sequence, with rename last, avoids this. The spec allows either and only says "use the renamed document's `name`".

3. **`cv-optimization` consumer note is imprecise** (Behavior §11).
   `features/cv-optimization/services/cv-optimization-api.service.ts` has its **own** `getStructuredData` typed `{ data }`. It doesn't use `CvApiService`, so it needs no change at all, not even to types. The sentence "need no change beyond types" could lead an implementer to edit a file that's out of scope.

4. **Swagger for the new `PATCH /cv/:id` endpoint is not listed** (Data / API → Endpoints).
   The endpoint table lists the 200, 400, 401 and 404 responses, but Backend DTOs doesn't say to add the matching `@ApiOperation` / `@ApiResponse` decorators the way the other `cv.controller.ts` routes have them. This follows from existing conventions, but it should be stated.

5. **Remaining `fileName` usages on the backend are not called out as unchanged.**
   `cv-extraction.service.ts` (`!doc.fileName` guard, passes `doc.fileName` to `openai.service.ts`) uses `fileName` legitimately as the real file name. The spec lists `upload-cv.html` as unchanged but not these. The implementer could mistake them for display uses and replace them with `name`.

6. **`format:check` added to Acceptance.**
   The raw task's verification lists only `typecheck lint test`. Adding format check matches CI (`format check → lint → …` in CLAUDE.md), so it is reasonable, but it is an addition.

7. **Dashboard spec file name** (Acceptance → "`dashboard` spec").
   Name it exactly (`features/dashboard/dashboard.spec.ts`) to match the other test references.

#### Unclear or Ambiguous Sections

- **§7 Rename dialog**: "Whether the dialog lives in `cv-file-list` or in its own child component is up to the implementer". See Critical #1.
- **§7 Name cell icons**: "e.g. `pi pi-pencil` / `pi pi-file-edit`" and the Rename button's "`pi pi-pen-to-square` or similar". `pi pi-pencil` is already the Edit action's icon in this table. Using it for the "Built" source icon would put two meanings on the same glyph in one row.
- **§9 Save flow**: "e.g. `forkJoin`, or run them in sequence". See Non-Critical #2.
- **Edge Cases → "Rename to the same name"**: the builder skips the call, but the dashboard dialog sends it anyway. The difference is stated, but the reason isn't. It reads like an inconsistency rather than a choice.
- **Data / API → Service methods**: "`CvService.createManualCv(data, userId, name?)`: or it receives the DTO and splits out `name`" leaves the signature open. That's acceptable, but the controller test in Acceptance ("`POST manual` passes `name`") depends on which one is chosen.

#### Invented or Unsupported Requirements

Items grounded in the recorded clarifications (flat `name` DTO, `{ data, name }` from structured-data, blocked empty save, source-only analytics) are **not** listed here. The following are not in the task or the clarifications:

1. **Dialog error UX**: "leaves the dialog open with the entered value" on rename error, and closing the dialog on success with a success toast. These are reasonable but not specified by the task.
2. **Rename available "regardless of parse or extraction status"**: the task says to add a Rename action but doesn't scope its availability.
3. **Detailed accessibility behaviors**: focus moves into the dialog on open and returns to the trigger on close, Enter submits, Esc closes. These come from the general WCAG/AXE rules in `conventions.md`, not from the task. They are acceptable as convention-derived, but they should be labelled that way.
4. **New shared types `CreateManualCvRequest` and `CvStructuredDataResponse`**: these follow from the clarifications, but the task's shared-types section doesn't name them. They are implementation detail rather than requirements.
5. **Separate Swagger DTO `CvStructuredDataResponseDto`**: follows from the clarification, but it is a design decision added by the spec.

None of these contradicts the task. Items 1–3 should be moved to Assumptions or marked as convention-derived.

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
| --- | --- | --- |
| 1 | `updatedAt` (`@updatedAt`) is the right value for "Updated" even though it changes on parse/extraction updates | Yes (Assumptions) |
| 2 | Built and Rename icon glyphs are left to the implementer | Yes (Assumptions) |
| 3 | No UI mockups; layout follows existing table, pill and icon-button styles | Yes (Assumptions) |
| 4 | Builder rename is bundled with Save rather than sent on blur | Yes (Assumptions) |
| 5 | Dashboard ordering stays `createdAt desc` | Yes (Out of scope) |
| 6 | A partial failure in the builder (structured data saved, rename failed) is acceptable with no transaction | Yes (Edge Cases) |
| 7 | Upload stripping removes only the **last** extension (`a.b.c.pdf` → `a.b.c`) | Partially: stated as behavior in §2 and Edge Cases, matching the migration regex, but not called out as an interpretation of "file name without its extension" |
| 8 | `name` is cut to 100 **characters** (JS string length), not bytes | No. `VARCHAR(100)` in Postgres counts characters, and `slice(0, 100)` counts UTF-16 code units, so surrogate pairs (e.g. emoji) could be split. Implicit. |
| 9 | Older clients calling `POST /cv/manual` without `name` exist or need support | Implicit in Edge Cases ("older client") |
| 10 | PostHog `cv_source` values are lowercase (`pdf`/`docx`/`built`) while the UI badge labels are `PDF`/`DOCX`/`Built in app` | Stated as behavior but not as a deliberate choice |
| 11 | Other PostHog events with file names (e.g. `cv_file_uploaded` in `upload-cv.ts` sends `filename: file.name`) stay unchanged | No. The source-only analytics decision is applied only to `dashboard.ts`, which matches the task's scope, but the spec doesn't say that other events are deliberately left alone. |
| 12 | Existing rows' `fileName` values fit in 100 characters after stripping | No. It is deferred as an implementer check (see Critical #2). |

### Recommendation

- **Revise specification**: resolve Critical #1 (dialog state ownership and result contract) and Critical #2 (decide on `LEFT(…, 100)` in the backfill). Folding in Non-Critical #1–#3 and moving the unsupported UX details into Assumptions is recommended but not blocking. The task definition itself doesn't need to be revisited.
