# Specification Review — 127-cookie-consent-banner

### Summary

- Overall assessment: **PASS WITH ISSUES**
- The spec covers what the raw task asks for: PostHog no longer loads without consent, and EU/UK users get a banner. Every scope decision traces back either to the task or to the answered clarifications (everyone sees the banner, PostHog isn't loaded before consent, Sentry is excluded, the choice can be changed in three places). No critical issues block implementation. Several gaps should be resolved before planning so the implementer doesn't have to guess: page-view capture at the moment of Accept, leftover PostHog storage, how the state holder is built, and a few vague UI constraints.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Page view on Accept is unspecified** (Behavior → Accept). The router `$pageview` subscription starts only after Accept, so the current page's `NavigationEnd` has already fired and won't be captured by the manual subscription. The spec also keeps `defaults: '2026-05-30'`, which may turn on PostHog's own automatic page-view capture. The spec doesn't say:
   - whether the page the user is on when they accept should get a `$pageview`;
   - how duplicate page views (automatic plus manual) should be avoided, or whether duplicates are acceptable as today's behavior.
2. **Leftover PostHog storage isn't handled outside the "accepted → rejected in the same page load" path.** Example: a user accepted earlier, then the record becomes invalid (version bump, corrupted JSON) or is set to `rejected` from another tab. PostHog isn't initialized on the next load, so `posthog.reset()` never runs and existing `ph_*` cookies and `localStorage` keys stay. This conflicts with the Acceptance line "With no stored decision … no `ph_*` cookies or `localStorage` keys exist" for returning users.
3. **The state holder's design is left open** (Scope → "a root-provided service or signal store"). The conventions say: "Use ngrx signals store for state shared among features or components." This state is shared by `PosthogService`, the banner, the footer, Settings and the privacy policy, so the spec should state which one to use rather than leave it to the implementer.
4. **Unverified dependency on posthog-js behavior** (Edge Cases → direct `posthog.capture(...)` calls). The spec defers to implementation the check that calls made before `init` are silent no-ops. That they don't throw or send requests is an unverified assumption. The spec also doesn't say whether console warnings from those calls are acceptable.
5. **AXE compliance has no verification method** (Accessibility, Acceptance). "The page must pass AXE checks" is required, but no tool or test type is named (unit test, e2e, manual DevTools audit), so the criterion can't be checked consistently.
6. **E2E coverage isn't mentioned.** The repo has `opticv-web-e2e` (Playwright) and CI runs `e2e-ci`. The spec neither requires nor excludes e2e tests for the banner or for the "no PostHog requests before consent" check, which is easiest to confirm at the network level.

#### Unclear or Ambiguous Sections

1. **Edge Cases → Small screens:** "the banner must not cover the footer's 'Cookie settings' link permanently." It is unclear what "permanently" means. While the banner is open, the footer link that reopens it isn't needed, and once a choice is made the banner is gone. The real constraint is probably "must not hide page content or footer controls in a way that can't be scrolled past," but the spec doesn't say so.
2. **Edge Cases → Welcome guide modal:** "the banner must not block or cover the modal's controls" doesn't set a stacking order. The spec doesn't say whether the banner sits above or below the PrimeNG modal mask, or whether it should wait until the modal closes before appearing.
3. **Behavior → Changing the choice later, item 1:** "Dismissing isn't possible without choosing" is stated for the reopened banner. It is unclear whether the first-visit banner is also non-dismissable. It is implied (only two buttons are listed) but not stated.
4. **Behavior → Settings toggle, item 3:**
   - The section name is given only as "for example 'Privacy'".
   - The description is given only as copy "along the lines of …".
   - The banner text is also described, not specified (Behavior → First visit, item 4).

   Copy is listed as an assumption, but the section heading should be fixed so tests can rely on it.
5. **Accessibility → focus return:** "focus returns to the control that opened it." The spec doesn't say what happens to focus after a first-visit choice, when no control opened the banner.
6. **Behavior → Persisted record:** the `version` field and the "version other than the current constant → invalid" rule are clear. It is unclear whether a record with a *higher* version (for example, after a rollback) should also be treated as invalid. "Other than" implies yes; confirm this is intended.

#### Invented or Unsupported Requirements

None ungrounded. These items go beyond the raw task text but trace back to the answered clarifications or the project conventions:

- the footer link, Settings toggle and privacy policy button (clarification answer);
- the accessibility focus rules (conventions: WCAG AA and AXE).

These are design decisions the spec authored rather than requirements from the task or the answers. They are reasonable, but should be confirmed by the PO/developer:

- the consent `version` field and re-prompting by version bump;
- the reopened banner being non-dismissable;
- the Settings toggle taking effect immediately with no Save button;
- `posthog.reset()` being required when consent is revoked.

### Assumptions Detected

| #   | Assumption                                                                                             | Explicitly stated?                                                        |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1   | Consent is per browser, not per account; the Settings toggle reflects this browser only                | Yes (Assumptions)                                                         |
| 2   | Consent never expires on a timer; re-prompting happens only through a version bump                    | Yes (Assumptions)                                                         |
| 3   | Strictly necessary storage, Stripe and Sentry aren't controlled by the banner                          | Yes (Assumptions)                                                         |
| 4   | Existing PostHog config and manual `$pageview` capture stay unchanged                                  | Yes (Assumptions)                                                         |
| 5   | Banner and Settings copy is written during implementation, English only                                | Yes (Assumptions)                                                         |
| 6   | The consent `localStorage` key is strictly necessary and needs no consent itself                       | Yes (Data / API)                                                          |
| 7   | posthog-js `capture()` before `init` is a silent no-op                                                 | Partially (Edge Cases, marked "to confirm")                               |
| 8   | posthog-js supports `opt_out_capturing()`, `opt_in_capturing()` and `reset()` after `init` as described | No (implicit in Behavior)                                                 |
| 9   | "Not decided" (`null`) is shown as "off" in the Settings toggle                                         | Yes (Behavior, item 3)                                                    |
| 10  | First-time visitors see the banner only after hydration; a short delay is acceptable                   | No (implicit in Behavior → First visit and Edge Cases → SSR)              |
| 11  | Cross-tab live sync isn't needed                                                                        | Yes (Edge Cases)                                                          |
| 12  | No e2e tests are required; unit tests are enough                                                        | No (implicit, because Acceptance lists only unit tests)                   |
| 13  | Logged-in and logged-out users get identical banner behavior                                            | No (implied by "Everyone" and "every route")                             |
| 14  | Leftover `ph_*` storage from earlier consent doesn't need cleanup unless PostHog is initialized in the current page load | No (implicit; see Non-Critical Issue 2)                     |

### Recommendation

- **Revise specification.** The changes are minor: address Non-Critical Issues 1–3 and Ambiguous Sections 1–3, and make Assumptions 8, 10, 12 and 14 explicit. Implementation planning can start once these are settled; the task definition doesn't need to be revisited.
