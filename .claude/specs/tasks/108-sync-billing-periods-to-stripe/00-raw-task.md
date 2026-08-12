Task 108. Sync billing periods to Stripe (and give FREE tier a real cycle)

Description:

In settings page we display 'Plan renews on' date, currently it always displays first day of next month date. Now that we have integrated Stripe payments we should display the currentPeriodEnd date from Subscription table.

The first day of the month logic for periodStart in usage_quotas table is incorrect now.
PeriodStart should be the same as currentPeriodStart from Subscriptions table.

The FREE tier should also have the currentPeriodStart and currentPeriodEnd updated as we also have limits for FREE tier.

I already discussed this with Claude and he came up with the solution and the plan that is stored in @docs/sync-billing-periods-to-stripe.md.
Use that plan when preparing specs and your plan.


