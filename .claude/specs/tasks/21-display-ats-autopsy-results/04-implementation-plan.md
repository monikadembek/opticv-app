# Implementation Plan

Task ID: 21-display-ats-autopsy-results

---

## Review Issues Resolved in This Plan

**Issue 1 — `$any(result)` vs no-`any` rule**
Resolution: Use a typed `computed()` signal in `CvOptimization` that casts `result` to `ResumeAutopsyResult` via a type guard function. The template receives the already-typed value; no `$any()` needed.

**Issue 2 — `OptimizationResultPanelComponent` location**
Resolution: Place it at `features/cv-optimization/components/optimization-result-panel/`. It is introduced as a shared convention for this feature's panels — if it needs to move app-wide later, that is a future refactor.

**Issue 3 — Severity group collapse default**
Resolution: Groups start **expanded** by default. Collapse state is local component signal, not persisted.

**Issue 4 — Empty `quotedText`**
Resolution: Conditionally render the `<blockquote>` only when `quotedText` is a non-empty string.

**State priority in `OptimizationResultPanelComponent`**
Priority order: `loading` → `error` → `!hasData` → `ng-content`. Mutually exclusive: if `loading=true`, only the skeleton is shown regardless of other inputs.

---

## Files to Create

| Path | Description |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `ResumeAutopsyIssue`, `ResumeAutopsyStrength`, `ResumeAutopsyResult` types |
| `apps/opticv-web/src/app/features/cv-optimization/components/optimization-result-panel/optimization-result-panel.ts` | Shared state-wrapper component |
| `apps/opticv-web/src/app/features/cv-optimization/components/optimization-result-panel/optimization-result-panel.html` | Template |
| `apps/opticv-web/src/app/features/cv-optimization/components/optimization-result-panel/optimization-result-panel.spec.ts` | Unit tests |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.ts` | ATS results display component |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.html` | Template |
| `apps/opticv-web/src/app/features/cv-optimization/components/ats-score/ats-score.spec.ts` | Unit tests |

## Files to Modify

| Path | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Append new types (no existing code touched) |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add `autopsynResult` computed signal; add new component imports |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Replace `<pre>` block in ATS Analysis panel with new components |

---

## Implementation Steps

### Step 1 — Add shared types to `@opticv/datatypes`

File: `packages/shared/datatypes/src/lib/datatypes.ts`

Append after the `PromptType` enum (end of file):

- Export `ResumeAutopsyIssue` interface with fields:
  - `id: string`
  - `category: 'parsing' | 'keywords' | 'structure' | 'content' | 'formatting' | 'length' | 'contact'`
  - `severity: 'critical' | 'high' | 'medium' | 'low'`
  - `title: string`
  - `quotedText: string`
  - `location: string`
  - `whyItMatters: string`
  - `fix: string`
  - `estimatedImpact: number`

- Export `ResumeAutopsyStrength` interface with fields:
  - `title: string`
  - `detail: string`

- Export `ResumeAutopsyResult` interface with fields:
  - `overallScore: number`
  - `predictedScoreAfterFixes: number`
  - `topPriority: string`
  - `issues: ResumeAutopsyIssue[]`
  - `strengths: ResumeAutopsyStrength[]`
  - `summary: string`

Verify build: `npm exec nx build datatypes`

---

### Step 2 — Create `OptimizationResultPanelComponent`

File: `optimization-result-panel.ts`

- Selector: `app-optimization-result-panel`
- `ChangeDetectionStrategy.OnPush`
- Inputs (using `input()` function):
  - `loading: InputSignal<boolean>`
  - `error: InputSignal<string | null>`
  - `hasData: InputSignal<boolean>`
- No outputs
- Imports: `NgTemplateOutlet` (for `ng-content`)

File: `optimization-result-panel.html`

State priority (top-to-bottom, only first matching branch renders):

1. `@if (loading())` → animated skeleton: a grey pulsing `div` with `animate-pulse` (Tailwind), height `h-64`, rounded
2. `@else if (error())` → red error block: `pi-exclamation-circle` icon + error message text
3. `@else if (!hasData())` → muted placeholder: "Run optimization to see results" with a `pi-info-circle` icon
4. `@else` → `<ng-content />`

File: `optimization-result-panel.spec.ts`

