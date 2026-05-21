# Task Specification

## Source

Azure DevOps Task: 24

## Goal

Create a `BulletRewriter` Angular component that displays the `BULLET_UPGRADE` AI analysis results with a modern, readable UI. Wire it into the existing `cv-optimization` accordion panel, replacing the current raw-JSON placeholder.

## Context

`apps/opticv-web/src/app/features/cv-optimization/` contains the main CV optimization page. Results from the AI backend arrive as SSE events and are stored in a `signal<Map<PromptType, SseJobCompleteEvent>>`. Each completed event carries a `result: unknown` payload whose shape matches the backend's JSON output schema. The `OptimizationResultPanel` wrapper handles loading / error / empty states; child components receive the already-typed result via `input.required<T>()`.

Reference implementation: `components/summary-rewrite/` (same pattern).

## Scope

### In scope

- Add `BulletUpgradeResult` and related sub-types to `packages/shared/datatypes/src/lib/datatypes.ts`
- Add `isBulletUpgradeResult` type guard in `cv-optimization.ts`
- Add `bulletUpgradeResult` computed signal in `cv-optimization.ts`
- Create `components/bullet-rewriter/` component (`bullet-rewriter.ts` + `bullet-rewriter.html`)
- Wire `<app-bullet-rewriter>` into the existing accordion panel in `cv-optimization.html`, replacing the `<pre>` JSON placeholder
- Display all three result sections: positions/bullets, missing bullet suggestions, verb diversity check

### Out of scope

- Copy-to-clipboard or "apply" actions for rewritten bullets
- Persisting user edits or accept/dismiss state to the backend
- Any backend changes

## Behavior

### Result type (`datatypes.ts`)

Add the following types (mirroring the backend output schema):

```
BulletAction = 'rewrite' | 'recommend_cut' | 'keep_as_is'

BulletItem = {
  originalText: string
  action: BulletAction
  weakness: string
  rewrittenText?: string        // present when action === 'rewrite'
  rewriteRationale?: string
  needsUserInput: boolean
  placeholdersToFill: string[]
  actionVerb: string
  keywordsIncorporated: string[]
  cutReason?: string            // present when action === 'recommend_cut'
}

BulletUpgradePosition = {
  company: string
  title: string
  dates?: string
  bullets: BulletItem[]
}

BulletMissingSuggestion = {
  forPosition: string
  suggestedBullet: string
  rationale: string
  questionToAskUser: string
}

BulletVerbDiversityCheck = {
  uniqueVerbsUsed: number
  totalBullets: number
  diverseEnough: boolean
}

BulletUpgradeResult = {
  positions: BulletUpgradePosition[]
  missingBulletSuggestions: BulletMissingSuggestion[]
  overallNotes: string
  verbDiversityCheck: BulletVerbDiversityCheck
}
```

### Type guard (`cv-optimization.ts`)

`isBulletUpgradeResult` checks:
- value is a non-null object
- `positions` is an array
- `verbDiversityCheck` is a non-null object

### Computed signal (`cv-optimization.ts`)

```
readonly bulletUpgradeResult = computed<BulletUpgradeResult | null>(() => {
  const r = this.results().get(PromptType.BULLET_UPGRADE)?.result;
  return isBulletUpgradeResult(r) ? r : null;
});
```

### Component (`bullet-rewriter`)

**Selector:** `app-bullet-rewriter`  
**Input:** `result = input.required<BulletUpgradeResult>()`  
**Change detection:** `OnPush`

#### Section 1 — Positions & Bullets

For each position in `result().positions`:

- Position header: `{title} at {company}` with optional `{dates}` on the right.
- List of bullets. Each bullet displays differently based on `action`:

  **`rewrite`**
  - Original text: muted/strikethrough label "Original", original bullet text in grey
  - Rewritten text: green-tinted card with label "Rewritten", `rewrittenText`
  - `weakness` shown in small italic text below original
  - `rewriteRationale` shown below rewritten text (if present)
  - `keywordsIncorporated` shown as small pills (if non-empty)
  - If `needsUserInput === true`, show an amber info note: "Placeholders to fill:" followed by `placeholdersToFill` as inline tags

  **`recommend_cut`**
  - Original text displayed with an amber/orange warning badge "Consider removing"
  - `cutReason` shown below in small text

  **`keep_as_is`**
  - Original text displayed in muted/greyed style with a subtle "Kept" badge
  - No additional detail required

#### Section 2 — Missing Bullet Suggestions

Shown only when `missingBulletSuggestions.length > 0`.

Section heading: "Missing Bullet Suggestions"

For each suggestion:
- `forPosition` as subheading
- `suggestedBullet` in a visually distinct card
- `rationale` in small italic text
- `questionToAskUser` as a callout/question prompt (e.g., light-blue info box)

#### Section 3 — Verb Diversity

Always shown at the bottom.

Display a small summary row:
- Unique verbs used / total bullets (e.g., "12 unique verbs across 15 bullets")
- A visual indicator: green checkmark if `diverseEnough === true`, amber warning if false
- Short contextual label: "Good verb variety" or "Consider diversifying your action verbs"

#### Section 4 — Overall Notes

If `overallNotes` is a non-empty string, display it as a styled note block above Section 2 (after the positions list).

### Wiring in `cv-optimization.html`

Replace the current `<pre>` JSON block inside the BULLET_UPGRADE accordion panel with:

```html
<app-optimization-result-panel
  [loading]="isProcessing().get(PromptType.BULLET_UPGRADE) ?? false"
  [error]="results().get(PromptType.BULLET_UPGRADE)?.error ?? null"  <!-- adjust to actual error field -->
  [hasData]="bulletUpgradeResult() !== null"
>
  @if (bulletUpgradeResult(); as result) {
    <app-bullet-rewriter [result]="result" />
  }
</app-optimization-result-panel>
```

Import `BulletRewriter` in `cv-optimization.ts` imports array.

## Edge Cases

- `positions` is empty: show "No bullet data available" message inside the component instead of rendering section 1.
- `missingBulletSuggestions` is empty: section 2 is hidden entirely.
- `placeholdersToFill` is empty: don't render the placeholder note even if `needsUserInput` is true.
- `rewrittenText` is undefined on a `rewrite` bullet: treat gracefully (skip rewritten card).
- `cutReason` is undefined on a `recommend_cut` bullet: render badge only, no detail text.
- `overallNotes` is an empty string: skip section 4.

## Data / API

No new API endpoints or DB changes. Data flows through the existing SSE mechanism already in place:

- `CvOptimizationApiService` emits `SseJobCompleteEvent` with `promptType: PromptType.BULLET_UPGRADE`
- `result` payload shape is validated by `isBulletUpgradeResult` before use

New shared types added to:
`packages/shared/datatypes/src/lib/datatypes.ts`

## Acceptance (DEV)

- `npm exec nx typecheck opticv-web` passes
- `npm exec nx typecheck datatypes` passes (if applicable)
- `npm exec nx build opticv-web` passes
- `BulletRewriter` component renders all three sections (positions, suggestions, verb diversity) from mock data
- `keep_as_is` bullets render muted/greyed
- `recommend_cut` bullets render with amber badge and cut reason
- `rewrite` bullets render both original and rewritten text with correct styling
- Missing suggestions section is hidden when array is empty
- Accordion panel no longer shows raw JSON
- No console errors
