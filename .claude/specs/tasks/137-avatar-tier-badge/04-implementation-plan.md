# Implementation Plan – Task 137: Show small tier badge on the avatar

Spec review result: PASS WITH ISSUES (no blockers). This is frontend only (`apps/opticv-web`), with no backend, DB or shared-type changes.

All paths below are relative to `apps/opticv-web/src/app/`.

## Files

| Action | File |
| --- | --- |
| Modify | `layout/top-header/top-header.ts` |
| Modify | `layout/top-header/top-header.html` |
| Modify | `layout/top-header/top-header.css` |
| Modify | `layout/top-header/top-header.spec.ts` |

Not touched: `PlanUsageStore`, `UserSettingsApiService`, `app.ts` / `app.html`, the Settings page, `@opticv/datatypes`, the backend.

## Resolved review items (decisions within spec limits)

- **Implementation choice (review #5, #6):** use a custom `<span>` pill, not PrimeNG `OverlayBadge`. The span gives full control over the text pill, per-tier colors and `aria-hidden`, and adds no new PrimeNG import.
- **Styling approach (review #4):** use Tailwind utility classes chosen from a typed `Record<SubscriptionTier, string>` map in `top-header.ts`, and apply them with a `[class]`-style binding (no `ngClass`). Proposed shades from the spec:
  - FREE → `bg-slate-100 text-slate-700`
  - BASIC → `bg-sky-100 text-sky-800`
  - PRO → `bg-amber-100 text-amber-800`

  Positioning and shape go in `top-header.css` under a BEM class `header__tier-badge`, which matches the existing `header__*` naming.
- **Test hook (review #5):** tests locate the badge with the `header__tier-badge` class and check the tier-specific color classes from the map (for example `bg-amber-100` for PRO).
- **Reload behavior (review #2):** the badge follows `PlanUsageStore.effectiveTier()` as it is. While `userProfile` reloads, the resource keeps its previous value, so the badge keeps showing the previous tier until the new value arrives. The badge is hidden only while `effectiveTier()` is `null` (initial load, error, no subscription), which matches the spec's Visibility rules. No extra loading-state logic is added.
- **"Initials" wording (review #1):** `userLabel()` is a single character. This does not change the plan, because the pill is sized for its own text, and "Basic" is the longest label.
- **Mobile overflow (review #3):** the pill overflows the avatar's right edge by at most `0.25rem`, which is less than the button's existing `margin-right: 0.5rem`. Verify manually at a 320px viewport width that there is no horizontal scroll and no clipping. The existing margin stays unchanged unless that check fails.
- **SSR (review #7):** no special handling. `userProfile` is gated on a Supabase session, so `effectiveTier()` is `null` on the server and the `@if` renders nothing there.

## Steps

### 1. `top-header.ts`

1. Inject `PlanUsageStore` (from `../../core/stores/plan-usage.store`) with `inject()`, as a `private readonly` field.
2. Add a module-level constant `TIER_BADGE_CLASSES: Record<SubscriptionTier, string>` with the three Tailwind class strings above, next to the existing `TIER_LABELS`.
3. Add these computed signals:
   - `readonly badgeTier = computed(() => this.planUsageStore.effectiveTier())`. Its type is `SubscriptionTier | null`, and it must never be treated as non-null.
   - `readonly badgeLabel = computed(() => …)`: `TIER_LABELS[tier]` when `badgeTier()` is non-null, otherwise `null`.
   - `readonly badgeClass = computed(() => …)`: `TIER_BADGE_CLASSES[tier]` when non-null, otherwise an empty string.
   - `readonly avatarButtonAriaLabel = computed(() => …)`: `` `Open user menu, ${label} plan` `` when `badgeLabel()` is non-null, otherwise `'Open user menu'`.
4. Leave the existing private raw `tier` computed and the `userMenuItems` logic unchanged.

### 2. `top-header.html`

1. On `button.header__avatar-button`, replace the static `aria-label="Open user menu"` with `[attr.aria-label]="avatarButtonAriaLabel()"`. Keep `aria-haspopup`, `aria-controls` and `aria-expanded` as they are.
2. Inside the button, after `<p-avatar>`, add `@if (badgeLabel(); as label) { … }`. It renders `<span class="header__tier-badge" [class]="…" aria-hidden="true">{{ label }}</span>`, combining the static `header__tier-badge` class with `badgeClass()` so that the static class is kept. Use a single `[class]` binding that concatenates both, or a static `class` attribute plus a `[class]` binding, whichever Angular merges correctly. The test must verify that both classes are present.

### 3. `top-header.css`

1. Add `position: relative;` to `.header__avatar-button`.
2. Add `.header__tier-badge` with:
   - `position: absolute`, anchored bottom-right, with `bottom` and `right` offsets of about `-0.25rem`, so the pill overlaps the avatar's corner and overflows by at most `0.25rem`.
   - `font-size: 0.625rem` (10px), `font-weight: 600`, `line-height: 1`, `padding: 0.125rem 0.375rem`, `border-radius: 9999px`, `white-space: nowrap`.
   - A white ring, `box-shadow: 0 0 0 2px #ffffff`, which keeps the button's focus-visible outline intact. Do not use `border`, because it would change the box size.
   - `pointer-events: none`, so clicks always go to the button.
3. Do not change any other rules.

### 4. `top-header.spec.ts`

The `PlanUsageStore` is root-provided and derives from the mocked `UserSettingsApiService.userProfile.value` signal, so tests drive it through the existing `profile` signal. No new provider is needed. Use a helper such as `withSubscription(tier, status)` that sets `profile` to `{ subscription: { tier, status } }`.

Add a `describe('tier badge')` block with these tests:

1. When logged out, no `.header__tier-badge` element is rendered.
2. When logged in with `profile` set to `null`, there is no badge, and the button's `aria-label` is `'Open user menu'`.
3. When logged in with `subscription: null`, there is no badge.
4. For FREE / ACTIVE, BASIC / ACTIVE and PRO / ACTIVE, the badge text is `Free`, `Basic` or `Pro`, and it has the matching color class (`bg-slate-100`, `bg-sky-100` or `bg-amber-100`).
5. PRO / TRIALING shows `Pro`.
6. PRO / PAST_DUE and PRO / CANCELED show `Free`.
7. For PRO / ACTIVE, the button's `aria-label` is `'Open user menu, Pro plan'`.
8. The badge has `aria-hidden="true"` and is a descendant of `button.header__avatar-button`.
9. Reactivity: change `profile` from FREE / ACTIVE to PRO / ACTIVE and run `detectChanges`, then check that the badge text updates to `Pro`.

Check the existing tests:

- The `aria-label` assertion at about line 173 (`'Open user menu'`, with `profile` set to `null`) still passes.
- The menu-label tests that use `withTier(tier)` without a status are unaffected, because the menu still uses the raw tier.

### 5. Verification

1. Run `npm exec nx test opticv-web`.
2. Run `npm exec nx lint opticv-web`.
3. Run `npm exec nx typecheck opticv-web`.
4. Run `npm exec nx build opticv-web`.
5. Check manually in the dev server:
   - The badge appears for each tier.
   - It is hidden while logged out.
   - Clicking the badge opens the user menu.
   - The focus-visible outline is intact.
   - At 320px width there is no horizontal scroll and the pill is not clipped.
   - An SSR page load causes no hydration warnings in the console.

## Acceptance checklist

- [ ] The badge is rendered only when the user is logged in and `effectiveTier()` is non-null.
- [ ] The labels Free / Basic / Pro come from `TIER_LABELS`, and each has its own AA-contrast color.
- [ ] PAST_DUE and CANCELED paid subscriptions show Free.
- [ ] The badge has `aria-hidden="true"`, and the button's `aria-label` includes the plan when it is known.
- [ ] Clicking the badge opens the user menu, and the menu's behavior is unchanged.
- [ ] No layout shift, clipping or horizontal scroll at 320px or wider.
- [ ] All new and existing `top-header.spec.ts` tests pass, and lint, typecheck and build pass.
