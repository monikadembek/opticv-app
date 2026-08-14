Task 110. Handle PAST_DUE status in backend, frontend and Stripe dashboard

Description:

PAST_DUE means a renewal invoice payment failed, but Stripe hasn't given up yet.

Stripe automates chasing the card holder. It does not automatically restrict what the app lets the user do — that's the application's responsibility.

Gap: PAST_DUE is stored but not enforced
status is written to the Subscription table and passed through into UserProfile (users.service.ts) for display only. There is no guard or check anywhere gating CV generation/premium features based on status !== 'PAST_DUE'. Today, a user whose card fails keeps full BASIC/PRO access indefinitely until Stripe eventually cancels the subscription outright (which could be weeks later) — no earlier feature-gating happens on the app side.

Suggested pattern (not yet implemented)

- Treat tier gating as tier !== 'FREE' && status === 'ACTIVE' (or explicitly allow TRIALING too) wherever tier is currently checked for feature access.
- Surface a "payment failed, update your card" banner in the frontend when status === 'PAST_DUE', pointing the user at the billing portal session (createPortalSession, stripe.controller.ts), since Stripe's portal lets customers update their payment method directly.