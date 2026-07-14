# Task Specification

## Source

Azure DevOps Task: 84 — Account settings page redesign

## Goal

Redesign the Account settings page (`apps/opticv-web/src/app/features/settings/`) to match the attached design mockup (`ui/Account Settings-selection.png`), with the specific modifications listed in the raw task applied on top of that mockup. This is a **frontend-only** task — no new backend endpoints, no new persisted data, no wired-up business logic for actions that aren't already implemented today.

## Context

`apps/opticv-web/src/app/features/settings/` (`Settings` component, standalone, `OnPush`) currently renders only: a profile header (avatar + read-only name/email), subscription tier/status badges, a usage section, and a danger zone. It does **not** yet contain editable profile inputs, a full Subscription card with billing actions, a Notifications card, or a Security card. This task replaces/extends that template to match the mockup layout, minus the Security card and minus the specific elements called out for removal.

Data today comes from `UserSettingsApiService` (`apps/opticv-web/src/app/core/services/user-settings-api.service.ts`) via `httpResource`:

- `userProfile` → `GET /users/me` → `UserProfile` (`id`, `email`, `displayName`, `avatarUrl`, `subscription: { tier, status } | null`)
- `usageStatus` → `GET /users/me/usage` → quotas (`used`, `limit`, `resetsAt`) per `LimitedFeature`, plus `storedCvs`
- `deleteAccount()` → `DELETE /users/me`

No endpoint or `UserProfile` field exists for notification preferences, payment method, or subscription renewal date. None will be added — this task only changes presentation.

## Scope

### In scope

- Rebuild the settings page template/layout to match the mockup, structured as the following cards, in order:
  1. **Profile card** — avatar + name/email header (existing), plus editable **Full name** and **Email address** inputs in a single column, each with an adjacent action button (**Save name**, **Change email**). Remove the current "Save changes" button entirely.
  2. **Subscription card** — tier/status badges (existing data), a renewal sentence, and **Manage billing** / **View invoices** buttons.
  3. **Usage this month card** — existing quotas list and data, restyled to match the mockup: a "Resets {{date}}" label in the card header (top-right, sourced from the same `resetsAt` used elsewhere, instead of per-row inline "resets" text), and a progress bar under each row (quotas and stored CV documents) reflecting `used / limit`.
  4. **Notifications card** — **Product updates** and **Weekly job-search tips** toggle rows (job-match alerts row removed per task).
  5. **Danger zone** — existing "Delete account" flow and logic unchanged, restyled to match the mockup: rendered as its own card (rounded, bordered/shadowed like the other cards) with a red accent border on the left edge, "DANGER ZONE" as the card's uppercase label, description text, and the red "Delete account" button — rather than the current plain top-border section divider.
