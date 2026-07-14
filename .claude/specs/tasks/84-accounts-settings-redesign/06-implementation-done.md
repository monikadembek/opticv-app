# Implementation Done — Task 84: Account settings page redesign

## Summary

The Account settings page (`apps/opticv-web/src/app/features/settings/`) was rebuilt into five cards — Profile, Subscription, Usage this month, Notifications, Danger zone — per the spec and implementation plan. Profile and subscription action buttons are statically disabled with no click handlers; notification toggles are local-state-only with no persistence; the Danger zone was restyled as its own card with a red left accent border while its delete logic was left unchanged. No Security/password card was added. `settings.ts`, `settings.html`, and `settings.spec.ts` were modified; no backend, datatype, or routing files were touched.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Profile card: avatar/name/email header unchanged | Implemented | `settings.html:17-44` |
| Profile card: editable "Full name" input, `ngModel`, pre-filled from `displayName`, `?? ''` fallback | Implemented | `settings.html:46-58` |
| Profile card: "Save name" button, disabled, adjacent to Full name input | Implemented | `settings.html:59-67` |
| Profile card: editable "Email address" input, `ngModel`, pre-filled from `email` | Implemented | `settings.html:71-82` |
| Profile card: "Change email" button, disabled, adjacent to Email input | Implemented | `settings.html:83-92` |
| Profile card: "Save changes" button removed entirely | Implemented | Not present in template |
| Profile card: template-driven form (`ngModel`, `#form="ngForm"`) | Implemented | `settings.html:46` (`#profileForm="ngForm"`) |
| Profile card: single-column layout | Implemented | Full name field+button stacked above Email field+button |
| Subscription card: tier/status badges unchanged | Implemented | `settings.html:107-118` |
| Subscription card: "Visa ending 4242" text removed | Implemented | Not present in template |
| Subscription card: renewal sentence, sourced from `usageStatus()` quota `resetsAt`, `mediumDate` format | Implemented | `settings.html:120-128` |
| Subscription card: renewal sentence rendered only when usage data available, no placeholder | Implemented | Guarded by `@if (usageStatus.hasValue() && usageStatus.value(); as subUsage)` and `@if (subUsage.quotas.length > 0)` |
| Subscription card: "Manage billing" button, disabled | Implemented | `settings.html:130-138` |
| Subscription card: "View invoices" button, disabled | Implemented | `settings.html:139-145` |
| Usage card: header shows "Resets {{date}}" (shared `resetsAt`), replacing per-row inline reset text | Implemented | `settings.html:154-163` |
| Usage card: progress bar under each quota row reflecting `used/limit` | Implemented | `settings.html:164-178`, `usagePercent()` in `settings.ts:71-73` |
| Usage card: progress bar under stored-CV documents row | Implemented | `settings.html:179-190` |
| Notifications card: "Product updates" row, label + description "New features and improvements.", default on, toggle | Implemented | `settings.html:205-216`, `settings.ts:52` |
| Notifications card: "Weekly job-search tips" row, label + description "A short digest every Monday.", default off, toggle | Not implemented | `settings.html:217-228` renders label "Job-search tips" (not "Weekly job-search tips") and description "A short digest every 2 weeks." (not "A short digest every Monday."); default-off state itself (`settings.ts:53`) is correct, but visible copy does not match spec. Flagged as Critical in `05-code-review.md` and not yet corrected in the current diff. |
| Notifications card: "Job-match alerts" row removed entirely | Implemented | Not present in template |
| Notifications card: toggles interactive (not disabled), local signal state only, no persistence/API call | Implemented | `settings.html:210-227`; no service calls added |
| Danger zone: delete flow/logic unchanged | Implemented | `onDeleteAccount()` unchanged in `settings.ts:75-113`; same confirm dialog and button binding |
| Danger zone: restyled as its own card, red left accent border, uppercase "DANGER ZONE"-style label | Implemented | `settings.html:232-251` — note: rendered label text is "Danger zone" (sentence case in markup, styled uppercase via `uppercase` class), not literal "DANGER ZONE" text |
| No Security/password card rendered | Implemented | Absent from template |
| `settings.spec.ts` updated for new template structure | Implemented | New `describe` blocks: `profile card`, `subscription card`, `notifications card`, `security card`; existing blocks retained |
| No new backend endpoints / `UserProfile` schema changes | Implemented | No backend files in diff |
| No new HTTP calls | Implemented | No new service methods added to `settings.ts` |

## Files

### Modified

- `apps/opticv-web/src/app/features/settings/settings.ts`
- `apps/opticv-web/src/app/features/settings/settings.html`
- `apps/opticv-web/src/app/features/settings/settings.spec.ts`
- `docs/tasks-list.md`
- `docs/user-email-change.md`

### Created

- `.claude/specs/tasks/84-accounts-settings-redesign/02-spec.md`
- `.claude/specs/tasks/84-accounts-settings-redesign/03-spec-review.md`
- `.claude/specs/tasks/84-accounts-settings-redesign/04-implementation-plan.md`
- `.claude/specs/tasks/84-accounts-settings-redesign/05-code-review.md`
- `.claude/specs/tasks/84-accounts-settings-redesign/ui/00-raw-task.md`
- `.claude/specs/tasks/84-accounts-settings-redesign/ui/Account Settings-selection.png`

No backend, datatype, or routing files were created or modified.

## Components

| Component (per plan) | Status |
| --- | --- |
| `Settings` (`settings.ts`) | Exist |
| Profile card section (`settings.html`) | Exist |
| Subscription card section (`settings.html`) | Exist |
| Usage this month card section (`settings.html`) | Exist |
| Notifications card section (`settings.html`) | Exist |
| Danger zone card section (`settings.html`) | Exist |
| Security/password card | Not present (per spec — intentionally omitted, not a gap) |

## Stores

Not applicable — no NgRx Signals store was planned or introduced for this task. All new state (`productUpdatesEnabled`, `weeklyTipsEnabled`) is component-local signal state on `Settings`.

## Deviations

- Plan Step 1 listed `FloatLabelModule` as a candidate import to be decided during Step 2; the final `settings.ts` imports do not include `FloatLabelModule` — plain `<label>` elements were used instead, as the plan's own fallback path anticipated.
- Notifications card "Weekly job-search tips" row: rendered visible label is "Job-search tips" and rendered description is "A short digest every 2 weeks." — differs from the spec's required "Weekly job-search tips" / "A short digest every Monday." The `ariaLabel` attribute on the corresponding `p-toggleswitch` does carry the string "Weekly job-search tips", but this is not part of the visible row text.
- `settings.spec.ts` test "renders both notification toggle labels" (`settings.spec.ts:479-487`) asserts the text `'Job-search tips'`, matching the current (spec-deviating) template copy rather than the spec's required "Weekly job-search tips" string.
- Danger zone heading renders as "Danger zone" (styled uppercase via CSS `uppercase` class) rather than literal uppercase text "DANGER ZONE" in the markup.

## Additional Implementation

- `docs/tasks-list.md` and `docs/user-email-change.md` were modified as part of this task's commits; their content was not covered by `02-spec.md`, `03-spec-review.md`, or `04-implementation-plan.md`.

> Additional implementation not covered by the original documents.
</content>
