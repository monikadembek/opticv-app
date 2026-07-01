# Implementation Plan

## Source

Task: 58 — Generate LinkedIn profile information, display results and export (FE)
Spec: `02-spec.md` | Review: `03-spec-review.md` (PASS WITH ISSUES — all resolvable)

## Review Issues Resolved in This Plan

| Issue | Resolution |
|---|---|
| Export labelled "minimum/stretch" | PDF + DOCX are both required; both are fully planned below |
| Export button placement ambiguous | Buttons placed inside `LinkedInUpdates` component, above the first section, matching `interview-prep.html` pattern |
| Candidate name sourcing for PDF title | Title will be "LinkedIn Profile Suggestions" — no candidate name needed, avoids underspecified sourcing |
| `isLinkedInRewriteResult()` fields not listed | Checked fields: `headlineVariants` (array), `aboutRewrite` (object), `targetSearchQueries` (array), `additionalRecommendations` (array) |
| All 10 section label mappings not defined | Full mapping table provided below (Step 3d) |
| `@opticv/datatypes` rebuild not mentioned | Included as explicit step in execution order |

---

## Execution Order

The steps must be executed in this exact order to avoid broken imports:

1. Add `LinkedInRewriteResult` type to `@opticv/datatypes`
2. Build `@opticv/datatypes`
3. Add type guard to `cv-optimization.ts`
4. Add `LINKEDIN_REWRITE` to `ActivePrompts`
5. Add `linkedInResult` computed signal
6. Create `LinkedInExportService`
7. Create `LinkedInUpdates` component
8. Wire component into `cv-optimization.html`
9. Verify build + typecheck + lint

---

## Step 1 — Add `LinkedInRewriteResult` type

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Add the following types near the other result types (after `InterviewPrepResult`, around line 393):

```
export type LinkedInHeadlineAngle =
  | 'title_specialty_value'
  | 'outcome_focused'
  | 'story_focused';

export type LinkedInHeadlineVariant = {
  angle: LinkedInHeadlineAngle;
  text: string;
  characterCount: number;
  keywordsTargeted: string[];
  rationale?: string;
};

export type LinkedInAboutRewrite = {
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

export type LinkedInRecommendationSection =
  | 'skills'
  | 'featured'
  | 'experience'
  | 'education'
  | 'certifications'
  | 'url'
  | 'photo'
  | 'banner'
  | 'recommendations'
  | 'activity';

export type LinkedInProfileRecommendation = {
  section: LinkedInRecommendationSection;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
};

export type LinkedInRewriteResult = {
  headlineVariants: LinkedInHeadlineVariant[];
  recommendedHeadline?: LinkedInHeadlineAngle;
  aboutRewrite: LinkedInAboutRewrite;
  additionalRecommendations: LinkedInProfileRecommendation[];
  skillsToAdd?: string[];
  targetSearchQueries: string[];
};
```

---

## Step 2 — Build `@opticv/datatypes`

Run: `npm exec nx build datatypes`

This makes the new type available for import in the Angular app.

---

## Step 3 — Add type guard to `cv-optimization.ts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

Add this function after `isInterviewPrepResult()` (around line 127), before the `ActivePrompts` constant:

```
function isLinkedInRewriteResult(value: unknown): value is LinkedInRewriteResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v['headlineVariants']) &&
    typeof v['aboutRewrite'] === 'object' &&
    v['aboutRewrite'] !== null &&
    Array.isArray(v['additionalRecommendations']) &&
    Array.isArray(v['targetSearchQueries'])
  );
}
```

Also add `LinkedInRewriteResult` to the import from `@opticv/datatypes`.

---

## Step 4 — Add `LINKEDIN_REWRITE` to `ActivePrompts`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

Update the constant at line 130:

```
const ActivePrompts = [
  PromptType.RESUME_AUTOPSY,
  PromptType.KEYWORD_GAP,
  PromptType.BULLET_UPGRADE,
  PromptType.SUMMARY_REWRITE,
  PromptType.COVER_LETTER,
  PromptType.INTERVIEW_PREP,
  PromptType.LINKEDIN_REWRITE,   // add this line
];
```

---

## Step 5 — Add `linkedInResult` computed signal

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

Add after `interviewPrepResult` (around line 243), following the identical pattern:

```
readonly linkedInResult = computed<LinkedInRewriteResult | null>(() => {
  const r = this.results().get(PromptType.LINKEDIN_REWRITE)?.result;
  return isLinkedInRewriteResult(r) ? r : null;
});
```

---

## Step 6 — Create `LinkedInExportService`

**File:** `apps/opticv-web/src/app/features/cv-optimization/services/linkedin-export.service.ts`

