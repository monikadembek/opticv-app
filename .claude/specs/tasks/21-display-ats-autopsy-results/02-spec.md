# Task Specification

## Source

Azure DevOps Task: 21 — Display ATS Autopsy results

## Goal

Replace the raw JSON `<pre>` dump in the "ATS Analysis" accordion panel with a polished, user-friendly `AtsScoreComponent` that renders all fields from the `RESUME_AUTOPSY` structured output. Also introduce a shared result-panel wrapper pattern (skeleton + error + empty states) that other prompt-type panels can adopt in future tasks.

## Context

The feature lives at route `/cv-optimization` (`CvOptimization` component, `apps/opticv-web/src/app/features/cv-optimization/`). When the user submits a CV and job description, optimization jobs stream back results via SSE. Results are stored in a `signal<Map<PromptType, SseJobCompleteEvent>>`. The RESUME_AUTOPSY entry carries a `result: unknown` field that contains a structured JSON object matching a well-defined schema.

Currently the panel displays:
```html
<pre class="whitespace-pre-wrap text-sm">{{ r.result | json }}</pre>
```

This task replaces that with a purpose-built display component.

## Scope

### In scope

- Define `ResumeAutopsyResult` type (and its sub-types) in `@opticv/datatypes`
- Create `AtsScoreComponent` at `features/cv-optimization/components/ats-score/`
- Wire the new component into the ATS Analysis accordion panel in `cv-optimization.html`
- Introduce a shared `OptimizationResultPanelComponent` (loading / error / empty states wrapper) that the ATS panel — and future panels — can use
- Unit tests for `AtsScoreComponent` and `OptimizationResultPanelComponent`

### Out of scope

- Replacing the raw JSON display in other panels (KEYWORD_GAP, SUMMARY_REWRITE, etc.) — those stay as-is
- Backend changes
- Persisting or editing autopsy results
- Filtering or sorting the issues list

---

## Data / API

### New shared type — `@opticv/datatypes`

Add to `packages/shared/datatypes/src/lib/datatypes.ts`:

```typescript
export interface ResumeAutopsyIssue {
  id: string;
  category: 'parsing' | 'keywords' | 'structure' | 'content' | 'formatting' | 'length' | 'contact';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  quotedText: string;
  location: string;
  whyItMatters: string;
  fix: string;
  estimatedImpact: number; // 1–10
}

export interface ResumeAutopsyStrength {
  title: string;
  detail: string;
}

export interface ResumeAutopsyResult {
  overallScore: number;           // 0–100
  predictedScoreAfterFixes: number; // 0–100
  topPriority: string;
  issues: ResumeAutopsyIssue[];
  strengths: ResumeAutopsyStrength[];
  summary: string;
}
```

No DB or API changes needed — the backend already produces this shape in `structuredOutput`.

### Data access in the component

`cv-optimization.ts` already stores `results().get(PromptType.RESUME_AUTOPSY)?.result`. Cast it to `ResumeAutopsyResult` inside `AtsScoreComponent` after runtime validation / type guard.

---

## Behavior

### `OptimizationResultPanelComponent` (shared wrapper)

A thin generic wrapper that handles the three non-result states, so each accordion panel doesn't repeat the logic:

| Input | Rendered output |
|---|---|
| `loading = true` | Skeleton placeholder (animated pulse, height matches expected content) |
| `error` string present | Red error message with icon |
| no data yet | "Run optimization to see results" placeholder |
| default slot (data present) | Renders `ng-content` |

Inputs:
- `loading: InputSignal<boolean>`
- `error: InputSignal<string \| null>`
- `hasData: InputSignal<boolean>`

### `AtsScoreComponent`

Receives the full `ResumeAutopsyResult` as an input and renders the following sections in order:

#### 1. Score header (always visible)

Two circular gauge rings side-by-side:

- **Left ring:** "Current ATS Score" — `overallScore`
- **Right ring:** "After Fixes" — `predictedScoreAfterFixes`

Ring colour coding by score:
- 0–49 → red (`text-red-500` / stroke red)
- 50–74 → amber (`text-amber-500` / stroke amber)
- 75–100 → green (`text-green-500` / stroke green)

Each ring: SVG circle with `stroke-dasharray` / `stroke-dashoffset` approach, score number centred inside, label below.

Below the rings: `topPriority` displayed as a highlighted callout box (e.g. amber background, icon, bold label "Top Priority:").

#### 2. Summary

A short prose block rendering `summary` text.

#### 3. Issues list

Grouped by `severity` in order: critical → high → medium → low. Each group has a collapsible header showing the severity label and count.

Each issue renders as a card with two states:

**Collapsed (default):**
- Severity badge (colour-coded pill: critical=red, high=orange, medium=amber, low=slate)
- Category label (small muted text)
- `title` (bold)
- `fix` (truncated to 2 lines with ellipsis)
- Chevron expand icon (right-aligned)

**Expanded (on click):**
- All of the above, plus:
- `quotedText` — rendered in a `<blockquote>` with italic style
- `location` — with a pin icon
- `whyItMatters` — with an info icon
- `estimatedImpact` — rendered as "Impact: X / 10" with a small bar

Toggle expand/collapse on card click. Only one card expanded at a time per severity group is **not** required — allow multiple open simultaneously.

#### 4. Strengths list

Simple list of `strengths`. Each item: checkmark icon + `title` (bold) + `detail` (muted text below).

### Integration in `cv-optimization.html`

Replace the `<pre>` block inside the RESUME_AUTOPSY accordion panel:

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(PromptType.RESUME_AUTOPSY) ?? false"
  [error]="results().get(PromptType.RESUME_AUTOPSY)?.error ?? null"
  [hasData]="!!results().get(PromptType.RESUME_AUTOPSY)?.result"
>
  @if (results().get(PromptType.RESUME_AUTOPSY)?.result; as result) {
    <app-ats-score [data]="$any(result)" />
  }
</app-optimization-result-panel>
```

Add both new components to the `imports` array of `CvOptimization`.

---

## Edge Cases

- `issues` array is empty → hide the Issues section entirely (do not render empty group headers)
- `strengths` array is empty → hide the Strengths section entirely
- `overallScore` or `predictedScoreAfterFixes` is `0` → ring renders empty (full grey stroke), not broken
- `result` arrives as `null` or malformed JSON → `OptimizationResultPanelComponent` `hasData=false` path handles it; `AtsScoreComponent` should never receive an invalid object (guard at integration point)
- Long `fix` or `whyItMatters` text → truncated in collapsed state, full text visible when expanded
- SSE `status === 'failed'` → `error` field is populated, `OptimizationResultPanelComponent` shows error state

---

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes (no type errors)
- `npm exec nx test opticv-web` passes (new unit tests included)
- `npm exec nx typecheck opticv-web` passes
- `npm exec nx build datatypes` passes (new types compile)
- `ResumeAutopsyResult` and sub-types are exported from `@opticv/datatypes`
- `AtsScoreComponent` renders all four sections when given valid data
- `OptimizationResultPanelComponent` correctly renders loading / error / empty / data states
- Score rings visually reflect correct colour coding for low / medium / high score values
- Issues are grouped by severity in correct order (critical first)
- Individual issue cards expand/collapse on click
- Component passes AXE accessibility checks (WCAG AA): ring SVGs have `aria-label`, severity badges have sufficient contrast, expand/collapse cards use `<button>` with `aria-expanded`
- No `any` usage (use `ResumeAutopsyResult` cast via type guard)
- No raw JSON `<pre>` remains in the ATS Analysis panel
