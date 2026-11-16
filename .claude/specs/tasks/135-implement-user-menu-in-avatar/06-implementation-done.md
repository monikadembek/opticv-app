# Implementation Done – Task 135: Implement user menu in avatar

Context loaded: role.md, rules.md, conventions.md.
Preconditions: spec review result is `PASS WITH ISSUES`; implementation plan exists.

## Summary

The avatar in the top header is now a keyboard-focusable button that toggles a PrimeNG popup `p-menu` (`appendTo="body"`). The `pi-power-off` Sign Out button was removed from the header. The menu has a Plan & Billing group (tier shown in the group label, with an Upgrade or Manage subscription action), a separator, and a Profile group (Account Settings, Sign Out). `TopHeader` now injects `UserSettingsApiService` and `BillingRedirectService`. Unit tests in `top-header.spec.ts` were updated. Frontend only; no backend, DB or shared-type changes.

## Specification Coverage

| # | Requirement | Status | Note |
|---|---|---|---|
| 1 | Avatar is a keyboard-accessible button toggling a popup `p-menu` (`[popup]="true"`) | Implemented | Native `<button>` wrapping `p-avatar` |
| 2 | Menu entry: Account settings → `/settings` | Implemented | Labeled "Account Settings", in the Profile group |
| 3 | Menu entry: Plan & billing shows the current tier | Implemented | Tier is in the group label: "Plan & Billing · {Free/Basic/Pro} Plan" |
| 4 | FREE tier: Upgrade → `/pricing` | Implemented | |
| 5 | BASIC / PRO tier: Manage subscription → `BillingRedirectService.openPortal()` | Implemented | |
| 6 | Menu entry: Sign out emits existing `signOut` output | Implemented | Labeled "Sign Out" |
| 7 | Menu entries in the order Account settings, Plan & billing, Sign out | Not implemented | Order is Plan & Billing, separator, Account Settings, Sign Out |
| 8 | `pi-power-off` Sign Out button removed from the header | Implemented | |
| 9 | Keep `signout_button_clicked` PostHog event (place: `user menu`) | Implemented | |
| 10 | Add click events for the other menu entries | Not implemented | The plan decided not to add them, following the spec review |
| 11 | Update `top-header.spec.ts` (and `app.spec.ts` if needed) | Implemented | `app.spec.ts` unchanged; the plan states it stubs `app-top-header` |
| 12 | Logged-out header unchanged; menu not rendered | Implemented | |
| 13 | Avatar button: `aria-label` "Open user menu", `aria-haspopup="menu"`, `aria-controls` and `aria-expanded` bound to popup state | Implemented | `aria-controls` is set only while the menu is open |
| 14 | Old `title="Account settings"` and `routerLink` removed from the avatar | Implemented | |
| 15 | Escape / outside click closes the popup; arrow keys navigate | Implemented | Relies on PrimeNG `p-menu` default behavior |
| 16 | Selecting an item performs its action | Implemented | |
| 17 | Manage subscription disabled while `redirectingToPortal()` is true | Implemented | Upgrade is not disabled in that state |
| 18 | Tier derived via `computed()` from `userProfile.value()?.subscription?.tier`; menu model is a `computed()` | Implemented | |
| 19 | Tier label displays Free / Basic / Pro | Implemented | |
| 20 | Unknown tier (loading, failed, or missing `subscription`): no tier label, billing action disabled, other entries usable | Implemented | Billing item remains in the menu with label "Plan & Billing" |
| 21 | `p-menu` uses `appendTo="body"` | Implemented | |
| 22 | Menu closes when the header switches to the logged-out view | Implemented | `isUserMenuOpen` is reset by an `effect` on logout |
| 23 | Menu available wherever the header renders for a logged-in user | Implemented | |
| 24 | No backend / API / DB changes | Implemented | |
| 25 | Unit tests: sign-out button absent | Implemented | Logged-in and logged-out cases |
| 26 | Unit tests: menu structure | Implemented | Spec lists "three entries"; tests check the group, separator and Profile order |
| 27 | Unit tests: FREE → Upgrade → `/pricing` | Implemented | |
| 28 | Unit tests: BASIC/PRO → Manage subscription → `openPortal()` | Implemented | |
| 29 | Unit tests: unknown tier disables the billing action | Implemented | Missing profile and missing subscription cases |
| 30 | Unit tests: Sign out emits `signOut` | Implemented | |
| 31 | Unit tests: Account settings navigates to `/settings` | Implemented | |
| 32 | Unit tests: avatar ARIA attributes | Implemented | |
| 33 | Build, lint, typecheck pass; existing tests pass | Not recorded | This report does not record command results |

## Files

**Created (task documents):**

- `.claude/specs/tasks/135-implement-user-menu-in-avatar/00-raw-task.md`
- `.claude/specs/tasks/135-implement-user-menu-in-avatar/02-spec.md`
- `.claude/specs/tasks/135-implement-user-menu-in-avatar/03-spec-review.md`
- `.claude/specs/tasks/135-implement-user-menu-in-avatar/04-implementation-plan.md`
- `.claude/specs/tasks/135-implement-user-menu-in-avatar/05-code-review.md`
- `.claude/specs/tasks/135-implement-user-menu-in-avatar/06-implementation-done.md` (this file)

**Modified:**

- `apps/opticv-web/src/app/layout/top-header/top-header.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.html`
- `apps/opticv-web/src/app/layout/top-header/top-header.css`
- `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts`
- `docs/tasks-list.md`

## Components

| Component (from plan) | Status |
|---|---|
| `TopHeader` (`top-header.ts` / `.html` / `.css`) | Exist |
| Avatar button (`.header__avatar-button`) | Exist |
| User menu (`p-menu` popup, `#userMenu`) | Exist |

## Stores

The plan lists no stores. `UserGuideStore`, `UserSettingsApiService` and `BillingRedirectService` already existed and are used as they were.

| Store | Status |
|---|---|
| None planned | n/a |

## Deviations

- The plan described a single "Plan & billing" menu item with the tier in its label and the action as secondary text. The implementation uses a "Plan & Billing · {Tier} Plan" group label with one child item ("Upgrade" or "Manage subscription").
- The plan and spec described three entries (Account settings, Plan & billing, Sign out). The implementation groups them as Plan & Billing, separator, then a "Profile" group with Account Settings and Sign Out.
- The Plan & Billing group appears before Account Settings, so the order differs from the spec.
- Labels use title case: "Account Settings", "Sign Out", "Plan & Billing".
- The plan had no signal for popup state. The implementation adds `isUserMenuOpen` (set by `onShow` / `onHide`, reset by an `effect` on logout) and `userMenuId`. `aria-controls` is bound only while the menu is open.
- Menu items carry icons (`pi-credit-card`, `pi-user`, `pi-power-off`), which the plan did not specify.
- `userMenu` is `private`, and the plan's separate tier display-name `computed` is a `TIER_LABELS` constant.
- Tests cover the structure above. Extra tests: `aria-controls` only while open, menu id not on the `p-menu` host, and `isUserMenuOpen` reset on logout.

## Additional Implementation

Additional implementation not covered by the original documents:

- `isUserMenuOpen` signal, `userMenuId` constant, and the logout-reset `effect` in `top-header.ts`.
- `docs/tasks-list.md`: a Task 135 entry was added, and the heading of the previous entry was changed from "134. Make the information about subscription plans more visible" to "Task to make the information about subscription plans more visible".
- `.claude/specs/tasks/135-implement-user-menu-in-avatar/05-code-review.md` (task document).
