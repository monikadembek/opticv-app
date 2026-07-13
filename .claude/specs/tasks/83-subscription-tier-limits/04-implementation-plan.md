# Implementation Plan — Task 83: Subscription Tier Limits

## Source

- Specification: `.claude/specs/tasks/83-subscription-tier-limits/02-spec.md`
- Specification review: `.claude/specs/tasks/83-subscription-tier-limits/03-spec-review.md` (result: PASS WITH ISSUES)

## Resolved Review Issues

The spec review flagged an unexplained `runId` parameter on the retry API (`retryFailedJob(jobApplicationId, promptType, runId, userId)`), with no grounding in the task, the plan doc, or the `OptimizationResult` schema (which is uniquely keyed only by `applicationId` + `promptType`). Confirmed against the codebase: no run/attempt identifier exists on `OptimizationResult`. The only existing `runId` concept in the codebase is an in-memory SSE/event-bus correlation id used by `triggerOptimization`/`triggerSingleJob`/`streamOptimization` — unrelated to retry identity, and not to be conflated with it.

**Decision (confirmed with user): drop `runId` from the retry API entirely.** `retryFailedJob` is identified solely by `(jobApplicationId, promptType, userId)`, consistent with the spec's own Behavior section (line 77) and the actual `OptimizationResult` uniqueness constraint. This plan reflects that decision throughout Part 3 and Part 5 below; no `runId` field, column, or query param is introduced for retry.

The two non-critical issues from the review (reset-window simplified to calendar-month-for-all-tiers; `triggerSingleJob` on CV-subset types mapping to `CV_OPTIMIZATION`) are already explicitly recorded as accepted assumptions in `02-spec.md` (lines 137–141) and are implemented as specified, with no further changes.

---

## Part 1 — Shared types (`@opticv/datatypes`)

**File: `packages/shared/datatypes/src/lib/datatypes.ts`**

1. Change `SubscriptionTier` (currently line 73: `'FREE' | 'PRO' | 'PRO_ANNUAL' | 'SPRINT'`) to `'FREE' | 'BASIC' | 'PRO'`.
2. Add `LimitedFeature` type: `'CV_OPTIMIZATION' | 'COVER_LETTER' | 'INTERVIEW_PREP' | 'LINKEDIN'`.
3. Add `TIER_LIMITS` constant: `Record<SubscriptionTier, { features: Record<LimitedFeature, number>; maxStoredCvs: number; allowedTemplates: 'ALL' | string[] }>` populated with the limits table from the spec (Behavior → Tier limits). FREE `allowedTemplates: ['default', 'classic']`; BASIC/PRO `allowedTemplates: 'ALL'`.
4. Add `QuotaStatus` type: `{ feature: LimitedFeature; used: number; limit: number; remaining: number; resetsAt: string }`.
5. Add a response type for the usage endpoint, e.g. `UsageStatus`: `{ quotas: QuotaStatus[]; storedCvs: { used: number; limit: number } }`.
6. Add request/error-shape types used by both sides if not already present: a discriminated error payload type for `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` / `CV_LIMIT_EXCEEDED` (`{ code: 'QUOTA_EXCEEDED' | 'FEATURE_NOT_AVAILABLE'; feature: LimitedFeature; limit: number; resetsAt: string } | { code: 'CV_LIMIT_EXCEEDED'; limit: number }`).
7. Rebuild: `npm exec nx build datatypes`.

---

## Part 2 — Database schema (Prisma)

**File: `apps/opticv-be/prisma/schema.prisma`**

1. Update the `SubscriptionTier` enum (currently line 15): replace `PRO_ANNUAL`, `SPRINT` values with `BASIC`, keeping `FREE` and `PRO`.
2. Add `LimitedFeature` enum: `CV_OPTIMIZATION | COVER_LETTER | INTERVIEW_PREP | LINKEDIN`.
3. Add `UsageQuota` model:
   - Fields: `id` (uuid pk), `userId` (FK → `User`, `onDelete: Cascade`), `feature` (`LimitedFeature`), `periodStart` (`DateTime`), `count` (`Int`, default `0`), `updatedAt` (`DateTime`, `@updatedAt`).
   - `@@unique([userId, feature, periodStart])`.
   - `@@index([userId, periodStart])`.
