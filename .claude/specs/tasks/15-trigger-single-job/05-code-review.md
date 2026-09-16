# Code Review

## Task

15 — Trigger single job

## Files reviewed

- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.controller.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`

---

### Summary

- **Overall result: PASS**
- Implementation correctly follows the spec and plan. The shared validation helper is cleanly extracted, `triggerSingleJob` is minimal and correct, and the new controller route validates both inputs before delegating. Tests cover all specified error cases and the happy path. No critical issues found.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`optimization.controller.ts` line 24–26 — `TriggerSingleJobDto` lacks `private` or module isolation.** The class is declared at module scope in the controller file, which is fine functionally, but the convention in this codebase is to place DTOs in a `dto/` subfolder (see `job-application/dto/`). This is a style deviation, not a correctness issue. Low priority given the task scope is backend-only and no existing optimization DTOs exist.

2. **`optimization.service.spec.ts` lines 231–241 — last test (`does not enqueue jobs for other promptTypes`) is redundant.** It re-asserts `mockQueue.add` was called once and checks the `promptType` field — both already fully verified by the preceding happy-path test. Not a bug, but adds noise to the suite.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New `POST .../run/:promptType` endpoint | Covered | `optimization.controller.ts` line 45 |
| `triggerSingleJob` service method (4-param signature) | Covered | `optimization.service.ts` line 70 |
| Accept `runId` in request body | Covered | `@Body() body: TriggerSingleJobDto` line 50 |
| Validate `promptType` — return 400 if invalid | Covered | Controller lines 53–55 |
| Validate `runId` presence — return 400 if missing | Covered | Controller lines 57–59 |
| Return 403 for wrong user / not found | Covered | Via `loadAndValidateApplication` |
| Return 400 for unparsed CV | Covered | Via `loadAndValidateApplication` |
| Return 400 for missing job description | Covered | Via `loadAndValidateApplication` |
| Upsert result row back to PENDING, clear all output fields | Covered | Service lines 79–93 |
| Queue one BullMQ job name `'optimize'`, same options as full run | Covered | Service lines 95–99 |
| Return `{ runId }` from the supplied `runId` | Covered | Service line 101 |
| `202 Accepted` response code | Covered | `@HttpCode(202)` line 46 |
| No changes to processor | Covered | Processor file untouched |
| No DB schema changes | Covered | No migration added |
| Build passes | Covered | Webpack build confirmed passing |
| Tests added | Covered | 6 new tests in `optimization.service.spec.ts` |

---

### Plan Deviations

None. All steps in `04-implementation-plan.md` were followed exactly:
- Step 1: `loadAndValidateApplication` extracted ✓
- Step 2: `triggerSingleJob` added with correct 4-param signature ✓
- Step 3a: `TriggerSingleJobDto` added (in controller file rather than `dto/` folder — noted above as non-critical) ✓
- Step 3b: Route handler with correct validation order ✓
- Step 4: Processor unchanged ✓
- Step 5: Module unchanged ✓

---

### Null Safety Issues

None. All relevant fields use nullish coalescing (`?? ''`, `?? {}`) before use in payload construction (`optimization.service.ts` lines 136–137). The `body.runId?.trim()` guard in the controller (line 57) correctly handles an undefined `runId` field.

---

### Code Smells

1. **`optimization.service.ts` line 97 — long inline satisfies expression.** The `triggerSingleJob` queue payload is constructed as a long single-line object literal (over 100 chars). The `triggerOptimization` method uses a named `payloadBase` intermediate for readability. Not a bug, but inconsistent with the style of the method above it.

---

### Recommendation

**Merge as-is.** The two non-critical issues (DTO location, redundant test) and one code smell (long line) are cosmetic and do not affect correctness, type safety, or behaviour.
