# Implementation Plan

Source spec: `02-spec.md` · Spec review: `03-spec-review.md` (PASS WITH ISSUES — quota-vs-free conflict confirmed resolved by user: retries stay free, spec unchanged)

## Overview

Two independent surfaces to change, in this order: backend `retryFailedJob` (make it accept a missing row), then frontend status/model plumbing, then frontend markup. Backend and frontend can technically be built in parallel, but the frontend's Retry button relies on the backend no longer 400-ing for a missing row, so backend goes first for testability.

---

## Step 1 — Backend: `OptimizationService.retryFailedJob`

**File:** `apps/opticv-be/src/app/optimization/optimization.service.ts` (lines 209–263)

1. Replace the guard:
   ```ts
   if (!existing || existing.status !== 'FAILED') {
     throw new BadRequestException(...)
   }
   ```
   with a three-way branch:
   - `existing === null` → create path (new).
   - `existing.status === 'FAILED'` → existing update/reset path (unchanged).
   - anything else → keep the existing `BadRequestException` throw (unchanged message is fine, or adjust wording to cover both "not found" and "not failed" — keep minimal).
2. Create path: call `this.prisma.optimizationResult.create()` with:
   - `applicationId: jobApplicationId`
   - `promptType`
   - `status: 'PENDING'`
   - `structuredOutput: Prisma.DbNull`
   - `textOutput: null`
   - `errorMessage: null`
   - `promptVersionId: null`
   - `inputTokens: null`
   - `outputTokens: null`
   (Same field set as the existing `update()` call at lines 234–245, minus the `where`, plus the two required identity fields `applicationId`/`promptType`.)
3. After either branch (create or update), keep the rest of the method unchanged: generate `runId`, call `this.queue.add('optimize', {...} satisfies OptimizationJobPayload, { attempts: 2, backoff: {...} })`, return `{ runId }`.
4. No quota check is added anywhere in this method (confirmed: stays free for both branches).
5. Do not touch `triggerSingleJob` or `checkAndConsume` — out of scope.

## Step 2 — Backend tests

**File:** `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` (`describe('retryFailedJob', ...)`, starting line 435)

Add/update test cases:
1. **New:** no existing `OptimizationResult` row (`findUnique` mock resolves `null`) → `create()` is called with the expected field set, `queue.add` is called, method resolves `{ runId }`. Assert `quotaService` is never invoked.
2. **Unchanged:** existing row with `status: 'FAILED'` → still resets via `update()` and enqueues (keep current test as-is; verify it still passes with the new branching).
3. **Unchanged/extend:** existing row with any other status (`PENDING`, `PROCESSING`, `COMPLETED`) → still throws `BadRequestException` (keep current test; add cases for `PENDING`/`PROCESSING` if not already covered, since the review flagged this branch should stay guarded).

## Step 3 — Frontend: `SectionStatus` type

**File:** `apps/opticv-web/src/app/features/cv-optimization/models.ts`

Add `'not-started'` to the union:
```ts
export type SectionStatus =
  | 'completed'
  | 'processing'
  | 'error'
  | 'not-started'
  | 'pending'
  | undefined;
```

## Step 4 — Frontend: status derivation

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

1. `sectionStatus(type)` (lines 647–656): change
   ```ts
   if (!r) return undefined;
   ```
   to
   ```ts
   if (!r) return 'not-started';
   ```
   Leave the rest of the method (`processing`, `completed`/`error`/`pending` mapping) unchanged.
