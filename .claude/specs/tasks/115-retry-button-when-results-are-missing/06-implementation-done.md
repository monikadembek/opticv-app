## Summary

Implemented the ability to retry an optimization section whose `OptimizationResult` row was never created (no result, never triggered), in addition to the existing `FAILED`-retry path. Backend `retryFailedJob` now branches on whether an existing row is present: creates a new `PENDING` row and enqueues when absent, resets and re-enqueues when `FAILED`, and still throws `BadRequestException` for any other existing status. Frontend adds a `'not-started'` `SectionStatus` value, derives it in `sectionStatus()` for prompt types with no `results()` entry, includes such prompt types in `retryablePromptTypes`, and renders a "Not started" badge plus an empty-state message and Retry button for all 7 `PromptType` sections. Backend and frontend unit tests were added/extended to cover the new branches and status derivation.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Backend: `retryFailedJob` accepts missing row — creates `PENDING` row, enqueues, no quota check | Implemented | `optimization.service.ts:209-279` |
| Backend: existing `FAILED` row — reset to `PENDING` and re-enqueue (unchanged) | Implemented | same method, `existing.status === 'FAILED'` branch |
| Backend: existing row with any other status (`PENDING`/`PROCESSING`/`COMPLETED`) — throw `BadRequestException` | Implemented | |
| Backend: no quota check/consumption added for either branch | Implemented | `quotaService.checkAndConsume` not called in `retryFailedJob` |
| Frontend: `SectionStatus` extended with `'not-started'` | Implemented | `models.ts:1-7` |
| Frontend: `sectionStatus()` returns `'not-started'` when no `results()` entry and not processing | Implemented | `cv-optimization.ts:648-657` |
| Frontend: `retryablePromptTypes` includes not-started sections | Implemented | `cv-optimization.ts:407-434` |
| Frontend: `'Not started'` badge in `SectionCard` header | Implemented | `section-card.html:60-64`, `section-card.css:112-122` |
| Frontend: empty-state message in section body for `'not-started'` | Implemented | `cv-optimization.html`, one block per section |
| Frontend: Retry button shown for `'not-started'` sections, disabled while processing | Implemented | existing `retryablePromptTypes()` / `retryOptimization()` reused |
| Applies uniformly to all 7 `PromptType` sections | Implemented | ATS Analysis, Keywords, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Updates |
| Out of scope: no page-level "Retry all missing" action | Implemented (as out of scope) | not added |
| Out of scope: no quota consumption changes | Implemented (as out of scope) | unchanged |
| Out of scope: no changes to `triggerSingleJob` / `run/:promptType` | Implemented (as out of scope) | unchanged |
| Out of scope: no change to malformed-`COMPLETED` retry handling | Implemented (as out of scope) | unchanged |
| Accessibility: per-section Retry button `ariaLabel` | Implemented | e.g. `ariaLabel="Retry ATS Analysis"`, one per section |
| Tests: backend `retryFailedJob` — missing row, `FAILED` row, other-status row | Implemented | `optimization.service.spec.ts:436-569` |
| Tests: frontend `sectionStatus()` and `retryablePromptTypes` for not-started | Implemented | `cv-optimization.spec.ts:823-1029` |
| Tests: `SectionCard` not-started badge and content projection | Implemented | `section-card.spec.ts:64-77` |

## Files

**Modified**

- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/models.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css`
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.css`
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.spec.ts`

**Created**

- None (task modified existing files only)

## Components

| Component | Status |
| --- | --- |
| `SectionCard` (`components/section-card/section-card.ts` / `.html` / `.css`) | Exist |
| `CvOptimization` page (`cv-optimization.ts` / `.html` / `.css`) | Exist |

## Stores

Not applicable — this task did not introduce or modify any NgRx Signals store.

## Deviations

- Implementation Plan Step 5.2 specified a neutral color token (e.g. `var(--text-muted)`) for `.status-not-started`; the implemented CSS uses `var(--warning)` / `var(--color-amber-50)`, the same colors used by `.status-processing`.
- Implementation Plan Step 5.2 scoped the CSS addition to a new `.status-not-started` rule; the actual diff also modifies the existing `.status-processing` and `.status-error` rules (adds `border-radius`, `background`, `padding` to both).
- Implementation Plan Step 6.3 called for a shared `.section-empty-state` CSS rule in the page stylesheet; the implemented empty-state markup uses inline Tailwind utility classes (`text-sm text-(--text-muted) m-0`) repeated per section instead of a shared class.

## Additional Implementation

None.
