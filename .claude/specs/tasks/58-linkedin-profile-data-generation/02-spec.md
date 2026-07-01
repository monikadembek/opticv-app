# Task Specification

## Source

Azure DevOps Task: 58 — Generate LinkedIn profile information, display results and export (FE)

## Goal

Add `LINKEDIN_REWRITE` to the active optimization run, implement a dedicated result display component for LinkedIn profile data, and enable PDF/DOCX export of LinkedIn content.

## Context

The `LINKEDIN_REWRITE` prompt (v2.0.0) is already seeded and active in the database. The sidebar already lists it under "Additional Materials" but the section currently shows "Coming soon". The optimization pipeline and SSE streaming already handle all prompt types generically — the only missing piece is:

1. Including `LINKEDIN_REWRITE` in the `ActivePrompts` array so it runs during optimization.
2. A new Angular display component for the structured output.
3. Export support (PDF + DOCX) for LinkedIn content.

## Scope

### In scope

- Add `PromptType.LINKEDIN_REWRITE` to `ActivePrompts` in `cv-optimization.ts`
- Add `LinkedInRewriteResult` type to `@opticv/datatypes`
- Add `isLinkedInRewriteResult()` type guard in `cv-optimization.ts`
- Create `LinkedInUpdates` component to display the result
- Wire the component into `cv-optimization.html` replacing the "Coming soon" placeholder
- Add LinkedIn-specific PDF export method to `CvExportService`
- Add LinkedIn-specific DOCX export method to `CvExportService`
- Expose LinkedIn export buttons in the UI (copy-to-clipboard as minimum, file export as stretch)

### Out of scope

- Backend changes (prompt is already seeded and active)
- Editing/saving LinkedIn content back to the database (`userEditedOutput`)
- Template selector (CV export templates do not apply to LinkedIn content)

## Behavior

### Step 1 — Activation

Add `PromptType.LINKEDIN_REWRITE` to the `ActivePrompts` constant so it is included in the full optimization run (`runFullOptimizationProcess`). The sidebar already tracks its status; no sidebar changes needed.

### Step 2 — Type definition

Add `LinkedInRewriteResult` to `packages/shared/datatypes/src/lib/datatypes.ts` matching the prompt's `outputSchema`:

```
{
  headlineVariants: Array<{
    angle: 'title_specialty_value' | 'outcome_focused' | 'story_focused';
    text: string;
    characterCount: number;
    keywordsTargeted: string[];
    rationale?: string;
  }>;
  recommendedHeadline?: 'title_specialty_value' | 'outcome_focused' | 'story_focused';
  aboutRewrite: {
    fullText: string;
    characterCount: number;
    preview: string;
    structure: {
      hook: string;
      story: string;
      achievements: string[];
      cta: string;
    };
    keywordsIncorporated?: string[];
  };
  additionalRecommendations: Array<{
    section: 'skills' | 'featured' | 'experience' | 'education' | 'certifications' | 'url' | 'photo' | 'banner' | 'recommendations' | 'activity';
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  skillsToAdd?: string[];
  targetSearchQueries: string[];
}
```

### Step 3 — Component: `LinkedInUpdates`

Create `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/` with:

- `linkedin-updates.ts` — component class
- `linkedin-updates.html` — template

**Inputs:**
- `result: input<LinkedInRewriteResult>()`

**Sections displayed (in order):**

#### 3a. Headline Variants

Display all 3 variants as cards. Each card shows:
- Angle label (mapped to human-readable: `title_specialty_value` → "Title / Specialty / Value", `outcome_focused` → "Outcome-Focused", `story_focused` → "Story-Focused")
- The headline text (prominent, copyable)
- Character count badge (e.g. "187 / 220 chars")
- List of keywords targeted
- Rationale text (if present), collapsed by default
- Badge/highlight on the recommended variant (if `recommendedHeadline` is set)
- Copy-to-clipboard button per headline

#### 3b. About Section

Display:
- Full text in a read-only textarea or styled block (copyable via button)
- Character count (e.g. "1842 / 2600 chars")
- Preview snippet (the first ~210 chars shown before "see more" on LinkedIn) — labeled clearly
- Expandable breakdown panel showing: Hook / Story / Achievements / CTA
- Keywords incorporated (shown as chips, if present)

#### 3c. Skills to Add

Display as a chip list. If `skillsToAdd` is empty or absent, show a short "No new skills suggested" message.

