# Task Specification

## Source

Azure DevOps Task: 135 – Implement user menu in avatar

## Goal

Replace the avatar-to-settings shortcut in the top header with a small popup user menu. The menu contains: **Account settings**, **Plan & billing** (shows current tier, with an Upgrade or Manage subscription action) and **Sign out**. The standalone sign-out icon button is removed from the header and its function moves into the menu. Cancel / manage billing becomes reachable in two clicks from anywhere in the app.

## Context

- Frontend only (`apps/opticv-web`); no backend, DB or shared type changes.
- `layout/top-header/top-header.{ts,html,css}` – currently renders `p-avatar` with `routerLink="/settings"` and a separate `p-button` (`pi-power-off`) emitting `signOut`.
- `app.ts` / `app.html` – host of `TopHeader`; handles `(signOut)` (Supabase sign out + `cvStore.resetStore()`) and provides `userLabel`.
- `UserSettingsApiService.userProfile` (`httpResource`, `GET /users/me`) – root-provided; exposes `subscription.tier` (`FREE | BASIC | PRO`). Already used by Settings.
- `BillingRedirectService` (root) – `openPortal()` and `redirectingToPortal` signal; reused as is.
- `/pricing` route exists (Task 134) and is used by Settings for free accounts.

## Scope

### In scope

- Avatar becomes a keyboard-accessible button toggling a PrimeNG popup `p-menu` (`[popup]="true"`).
- Menu entries, in order:
  1. **Account settings** – navigates to `/settings`.
  2. **Plan & billing** – displays the current tier (e.g. "Free", "Basic", "Pro") and one action:
     - FREE tier: **Upgrade** → navigates to `/pricing`.
     - BASIC / PRO tier: **Manage subscription** → `BillingRedirectService.openPortal()` (opens Stripe portal directly).
  3. **Sign out** – emits existing `signOut` output (behavior in `app.ts` unchanged).
- Remove the `pi-power-off` Sign Out button from the header.
- Keep existing PostHog tracking: preserve `signout_button_clicked` (place: `user menu`), and add click events for the other menu entries following the existing `posthog.capture(...)` pattern.
- Update unit tests (`top-header.spec.ts`, and `app.spec.ts` if it references the removed button).

### Out of scope

- Changes to the Settings page, Pricing page, Stripe backend endpoints.
- Showing email/name header inside the menu, avatar image/photo upload.
- Help icon button (unchanged).
- Mobile/responsive redesign of the header beyond keeping the menu usable.

## Behavior

1. Logged-out: header unchanged (Sign In button). Menu is not rendered.
2. Logged-in: header shows Help icon and the avatar (initial label, green background as today). The avatar is rendered as a focusable button with `aria-label` "Open user menu", `aria-haspopup="menu"`, `aria-controls` and `aria-expanded` bound to the popup state. The old `title="Account settings"` and `routerLink` are removed.
3. Click / Enter / Space on the avatar toggles the popup; Escape or outside click closes it and returns focus to the avatar. Arrow keys navigate items (PrimeNG default).
4. Selecting an item closes the menu and performs its action:
   - Account settings → `router.navigate(['/settings'])`.
   - Upgrade → `router.navigate(['/pricing'])`.
   - Manage subscription → `openPortal()`; item is disabled while `redirectingToPortal()` is true (prevents double click).
   - Sign out → `signOut` emitted.
5. The Plan & billing item shows the tier as a label/tag next to its text. Tier label is derived via `computed()` from `userProfile.value()?.subscription?.tier`. Menu model is a `computed()` of the tier and the redirecting state.
6. The menu is available on every page where the header is rendered for a logged-in user.

## Edge Cases

- **Profile loading or failed to load** (tier unknown): Plan & billing item is shown without a tier label and its billing action is disabled; Account settings and Sign out remain usable.
- **Missing `subscription` object**: treated as unknown tier (same as above), not as FREE.
- **Portal request in progress**: Manage subscription disabled; error handling stays in `BillingRedirectService` (toast).
- **SSR**: popup must not rely on browser-only globals at render time; `p-menu` is used with `appendTo="body"`.
- **Subscription canceled-at-period-end / past-due**: still a paid tier → shows Manage subscription (portal handles cancel/resume); no extra state in menu.
- Signing out while menu open: menu closes since the header switches to logged-out view.

## Data / API

- No new endpoints, models or DB changes.
- Reuse `GET /users/me` via `UserSettingsApiService.userProfile`, `POST` portal session via `BillingRedirectService.openPortal()`.
- `TopHeader` injects `UserSettingsApiService`, `BillingRedirectService`, `Router`; imports `MenuModule` (PrimeNG) in place of the removed sign-out button usage.

## Assumptions

- Tier values are `FREE | BASIC | PRO`; display names are Free, Basic, Pro.
- Upgrade for free users goes to `/pricing` (consistent with Settings), not directly to checkout.
- No UI mockup was provided; visuals follow PrimeNG Aura defaults and the existing avatar styling.

## Acceptance (DEV)

- build, lint and typecheck pass (`opticv-web`).
- Unit tests added/updated for `TopHeader`: sign-out button absent; menu renders three entries; FREE shows Upgrade → `/pricing`; BASIC/PRO shows Manage subscription → `openPortal()`; unknown tier disables billing action; Sign out emits `signOut`; Account settings navigates to `/settings`; avatar has correct ARIA attributes.
- Existing tests (`app.spec.ts`, etc.) pass after the removal of the sign-out button.
- AXE/WCAG AA: avatar button focusable, labeled, keyboard operable; contrast preserved.
- No breaking changes to other pages or to the `signOut` output contract.