Pattern: mirrors `interview-prep-export.service.ts` exactly.

**Class structure:**
- `providedIn: 'root'`
- Inject `PLATFORM_ID`
- `exportToPdf(result: LinkedInRewriteResult): Promise<void>`
- `exportToDocx(result: LinkedInRewriteResult): Promise<void>`

**`exportToPdf` content order:**
1. Platform check — return early if not browser
2. Dynamic import `jspdf`
3. Document title: `"LinkedIn Profile Suggestions"`
4. Section "Headline Variants":
   - For each of the 3 variants: angle label (mapped — see table below), headline text, char count, keywords list
   - Mark the recommended variant with "★ Recommended" prefix if `result.recommendedHeadline` matches
5. Section "About Section":
   - Preview (labeled "Preview (visible before 'See more')")
   - Full text
   - Char count
   - Keywords incorporated (comma-separated, if present)
6. Section "Skills to Add": comma-separated list; "None suggested" if empty/absent
7. Section "Profile Recommendations" (sorted high → medium → low):
   - Each item: `[PRIORITY] Section Label: recommendation text`
8. Section "Target Search Queries": one per line

**`exportToDocx` content order:** identical sections using `docx` library, heading styles for section titles, paragraph styles for body.

**Angle label mapping (used in both PDF and DOCX):**

| Enum value | Label |
|---|---|
| `title_specialty_value` | Title / Specialty / Value |
| `outcome_focused` | Outcome-Focused |
| `story_focused` | Story-Focused |

**Section label mapping for `additionalRecommendations` (used in component template and export):**

| Enum value | Label |
|---|---|
| `skills` | Skills |
| `featured` | Featured Section |
| `experience` | Experience |
| `education` | Education |
| `certifications` | Certifications |
| `url` | Custom URL |
| `photo` | Profile Photo |
| `banner` | Background Banner |
| `recommendations` | Recommendations |
| `activity` | Activity & Posts |

Define both mappings as `Record<string, string>` constants at the top of the service file so they can be imported by the component template too.

**Export these constants** so the component can import them:
```
export const LINKEDIN_ANGLE_LABELS: Record<LinkedInHeadlineAngle, string> = { ... }
export const LINKEDIN_SECTION_LABELS: Record<LinkedInRecommendationSection, string> = { ... }
```

---

## Step 7 — Create `LinkedInUpdates` component

**Directory:** `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/`

**Files to create:**
- `linkedin-updates.ts`
- `linkedin-updates.html`

### Component class (`linkedin-updates.ts`)

```
@Component({
  selector: 'app-linkedin-updates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './linkedin-updates.html',
  imports: [ /* PrimeNG modules, CommonModule as needed */ ],
})
export class LinkedInUpdates {
  readonly result = input.required<LinkedInRewriteResult>();

  protected readonly angleLabels = LINKEDIN_ANGLE_LABELS;
  protected readonly sectionLabels = LINKEDIN_SECTION_LABELS;

  protected readonly isBusyPdf = signal(false);
  protected readonly isBusyDocx = signal(false);

  private readonly exportService = inject(LinkedInExportService);
  private readonly messageService = inject(MessageService);

  protected readonly sortedRecommendations = computed(() => {
    const order = { high: 0, medium: 1, low: 2 };
    return [...this.result().additionalRecommendations].sort(
      (a, b) => order[a.priority] - order[b.priority],
    );
  });

  protected readonly hasSkills = computed(() =>
    (this.result().skillsToAdd?.length ?? 0) > 0,
  );

  async onExportPdf(): Promise<void> {
    this.isBusyPdf.set(true);
    try {
      await this.exportService.exportToPdf(this.result());
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Export failed', detail: 'Could not generate PDF.' });
    } finally {
      this.isBusyPdf.set(false);
    }
  }

  async onExportDocx(): Promise<void> {
    this.isBusyDocx.set(true);
    try {
      await this.exportService.exportToDocx(this.result());
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Export failed', detail: 'Could not generate DOCX.' });
    } finally {
      this.isBusyDocx.set(false);
    }
  }

  protected priorityClass(priority: 'high' | 'medium' | 'low'): string {
    return { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-gray-500' }[priority];
  }

  protected charCountClass(count: number, max: number): string {
    const ratio = count / max;
    if (ratio > 1) return 'text-red-600';
    if (ratio > 0.9) return 'text-amber-500';
    return 'text-gray-500';
  }
}
```

### Template (`linkedin-updates.html`)

**Section order:**

#### Export buttons (top)
Two `p-button` components side by side:
- "Export PDF" → calls `onExportPdf()`, `[loading]="isBusyPdf()"`
- "Export DOCX" → calls `onExportDocx()`, `[loading]="isBusyDocx()"`

