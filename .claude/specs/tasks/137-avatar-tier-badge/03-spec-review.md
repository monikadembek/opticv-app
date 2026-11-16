# Specification Review – Task 137: Show small tier badge on the avatar

### Summary

- Overall assessment: **PASS WITH ISSUES**
- Justification: The spec covers the raw task's one requirement: a Free/Basic/Pro badge next to the avatar for logged-in users. It ties that requirement to the actual code (`TopHeader`, `PlanUsageStore.effectiveTier`, `TIER_LABELS`). The developer answered the clarifications (tier source, placement, colors, loading state), and the spec reflects every answer. The remaining issues are minor: a factual error about the avatar label, a few under-specified behaviors (reload state, mobile overflow, color tokens), and some acceptance wording that is tied to implementation details. None of them blocks implementation.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Avatar label is described as initials, but it is one character.** Edge Cases says "`userLabel()` is short (initials)". In `app.ts`, `userLabel` is the first letter of the email, upper-cased, with `'U'` as the fallback. The conclusion still holds (the pill only needs to fit "Basic"), but the description is wrong.
2. **The reload state is not defined.** Behavior 1 says the badge is hidden "while the profile is loading". `UserSettingsApiService.userProfile` is an `httpResource`. During a `reload()` (for example after checkout) the resource normally keeps the previous value, so the badge would keep showing the old tier until the new value arrives. The spec does not say whether that is the intended behavior or whether the badge should hide during a reload.
3. **The mobile overflow check has no concrete outcome.** Edge Cases says to "check that the pill's overflow fits … and adjust the margin if needed". This tells the implementer to do a check, but it does not say what result is acceptable, for example a minimum viewport width or a maximum pill overflow.
4. **The color tokens are open-ended.** Behavior 5 gives example Tailwind classes but says "final shades may be adjusted". It also allows either "Tailwind utilities or CSS classes", so the styling approach is not fixed. This is acceptable, but the implementer and reviewer could disagree about what "done" looks like.
5. **An acceptance test is tied to a class name.** "Each with its tier-specific class" assumes a class-based styling approach. That approach has not been chosen yet: the Data / API section leaves `<span>` vs `OverlayBadge` open, and `OverlayBadge` might use a `severity` input instead of classes.
6. **The implementation choice is left open.** Data / API defers `<span>` vs PrimeNG `OverlayBadge` to the plan. That is fine for a spec, but some acceptance criteria (class names, the `aria-hidden` placement) depend on which one is chosen.
7. **The SSR explanation is imprecise.** Behavior 8 says the profile resource "is not available during server rendering". The resource is actually gated on `supabase.sessionReady() && currentUser()`, so it does not run on the server only because there is no session there. The expected outcome (no badge in the SSR HTML, no hydration mismatch) is still correct.

#### Unclear or Ambiguous Sections

- **Behavior → 4. Placement:** "about 10–11px", "compact horizontal padding" and "thin white ring/border" are approximate. They are acceptable for a visual detail but cannot be checked exactly.
- **Behavior → 1. Visibility:** "profile loading" does not say whether it means only the initial load or also a reload (see Non-Critical Issue 2).
- **Edge Cases → Narrow/mobile widths:** no pass/fail criterion is given (see Non-Critical Issue 3).
- **Data / API → Possible implementation choice:** the decision is left open, and acceptance depends on it (see Non-Critical Issues 5 and 6).

#### Invented or Unsupported Requirements

None that are unsupported. These go beyond the raw task's single sentence, and each one has a stated source:

- The effective tier (rather than the raw tier), the overlapping-corner placement, distinct colors per tier, and hiding the badge when the tier is unknown come from the developer's answers to the clarifying questions.
- The accessible name (`"Open user menu, Pro plan"`), `aria-hidden` on the badge, and AA contrast follow from the project rules (AXE checks and WCAG AA in `conventions.md`).
- The SSR and hydration requirement follows from the app's SSR architecture.

### Assumptions Detected

| # | Assumption | Explicitly stated? |
| - | ---------- | ------------------ |
| 1 | "Next to the avatar" means a pill overlapping the corner, not a separate inline element | Yes (Assumptions) |
| 2 | The badge appears only on the top-header avatar, not on the Settings page avatar | Yes (Assumptions, Out of scope) |
| 3 | The badge (effective tier) and the menu label (raw tier) may disagree for PAST_DUE/CANCELED users, and this is acceptable | Yes (Assumptions, Edge Cases) |
| 4 | The past-due banner explains the past-due state, so the badge needs no past-due indicator | Yes (Assumptions) |
| 5 | Exact color shades are proposals | Yes (Assumptions) |
| 6 | A `null` subscription record means the badge is hidden, not "Free" | Yes (Edge Cases) |
| 7 | The badge is not separately interactive, and clicking it opens the user menu | Yes (Out of scope, Behavior 4) |
| 8 | `userLabel()` is short enough that an overlapping pill does not obscure it in a meaningful way | Implicit (and the "initials" wording is inaccurate) |
| 9 | During a profile reload, keeping the previous tier visible is acceptable | Implicit (not addressed) |
| 10 | The existing `top-header.spec.ts` mocks can be extended to provide `PlanUsageStore` or the `userProfile` subscription | Implicit (Acceptance) |

### Recommendation

- **Proceed as-is.** The issues above are minor and can be settled in the implementation plan, specifically the reload behavior, the styling approach and the mobile check. Optionally, revise the spec first to correct the "initials" wording and to state the intended reload behavior.
