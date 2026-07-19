# Code Review — Task 94: Welcome Modal + Help Icon

## Summary

- Overall result: **PASS WITH ISSUES**
- The implementation closely follows the spec and plan: `UserGuideStore`, `WelcomeGuideModal`, the login-transition trigger in `app.ts`, and the header help icon are all implemented as designed, with matching unit test coverage. However, the commit also silently changed the header's Sign Out button from a labeled button (`label="Sign Out"`) to an icon-only button (`title="Sign Out"`, no `label`), which is out of scope for this task (it belongs to a separate, still-`todo` RWD task per `docs/tasks-list.md`) and breaks an existing test (`top-header.spec.ts > should show Sign Out button`). The welcome modal is also missing `[dismissableMask]="true"`, so mask-click dismissal — required by the spec — does not actually work with PrimeNG's default `dismissableMask: false`.

## Conventions Violations

### Critical (must fix before merge)

1. **Out-of-scope Sign Out button change breaks a test** — `apps/opticv-web/src/app/layout/top-header/top-header.html:50-55`. The Sign Out `p-button` lost its `label="Sign Out"` attribute (replaced with `title="Sign Out"`, icon-only). This is unrelated to task 94's spec (help icon + welcome modal) and matches a separate, still-`todo` item in `docs/tasks-list.md` ("RWD issue - top menu change Sign out button to icon button on mobile view", task 95, which the same commit's `docs/tasks-list.md` diff edits). Per `.claude/context/rules.md` ("Minimal footprint: Only change what is necessary... Do not refactor... outside the scope of the current task"), this should not have been bundled into task 94. It also breaks `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts:129-134` (`should show Sign Out button`, querying `p-button[label="Sign Out"]`), which now fails deterministically (`npm exec nx test opticv-web` → 1 failed test). This is a real regression, not a pre-existing failure — confirmed via `git log --all -S'title="Sign Out"'`, which shows the change was introduced in this task's own commit `6c1066c`.

### Non-Critical (should fix)

1. **Mask-click dismissal doesn't work** — `apps/opticv-web/src/app/shared/welcome-guide-modal/welcome-guide-modal.html:1-8`. The spec (`02-spec.md` line 73) requires the dialog to be "dismissible via the dialog's own close affordance (X) and via Escape/mask click (PrimeNG defaults)". PrimeNG's `p-dialog` only wires up a mask-click listener when `dismissableMask` is `true` (default `false` — confirmed in `node_modules/primeng/fesm2022/primeng-dialog.mjs`, `enableModality()`: the mask `mousedown` listener is only registered `if (this.closable && this.dismissableMask)`). Since `[dismissableMask]="true"` is not set here, clicking the backdrop will not close the modal, contradicting both the spec and the "PrimeNG defaults" characterization (mask-dismiss is not actually a PrimeNG default). Escape and the X button are unaffected and work correctly via `close()`.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `UserGuideStore` with `isWelcomeModalOpen`/`seenByEmail` state | Covered | Matches spec exactly (`user-guide.store.ts`). |
| `hasSeenWelcome`, `openWelcomeModal`, `closeWelcomeModal`, `markWelcomeSeen` | Covered | All implemented per spec/plan. |
| `localStorage` persistence, SSR-guarded via `isPlatformBrowser` | Covered | `readSeenByEmail`/`markWelcomeSeen` both guarded correctly. |
| Malformed localStorage falls back to `{}` | Covered | try/catch in `readSeenByEmail`. |
| `WelcomeGuideModal` component, 3-step content, `NgOptimizedImage` | Covered | Matches homepage copy/images, condensed as specified. |
| Auto-open on `false → true` login transition, email-gated | Covered | `app.ts` constructor effect extended as planned. |
| `welcome_modal_shown` / `welcome_modal_dismissed` / `help_icon_clicked` PostHog events | Covered | All three captured at the correct call sites. |
| Dismiss via "Got it" and via X/Escape/mask-click both mark seen | Partial | `(onHide)` correctly centralizes `markWelcomeSeen`, but mask-click never triggers `onHide` because `dismissableMask` isn't enabled (see Non-Critical #1). X and Escape work. |
| Help icon in header, visible only when logged in, reopens modal | Covered | `top-header.html`/`.ts`, `aria-label="Open help guide"` present. |
| No breaking changes to existing header behavior | Missing | Sign Out button changed from labeled to icon-only, breaking `top-header.spec.ts` (see Critical #1). |
| Unit tests: store, modal, top-header, app trigger | Covered | All four spec files present with matching coverage per the plan; `npm exec nx test opticv-web` passes except for the one regression above. |

## Plan Deviations

- None in the `UserGuideStore`, `WelcomeGuideModal`, `app.ts`, or help-icon logic — implementation follows `04-implementation-plan.md` step-by-step, including the `(onHide)`-as-single-source-of-truth mechanism from Step 2.
- The plan's Files Summary does not list `welcome-guide-modal.css` as a new file; a CSS file was added for the modal's step-grid styling. This is a reasonable companion to the plan's external-template decision (Step 2 justifies `welcome-guide-modal.html` as external "since this is not a small component"), but the CSS file itself wasn't called out.
- The plan's Files Summary does not mention `top-header.html`'s Sign Out button attribute change or `docs/tasks-list.md` edits — both are undocumented deviations (see Critical #1).

## Null Safety Issues

None. Email/`currentUser()` access is optional-chained (`?.email`) everywhere it's read (`app.ts:48`, `welcome-guide-modal.ts:21`), and `hasSeenWelcome`/`markWelcomeSeen` guard against falsy/absent email correctly.

## Code Smells

None. `UserGuideStore` follows the established `signalStore` pattern; `WelcomeGuideModal` and the header changes are small and single-responsibility; no duplication or magic values beyond the already-spec'd `STORAGE_KEY` constant.

## Recommendation

- Fix critical issues before merge — revert the Sign Out button's `label` → `title` change (out of scope, breaks `top-header.spec.ts`), then re-run `npm exec nx test opticv-web` to confirm the full suite passes. Add `[dismissableMask]="true"` to the welcome modal's `p-dialog` to satisfy the spec's mask-click dismissal requirement.
