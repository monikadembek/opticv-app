# Implementation Plan

## Task

84 — Account settings page redesign

## Inputs

- Specification: `.claude/specs/tasks/84-accounts-settings-redesign/02-spec.md`
- Spec review: `.claude/specs/tasks/84-accounts-settings-redesign/03-spec-review.md` — **PASS WITH ISSUES** (no correctness defects; proceed as-is)

## Preconditions Confirmed

- Review result is PASS WITH ISSUES, not FAIL — planning may proceed.
- Permanent context loaded: `.claude/context/role.md`, `.claude/context/rules.md`, `.claude/context/conventions.md`.

## Files Affected

| File | Change |
| --- | --- |
| `apps/opticv-web/src/app/features/settings/settings.ts` | Modify — add `FormsModule`, `InputTextModule`, `FloatLabelModule`, `ToggleSwitchModule` to `imports`; add local signals for notification toggle state; no new HTTP calls |
| `apps/opticv-web/src/app/features/settings/settings.html` | Modify — restructure into 5 cards (Profile, Subscription, Usage, Notifications, Danger zone) per mockup and spec |
| `apps/opticv-web/src/app/features/settings/settings.spec.ts` | Modify — extend coverage for new template structure |

No backend, datatype, or routing files are touched. No new services are created.

---

## Step 1 — `settings.ts`: component class changes

