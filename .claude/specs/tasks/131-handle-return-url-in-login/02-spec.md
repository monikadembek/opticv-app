# Task Specification

## Source

Azure DevOps Task: 131 — Handle return url in the app when user navigates from landing page by clicking the button in pricing table to the app settings page in order to buy subscription but is not logged in

## Goal

Keep the protected URL a logged-out user asked for while they sign in, and send them back to it afterwards. `authGuard` redirects unauthenticated users to `/login?returnUrl=<requested url>`. The value is passed through the OTP flow (`/login` → `/verify`), and after `verifyOtp()` succeeds the user is sent to that URL instead of the default `''` route.

The main case is a logged-out visitor who clicks "Get Pro" in the landing page pricing table. They should end up on `/settings`, where they can buy a subscription. The same mechanism covers every other deep link into an `authGuard`-protected route.

## Context

Frontend only (`apps/opticv-web`). Auth flow files under `apps/opticv-web/src/app/core/auth/`:

| File                                | Current behaviour                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `guards/auth-guard.ts`              | No session → `router.createUrlTree(['/login'])`. The requested URL is lost.              |
| `guards/guest-guard.ts`             | Session exists → `router.createUrlTree(['/'])`.                                           |
| `pages/login/login.ts`              | After `signInWithOtp()` succeeds → `router.navigate(['/verify'])`.                        |
| `pages/verify/verify.ts`            | No pending email on init → `navigate(['/login'])`. After `verifyOtp()` succeeds → `navigate([''])`. |
| `pages/verify/verify.html` (l. 72)  | "Wrong email? `<a routerLink="/login">Go back</a>`"                                       |

Routes protected by `authGuard` (`app.routes.ts`): `/upload-cv`, `/dashboard`, `/cv-optimization`, `/cv-optimization/:jobApplicationId`, `/settings`.

Both guards return `true` on the server (SSR). The redirect logic only runs in the browser and that stays the same.

## Scope

### In scope

- `authGuard`: redirect to `/login` with query param `returnUrl` set to the full requested URL (`RouterStateSnapshot.url`, including its own query string, e.g. `/settings` or `/cv-optimization?cvId=…`).
- `Login` page: read `returnUrl` from the current route's query params. On successful OTP request, navigate to `/verify` and pass the same `returnUrl` query param when a valid one is present.
- `Verify` page:
  - On successful verification, navigate to the validated `returnUrl` when present, otherwise to `''` (unchanged default).
  - When there is no pending email on init, redirect to `/login` and keep `returnUrl`.
  - The "Go back" link to `/login` keeps `returnUrl`.
- `guestGuard`: when an authenticated user opens `/login` or `/verify` with a valid `returnUrl`, redirect to that URL. Otherwise redirect to `/` as now.
- A small shared helper in `core/auth/` (e.g. `utils/return-url.ts`) that reads and validates a `returnUrl` value, used by both guards and both pages, so the security check exists in one place.
- Update and extend unit tests for `authGuard`, `guestGuard`, `Login` and `Verify`, plus tests for the new helper.

### Out of scope

- The landing page (separate project). It already links to the app's `/settings` URL.
- Header "Log in" button (`layout/top-header`) and Home page login button (`features/home`). They keep navigating to plain `/login` with no `returnUrl`.
- Sign-out redirects (`app.ts`, `settings.ts` account deletion) stay on plain `/login`.
- Backend changes. None needed.
- Storing `returnUrl` in `Supabase` service state or in browser storage. The URL query param is the only place it is kept.
- Any UI or visual change to the login and verify pages.

## Behavior

1. A logged-out user opens a protected route, e.g. `/settings` from the landing page pricing table.
2. `authGuard` finds no session and returns a `UrlTree` for `/login?returnUrl=%2Fsettings`. The value is the URL-encoded full requested URL, produced through `createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })`.
3. `guestGuard` lets the user onto `/login` (no session).
4. The user submits their email. After `signInWithOtp()` succeeds, `Login` navigates to `/verify?returnUrl=%2Fsettings`. If there was no valid `returnUrl`, it navigates to `/verify` with no query param, as now.
5. On `/verify`:
   - If there is no pending email (e.g. after a page reload), the user goes back to `/login?returnUrl=…`, keeping the value.
   - "Wrong email? Go back" leads to `/login?returnUrl=…`, keeping the value (no query param when there is none).
