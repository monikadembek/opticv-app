Task 107. Setup Stripe in dev mode

Description:

Setup Stripe payments, for now in dev mode.

1. Stripe dashboard (test mode): create Products/Prices for BASIC/PRO tiers, get test API keys and a webhook signing secret. Test mode requires no bank account — only needed later when you enable live payments/payouts.
2. Backend: add STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET to development.env + Joi validation; create a StripeModule with StripeService (SDK client), a checkout-session endpoint, and a webhook endpoint (raw-body) that updates the Subscription row on checkout.session.completed / customer.subscription.updated / deleted.
3. Frontend: a "Upgrade" button that calls the checkout-session endpoint and redirects to Stripe Checkout; a billing/settings section showing current tier and a "Manage billing" link (Stripe customer portal).
4. Local webhook testing: Stripe CLI (stripe listen --forward-to localhost:3000/api/...) to forward events in dev.