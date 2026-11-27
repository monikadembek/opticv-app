# Specification Review

## Source

Task ID: 117-implement-cv-builder

Reviewed against:
- `.claude/specs/tasks/117-implement-cv-builder/00-raw-task.md`
- `.claude/specs/tasks/117-implement-cv-builder/02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-grounded in the raw task and its embedded research doc, correctly resolves the task's explicitly flagged "open items for implementation scoping" (quota style, edit-in-place vs. new document, template gating) rather than inventing answers silently, and follows the template structure. It has a few internal inconsistencies (README vs. Behavior vs. Data/API disagree on one flow, and one unsupported reuse claim) and several points that should be flagged as assumptions but aren't, which keep it from a clean PASS.

---

### Findings

#### Critical Issues

1. **Contradiction: "Edit CV" audience for a never-extracted uploaded CV.** Behavior → Edit flow step 1 says the Edit action "works for both uploaded+extracted CVs and builder-created CVs," implying an uploaded-but-not-yet-extracted CV is out of scope for that action (consistent). But Edge Cases → "Edit a CV that has never been extracted" then treats this as an open branch ("either block editing until extraction completes, or … proceed normally") rather than stating the Edit action is simply not offered/disabled for such CVs. The spec should pick one behavior; as written, an implementer could reasonably build either, contradicting the review criterion that acceptance criteria be unambiguous.

2. **Unsupported/incorrect factual claim: DTO fix scope.** In-scope item "Fix the drift found during research" (line 45) and Data/API → DTO fix (line 137) assert `CvStructuredDataDto` is missing `gdprClause` and `other`. This claim originates from the prior exploration step in this conversation, not from the raw task or its embedded research doc — the raw task never mentions this drift. Per the review criterion "does every requirement originate from the task," this is technically an invented requirement (see also "Invented or Unsupported Requirements" below) even though it is plausibly correct and low-risk; it should at minimum be labeled as a discovered defect fix bundled into scope, not implied to be traceable to the raw task.

#### Non-Critical Issues

1. **`manuallyEdited` flag and the re-extraction guard are new mechanisms not present in the raw task's research doc.** The research doc's "Open items for implementation scoping" list does not mention re-extraction conflicts at all — this entire mechanism (new Prisma field, new error code `MANUAL_EDIT_PROTECTED`, new guard clause on an existing endpoint) was introduced via a clarifying question in this session, not from the raw task text. It's a reasonable and clearly-flagged decision, but it materially expands scope beyond what "Description" in the raw task states, and should be called out more prominently (e.g., in Assumptions) as a scope addition driven by clarification rather than by the source task.

2. **Toast confirmation reuse claim (task #116) is asserted, not verified against the actual toast content/wording.** Behavior → Edit flow step 9 says the save confirmation "mirror[s] task #116's clipboard-copy toast pattern" — reasonable as a UI convention reference, but no toast text/timing is specified, so this is more a stylistic pointer than a spec detail. Low risk, but could be flagged as underspecified if strict UI acceptance criteria are expected downstream.

3. **`fileSize`/`mimeType` typing gap.** Data/API → Shared types says "`fileSize`, `mimeType` if typed" become nullable — the hedge ("if typed") suggests the author didn't confirm whether the shared `CvDocument` TS type currently includes these fields at all. This should have been confirmed rather than hedged, since the Prisma schema change list (line 106–107) unconditionally nullifies both columns.

4. **No explicit endpoint/response schema for `POST /cv/manual` and `PATCH /cv/:id/structured-data` beyond "created/updated `CvDocument`".** Given the project's Swagger convention (`apps/opticv-be/src/app/cv/dto/cv-response.dto.ts`), the spec doesn't state whether new/updated request or response DTOs are needed for these two new endpoints (beyond the one existing DTO fix noted). This is a plausible gap for the implementation-plan phase to fill in, not a blocking omission for a spec-level document.

#### Unclear or Ambiguous Sections

- **Edge Cases → "Edit a CV that has never been extracted"** (see Critical Issue #1): presents two contradictory options without resolving which applies.
- **Behavior → Create flow, step 8**: "navigates back to the dashboard (or to the CV's detail/preview, TBD in implementation plan)" — correctly flagged as deferred in Assumptions, so this is acceptable as an explicitly-deferred decision rather than a true ambiguity, but is listed here for completeness since it is a two-way branch left open in the main Behavior narrative rather than isolated only to Assumptions.
- **Data/API → `parseStatus`/`extractionStatus`**: correctly flagged as an assumption with rationale; no issue, cited here only as a well-handled example for contrast with Critical Issue #1.

#### Invented or Unsupported Requirements

- **DTO fix for `CvStructuredDataDto`** (Scope → In scope, line 45; Data/API → DTO fix, line 135–137): not present in, or implied by, the raw task text. It stems from analysis performed during spec preparation (this session's exploration step), not from task #117's description or its embedded research doc. This should be explicitly labeled as "discovered during analysis, bundled as a prerequisite fix" rather than presented as an in-scope task requirement on equal footing with requirements that do trace to the raw task.

All other in-scope items (quota mechanism, nullable file columns, accordion form with full `CvStructuredData` parity, GDPR clause reuse, dashboard entry points, template gating parity) trace directly either to the raw task's research doc or to answers given during this spec's clarification phase, which is the workflow's sanctioned mechanism for resolving the task's own explicitly-flagged open items — not invention.

---

### Assumptions Detected

All explicitly stated in the spec's **Assumptions** section:
1. `parseStatus`/`extractionStatus` set to `COMPLETED` for builder CVs (no new enum value) — explicitly stated, with rationale.
2. No new field-level required-field validation — explicitly stated.
3. Save UX (autosave vs. explicit button) deferred to implementation planning — explicitly stated.
4. Post-save navigation destination deferred — explicitly stated.
5. `manuallyEdited` field naming is provisional — explicitly stated.

**Additional implicit assumptions found, not listed in the spec's Assumptions section:**
6. That `CvStructuredDataDto` is in fact missing `gdprClause`/`other` (asserted as fact in Scope/Data-API, not flagged as an assumption or a carried-over finding from a prior analysis step).
7. That editing a CV that was never extracted should be blocked or handled specially, rather than the Edit action simply not appearing for such CVs (Edge Cases section presents this as unresolved, but it isn't listed in Assumptions).
8. That `fileSize`/`mimeType` exist on the current shared `CvDocument` TypeScript type at all (hedged with "if typed" rather than confirmed or listed as an assumption).

---

### Recommendation

- **Revise specification** — resolve Critical Issue #1 (pick one behavior for editing a never-extracted CV, and make Behavior/Edge Cases agree), and reclassify the DTO-fix item (Critical Issue #2 / Invented Requirement) as a clearly-labeled "discovered defect, fixed as a prerequisite" rather than an in-scope requirement presented as task-derived. The Non-Critical issues and the three additional implicit assumptions (items 6–8 above) should be folded into the spec's Assumptions section for completeness before implementation planning begins, but do not block proceeding to revision.
