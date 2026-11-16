# Task Specification

## Source

Azure DevOps Task: 137 – Show small tier badge on the avatar

Raw task: "Show a small tier badge (Free/Basic/Pro) next to the avatar for logged-in users."

## Goal

In the top header, show a small text pill on the logged-in user's avatar with their current plan: **Free**, **Basic** or **Pro**. The pill overlaps the avatar's bottom-right corner. Each tier has its own color, and the pill shows the user's **effective** tier, meaning the plan whose features they can actually use right now.

## Context

- This is a frontend-only change in `apps/opticv-web`. Backend, database and shared types do not change.
- **Avatar location:** `layout/top-header/top-header.{ts,html,css}`. In the logged-in branch of the menubar `#end` template, a `<button class="header__avatar-button">` (with `aria-label="Open user menu"`, `aria-haspopup`, `aria-expanded` and `aria-controls`) wraps a circular `p-avatar` that shows `userLabel()`. Clicking it toggles the popup `p-menu` user menu.
- **Tier data:**
  - `PlanUsageStore.effectiveTier` (`core/stores/plan-usage.store.ts`, root-provided) is a `computed<SubscriptionTier | null>`. It is derived from `UserSettingsApiService.userProfile` via `getEffectiveTier(tier, status)` from `@opticv/datatypes`. It returns `tier` for ACTIVE or TRIALING subscriptions, `'FREE'` for PAST_DUE or CANCELED ones, and `null` when there is no profile or subscription yet (loading, error or missing).
  - `TopHeader` already has a private `tier` computed (the **raw** tier) and a `TIER_LABELS: Record<SubscriptionTier, string>` map (`FREE → 'Free'`, `BASIC → 'Basic'`, `PRO → 'Pro'`). The user menu's "Plan & Billing · X Plan" label uses these.
- `SubscriptionTier = 'FREE' | 'BASIC' | 'PRO'` in `@opticv/datatypes`.
- The project has PrimeNG 21 (Aura), Tailwind 4, and colors defined as CSS variables such as `--color-primary`.

## Scope

### In scope

- A tier badge (pill) on the top-header avatar, shown only when the user is logged in and the effective tier is known.
- A label and a color style for each tier.
- An accessible name for the avatar button that includes the plan.
- Unit tests in `top-header.spec.ts`.

### Out of scope

- Backend, API, database or shared-type changes.
- The avatar on the Settings page (`features/settings`). It does not get a badge.
- The user-menu "Plan & Billing · X Plan" label. It keeps using the raw tier and is not changed.
- Making the badge separately clickable or interactive.
- Tooltips, animations, or extra status details such as past-due or cancel-at-period-end.
- Badges anywhere else, such as the mobile menu or other pages, unless they render the same `TopHeader` avatar.

## Behavior

1. **Visibility**
   - When the user is logged out (`isLoggedIn() === false`), there is no avatar and no badge. This is the existing behavior.
   - When the user is logged in and `PlanUsageStore.effectiveTier()` is `null` (profile loading, request failed, or no subscription record), the avatar shows and the badge is **hidden**. The badge never shows a placeholder or default tier.
   - When the user is logged in and the effective tier is known, the badge shows.
2. **Content:** the label comes from the existing `TIER_LABELS` map: `Free`, `Basic` or `Pro`.
3. **Tier source:** the effective tier. A PRO or BASIC user whose subscription is PAST_DUE or CANCELED sees **Free**. ACTIVE and TRIALING subscriptions show their actual tier.
4. **Placement:** the pill is absolutely positioned over the avatar's bottom-right corner, partly outside the avatar circle, roughly like this:
   ```
      ( MD )
          [Pro]
   ```
   - The badge sits inside the existing `header__avatar-button`, so clicking it opens the user menu just like clicking the avatar.
   - The button becomes a positioning context (`position: relative`). The badge must not change the button's layout size or move the other header items.
   - The pill uses small type (about 10–11px, semibold), a compact horizontal padding, a fully rounded shape, and a thin white ring/border so it stays readable over the avatar.
   - The pill must stay fully visible: the header must not clip it, and its focus outline must still cover the whole button.
5. **Colors (one per tier).** These are the proposed tokens. The final shades may be adjusted, but the text and background in each pair must keep at least 4.5:1 contrast (WCAG AA):
   - **Free:** neutral, light grey background with dark grey text (for example Tailwind `bg-slate-100 text-slate-700`).
   - **Basic:** info blue (for example `bg-sky-100 text-sky-800`).
   - **Pro:** accent amber (for example `bg-amber-100 text-amber-800`).
