# Specification Review — Task 91

## Summary

- Overall assessment: **PASS WITH ISSUES**
- Justification: The specification correctly captures the intended UI pattern (reusing
  the `export-footer` info-dialog precedent) and is well-aligned with the task and its
  approved planning doc. However, it contains a factual/numerical error — it repeatedly
  states there are "9 sections" (Job Posting + 8 result sections) on `cv-optimization`,
  while the current codebase has only **8** `app-section-card` usages (Job Posting + 7
  result sections: ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover
  Letter, Interview Prep, LinkedIn Profile). This miscount propagates into Scope,
  Behavior, and Acceptance sections and must be corrected before implementation.

## Findings

### Critical Issues

1. **Incorrect section count throughout the spec.** The spec states "one
   `app-section-card` ... per optimization section (Job Posting, ATS Analysis, Keyword
   Gap, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn
   Profile)" — that list itself has 8 named sections, but the spec's Scope
   ("Wire up all 9 `app-section-card` usages") and Acceptance ("All 9 sections (Job
   Posting + 8 result sections)") sections both say 9. Verified against
   `cv-optimization.html`: there are exactly 8 `app-section-card` elements (JOB_POSTING,
   RESUME_AUTOPSY, KEYWORD_GAP, SUMMARY_REWRITE, BULLET_UPGRADE, COVER_LETTER,
   INTERVIEW_PREP, LINKEDIN_REWRITE) — 7 result sections, not 8. This is an internal
   inconsistency (the section list names 8, the count says 9) as well as a mismatch with
   actual code. Must be corrected so the implementer wires up the correct number of
   usages and doesn't go looking for a missing 9th section.

### Non-Critical Issues

- The spec's `helpTitle` example (`'About <Section Name>'`) and the dialog header
  behavior (`[header]="helpTitle()"`) work fine given `docs/help-informations.md`'s
  copy, but the spec doesn't explicitly restate each of the 8 section's exact title
  string (e.g. "About ATS Analysis" vs "About the ATS Analysis") — left to
  implementation discretion. Minor, but could cause inconsistent phrasing across
  sections if not double-checked against the doc.
- The spec says the help body should be marked up as "plain paragraph text (bullet
  lists only where useful, e.g. none of the current copy strictly requires one...)" —
  this matches `docs/help-informations.md`, which is prose-only for all 8 sections
  (no bullets), so this is accurate, just worth flagging as a judgment call already
  made correctly.

### Unclear or Ambiguous Sections

- **Section "Behavior", item 4**: "each of the 9 `app-section-card` elements gets..."
  — inherits the critical count error above; otherwise unambiguous once corrected to 8.
- No other ambiguity found — dialog visibility wiring, ARIA labeling, and the opt-in
  `helpTitle` mechanism are all clearly and unambiguously specified, matching the
  `export-footer` precedent closely enough to implement without guessing.

### Invented or Unsupported Requirements

None. Every requirement traces to either the raw task (`00-raw-task.md`) or the
referenced planning doc (`docs/help-informations.md`), including the addition of a
"Job Posting" help entry — the spec explicitly discloses this as an addition made
"during clarification since the original doc only explicitly listed the other 8
sections' copy," which is transparent and appropriately flagged rather than silently
inserted.

## Assumptions Detected

- **Explicitly stated in spec:**
  - Job Posting section help copy uses the "Job Posting" paragraph from
    `docs/help-informations.md` even though the original doc's "Proposed copy per
    section" list didn't originally frame it as one of the "8 result sections" —
    spec explicitly calls this out as added during clarification.
  - Dialog sizing (`{ width: '600px', maxWidth: '95vw' }`) mirrors the existing
    export-footer info dialog — explicitly stated as intentional consistency.
  - No new shared types are needed since `helpTitle` is a plain string and body content
    is static projected template content — explicitly stated in Data/API section.
- **Not explicitly stated but implicit:**
  - The spec assumes the current section count is 9 (Job Posting + 8 results) without
    stating this was verified against the live codebase — this is the source of the
    critical count error. The planning doc (`help-informations.md`) also only lists 8
    sections' copy (not counting Job Posting separately in its "per section" list,
    though Job Posting copy is present), so the "9" figure isn't traceable to either
    source document and appears to be a miscount introduced during spec authoring.

## Recommendation

- **Revise specification** — correct the section count (8 total: Job Posting + 7
  result sections) in the Context, Scope, Behavior, and Acceptance sections before
  proceeding to implementation planning. No other changes needed.
