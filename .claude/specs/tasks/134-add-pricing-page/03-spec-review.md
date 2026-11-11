# Spec Review — Task 134: Create pricing page (re-review)

### Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification covers every explicit requirement of the task (public `/pricing`, Free/Basic/Pro with quotas, existing Stripe flow for buttons, Settings linking to the page, data from the landing page). The previous open items on Stripe price parity and Free templates are now resolved by PO answers and reflected in the spec. Remaining issues are non-blocking: some scope is derived from clarifications rather than the task text and is not traced in the spec, one decision is still parked as an assumption, and several UI states are undefined.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Clarification decisions are not traced in the spec.** The `TIER_LIMITS` stored-CV change, the logged-out login-then-return flow, and the paid-user "Current plan / Manage billing" behavior all come from clarification answers, not from `00-raw-task.md`. The spec presents them as requirements without a "Decisions" note naming their source.
2. **Existing-user impact is still undecided.** Edge Cases says existing users above the new limits (Free with 2 CVs, Basic with 6–10) are left untouched "(assumption)… Confirm with PO before release". This is a behavior decision with user impact, not an assumption; it remains open. Also unstated: what the Settings usage section shows for such users (e.g. `2 / 1`).
3. **Unverified statement in Scope/Data.** Backend enforcement (`CV_LIMIT_EXCEEDED`, `/users/me/usage`) is claimed to pick up new values "automatically"; the spec does not confirm no other code hard-codes the old limits (e.g. frontend messages, seed data, docs).
4. **Landing-page wording conflict not addressed.** The landing page subtitle says "Upgrade to Pro for unlimited CV optimizations, cover letters, and interview prep" while its plan list says 30. The spec does not say which wording the app's page headline/subtitle should use ("short subtitle" is unspecified).
5. **Hard-coded prices/taglines.** Prices and taglines are constants copied from the landing page; the spec doesn't state how they stay in sync with Stripe (the PO confirmed parity today only).
6. **Structure/formatting.** The Context quota table uses merged-cell syntax (`|||` rows 24 and 26) that will not render correctly in Markdown. An added "Assumptions" section deviates from `template.md` (acceptable). "Data / API" mixes API, shared-types and file-list content.
7. **Acceptance criteria partly unverifiable as written.** "Passes AXE / WCAG AA", "works on mobile width" and "no breaking changes" have no stated verification method or breakpoint.
8. **Resolved since the last review:** Stripe price parity (Assumption 1, PO-confirmed) and Free templates (kept at two, landing page to be updated by PO) are now consistent throughout the spec (verified in Context table, Scope 5, Out of scope, Acceptance). The `returnUrl` concern is also resolved by inspection: `getSafeReturnUrl` accepts any same-origin path starting with `/` (rejects `//` and `/\`), so `/pricing` needs no allow-list change. The spec's phrase "must be accepted as a valid return URL" can be read as a verification item, not a code change.

#### Unclear or Ambiguous Sections

- **Behavior → CTA table, "Logged in, paid", Free card:** "shows no purchase action" does not say what the card displays.
- **Behavior → CTA table, logged-out, Free card:** "Get started for free" → `/login` with `returnUrl=/pricing` – unclear whether Free sign-up should return to `/pricing` or go to the app's normal post-login destination.
- **Behavior → "Paid" definition:** PAST_DUE and `cancelAtPeriodEnd` users are labelled "Current plan" with no extra state (e.g. past-due notice) described.
- **Edge Cases → loading and profile-error states:** "disabled/loading" and "disabled CTAs" are not defined visually or textually; in the error case the user has no stated path forward.
- **Behavior → Page layout:** headline is given, subtitle is not; exact CTA labels vary by state ("Get Basic" vs "Upgrade to Basic") and the rule is only implicit in the table.
- **Scope 3:** "moved/shared… decided in the plan" leaves ownership of the checkout/portal logic open (acceptable for a spec, but noted).
- **Data/API → Analytics:** "Drop if the plan decides otherwise" makes a requirement optional without an owner.

#### Invented or Unsupported Requirements

1. **PostHog `pricing_cta_clicked` event (Data/API → Analytics)** — no basis in the task or in any clarification. Should be removed or confirmed by the PO.
2. **`TIER_LIMITS` stored-CV change (Scope 5)** — not in the task text; supported only by a clarification answer (see Non-Critical #1).
3. **Paid-user "Current plan / Manage billing" behavior and logged-out `returnUrl=/pricing` flow** — not in the task text; supported by clarification answers.
4. **Edge-case handling (SSR, double click, PAST_DUE, `cancelAtPeriodEnd`) and page title/headline/taglines** — reasonable and partly sourced from the landing page, but not stated in the task.

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
| --- | --- | --- |
| 1 | Prices USD, monthly only, from landing page; Stripe prices match | Yes (Assumption 1, PO-confirmed) |
| 2 | Landing page authoritative for stored-CV limits; app authoritative for Free templates (2) | Yes (Assumption 2) |
| 3 | Existing data over new limits is left untouched | Yes (Assumption 3 and Edge Cases), still needs PO confirmation |
| 4 | No header/footer navigation change | Yes (Assumption 4, Out of scope) |
| 5 | On profile fetch failure, CTAs stay disabled, no extra toast | Yes (inline in Edge Cases, not in the Assumptions list) |
| 6 | PostHog event wanted and cookie-consent gated | Yes (inline, marked assumption) |
| 7 | "Paid" = Settings' `hasActivePaidSubscription` rule | Implicit (stated as design) |
| 8 | Taglines, included-features list and headline copied from the landing page as-is | Implicit |
| 9 | No other code hard-codes the old stored-CV limits | Implicit, unverified |
| 10 | Free CTA for logged-out users should also return to `/pricing` | Implicit |

### Recommendation

- [ ] Proceed as-is
- [x] **Revise specification (minor)** — add a short "Decisions" section tracing clarification sources, move existing-user impact to a resolved decision or an explicit open question, remove or confirm the analytics event, define the undefined UI states (Free card for paid users, loading/error), fix the merged-cell tables. No further task-definition changes are needed.
- [ ] Revisit task definition
