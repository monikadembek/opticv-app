# Specification Review

## Source

Task: 15-trigger-single-job  
Spec: `.claude/specs/tasks/15-trigger-single-job/02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, architecturally sound, and correctly scoped to backend-only work. It faithfully covers the task's core requirement (single-job re-trigger without re-running all 7). Two non-critical issues exist: a gap around `runId` format validation, and a minor ambiguity in the service method signature shown in the spec vs. the In Scope section. No invented requirements and no critical blockers.

---

### Findings

#### Critical Issues

None.

---

#### Non-Critical Issues

1. **`runId` format not validated.** The spec requires `runId` to be present (400 if missing) but does not specify whether its format should be validated as a UUID. The existing `triggerOptimization()` generates a UUID internally — here the client supplies one. An invalid string (e.g. `"foo"`) would be silently accepted, stored in the BullMQ job payload, and used as an EventBus key, potentially causing subtle mismatches. The spec should explicitly state whether format validation is in or out of scope.

2. **Service method signature mismatch between In Scope and Data/API sections.** The *In Scope* list shows the signature as `triggerSingleJob(jobApplicationId, promptType, userId)` (3 params), while the *Data/API* section shows `triggerSingleJob(jobApplicationId, promptType, runId, userId)` (4 params). These must match. The 4-param version in Data/API is the correct one given the behavior described, but the discrepancy should be corrected.

3. **No test criterion for the `PROCESSING` race-condition edge case.** The edge case is acknowledged in prose but the Acceptance section has no corresponding test criterion. Consider whether this is intentional (manual verification acceptable) or an oversight.

---

#### Unclear or Ambiguous Sections

- **Behavior step 10 (SSE stream / `run-complete` not sent).** The note that the stream "does not auto-close after 1 event" is correct but could be misread as a bug that needs fixing. It would be clearer to state: *"No changes are made to the SSE stream endpoint. The existing `run-complete` logic (fires after `TOTAL_JOBS` events) is unchanged and will not fire for a single-job retry stream — this is accepted as-is."*

- **"Re-use the existing `runId`" — whose responsibility?** Behavior step 1 says the client sends `{ runId }` in the body, but there is no statement about whether the backend should verify that this `runId` was previously issued for this `jobApplicationId` (e.g., by checking the `OptimizationResult` table or another source). The spec implies no such check, but this is implicit rather than explicit. A sentence confirming "no server-side validation of `runId` ownership is required" would remove ambiguity.

---

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | Client supplies the original `runId` from the full run | Yes |
| 2 | SSE stream subscribed to that `runId` will receive the retry `job-complete` event without frontend changes | Yes |
| 3 | The `run-complete` event will not be re-emitted for a single-job retry | Yes |
| 4 | Validation logic should be extracted into a shared private helper to avoid duplication | Yes (in Assumptions section) |
| 5 | No server-side validation that `runId` was previously issued for this job application | Implicit — not explicitly stated |
| 6 | `promptType` path param is case-sensitive (must match enum casing exactly) | Yes (noted in Data/API section) |
| 7 | Re-running a PROCESSING job is safe enough for now (race condition accepted) | Yes |

---

### Recommendation

**Revise specification** — address the service method signature mismatch (non-critical issue #2) before handing off to implementation, as it directly affects the method contract. The `runId` validation question (#1) and the SSE ambiguity (#3 in unclear sections) are low-risk but worth one-line clarifications to prevent implementer guesswork.
