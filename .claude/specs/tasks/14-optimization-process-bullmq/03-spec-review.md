# Spec Review

## Source

Task 14: Optimization Process, BullMQ
Spec: `.claude/specs/tasks/14-optimization-process-bullmq/02-spec.md`
Reviewed against: `00-task-raw.md` and current Prisma schema

---

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec faithfully captures the task's intent (BullMQ parallel jobs + SSE streaming for 7 PromptTypes) and is well-structured. However, two issues require fixing before implementation begins: (1) the spec proposes a DB migration to add `@@unique([jobApplicationId, promptVersionId])`, but the schema already has `@@unique([applicationId, promptType])` — making the proposed migration both wrong (wrong field name) and unnecessary (the real unique key is a better UPSERT target); (2) the spec is internally contradictory about the UPSERT key, proposing `(applicationId, promptVersionId)` in one place and `(applicationId, promptType)` in another. These must be reconciled before coding starts.

---

## Findings

### Critical Issues

**C1 — DB migration is incorrect and unnecessary**

*Spec section: "DB migration required"*

The spec states:

> Add unique constraint to `OptimizationResult`:
> ```prisma
> @@unique([jobApplicationId, promptVersionId])
> ```

The actual Prisma schema (`schema.prisma` line 172) already has:

```prisma
@@unique([applicationId, promptType])
```

Two problems:
1. The field name in the spec (`jobApplicationId`) does not match the schema field name (`applicationId`). No migration using `jobApplicationId` will work.
2. The constraint already exists on `(applicationId, promptType)`, which is the correct UPSERT key for per-PromptType results. No migration is needed.

The entire "DB migration required" section should be removed or replaced with a note confirming the existing constraint is sufficient.

---

**C2 — Contradictory UPSERT strategy**

*Spec section: "OptimizationResult UPSERT strategy"*

The section first recommends:

> UPSERT where `where` is a unique composite `(jobApplicationId, promptVersionId)`.

But then says:

> If the active prompt version changed, create a new record. This is acceptable given the UPSERT-per-run requirement.

This contradicts the stated goal of "overwrite on re-run." If the active prompt version changes between runs, upsert-by-`promptVersionId` would create a second record for the same `promptType`, not overwrite it.

Given the existing `@@unique([applicationId, promptType])` constraint, the correct UPSERT key is `(applicationId, promptType)`. The spec should settle on this unambiguously.

---

### Non-Critical Issues

**N1 — "PROCESSING" status not used in worker flow**

The `OutputStatus` enum includes `PENDING | PROCESSING | COMPLETED | FAILED`. The spec describes the worker setting status to `COMPLETED` or `FAILED` only. It does not specify whether the worker should set status to `PROCESSING` when it begins executing. This is a minor gap — not a blocker, but leaving `PENDING` records visible while a job runs for 30-60s may confuse the frontend.

**N2 — UsageLog write not mentioned**

The schema has a `UsageLog` model that tracks token usage per user per prompt type with cost. The spec mentions storing `inputTokens` / `outputTokens` on `OptimizationResult` but does not mention writing to `UsageLog`. If usage tracking is expected (the model exists and has an index), this is a gap. If it is explicitly deferred, it should be listed under Out of Scope.

**N3 — SSE event subscription mechanism underspecified**

The spec says "Subscribe to BullMQ job completion events for this `runId`" but does not specify how the SSE controller layer receives these events from the worker. BullMQ's `QueueEvents` listener (which requires a separate Redis connection) is the standard mechanism, but the spec leaves the wiring between controller and worker implicit. This may cause ambiguity during implementation.

**N4 — `trigger-optimization.dto.ts` described as empty**

The spec lists `trigger-optimization.dto.ts (empty — no request body)`. An empty DTO file is unusual and adds noise. This is minor but worth clarifying — if there's no body, no DTO file is needed.

**N5 — No mention of the `PENDING` initial status write**

The spec does not specify whether an `OptimizationResult` record with `status = PENDING` should be created synchronously on the trigger endpoint (before jobs are enqueued) or only written by the worker. Both are valid but have different implications for the frontend being able to display skeleton states immediately.

---

### Unclear or Ambiguous Sections

**"OptimizationResult UPSERT strategy"** — contradictory as described in C2 above. The final UPSERT key is never cleanly stated.

**"Step 3 — Worker processor, step 4 (parse and validate response)"** — "JSON for structured outputs, plain text for others" is vague. Which PromptTypes produce structured JSON and which produce plain text? This needs to be either listed explicitly or deferred to the PromptVersion's `outputSchema` field.

**"Step 2 — SSE stream, step 4 (Subscribe to BullMQ job completion events)"** — The mechanism for cross-process event delivery (QueueEvents, EventEmitter, in-process) is unspecified. If the worker and the SSE controller run in the same NestJS process, an EventEmitter is simpler than QueueEvents. If they ever run in separate processes/instances, QueueEvents over Redis is required. This architectural choice is not addressed.

---

### Invented or Unsupported Requirements

None. All requirements in the spec are grounded in the task description or in clarifying questions answered by the developer/PO.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| A1 | All 7 PromptTypes always run (no selection) | Yes — "All 7 PromptTypes run as parallel child jobs on every optimization request" |
| A2 | One SSE connection per run; stream closes when all 7 jobs resolve | Yes — stated in Scope and Behavior |
| A3 | OptimizationResult records are overwritten on re-run (UPSERT) | Yes — stated in Scope and Re-run behavior |
| A4 | Redis runs locally via Docker for development | Yes — stated in Scope and Docker Compose section |
| A5 | `CvDocument` must be in `PARSED` status before optimization can run | Yes — Step 1, point 3 |
| A6 | Job description must be non-empty | Yes — Step 1, point 4 |
| A7 | Duplicate run triggers are allowed; last write wins for UPSERT | Yes — Edge Cases |
| A8 | Worker and SSE controller run in the same NestJS process | Implicit only — not stated |
| A9 | `UsageLog` writes are not part of this task | Implicit only — not listed in Out of Scope |
| A10 | `OptimizationResult.status` is not set to `PROCESSING` when a job starts | Implicit only — not addressed |
| A11 | UPSERT key is `(applicationId, promptType)` using the existing schema constraint | Contradicted — spec says `(jobApplicationId, promptVersionId)` in one place |

---

## Recommendation

**Revise specification** — address C1 and C2 (remove the incorrect migration section, settle unambiguously on `@@unique([applicationId, promptType])` as the UPSERT key). Optionally address N1 (`PROCESSING` status), N2 (UsageLog), and N3 (SSE subscription mechanism) to reduce implementation ambiguity. The spec is otherwise solid and implementable.
