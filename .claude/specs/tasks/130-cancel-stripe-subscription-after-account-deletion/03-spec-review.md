# Specification Review — Task 130 (re-review)

### Summary

- Overall assessment: **PASS**
- Justification: The spec covers the task's one explicit requirement, follows every clarification answer, and now handles all critical and most non-critical points from the previous review. The `resource_missing` exception and the "Stripe succeeds, a later step fails" path are now listed as assumptions and edge cases. The dialog sentence now has an exact condition (paid tier with status `ACTIVE`, `TRIALING` or `PAST_DUE`) and matching FE tests. The remaining items are small wording and consistency points that the implementation plan can settle.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Behavior step 4.3 doesn't mention the `resource_missing` exception.** Step 4.3 says "If any Stripe call throws… throw `InternalServerErrorException`". The exception is described only in Edge Cases and Assumptions. Adding a cross-reference in step 4.3 would remove the apparent contradiction for a reader who follows only the Behavior section.
2. **`resource_missing` is defined only for the list call.** It isn't defined for a subscription that disappears between listing and canceling, a narrow race. Under the current wording this aborts the deletion, and a retry would then succeed. That's acceptable, but it isn't stated.
3. **Concurrent or double delete requests are not mentioned.** Two parallel `DELETE /api/users/me` calls could both try to cancel the same subscription. The second cancel would fail and, under the abort rule, return 500. The impact is low because the frontend `isDeleting` loading state prevents double submits. This is carried over from the previous review.
4. **Dialog condition vs backend source of truth.** The dialog relies on the DB `Subscription` row. The backend relies on Stripe. If a webhook was missed, a paying user may not see the sentence even though their subscription will be canceled. Behavior step 1 says the condition is "used only for the dialog text", which implies this, but it isn't called out as a known limitation.

#### Unclear or Ambiguous Sections

1. **Terms §15 replacement wording (Scope).** Only the intent is given. The spec doesn't say whether the new sentence should state "immediately" and "without a refund for the remaining period". That matters next to the 14-day withdrawal wording elsewhere in the Terms. This is carried over.
2. **"Last updated" date (Scope).** It's not specified whether the date should be the implementation date or the release date. This is carried over.
3. **Module wiring (Data / API).** The fix for the circular dependency is explicitly left to the implementation plan. That's acceptable for a spec, but it's an open design decision.

#### Invented or Unsupported Requirements

None. Everything beyond the raw task is backed by the clarification answers (cancel mode, abort on failure, cancel all subscriptions on the customer, dialog and Terms updates, conditional dialog sentence) or follows directly from them:

- The `Last updated` date bump follows from editing the Terms.
- The `resource_missing` handling is now listed as an assumption.

### Assumptions Detected

| # | Assumption | Explicitly stated? |
| - | ---------- | ------------------ |
| 1 | "Immediately, no refund" maps to `prorate: false`, `invoice_now: false` | Yes |
| 2 | `canceled` and `incomplete_expired` are final and skipped. All other statuses are canceled | Yes |
| 3 | The Terms change favors the user, so §16's 14-day notice doesn't apply | Yes |
| 4 | A missing or deleted Stripe customer (`resource_missing` on list) doesn't block deletion | Yes |
| 5 | Losing the subscription when a later deletion step fails is accepted | Yes |
| 6 | Dialog condition: tier `BASIC` / `PRO` and status `ACTIVE` / `TRIALING` / `PAST_DUE` | Yes |
| 7 | `cancelAtPeriodEnd = true` still counts as active for the dialog | Yes |
| 8 | Dialog and Terms wording may be refined during implementation | Yes |
| 9 | Leftover `customer.subscription.deleted` webhooks only need a warning log | Partly. It's in Behavior step 8 and Edge Cases, not under Assumptions |
| 10 | The Stripe customer object (email, metadata `userId`) can stay in Stripe after deletion | Partly. It's listed as Out of scope, but the privacy implication isn't discussed |
| 11 | The existing FE error toast is enough for the new 500 path | Partly. Behavior step 7 says "unchanged" |
| 12 | The dialog may differ from the backend outcome if DB and Stripe are out of sync | No. It's implied by Behavior step 1 |

### Recommendation

- **Proceed as-is.** The open points (non-critical issues 1–4, unclear sections 1–3) are minor and can be settled in the implementation plan.