#### 3d. Profile Recommendations

Display as a grouped list, sorted by priority (high → medium → low).
Each item shows:
- Section name (formatted: "url" → "Custom URL", "photo" → "Profile Photo", etc.)
- Priority badge (high = red/orange, medium = yellow, low = grey)
- Recommendation text

#### 3e. Target Search Queries

Display as a chip list. Each chip has a copy-to-clipboard icon.

### Step 4 — Wire into main page

In `cv-optimization.ts`:
- Import `LinkedInUpdates`
- Add `isLinkedInRewriteResult()` type guard
- Add `linkedInResult` computed signal (same pattern as `summaryRewriteResult`, `coverLetterResult`, etc.)

In `cv-optimization.html`, replace the "Coming soon" placeholder inside the `LINKEDIN_REWRITE` `<app-section-card>`:

```
@if (isLinkedInRewriteResult(linkedInResult())) {
  <app-linkedin-updates [result]="linkedInResult()!" />
} @else {
  <!-- empty state / error state, same as other sections -->
}
```

Include retry button on error state (same pattern as `INTERVIEW_PREP` section).

### Step 5 — Export

Create a separate LinkedIn export service or extend `CvExportService` with:

- `exportLinkedInAsPdf(result: LinkedInRewriteResult): void`
- `exportLinkedInAsDocx(result: LinkedInRewriteResult): void`

**PDF content (jsPDF):**
- Title: "LinkedIn Profile — [candidate name if available, else 'Candidate']"
- Section: Recommended Headline (or first variant if no recommendation)
- Section: All 3 Headline Variants (with angle label and keywords)
- Section: About Section (full text + preview callout)
- Section: Skills to Add (comma-separated or listed)
- Section: Profile Recommendations (sorted by priority)
- Section: Target Search Queries

**DOCX content (docx library):**
- Same section order and content as PDF
- Use heading styles for section titles

**Export trigger:**
Add export buttons to the `LinkedInUpdates` component header or a dedicated footer row within the section card. Two buttons: "Export PDF" and "Export DOCX". These are independent of the CV export footer (which exports the resume).

The export buttons are only enabled when `result` is a valid `LinkedInRewriteResult`.

## Edge Cases

- `skillsToAdd` may be absent or empty — render "No new skills suggested" instead of an empty chip list
- `recommendedHeadline` is optional — if absent, do not show any highlighted variant
- `additionalRecommendations` may be an empty array — render "No additional recommendations" message
- `rationale` on headline variants is optional — collapse/hide when absent
- Character count approaching max (>90% of limit) may be highlighted in amber; over limit in red (informational only, data comes from AI)
- Optimization in progress: section card shows loading state via existing `SectionStatus` mechanism — `LinkedInUpdates` is only rendered when status is `COMPLETED`
- Optimization failed: show retry button (same as other sections)

## Data / API

No new API endpoints or DB schema changes required. The `OptimizationResult` record for `LINKEDIN_REWRITE` is created and updated by the existing pipeline.

**New shared type:**
- `LinkedInRewriteResult` in `packages/shared/datatypes/src/lib/datatypes.ts`

**Modified files:**
- `packages/shared/datatypes/src/lib/datatypes.ts` — add `LinkedInRewriteResult` type
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` — add to `ActivePrompts`, add type guard and computed signal
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` — replace "Coming soon" placeholder
- `apps/opticv-web/src/app/features/cv-optimization/services/cv-export.service.ts` — add LinkedIn export methods
- New component: `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/`

## Acceptance (DEV)

- `npm exec nx run-many -t build` passes with no errors
- `npm exec nx run-many -t typecheck` passes with no errors
- `npm exec nx run-many -t lint` passes with no errors
- Running a full optimization with a job description + CV triggers `LINKEDIN_REWRITE` alongside the other prompts
- SSE stream delivers `job-complete` for `LINKEDIN_REWRITE` and the sidebar status updates correctly
- `LinkedInUpdates` component renders all 5 sections when result is present
- Recommended headline is visually distinct when `recommendedHeadline` is set
- Copy-to-clipboard works for each headline and for the About section
- PDF export generates a readable document with all sections
- DOCX export generates a valid `.docx` file with all sections
- Empty/absent optional fields (`skillsToAdd`, `recommendedHeadline`, `rationale`) render gracefully without errors
- Retry button appears and works when the optimization result status is `FAILED`
