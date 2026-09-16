# Specification Review

Task ID: 16-usage-tracking

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, covers all three task requirements (usage logging, cost calculation, DB write), and correctly identifies the integration point in `OptimizationProcessor`. However, two non-critical issues exist: the `userId` retrieval approach is left as "either approach is acceptable" without a clear decision, and the actual `gpt-4o-mini` pricing values are not stated in the spec — leaving the implementer to source them externally. These gaps do not block implementation but reduce precision.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **`userId` retrieval decision is deferred.** The spec lists two options (extra DB query in the processor vs. adding `userId` to the job payload) but makes no recommendation. The implementer must choose, and either choice has downstream implications (extra query per job vs. a payload schema change). The spec should commit to one approach.

2. **Pricing values not specified.** The spec mandates a pricing map for `gpt-4o-mini` but does not state the actual USD per-million-token values. The implementer must look these up externally. If OpenAI changes pricing, there is no record of which rates were intentional. The spec should include the initial pricing values (input price / output price per MTok) as a data point.

3. **`UsageLogService.log()` signature not fully defined.** The spec lists what fields are passed to `log()` but does not define the method signature (parameter type — object vs. positional args, return type). Minor, but the acceptance criteria would benefit from a concrete interface reference.

#### Unclear or Ambiguous Sections

- **"Behavior → Writing a usage log entry"**: States the log call should be placed "after `OptimizationProcessor` saves a COMPLETED `OptimizationResult`" but does not specify whether it should be inside or outside the `try` block. The edge case section clarifies it must be fire-and-forget (its own try/catch), but the placement relative to the existing `try/catch` in the processor is not drawn explicitly.

- **"Data / API → Modified files"**: The note "Import `AiModule` if not already imported" implies uncertainty about the current module graph. This should be verified against the actual `optimization.module.ts` before implementation rather than left as a conditional.

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|--------------------------|
| 1 | The `UsageLog` table already exists in the database (migration already applied) | Yes — "No DB schema changes / No migration needed" |
| 2 | CV extraction calls are out of scope for usage logging | Yes — stated in Context and Out of scope |
| 3 | A failed optimization job should not produce a usage log entry | Yes — listed as an edge case |
| 4 | `UsageLog` write failures must not affect `OptimizationResult` status | Yes — listed as an edge case |
| 5 | The `gpt-4o-mini` model is the only model currently in use (single pricing entry sufficient) | Implicit — spec says "at minimum `gpt-4o-mini`" but does not confirm no other models are active |
| 6 | The `costUsd` field stores USD using `Decimal(10,6)` precision, which is sufficient for the expected cost range | Implicit — inherited from schema, not verified in spec |
| 7 | The `Decimal` type used in `CostCalculatorService`'s return type refers to Prisma's `Decimal` (not a native JS number) | Implicit — inferred from schema field type, not stated |

---

### Recommendation

**Revise specification** — address the two non-critical issues before implementation:

1. Choose and commit to one `userId` retrieval strategy.
2. Add the concrete `gpt-4o-mini` pricing values (input/output USD per MTok) to the pricing map specification.

The ambiguity around `log()` placement in the processor's try/catch flow should also be clarified to avoid inconsistent implementation.
