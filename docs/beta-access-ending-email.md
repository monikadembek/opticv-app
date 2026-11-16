# What hapenns when 2 free months end

One thing to plan for: what happens when the 2 free months end. The subscription doesn't stop on its own. Stripe will try to charge the first paid invoice, and with no card on file:

1. The payment fails and the subscription goes to past_due. Stripe may also email testers that their payment failed, which can alarm people who were told the beta is free.
2. After its retries, Stripe cancels the subscription, your customer.subscription.deleted handler runs, and the tester drops to the Free plan.

To keep that from confusing testers:

- Send a reminder about a week before the free period ends: "your beta access ends on X; add a card if you want to continue, otherwise you'll move to Free."
- Check the Stripe Dashboard settings for failed-payment emails to customers, and for what happens after all retries fail (cancel is the one you want).
- Or set cancel_at on beta subscriptions so they end cleanly without going through past_due at all.

# Beta Access Ending Reminder Email

Sent about **1 week before** a tester's free Basic period ends. See `beta-testing-and-launch-plan.md`
(section 3) and `beta-acceptance-email.md`.

Why it's needed: beta testers subscribed without a card (`payment_method_collection: 'if_required'`).
When the 100% coupon ends, Stripe tries to charge the first paid invoice, which fails with no
payment method. The subscription goes to `past_due` and is cancelled after the retries. This email
tells testers what will happen before then, so a failed-payment message doesn't surprise them.

Replace before sending:

- `[First name]`
- `[END DATE]`: when the coupon ends (Stripe Dashboard → the customer's subscription → discount end date)
- `[BASIC PRICE]`: the current Basic price, e.g. €X/month
- `[FEEDBACK LINK]`: a 1-question form (see below), or ask them to reply to the email
- Optional: `[THANK-YOU CODE]` and its terms, if you offer beta testers a discount for continuing

---

## Subject line (pick one)

- Your OptiCV beta access ends on [END DATE]
- [First name], your free OptiCV months are almost over
- Heads-up: your OptiCV beta ends next week

## Email body

> Hi [First name],
>
> A quick heads-up: your free OptiCV Basic access from the beta ends on **[END DATE]**.
>
> First of all, **thank you**. Your feedback during the beta has really shaped OptiCV.
> [Optional, personalise: "Your point about ___ led directly to ___."]
>
> **What happens next is up to you:**
>
> **Want to keep Basic?**
> Go to **opticv.net → Settings → Manage billing** and add a payment method before [END DATE].
> Basic then continues at [BASIC PRICE], and you can cancel anytime.
>
> **Don't want to continue?**
> You don't need to do anything. After [END DATE] your account moves to the **Free plan**. You keep
> your account and can still use OptiCV within the free limits. Stripe may send you an automatic
> "payment failed" email when the free period ends. You can ignore it. Nothing will be charged,
> because there's no card on your account.
>
> [Optional thank-you offer]
> **A thank-you for beta testers:** if you'd like to continue, reply to this email and I'll apply
> [THANK-YOU OFFER, e.g. "30% off for the next 3 months"] to your subscription.
>
> **One last question (30 seconds):**
> Whether you stay or not, I'd love to know why. Just hit reply, or answer here: [FEEDBACK LINK]
>
> And how's the job search going? If you landed interviews or a new job while using OptiCV, I'd
> love to hear about it. 🎉
>
> Thanks again for being one of the first OptiCV users!
>
> Monika
> Founder, OptiCV
> opticv.net

---

## Optional 1-question feedback form

**Will you continue with OptiCV after the beta?** (single choice)

- Yes, I'll continue on Basic
- Maybe later, when I'm job hunting again
- No, I'll use the Free plan
- No, I don't need OptiCV anymore (e.g. found a job 🎉)
- No, it didn't help me enough

**Why?** (long text, optional)

**Can I contact you in a few weeks to ask how your job search went?** (yes/no)

---

## Before sending

- [ ] **Stripe customer portal** (Dashboard → Settings → Billing → Customer portal) allows customers
      to **update payment methods**, so "Manage billing" really lets testers add a card.
- [ ] Tested on staging/test mode: a no-card subscription whose 100% coupon has ended → add a card in
      the portal → next invoice is paid → subscription stays `active`.
- [ ] Checked Stripe Dashboard → Billing → **Subscriptions and emails**: what happens after all
      retries fail (cancel recommended), and whether failed-payment emails go to customers. If you turn
      those emails off, remove the "Stripe may send you…" sentence.
- [ ] If you're offering the thank-you discount: coupon created in Stripe, and you know how to apply it
      to an existing subscription (Dashboard → subscription → Add coupon).
- [ ] End dates checked per tester. They differ, because testers activated their codes on different days.
- [ ] Testers who **already added a card** or upgraded are excluded from the send.

## Optional alternative: end beta subscriptions cleanly

Instead of letting no-card subscriptions fail and go through `past_due`, you can set `cancel_at` on
each beta subscription to the coupon end date (Dashboard → subscription → Cancel → "on a custom
date", or via the API). The subscription then ends cleanly on that date, with no failed invoice and no
Stripe failed-payment email. If you do this, change the email:

- "Want to keep Basic?" → "Go to Settings → Upgrade to Basic after [END DATE]" (or remove the
  scheduled cancellation in Manage billing, if the portal allows it)
- Remove the "Stripe may send you a payment failed email" sentence.