4. Add `usageQuotas UsageQuota[]` relation field to the `User` model.
5. Generate the migration: `npm exec prisma migrate dev --schema=apps/opticv-be/prisma/schema.prisma --create-only` (create-only so it is reviewed, not applied). **Do not run the migration** — per the raw task, the user runs it manually. State this explicitly when the migration file is produced.
6. No data-migration step: raw task confirms all existing users are `FREE`, so no backfill/mapping logic is needed before altering the enum (matches `02-spec.md` Out of scope).
7. After the user manually applies the migration, regenerate the client: `npm exec prisma generate --schema=apps/opticv-be/prisma/schema.prisma`. (Note this dependency in the checklist — implementation work referencing the new Prisma types can proceed once the client is regenerated; coordinate timing with the user.)

**File: `apps/opticv-be/src/app/users/dto/user-profile.dto.ts`**

8. Update the Swagger enum (line 5) from `['FREE', 'PRO', 'PRO_ANNUAL', 'SPRINT']` to `['FREE', 'BASIC', 'PRO']`.

---

## Part 3 — Backend: `QuotaModule` / `QuotaService`

**New files: `apps/opticv-be/src/app/quota/quota.module.ts`, `apps/opticv-be/src/app/quota/quota.service.ts`**

1. `QuotaModule` imports `PrismaModule`, provides and exports `QuotaService`.
2. `QuotaService` (inject `PrismaService`):
   - `resolvePeriodStart(): Date` — returns the 1st of the current calendar month at 00:00 (uniform across all tiers per spec Assumptions).
   - `checkAndConsume(userId: string, feature: LimitedFeature, tier: SubscriptionTier): Promise<void>`:
     1. Look up `TIER_LIMITS[tier].features[feature]`. If `0`, throw a `ForbiddenException` carrying code `FEATURE_NOT_AVAILABLE` and `{ feature }`.
     2. Compute `periodStart` via `resolvePeriodStart()`.
     3. Atomically check-and-increment the `UsageQuota` row for `(userId, feature, periodStart)` guarding against race/double-spend:
        - Use a `prisma.$transaction` that upserts the row (`create` with `count: 0` if missing) then performs a conditional `updateMany` (`where: { id, count: { lt: limit } }`, `data: { count: { increment: 1 } }`) and checks the affected row count; if `0` rows affected, treat as quota exhausted.
     4. If exhausted, throw `ForbiddenException` with code `QUOTA_EXCEEDED` and `{ feature, limit, resetsAt }` (resetsAt = 1st of next calendar month).
   - `getQuotaStatus(userId: string, tier: SubscriptionTier): Promise<QuotaStatus[]>` — for each `LimitedFeature`, read (not upsert) the current period's `UsageQuota.count` (default `0` if no row), compute `remaining = max(0, limit - used)`, `resetsAt` = 1st of next calendar month. Include entries with `limit === 0` (used `0`, limit `0`, remaining `0`).
   - No refund/decrement method — per spec, free retries bypass this service entirely.

---

## Part 4 — Backend: enforcement at chokepoints

### `apps/opticv-be/src/app/optimization/optimization.service.ts`

