# Task Specification

## Source

Azure DevOps Task: 26-interview-prep-ui

## Goal

Replace the raw-JSON `<pre>` placeholder in the Interview Prep accordion panel with a purpose-built `InterviewPrep` component that renders `InterviewPrepResult` data in a clean, structured UI. Also add the required TypeScript types to the shared datatypes library and wire up the computed signal + type guard in the parent page component.

## Context

The `CvOptimization` page (`apps/opticv-web/src/app/features/cv-optimization/`) hosts an accordion with one panel per `PromptType`. All other panels already have dedicated display components; the Interview Prep panel (accordion value "6") currently renders a raw `<pre>{{ r.result | json }}</pre>`.

The backend AI prompt returns exactly 10 interview questions plus follow-ups, stress-test questions, questions-to-ask-interviewer, and preparation tips. No new API endpoints are needed — data arrives via the existing SSE stream.

## Scope

### In scope

- Add `InterviewPrepResult` and related sub-types to `packages/shared/datatypes/src/lib/datatypes.ts`
- Add `isInterviewPrepResult()` type guard and `interviewPrepResult` computed signal to `cv-optimization.ts`
- Create `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/` folder with:
  - `interview-prep.ts` (component class)
  - `interview-prep.html` (template)
  - `interview-prep.spec.ts` (unit tests)
- Update `cv-optimization.html` to replace the raw `<pre>` block with `<app-interview-prep [result]="interviewPrepResult()" />`
- Update `cv-optimization.ts` to import and declare the new component + use `OptimizationResultPanel` wrapper (matching other panels)

### Out of scope

- Copy-to-clipboard, export (PDF/DOCX), or editing functionality
- Backend changes
- LinkedIn Rewrite or any other panel

## Data / Types

Add to `packages/shared/datatypes/src/lib/datatypes.ts`:

```typescript
export type InterviewPrepFollowUp = {
  followUpQuestion: string;
  guidance: string;
};

export type InterviewPrepQuestion = {
  question: string;
  category:
    | 'behavioral'
    | 'technical'
    | 'situational'
    | 'fit'
    | 'candidate_specific'
    | 'leadership'
    | 'culture';
  likelihood?: 'very_high' | 'high' | 'medium';
  whatTheyreAssessing: string;
  suggestedAnswer: string;
  answerWordCount: number;
  answerStructure: 'STAR' | 'narrative' | 'framework' | 'direct';
  needsUserInput: boolean;
  placeholdersToFill: string[];
  followUps: InterviewPrepFollowUp[];
  trapsToAvoid: string[];
};

export type InterviewPrepQuestionToAsk = {
  question: string;
  rationale: string;
};

export type InterviewPrepStressTest = {
  question: string;
  whyItllComeUp: string;
  recommendedAnswer: string;
};

export type InterviewPrepResult = {
  questions: InterviewPrepQuestion[];
  questionsToAskInterviewer: InterviewPrepQuestionToAsk[];
  stressTestQuestions: InterviewPrepStressTest[];
  preparationTips: string[];
};
```

## Behavior

### `cv-optimization.ts` changes

1. Import `InterviewPrepResult` from `@opticv/datatypes`.
2. Add type guard:
   ```typescript
   function isInterviewPrepResult(value: unknown): value is InterviewPrepResult {
     if (typeof value !== 'object' || value === null) return false;
     const v = value as Record<string, unknown>;
     return Array.isArray(v['questions']) && Array.isArray(v['preparationTips']);
   }
   ```
3. Add computed signal:
   ```typescript
   readonly interviewPrepResult = computed<InterviewPrepResult | null>(() => {
     const r = this.results().get(PromptType.INTERVIEW_PREP)?.result;
     return isInterviewPrepResult(r) ? r : null;
   });
   ```
4. Add `InterviewPrep` to the `imports` array of the component decorator.

### `cv-optimization.html` changes

Replace the Interview Prep `<p-accordion-content>` body with the `OptimizationResultPanel` wrapper pattern used by other panels:

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(PromptType.INTERVIEW_PREP) ?? false"
  [error]="results().get(PromptType.INTERVIEW_PREP)?.error ?? null"
  [hasData]="interviewPrepResult() !== null"
>
  @if (interviewPrepResult(); as result) {
    <app-interview-prep [result]="result" />
  }
</app-optimization-result-panel>
```

### `InterviewPrep` component

**Input:** `result = input.required<InterviewPrepResult>()`

**Sections rendered (in order):**

#### 1. Interview Questions (10 items)

Render each question as a card. Each card contains:

- **Header row:** Question number (e.g. "Q1"), category badge (color-coded by category — see below), and likelihood badge if present (`very_high` = red, `high` = amber, `medium` = gray).
- **Question text:** Bold, prominent.
- **"What they're assessing":** Label + italic text.
- **Suggested answer:** Full answer text in a light-gray box. If `needsUserInput` is true, show a blue info note listing each item in `placeholdersToFill` (e.g. "Fill in: [specific metric], [project name]").
- **Answer structure badge:** Small badge showing `STAR`, `narrative`, `framework`, or `direct`.
- **Traps to avoid:** If non-empty, display as a red-tinted warning list.
- **Follow-up questions:** If non-empty, show as a collapsible sub-section (PrimeNG `p-panel` with `[toggleable]="true"` and `[collapsed]="true"`). Each follow-up shows `followUpQuestion` + `guidance`.

**Category badge colors (Tailwind background utility classes):**

| Category           | Class                     |
|--------------------|---------------------------|
| behavioral         | `bg-blue-100 text-blue-800` |
| technical          | `bg-purple-100 text-purple-800` |
| situational        | `bg-green-100 text-green-800` |
| fit                | `bg-orange-100 text-orange-800` |
| candidate_specific | `bg-pink-100 text-pink-800` |
| leadership         | `bg-indigo-100 text-indigo-800` |
| culture            | `bg-teal-100 text-teal-800` |

#### 2. Questions to Ask Interviewer

Section heading: "Questions to Ask Interviewer". Rendered as a numbered list. Each item shows `question` (bold) and `rationale` (muted text below).

#### 3. Stress-Test Questions

Section heading: "Stress-Test Questions". Each item displayed as a card with:
- Stress-test question (bold)
- "Why it'll come up": muted text
- "Recommended answer": text in a light-gray box

#### 4. Preparation Tips

Section heading: "Preparation Tips". Render as an unordered list with a checkmark icon (`pi pi-check`) before each tip.

## Edge Cases

- If `questions` is empty, show a `<p-message severity="info">` with "No questions available."
- If `questionsToAskInterviewer` is empty, omit that section entirely.
- If `stressTestQuestions` is empty, omit that section entirely.
- If `preparationTips` is empty, omit that section entirely.
- `likelihood` is optional on `InterviewPrepQuestion` — only render the likelihood badge when the value is present.

## Acceptance (DEV)

- `npm exec nx typecheck opticv-web` passes
- `npm exec nx lint opticv-web` passes
- `npm exec nx test opticv-web` passes (unit tests added for `InterviewPrep` component covering: renders questions, renders sections, handles empty optional sections)
- The Interview Prep accordion panel no longer renders raw JSON; it uses `app-optimization-result-panel` + `app-interview-prep`
- Loading/error/empty states are handled consistently with other panels