2. `retryablePromptTypes` (lines 407–433): extend the loop condition to also add `promptType` to the retryable set when there is no entry in `results()` for it (and it isn't currently processing — already guarded by the existing `if (this.isProcessing().get(promptType)) continue;` at the top of the loop). Concretely, add a branch alongside the existing `status === 'failed' || (status === 'completed' && computedResult === null)` check: `status === undefined` (i.e. `results().get(promptType)` is `undefined`) also qualifies.
3. `hasPartialStoredResults` (lines 435–438) and `retryOptimization()` (lines 885–918): no changes — both already operate on `results().has(p)` / call the same `retryFailedJob` API method regardless of prior status.

## Step 5 — Frontend: `SectionCard` badge

**Files:** `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html`, `.css`

1. In `section-card.html`, add a new `@if (status() === 'not-started')` block alongside the existing `completed`/`processing`/`error` blocks (around line 58–60), rendering a badge in the same visual family, e.g.:
   ```html
   @if (status() === 'not-started') {
   <span class="status-not-started">
     <i class="pi pi-circle"></i>Not started
   </span>
   }
   ```
2. In `section-card.css`, add a `.status-not-started` rule following the same shape as `.status-error`/`.status-processing` (flex, gap 6px, `font-size: var(--text-sm)`, `text-transform: uppercase`), using a neutral color token (e.g. `var(--text-muted)` or equivalent existing neutral token — check `apps/opticv-web/src/styles` or existing token usage for the correct neutral variable name before introducing a new one; do not invent a new CSS variable).
3. Body rendering (`section-card.html` lines 81–85): currently `@if (status() === 'processing') { placeholder } @else if (status() !== 'pending') { <ng-content /> }`. Since `'not-started'` now flows through the `@else if` branch, `<ng-content />` will render for it — meaning the empty-state message must be projected from the parent template (`cv-optimization.html`) as content, not added inside `SectionCard` itself. Confirm no change needed inside `SectionCard`'s body-rendering logic (the existing `!== 'pending'` condition already allows `'not-started'` through) — only the badge needs adding here.

## Step 6 — Frontend: per-section empty-state + Retry markup

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

For each of the 7 `PromptType` sections (existing retry blocks e.g. lines 157–169 for `RESUME_AUTOPSY`, and the equivalent blocks for `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE`, `COVER_LETTER`, `INTERVIEW_PREP`, `LINKEDIN_REWRITE`):

1. Add an empty-state block that renders when `sectionStatus(PromptType.X) === 'not-started'`, e.g.:
   ```html
   @if (sectionStatus(PromptType.RESUME_AUTOPSY) === 'not-started') {
   <p class="section-empty-state">This section hasn't been processed yet.</p>
   }
   ```
   Place it before the existing `retryablePromptTypes().has(...)` retry-button block, inside the same `<app-section-card>` content projection, so both render together for a not-started section.
2. The existing Retry button block (`@if (retryablePromptTypes().has(PromptType.X))`) requires no changes — it already fires once `retryablePromptTypes` includes the prompt type per Step 4.2, and `retryOptimization(PromptType.X)` is already the correct handler for both `'error'` and `'not-started'` cases.
3. Add a shared `.section-empty-state` CSS rule (in the page's own stylesheet, `cv-optimization.css` if one exists, or co-located per existing per-block styling convention — check current styling location for the retry-action blocks before adding a new one) using existing neutral text tokens, no new colors.
4. Repeat the same two-part block (empty-state paragraph + existing retry button) for all 7 sections. Do not change the 7 sections' existing structure otherwise.

## Step 7 — Frontend tests

1. **`cv-optimization.spec.ts`:**
   - `sectionStatus()` returns `'not-started'` when `results()` has no entry for a prompt type and `isProcessing()` is falsy for it.
   - `retryablePromptTypes` includes a prompt type absent from `results()`.
2. **`section-card.spec.ts`:**
   - Renders the "Not started" badge when `status` input is `'not-started'`.
   - Confirms `<ng-content />` still projects normally for `'not-started'` (i.e. body is not suppressed the way `'pending'` is).

## Step 8 — Manual verification (per spec Acceptance)

1. Start backend + frontend dev servers.
2. On a stored job application, delete (or don't create) the `OptimizationResult` row for one `PromptType` directly in the DB (via Prisma Studio) to simulate "never triggered."
3. Reload the optimization results page — confirm the affected section shows the "Not started" badge, empty-state text, and an enabled Retry button (assuming not currently processing elsewhere).
4. Click Retry — confirm the SSE stream completes, the section populates with real results, and the badge updates to "Completed."
5. Check `/usage` (or the quota status endpoint) before and after — confirm the count for that feature is unchanged (retry stays free).
6. Confirm existing `FAILED`-retry flow still works unchanged (regression check).
7. Run AXE / manual keyboard check on the new badge and empty-state markup for contrast and focus order (no new interactive elements besides the existing Retry button pattern).

## Step 9 — Verification commands

```bash
npm exec nx test opticv-be
npm exec nx test opticv-web
npm exec nx lint opticv-be
npm exec nx lint opticv-web
npm exec nx typecheck opticv-be
npm exec nx typecheck opticv-web
npm exec nx build opticv-be
npm exec nx build opticv-web
```

---

## Files Touched Summary

**Backend**
- `apps/opticv-be/src/app/optimization/optimization.service.ts` (modified)
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` (modified)

**Frontend**
- `apps/opticv-web/src/app/features/cv-optimization/models.ts` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.css` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.spec.ts` (modified)
- Page-level stylesheet housing `.section-empty-state` (existing file, e.g. `cv-optimization.css` if present — modified; no new file unless none exists)

No new files, no DB schema changes, no changes to shared `@opticv/datatypes`.