1. Add imports:
   - `FormsModule` from `@angular/forms` (required for `ngModel` / `#form="ngForm"`, matching `login.ts`/`verify.ts` convention).
   - `InputTextModule` from `primeng/inputtext` (matches `pInputText` usage in `login.html`).
   - `FloatLabelModule` from `primeng/floatlabel` (matches label convention in `login.html`; use only if the mockup's plain-label-above-input style is implemented via floatlabel — otherwise use a plain `<label>` element consistent with existing settings section headings; decide in Step 2 based on mockup layout, which shows a static label above the input, not a floating label — prefer plain `<label>` + `pInputText` to match the mockup precisely, so `FloatLabelModule` is NOT required).
   - `ToggleSwitchModule` from `primeng/toggleswitch` (new dependency for Notifications card; verify the exact module/selector name against the installed PrimeNG 21 API before use — confirm via `node_modules/primeng/toggleswitch` or PrimeNG 21 docs during implementation; do not assume `primeng/inputswitch` from older PrimeNG versions).
   - `ProgressBarModule` from `primeng/progressbar` (new dependency for Usage this month card; verify exact module/selector/`[value]` API against the installed PrimeNG 21 package during implementation).
2. Add two local signals for notification toggle state (component-local, not persisted, no API call):
   - `productUpdatesEnabled = signal(true)`
   - `weeklyTipsEnabled = signal(false)`
3. Do NOT add any new methods for saving name/email/billing — buttons are statically disabled with no `(click)` handler per spec.
4. Do NOT add an `(onChange)` handler beyond binding the toggle to the signal (e.g., `[(ngModel)]` or `[ngModel]`+`(ngModelChange)` bound directly to the signal via `set`) — no side effects, no console/network calls.
5. Keep `getAvatarLabel`, `featureLabel`, `onDeleteAccount`, `ngOnInit` unchanged.

## Step 2 — `settings.html`: template restructure

Rebuild the template inside the existing `@if (userProfile.isLoading())` / `@else if (userProfile.error())` / `@else if (userProfile.hasValue())` guard structure (unchanged loading/error branches). Inside the `hasValue()` branch, render five sections in order:

### 2.1 Profile card

- Keep existing avatar + name/email header block unchanged.
- Below it, add a one-column form:
  - `<form #profileForm="ngForm">` wrapping both fields (no `(ngSubmit)` handler needed since no submission logic exists; form element used for `ngModel` grouping consistency with `login.html`/`verify.html` convention).
  - "Full name" label + text input, `[(ngModel)]` initialized from `userProfile.value()?.displayName ?? ''`, `name="fullName"`, `pInputText`. Adjacent "Save name" button: `pButton`, `[disabled]="true"`, `aria-label="Save name"` (label text alone is unambiguous but keep aria-label as spec requires retaining/adding aria-label where visible label may be ambiguous — apply consistently for both disabled buttons here).
  - "Email address" label + text input, `[(ngModel)]` initialized from `userProfile.value()?.email ?? ''`, `name="emailAddress"`, `pInputText`. Adjacent "Change email" button: `pButton`, `[disabled]="true"`, `aria-label="Change email"`.
  - Do NOT render a "Save changes" button — remove it entirely (it does not exist in current template already, so this is a no-op removal confirmation, not new deletion work).
  - Layout: single column per spec — stack "Full name" field+button, then "Email address" field+button beneath it (mockup shows two columns side by side, but spec explicitly overrides this to single-column layout — follow the spec text, not the mockup image, since spec Behavior item 4 explicitly says "one-column form").

### 2.2 Subscription card

- Keep existing tier/status badge spans unchanged (`subscription?.tier ?? 'FREE'`, `subscription?.status ?? 'ACTIVE'`).
- Remove nothing here (no "Visa ending" text exists yet in current template — this is a net addition of the renewal sentence, not a removal).
- Add renewal sentence, rendered only inside the existing `@if (usageStatus.hasValue() && usageStatus.value(); as usage)` guard (spec Edge Cases: omit sentence entirely, no placeholder, when usage unavailable). Source the date from `usage.quotas[0].resetsAt` (any one quota, per spec) formatted with existing `DatePipe` `mediumDate`. Example text: `Your {{ userProfile.value()?.subscription?.tier ?? 'FREE' }} plan renews on {{ usage.quotas[0].resetsAt | date: 'mediumDate' }}`.
  - Guard against `usage.quotas` being empty (defensive `@if (usage.quotas.length > 0)` inside the usage-available branch) since `resetsAt` is read via array index — this is required because the type does not guarantee non-empty `quotas`, per the rule "never assume a variable is non-null unless explicitly non-nullable."
- Add "Manage billing" button: `pButton`, `[disabled]="true"`, with an icon (mockup shows a card icon) — icon is optional visual polish, not spec-mandated; include only if trivial via existing `pButton icon` input pattern, otherwise omit icon and keep text-only to avoid scope creep.
- Add "View invoices" button: `pButton`, `[disabled]="true"`.
- No `aria-label` override needed for these two if visible text is unambiguous; spec only requires aria-label "where the visible label alone may be ambiguous" — "Manage billing" and "View invoices" are self-explanatory, so plain `[disabled]="true"` suffices.

### 2.3 Usage this month card

- Same underlying data as today (`usage.quotas` loop + `usage.storedCvs`), restyled to match the mockup:
  - Card header: "USAGE THIS MONTH" label on the left, "Resets {{ date }}" on the right — sourced from the same shared `resetsAt` value used in the Subscription card renewal sentence (any one quota's `resetsAt`, formatted via `DatePipe` `mediumDate`). Reuse the same `usage.quotas[0].resetsAt` read (with the same empty-array guard as Step 2.2) rather than introducing a second lookup.
  - Remove the per-row inline "· resets {{date}}" text — the reset date now lives only in the card header.
  - Each quota row: feature name + "X / Y" count (unchanged), with a `p-progressbar` beneath showing `used`/`limit` (e.g., `[value]="(quota.used / quota.limit) * 100"`). Guard divide-by-zero if `limit` can be `0` per the `LimitedFeature` quota type — confirm `limit` is always `> 0` in `@opticv/datatypes`; if not guaranteed, clamp/guard the percentage calculation.
  - "Stored CV documents" row: same "X / Y used" text (unchanged), with a `p-progressbar` beneath showing `storedCvs.used`/`storedCvs.limit`, same divide-by-zero consideration.
  - New PrimeNG module: `ProgressBarModule` from `primeng/progressbar` (selector `p-progressbar`, `[value]` input as a 0–100 number) — not currently used anywhere in the codebase; confirm exact API against the installed PrimeNG 21 package during Step 4 alongside `ToggleSwitchModule`.

### 2.4 Notifications card

- New `<section aria-label="Notifications">` with heading styled consistently with other section headings (`text-sm font-semibold uppercase tracking-wide text-gray-500`, matching Subscription/Usage headings).
- Two rows, each: label (bold) + description text + `p-toggleswitch` (module name to be confirmed in Step 1) bound to the corresponding signal.
  1. "Product updates" / "New features and improvements." / toggle bound to `productUpdatesEnabled`, default on.
  2. "Weekly job-search tips" / "A short digest every Monday." / toggle bound to `weeklyTipsEnabled`, default off.
- Do NOT render a "Job-match alerts" row — omit entirely (no label, no description, no toggle, no leftover signal/property for it).
- Toggles are NOT disabled — interactive, per spec Assumption 2. Ensure each toggle has an accessible name (e.g., `aria-label="Product updates"` / `aria-label="Weekly job-search tips"`) since the visible label is a separate DOM element, not a native `<label for>` association — required for WCAG AA screen-reader announcement.

### 2.5 Danger zone

- Logic unchanged: same `onDeleteAccount()` handler, same `p-confirmDialog` config, same "Delete account" button behavior (`[loading]="isDeleting()"`, `(onClick)="onDeleteAccount()"`) — no changes to `settings.ts` for this section.
- Container restyled to match the mockup as its own card: rounded card container consistent with the other four cards' container styling (e.g., same `rounded-*`/border/shadow utility classes used for Profile/Subscription/Usage/Notifications cards, established in Step 2.1–2.4), plus a red accent border on the left edge (e.g., `border-l-4 border-red-500` in addition to the card's normal border, or `border-l-4 border-red-500` as the distinguishing edge) — replace the current `border-t border-red-200 pt-8` top-divider styling.
- "DANGER ZONE" label styled uppercase in red (existing `text-red-600` heading style is close — keep the uppercase/tracking treatment consistent with the other card headers' `text-sm font-semibold uppercase tracking-wide` pattern, just in red instead of gray).
- Description text and "Delete account" button unchanged in content and behavior — only the surrounding container/border styling changes.

### General template rules

- Use `@if`/`@for` (already the case) — no `*ngIf`/`*ngFor`.
- No `ngClass`/`ngStyle` — existing `[style]` binding on avatar is already compliant; keep.
- Keep `OnPush` compatibility — all new template state comes from signals (`userProfile()`, `usageStatus()`, `productUpdatesEnabled()`, `weeklyTipsEnabled()`) or template-local `ngModel`/`ngForm` refs, no non-signal mutable state read in the template.
- No Security/Password card anywhere in the template.

## Step 3 — `settings.spec.ts`: test coverage updates

Add test groups following existing file conventions (`createResource`, `setup()` helper, `fixture.nativeElement.textContent`, `fixture.debugElement.query`):

1. **Profile card**
   - Full name input renders pre-filled with `displayName`.
   - Full name input falls back to empty string when `displayName` is `null`.
   - Email address input renders pre-filled with `email`.
   - "Save name" button is disabled.
   - "Change email" button is disabled.
   - No "Save changes" button exists in the rendered DOM.
2. **Subscription card**
   - Renewal sentence renders with formatted date when `usageStatus` `hasValue()` is true and quotas non-empty.
   - Renewal sentence is absent when `usageStatus` has not loaded / has no value.
   - "Manage billing" button is disabled.
   - "View invoices" button is disabled.
   - No "Visa ending" text appears anywhere in rendered output.
3. **Usage this month card**
   - Card header renders "Resets {{date}}" text using the shared `resetsAt` value when `usageStatus` `hasValue()` is true and quotas non-empty.
   - Per-row inline "resets" text no longer appears (assert absence of the old `· resets` pattern in rendered output).
   - Each quota row and the stored-CVs row render a progress element (assert presence of the `p-progressbar` host element or its rendered value, per whatever is feasible for the confirmed `ProgressBarModule` API).
   - Existing assertions for per-feature usage counts (`fixture.nativeElement.textContent` containing e.g. `'2 / 10'`) continue to pass unmodified — only the surrounding markup changes, not the counts.
4. **Notifications card**
   - "Product updates" toggle default state reflects `true` (on) — assert via component signal state and/or rendered toggle `aria-checked`/PrimeNG state attribute, following whatever assertion pattern is feasible for the confirmed `ToggleSwitchModule` API.
   - "Weekly job-search tips" toggle default state reflects `false` (off).
   - No "Job-match alerts" text/row appears anywhere in rendered output.
   - Toggling a switch updates local signal state only (no service method called, no HTTP call — assert `userSettingsMock` methods are not invoked beyond the existing `reloadUserProfile`/`reloadUsageStatus` calls already covered).
4. **Security card**
   - No "Password" / "Change password" text appears anywhere in rendered output.
5. Keep all existing test groups (creation, ngOnInit, getAvatarLabel, usage panel, onDeleteAccount) unchanged and passing — do not modify their assertions, only extend `mockProfile`/`usageStatus` fixtures if a shared fixture needs a `resetsAt`-bearing quota (already present in the existing `usageStatus` fixture at line 160-168 of the current spec file, reusable as-is).

Use `fixture.detectChanges()` and, where the component reads `userProfile.hasValue()`, ensure `hasValue: true` is passed via `setup()` overrides consistent with existing usage-panel tests.

## Step 4 — Dependency/module verification

Before writing template code, confirm in the installed `primeng` package version (21.x per project docs) the exact:
- Module import path (`primeng/toggleswitch` expected, but verify against `node_modules/primeng/package.json` exports or installed type declarations).
- Selector (`p-toggleswitch` expected for PrimeNG 21; older PrimeNG versions used `p-inputswitch`/`primeng/inputswitch` — do not use the old name).
- Two-way binding property name (`[(ngModel)]` or `[(modelValue)]` depending on PrimeNG's ControlValueAccessor implementation for this component) — use whichever is documented/typed for the installed version.
- `ProgressBarModule` import path (`primeng/progressbar` expected), selector (`p-progressbar` expected), and value input name/range (`[value]` as 0–100 expected) — confirm against the installed package the same way.

This is a verification step only, not a design decision — no alternative module should be substituted without re-confirming against the spec's Assumption 4 ("PrimeNG `ToggleSwitchModule` (or equivalent already-available module)") and the newly added Usage card progress-bar requirement.

## Step 5 — Verification checklist (per spec Acceptance / DEV)

Run in order, fixing forward before proceeding to the next:

1. `npm exec nx lint opticv-web` — no lint errors in `settings.ts` / `settings.html`.
2. `npm exec nx test opticv-web` — all existing and new `settings.spec.ts` tests pass; no other spec files regress.
3. `npm exec nx build opticv-web` — production build succeeds (validates template bindings, module imports, strict template type checking).
4. Manual/automated AXE check on the rendered Settings page (loaded state) — verify:
   - Disabled buttons remain in the accessibility tree with correct state (`[disabled]="true"` binding, not native `disabled` attribute removal from DOM).
   - Toggle switches have accessible names distinct from their visible row label association.
   - Color contrast for new text (renewal sentence, notification descriptions) meets WCAG AA against the existing Tailwind gray/emerald palette already used elsewhere on the page.
   - Focus order flows logically: avatar/header → full name input → save name button → email input → change email button → subscription badges → manage billing → view invoices → usage list → notification toggles → delete account button.
5. Confirm no new console errors/warnings when loading the page with mocked/real data (spec Acceptance requirement).
6. Confirm Danger Zone / delete-account flow is untouched and existing tests for it (`onDeleteAccount` describe block) still pass unmodified.

## Explicitly Out of Scope (do not implement)

- Any backend endpoint, `UserProfile`/`UsageStatus` type change, or notification-preference persistence.
- Wiring "Save name", "Change email", "Manage billing", "View invoices" click handlers.
- Any Security/password card or route.
- Payment method display.
- Reactive forms conversion (template-driven forms are the deliberate, spec-approved choice here).

## Open Verification Item Carried Into Implementation

- Exact PrimeNG 21 toggle component API (module path, selector, binding property) must be confirmed against the installed package before Step 2.4 is written — flagged in Step 4, not resolved here, since this plan does not write code.
