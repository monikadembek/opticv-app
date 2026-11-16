# Implementation Plan — Task 131: Handle return URL in login

## Inputs

- Spec: `02-spec.md`
- Spec review: `03-spec-review.md`. Result: **PASS WITH ISSUES**, recommendation "Proceed as-is". Planning can go ahead.

## Resolution of review findings (implementation decisions, no new requirements)

| Review finding | Decision in this plan |
| --- | --- |
| #1 `/login`/`/verify` matching not precise | The helper removes the query string (`?…`) and fragment (`#…`) and any trailing `/`, then compares the remaining path **case-insensitively** for an exact match with `/login` or `/verify`. A match makes the URL invalid. |
| #2 Unknown in-app paths | No special handling. A valid unknown path (e.g. `/does-not-exist`) is navigated to as-is, and the existing `**` route redirects it to `home`. |
| #3 Fragments | `RouterStateSnapshot.url` is used as-is, including any fragment. `navigateByUrl` restores it. |
| #4 Helper location/API | `core/auth/utils/return-url.ts`, API defined in Step 1. |
| #5 Guard spec fixtures | Guard specs pass real snapshot-shaped objects (Step 6). |
| #6 E2E | Out of scope. The spec's Acceptance lists unit tests only. |

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

No changes to `app.routes.ts`, `supabase.ts`, the backend, or `@opticv/datatypes`.

---

## Step 1 — Return-URL helper (`core/auth/utils/return-url.ts`)

A pure module: no Angular dependencies, no DI.

Exports:

- `RETURN_URL_PARAM = 'returnUrl'`: the query param name, used everywhere instead of string literals.
- `getSafeReturnUrl(value: string | null | undefined): string | null`

`getSafeReturnUrl` rules, in order (any failure → `null`):

1. `value` is a non-empty string.
2. `value` starts with `/`.
3. `value` does not start with `//` or `/\`.
4. Path part = `value` cut at the first `?` or `#`, with trailing `/` removed and lower-cased. It must not equal `/login` or `/verify`.
5. Otherwise return `value` unchanged (query string and fragment kept).

Angular decodes query param values before they are read, so the helper always works on decoded values.

## Step 2 — `authGuard` (`guards/auth-guard.ts`)

- Change the signature to use the second parameter: `(_route, state)`.
- No-session branch: `router.createUrlTree(['/login'], { queryParams: { [RETURN_URL_PARAM]: state.url } })`.
- SSR branch (`return true`) and session branch unchanged.
- `state.url` is always the URL being activated, so `returnUrl` is never nested.

## Step 3 — `guestGuard` (`guards/guest-guard.ts`)

- Change the signature to use the first parameter: `(route)`.
- Session branch: `const returnUrl = getSafeReturnUrl(route.queryParamMap.get(RETURN_URL_PARAM))`.
  - If `returnUrl` is set, return `router.parseUrl(returnUrl)`.
  - Otherwise return `router.createUrlTree(['/'])`, as now.
- SSR branch and no-session branch unchanged.

## Step 4 — `Login` page (`pages/login/login.ts`)

- Inject `ActivatedRoute` (`private readonly route = inject(ActivatedRoute)`), following the pattern in `settings.ts`.
- Add `private readonly returnUrl = getSafeReturnUrl(this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM))`. Its type is `string | null`, and null is handled explicitly.
- In `onSubmit`, success branch: replace `this.router.navigate(['/verify'])` with navigation to `/verify` that adds `queryParams: { [RETURN_URL_PARAM]: returnUrl }` **only when `returnUrl` is not null**. With no value, the call stays `navigate(['/verify'])` with no extras, so existing behaviour and assertions hold.
- No template, error handling or PostHog changes.

## Step 5 — `Verify` page (`pages/verify/verify.ts`, `verify.html`)

`verify.ts`:

- Inject `ActivatedRoute`.
- Add `private readonly returnUrl = getSafeReturnUrl(this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM))`.
- Add `readonly returnUrlQueryParams`: `{ [RETURN_URL_PARAM]: returnUrl }` when `returnUrl` is set, otherwise `null`. It is a plain readonly field (the snapshot doesn't change during the component's life) and is used by the template link.
- `ngOnInit` (no pending email): navigate to `/login`, adding `queryParams: returnUrlQueryParams` only when it is not null. With no value, the call stays `navigate(['/login'])`.
- `onSubmit` success branch: after `setPendingEmail(null)` and `form.resetForm()`:
  - if `returnUrl` is set → `this.router.navigateByUrl(returnUrl)`
  - otherwise → `this.router.navigate([''])` (unchanged).
- Error handling, the `console.log` calls and PostHog capture are unchanged.