- Full name / email inputs implemented as **template-driven forms** (`ngModel`, `#form="ngForm"`), matching the convention in `login.html`/`verify.html`. No submission logic — inputs are pre-filled from `userProfile()` for display/editing but "Save name" and "Change email" buttons are disabled (`[disabled]="true"`) and have no `(click)` handler.
- Subscription card: remove the "Visa ending 4242" text. Keep "Manage billing" and "View invoices" as disabled buttons (`[disabled]="true"`), no click handlers.
- Add a renewal sentence to the Subscription card, e.g. "Your {{tier}} plan renews on {{date}}", sourcing the date from the existing `usageStatus()` quota `resetsAt` field (any one quota's `resetsAt`, since all quotas share the same monthly reset date) formatted via the existing `DatePipe` (`mediumDate`, consistent with current usage section formatting). Only render this sentence when usage data is available; do not add a new API field for it.
- Notifications card: two rows — "Product updates" (label + description "New features and improvements.") and "Weekly job-search tips" (label + description "A short digest every Monday."). Each row has a `p-toggleswitch` (or PrimeNG equivalent already used in the codebase; introduce `ToggleSwitchModule` if not yet imported). Initial state is **local component state only** (not persisted, no API call): Product updates defaults to `true` (on), Weekly job-search tips defaults to `false` (off), matching the mockup. Toggles remain interactive (user can flip them locally) but changes are not saved/sent anywhere — no `(onChange)` side effects beyond updating local signal state, per "don't attach any logic ... yet." Do not disable these toggles (unlike the profile/subscription buttons) since flipping them has no destructive or misleading effect — the task instructs to leave them without logic, not to make them disabled.
- Remove the "Job-match alerts" row entirely (not just its logic — the row itself, per task item 3).
- Do **not** implement a Security card (no Password / Change password UI at all) — the app is passwordless (Supabase OTP auth), so this section is omitted entirely, not stubbed.
- Update `settings.spec.ts` to cover the new template structure (rendering of new cards/controls, disabled state assertions, notifications default toggle states) to the extent existing test patterns in the file cover current behavior.

### Out of scope

- Any backend/API changes (no new endpoints, no `UserProfile` schema changes, no notification-preferences persistence).
- Wiring "Save name", "Change email", "Manage billing", "View invoices" to real logic (tracked in future tasks; `docs/user-email-change.md` documents the planned email-change flow for a later task).
- Persisting notification toggle state.
- Any Security/password UI (not applicable — passwordless auth).
- Payment method display/management.

## Behavior

1. Page loads; `ngOnInit` triggers `reloadUserProfile()` and `reloadUsageStatus()` as today.
2. While loading, existing spinner/error states are preserved (loading spinner, error message on failure) — these guard the whole card set as today via `@if (userProfile.isLoading())` / `@else if (userProfile.error())` / `@else if (userProfile.hasValue())`.
3. Once loaded, render cards in order: Profile, Subscription, Usage, Notifications, Danger zone.
4. **Profile card**: avatar/name/email header unchanged. Below it, a one-column form with "Full name" input (`ngModel` bound, pre-filled with `displayName`) and its "Save name" button (disabled) directly beside it; then "Email address" input (pre-filled with `email`) and its "Change email" button (disabled) beside it. No "Save changes" button.
5. **Subscription card**: tier/status badges as today; new renewal sentence beneath, populated only if usage data has loaded; "Manage billing" and "View invoices" buttons (disabled), no "Visa ending" text.
6. **Usage this month card**: same data as today (quotas + stored CVs), restyled per mockup — card header shows "Resets {{date}}" (one shared date, from any quota's `resetsAt`, formatted via existing `DatePipe` `mediumDate`) instead of per-row "resets" text; each row (quotas and stored CV documents) gains a progress bar showing `used / limit`.
7. **Notifications card**: two toggle rows (Product updates: on by default, Weekly job-search tips: off by default). Toggling flips local state only; no persistence, no API call, no console/network side effect.
8. **Danger zone**: existing confirm dialog + delete flow unchanged; container restyled as a card matching the mockup (rounded card with red left accent border, "DANGER ZONE" label, description, red "Delete account" button) instead of the current top-border-only divider.
9. No Security card is rendered anywhere on the page.

## Edge Cases

- `userProfile.value()?.displayName` is `null` → Full name input falls back to empty string (existing avatar-label logic already handles null displayName elsewhere via `getAvatarLabel`; apply the same fallback pattern for the input's initial value, e.g. `?? ''`).
- `usageStatus()` has not loaded yet or errored → Subscription card renders tier/status badges and buttons, but omits the renewal sentence (no fallback/placeholder text) until usage data is available, consistent with the existing `@if (usageStatus.hasValue() && usageStatus.value(); as usage)` guard pattern used for the Usage card.
- User has no active subscription (`subscription` is `null`) → existing fallback badges (`'FREE'` / `'ACTIVE'`) continue to display; renewal sentence is still sourced from usage quotas independent of subscription tier (no coupling change needed).
- Disabled buttons must remain focusable/announced correctly to screen readers per WCAG AA — use `[disabled]="true"` (not the native `disabled` attribute) consistent with existing PrimeNG button binding conventions, and retain/add `aria-label` where the visible label alone may be ambiguous.

## Data / API

- No new endpoints. No changes to `UserProfile` or `UsageStatus` types in `@opticv/datatypes`.
- Reuses existing `UserSettingsApiService.userProfile` and `UserSettingsApiService.usageStatus` resources.
- No new HTTP calls introduced by this task.

## Assumptions

- "Disabled" for the profile card's "Save name"/"Change email" and the subscription card's "Manage billing"/"View invoices" buttons means statically disabled (`[disabled]="true"`), since no logic exists to conditionally enable them yet.
- Notifications toggles are **not** disabled (per user decision) — they remain interactive but functionally inert (local-only state, no persistence).
- The renewal-date sentence reuses `usageStatus()` quota `resetsAt` rather than introducing new subscription fields, since all quotas share a common monthly reset date and no dedicated renewal-date field exists.
- PrimeNG `ToggleSwitchModule` (or equivalent already-available module) will be imported into `Settings`'s `imports` array if not already present; no new third-party dependency is introduced.
- Full name / Email address inputs use template-driven forms (`ngModel`) to match existing convention in `login.html` / `verify.html`, despite the project-wide Angular best-practices doc generally favoring reactive forms — matching local convention takes precedence per the "prefer existing conventions" workflow rule.

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx test opticv-web` passes, including updated `settings.spec.ts` coverage for: rendering of new Profile card inputs/buttons (disabled), Subscription card renewal sentence + disabled billing buttons + removed Visa text, Notifications card toggle rows (default states, absence of job-match alerts row), and confirmation that no Security card is rendered.
- `npm exec nx lint opticv-web` passes.
- No new console errors/warnings introduced.
- Passes AXE checks / WCAG AA (focus management, contrast, ARIA) for all new interactive elements (inputs, buttons, toggles).
- No breaking changes to existing Danger Zone / delete-account flow.
