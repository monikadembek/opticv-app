# Implementation Plan

## Task ID: 26-interview-prep-ui

---

## Assumptions (resolved from spec review)

- The backend already returns `InterviewPrepResult`-shaped JSON via the SSE stream; no backend changes are needed.
- Plain `div` + Tailwind utility classes are used for card layout (matching `bullet-rewriter` and `cover-letter-editor` peers), not `p-card`.
- `answerWordCount` is **not rendered** in the UI — it is present in the type for completeness but intentionally omitted from display.
- The collapsible follow-up `p-panel` header label is `"Follow-up Questions"`.
- The `datatypes` package is built before `opticv-web` via the existing `^build` Nx dependency; no explicit build step is added to this plan.

---

## Step 1 — Add shared types to `datatypes`

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Append the following exported types at the end of the file, in this order:

1. `InterviewPrepFollowUp`
2. `InterviewPrepQuestion`
3. `InterviewPrepQuestionToAsk`
4. `InterviewPrepStressTest`
5. `InterviewPrepResult`

Type shapes are specified exactly in `02-spec.md` § "Data / Types". No other changes to this file.

---

## Step 2 — Wire up parent page component (`cv-optimization.ts`)

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

Changes, in order:

1. Add `InterviewPrepResult` to the named imports from `@opticv/datatypes`.
2. Add a module-level type guard function (alongside the existing guards, after `isCoverLetterResult`):

   ```
   function isInterviewPrepResult(value: unknown): value is InterviewPrepResult
   ```

   Implementation: check `typeof value === 'object'`, not null, `Array.isArray(v['questions'])`, `Array.isArray(v['preparationTips'])`.

3. Add a `readonly interviewPrepResult` computed signal of type `InterviewPrepResult | null` (after `coverLetterResult`), using the guard above against `PromptType.INTERVIEW_PREP`.

4. Import `InterviewPrep` from `./components/interview-prep/interview-prep` and add it to the component `imports` array.

5. Remove `JsonPipe` from the imports array only if it is no longer used after the template change in Step 3. (Check first — LinkedIn panel still uses it in the raw `<pre>` block, so `JsonPipe` must remain.)

---

## Step 3 — Update parent template (`cv-optimization.html`)

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Replace the entire `<p-accordion-content>` body of the "Interview Prep (10Q&A)" panel (accordion value `"6"`) — lines 204–212 — with:

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

No other changes to this file.

---

## Step 4 — Create `InterviewPrep` component

### 4a — Component class

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.ts`

- Selector: `app-interview-prep`
- `ChangeDetectionStrategy.OnPush`
- `templateUrl: './interview-prep.html'` (external template)
- Single input: `readonly result = input.required<InterviewPrepResult>()`
- Import `InterviewPrepResult` as a type import from `@opticv/datatypes`
- No injected services
- No PrimeNG imports in the class itself — only import what is used in the template (see 4b)

PrimeNG modules to import (used in template):
- `PanelModule` (from `primeng/panel`) — for the collapsible follow-up sub-section

No other Angular or PrimeNG modules are needed; the template uses only native control flow and Tailwind classes.

### 4b — Template

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.html`

Top-level wrapper: `<div class="space-y-8">`.

#### Section 1: Interview Questions

```
@if (result().questions.length === 0) {
  <p-message severity="info" text="No questions available." />
} @else {
  <div class="space-y-4">
    @for (q of result().questions; track q.question; let i = $index) {
      <!-- question card -->
    }
  </div>
}
```

Each question card: `<div class="rounded-lg border border-surface-200 p-4 space-y-3">`

Card internal layout (top to bottom):

1. **Header row** (`<div class="flex flex-wrap items-center gap-2">`)
   - Question number: `<span class="font-semibold text-surface-500 text-sm">Q{{ i + 1 }}</span>`
   - Category badge: `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {{ categoryClass(q.category) }}">{{ q.category }}</span>`
     - Use a `computed`-free approach: resolve the class string inline via a helper method `categoryClass(category: InterviewPrepQuestion['category']): string` defined on the component class (a simple switch/record lookup, returns Tailwind classes per the spec table).
   - Likelihood badge (only when `q.likelihood` is defined):
     `@if (q.likelihood) { <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {{ likelihoodClass(q.likelihood) }}">{{ q.likelihood }}</span> }`
     - `very_high` → `bg-red-100 text-red-700`
     - `high` → `bg-amber-100 text-amber-700`
     - `medium` → `bg-surface-100 text-surface-500`

2. **Question text**: `<p class="m-0 font-semibold text-surface-900">{{ q.question }}</p>`

3. **What they're assessing**: `<p class="m-0 text-sm text-surface-500"><span class="font-medium">Assessing: </span><em>{{ q.whatTheyreAssessing }}</em></p>`

4. **Suggested answer block** (`<div class="rounded-lg bg-surface-50 border border-surface-200 p-3 space-y-2">`)
   - Answer structure badge: `<span class="inline-flex items-center rounded bg-surface-200 px-2 py-0.5 text-xs font-medium text-surface-700">{{ q.answerStructure }}</span>`
   - Answer text: `<p class="m-0 text-sm text-surface-800">{{ q.suggestedAnswer }}</p>`
   - Placeholder note (only when `q.needsUserInput && q.placeholdersToFill.length > 0`):
     `<div class="rounded bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">Fill in: {{ q.placeholdersToFill.join(', ') }}</div>`

