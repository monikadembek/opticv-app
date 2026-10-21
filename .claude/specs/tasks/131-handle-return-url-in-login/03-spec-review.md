# Specification Review — Task 131

### Summary

- Overall assessment: **PASS WITH ISSUES**
- Justification: The spec covers both explicit requirements in the task: `authGuard` redirects to `/login?returnUrl=…`, and the user is redirected back after the login/verify step. It is grounded in the current code (guards, `Login`, `Verify`, `verify.html` "Go back" link, routes). The extra behaviour (`guestGuard` honouring `returnUrl`, passing it as a query param, manual login buttons left out) traces back to the clarification answers. Returnurl validation is not in the task, but it is a necessary safeguard. There are no critical issues. The remaining findings are small precision gaps in the validation rules and a few implicit assumptions that should be stated.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **returnUrl validation: `/login` / `/verify` matching is not precise** (Behavior → "returnUrl validation"). "Does not point back to `/login` or `/verify`" does not say whether the rule is an exact path match or also covers variants such as `/login?returnUrl=…`, `/login/`, `/verify#x` or different casing (`/LOGIN`). The implementer will have to choose, and tests may not agree with the intent. The comparison should be stated as a path match that ignores the query string and fragment.
2. **Unknown in-app paths not covered** (Edge Cases). A `returnUrl` such as `/does-not-exist` passes validation and ends up on `/home` through the `**` wildcard route. The result is harmless, but it is not listed as an edge case, so it is unclear whether that is the intended behaviour.
3. **URL fragments not covered** (Behavior step 2 / Edge Cases). `RouterStateSnapshot.url` can include a fragment (`#…`). The spec says the query string is kept, but says nothing about fragments.
4. **Helper location and name left open** (Scope → In scope: "e.g. `utils/return-url.ts`"). This is acceptable, but the planning step will have to settle it. The helper's API (signature, return type for invalid input) is not described either.
5. **Existing test fixtures will break** (Acceptance → unit tests). The current guard specs call the guard with `{} as never` for `RouterStateSnapshot`. The spec says the `'/login'` assertion is updated, but not that the test harness must now pass a `state` with a `url`. This is minor, and implementers will find it, but it is worth noting.
6. **No E2E coverage mentioned** (Acceptance). The fix targets a multi-step user flow (landing page → `/settings` → login → verify → `/settings`). Only unit tests are listed. The spec should say whether E2E (`opticv-web-e2e`) coverage is expected or deliberately left out.

#### Unclear or Ambiguous Sections

- **Behavior → "returnUrl validation"**: the "does not point back to `/login` or `/verify`" matching semantics (see Non-Critical #1).
- **Behavior step 8**: says `guestGuard` covers `/verify?returnUrl=…` for authenticated users. This is consistent with Scope, but `Verify` itself never sees an authenticated user in that case. The step is correct but could be read as describing `Verify` behaviour.
- **Scope → In scope, helper**: "reads and validates" does not say whether the helper takes the raw query param value, `ActivatedRouteSnapshot`, or `ParamMap`.

#### Invented or Unsupported Requirements

None that are unsupported. These go beyond the raw task text but are justified:

- `guestGuard` redirecting authenticated users to `returnUrl`: from a clarification answer.
- `returnUrl` kept on the `/verify` "Go back" link and on the no-pending-email redirect: from a clarification answer (query-param approach), and needed for the task to work.
- Open-redirect validation helper and its rules: not in the task. It is a security safeguard that comes with any return-URL feature, so it is acceptable, but it is the author's addition.

### Assumptions Detected

| # | Assumption | Explicitly stated? |
| - | ---------- | ------------------ |
| 1 | The landing page already links to the app's `/settings` route; no landing page changes. | Yes |
| 2 | `returnUrl` is passed as a query param between `/login` and `/verify`, not in service state. | Yes |
| 3 | `guestGuard` honours `returnUrl` for authenticated users. | Yes |
| 4 | Only `authGuard` sets `returnUrl`; header/Home login buttons and sign-out redirects do not. | Yes |
| 5 | Default post-login destination stays `''` (→ `/home`). | Yes |
| 6 | Query params are read with `ActivatedRoute.snapshot.queryParamMap`; component input binding is not enabled. | Yes |
| 7 | Nothing else navigates after sign-in (e.g. the `SIGNED_IN` handler in `Supabase.initAuth()` or `App`), so `Verify`'s navigation is final. | **No** (true in the current code, but implicit) |
| 8 | The landing page links to `/settings` with no extra query params, or any extra params are fine to keep as-is. | **No** (partly covered by the "returnUrl with its own query string" edge case) |
| 9 | Guards keep returning `true` on the server (SSR), so `returnUrl` is never built during SSR. | Yes (Context + Edge Cases) |
| 10 | PostHog events in `Login`/`Verify` are unchanged. | **No** (implied by "no UI change", not stated) |
| 11 | Unit tests are enough; no E2E test is required. | **No** |

### Recommendation

- **Proceed as-is.** The issues found are clarifications that can be settled during implementation planning. Optionally, tighten the `/login`/`/verify` matching rule and state assumptions 7, 10 and 11 before planning.
