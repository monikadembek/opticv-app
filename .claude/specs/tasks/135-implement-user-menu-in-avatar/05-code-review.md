# Code Review – Task 135: Implement user menu in avatar

Reviewed: `top-header.ts`, `top-header.html`, `top-header.css`, `top-header.spec.ts`, `docs/tasks-list.md` (commit 96bb34d). Review is static; tests, lint and build were not run as part of this review.

### Summary

- Overall result: PASS WITH ISSUES
- The avatar is now an accessible button that opens a popup `p-menu`, the standalone sign-out button is gone, and tier/billing logic is a clean `computed()` with null-safe access. No project-rule violations were found. The menu structure (grouped sub-menus, label wording) departs from the spec and the plan, and a few small accessibility and state details should be tightened.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

- `top-header.html:47` – `aria-controls="user-menu"` points at the `<p-menu id="user-menu">` host element. With `appendTo="body"` the actual popup is a separate overlay element, so the reference does not identify the controlled menu. The spec asks for `aria-controls`, but the target should be the rendered menu.
- `top-header.ts:56`, `top-header.html:63-64` – `isUserMenuOpen` is only reset by `onHide`. If the user signs out while the menu is open, `p-menu` is destroyed and `onHide` may not fire, so the signal can stay `true`. After the next login the avatar could render `aria-expanded="true"` while closed.
- `top-header.ts:168` and `:164` – `openPlanAndBilling` and `openAccountSettings` are public but only used inside the class. They should be `private`, or inlined into the `command` callbacks.
- `top-header.ts:168-173` – `openPlanAndBilling(isPaid: boolean)` takes a boolean flag to choose between two behaviours. Two commands chosen when the model is built would be clearer.
- `docs/tasks-list.md` (diff near line 2195) – the heading `## 134. Make the information about subscription plans more visible` was replaced by `## Task to make the information about subscription plans more visible`, which loses the task number. This is outside the scope of task 135.
- `top-header.spec.ts` – no test covers `aria-expanded="true"` after the menu opens, or the `toggleUserMenu` / `onShow` / `onHide` wiring. There is also no DOM-level test that the menu renders its entries.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Avatar is a keyboard-accessible button toggling a popup `p-menu` | Covered | Native `<button>`, `[popup]="true"`, `appendTo="body"`. |
| ARIA: `aria-label`, `aria-haspopup="menu"`, `aria-controls`, `aria-expanded` | Partial | All present; `aria-controls` target is the host, not the overlay (see above). |
| Old `title` and `routerLink` removed from avatar | Covered | |
| Menu order: Account settings, Plan & billing, Sign out | Partial | Order is Plan & Billing, separator, Profile > (Account Settings, Sign Out). Matches the raw task list wording, not the spec order. |
| Plan & billing shows tier and one action (Upgrade / Manage subscription) | Covered | Tier is in the group label (`Plan & Billing · Free Plan`), action is a child item. |
| FREE → `/pricing` | Covered | |
| BASIC/PRO → `openPortal()`, disabled while `redirectingToPortal()` | Covered | |
| Unknown tier: no tier label, billing action disabled, other items usable | Covered | Missing `subscription` treated as unknown. |
| Account settings → `/settings` | Covered | |
| Sign out emits `signOut` | Covered | |
| Remove `pi-power-off` header button | Covered | Test asserts absence. |
| PostHog: keep `signout_button_clicked` with place `user menu` | Covered | |
| PostHog: add events for other menu entries | Missing | The spec asked for them; the plan explicitly dropped them. See Plan Deviations. |
| Tier derived via `computed()`; menu model is a `computed()` | Covered | |
| SSR-safe (no browser globals, `appendTo="body"`) | Covered | |
| Escape / outside click closes and returns focus to avatar | Covered (unverified) | Relies on PrimeNG default behaviour; not tested. |
| Unit tests updated (`top-header.spec.ts`); `app.spec.ts` unchanged | Covered | The `app.spec.ts` claim in the plan was not re-checked here. |

### Plan Deviations

- Plan step 1.6 and the "Resolved review items": a **single** "Plan & billing" item whose click runs the action. Implemented as a **group** (`Plan & Billing · <Tier> Plan`) with a child action item, plus a "Profile" group. The structure and labels differ from the plan.
- Plan tier display is "Free / Basic / Pro … rendered as plain inline text"; implemented as `<Tier> Plan` in the group label.
- Labels use title case (`Account Settings`, `Sign Out`, `Plan & Billing`) versus the sentence case in the spec and plan (`Account settings`, `Sign out`, `Plan & billing`).
- Plan expected the tests to include "Returns three entries … (ignoring the separator)". The tests instead assert the grouped structure.
- Spec asks for click events on other menu entries; plan says not to add them. The implementation follows the plan, so spec and plan disagree. This should be settled explicitly.
- Plan step 3 (CSS) was applied as a `.header__avatar-button` rule; this matches the plan.

### Null Safety Issues

None. `userProfile.value()?.subscription?.tier` is fully guarded, `!tier` disables the billing action, and `userMenu()?.toggle(event)` guards the optional `viewChild`.

### Code Smells

- Route strings `'/settings'` and `'/pricing'` are repeated literals; `/pricing` is also used in the menubar items and in the Settings page.
- `top-header.ts:62-100` – the `userMenuItems` computed mixes label building, the disabled logic and command wiring in one block. It is still readable, but it is the densest part of the file.
- `top-header.spec.ts:19-20` – module-level `profile` and `redirectingToPortal` signals are shared mutable state between tests; they are reset in `beforeEach`, so this is safe but fragile.
- `top-header.ts` still mutates `items` as a plain field inside an `effect()`. This is pre-existing and out of scope.

### Recommendation

- Merge as-is
- **Fix critical issues before merge** — not required (no critical issues). Recommended before merge: decide whether the grouped menu structure and labels are the intended design (and update the spec/plan, or align the code), fix the `aria-controls` target, and restore the `docs/tasks-list.md` heading for task 134.
- Significant rework required
