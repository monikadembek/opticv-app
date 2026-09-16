# Code Review — Task 84: Account settings page redesign

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation covers the required five-card layout, template-driven profile inputs, disabled billing/profile buttons, restyled usage/danger-zone cards, and matching test coverage. The one real defect is that the "Weekly job-search tips" row's visible label and description text do not match the spec's required copy, which causes a test to fail. This must be fixed before merge; everything else is solid and closely follows the plan.

## Conventions Violations

### Critical (must fix before merge)

1. **`apps/opticv-web/src/app/features/settings/settings.html:219-220`** — The Weekly job-search tips row renders visible label "Job-search tips" and description "A short digest every 2 weeks.", but the spec (02-spec.md lines 31, 36, 57) and plan (04-implementation-plan.md line 82) require the visible label to be "Weekly job-search tips" and the description to be "A short digest every Monday." Only the `ariaLabel` attribute on the `p-toggleswitch` carries the correct "Weekly job-search tips" string — it does not appear in the rendered/announced row text itself. This causes `settings.spec.ts:414-422` ("renders both notification toggle labels") to fail: `expected 'Account settings Manage your profile,…' to contain 'Weekly job-search tips'`. Confirmed via `npm exec nx test opticv-web`.

### Non-Critical (should fix)

- None beyond the above.

### Investigated and ruled out

- `settings.spec.ts` — "calls deleteAccount, signs out, and navigates to /login on success" appeared to time out in the initial full-suite `nx test opticv-web` run. Re-ran in isolation (`-t` filtered to this test name, and again scoped to the `onDeleteAccount` describe block): the test passes cleanly both times (995/995 and 986/995 respectively, with all failures in the isolated re-runs located in `supabase.spec.ts`, a file untouched by this diff). This was a test-run flake/cross-file interference, not a defect introduced by this task — no fix required in `settings.ts`/`settings.spec.ts`. Pre-existing failures in `supabase.spec.ts` (`pendingEmail` not cleared on `SIGNED_IN`, `NG04002` routing error originating in `app.spec.ts`) are out of scope for this review since that file is not part of task 84's changed files.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Profile card: editable Full name / Email inputs, template-driven forms, pre-filled, `?? ''` fallback | Covered | `settings.html:46-95`; matches `login.html` convention |
| Profile card: "Save name" / "Change email" disabled, `aria-label` set | Covered | `settings.html:59-67`, `83-92` |
| Profile card: "Save changes" button removed | Covered | Not present in template |
| Subscription card: tier/status badges unchanged | Covered | `settings.html:107-118` |
| Subscription card: renewal sentence, only when usage loaded, guarded against empty quotas | Covered | `settings.html:120-128` |
| Subscription card: "Manage billing" / "View invoices" disabled, no "Visa ending" text | Covered | `settings.html:130-146` |
| Usage card: header "Resets {{date}}", per-row inline reset text removed, progress bar per row | Covered | `settings.html:149-193`; `usagePercent()` guards divide-by-zero (`settings.ts:71-73`) |
| Notifications card: Product updates (default on), Weekly job-search tips (default off), Job-match alerts row removed | Partial | Toggle defaults correct (`settings.ts:52-53`); visible copy for "Weekly job-search tips" row is wrong (see Critical #1); Job-match alerts row correctly absent |
| Notifications toggles not disabled, local-state only, no persistence | Covered | `settings.html:210-227`, no service calls added |
| Danger zone restyled as card with red left accent, unchanged delete logic | Covered | `settings.html:232-251`; `onDeleteAccount()` untouched |
| No Security/password card | Covered | Absent from template; test asserts absence |
| `settings.spec.ts` updated for new structure | Covered (with 1 failing assertion) | See Critical #1; `onDeleteAccount` timeout investigated and ruled out as a flake, not a defect |
| No new HTTP calls / API changes | Covered | No new service methods or endpoints introduced |

## Plan Deviations

- None structurally — the implementation follows the plan's file list, module additions (`FormsModule`, `InputTextModule`, `ToggleSwitchModule`, `ProgressBarModule`), and signal additions exactly as specified. The only deviation is the notification row copy described in Critical #1, which is a spec-text mismatch rather than a plan-structure deviation.

## Null Safety Issues

None. `?? ''` fallbacks are applied consistently for `displayName`/`email` inputs; `usagePercent()` guards `limit === 0`; `@if (usage.quotas.length > 0)` / `@if (subUsage.quotas.length > 0)` guard array-index reads of `quotas[0].resetsAt` in both the Subscription and Usage cards.

## Code Smells

None. The shared `quotas[0].resetsAt` read is duplicated once between the Subscription and Usage card templates (as anticipated/accepted in the plan, Step 2.3) rather than being pulled into a computed signal — acceptable given the plan explicitly called this out as reuse-by-duplication rather than a new abstraction, consistent with the "minimal footprint" rule.

## Recommendation

- Fix critical issue before merge (correct the Weekly job-search tips label/description text to match spec).
