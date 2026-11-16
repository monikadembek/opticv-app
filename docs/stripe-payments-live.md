# Go live with Stripe payments

1. Get the live price IDs

Copying products to live mode creates new price IDs, so your sandbox price\_... values won't work in live mode.

- In the Dashboard, switch to live mode → Product catalog → open each product → copy the price ID, not the product ID.
- Check that each price is recurring and has the right amount, currency and interval.
- These IDs go into STRIPE_PRICE_BASIC and STRIPE_PRICE_PRO. StripeService.priceIdToTier() matches webhook events to tiers using exactly these values. If one is wrong, users pay but their tier never updates; you'd only see an "unknown price id" line in the logs.

2. Get a live API key

- In live mode, go to Developers → API keys.
- I recommend a restricted key (rk*live*...) over the full sk*live*... secret key. The backend only needs:
  - Write: Customers, Checkout Sessions, Customer portal
  - Read: Subscriptions
- The key goes into STRIPE_SECRET_KEY.

3. Create the live webhook endpoint

Developers → Webhooks → Add endpoint, in live mode:

- URL: https://api.opticv.net/api/stripe/webhook (the controller is stripe and the route is webhook, under the global /api prefix).
- Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed
- API version: choose 2026-07-29.dahlia, the version the code is pinned to in stripe.service.ts:39. The handlers read newer payload fields like invoice.parent.subscription_details and the period dates on subscription items. If the endpoint uses an older version, those fields are missing and renewals silently stop syncing.
- Copy the endpoint's signing secret (whsec\_...) into STRIPE_WEBHOOK_SECRET.

4. Set the live Dashboard settings

Sandbox settings don't carry over to live mode. Set these in live mode:

- Customer portal (Settings → Billing → Customer portal): save a configuration. Without one, createPortalSession fails in live mode, which breaks the "Manage billing" button and the past-due banner. If you allow plan switching there, add both live products.
- Payment retries and dunning (Settings → Billing → Subscriptions and emails): Smart Retries, failed-payment emails, and what happens after the last retry (cancel the subscription vs mark the invoice uncollectible). Your code expects cancellation, which fires customer.subscription.deleted.
- Customer emails: receipts and upcoming-renewal reminders.
- Payment methods: keep to cards and other methods that confirm instantly. handleCheckoutSessionCompleted sets ACTIVE without checking payment_status, so a method that settles later would unlock paid features before the money arrives (this gap is already noted in docs/stripe.md).
- Public details and branding: business name, support email, statement descriptor, logo and colours. These appear on Checkout, invoices and card statements.
- Tax: decide on VAT before you take real money. Selling digital subscriptions to EU consumers usually means charging VAT (often through OSS). The code doesn't use Stripe Tax (automatic_tax) yet. Turning it on is a small code change, but whether you need it is a business/accounting decision.

5. Update production config only

- Put the 4 live values in the production environment variables on your host (Hostinger), as described in docs/production-deployment-plan.md §1. Setting them in production.env alone isn't enough.
- Keep development and staging on sandbox keys, prices and webhook secrets. Never put live keys in development.env or commit them.
- Restart or redeploy the backend. If a key is missing, Joi validation stops the app from starting.

6. Clear sandbox Stripe IDs from the production database

getOrCreateCustomer() reuses stripeCustomerId if the row already has one. If any user in the production database was created while it used sandbox keys, their stored cus*..., sub*... and price\_... IDs don't exist in live mode. Checkout would then fail with "No such customer." Before launch:

- Set stripeCustomerId, stripeSubscriptionId and stripePriceId to null for those rows.
- Reset their tier to FREE.

If production uses a brand-new Supabase project (the deployment plan suggests this), there's nothing to clean up.

7. Test with a real purchase

1. Buy the cheapest plan with your own real card.
1. Check that the webhook endpoint's delivery log shows 200 for each event.
1. Check that your Subscription row has the live IDs, the correct tier and ACTIVE.
1. Open the billing portal from Settings and cancel. Confirm cancelAtPeriodEnd is updated.
1. Refund yourself from the Dashboard.

Finally, turn on 2FA for your Stripe account if it isn't already, since it now handles real money.

