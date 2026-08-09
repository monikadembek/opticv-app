Task 106: Job title match against job title from job posting

Description:

Incorporate job title matching section into the existing Keyword Gap section, not a new one, it fits the existing pattern well:

- KeywordGapResult already has a suggestedPlacement: 'title' option on missing keywords — meaning the model already flags when a keyword should live in the job title, it's just not surfaced as its own thing today.
- The KEYWORD_GAP AI job already receives both texts: the CV's contact.position (extracted candidate title) and the job posting's jobTitle/jobDescription, via the seeded prompt in apps/opticv-be/prisma/seed.ts and PromptService's SHARED_CONTEXT. No new AI call is needed — this can be one more field in the existing structured JSON output the model already returns.
- The Keyword Gap UI (apps/opticv-web/.../components/keyword-gap/keyword-gap.ts) already renders the match score, matched/missing keywords, underweighted keywords, and acronym issues in one card — a "Job Title Match" sub-block at the top (right under the score ring, before the keyword lists) reads naturally as "here's your overall alignment, and here's specifically whether your title matches."

What the functionality should include

1. A jobTitleMatch field on KeywordGapResult (new type in datatypes.ts), something like:
export type KeywordGapJobTitleMatch = {
  candidateTitle: string | null;      // from CvStructuredData.contact.position
  targetTitle: string;                // from JobApplication.jobTitle
  matchLevel: 'exact' | 'close' | 'mismatch';
  suggestedTitle: string | null;      // AI-suggested title to use instead
  reasoning: string;                  // short explanation of the gap
};
2. Prompt change: extend the KEYWORD_GAP prompt in seed.ts to also compare the candidate's current title against the job's title and return this block — reusing the same call rather than adding a second AI round-trip.
3. UI: a compact banner/row in keyword-gap.html, e.g. "Your title: Senior Backend Developer → Job wants: Staff Software Engineer" with a match badge (exact/close/mismatch) and a one-line reasoning.
4. Actionable fix (task #106 explicitly asks for this): a button "Use suggested title" that updates the title used in the optimized/exported CV — reusing the existing edit/override pattern already used for keywords and acronyms (keywordEdits map, apply-selections.ts), just targeting contact.position (and optionally the most recent experience[0].title) instead of a keyword string.
5. Score contribution: title mismatch should factor into matchScore/matchScoreBreakdown, given title is one of the highest-weight ATS signals, include it into the score.