1. Inject `QuotaService` and a way to resolve the caller's `SubscriptionTier` (read `prisma.subscription.findUnique({ where: { userId } })`, default to `'FREE'` if missing — mirrors existing `getProfile` null-handling pattern in `users.service.ts`).
2. Define a `CV_SUBSET_PROMPT_TYPES` constant: `[RESUME_AUTOPSY, KEYWORD_GAP, SUMMARY_REWRITE, BULLET_UPGRADE]`, distinct from the existing `ALL_PROMPT_TYPES` (line 15).
3. Define a `PROMPT_TYPE_TO_FEATURE` mapping: the 4 CV-subset types → `CV_OPTIMIZATION`; `COVER_LETTER` → `COVER_LETTER`; `INTERVIEW_PREP` → `INTERVIEW_PREP`; `LINKEDIN_REWRITE` → `LINKEDIN`.
4. `triggerOptimization` (currently lines 24–80):
   - Replace `ALL_PROMPT_TYPES` with `CV_SUBSET_PROMPT_TYPES` in both the upsert loop and the queue-add loop.
   - Before creating/enqueuing anything, call `checkAndConsume(userId, 'CV_OPTIMIZATION', tier)`. If it throws, propagate (no upserts/enqueues happen).
5. `triggerSingleJob` (currently lines 82–130):
   - Resolve `feature = PROMPT_TYPE_TO_FEATURE[promptType]`.
   - Before the upsert/enqueue, call `checkAndConsume(userId, feature, tier)`.
   - This method remains the **fresh-trigger** path only (existing behavior unchanged otherwise); it is not used for retries (see new method below).
6. Add `retryFailedJob(jobApplicationId: string, promptType: PromptType, userId: string): Promise<{ runId: string }>`:
   - Validate the job application belongs to the user (reuse `loadAndValidateApplication` or a lighter ownership check plus CV/job-description reload since the job must be re-enqueued).
   - Look up the `OptimizationResult` row for `(applicationId: jobApplicationId, promptType)`.
   - If the row does not exist or `status !== 'FAILED'`, throw a `BadRequestException` (or similar) instructing the caller to use the normal trigger endpoint instead — never silently bypass quota.
   - If `status === 'FAILED'`: reset it to `PENDING` (clear `errorMessage`, `structuredOutput`, `textOutput` as the existing upsert `update` branch already does) and re-enqueue via `this.queue.add('optimize', ..., { attempts: 2, backoff: ... })` using a freshly generated `runId` (SSE-stream correlation id, independent of retry identity — matches existing `triggerSingleJob` pattern).
   - Does **not** call `checkAndConsume` — this is the free-retry path.
   - Returns `{ runId }` for SSE-stream correlation only, consistent with the other two trigger methods' return shape.

### `apps/opticv-be/src/app/optimization/optimization.controller.ts`

7. Add `POST job-applications/:jobApplicationId/retry/:promptType` (or equivalent path consistent with the existing `run/:promptType` route naming) wired to `retryFailedJob(jobApplicationId, promptType, user.id)`. No request body needed (no `runId` param — see Resolved Review Issues). Validate `promptType` against `PromptType` enum values the same way `triggerSingleJob` does (line 101).
8. `triggerOptimization` and `triggerSingleJob` controller methods need no signature change; `QuotaService`-thrown exceptions propagate as normal NestJS HTTP exceptions (ensure the exception body includes `code`/`feature`/`limit`/`resetsAt` so the frontend can render a precise message — extend or wrap `ForbiddenException` with a typed payload if NestJS's default shape doesn't already surface the extra fields, e.g. pass an object body instead of a string to `ForbiddenException`).

### `apps/opticv-be/src/app/cv/cv.service.ts`

9. Inject `PrismaService`-based subscription lookup (or a shared helper) to resolve the caller's tier.
10. In `uploadCv` (line 38), before the R2 upload / `CvDocument` create: count `prisma.cvDocument.count({ where: { userId, isActive: true } })` and compare to `TIER_LIMITS[tier].maxStoredCvs`. If at or above cap, throw `ForbiddenException` with code `CV_LIMIT_EXCEEDED` and `{ limit }` — before any R2 upload happens (avoid wasted storage writes on a rejected upload).

### Usage endpoint

**Files: `apps/opticv-be/src/app/users/users.controller.ts`, `users.service.ts`**

