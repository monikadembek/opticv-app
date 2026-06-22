# Score Updating — Research & Implementation Plan

> Research/planning document for making the ATS score and keyword match score on the
> CV optimization page update as the user applies suggestions to the optimized CV.
> Captures the discussion, decisions, and the agreed implementation plan.

---

## Original request

> Currently in cv-optimization page when user runs optimization process we display ATS
> score and keyword score. When user applies suggestions to the optimized CV it would be
> good if those scores updated. How could this be done? (research / planning stage)

---

## Research findings

### How the page works today

- **Page:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` + `.html`
- **State:** Angular **Signals** only (no NgRx). Optimization results land in a
  `results = signal<Map<PromptType, SseJobCompleteEvent>>` via SSE streaming.
- **Derived score signals (already exist):**
  - `autopsyResult()` → `ResumeAutopsyResult` (from `RESUME_AUTOPSY` prompt)
  - `keywordGapResult()` → `KeywordGapResult` (from `KEYWORD_GAP` prompt)
  - `atsScore()` = `autopsyResult()?.overallScore`
  - `keywordScore()` = `keywordGapResult()?.matchScore`
- **Applying suggestions:** `mergedCv = computed(() => applySelectionsToCV(...))`
  (`utils/apply-selections.ts`) reactively rebuilds the optimized CV from selection
  signals (`selections`, `keywordEdits`, `keywordBulletPositions`, `bulletEdits`,
  `removedBullets`, `selectedMissingBullets`, ...). **The CV preview already updates;
  the scores do not.**

### Score components are pure & reactive (key enabler)

- `AtsScore` (`components/ats-score/`): `data = input.required<ResumeAutopsyResult>()`;
  renders **two rings** from a literal array — "Current ATS Score" (`overallScore`) and
  "After Fixes" (`predictedScoreAfterFixes`). Rings/colors derived via `computed`.
- `KeywordGap` (`components/keyword-gap/`): `result = input.required<KeywordGapResult>()`;
  renders **one ring** + "Required X/Y • Preferred X/Y" caption, all derived from `result()`.
- **Because both derive everything from their input, feeding an updated result object in
  makes the rings move automatically — no ring-drawing changes needed.**

### Where scores come from (backend)

- Backend = NestJS (`apps/opticv-be`). Scores are produced by **LLM calls** (OpenAI
  `gpt-4o-mini`), returned as `structuredOutput` of each optimization result. There is
  **no deterministic server-side scoring** and **no standalone re-score endpoint**
  (only re-running a single prompt via `POST .../run/:promptType`, which is an AI call).

### Relevant data shapes (`packages/shared/datatypes/src/lib/datatypes.ts`)

```ts
KeywordGapResult {
  matchScore: number;
  matchScoreBreakdown: { requiredMatched, requiredTotal, preferredMatched, preferredTotal };
  matchedKeywords: [...]; missingKeywords: [{ keyword, isRequired, importance, suggestedPlacement, ... }];
  ...
}
ResumeAutopsyResult {
  overallScore: number; predictedScoreAfterFixes: number;
  issues: [{ id, category, severity, estimatedImpact }]; ...
}
UserSelections { selectedSummaryAngle, customSummaryText, selectedBullets[], selectedKeywords[] }
```

---

## Trade-off analysis (the two scores are NOT equally derivable)

### Keyword score — fully deterministic, near-exact
`matchScoreBreakdown` (matched/total for required & preferred) plus each missing keyword's
`isRequired` flag means applying a missing keyword moves it from "missing" → "matched",
and the score can be recomputed exactly the way the backend framed it. Only unknown is the
exact required-vs-preferred **weighting**; it can be back-solved from the original score +
breakdown. Low risk, directionally and numerically trustworthy.

### ATS score — only a projection, not a real re-score
`overallScore` is a holistic LLM judgment with **no breakdown**. The only local signals are
per-issue `estimatedImpact` and `predictedScoreAfterFixes`. There's also **no field linking a
selection to a specific issue**, so any mapping is heuristic. Result: an upper-bound,
optimistic **estimate** — must be labeled as such, not presented as a recomputed truth.

---

## Decisions (agreed with user)

1. **Computation:** Local estimate (no backend / no AI calls).
   - Keyword score → **deterministic & near-exact**.
   - ATS score → **directional projection, explicitly labeled an estimate**.
2. **Display:**
   - Keyword score → **Option A: update the single ring in place** (confident, accurate).
   - ATS score → **Option B: show projected value alongside the original**, folded into the
     existing "After Fixes" ring, labeled as an estimate; never overwrite the real "Current" ring.

---

## Implementation plan

This is a **frontend-only** change. No backend, no new endpoints, no persistence change.
Everything derives client-side from data already in component state, so it updates instantly
as the user toggles selections (same reactivity that already drives `mergedCv`).

### 1. New util: `apps/opticv-web/.../utils/recompute-scores.ts`

`recomputeKeywordGapResult(original: KeywordGapResult, selectedKeywords: string[]): KeywordGapResult`
- `structuredClone` the original.
- For each selected keyword found in `missingKeywords`, increment `requiredMatched` (if
  `isRequired`) else `preferredMatched`, clamped to the corresponding `*Total`.
- Re-derive `matchScore` by **back-solving the weight `w`** that reproduces the original
  `matchScore` from the original breakdown; reuse it. Fallback to required-weighted default
  (~0.7/0.3) if no stable `w` / zero totals. Round; **never below the original score**.
- Keyword list arrays can stay as-is (only score + breakdown numbers drive the UI);
  optionally move applied entries missing→matched for list consistency.

`recomputeAtsProjection(original: ResumeAutopsyResult, mergedCv, selections, ...): number`
- Returns a **projected integer**, not a mutated result.
- Start at `overallScore`; add `estimatedImpact` for issues heuristically "addressed":
  - `category === 'keywords'` → credited proportionally to fraction of missing keywords applied.
  - `category === 'content'` → credited to fraction of bullet rewrites accepted / missing bullets added.
  - summary credit when a summary variant is selected.
  - parsing/formatting/structure/length/contact → **not** auto-credited.
- Clamp to `[overallScore, predictedScoreAfterFixes]`. Document the heuristic in comments.

Keep both functions **pure & unit-testable**, mirroring `applySelectionsToCV` style.

### 2. `cv-optimization.ts` — new computeds (near existing `atsScore`/`keywordScore`)

- `recomputedKeywordGapResult = computed(() => recomputeKeywordGapResult(keywordGapResult(), selections().selectedKeywords))` (null-guarded)
- `liveKeywordScore = computed(() => recomputedKeywordGapResult()?.matchScore ?? null)`
- `projectedAtsScore = computed(() => recomputeAtsProjection(autopsyResult(), mergedCv(), selections(), ...))` (null-guarded)

No new event handlers — existing `onKeywordToggled` / `onBulletToggled` / `onAngleSelected`
etc. already update the source signals.

### 3. Keyword display — Option A (in place)

- `cv-optimization.html`: `<app-keyword-gap [result]="recomputedKeywordGapResult()!" ...>`
- Sidebar: `[keywordScore]="liveKeywordScore()"`
- **No changes** to `keyword-gap.ts` / `keyword-gap.html` (ring already reads `result()`).

### 4. ATS display — Option B (projected, labeled estimate)

- `ats-score.ts`: add `projectedScore = input<number | null>(null)`.
- `ats-score.html`: when `projectedScore()` non-null, the **second ring** shows the projected
  value relabeled (e.g. "Projected (estimate)") + a caption/tooltip that it's an estimate of
  applied changes, not a re-score; when null, fall back to existing "After Fixes" behavior.
  First "Current ATS Score" ring stays the untouched real value.
- `cv-optimization.html`: `<app-ats-score [data]="autopsyResult()!" [projectedScore]="projectedAtsScore()" />`
- Sidebar ATS mini-ring keeps the **real** `atsScore()` (don't surface the estimate in the
  compact sidebar).

### Critical files

| File | Change |
|------|--------|
| `apps/opticv-web/.../utils/recompute-scores.ts` | **New** — `recomputeKeywordGapResult`, `recomputeAtsProjection` |
| `apps/opticv-web/.../cv-optimization.ts` | Add `recomputedKeywordGapResult`, `liveKeywordScore`, `projectedAtsScore` |
| `apps/opticv-web/.../cv-optimization.html` | Rebind keyword `[result]`; add `[projectedScore]`; sidebar `[keywordScore]` |
| `apps/opticv-web/.../components/ats-score/ats-score.ts` | Add `projectedScore` input |
| `apps/opticv-web/.../components/ats-score/ats-score.html` | Second ring → projected value + "estimate" label when present |
| `apps/opticv-web/.../utils/recompute-scores.spec.ts` | **New** — unit tests |

`keyword-gap.*` and `optim-sidebar` need no internal changes.

### Notes / invariants

- **No persistence change** — scores are derived; nothing new saved. Stored-mode reload
  restores selections, computeds re-derive scores automatically.
- Keyword score **never decreases** from applying keywords; ATS projection clamped to
  `[overallScore, predictedScoreAfterFixes]`.
- Follow `/docs/angular-best-practices.md`; OnPush + signals; no `standalone: true`
  (default in Angular 21).

---

## Verification

1. **Unit tests:** `npm exec nx test opticv-web` — cover keyword recompute (required vs
   preferred raises by expected amount; back-solved weight reproduces original at zero
   selections; never decreases; clamps at totals) and ATS projection (no selections =
   `overallScore`; rises toward but never past `predictedScoreAfterFixes`).
2. **Typecheck/lint:** `npm exec nx typecheck opticv-web`, `npm exec nx lint opticv-web`.
3. **Manual:** `npm run start-be:dev` + `npm exec nx serve opticv-web`; run an optimization, then:
   - Toggle missing keywords → keyword ring + caption + sidebar keyword score move in place.
   - Accept bullet rewrites / pick summary variant / apply keywords → ATS "projected" ring
     rises (labeled estimate) while "Current ATS Score" stays put; sidebar ATS stays real.
   - Clear all selections → both scores return exactly to originals.