---

## Sending emails about payments

Stripe doesn't email customers about payments until you turn those emails on in live mode. Your sandbox settings didn't carry over, so this is expected. There are two settings to check, then you can resend the email for your test payment.

1. Payment receipts (the main one)

Settings → Business → Customer emails (or search "Customer emails" in the Dashboard search bar):

- Turn on Successful payments. Stripe then emails a receipt after every charge, including each monthly renewal. For subscriptions, the receipt includes links to download the invoice PDF and the receipt PDF.
- Turn on Refunds as well, so customers are told when you refund them.

2. Subscription and invoice emails

Settings → Billing → Subscriptions and emails:

- Send finalized invoices and credit notes to customers: emails the invoice itself.
- Upcoming renewal reminders: optional. Some places require advance notice of renewals, and it reduces "I didn't expect this charge" disputes.
- Failed payment emails and expiring card reminders: turn these on. They point the customer to update their card, which works alongside your past-due banner.
- Trial ending reminders: only relevant if you add free trials.

3. Check what the emails show

Customers will see these, so check Settings → Business → Public details (business name, support email/URL) and Branding (logo, colours). If your sandbox account had these filled in, re-check them in live mode.

4. Resend the email for your test payment

Turning these settings on doesn't send anything for payments that already happened:

- Payments → open your payment → Send receipt, or
- Customers → your customer → Invoices → open the invoice → Send invoice, or download the PDF there.

If the email still doesn't arrive

- Check the customer's email address in Stripe (Customers → your customer). Your backend copies the user's login email onto the Customer when it creates it (getOrCreateCustomer()), so it should be your login email.
- Check your spam folder. Emails come from Stripe's domain on your behalf.
- Check the payment page's history. It shows whether a receipt was sent and to which address.

None of this needs a code change.

---

## Preparing payments for limited number of beta testers

I would like to have a limited number of beta testers and offer them trial plan of Basic plan. How could I do that? What is required to do this?

You can do this mostly in Stripe with a very small code change. There are two good ways to do it. I recommend the first.

Option A (recommended): a 100%-off promotion code with a redemption cap

In the Stripe Dashboard (test mode first, then again in live mode):

1. Create a coupon: 100% off, duration "repeating" for however long the beta lasts (for example 3 months), and limited to the Basic product so it can't be used on Pro.
2. Create a promotion code on that coupon, for example OPTICV-BETA. Set max redemptions to the number of testers (for example 20) and optionally an expiry date. The redemption cap is your limit on the number of testers.
   - If you want a code that can't be passed around, create one single-use code per tester instead (max redemptions = 1 each).

In the code, createCheckoutSession in apps/opticv-be/src/app/stripe/stripe.service.ts needs two extra options:
allow_promotion_codes: true, // shows a "Add promotion code" field in Checkout
payment_method_collection: 'if_required' // no card needed when the total is €0

That's all. The rest of your webhook flow already handles it:

- checkout.session.completed and invoice.paid set the user to tier: BASIC, status: ACTIVE, with billing periods synced from Stripe, so quotas work as for a paying user.
- When the coupon runs out, Stripe tries to charge. A tester who has added a card in the Billing Portal becomes a paying customer automatically. One who hasn't gets invoice.payment_failed → PAST_DUE, and your effective-tier logic in optimization.service.ts already treats them as FREE. After Stripe's retries, customer.subscription.deleted moves them back to FREE.

Trade-off: in Stripe and in your DB, testers show up as ACTIVE subscribers at €0, not as "trialing". Your revenue reports will include €0 subscriptions.

Option B: a real Stripe trial, limited to invited users

Use this if you want proper TRIALING status and "your trial ends on X" messaging. It takes more work:

- Checkout: add subscription_data.trial_period_days, payment_method_collection: 'if_required', and trial_settings.end_behavior.missing_payment_method: 'cancel'.
- Limiting who gets it: Stripe has no cap on trials, so your backend has to enforce it. For example, add a BetaInvite table (code, redeemedByUserId, redeemedAt) or a betaEligible flag on User, and only add the trial when the request has a valid unused invite.
- Webhook fixes:
  - handleCheckoutSessionCompleted always writes status: 'ACTIVE'. It needs to map subscription.status instead.
  - handleInvoicePaid also forces ACTIVE. Stripe sends a €0 invoice.paid at trial start, which would overwrite TRIALING.