5. **Traps to avoid** (only when `q.trapsToAvoid.length > 0`):
   ```
   <div class="rounded-lg bg-red-50 border border-red-200 p-3">
     <p class="m-0 text-xs font-medium text-red-700 mb-1">Traps to avoid</p>
     <ul class="m-0 pl-4 space-y-0.5 text-xs text-red-600">
       @for (trap of q.trapsToAvoid; track trap) { <li>{{ trap }}</li> }
     </ul>
   </div>
   ```

6. **Follow-up questions** (only when `q.followUps.length > 0`):
   ```
   <p-panel header="Follow-up Questions" [toggleable]="true" [collapsed]="true">
     <ul class="m-0 pl-0 list-none space-y-3">
       @for (fu of q.followUps; track fu.followUpQuestion) {
         <li>
           <p class="m-0 text-sm font-medium text-surface-800">{{ fu.followUpQuestion }}</p>
           <p class="m-0 text-xs text-surface-500 mt-1">{{ fu.guidance }}</p>
         </li>
       }
     </ul>
   </p-panel>
   ```

#### Section 2: Questions to Ask Interviewer

Only rendered when `result().questionsToAskInterviewer.length > 0`.

```
<div>
  <h3 class="text-lg font-semibold text-surface-800 mb-3">Questions to Ask Interviewer</h3>
  <ol class="m-0 pl-5 space-y-3">
    @for (q of result().questionsToAskInterviewer; track q.question) {
      <li>
        <p class="m-0 text-sm font-medium text-surface-800">{{ q.question }}</p>
        <p class="m-0 text-xs text-surface-500 mt-0.5">{{ q.rationale }}</p>
      </li>
    }
  </ol>
</div>
```

#### Section 3: Stress-Test Questions

Only rendered when `result().stressTestQuestions.length > 0`.

```
<div>
  <h3 class="text-lg font-semibold text-surface-800 mb-3">Stress-Test Questions</h3>
  <div class="space-y-4">
    @for (st of result().stressTestQuestions; track st.question) {
      <div class="rounded-lg border border-surface-200 p-4 space-y-2">
        <p class="m-0 font-semibold text-surface-900 text-sm">{{ st.question }}</p>
        <p class="m-0 text-xs text-surface-500">{{ st.whyItllComeUp }}</p>
        <div class="rounded-lg bg-surface-50 border border-surface-200 p-3 text-sm text-surface-800">
          {{ st.recommendedAnswer }}
        </div>
      </div>
    }
  </div>
</div>
```

#### Section 4: Preparation Tips

Only rendered when `result().preparationTips.length > 0`.

```
<div>
  <h3 class="text-lg font-semibold text-surface-800 mb-3">Preparation Tips</h3>
  <ul class="m-0 pl-0 list-none space-y-2">
    @for (tip of result().preparationTips; track tip) {
      <li class="flex items-start gap-2 text-sm text-surface-700">
        <i class="pi pi-check text-green-600 mt-0.5 shrink-0"></i>
        <span>{{ tip }}</span>
      </li>
    }
  </ul>
</div>
```

### 4c — Helper methods on component class

Add two pure methods (no side effects, no state):

```
categoryClass(category: InterviewPrepQuestion['category']): string
likelihoodClass(likelihood: NonNullable<InterviewPrepQuestion['likelihood']>): string
```

Both return a Tailwind class string. Values per the spec table.

---

## Step 5 — Unit tests

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.spec.ts`

Pattern: follows `bullet-rewriter.spec.ts` exactly — `TestBed.configureTestingModule`, `fixture.componentRef.setInput('result', ...)`, `fixture.detectChanges()`, assertions on `fixture.nativeElement.textContent`.

Define `MOCK_RESULT: InterviewPrepResult` at the top of the file with realistic values covering all fields (one question with a follow-up, one without; one with `needsUserInput: true`; one with `trapsToAvoid`; populated `questionsToAskInterviewer`, `stressTestQuestions`, `preparationTips`).

**Test cases (minimum):**

`describe('InterviewPrep')`
- `it('should create')`

`describe('interview questions')`
- renders question text for first question
- renders category badge text
- renders likelihood badge when present
- does not render likelihood badge when absent
- renders "what they're assessing" text
- renders suggested answer text
- renders answer structure badge
- shows placeholder fill note when `needsUserInput` is true and `placeholdersToFill` is non-empty
- hides placeholder fill note when `needsUserInput` is false
- renders traps to avoid when non-empty
- hides traps section when `trapsToAvoid` is empty
- shows "No questions available." when `questions` is empty

`describe('questions to ask interviewer')`
- renders section heading and question text
- hides section when `questionsToAskInterviewer` is empty

`describe('stress-test questions')`
- renders section heading and question text
- hides section when `stressTestQuestions` is empty

`describe('preparation tips')`
- renders section heading and tip text
- hides section when `preparationTips` is empty

---

## Files Created / Modified

| Action   | File |
|----------|------|
| Modified | `packages/shared/datatypes/src/lib/datatypes.ts` |
| Modified | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` |
| Modified | `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` |
| Created  | `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.ts` |
| Created  | `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.html` |
| Created  | `apps/opticv-web/src/app/features/cv-optimization/components/interview-prep/interview-prep.spec.ts` |

---

## Verification Checklist

- [ ] `npm exec nx typecheck opticv-web` passes
- [ ] `npm exec nx lint opticv-web` passes
- [ ] `npm exec nx test opticv-web` passes
- [ ] Interview Prep accordion panel renders structured UI (not raw JSON)
- [ ] Loading / error / empty states match the other panels
