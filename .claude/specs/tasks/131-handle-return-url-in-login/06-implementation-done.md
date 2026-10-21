# Implementation Done — Task 131: Handle return URL in login

Source of changes: working-tree changes on branch `131-handle-return-url-in-login` (not yet committed).

## Summary

The frontend (`apps/opticv-web`) now keeps the protected URL a logged-out user asked for and returns them to it after sign-in. `authGuard` redirects to `/login?returnUrl=<requested url>`. `Login` passes `returnUrl` on to `/verify`. `Verify` keeps it on the "Go back" link and on the no-pending-email redirect, and after a successful OTP check it navigates to it with `navigateByUrl`. `guestGuard` sends authenticated users to a valid `returnUrl`. All validation happens in a new shared helper, `core/auth/utils/return-url.ts`. Unit tests were added or updated for both guards, both pages and the helper. Test run: 61 files, 1343 passed, 10 skipped. Lint (0 errors) and typecheck also pass.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `authGuard` redirects to `/login` with `returnUrl` = full requested URL (`state.url`) | Implemented | `auth-guard.ts` |
| `returnUrl` built only from the URL being activated (no nesting) | Implemented | Built from `state.url` |
| `Login` reads `returnUrl` from `ActivatedRoute` snapshot | Implemented | `login.ts` |
| `Login` navigates to `/verify` with `returnUrl` when valid, without it otherwise | Implemented | `login.ts` |
| `Verify` navigates to validated `returnUrl` via `navigateByUrl` on success | Implemented | `verify.ts` |
| `Verify` falls back to `''` when no valid `returnUrl` | Implemented | `verify.ts` |
| `Verify` no-pending-email redirect to `/login` keeps `returnUrl` | Implemented | `verify.ts` `ngOnInit` |
| "Go back" link keeps `returnUrl` (no query param when absent) | Implemented | `verify.html` `[queryParams]="returnUrlQueryParams"` |
| `guestGuard` redirects authenticated user to valid `returnUrl`, else `/` | Implemented | `guest-guard.ts` uses `router.parseUrl` |
| Shared helper in `core/auth/` that reads and validates `returnUrl` | Implemented | `utils/return-url.ts` (`RETURN_URL_PARAM`, `getSafeReturnUrl`) |
| Validation: non-empty, starts with single `/`, not `//` or `/\`, no scheme | Implemented | `getSafeReturnUrl` |
| Validation: rejects `/login` and `/verify` | Implemented | Exact path match, ignoring case, trailing `/`, query string and fragment |
| Invalid/missing value treated as absent and not passed on | Implemented | All callers use the helper result |
| `returnUrl` with own query string kept intact | Implemented | Encoded as one query param value, restored with `navigateByUrl` / `parseUrl` |
| SSR: guards return `true` on the server | Implemented | Unchanged |
| Header / Home login buttons, sign-out redirects unchanged | Implemented | Not modified |
| No backend, `@opticv/datatypes`, route definition or Supabase service changes | Implemented | Not modified |
| No storage of `returnUrl` outside the URL query param | Implemented | Query param only |
| No UI/visual change to login and verify pages | Implemented | Only a `[queryParams]` binding added to the existing link |
| Unit tests: `auth-guard.spec.ts` | Implemented | `returnUrl` redirect and query-string preservation |
| Unit tests: `guest-guard.spec.ts` | Implemented | Valid `returnUrl`, with query string, invalid values → `/` |
| Unit tests: `login.spec.ts` | Implemented | With valid, invalid and absent `returnUrl` |
| Unit tests: `verify.spec.ts` | Implemented | Success → `returnUrl`, invalid → `''`, no-pending-email redirect, "Go back" `href` with and without `returnUrl` |
| Unit tests: helper spec covering validation rules | Implemented | `return-url.spec.ts` |
| lint / typecheck / test pass | Implemented | Confirmed during code review |
| build passes | Not implemented | `npm exec nx build opticv-web` not run or recorded |

## Files

### Created

- `apps/opticv-web/src/app/core/auth/utils/return-url.ts`
- `apps/opticv-web/src/app/core/auth/utils/return-url.spec.ts`

### Modified

- `apps/opticv-web/src/app/core/auth/guards/auth-guard.ts`
- `apps/opticv-web/src/app/core/auth/guards/auth-guard.spec.ts`
- `apps/opticv-web/src/app/core/auth/guards/guest-guard.ts`
- `apps/opticv-web/src/app/core/auth/guards/guest-guard.spec.ts`
- `apps/opticv-web/src/app/core/auth/pages/login/login.ts`
- `apps/opticv-web/src/app/core/auth/pages/login/login.spec.ts`
- `apps/opticv-web/src/app/core/auth/pages/verify/verify.ts`
- `apps/opticv-web/src/app/core/auth/pages/verify/verify.html`
- `apps/opticv-web/src/app/core/auth/pages/verify/verify.spec.ts`
- `docs/tasks-list.md`

## Components

| Component / unit (from plan) | Status |
| --- | --- |
| `return-url.ts` helper (`RETURN_URL_PARAM`, `getSafeReturnUrl`) | Exist |
| `authGuard` (updated) | Exist |
| `guestGuard` (updated) | Exist |
| `Login` page (updated: `route`, `returnUrl`) | Exist |
| `Verify` page (updated: `route`, `returnUrl`, `returnUrlQueryParams`) | Exist |

## Stores

The plan does not create or change any stores.

## Deviations

- In `Login` and `Verify`, `returnUrl` is checked as truthy (`if (this.returnUrl)`) instead of with an explicit null comparison.
- Existing, otherwise untouched tests in `verify.spec.ts` were reformatted by Prettier (line wrapping only).
- `login.spec.ts` defines a local `buildForm` helper and a `RootStub` route component inside the new `returnUrl` test setup. `verify.spec.ts` defines a `RootStub` and a `goBackHref` helper.

## Additional Implementation

- `docs/tasks-list.md`: added a task 131 entry with status "in progress". Additional implementation not covered by the original documents.
