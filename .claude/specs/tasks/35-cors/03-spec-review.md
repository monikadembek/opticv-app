# Specification Review

## Source

Task: 35-cors  
Spec: `.claude/specs/tasks/35-cors/02-spec.md`

---

### Summary

- **Overall assessment: PASS**
- The specification faithfully captures all three requirements from the raw task (restrict to frontend origin, use localhost for dev, use `https://opticv.com` for production). It is complete, unambiguous, and well-grounded in the existing codebase. No invented requirements were found, and all assumptions are explicitly stated or clearly implied by the task.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Acceptance criterion is partially manual** — "A request from `http://localhost:4200` is accepted; a request from any other origin is rejected by CORS" cannot be verified by automated tests or a build command alone. It is a valid criterion but should be noted as a manual/integration verification step rather than something a CI pipeline can confirm automatically.

2. **`production.env` content not verified in the spec** — The spec states that `CORS_ORIGIN=https://opticv.com` should be added to `config/env/production.env`, but the file's current contents were not shown in the context used to write the spec. It is worth confirming the file exists and that appending to it is safe before implementation.

3. **No mention of allowed HTTP methods or headers** — NestJS `enableCors({ origin })` applies NestJS defaults for methods (`GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS`) and headers. The spec explicitly puts "credentials configuration" out of scope but does not mention methods/headers at all. This is acceptable given the task scope, but worth acknowledging.

#### Unclear or Ambiguous Sections

- **Behavior §2**: `app.enableCors()` is called with `{ origin: corsOrigin }` — this is correct and unambiguous. However, the spec does not state whether `credentials: true` is required (e.g., for cookie-based auth flows). Given the app uses bearer-token auth (not cookies), this is not a gap, but it is an implicit assumption worth surfacing.

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly Stated in Spec? |
|---|---|---|
| 1 | The Angular dev server runs on port `4200` | Yes — stated in Behavior §3 |
| 2 | A single allowed origin per environment is sufficient (no multi-origin support needed) | Yes — Out of Scope section |
| 3 | `CORS_ORIGIN` is required in all environments; no fallback/default value | Yes — Behavior §5 and Edge Cases |
| 4 | The app uses bearer-token auth (not cookies), so `credentials: true` is not needed | **No** — implicit; not stated in spec |
| 5 | `config/env/production.env` exists and follows the same format as `development.env` | **No** — implicit; file was not verified |
| 6 | NestJS default CORS methods and headers are acceptable for all existing API consumers | **No** — implicit; not addressed |

---

### Recommendation

**Proceed as-is.**

The spec is ready for implementation. The two unverified assumptions (#4 and #5) are low-risk and can be confirmed at implementation time without revising the spec. The non-critical issues do not block work.