Tests (using Vitest / Angular test bed):
- Renders skeleton when `loading=true`, regardless of other inputs
- Renders error message when `loading=false`, `error='some error'`
- Renders empty placeholder when `loading=false`, `error=null`, `hasData=false`
- Renders `ng-content` when `loading=false`, `error=null`, `hasData=true`

---

### Step 3 — Create `AtsScoreComponent`

#### 3a. Component class (`ats-score.ts`)

- Selector: `app-ats-score`
- `ChangeDetectionStrategy.OnPush`
- Input: `data: InputSignal<ResumeAutopsyResult>` (required)
- Imports: `NgTemplateOutlet` (no PrimeNG needed)
- Internal signals and computeds:
  - `expandedIssueIds = signal<Set<string>>(new Set())` — tracks which issue cards are expanded
  - `issuesBySeverity = computed(() => groupAndSortIssues(data().issues))` — returns `{ severity, issues[] }[]` ordered critical→high→medium→low, skipping empty groups
  - `collapsedGroups = signal<Set<string>>(new Set())` — tracks which severity groups are collapsed (default: all expanded = empty set)
- Methods:
  - `toggleIssue(id: string): void` — adds/removes from `expandedIssueIds`
  - `toggleGroup(severity: string): void` — adds/removes from `collapsedGroups`
  - `isIssueExpanded(id: string): boolean` — reads from signal
  - `isGroupCollapsed(severity: string): boolean` — reads from signal
  - `scoreColor(score: number): string` — returns Tailwind colour class (`text-red-500` / `text-amber-500` / `text-green-500`)
  - `strokeColor(score: number): string` — returns SVG stroke colour value
  - `strokeDashoffset(score: number): number` — computes SVG offset from score 0–100 (circumference = 2π × r, r=40 → circumference ≈ 251.2)

Type guard (private, module-level function):
- `isResumeAutopsyResult(value: unknown): value is ResumeAutopsyResult` — used in `CvOptimization` parent, not in this component (component receives already-typed data)

Helper (module-level, not exported):
- `groupAndSortIssues(issues: ResumeAutopsyIssue[])` — groups issues by severity in order critical→high→medium→low, filters out empty groups

#### 3b. Template (`ats-score.html`)

**Section 1 — Score rings**

```
<div class="flex gap-8 justify-center py-6">
  [Left ring: overallScore]
  [Right ring: predictedScoreAfterFixes]
</div>
```

Each ring is an inline SVG (`viewBox="0 0 100 100"`, width/height set via Tailwind `w-32 h-32`):
- Background circle: grey stroke, full circumference
- Foreground circle: coloured stroke, `stroke-dasharray="251.2"`, `stroke-dashoffset` bound to computed offset, `transform="rotate(-90 50 50)"` to start from top
- Centred `<text>` element showing the score number
- `aria-label` attribute on the `<svg>` element (e.g. "Current ATS Score: 47 out of 100")

Below rings: `topPriority` callout `div` with amber background (`bg-amber-50 border-l-4 border-amber-400`), warning icon, bold "Top Priority:" label.

**Section 2 — Summary**

`<p>` block with `summary` text, muted colour, top margin.

**Section 3 — Issues**

`@if (issuesBySeverity().length > 0)` wraps entire section.

`@for (group of issuesBySeverity(); track group.severity)`:

Group header: `<button>` (for keyboard accessibility) with `aria-expanded` bound to `!isGroupCollapsed(group.severity)`, showing severity label + count badge + chevron icon that rotates when collapsed.

`@if (!isGroupCollapsed(group.severity))`:

`@for (issue of group.issues; track issue.id)`:

Issue card: `<button>` (full-width, `aria-expanded` bound to `isIssueExpanded(issue.id)`) clicking calls `toggleIssue(issue.id)`.

Collapsed content:
- Severity badge: `<span>` with colour-coded background (critical=`bg-red-100 text-red-700`, high=`bg-orange-100 text-orange-700`, medium=`bg-amber-100 text-amber-700`, low=`bg-slate-100 text-slate-600`)
- Category label: small muted `<span>`
- Title: `<p class="font-semibold">`
- Fix preview: `<p class="line-clamp-2 text-sm text-surface-600">`
- Chevron icon right-aligned, rotates on expand