11. Add `GET users/me/usage` returning `UsageStatus` (`{ quotas: QuotaStatus[]; storedCvs: { used, limit } }`):
    - `users.service.ts`: new method `getUsageStatus(supabaseId: string)` — resolve user + tier (existing pattern from `getProfile`), call `quotaService.getQuotaStatus(userId, tier)`, and count active `CvDocument`s for `storedCvs.used` against `TIER_LIMITS[tier].maxStoredCvs`.
    - `users.controller.ts`: new `@Get('me/usage')` handler mirroring the existing `@Get('me')` handler's auth/guard pattern (line 82).
    - Inject `QuotaService` into `UsersModule`/`UsersService` (add `QuotaModule` to `UsersModule` imports).

---

## Part 5 — Backend: module wiring

1. Register `QuotaModule` in `AppModule` (or wherever feature modules are composed) and import it into `OptimizationModule`, `CvModule`, and `UsersModule` so each can inject `QuotaService`.
2. Confirm no circular module dependency is introduced (`QuotaModule` only depends on `PrismaModule`).

---

## Part 6 — Frontend: tier config & gating

### Template gating

**File: `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts`**

1. Add an `input<SubscriptionTier>()` (or read from a shared user-profile signal) to know the current tier.
2. Add a `computed()` deriving `allowedTemplateIds` from `TIER_LIMITS[tier()].allowedTemplates` (`'ALL'` → all `CV_TEMPLATES` ids; otherwise the listed ids).
3. In the template (`cv-template-selector.html`), render templates not in `allowedTemplateIds` as disabled with a locked/upgrade affordance (visual treatment + `aria-disabled`), consistent with existing accessibility conventions (WCAG AA, keyboard nav already handled by `onKeydown`).
4. Ensure `onKeydown`/`select()` skip locked templates when navigating (do not let arrow-key navigation land selection on a disabled template).
5. In the parent component that sets the initial `selected` model value (per spec: `cv-optimization.ts` around line 210), ensure the default template resolved for a FREE user is always in the allowed set (`default` already is, so this should hold naturally — verify explicitly).

### Usage display & quota errors

**File: `apps/opticv-web/src/app/features/settings/`**

6. Add a service method to `user-settings-api.service.ts` (or an equivalent shared API service) to call `GET users/me/usage`, returning `UsageStatus`.
7. In `settings.ts`, expose a signal/resource for usage status; call it in `ngOnInit` alongside `reloadUserProfile()`.
8. In `settings.html`, near the existing tier badge, add a usage panel listing each `LimitedFeature`'s `used/limit` and `resetsAt`, plus stored-CV `used/limit`. Follow existing PrimeNG/Tailwind conventions in that file; `OnPush` change detection already set.

### Quota-error handling on trigger actions

**Files: wherever CV optimization / cover letter / interview prep / LinkedIn triggers are called from the frontend (search under `features/cv-optimization` and any interview-prep/cover-letter/linkedin feature areas), plus the shared HTTP interceptor layer**

9. Extend or add an interceptor (alongside the existing `rate-limit-interceptor.ts`) to catch the new `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE` / `CV_LIMIT_EXCEEDED` error codes and surface a distinct toast/message per case (not the generic error path), including an upgrade prompt where relevant (`FEATURE_NOT_AVAILABLE`, `QUOTA_EXCEEDED`).
10. Ensure the "Retry" action (calling the new retry endpoint) is visually and functionally distinct from "Re-generate" (calling the normal trigger endpoint) in whatever component renders `FAILED` vs `COMPLETED` optimization results — per spec Assumptions (line 141), so users are not unexpectedly charged quota for retrying a failure. Identify the exact component during implementation (likely under `features/cv-optimization` results display) and add a `Retry` button wired to the new endpoint only for `FAILED` rows.

---

## Part 7 — Tests

### Backend (`npm exec nx test opticv-be`)

1. `QuotaService` unit tests (new `quota.service.spec.ts`):
   - Limit not yet reached → increments and resolves.
   - Limit reached (`count === limit`) → throws with `QUOTA_EXCEEDED`.
   - Feature limit `0` (e.g. LinkedIn on FREE) → throws with `FEATURE_NOT_AVAILABLE`, no `UsageQuota` row touched.
   - Month-boundary rollover: a row from the previous `periodStart` does not count toward the current period's limit.
   - `getQuotaStatus` returns correct `used/limit/remaining/resetsAt` for all features including untouched ones (`used: 0`).