- Frontend: show the trial state and its end date in settings. Optionally handle customer.subscription.trial_will_end to send a reminder email.

What I'd skip: setting BASIC by hand in the database

You could edit the DB directly. But you'd then need a cron job to downgrade testers, the quota period handling would need special cases, and your Stripe customers would no longer match your DB.

Either way

- Test the full cycle in Stripe test mode, including the end of the free period. Test clocks let you skip ahead in time.
- Repeat the coupon or promo code setup in live mode (see docs/stripe-payments-live.md), because test-mode objects don't carry over.
- Tell testers what happens when the beta ends (add a card to continue, or they go back to Free automatically).

Want me to add the two Checkout options for Option A, or write a spec for Option B in docs/?

---

# TAX

Tax: decide on VAT before you take real money. Selling digital subscriptions to EU consumers usually means charging VAT (often through OSS). The code doesn't use Stripe Tax (automatic_tax) yet. Turning it on is a small code change, but whether you need it is a business/accounting decision.

That bullet packs three separate things together: the tax rule, how Stripe can help with it, and what the code would need. Here they are one at a time.

I can explain how this works, but I can't tell you what you're legally required to do. Confirm that with an accountant who knows your country's rules.

1. The tax rule

OptiCV is a subscription sold online and delivered automatically. EU VAT law treats that as an "electronically supplied service", which has its own rules:

- Sales to consumers (B2C): VAT is normally charged at the rate of the customer's country, not yours. A buyer in Germany pays German VAT (19%), a buyer in France pays French VAT (20%), and so on.
- Sales to businesses with a valid EU VAT number (B2B): for a cross-border sale you usually charge 0% ("reverse charge"), and the buyer accounts for the VAT themselves.
- Small-seller exception: if your total cross-border B2C sales across the EU stay under €10,000 a year, you can usually apply your home country's VAT rules instead. Whether you then charge VAT at all depends on your home country. Some countries' small-business exemptions don't cover electronically supplied services, so this is the main thing to confirm with your accountant.
- Outside the EU: the UK, Norway, Switzerland and others have their own VAT/GST rules for digital services, and US states have sales tax rules. Most of these only apply above certain sales levels.
- Proof of location: you have to keep evidence of where each customer is, such as their billing address and card country.

2. What "OSS" means

Charging VAT in 27 countries could mean registering in all 27. The One-Stop Shop (OSS) avoids that:

- You register for OSS once, in your home country.
- Every quarter you file one OSS return listing VAT collected per EU country, and pay the total to your own tax office, which passes it on.
- You still keep your normal VAT registration in your home country.

3. What Stripe Tax does

Right now Checkout charges exactly the price amount, with no tax calculated. Stripe Tax would add that:

- It works out the customer's location and applies the correct country rate.
- It handles reverse charge when the buyer enters a valid VAT number.
- It shows tax on Checkout and on invoices, including renewals.
- It produces reports you can use for your OSS return.

What it doesn't do:

- It doesn't file returns or register you. You (or your accountant) still do that.
- It only collects tax where you've added a registration (Dashboard → Tax → Registrations). If you turn on automatic tax without one, it silently collects 0 tax, with no error. Past sales can't be fixed afterwards.
- It costs extra: Stripe Tax charges a fee per transaction on top of normal processing fees. Check their current pricing.

4. The "small code change"

If you decide to use it, there's some Dashboard setup first, then one code edit:

Dashboard (live mode):

1. Tax → Settings: add your head office address and choose a default tax code for SaaS. Pick it from Stripe's list; don't guess it.
2. Tax → Registrations: add your home-country registration and your OSS registration, if you have them.
3. On each price, set tax_behavior: inclusive (the tax comes out of the price you show) or exclusive (tax is added on top). EU consumers normally expect prices that already include VAT. Prices copied from the sandbox are probably "unspecified", and this setting can only be set once per price.