6. **Reactivity:** the badge follows `effectiveTier` as a signal. When the profile reloads (for example after a checkout, a cancellation or a sign-in), the badge updates without a page refresh. On sign-out it disappears together with the avatar.
7. **Accessibility**
   - The badge is visual only and has `aria-hidden="true"`.
   - When the tier is known, the button's `aria-label` includes the plan, for example `"Open user menu, Pro plan"`. When the tier is unknown, it stays `"Open user menu"`.
   - Existing `aria-haspopup`, `aria-expanded` and `aria-controls` behavior and keyboard focus do not change.
8. **SSR:** the profile resource is not available during server rendering, so the server-rendered HTML contains no badge. The badge appears on the client once the tier is known, and this must not cause a hydration mismatch error.

## Edge Cases

- **No subscription record** (`subscription === null`): `effectiveTier` is `null`, so the badge is hidden. This follows the "Hide badge" answer. It does not default to Free.
- **Profile request fails:** the badge is hidden, and no error UI appears in the header.
- **PAST_DUE or CANCELED paid plan:** the badge shows **Free**, while the menu label still shows the raw tier (for example "Pro Plan"). Users may see "Free" on the badge and "Pro Plan" in the menu at the same time. This is accepted for this task (see Assumptions).
- **Tier changes while the user menu is open:** the badge and aria-label update. The menu items update too, through the existing computed.
- **Long avatar labels:** `userLabel()` is short (initials), so the pill only needs to fit the longest label, "Basic".
- **Narrow or mobile widths:** the badge must not overflow the viewport or create horizontal scroll. The avatar sits at the right edge with a `0.5rem` right margin, so check that the pill's overflow fits within that margin plus the container padding, and adjust the margin if needed.

## Data / API

- **Endpoints:** none new. This reuses the existing `UserSettingsApiService.userProfile` resource through `PlanUsageStore`.
- **Models:** none new. Uses `SubscriptionTier` and `getEffectiveTier` from `@opticv/datatypes`.
- **DB changes:** none.
- **Frontend changes:**
  - `TopHeader`: inject `PlanUsageStore` and expose computed signals for the badge, for example `badgeTier`, `badgeLabel` (from `TIER_LABELS`), and `avatarButtonAriaLabel`.
  - `top-header.html`: render the badge inside `header__avatar-button`, wrapped in an `@if`, using `class` bindings for the per-tier styling (no `ngClass`).
  - `top-header.css`: add `position: relative` to `.header__avatar-button` and add the badge positioning styles. Per-tier colors use Tailwind utilities or CSS classes that follow the existing conventions.
- **Possible implementation choice (to settle in the plan):** use a custom `<span>` pill (recommended, because it gives full control over text and colors) or PrimeNG `OverlayBadge` (`primeng/overlaybadge`), if it can render the text pill with the required per-tier colors and contrast.

## Assumptions

- "Next to the avatar" means the overlapping-corner pill the user chose. It does not mean a separate inline element.
- The badge appears **only** on the top-header avatar.
- The PAST_DUE or CANCELED mismatch between the badge (effective tier) and the menu label (raw tier) is acceptable. Aligning the menu label is out of scope.
- The past-due banner (`layout/past-due-banner`) remains the place that explains the past-due state. The badge does not add any past-due indicator.
- The exact color shades are proposals. Any shades are acceptable if they keep the neutral / blue / amber distinction and meet AA contrast.

## Acceptance (DEV)

- `npm exec nx build opticv-web`, `lint`, `typecheck` and `test` pass.
- New unit tests in `top-header.spec.ts` cover:
  - The badge is not rendered when logged out.
  - The badge is not rendered when the user is logged in but `effectiveTier` is `null`.
  - The badge shows "Free", "Basic" and "Pro", each with its tier-specific class.
  - A PAST_DUE or CANCELED PRO subscription shows "Free".
  - The avatar button's `aria-label` includes the plan when known, and falls back to "Open user menu" when not.
  - The badge has `aria-hidden="true"` and sits inside the avatar button.
- Existing top-header tests still pass, with the `PlanUsageStore` or `userProfile` mock updated as needed.
- No AXE violations: contrast is AA and button semantics do not change.
- No breaking changes to the user menu, sign-out or help button behavior.