2. `OptimizationService` tests (extend existing spec if present, else new):
   - `retryFailedJob` re-enqueues and resets a `FAILED` row without calling `checkAndConsume`.
   - `retryFailedJob` rejects (no enqueue, no quota call) when the row is `COMPLETED` or missing.
   - `triggerOptimization` calls `checkAndConsume('CV_OPTIMIZATION')` once and only enqueues the 4 CV-subset prompt types.
   - `triggerSingleJob` maps each `PromptType` to the correct `LimitedFeature` before consuming.
3. `CvService.uploadCv` test: rejects with `CV_LIMIT_EXCEEDED` when active CV count is at tier cap; succeeds and creates the doc when under cap.

### Frontend (`npm exec nx test opticv-web`)

4. Update `apps/opticv-web/src/app/features/settings/settings.spec.ts` (line 16 references `tier: 'FREE'`) — add coverage for `BASIC`/`PRO` tiers (usage panel renders, no locked-template messaging where not applicable).
5. `cv-template-selector.spec.ts` — add cases for FREE (only `default`/`classic` selectable, others disabled) vs BASIC/PRO (all selectable).

### Lint / typecheck / build

6. `npm exec nx build datatypes`
7. `npm exec nx typecheck opticv-be` and `npm exec nx typecheck opticv-web`
8. `npm exec nx run-many -t lint`

---

## Part 8 — Manual verification (per spec Acceptance)

1. As a FREE user: exhaust and get blocked on CV optimization, cover letter, interview prep (limit 1 each); confirm LinkedIn always shows "not available" (never "quota exhausted"); confirm only `default`/`classic` templates selectable; confirm CV upload blocked at 2 active documents.
2. Trigger a job that fails terminally (or simulate), confirm the free retry succeeds without affecting quota count, and confirm retrying a `COMPLETED` row is rejected (falls back to fresh-trigger path).
3. In Prisma Studio, flip a test user's `Subscription.tier` to `BASIC` then `PRO`; confirm limits expand, LinkedIn becomes available, all templates unlock.
4. Confirm `GET users/me/usage` reflects actions taken and the settings page displays it correctly.
5. Confirm existing IP/time throttling (`AiThrottlerGuard`/`ApiThrottlerGuard`) is untouched and still functions alongside the new quota checks.

---

## Files Planned (Created / Modified)

### Created

- `apps/opticv-be/src/app/quota/quota.module.ts`
- `apps/opticv-be/src/app/quota/quota.service.ts`
- `apps/opticv-be/src/app/quota/quota.service.spec.ts`
- New Prisma migration file under `apps/opticv-be/prisma/migrations/` (generated, not applied by Claude)

### Modified

- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/prisma/schema.prisma`
- `apps/opticv-be/src/app/users/dto/user-profile.dto.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` (or new, if none exists)
- `apps/opticv-be/src/app/cv/cv.service.ts`
- `apps/opticv-be/src/app/cv/cv.service.spec.ts` (or new, if none exists)
- `apps/opticv-be/src/app/users/users.controller.ts`
- `apps/opticv-be/src/app/users/users.service.ts`
- `apps/opticv-be/src/app/users/users.module.ts` (import `QuotaModule`)
- `apps/opticv-be/src/app/optimization/optimization.module.ts` (import `QuotaModule`)
- `apps/opticv-be/src/app/cv/cv.module.ts` (import `QuotaModule`)
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-template-selector/cv-template-selector.spec.ts`
- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `apps/opticv-web/src/app/features/settings/services/user-settings-api.service.ts`
- Frontend HTTP interceptor file (existing `rate-limit-interceptor.ts` or a new sibling) for quota-error handling
- Component rendering optimization result actions (Retry vs Re-generate) — exact file to be identified during implementation, under `apps/opticv-web/src/app/features/cv-optimization/`
