# Code Review — Task 131: Handle return URL in login

Reviewed: working-tree changes on branch `131-handle-return-url-in-login` (uncommitted), against `02-spec.md` and `04-implementation-plan.md`.

Verification run during review:

- `npm exec nx lint opticv-web` — 0 errors (61 warnings, none in `core/auth/`)
- `npm exec nx typecheck opticv-web` — pass
- `npm exec nx test opticv-web` — 61 files, 1343 passed, 10 skipped, 0 failed
- `prettier --check --end-of-line auto apps/opticv-web/src/app/core/auth/` — pass (plain `--check` only flags CRLF line endings from the Windows checkout)
- `npm exec nx build opticv-web` — not run during review

### Summary

- Overall result: **PASS WITH ISSUES**
- The implementation matches the spec and plan closely. `returnUrl` is set by `authGuard`, carried through `/login` → `/verify` (including the "Go back" link and the no-pending-email redirect), honoured by `guestGuard`, and validated in one shared helper. Every spec acceptance test is present and passes. The only findings are minor test-file convention issues and small duplication. None blocks merge.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. `apps/opticv-web/src/app/core/auth/pages/login/login.spec.ts:11` — the new `RootStub` is declared with `@Component({ template: '', standalone: true })`. Conventions say not to set `standalone: true` (it's the default in Angular 21). The equivalent new stub in `verify.spec.ts:21` correctly leaves it out, so the two specs are now inconsistent. (The existing `VerifyStub` on line 8 has the same issue, but it predates this task.)
2. `apps/opticv-web/src/app/core/auth/pages/verify/verify.spec.ts:9-12, 94-97, 113-116, 127-137` — existing tests that this task does not otherwise touch were reformatted. This is Prettier output (the file at `HEAD` was not Prettier-clean), so it's harmless, but it adds unrelated lines to the diff ("Minimal footprint" rule). Acceptable to keep. Mentioned only for transparency.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `authGuard` redirects to `/login?returnUrl=<state.url>` | Covered | `auth-guard.ts:17-19` uses `createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })` |
| `returnUrl` keeps the requested URL's own query string | Covered | `state.url` used as-is. Tested in `auth-guard.spec.ts` ("keeps the query string…") |
| Values never nested | Covered | Built only from `state.url` |
| `Login` passes valid `returnUrl` to `/verify`, none when absent/invalid | Covered | `login.ts:57-63`. Tested with a valid value, an invalid value and no value |
| `Verify` navigates to `returnUrl` via `navigateByUrl` on success, else `''` | Covered | `verify.ts:78-82` |
| `Verify` no-pending-email redirect keeps `returnUrl` | Covered | `verify.ts:47-56` |
| "Go back" link keeps `returnUrl` (none when absent) | Covered | `verify.html:73` `[queryParams]="returnUrlQueryParams"` (null → no params). Both cases tested via `href` |
| `guestGuard` redirects authenticated user to valid `returnUrl`, else `/` | Covered | `guest-guard.ts:17-22` uses `router.parseUrl`, so the query string is kept |
| Shared validation helper in `core/auth/utils/` | Covered | `utils/return-url.ts` used by both guards and both pages |
| Rejects empty, non-`/`, `//`, `/\`, scheme URLs | Covered | `return-url.ts:8-9` |
| Rejects `/login` and `/verify` (exact match, ignoring case, trailing `/`, query, fragment) | Covered | `return-url.ts:11-12`. `/login-help` confirmed valid |
| Invalid value treated as absent and not passed on | Covered | All callers use `getSafeReturnUrl` before using or forwarding the value |
| SSR: guards return `true` on server | Covered | Unchanged |
| Out-of-scope areas untouched (header/home login, sign-out, routes, Supabase service, backend) | Covered | No changes outside the planned files (plus `docs/tasks-list.md` entry) |
| Unit tests: auth guard, guest guard, login, verify, helper | Covered | All listed cases present. Full suite passes |
| lint / typecheck / test / build pass | Partial | lint, typecheck and test confirmed. `build` not run during review |

### Plan Deviations

None. The helper API (`RETURN_URL_PARAM`, `getSafeReturnUrl`), guard signatures, `ActivatedRoute` snapshot usage, `returnUrlQueryParams` field, conditional `navigate` calls without extras when `returnUrl` is absent, and the test cases all match Steps 1–6 of the plan. Note: the plan's `Login` step asks for an explicit null check. The code uses a truthy check (`if (this.returnUrl)`), which works the same here because the helper never returns `''`.

### Null Safety Issues

None introduced. `getSafeReturnUrl` accepts `string | null | undefined` and returns `string | null`, and every caller checks the result before use. `value.split(/[?#]/)[0]` always returns a string. (The existing `this.supabase.pendingEmail() as string` in `verify.ts:72` is unchanged and outside this task's scope.)

### Code Smells

1. Minor duplication: the `{ [RETURN_URL_PARAM]: returnUrl }` query-param object is built separately in `login.ts:58-60` and `verify.ts:43-45`, and both pages repeat the same `getSafeReturnUrl(this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM))` field initializer. It's small and the plan specified it, so it's acceptable as-is.
2. Test-only duplication: `login.spec.ts` and `verify.spec.ts` each define their own `createWithUrl` and `RootStub` setup. This matches the per-spec style used elsewhere in the repo, so no change is needed.

### Recommendation

- **Merge as-is.** Optionally remove `standalone: true` from the new `RootStub` in `login.spec.ts:11`, and run `npm exec nx build opticv-web` before merging to complete the spec's acceptance checklist.