Code: the edit goes in createCheckoutSession() in apps/opticv-be/src/app/stripe/stripe.service.ts, adding roughly:
automatic_tax: { enabled: true },
customer_update: { address: 'auto', name: 'auto' }, // save the address entered at Checkout to the existing Customer
billing_address_collec
The subscription that Checkout creates keeps automatic tax turned on, so renewals are taxed the same way. The webhook code doesn't need to change.

5. Your options

1. Use Stripe Tax: register for OSS if your accountant says you need it, then do the setup above. You stay the seller and file the returns.
1. Handle it without Stripe Tax: if you're under the €10k threshold and your home country lets you skip VAT, you might not need it yet. Stripe's threshold monitoring only counts live-mode sales, so it starts from zero when you go live; keep an eye on your totals as you grow.
1. Use a "Merchant of Record" such as Paddle or Lemon Squeezy instead of Stripe directly. They are legally the seller, so they handle all VAT worldwide, in exchange for a higher fee. Many solo SaaS founders choose this to avoid tax admin entirely, but it would mean replacing the Stripe integration.

Settle this before your first real sale. If you should have charged VAT and didn't, you owe it out of your own revenue and can't collect it from customers afterwards.

---

## I live in Poland but will offer this app to international customers, probably most will be from UK and US, should I switch on Tax ID in Stripe?

You can switch it on, but it matters very little for your app. Your UK customers are the much bigger issue.

As before, this is general information. Check it with a Polish accountant who knows cross-border digital services.

What "Tax ID collection" does

It adds an optional "I'm buying as a business" checkbox to Checkout, where the customer can enter a VAT number. It's only useful together with Stripe Tax: Stripe checks the number and applies reverse charge, so a business buyer in the UK or another EU country isn't charged VAT. Without Stripe Tax, the number is simply printed on the invoice.

For OptiCV specifically:

- Most buyers are individual job seekers, who have no VAT number, so the field would rarely be used.
- US customers have no VAT ID system, so the field does nothing for them.
- It's only worth having for the occasional business buyer, such as a recruiting agency or a company paying for an employee.

Recommendation: enable it when you enable Stripe Tax, since it's cheap and harmless, but don't treat it as a priority. For your integration it isn't just a Dashboard toggle. You'd add tax_id_collection: { enabled: true } plus customer_update: { name: 'auto', address: 'auto' } to createCheckoutSession(). Stripe requires the customer_update part because you pass an existing Customer.

What actually matters for your markets

🇬🇧 UK (most important)

- After Brexit, a business outside the UK selling digital services to UK consumers generally has to register for UK VAT from the first £1. As I understand it, the £90k registration threshold only applies to UK-based businesses.
- You'd charge 20% UK VAT and file UK VAT returns with HMRC. EU OSS doesn't cover the UK.
- If most of your customers are in the UK, you need this answered before launch.

🇺🇸 US

- There's no federal VAT. Each state has its own sales tax, and you only have to collect it once you pass that state's "economic nexus" threshold, typically $100,000 in sales per year in that state (some states also count number of transactions).
- Many states don't tax SaaS at all.
- A new app is unlikely to reach those thresholds soon. Stripe Tax's threshold monitoring can warn you as you g

🇵🇱 Poland and the EU

- Polish customers: Polish VAT at 23%, unless your accountant confirms the small-business exemption covers elecin your case.
- Customers elsewhere in the EU: under €10k a year in total, Polish rules apply. Above that, you charge each customer's country rate through OSS, which you'd register for in Poland.

Your realistic options

1. Stripe Tax: register for UK VAT (and OSS when needed), add those registrations in Stripe, then turn on automn. You stay the seller and file UK and Polish returns yourself or through an accountant.
   mon Squeezy): they become the legal seller, handle UK VAT, EU VAT and US sales tax for you, and pay you out. The fee is higher, but you have no foreign tax registrations to manage. For a solo founder selling mainly to the UK and US, this is worth a serious look. It would mean replacing the Stripe integration.

Questions for your accountant:

- Do I need UK VAT registration from the first sale?
- Does the Polish VAT exemption cover my sales?
- Do I need OSS yet?
- Is a Merchant of Record simpler for me overall?
