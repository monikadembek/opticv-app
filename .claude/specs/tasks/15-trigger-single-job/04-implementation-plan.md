# Implementation Plan

## Task

15 — Trigger single job

## Spec review status

PASS WITH ISSUES — issues are minor (signature mismatch in spec, `runId` format validation scope). Both are resolved in this plan (4-param signature used throughout; `runId` format validation is out of scope — presence-only check).

---

## Files to Modify

| File | Action |
|------|--------|
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | Modify — extract shared validation helper, add `triggerSingleJob` method |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | Modify — add new POST route handler |

## Files to Create

None.

---

## Implementation Steps

### Step 1 — `optimization.service.ts`: Extract shared validation helper

The validation logic in `triggerOptimization()` (ownership check + CV parsed + job description present) is identical to what `triggerSingleJob()` will need. Extract it into a private method to avoid duplication.

**Private method signature:**
```typescript
private async loadAndValidateApplication(
  jobApplicationId: string,
  userId: string,
): Promise<{ cvText: string; parsedSections: unknown; jobDescription: string }>
```

- Moves the `prisma.jobApplication.findUnique` call (with `include: { cvDocument: true }`) into this helper
- Throws `ForbiddenException` if record not found or `userId` mismatch
- Throws `BadRequestException('CV document is not yet parsed.')` if no `cvDocument` or `parseStatus !== 'COMPLETED'`
- Throws `BadRequestException('Job description is required.')` if `jobDescription` is falsy/empty
- Returns the three values needed to build a job payload: `cvText`, `parsedSections`, `jobDescription`

Update `triggerOptimization()` to call this helper instead of duplicating the logic inline.

---

### Step 2 — `optimization.service.ts`: Add `triggerSingleJob` method

Add the following public method to `OptimizationService`:

**Signature:**
```typescript
async triggerSingleJob(
  jobApplicationId: string,
  promptType: PromptType,
  runId: string,
  userId: string,
): Promise<{ runId: string }>
```

**Logic:**
1. Call `this.loadAndValidateApplication(jobApplicationId, userId)` — destructure `cvText`, `parsedSections`, `jobDescription`.
2. Upsert the `OptimizationResult` row for `(jobApplicationId, promptType)`:
   - `create`: `{ applicationId: jobApplicationId, promptType, status: 'PENDING' }`
   - `update`: `{ status: 'PENDING', structuredOutput: Prisma.DbNull, textOutput: null, errorMessage: null, promptVersionId: null, inputTokens: null, outputTokens: null }`
   - Use the existing `applicationId_promptType` compound unique key in the `where` clause (same pattern as `triggerOptimization`).
3. Call `this.queue.add('optimize', payload satisfies OptimizationJobPayload, { attempts: 2, backoff: { type: 'exponential', delay: 2000 } })` — payload includes `runId`, `jobApplicationId`, `userId`, `promptType`, `cvText`, `parsedSections`, `jobDescription`.
4. Return `{ runId }`.

---

### Step 3 — `optimization.controller.ts`: Add new route and DTO

**3a. Add `TriggerSingleJobDto`** — define inline in the controller file (no separate file needed given its simplicity):

```typescript
class TriggerSingleJobDto {
  runId!: string;
}
```

No class-validator decorators are used in the existing codebase — do not add them. Presence validation is done manually in the handler.

**3b. Add route handler** to `OptimizationController`:

```typescript
@Post('job-applications/:jobApplicationId/run/:promptType')
@HttpCode(202)
async triggerSingleJob(
  @Param('jobApplicationId') jobApplicationId: string,
  @Param('promptType') promptType: string,
  @Body() body: TriggerSingleJobDto,
  @CurrentUser() user: UserModel,
): Promise<{ runId: string }>
```

**Handler logic (in order):**
1. Validate `promptType` param: check `Object.values(PromptType).includes(promptType as PromptType)`. If false → throw `BadRequestException('Invalid promptType.')`.
2. Validate `body.runId`: if `!body.runId?.trim()` → throw `BadRequestException('runId is required.')`.
3. Call `this.optimizationService.triggerSingleJob(jobApplicationId, promptType as PromptType, body.runId.trim(), user.id)`.
4. Return the result.

---

### Step 4 — Verify no processor changes needed

`OptimizationProcessor.process()` already handles any `'optimize'` job regardless of how it was queued. No changes required.

---

### Step 5 — Verify no module changes needed

`OptimizationModule` already provides `OptimizationService` and registers the `'optimization'` queue. No changes required.

---

## Acceptance Checklist

- [ ] `npm exec nx build opticv-be` passes
- [ ] `npm exec nx typecheck opticv-be` passes
- [ ] `POST .../run/:promptType` with valid body returns `202 { runId }`
- [ ] `POST .../run/:promptType` with invalid `promptType` returns `400`
- [ ] `POST .../run/:promptType` with missing `runId` in body returns `400`
- [ ] `POST .../run/:promptType` for another user's job application returns `403`
- [ ] Existing `POST .../run` (full-run) endpoint behavior is unchanged
- [ ] No `TODO` comments in code
