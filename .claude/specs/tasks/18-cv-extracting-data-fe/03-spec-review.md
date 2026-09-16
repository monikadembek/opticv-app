# Specification Review

## Source

Spec: `.claude/specs/tasks/18-cv-extracting-data-fe/02-spec.md`
Task: `.claude/specs/tasks/18-cv-extracting-data-fe/00-raw-task.md`

---

### Summary

- **Overall assessment: PASS**
- The spec faithfully implements the single requirement from the raw task — calling `cv/:id/extract` after CV and job description are submitted. All clarifying decisions (call order, error handling, code location) were gathered from the developer before writing and are consistently reflected throughout. The spec is precise, unambiguous, and scoped correctly with no invented requirements.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Subscription lifecycle in component destruction** — The Assumptions section notes that the extraction subscription "will complete naturally if the component is destroyed, which is acceptable." This is not fully accurate: an in-flight HTTP Observable does NOT complete when the component is destroyed unless explicitly unsubscribed. The subscription outlives the component in Angular's HTTP client by design. The assumption is acceptable as a conscious decision, but the phrasing is imprecise and could mislead an implementer. Suggest rewording to: "The in-flight extraction request will continue after component destruction; this is accepted behaviour for this fire-and-forget call."

2. **`map(() => void 0)` idiom** — The spec prescribes `map(() => void 0)` to discard the response. The more idiomatic RxJS approach is `map(() => undefined as void)` or simply using `HttpClient.post<void>(...)`. This is a style note only; the described approach works correctly.

3. **Form reset not mentioned** — The existing `onSubmit()` does not reset the form after success (the current code only sets `isSubmitting(false)` and shows a toast). The spec preserves this behaviour ("No changes to the user-visible success/error flow"), which is correct. However, explicitly stating "form is NOT reset after submission" would remove any ambiguity for the implementer.

#### Unclear or Ambiguous Sections

- **Behavior step 3b** states `extractCvData()` "does not block the toast or form reset." There is currently no form reset in the existing code. The word "form reset" here is slightly misleading — minor, but worth noting.

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | `AuthInterceptor` covers the extract endpoint — no extra headers needed | Yes |
| 2 | "Silent retry" = exactly 1 retry via RxJS `retry(1)` | Yes |
| 3 | Subscription outliving component destruction is acceptable | Yes (phrasing imprecise — see Non-Critical #1) |
| 4 | `cvDocumentId` is always non-null when reaching the API call | Yes |
| 5 | Response body is ignored / not stored | Yes |
| 6 | `extractCvData()` is NOT called when `createJobApplication()` fails | Yes (Behavior step 6) |

---

### Recommendation

**Proceed as-is.**

The two non-critical issues (subscription lifecycle phrasing, "form reset" wording) do not affect implementation correctness. The spec is complete and safe to hand to a developer.
