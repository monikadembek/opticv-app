# Spec Review

Task ID: 28-save-user-edited-output-endpoint

Reviewed: 02-spec.md against 00-raw-task.md

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec correctly covers both endpoints required by the task and aligns well with the original raw task description. All files, methods, and patterns are correctly identified. However, there are two issues that should be clarified before implementation: (1) the GET `/cv/:id/structured-data` behaviour description states the service *may trigger* AI extraction if data is not cached — this conflicts with the GET semantics and the task's implied intent of a lightweight read endpoint; (2) the return value of `saveUserOutput` is left slightly ambiguous ("updated record (or just the patched field — see Data section)") with the actual service return type unresolved.

---

### Findings

#### Critical Issues

**None that block implementation outright**, but see Non-Critical Issues — item 1 is a meaningful behavioural ambiguity that could cause confusion during implementation.

#### Non-Critical Issues

1. **GET endpoint may trigger AI extraction (behaviour mismatch with HTTP semantics).**
   Section "Behavior → 1. GET /cv/:id/structured-data", step 4 states: "If data is not yet extracted, the service runs the AI extraction."
   A `GET` request that triggers a side-effectful, expensive AI call is semantically incorrect. The raw task says "get structuredData from cv with given id" and the inline note says "this already handles the cache-hit path when extraction has run" — implying a read-only path. The spec should explicitly state whether the GET endpoint should return `404` / `400` when data hasn't been extracted yet, or whether it is intentional to fall through to extraction. This needs a decision before implementation.

2. **`saveUserOutput` return value is underspecified.**
   Step 6 in "Behavior → 2. PATCH" reads: "Returns the updated record (or just the patched field — see Data section)." The Data section shows `{ userEditedOutput: string }`, but the parenthetical "or just the patched field" leaves it open. The service return type and what `prisma.optimizationResult.update` selects should be explicitly fixed to avoid ambiguity during implementation.

3. **Missing `@IsNotEmpty()` vs. empty string decision in `SaveUserOutputDto`.**
   Edge Cases states that an empty string is allowed. This is a valid design choice, but `@IsString()` alone (without `@Allow()` or explicit `@IsOptional()`) still passes validation for empty strings in class-validator, so no code issue arises — but explicitly calling this out in the DTO code snippet (e.g. a comment) would improve clarity for the implementer.

4. **HTTP status code for PATCH success not specified.**
   The Data table lists HTTP 200 for the PATCH response, but NestJS defaults to 200 for non-POST methods. The spec should confirm whether `@HttpCode(HttpStatus.OK)` is needed or if the default is relied upon. Minor but worth noting for consistency with the existing controller (which uses explicit `@HttpCode` decorators).

#### Unclear or Ambiguous Sections

- **"Behavior → 1. GET /cv/:id/structured-data", step 4**: Ambiguous whether this endpoint is intended to be read-only (return error if not extracted) or whether it should trigger extraction as a fallback. The raw task wording ("get structuredData") and the prior-conversation note ("cache-hit path when extraction has run") suggest read-only intent, but the spec reuses `extractStructuredData` without restricting its extraction path.

- **"Behavior → 2. PATCH", step 6**: "Returns the updated record (or just the patched field)" is an unresolved either/or.

#### Invented or Unsupported Requirements

- **`SaveUserOutputResponseDto`** — The raw task does not specify what the PATCH response shape should be. The spec introduces `{ userEditedOutput: string }` as the response. This is a reasonable convention but is not explicitly grounded in the task. Not a blocking issue, but should be noted as a spec-level decision.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | Both `structuredData` and `userEditedOutput` columns already exist in the DB — no migration needed. | Yes |
| 2 | `GET /cv/:id/structured-data` reuses `CvExtractionService.extractStructuredData` without modification. | Yes |
| 3 | Ownership check for `OptimizationResult` uses `include: { application: { select: { userId: true } } }`. | Yes |
| 4 | An empty string for `userEditedOutput` is valid (user can clear edits). | Yes |
| 5 | The GET endpoint may trigger AI extraction if data is not cached (implicit, not a stated design decision). | Partially — stated as a fact, not as a decision |
| 6 | `CvExtractResponseDto` is reused as-is for the GET response. | Yes |
| 7 | The PATCH endpoint returns only `{ userEditedOutput }`, not the full `OptimizationResult` record. | Partially — the parenthetical wording leaves it open |

---

### Recommendation

**Revise specification** — specifically address:

1. Clarify whether `GET /cv/:id/structured-data` should return an error (404 or 409) when extraction has not yet run, or whether triggering extraction on a GET is intentional. This is the most important decision.
2. Remove the "or just the patched field" ambiguity from the PATCH return value and commit to `{ userEditedOutput: string }`.