#### Section A — Headline Variants
- Heading: "Headline Variants"
- `@for (variant of result().headlineVariants; track variant.angle)` → card per variant
- Each card:
  - Top row: angle label (`angleLabels[variant.angle]`) + recommended badge (`@if (result().recommendedHeadline === variant.angle)` → `★ Recommended` badge)
  - Headline text in a larger font
  - Character count badge: `[class]="charCountClass(variant.characterCount, 220)"` — e.g. `"{{ variant.characterCount }} / 220 chars"`
  - Keywords as chip-style spans: `@for (kw of variant.keywordsTargeted; track kw)`
  - Copy button: `p-button` with clipboard icon, `(onClick)` writes `variant.text` to clipboard via `navigator.clipboard.writeText()`
  - `@if (variant.rationale)` → collapsible `<p-panel>` with rationale text, `[collapsed]="true"` by default

#### Section B — About Section
- Heading: "About Section"
- Preview block: label "Preview (visible before 'See more')", then preview text in an italic styled block
- Full text block: read-only, monospace or body font, full text rendered in a `<div>` with `whitespace-pre-wrap`
- Char count: `[class]="charCountClass(result().aboutRewrite.characterCount, 2600)"` — e.g. `"{{ result().aboutRewrite.characterCount }} / 2600 chars"`
- Copy button for full text
- `@if (result().aboutRewrite.keywordsIncorporated?.length)` → keyword chips
- Collapsible `<p-panel>` labeled "Structure Breakdown" (`[collapsed]="true"` default):
  - Hook, Story, CTA displayed as labeled paragraphs
  - Achievements as a bulleted list

#### Section C — Skills to Add
- Heading: "Skills to Add"
- `@if (hasSkills())`:
  - `@for (skill of result().skillsToAdd!; track skill)` → chip spans
- `@else`:
  - `<p class="text-sm text-gray-500">No new skills suggested</p>`

#### Section D — Profile Recommendations
- Heading: "Profile Recommendations"
- `@if (sortedRecommendations().length)`:
  - `@for (rec of sortedRecommendations(); track rec.section)`:
    - Row: priority badge (`[class]="priorityClass(rec.priority)"`) + section label (`sectionLabels[rec.section]`) + recommendation text
- `@else`:
  - `<p class="text-sm text-gray-500">No additional recommendations</p>`

#### Section E — Target Search Queries
- Heading: "Target Search Queries"
- `@for (query of result().targetSearchQueries; track query)` → chip span with a copy icon button that writes `query` to clipboard

---

## Step 8 — Wire into `cv-optimization.html` and `cv-optimization.ts`

### `cv-optimization.ts`
- Add `LinkedInUpdates` to `imports` array in `@Component`
- Import `LinkedInUpdates` from its path

### `cv-optimization.html`

Replace lines 281–292 (the "Coming soon" placeholder) with:

```html
<app-section-card
  [sectionId]="PromptType.LINKEDIN_REWRITE"
  icon="pi-link"
  title="LinkedIn Updates"
  [status]="sectionStatus(PromptType.LINKEDIN_REWRITE)"
>
  @if (linkedInResult()) {
    <app-linkedin-updates [result]="linkedInResult()!" />
  }
  @if (retryablePromptTypes().has(PromptType.LINKEDIN_REWRITE)) {
    <div class="retry-action">
      <p-button
        label="Retry"
        ariaLabel="Retry LinkedIn Updates"
        icon="pi pi-refresh"
        severity="warn"
        size="small"
        [disabled]="isProcessing().get(PromptType.LINKEDIN_REWRITE) ?? false"
        (onClick)="retryOptimization(PromptType.LINKEDIN_REWRITE)"
      />
    </div>
  }
</app-section-card>
```

---

## Step 9 — Verify

Run in order:

```
npm exec nx build datatypes
npm exec nx typecheck opticv-web
npm exec nx lint opticv-web
npm exec nx build opticv-web
```

All must pass with zero errors before the task is considered complete.

---

## Files Created / Modified

### Created (new files)

| File | Purpose |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/linkedin-updates.ts` | New result display component |
| `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/linkedin-updates.html` | Component template |
| `apps/opticv-web/src/app/features/cv-optimization/services/linkedin-export.service.ts` | PDF + DOCX export for LinkedIn content |

### Modified (existing files)

| File | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `LinkedInRewriteResult` and supporting types |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add type guard, update `ActivePrompts`, add computed signal, import component |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Replace "Coming soon" with `<app-linkedin-updates>` + retry button |
