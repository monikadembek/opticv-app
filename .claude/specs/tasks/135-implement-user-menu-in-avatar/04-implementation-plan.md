# Implementation Plan – Task 135: Implement user menu in avatar

Spec review result: PASS WITH ISSUES (no blockers). Frontend only (`apps/opticv-web`). No backend, DB or shared-type changes.

## Files

| Action | File |
| --- | --- |
| Modify | `apps/opticv-web/src/app/layout/top-header/top-header.ts` |
| Modify | `apps/opticv-web/src/app/layout/top-header/top-header.html` |
| Modify | `apps/opticv-web/src/app/layout/top-header/top-header.css` (only if avatar button needs reset styling) |
| Modify | `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts` |

Verified: `app.spec.ts` stubs `app-top-header` with an empty template, so it needs no change. `app.ts` / `app.html` stay untouched, because the `signOut` output contract is unchanged.

## Resolved review items (decisions within spec limits, no new requirements)

- **Plan & billing structure:** a single menu item. Its label shows "Plan & billing" and the tier name. The item itself is the action: clicking it runs Upgrade (FREE) or Manage subscription (BASIC/PRO). The action text is shown as the item's secondary text.
- **Unknown tier:** the item shows the label "Plan & billing" with no tier text and `disabled: true`.
- **Tier display:** Free / Basic / Pro, rendered as plain inline text in the item template.
- **Analytics:** keep the existing `signout_button_clicked` event (place `user menu`). Per review, do not add new events beyond that (not grounded in the task).
- **Past-due / cancel-at-period-end:** no special handling; paid tier means Manage subscription.

## Steps

### 1. `top-header.ts`

1. Add imports: `computed`, `viewChild`; `MenuModule` and `Menu` from `primeng/menu`; `UserSettingsApiService`; `BillingRedirectService`. Add `MenuModule` to `imports`.
2. Inject `UserSettingsApiService` and `BillingRedirectService` with `inject()`.
3. Add `userMenu = viewChild<Menu>('userMenu')` for the popup reference.
4. Add `tier = computed(...)`: reads `userProfile.value()?.subscription?.tier`, returns `undefined` when absent (never assume non-null).
5. Add a tier display-name lookup (FREE→Free, BASIC→Basic, PRO→Pro) used by a computed.
6. Add `userMenuItems = computed<MenuItem[]>(...)` returning, in order:
   - Account settings → `command` calls `router.navigate(['/settings'])`.
   - Plan & billing → label includes tier name when known; `disabled` when tier unknown, or `redirectingToPortal()` is true for paid tiers; `command` → `router.navigate(['/pricing'])` for FREE, `billingRedirectService.openPortal()` for BASIC/PRO.
   - Separator, then Sign out → `command` calls `emitSignOut()`.
7. Add `toggleUserMenu(event: Event)` that calls `userMenu()?.toggle(event)`.
8. Update `emitSignOut()` analytics payload: `place: 'user menu'`, keep `button_title: 'Sign Out'`.
9. Keep `isLoggedIn`, `userLabel`, `signOut`, `items`, `openHelp`, `navigateToLoginPage` unchanged.

### 2. `top-header.html`

1. Replace `<p-avatar ... routerLink="/settings">` and the `pi-power-off` `p-button` with:
   - A native `<button type="button">` wrapping `<p-avatar>` (same label, green background style, circle shape), with `aria-label="Open user menu"`, `aria-haspopup="menu"`, `[attr.aria-expanded]` bound to menu visibility, `aria-controls="user-menu"`, and `(click)="toggleUserMenu($event)"`.
   - `<p-menu #userMenu id="user-menu" [model]="userMenuItems()" [popup]="true" appendTo="body" />`. Use a custom `#item` template only if the tier text needs separate styling; otherwise rely on the label.
2. Remove `title="Account settings"`, `routerLink`, and `cursor-pointer` from the avatar (the button provides the pointer cursor).
3. Menu markup stays inside the existing `@else` (logged-in) branch. Logged-out view is unchanged.

### 3. `top-header.css`

- Add a minimal `.header__avatar-button` rule (reset background/border/padding, border-radius 50%, visible `:focus-visible` outline) so focus is visible for WCAG AA. Skip if Tailwind utility classes in the template are sufficient.

### 4. `top-header.spec.ts`

1. Provide mocks for `UserSettingsApiService` (with a `userProfile` object exposing `value` as a signal) and `BillingRedirectService` (`openPortal` as `vi.fn()`, `redirectingToPortal` as a signal). Use `provideHttpClient` is NOT needed once mocked.
2. Replace the "should show Sign Out button" / "should not show Sign Out button" tests with: the `p-button[title="Sign Out"]` is absent in both logged-in and logged-out states.
3. Add avatar button tests: present when logged in, absent when logged out; has `aria-label`, `aria-haspopup="menu"`, `aria-expanded="false"` initially.
4. Add `userMenuItems` tests:
   - Returns three entries in the order Account settings, Plan & billing, Sign out (ignoring the separator).
   - FREE tier: Plan & billing label includes "Free"; running its command navigates to `/pricing`.
   - BASIC and PRO: label includes "Basic" / "Pro"; command calls `openPortal()` and not router navigation.
   - Paid tier with `redirectingToPortal` true: item disabled.
   - Unknown tier (null profile, or no `subscription`): item has no tier text and is disabled.
   - Account settings command navigates to `/settings`.
   - Sign out command emits `signOut` once.
5. Update `emitSignOut` test to also assert `posthog.capture('signout_button_clicked', { place: 'user menu', button_title: 'Sign Out' })`.
6. Keep the existing menu items, inputs, help, login tests as is.

## Conventions checklist

- Standalone, no `standalone: true`; `OnPush` retained.
- `inject()`, `computed()`, `viewChild()` signal APIs; no decorators for host/view queries.
- No `ngClass`/`ngStyle`; no `any`; no TODOs or extra comments.
- Native control flow only.
- Accessibility: keyboard operable button, labeled, visible focus; PrimeNG menu handles arrow/Escape and focus return.
- SSR-safe: popup is rendered only on user interaction, appended to body.

## Verification

- `npm exec nx test opticv-web`
- `npm exec nx lint opticv-web`
- `npm exec nx typecheck opticv-web`
- `npm exec nx build opticv-web`
- `npm exec nx format:check`
- Manual check: logged-in header shows avatar only (no power icon); menu opens by click and by keyboard; FREE → Upgrade → `/pricing`; paid → Stripe portal; Sign out logs out; logged-out header unchanged.
