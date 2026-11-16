# Code Review – Task 137: Show small tier badge on the avatar

Reviewed commit: `bc50b2a` (diff `HEAD~1..HEAD`).

Files reviewed:

- `apps/opticv-web/src/app/layout/top-header/top-header.ts`
- `apps/opticv-web/src/app/layout/top-header/top-header.html`
- `apps/opticv-web/src/app/layout/top-header/top-header.css`
- `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts`

Checks run during review:

- `npm exec nx test opticv-web`: 68 files passed, 1479 tests passed, 10 skipped
- `npm exec nx lint opticv-web`: passed
- `prettier --check` on `layout/top-header/`: passed
- `typecheck` and `build` were not run during this review.

### Summary

- Overall result: **PASS WITH ISSUES**
- The change is small and does only what the task asks. It uses `PlanUsageStore.effectiveTier`, computed signals, `aria-hidden` on the badge, and a dynamic `aria-label`. It adds no `ngClass`, decorators or `standalone: true`. The tests cover every behavior the spec's acceptance criteria list. There are no critical issues. The main finding is that the badge's CSS offsets differ from the plan, so the badge sticks out further than the plan assumed. That makes the 320px manual check more important. The other findings are minor style and typing points.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`top-header.css:142–143`**: there is no blank line between the `.header__avatar-button:focus-visible` rule and the new `.header__tier-badge` rule. Every other rule in the file is separated by a blank line. Prettier does not flag this, because it keeps blank lines but does not add them.
2. **`top-header.spec.ts:280`**: the `withSubscription(tier: string, status: string)` helper uses plain `string` types, so a typo such as `'PRO '` or `'ACTIVEE'` would still compile. Using `SubscriptionTier` and the subscription-status type from `@opticv/datatypes` would let the type checker catch these. The `profile` signal is typed as `unknown`, so nothing else catches them. **Fixed:** the helper and both `it.each` tables are now typed with `SubscriptionTier` and `SubscriptionStatus`.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Badge hidden when logged out | Covered | The badge is inside the `@else` (logged-in) branch, `html:32–63`. Test at `spec.ts:289`. |
| Badge hidden when `effectiveTier` is `null` (loading, error, no subscription) | Covered | `@if (badgeLabel(); as label)`, `html:56`. Tests at `spec.ts:301` and `spec.ts:309`. |
| Labels from `TIER_LABELS` (Free/Basic/Pro) | Covered | `ts:74–77`. Parameterized test at `spec.ts:315`. |
| Effective tier: PAST_DUE/CANCELED → Free, TRIALING → actual tier | Covered | Comes from `PlanUsageStore.effectiveTier`. Tests at `spec.ts:330` and `spec.ts:336`. |
| Pill over the avatar's bottom-right corner, inside the button | Covered | `css:143–155`, `html:56–63`. The offsets differ from the plan (see Plan Deviations). |
| Button is `position: relative`; no layout change | Covered | `css:129`. The badge is absolutely positioned, so it is out of flow. |
| Small semibold type, compact padding, rounded, white ring | Covered | `css:147–153`. The ring uses `box-shadow`, not `border`, as planned. |
| Badge never intercepts clicks | Covered | `pointer-events: none`, `css:154`. |
| Per-tier colors with ≥4.5:1 contrast | Covered | slate-700/slate-100, sky-800/sky-100 and amber-800/amber-100 are all well above 4.5:1. |
| Reactivity (updates without refresh, disappears on sign-out) | Covered | Built from computed signals. Test at `spec.ts:360`. |
| Badge `aria-hidden="true"` | Covered | `html:60`. Test at `spec.ts:353`. |
| `aria-label` includes the plan when known, else "Open user menu" | Covered | `ts:84–87`, `html:45`. Tests at `spec.ts:301` and `spec.ts:345`. |
| Existing `aria-haspopup` / `aria-expanded` / `aria-controls` unchanged | Covered | `html:46–48` unchanged. |
| SSR: no badge on the server, no hydration mismatch | Partial | Correct by design, because `effectiveTier` is `null` without a session. Nothing shows that the planned manual hydration check was done. |
| No overflow or clipping at narrow widths | Partial | Should hold (see Plan Deviations). Nothing shows that the planned 320px manual check was done. |
| Menu "Plan & Billing" label keeps using the raw tier | Covered | The private `tier` computed and `userMenuItems` are unchanged, `ts:68–70` and `ts:89–127`. |
| Settings-page avatar unchanged | Covered | Not touched. |
| Unit tests in `top-header.spec.ts` | Covered | All acceptance test cases are present and passing. |

### Plan Deviations

1. **Badge offsets (`top-header.css:145–146`).** The plan said `right` and `bottom` should be about `-0.25rem`, so the pill would stick out by at most `0.25rem`, which is less than the button's `margin-right: 0.5rem`. The code uses `right: -0.75rem; bottom: -0.5rem`. The pill now sticks out `0.75rem` to the right, which is `0.25rem` more than the margin. It should still fit, because the header container has at least `20px` of side padding, and the spec allows overflow up to "margin plus container padding". But the plan's reason for skipping a margin change no longer holds, so the 320px no-horizontal-scroll check is now required, not optional.
2. **The plan's manual verification items (`04-implementation-plan.md` §5.5) are not documented.** These are the 320px width, the focus-visible outline, clicking the badge, and SSR hydration warnings. There is no `05-implementation-done.md` yet that records them.

### Null Safety Issues

None. `badgeTier` stays `SubscriptionTier | null` and is narrowed before each lookup (`ts:76`, `ts:81`). `toggleUserMenu` keeps its existing `?.` guard. The test helpers use `?.` and `?? null` correctly.

### Code Smells

1. **`top-header.ts:72`**: `badgeTier` only passes through `planUsageStore.effectiveTier()` and adds no logic. The plan asked for it, so this is not a deviation, but `badgeLabel` and `badgeClass` could read the store directly. Optional.
2. **`top-header.css:149`**: the ring color is hard-coded as `#ffffff`. This matches the existing hex values in the template (`#10b981`, `#ffffff`, `html:53`), but the color is not a design token. Minor.

### Recommendation

- **Merge as-is**, after the planned manual checks are done (320px with the larger offsets, focus outline, SSR hydration). Fixing the two non-critical items is optional and can happen in the same pass.
