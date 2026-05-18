# Spec Review: Task 19 — Add Swagger

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, covers the integration thoroughly, and aligns with the minimal raw task. However, two non-critical issues exist: the CV module DTO path in the Data/API section is imprecise (no `.dto.ts` files exist there at all), and the `@ApiResponse()` scope is listed but no concrete response shapes or codes are defined, leaving the implementer to guess which status codes apply to which endpoints.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **CV module DTO path is vague.** The spec lists `apps/opticv-be/src/app/cv/` as a location for DTOs to annotate, but a filesystem check confirms there are no `*.dto.ts` files in that directory. Either no DTOs exist (so the line should be removed), or the DTOs exist under a different form (e.g., inline class types, interfaces) and the spec should clarify what to annotate there.

2. **`@ApiResponse()` scope is undefined.** The In Scope list mentions adding `@ApiResponse()` decorators for common HTTP responses, but the Behavior section does not specify which status codes map to which endpoints. The implementer must infer this from the controllers at implementation time, which risks inconsistency across endpoints.

3. **`swagger-ui-express` may be unnecessary.** `@nestjs/swagger` bundles `swagger-ui-express` as a peer dependency for Express-based NestJS apps. Listing it as an explicit install dependency may cause a version conflict. This is a minor concern and depends on the actual package version resolution.

4. **Acceptance criterion: "No tests need to be added"** — this is stated as a rule but is not a testable criterion. It is a scope exclusion and belongs in Out of Scope rather than Acceptance.

---

### Unclear or Ambiguous Sections

- **Behavior, point 1:** `configService.get('nodeEnv')` — the config key name `'nodeEnv'` should be verified against the actual config schema in `config/validation.ts`. If the key is named differently (e.g., `'NODE_ENV'`), the guard will silently fail and Swagger will always be enabled or always disabled.

- **Data / API — CV module row:** `apps/opticv-be/src/app/cv/ — any request/response DTOs` is ambiguous. "Any" leaves the implementer without a concrete list.

---

### Invented or Unsupported Requirements

None. All requirements either originate from the raw task ("Add Swagger to backend app") or are reasonable, explicitly-stated implementation decisions made to fulfill that task.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|------------|---------------------------|
| 1 | Swagger UI is disabled in production environments | Yes |
| 2 | Bearer JWT is the only auth scheme | Yes |
| 3 | No versioning prefix; version `1.0` is a label only | Yes |
| 4 | `@nestjs/swagger` works with Webpack without additional plugins or tsconfig changes | Yes (Edge Cases) |
| 5 | Generated Prisma types in `src/generated/` should not receive Swagger decorators | Yes (Edge Cases) |
| 6 | The config key for the environment is `'nodeEnv'` as used in the existing `main.ts` | Implicit — referenced in Behavior but not verified against the config schema |
| 7 | `swagger-ui-express` must be installed as a separate package | Implicit — may already be a transitive dependency of `@nestjs/swagger` |
| 8 | No tests are required because Swagger setup is configuration-only | Stated in Acceptance, but not in Assumptions |

---

## Recommendation

**Revise specification** — address the following before implementation:

1. Remove or clarify the CV module DTO entry in Data/API (no DTOs found there).
2. Either list the expected HTTP status codes per endpoint group in Behavior, or explicitly state that the implementer chooses them based on controller inspection.
3. Verify the config key name (`'nodeEnv'`) against `config/validation.ts` and correct it in the spec if needed.
4. Move "no tests needed" from Acceptance to Out of Scope.
