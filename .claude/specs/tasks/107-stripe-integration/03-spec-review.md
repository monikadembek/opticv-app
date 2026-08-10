# Specification Review — Task 107 (Stripe Integration)

### Summary

- Overall assessment: **PASS WITH ISSUES**
- Justification: The specification covers all four numbered requirements from the raw task (dashboard setup, backend module/endpoints/webhook, frontend upgrade/manage-billing UI, local webhook testing) and grounds them correctly in existing code (`Subscription` model fields, `TIER_LIMITS`, config pattern, `CurrentUser` decorator). All added specifics (pricing, monthly-only, portal-driven plan switching, checkout tier param shape) trace back to the clarifying Q&A phase, not invention. However, a few implementation details are stated more prescriptively than the task warrants, one endpoint's auth/data flow has an unstated assumption worth flagging, and one section (raw-body middleware scoping) risks being wrong for NestJS's actual `rawBody` mechanism.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **`main.ts` raw-body approach may not match NestJS's actual API.** The spec says: "enable `rawBody: true` on `NestFactory.create`; apply `express.raw({ type: 'application/json' })` only to the webhook route." In practice, `NestFactory.create(AppModule, { rawBody: true })` already makes `req.rawBody` available on **all** routes without needing a separate `express.raw()` middleware layered on top — combining both is redundant and could double-parse or conflict. This is an implementation detail, not a functional requirement, but since the spec is prescriptive enough to name the exact mechanism, it should be verified against the installed NestJS/platform-express version before implementation rather than treated as settled.
2. **Customer lookup on `portal-session` assumes `stripeCustomerId` lives on `Subscription`, fetched via `CurrentUser`.** The spec doesn't explicitly say whether the controller loads `Subscription` fresh from Prisma per request or expects it attached to `request.user` already. `CurrentUser` per the Context section returns a Prisma `UserModel`, which per the existing schema likely does not eagerly include `subscription`. Worth clarifying in the spec that `StripeService`/controller must query `Subscription` explicitly (as `UsersService.getProfile()` does via `include: { subscription: true }`) — currently left implicit.
3. **`client_reference_id` vs. Stripe Customer metadata redundancy not reconciled.** The spec creates/stores a Stripe Customer up front (step 3 of Checkout flow) AND sets `client_reference_id: user.id` on the Checkout Session. Once a Customer exists and is passed to the session (`customer: stripeCustomerId`), Stripe also returns that customer id on the webhook event, making `client_reference_id` partially redundant. Not wrong, but the Edge Cases section's webhook user-lookup logic ("by `client_reference_id`... or by `stripeCustomerId`") could be tightened to state a single deterministic lookup order rather than "or."

#### Unclear or Ambiguous Sections

1. **Datatypes section, "Data / API" — conditional scope.** The `cancelAtPeriodEnd`/`currentPeriodEnd` addition to `UserProfile.subscription` is flagged "confirm with user before adding if pursued" — this leaves the spec's own scope boundary open-ended (Edge Cases treats the same fields as "optional/nice-to-have, not blocking"). An implementer reading only "Data / API" and "Acceptance" could reasonably build it or skip it; the spec should pick one for this task rather than defer the decision into implementation.
2. **Success/cancel URL query flag** ("with a query flag to show a success/cancel toast") in the Checkout flow is mentioned but the flag name/values and toast copy are not specified. Minor, but "Behavior" elsewhere in the spec is otherwise concrete enough that this stands out as underspecified.
3. **Webhook event idempotency** is not addressed. Stripe can redeliver the same event (at-least-once delivery); the spec's upsert-based handling is likely idempotent by construction (upsert on `stripeSubscriptionId`/user), but this isn't called out explicitly as a design property, only assumed.

#### Invented or Unsupported Requirements

None. All content beyond the raw task's four bullet points (specific prices, monthly-only cadence, portal-based plan switching, `{ tier }` request body shape, endpoint table, edge cases) is traceable to the clarifying-question answers the user gave before the spec was written, which is within the workflow's Step 1 → Step 2 process, not invention.

---

### Assumptions Detected

- **Auth guard for `checkout-session`/`portal-session` already exists and attaches a usable `request.user`.** Stated explicitly in spec Context ("Supabase JWT verification... already in place per `AuthModule`") — explicitly stated, reasonable given `CurrentUser` decorator already exists.
- **`express.raw()` + `rawBody: true` combination is the correct NestJS pattern** — stated as fact in spec Scope item 2, but not verified against the actual installed `@nestjs/platform-express` behavior (see Non-Critical Issue #1). Not flagged as an assumption in the spec itself.
- **`Subscription` must be loaded separately from `CurrentUser`'s `UserModel`** to get `stripeCustomerId` — implicit, not stated (see Non-Critical Issue #2).
- **Stripe Customer Portal test-mode configuration (which plans/features it allows) is a one-time manual dashboard step**, not code — stated explicitly in Scope item 1.
- **No idempotency handling is needed beyond natural upsert semantics** — implicit, not stated (see Unclear Sections #3).
- **`FRONTEND_URL` (existing config value) is reused for success/cancel/return URLs** — stated explicitly in Behavior section, consistent with existing config.

---

### Recommendation

- **Proceed as-is**, with the three non-critical issues and unclear sections addressed either as inline clarifications in the spec or as implementation-time judgment calls flagged to the user (particularly #1, the `rawBody` mechanism, since getting it wrong would silently break signature verification). None of the findings block starting implementation.
