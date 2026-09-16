# Specification Review — Task 83: Subscription Tier Limits

## Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification is thorough, internally consistent, and every context claim about the current codebase was independently verified as accurate (tier enum, `PromptType` values, `triggerOptimization`/`triggerSingleJob` behavior, `OptimizationResult` schema, absence of upload caps, Swagger enum, throttler guards). It correctly incorporates both task changes from `00-raw-task.md` (manual migration, no tier-data migration). However, it introduces one undefined field (`runId`) into the retry API surface with no grounding in the task or the referenced plan, and it is silent on a real Postgres enum-migration hazard that the plan doc explicitly called out and the task's "run migrations manually" instruction makes newly relevant to double-check.

## Findings

### Critical Issues

1. **Unexplained `runId` parameter in the retry API.** `02-spec.md` lines 131–132 define `retryFailedJob(jobApplicationId, promptType, runId, userId)` and a controller endpoint with body `{ promptType, runId }`. Verified against the actual `OptimizationResult` schema: the model has no run/attempt identifier — it is uniquely keyed by `@@unique([applicationId, promptType])` only, and no such concept appears anywhere else in the spec, the plan doc, or the raw task. Since the spec's own retry-identification logic (line 77: "identified by `applicationId` + `promptType`") does not need a `runId` to disambiguate, this parameter is either an invented requirement or an unexplained gap in the data model (e.g., is a new column implied but not listed in the `UsageQuota`/schema section?). This must be resolved before implementation — either drop `runId` or specify what it refers to and add it to the Prisma schema section.

### Non-Critical Issues

1. **Enum-migration hazard from the plan is dropped without comment.** The referenced plan (`docs/subscription-tier-limits.md`, "Migration considerations," lines 83) explicitly flags that Postgres cannot drop an enum value that's in use, and recommends mapping any `PRO_ANNUAL`/`SPRINT` rows to `PRO` before altering the enum. The spec's "Out of scope" (line 48) says no data migration is needed "since all current users are already FREE" — which is true for user *data*, but doesn't address whether the enum values `PRO_ANNUAL`/`SPRINT` themselves are safe to drop if unused (they should be, if truly zero rows reference them, but the spec should state this explicitly as the basis for skipping the plan's safeguard, since the migration is now run manually by the user with less opportunity for Claude to catch a failed migration mid-flight).
2. **Reset-window policy silently diverges from the plan without flagging it as a change.** The plan (line 23) proposed billing-period-first with calendar-month fallback. The spec (Scope line 39, Assumptions line 139) simplifies to calendar-month for all tiers unconditionally. This is reasonable (no tier has real billing periods yet) and is listed under "Assumptions," but it is a substantive simplification of a decision the plan called "locked with the user" — worth a one-line confirmation that this simplification was intentional and approved, not just inherited assumption drift.
3. **`triggerSingleJob` for CV-subset types is only an assumption, not a confirmed decision.** Spec Assumptions (line 138) states that calling `triggerSingleJob` with a CV-subset `PromptType` maps to `CV_OPTIMIZATION` and consumes a quota unit "consistent with treating any CV-subset generation as part of that feature's quota" — but the plan doc flags the same point as needing confirmation ("confirm intended use, see Assumptions," spec line 130) without ever resolving it. This is correctly surfaced as an assumption per the review criteria, but it affects a fairly central quota-consumption path and should be confirmed with the user before implementation rather than carried as an open assumption.

### Unclear or Ambiguous Sections

1. **"Backend Services" section, `retryFailedJob` signature** (line 131) — see Critical Issue 1; the `runId` parameter's origin and type are unclear.
2. **Behavior section, item 5** (lines 77–81) is long and covers multiple rules (free retry scope, bundle independence, retry-of-retry, COMPLETED-blocks-free-retry) in one paragraph; it is correct but dense enough that an implementer could miss the "no cap on number of free retries" clause buried mid-paragraph. Not a defect, but a candidate for splitting into sub-bullets for implementation clarity.

### Invented or Unsupported Requirements

- **`runId` field** on the retry endpoint (see Critical Issue 1) — not present in the raw task, not present in the referenced plan doc, and not grounded in any existing schema field found in the codebase. Flagged as unsupported pending clarification.

Everything else in the spec traces cleanly to either the raw task (tier values, limits, "run migrations manually," "don't migrate existing FREE users") or the referenced plan doc (`docs/subscription-tier-limits.md`), which the raw task explicitly designates as the starting point ("I already discussed and prepared initial plan with Claude... Check that plan").

## Assumptions Detected

All explicitly listed in the spec's "Assumptions" section (lines 137–141):

1. `triggerSingleJob` on a CV-subset `PromptType` (fresh trigger, not retry) maps to `CV_OPTIMIZATION` and consumes a quota unit. — Explicitly stated; inherited from an unresolved question in the plan doc (see Non-Critical Issue 3).
2. Reset window is calendar month for **all** tiers, not just FREE (diverges from the plan's billing-period-first design). — Explicitly stated as an assumption; see Non-Critical Issue 2.
3. Free retry is scoped to the exact `(applicationId, promptType)` row, not time-limited, uncapped in count while `FAILED`. — Explicitly stated, consistent with Behavior section and raw task's retry-related expectations (implied by "free retry" framing in the plan, not contradicted by the raw task).
4. Frontend must visually distinguish "retry failed job" vs. "re-run completed job" as separate UI actions to avoid accidental quota charges. — Explicitly stated.

Additional implicit assumption not listed in the spec's Assumptions section:

5. **The `runId` parameter's existence and meaning** is an implicit, unstated assumption baked directly into an API signature rather than being called out as an open question — this should have been listed under Assumptions (or resolved) rather than presented as settled design. See Critical Issue 1.

## Recommendation

- **Revise specification** — resolve the `runId` question (Critical Issue 1) before implementation; the other items are non-blocking but should be confirmed with the user given their effect on core quota-consumption behavior (Non-Critical Issues 2–3).
