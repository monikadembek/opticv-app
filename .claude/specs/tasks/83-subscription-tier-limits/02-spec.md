# Task Specification

## Source

Task 83: Implement subscription tier limits (raw task: `.claude/specs/tasks/83-subscription-tier-limits/00-raw-task.md`)
Prior planning discussion: `docs/subscription-tier-limits.md`

## Goal

Introduce enforced monthly usage limits and feature gating for three subscription tiers — **FREE**, **BASIC**, **PRO** — replacing the current unused `PRO_ANNUAL`/`SPRINT` tier values. Each tier caps: CV optimization runs, cover letter generations, interview prep generations, LinkedIn profile content generations (BASIC/PRO only), which CV templates are selectable, and how many CV files can be stored at once. Limits reset monthly. Enforcement happens on the backend at the point of action; the frontend reflects remaining usage and blocks/upsells where relevant.

## Context

- `packages/shared/datatypes/src/lib/datatypes.ts` — shared `SubscriptionTier`-adjacent types, `PromptType` enum (currently 7 values: `RESUME_AUTOPSY`, `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE`, `COVER_LETTER`, `INTERVIEW_PREP`, `LINKEDIN_REWRITE`).
- `apps/opticv-be/prisma/schema.prisma` — `SubscriptionTier` enum (`FREE | PRO | PRO_ANNUAL | SPRINT`), `Subscription` model (1:1 with `User`, `tier` defaults `FREE`, holds Stripe fields and `currentPeriodStart/End`, both currently null for all users).
- `apps/opticv-be/src/app/optimization/optimization.service.ts` — `triggerOptimization()` currently enqueues **all 7** `PromptType`s at once for a job application (bundled run). `triggerSingleJob()` enqueues one arbitrary `PromptType`. Both use BullMQ (`attempts: 2`, exponential backoff).
- `apps/opticv-be/src/app/optimization/optimization.processor.ts` — BullMQ worker; on terminal job failure (after retries exhausted) sets `OptimizationResult.status = 'FAILED'`, emits a `failed` event via `OptimizationEventBus`, and rethrows (BullMQ marks the job failed).
- `apps/opticv-be/src/app/cv/cv.service.ts` — `uploadCv()` creates `CvDocument` rows; no cap today.
- `apps/opticv-be/src/app/users/dto/user-profile.dto.ts` — Swagger enum list for tier, currently `['FREE', 'PRO', 'PRO_ANNUAL', 'SPRINT']`.
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/` — template selector; no tier gating today.
- `apps/opticv-web/.../features/settings/` — displays current tier badge; no usage/quota display today.
- No billing integration (Stripe) exists yet; all users are FREE with null `currentPeriodStart/End`.

## Scope

### In scope

- Change `SubscriptionTier` (shared datatypes + Prisma enum + Swagger DTO) to `FREE | BASIC | PRO`.
- Define tier limits as a single source of truth in `@opticv/datatypes`, consumed by both backend and frontend.
- Add a `UsageQuota` counter table (per user, per feature, per monthly period) and a `LimitedFeature` enum: `CV_OPTIMIZATION | COVER_LETTER | INTERVIEW_PREP | LINKEDIN`.
- **Decouple** `triggerOptimization` so it enqueues only the CV-subset prompt types (`RESUME_AUTOPSY, KEYWORD_GAP, SUMMARY_REWRITE, BULLET_UPGRADE`) and consumes one `CV_OPTIMIZATION` quota unit. Cover letter, interview prep, and LinkedIn are triggered independently via `triggerSingleJob`, each consuming its own feature's quota unit.
- Backend quota enforcement (check + consume) at:
  - CV optimization run trigger (4-job bundle, one quota unit)
  - Cover letter trigger (one quota unit)
  - Interview prep trigger (one quota unit)
  - LinkedIn content trigger (one quota unit; unavailable entirely on FREE)
  - CV file upload (cap on active stored CVs)
- Free retry of a terminally-failed job so a failed AI job doesn't permanently cost the user a unit: while an `OptimizationResult` row is in `FAILED` status, retrying that specific prompt type/feature does not go through the quota check again (no new consume, no auto re-trigger — user must manually initiate the retry). This applies uniformly whether the failed job was part of the 4-job CV optimization bundle or a standalone single-job feature (cover letter, interview prep, LinkedIn).
- Monthly reset window = calendar month (1st of month to now), applied uniformly to all users regardless of tier (no Stripe billing-period usage in this task).
- Backend usage-status endpoint returning per-feature used/limit/remaining/resetsAt plus stored-CV usage.
- Frontend: gate CV template selector by tier (FREE → `default` + `classic` only); display usage/remaining counts; surface clear errors when a quota or storage cap is hit or a feature is unavailable on the current tier.
- Update Swagger enum list and any other direct references to the old tier values (`PRO_ANNUAL`, `SPRINT`).
- Prisma migration for the enum change and the new `UsageQuota` table — **generated but run manually by the user**, not auto-applied by Claude.

### Out of scope

- Any Stripe/billing integration or real `currentPeriodStart/End` values.
- Migrating/backfilling existing user tiers (all current users are already `FREE`; no data migration needed for user rows).
- Auto re-triggering a failed job automatically after refund — user must manually retry.
- Admin/QA tooling to reset or bump a user's quota.
- Enforcing per-second/IP abuse throttling changes — existing `AiThrottlerGuard`/`ApiThrottlerGuard` remain untouched and orthogonal to monthly quotas.
- Any tier upgrade/downgrade UI or self-service plan change flow.

## Behavior

### Tier limits (monthly, per tier)

| Feature                     | FREE                   | BASIC | PRO |
| ---------------------------- | ----------------------- | ----- | --- |
| CV optimization runs         | 1                        | 10    | 30  |
| Cover letter generations      | 1                        | 10    | 30  |
| Interview prep generations    | 1                        | 10    | 30  |
| LinkedIn content generations  | 0 (not offered)          | 10    | 30  |
| CV templates selectable       | `default`, `classic` only | all   | all |
| Stored CV documents (active)  | 2                        | 10    | 20  |

### Quota check & consume flow

1. User triggers a feature action (CV optimization run, cover letter, interview prep, LinkedIn content).
2. Backend resolves the user's tier and the current period (1st of current calendar month → now).
3. Backend looks up the tier's limit for that feature:
   - If the limit is `0` (LinkedIn on FREE), reject immediately with a "feature not available on your plan" error — distinct from "quota exhausted".
   - Otherwise, read/upsert the `UsageQuota` row for `(userId, feature, periodStart)`.
   - If `count >= limit`, reject with a "quota exhausted, resets on `<date>`" error.
   - Otherwise, atomically increment `count` (guard against race/double-spend using a conditional update or transaction) and proceed to enqueue the job(s).
4. For a CV optimization run specifically: one quota increment covers the whole 4-job bundle (`RESUME_AUTOPSY`, `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE`), not one increment per prompt type.
5. **Free retry of failed jobs (no refund model — retry-in-place instead):** if a queued job fails terminally (BullMQ exhausts its 2 attempts), its `OptimizationResult.status` is `FAILED` and the quota unit already consumed for that trigger is **not** given back and **not** re-charged. Instead, as long as that specific `OptimizationResult` row (identified by `applicationId` + `promptType`, scoped to the run that consumed the quota) remains in `FAILED` status, the user can retry **that job specifically** via a dedicated retry action that re-enqueues it **without any quota check** — because it was already paid for by the original trigger.
   - This applies uniformly: a failed cover letter / interview prep / LinkedIn job (1-job features) is retryable for free the same way.
   - For the CV optimization bundle, this means each of the 4 jobs is independently retryable for free while `FAILED` — the user isn't forced to re-run all 4 to fix the 1 or 2 that failed, and doing so does not consume a second `CV_OPTIMIZATION` quota unit.
   - The free-retry entitlement is tied to the row's `FAILED` status, not to a time window: once a retry succeeds (`status` becomes `COMPLETED`), there is no more free retry for that job — a further re-run of an already-`COMPLETED` job is a fresh generation and consumes a new quota unit per the rule below.
   - This entirely replaces any "refund the quota unit" behavior — no decrement/refund logic is needed; the quota is consumed once at the original trigger and retries of `FAILED` rows simply bypass the check.
6. CV file upload: before creating a `CvDocument`, count the user's currently active (`isActive: true`) documents and compare to the tier's `maxStoredCvs`. Reject if at cap. Deleting/deactivating a CV frees a slot.
7. Re-running an existing **successfully completed** optimization/cover letter/interview prep/LinkedIn generation (overwriting prior results) consumes a fresh quota unit — it is treated as a new generation. This is distinct from retrying a `FAILED` result (free, see above).

### Frontend behavior

- CV template selector shows all templates; templates not included in the user's tier are rendered disabled/locked with an upgrade affordance. The default selected template never lands on a locked one for FREE users.
- A usage panel (near the settings tier badge and/or near feature trigger points) shows per-feature `used/limit` and reset date, sourced from the usage-status endpoint.
- When a trigger action is rejected due to quota exhaustion or tier-unavailability, the user sees a distinct, clear message per case (not a generic error), with an upgrade prompt where relevant.

## Edge Cases

- **LinkedIn on FREE**: always rejected as "not available on this tier," never as "quota exhausted" (limit is 0, not consumed-down-to-0).
- **Race conditions**: two concurrent trigger requests at the exact quota boundary — only one may succeed; enforced via atomic conditional increment, not read-then-write.
- **Partial bundle failure** (CV optimization run): some of the 4 CV-subset jobs succeed, others fail terminally → the failed ones become individually, freely retryable (no new quota consumed); the run's single quota unit stays spent regardless of how many of the 4 ultimately succeed.
- **Retry of a retry**: if a free retry of a `FAILED` job also fails terminally, the row is `FAILED` again and remains freely retryable — no limit on the number of free retries while status stays `FAILED`.
- **Distinguishing a free retry from a fresh generation**: the retry endpoint must validate that the specific `OptimizationResult` row is currently `FAILED` before bypassing the quota check; if the row is `COMPLETED` or doesn't exist, it must go through the normal trigger/quota path instead (prevents bypassing quota by calling "retry" on a successful or nonexistent result).
- **Downgrade over cap**: a user with more stored CVs than their (possibly lower) new tier allows is not forcibly pruned; they simply cannot upload new CVs until back under the cap. (No downgrade flow exists yet, but the check must hold regardless of how tier changed.)
- **Manual tier change during an in-progress period**: if a user's tier is changed mid-month (e.g. manually in DB for testing), the existing `UsageQuota` row for the current period keeps its `count`, but the `limit` looked up is always the *current* tier's limit at check time — so a downgrade mid-month can immediately show 0 remaining if usage already exceeds the new lower limit.
- **Month boundary rollover**: a request right at midnight on the 1st should be evaluated against the new period's (empty) counter, not the prior month's.
- **Existing `OptimizationResult` upsert-on-retrigger behavior**: unaffected by this task except that it now sits behind a quota check.

## Data / API

### Shared types (`@opticv/datatypes`)

- `SubscriptionTier`: `'FREE' | 'BASIC' | 'PRO'` (breaking change from current `'FREE' | 'PRO' | 'PRO_ANNUAL' | 'SPRINT'`).
- `LimitedFeature`: `'CV_OPTIMIZATION' | 'COVER_LETTER' | 'INTERVIEW_PREP' | 'LINKEDIN'`.
- `TIER_LIMITS`: `Record<SubscriptionTier, { features: Record<LimitedFeature, number>; maxStoredCvs: number; allowedTemplates: 'ALL' | string[] }>` — single source of truth for both backend enforcement and frontend gating/display.
- `QuotaStatus`: `{ feature: LimitedFeature; used: number; limit: number; remaining: number; resetsAt: string }`.

### Prisma schema (`apps/opticv-be/prisma/schema.prisma`)

- `SubscriptionTier` enum: `FREE | BASIC | PRO` (remove `PRO_ANNUAL`, `SPRINT`).
- New `LimitedFeature` enum: `CV_OPTIMIZATION | COVER_LETTER | INTERVIEW_PREP | LINKEDIN`.
- New `UsageQuota` model: `id, userId (FK → User, cascade), feature (LimitedFeature), periodStart (DateTime), count (Int, default 0), updatedAt`. Unique on `(userId, feature, periodStart)`; index on `(userId, periodStart)`.
- `User` gains `usageQuotas UsageQuota[]`.
- **Migration is generated by Claude but applied manually by the user** (`npm exec prisma migrate dev`) — do not auto-run migrate commands during implementation. No data-migration step needed for existing user tiers (all are `FREE` already).

### Backend endpoints

- New (or extended) `GET users/me/usage` → `{ quotas: QuotaStatus[]; storedCvs: { used: number; limit: number } }`.
- Existing trigger endpoints (CV optimization, cover letter, interview prep, LinkedIn — via `optimization.controller.ts`) gain quota enforcement; on rejection return a 4xx with a machine-readable error code (e.g. `QUOTA_EXCEEDED`, `FEATURE_NOT_AVAILABLE`) and `{ feature, limit, resetsAt }` payload for cover-letter/interview/LinkedIn cases, or `CV_LIMIT_EXCEEDED` for uploads.
- Swagger enum in `user-profile.dto.ts` updated to `['FREE', 'BASIC', 'PRO']`.

### Backend services

- New `QuotaService` (`apps/opticv-be/src/app/quota/`): `resolvePeriodStart()`, `checkAndConsume(userId, feature, tier)`, `getQuotaStatus(userId, tier)`. No refund method — free retries bypass this service entirely rather than reversing a consume.
- `OptimizationService.triggerOptimization` — enqueues only the 4 CV-subset prompt types; calls `checkAndConsume(userId, 'CV_OPTIMIZATION', tier)` once before enqueueing.
- `OptimizationService.triggerSingleJob` — maps incoming `PromptType` → `LimitedFeature` and calls `checkAndConsume` before enqueueing (CV-subset types also route through `CV_OPTIMIZATION` if triggered singly — confirm intended use, see Assumptions). This is for **fresh** generations only (no existing `FAILED` row being retried, or the existing row is `COMPLETED`).
- New `OptimizationService.retryFailedJob(jobApplicationId, promptType, runId, userId)` — validates the `OptimizationResult` row for `(applicationId, promptType)` is currently `status === 'FAILED'` and belongs to the user; if so, resets it to `PENDING` and re-enqueues the single job **without calling `checkAndConsume`**. If the row isn't `FAILED` (e.g. already `COMPLETED` or missing), rejects/falls back to the normal trigger path — never silently bypasses quota.
- New controller endpoint (e.g. `POST optimization/:jobApplicationId/retry`, body `{ promptType, runId }`) wired to `retryFailedJob`.
- `OptimizationProcessor` — no change to failure handling needed beyond existing `status = 'FAILED'` write; that status is what makes the row eligible for free retry. No refund call.
- `CvService.uploadCv` — checks active `CvDocument` count against `TIER_LIMITS[tier].maxStoredCvs` before creating.

## Assumptions

- `triggerSingleJob` (fresh-trigger path) can be called with a CV-subset `PromptType` (e.g. re-running just `KEYWORD_GAP` as a brand-new generation, not a retry) — in that case it still maps to the `CV_OPTIMIZATION` feature and consumes a `CV_OPTIMIZATION` quota unit, consistent with treating any CV-subset generation as part of that feature's quota.
- Reset window is calendar month for **all** tiers (not just FREE), since no tier currently has billing period data; this may need revisiting once Stripe is integrated.
- Free retry is scoped to the exact `OptimizationResult` row (`applicationId` + `promptType`) and does not expire on a time basis — only on the row transitioning out of `FAILED` status. No cap on number of free retries while it stays `FAILED`.
- The frontend must distinguish "retry this failed job" (calls the new retry endpoint) from "re-run this completed job" (calls the normal trigger endpoint, consumes new quota) in its UI — e.g. a "Retry" button on failed results vs. a "Re-generate" action on completed ones, so users aren't unexpectedly charged quota for retrying a failure, nor allowed to bypass quota by mislabeling a fresh re-run as a "retry".

## Acceptance (DEV)

- `npm exec nx build datatypes` succeeds with new types.
- `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web` pass.
- Prisma migration file generated and reviewed (not auto-applied); schema changes documented for manual `migrate dev` run by the user.
- Backend unit tests added for `QuotaService` (limit reached, increment, month-boundary rollover, feature unavailable on tier) and for `retryFailedJob` (retries a `FAILED` row without consuming quota; rejects retry on a `COMPLETED` or missing row).
- `npm exec nx test opticv-be` and `npm exec nx test opticv-web` pass, including updated `settings.spec.ts` coverage for BASIC/PRO.
- `npm exec nx run-many -t lint` passes.
- Manual verification: as a FREE user, exhaust and get blocked on each feature; confirm LinkedIn is unavailable; confirm only 2 templates selectable; confirm CV upload cap at 2; flip tier to BASIC/PRO in Prisma Studio and confirm limits expand and templates unlock.
- No breaking changes to unrelated flows (existing `OptimizationResult` upsert/re-run behavior, IP/time throttling).
