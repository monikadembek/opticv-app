# Implementation Done – Task 137: Show small tier badge on the avatar

Commits: `bc50b2a` (Task 137: Show tier badge on avatar), `cc9f50e` (Task 137: Fix issues after code review).

Inputs: `02-spec.md`, `03-spec-review.md` (**PASS WITH ISSUES**), `04-implementation-plan.md`, `05-code-review.md`.

## Summary

A small text pill showing the user's effective plan (**Free**, **Basic** or **Pro**) was added to the top-header avatar for logged-in users. `TopHeader` now injects `PlanUsageStore` and exposes the `badgeTier`, `badgeLabel`, `badgeClass` and `avatarButtonAriaLabel` computed signals. The template renders an `aria-hidden` `<span class="header__tier-badge">` inside the avatar button only when the effective tier is known. Each tier gets Tailwind color classes from a `TIER_BADGE_CLASSES` map. The avatar button's `aria-label` includes the plan when it is known. The pill is positioned in `top-header.css`. A `tier badge` test block was added to `top-header.spec.ts`. The change is frontend only.

## Specification Coverage

| # | Requirement | Status | Note |
| --- | --- | --- | --- |
| 1 | No avatar and no badge when logged out | Implemented | The badge is inside the `@else` (logged-in) branch. Test: "should not render the badge when logged out". |
| 2 | Badge hidden when logged in and `effectiveTier()` is `null` (loading, error, no subscription) | Implemented | `@if (badgeLabel(); as label)`. Tests cover `profile = null` and `subscription: null`. |
| 3 | Badge shown when logged in and the effective tier is known | Implemented | |
| 4 | Label comes from `TIER_LABELS` (Free / Basic / Pro) | Implemented | `badgeLabel` computed. |
| 5 | Tier source is the effective tier: PAST_DUE/CANCELED → Free, ACTIVE/TRIALING → actual tier | Implemented | Read from `PlanUsageStore.effectiveTier()`. Tests cover TRIALING, PAST_DUE and CANCELED. |
| 6 | Pill absolutely positioned over the avatar's bottom-right corner, inside `header__avatar-button` | Implemented | `.header__tier-badge` uses `right: -0.75rem` and `bottom: -0.5rem`. |
| 7 | Button is a positioning context (`position: relative`), with no change to layout size | Implemented | `position: relative` was added to `.header__avatar-button`. The badge is absolutely positioned. |
| 8 | Small semibold type, compact padding, fully rounded, thin white ring | Implemented | `font-size: 0.625rem`, `font-weight: 600`, `padding: 0.125rem 0.375rem`, `border-radius: 9999px`, `box-shadow: 0 0 0 2px #ffffff`. |
| 9 | Clicking the badge opens the user menu like the avatar | Implemented | The badge is inside the button and has `pointer-events: none`. |
| 10 | Per-tier colors: Free neutral, Basic blue, Pro amber, each with at least 4.5:1 contrast | Implemented | `bg-slate-100 text-slate-700`, `bg-sky-100 text-sky-800`, `bg-amber-100 text-amber-800`. |
| 11 | Reactivity: the badge updates when the profile reloads and disappears on sign-out | Implemented | Uses computed signals. Test: "should update when the tier changes". |
| 12 | Badge has `aria-hidden="true"` | Implemented | Tested. |
| 13 | `aria-label` is "Open user menu, X plan" when the tier is known, otherwise "Open user menu" | Implemented | `[attr.aria-label]="avatarButtonAriaLabel()"`. Tested. |
| 14 | `aria-haspopup`, `aria-expanded`, `aria-controls` and focus behavior unchanged | Implemented | These attributes were not modified. |
| 15 | SSR: no badge in the server HTML, no hydration mismatch | Implemented | `effectiveTier()` is `null` without a session, so `@if` renders nothing. A manual hydration check is not recorded. |
| 16 | No overflow or horizontal scroll at narrow or mobile widths | Implemented | The right margin was not changed. A manual 320px check is not recorded. |
| 17 | Menu "Plan & Billing · X Plan" label keeps using the raw tier | Implemented | The private `tier` computed and `userMenuItems` are unchanged. |
| 18 | No badge on the Settings-page avatar | Implemented | Not touched. |
| 19 | Unit tests in `top-header.spec.ts` for all acceptance cases | Implemented | The `describe('tier badge')` block has 9 test cases (some parameterized). |
| 20 | Existing top-header tests still pass | Implemented | `05-code-review.md` reports 1479 tests passed. |
| 21 | No backend, API, DB or shared-type changes | Implemented | Only `apps/opticv-web` source changed. |

## Files

### Created

- `.claude/specs/tasks/137-avatar-tier-badge/00-raw-task.md`
- `.claude/specs/tasks/137-avatar-tier-badge/02-spec.md`
- `.claude/specs/tasks/137-avatar-tier-badge/03-spec-review.md`
- `.claude/specs/tasks/137-avatar-tier-badge/04-implementation-plan.md`
- `.claude/specs/tasks/137-avatar-tier-badge/05-code-review.md`
- `.claude/specs/tasks/137-avatar-tier-badge/06-implementation-done.md`

### Modified

- `apps/opticv-web/src/app/layout/top-header/top-header.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.html`
- `apps/opticv-web/src/app/layout/top-header/top-header.css`
- `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts`

## Components

| Component / element | Status |
| --- | --- |
| `TopHeader` (modified): `PlanUsageStore` injection | Exist |
| `TopHeader`: `TIER_BADGE_CLASSES` constant | Exist |
| `TopHeader`: `badgeTier` computed | Exist |
| `TopHeader`: `badgeLabel` computed | Exist |
| `TopHeader`: `badgeClass` computed | Exist |
| `TopHeader`: `avatarButtonAriaLabel` computed | Exist |
| Template: `span.header__tier-badge` inside `button.header__avatar-button` | Exist |
| Styles: `.header__tier-badge` and `position: relative` on `.header__avatar-button` | Exist |

## Stores

| Store | Status | Note |
| --- | --- | --- |
| `PlanUsageStore` (existing, consumed via `effectiveTier`) | Exist | Not modified, as planned. |

## Deviations

1. **Badge offsets:** the plan specified `right` and `bottom` of about `-0.25rem`. The code uses `right: -0.75rem` and `bottom: -0.5rem`. `margin-right: 0.5rem` on `.header__avatar-button` is unchanged.
2. **Manual verification (plan §5.5):** none of the planned manual checks are recorded. These are the per-tier display, the focus-visible outline, clicking the badge, the 320px width and the SSR hydration warnings.
3. **Verification commands (plan §5.1–5.4):** `05-code-review.md` records that `test` and `lint` passed. `typecheck` and `build` are not recorded as run.
4. **Test helper typing:** after the code review, the `withSubscription` helper and the `it.each` tables were typed with `SubscriptionTier` and `SubscriptionStatus` from `@opticv/datatypes` (commit `cc9f50e`).
5. **Formatting:** after the code review, a blank line was added between `.header__avatar-button:focus-visible` and `.header__tier-badge` (commit `cc9f50e`).

## Additional Implementation

None.