6. The user enters the 6-digit code. After `verifyOtp()` returns a session, `Verify` clears the pending email, resets the form, and navigates to the validated `returnUrl` with `router.navigateByUrl(...)` so any embedded query string is kept. With no valid `returnUrl` it navigates to `''` (default, unchanged).
7. `authGuard` on the target route now finds a session and allows it. The user lands on `/settings`.
8. An already-logged-in user who opens `/login?returnUrl=/settings` (or `/verify?returnUrl=…`) is redirected by `guestGuard` straight to `/settings`.

### returnUrl validation (shared helper)

A `returnUrl` is valid only if all of these hold:

- It is a non-empty string.
- It starts with a single `/`. It does not start with `//` or `/\`, so protocol-relative or backslash tricks are rejected.
- It has no scheme (e.g. `http:`, `javascript:`). The leading-`/` rule already ensures this.
- It does not point back to `/login` or `/verify`, which would cause a loop or a pointless redirect.

An invalid or missing value is treated as if there were no `returnUrl`: the default destination is used and `returnUrl` is not passed on.

## Edge Cases

- **No `returnUrl`** (user opened `/login` directly or via the header button): the flow behaves exactly as today, ending on `''` → `/home`.
- **External or malicious `returnUrl`** (`https://evil.com`, `//evil.com`, `/\evil.com`, `javascript:…`): ignored, default destination used. This prevents an open redirect.
- **`returnUrl` pointing to `/login` or `/verify`**: ignored, default destination used.
- **`returnUrl` with its own query string** (e.g. `/cv-optimization?cvId=123`): kept intact, encoded as one query param value and restored with `navigateByUrl`.
- **`/settings?billing=success|canceled`** (Stripe return URLs): if the session expired, the `billing` param is kept through login and Settings still shows its toast.
- **Page reload on `/verify`**: pending email is lost (existing behaviour). The user is sent back to `/login` and `returnUrl` is kept.
- **OTP request or verification error**: the user stays on the current page. `returnUrl` stays in the URL, and nothing else changes.
- **SSR**: guards still return `true` on the server. No change.
- **Multiple redirects**: `authGuard` always builds `returnUrl` from the URL being activated, never from an existing `returnUrl`, so values are never nested.

## Data / API

- **Endpoints:** none.
- **Models:** none. No shared `@opticv/datatypes` changes.
- **DB:** none.
- **Router:** new optional query param `returnUrl` on `/login` and `/verify`. Route definitions in `app.routes.ts` are unchanged.

## Assumptions

- The landing page "Get Pro" button already links to the app's `/settings` route. Confirmed out of scope.
- `returnUrl` is passed between `/login` and `/verify` as a query param, not stored in service state. Confirmed.
- `guestGuard` honours `returnUrl` for authenticated users. Confirmed.
- Only `authGuard` sets `returnUrl`. Manual login buttons do not. Confirmed.
- The default post-login destination stays `''` (redirects to `/home`).
- Query params are read through `ActivatedRoute` (`snapshot.queryParamMap`) in the pages, matching the existing pattern in `settings.ts` and `cv-optimization.ts`. Component input binding is not enabled in the app and will not be added.

## Acceptance (DEV)

- Logged out, opening `/settings` → redirected to `/login?returnUrl=%2Fsettings` → after email + OTP the user lands on `/settings`.
- Logged out, opening `/login` directly → after OTP the user lands on `/home`, as today.
- `returnUrl` is kept by `/login` → `/verify`, by the "Go back" link, and by the no-pending-email redirect on `/verify`.
- Logged in, opening `/login?returnUrl=/settings` → redirected to `/settings`.
- External, protocol-relative, backslash and `/login`/`/verify` `returnUrl` values are ignored.
- Unit tests:
  - `auth-guard.spec.ts`: the redirect `UrlTree` contains `returnUrl` equal to the requested URL. The existing `'/login'` assertion is updated.
  - `guest-guard.spec.ts`: redirects to a valid `returnUrl` and falls back to `/` for missing or invalid values.
  - `login.spec.ts`: navigates to `/verify` with `returnUrl` when present and without it when absent.
  - `verify.spec.ts`: navigates to `returnUrl` on success, falls back to `''`, and keeps `returnUrl` on the no-pending-email redirect.
  - Helper spec covering all validation rules.
- `npm exec nx lint opticv-web`, `npm exec nx typecheck opticv-web`, `npm exec nx test opticv-web` and `npm exec nx build opticv-web` pass.
- No breaking changes to existing auth flows (sign-out, header login, Home login).
