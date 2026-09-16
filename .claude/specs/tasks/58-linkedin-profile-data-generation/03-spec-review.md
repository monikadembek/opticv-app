# Specification Review

## Source

Task: 58 — Generate LinkedIn profile information, display results and export (FE)
Spec: `.claude/specs/tasks/58-linkedin-profile-data-generation/02-spec.md`
Reviewed against: `.claude/specs/tasks/58-linkedin-profile-data-generation/00-raw-task.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec correctly covers all three raw task requirements (activate prompt, display results, export). The structured output schema, component sections, wiring steps, and file list are complete and grounded in actual codebase analysis. However, two non-critical issues exist: (1) the export trigger location is left ambiguous ("component header or a dedicated footer row"), and (2) the "copy-to-clipboard as minimum" wording in Scope implies export is optional stretch work, which conflicts with the task's explicit requirement to support PDF and DOCX export.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Export classified as "stretch" in Scope but required by the task.**
   In the Scope section, copy-to-clipboard is listed as "minimum" and file export as "stretch". The raw task states "Allow exporting linkedin profile information to pdf and docx file" — this is a firm requirement, not a stretch goal. The Behavior section (Step 5) does specify both PDF and DOCX fully, so the implementation description is correct; only the Scope wording is misleading.

2. **Export button placement is ambiguous.**
   Step 5 says "Add export buttons to the `LinkedInUpdates` component header or a dedicated footer row within the section card." This is either/or wording that leaves the implementer to decide. Since both options have different accessibility and layout implications, a definitive placement should be chosen.

3. **Candidate name sourcing for PDF title is underspecified.**
   The PDF title spec states `"LinkedIn Profile — [candidate name if available, else 'Candidate']"` but does not state where the candidate name should be sourced from. The `LinkedInRewriteResult` type does not include the candidate name; it would need to come from `CvStructuredData.contactInfo.name` or the `JobApplication` record. The component's input is only `result: LinkedInRewriteResult`, so the export method signature may need an additional parameter.

4. **`isLinkedInRewriteResult()` type guard is not specified.**
   The spec says "Add `isLinkedInRewriteResult()` type guard" but does not describe what fields it must check. Other type guards in the codebase check specific required fields — the spec should either list the minimum required fields to check or state "follow the pattern of `isInterviewPrepResult()`."

5. **No `@opticv/datatypes` rebuild step mentioned.**
   The shared datatypes package must be built before the Angular app can consume the new type. Adding a reminder in the Acceptance section or Data/API section to rebuild/re-export the datatypes package would prevent a common build failure.

#### Unclear or Ambiguous Sections

- **Step 3 — Inputs:** `result: input<LinkedInRewriteResult>()` uses a required input with no default. If the component is only rendered after `isLinkedInRewriteResult()` guard passes (as shown in Step 4), this is safe — but it should be noted explicitly to prevent someone rendering the component unconditionally.

- **Step 3b — "read-only textarea or styled block":** Two different rendering options are offered with no preference stated. This could lead to inconsistent styling versus other sections.

- **Section 3d label mappings:** Only two label mappings are given as examples ("url" → "Custom URL", "photo" → "Profile Photo"). The full set of 10 section enum values (`skills`, `featured`, `experience`, `education`, `certifications`, `url`, `photo`, `banner`, `recommendations`, `activity`) should all have defined human-readable mappings to avoid implementation guessing.

#### Invented or Unsupported Requirements

- **Character count color-coding (amber/red when near/over limit):** This is a reasonable UX addition but is not mentioned or implied in the raw task. It is flagged as "informational only" which mitigates the risk, but strictly speaking it was invented by the spec author.
  
- **Rationale collapse/hide behavior:** The raw task does not specify how rationale text should be displayed. The spec introduces a "collapsed by default" toggle interaction that is not task-derived. This is a minor addition that could be left to implementer discretion.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | `LINKEDIN_REWRITE` v2.0.0 prompt is already seeded and active in the DB — no backend seed changes needed | Yes (Context section) |
| 2 | The sidebar already includes `LINKEDIN_REWRITE` in `NAV_GROUPS` — no sidebar code changes needed | Yes (Step 1) |
| 3 | The existing `SectionCard` and SSE pipeline handle `LINKEDIN_REWRITE` status without modification | Yes (Step 1, Edge Cases) |
| 4 | `CvExportService` (jsPDF + docx) can be extended for LinkedIn content without introducing new dependencies | Implicit — not explicitly stated |
| 5 | The `LinkedInRewriteResult` type does not need to be added to the `PromptType`-to-result-type mapping on the backend | Implicit — "no backend changes" is stated, but the consequence for backend typing is not acknowledged |
| 6 | Export is triggered from within the `LinkedInUpdates` section (not from the existing `ExportFooter` component) | Yes (Step 5) |
| 7 | The candidate name for PDF title comes from another source not included in `LinkedInRewriteResult` | Implicit — source not identified |
| 8 | `isLinkedInRewriteResult()` follows the same minimal-field-check pattern used by other type guards | Implicit |

---

### Recommendation

**Revise specification** — address the following before implementation begins:

1. Remove "minimum/stretch" wording for export; both PDF and DOCX are required.
2. Pick one definitive location for the export buttons.
3. Clarify the candidate name source for the PDF title (or remove it from the title).
4. List the required field checks for `isLinkedInRewriteResult()`.
5. Add all 10 section-label human-readable mappings for `additionalRecommendations`.
6. Add a note that `@opticv/datatypes` must be rebuilt before the Angular app is built.

Items 1 and 3 have the highest risk if left unresolved; the rest are lower friction but should be clarified for clean implementation.