Expanded content (inside `@if (isIssueExpanded(issue.id))`):
- `@if (issue.quotedText)` → `<blockquote class="italic border-l-4 pl-3 text-sm">`
- Location: `<span><i class="pi pi-map-marker"></i> {{ issue.location }}</span>`
- Why it matters: `<p><i class="pi pi-info-circle"></i> {{ issue.whyItMatters }}</p>`
- Impact: `"Impact: {{ issue.estimatedImpact }} / 10"` with a thin progress bar (`<div>` with percentage width)

**Section 4 — Strengths**

`@if (data().strengths.length > 0)` wraps entire section.

`@for (strength of data().strengths; track strength.title)`:
- `<i class="pi pi-check-circle text-green-600"></i>`
- `<span class="font-semibold">{{ strength.title }}</span>`
- `<p class="text-sm text-surface-500">{{ strength.detail }}</p>`

#### 3c. Unit tests (`ats-score.spec.ts`)

- Renders all four sections when given full valid `ResumeAutopsyResult`
- Does not render Issues section when `issues` is empty
- Does not render Strengths section when `strengths` is empty
- `scoreColor()` returns correct class for score 30 (red), 60 (amber), 80 (green)
- `strokeDashoffset()` returns 0 for score 100, ~251 for score 0, ~125 for score 50
- `toggleIssue()` adds id to set; calling again removes it
- `toggleGroup()` adds severity to collapsed set; calling again removes it
- `quotedText` blockquote is not rendered when `quotedText` is empty string

---

### Step 4 — Update `CvOptimization` component

File: `cv-optimization.ts`

- Import `ResumeAutopsyResult` from `@opticv/datatypes`
- Add module-level type guard function `isResumeAutopsyResult(value: unknown): value is ResumeAutopsyResult`
- Add `computed()` signal:
  ```
  readonly autopsyResult = computed<ResumeAutopsyResult | null>(() => {
    const r = this.results().get(PromptType.RESUME_AUTOPSY)?.result;
    return isResumeAutopsyResult(r) ? r : null;
  });
  ```
- Add to `imports` array: `OptimizationResultPanel`, `AtsScore`
- Remove `JsonPipe` from imports (no longer needed in the ATS panel; check if still used elsewhere — if not, remove entirely)

File: `cv-optimization.html`

Replace the content inside the ATS Analysis `<p-accordion-content>` block (lines 34–42 of the current template):

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(PromptType.RESUME_AUTOPSY) ?? false"
  [error]="results().get(PromptType.RESUME_AUTOPSY)?.error ?? null"
  [hasData]="autopsyResult() !== null"
>
  @if (autopsyResult(); as result) {
    <app-ats-score [data]="result" />
  }
</app-optimization-result-panel>
```

No other accordion panels are changed.

---

### Step 5 — Verification

Run in order:

```
npm exec nx build datatypes
npm exec nx typecheck opticv-web
npm exec nx lint opticv-web
npm exec nx test opticv-web
npm exec nx build opticv-web
```

All must pass with zero errors.

---

## Acceptance Checklist

- [ ] `ResumeAutopsyResult`, `ResumeAutopsyIssue`, `ResumeAutopsyStrength` exported from `@opticv/datatypes`
- [ ] `OptimizationResultPanelComponent` renders loading / error / empty / data states correctly
- [ ] `AtsScoreComponent` renders score rings, summary, issues, strengths
- [ ] Score rings use SVG with correct `stroke-dashoffset` computation
- [ ] Ring colour coding: 0–49 red, 50–74 amber, 75–100 green
- [ ] `topPriority` callout visible below rings
- [ ] Issues grouped critical → high → medium → low
- [ ] Severity groups expandable/collapsible via button
- [ ] Individual issue cards expand/collapse on click, showing full detail when expanded
- [ ] `quotedText` blockquote hidden when value is empty string
- [ ] Issues section hidden entirely when `issues` is empty
- [ ] Strengths section hidden entirely when `strengths` is empty
- [ ] No `$any()` in any template
- [ ] No `any` TypeScript type used
- [ ] All SVG rings have `aria-label`
- [ ] All expand/collapse controls are `<button>` elements with `aria-expanded`
- [ ] All builds, typechecks, lints, and tests pass
