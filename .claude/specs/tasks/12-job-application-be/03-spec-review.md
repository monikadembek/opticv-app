# Specification Review

Task ID: 12-job-application-be
Reviewer: Claude Code
Date: 2026-05-16

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, covers all endpoints agreed upon with the user, and aligns with the existing codebase patterns. However, there are two non-critical gaps: (1) the `JobApplicationListItem` type omits `notes` — which may or may not be intentional and is not justified in the spec; (2) the `PATCH /:id/ats-score` route could conflict with the `PATCH /:id` route if NestJS resolves `ats-score` as an `:id` value, and the spec does not address this routing concern. No critical blockers prevent implementation, but both points should be confirmed before proceeding.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **`JobApplicationListItem` excludes `notes` without explanation.**
   The `JobApplicationListItem` type picks `id`, `userId`, `cvDocumentId`, `jobTitle`, `companyName`, `atsScore`, `createdAt`, `updatedAt` — but not `notes`. If the list view is meant to be a lightweight summary, this is intentional, but it is not stated. If the frontend needs `notes` in the list, the type is wrong.

2. **Route ordering / conflict for `PATCH /:id` vs `PATCH /:id/ats-score` not addressed.**
   NestJS Express will match `PATCH /job-applications/ats-score` (a literal segment) correctly only if the `ats-score` route is registered before the `:id` wildcard route. The spec does not mention this constraint. The implementation must register `PATCH /:id/ats-score` before `PATCH /:id`, or use a different URL structure. This is an implementation detail, but worth flagging to avoid a subtle routing bug.

3. **`offset` behaviour when `limit` is absent is undefined.**
   The spec says "When `limit` is provided, apply `take`/`skip`." It does not clarify what happens if `offset` is provided without `limit`. Should `offset` alone be ignored, or should it still apply a `skip`? This is a minor edge case but could cause unexpected behaviour.

4. **`atsScore` nullable in the DB but the spec accepts 0.**
   The spec constrains `atsScore` to `min 0, max 100`. A score of `0` is a valid value but could be ambiguous with "not yet scored" (which uses `null`). The spec does not define how to clear `atsScore` back to `null` once set. The dedicated `PATCH /:id/ats-score` DTO marks `atsScore` as required — so there is no path to reset it to `null`. If that use case is needed, it should be explicitly excluded by the spec.

5. **`JobApplicationResponse` is a plain alias for `JobApplication`.**
   `export type JobApplicationResponse = JobApplication;` adds no value as a distinct type. This is a style observation — not a bug — but it may confuse future readers who expect `JobApplicationResponse` to differ from `JobApplication`.

#### Unclear or Ambiguous Sections

- **Behavior › PATCH /api/job-applications/:id — step 4:** "Apply partial update via `prisma.jobApplication.update`" — it is implied that only the fields present in the DTO body are written. It would be clearer to state "only fields present in the request body are written; absent fields are left unchanged."
- **Edge Cases:** The empty-body case on `PATCH /:id` is listed as "valid, no-op update." However, `prisma.update` with an empty `data: {}` object is indeed valid, but this should be confirmed against the actual class-validator setup — if `UpdateJobApplicationDto` uses `@ValidateIf` or similar, an empty body might still pass validation but produce no DB write. The spec does not specify how class-validator is configured for the optional fields.

#### Invented or Unsupported Requirements

None. All endpoints, field constraints, pagination, and ownership validation were explicitly confirmed by the user during the clarification phase.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The `job_applications` table and Prisma model already exist — no migration is needed. | Yes (Scope › Out of scope) |
| 2 | `SupabaseGuard` + `CurrentUser` decorator pattern is reused from `CvModule` without modification. | Yes (Context) |
| 3 | `jobTitle` and `companyName` are required at the API level even though the DB columns are nullable. | Yes (Context, field list) |
| 4 | Ownership is enforced by comparing `userId` on the record to the authenticated user's id, and a mismatch surfaces as `NotFoundException` (not `ForbiddenException`) to avoid information leakage. | Yes (Edge Cases) |
| 5 | `JobApplicationListItem` intentionally omits `notes` and `jobDescription` to keep list payloads lightweight. | **No — not stated.** |
| 6 | `PATCH /:id/ats-score` is a separate route and not handled inside `PATCH /:id`. | Yes (Scope) |
| 7 | `total` in list response is computed via a separate `prisma.jobApplication.count` call (not derived from the data array length). | Yes (Behavior › GET /api/job-applications) |
| 8 | `offset` without `limit` skips records but returns all remaining records. | **No — not stated.** |
| 9 | An `atsScore` of `null` represents "not yet scored"; there is no API path to reset it back to `null` once set. | **No — not stated.** |

---

### Recommendation

**Revise specification** — address the three unstated assumptions (#5, #8, #9) and confirm the routing order concern before implementation begins. Changes are minor and do not affect the overall design.