`verify.html`:

- "Go back" link: keep `routerLink="/login"` and add `[queryParams]="returnUrlQueryParams"`. `RouterLink` accepts `null` and then adds no query params.

## Step 6 — Unit tests

Test-only changes in `vi`/Vitest style, matching the existing specs.

### `utils/return-url.spec.ts` (new)

- Returns `null` for `null`, `undefined` and `''`.
- Returns `null` for `https://evil.com`, `javascript:alert(1)`, `settings` (no leading slash), `//evil.com`, `/\evil.com`.
- Returns `null` for `/login`, `/verify`, `/login/`, `/LOGIN`, `/login?returnUrl=%2Fsettings`, `/verify#x`.
- Returns the input unchanged for `/settings`, `/`, `/settings?billing=success`, `/cv-optimization?cvId=123`, `/cv-optimization/abc`, `/settings#plans`.
- Returns a path that only starts with the word (e.g. `/login-help`) unchanged, which confirms the match is exact.

### `guards/auth-guard.spec.ts`

- Call the guard with a state of `{ url: '/settings' } as RouterStateSnapshot` (replacing `{} as never` for the state argument).
- Update "redirects to /login…" to expect the serialized URL `/login?returnUrl=%2Fsettings`.
- Add: a requested URL with a query string (`/settings?billing=success`) gives a `returnUrl` query param equal to the full original URL. Check it via `UrlTree.queryParams`.
- The "session exists → true" test is unchanged in its assertion.

### `guards/guest-guard.spec.ts`

- Build route snapshots as `{ queryParamMap: convertToParamMap({...}) } as ActivatedRouteSnapshot` (replacing `{} as never` for the route argument).
- Keep: no session → `true`; session with no `returnUrl` → `/`.
- Add: session + `returnUrl=/settings` → serialized `/settings`.
- Add: session + `returnUrl=/settings?billing=success` → serialized `/settings?billing=success`.
- Add: session + invalid `returnUrl` (`//evil.com`, `/login`) → `/`.

### `pages/login/login.spec.ts`

- Keep the existing test "navigates to /verify" (no query param, call `['/verify']`).
- Add a `describe` block that sets up `ActivatedRoute` with `returnUrl=/settings`. Either add a root route stub and `navigateByUrl('/?returnUrl=%2Fsettings')` before `createComponent`, or provide `ActivatedRoute` with a snapshot whose `queryParamMap` comes from `convertToParamMap`. Use whichever works with the `RouterLink`s in the template.
  - Expect `navigate` to be called with `['/verify']` and `{ queryParams: { returnUrl: '/settings' } }`.
- Add: an invalid `returnUrl` (`//evil.com`) → `navigate(['/verify'])` with no extras.

### `pages/verify/verify.spec.ts`

- Keep the existing success test (`navigate([''])`) and the no-pending-email test (`navigate(['/login'])`).
- Add (using the same `ActivatedRoute` setup as in the Login spec, with `returnUrl=/settings`):
  - Success → `navigateByUrl('/settings')` called, `navigate(['']`) not called.
  - No pending email → `navigate(['/login'], { queryParams: { returnUrl: '/settings' } })`.
  - The "Go back" link `href` contains `returnUrl=%2Fsettings`.
- Add: no `returnUrl` → the "Go back" link `href` is exactly `/login`.
- Add: invalid `returnUrl` (`https://evil.com`) → success falls back to `navigate([''])`.

## Step 7 — Verification

Run and confirm everything passes:

1. `npm exec nx lint opticv-web`
2. `npm exec nx typecheck opticv-web`
3. `npm exec nx test opticv-web`
4. `npm exec nx build opticv-web`

Manual check (`npm exec nx serve opticv-web`):

- Logged out → `/settings` → URL becomes `/login?returnUrl=%2Fsettings` → submit email → URL `/verify?returnUrl=%2Fsettings` → enter OTP → lands on `/settings`.
- Logged out → `/login` directly → OTP → lands on `/home`.
- On `/verify?returnUrl=%2Fsettings`, "Go back" → `/login?returnUrl=%2Fsettings`. Reloading `/verify` → back to `/login?returnUrl=%2Fsettings`.
- Logged in → `/login?returnUrl=%2Fsettings` → redirected to `/settings`. Logged in → `/login?returnUrl=%2F%2Fevil.com` → redirected to `/home`.

## Conventions checklist

- `inject()` only, no constructor injection; no `standalone: true`; OnPush kept.
- No `any` in production code. `returnUrl` is typed `string | null`, and null is checked explicitly before use.
- No new comments, no `TODO`s, no changes outside the listed files.
