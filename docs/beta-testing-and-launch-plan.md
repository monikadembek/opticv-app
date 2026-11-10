# Beta Testing & Launch Plan

Goal: find the first real users (job seekers), give them free access to the Basic plan for 1–2 months
via promo codes, and collect honest feedback before a public launch.

Job seekers are the right first cohort: they have the problem right now, they will use the app
several times in a short period, and they can say whether it actually got them interviews. That
outcome matters more than whether they liked the app.

## What is already in place

- **Stripe promo codes:** Checkout is created with `allow_promotion_codes: true`
  (`apps/opticv-be/src/app/stripe/stripe.service.ts`). Promo codes only need to be created in the
  Stripe Dashboard, with no code changes.
- **PostHog:** analytics are integrated in the frontend (`core/services/posthog.service.ts`) and
  gated by cookie consent.

---

## 1. Recruit testers through an application

Don't hand out codes freely. Use a short application form (on the landing page, or Tally/Google
Forms):

- Target role / industry
- Seniority level
- How long they have been searching
- How many applications they send per week
- Would they do a 15-minute feedback call? (yes/no)
- Email

People who apply feel more committed and give better feedback. The form also lets you choose a
mix of industries and seniority levels.

**Cohort size:** 20–40 testers. More than that and you can't talk to them properly.

## 2. Spell out the deal

Write the exchange down in the acceptance email, for example:

> 2 months of Basic for free. In return: a short survey after week 2 and a 15-minute call by week 4.

Most free users disappear without saying anything unless you ask for something specific.

## 3. Stripe promo code setup

- Coupon: 100% off, duration **repeating** for 1 or 2 months.
- Prefer **unique promotion codes per tester** (or one code with a `max_redemptions` limit and
  `expires_at`), so a code shared on Reddit can't give away free access to everyone.
- Restrict codes to **first-time customers**.
- **No card required (implemented):** Checkout uses `payment_method_collection: 'if_required'`
  (`apps/opticv-be/src/app/stripe/stripe.service.ts`), so with a 100% off code testers don't
  enter a card.
- **When the free months end:** the subscription stays active, but the first paid invoice has no
  payment method and fails. The subscription goes to `past_due`, Stripe retries per the dunning
  settings, and then cancels it (`customer.subscription.deleted` → user drops to Free). To avoid
  confusing testers with "payment failed" messages:
  - Email testers about 1 week before the free period ends: "your beta access ends on X; to
    continue, add a card in Settings / the billing portal, otherwise you'll move to the Free plan".
  - Check Stripe Dashboard → Billing → Subscriptions and emails settings: what happens after all
    retries fail (cancel is recommended), and whether Stripe sends failed-payment emails to customers.
  - Optional: set `cancel_at` on beta subscriptions so they end cleanly instead of going through
    `past_due`.

## 4. Collect feedback: behaviour, not opinions

"Do you like it?" gets polite answers. Ask about what people actually did:

- Did you send the optimized CV? To how many jobs?
- Did you get responses or interviews?
- What did you change by hand after the optimization?
- When did you get stuck or almost give up?
- What would you use instead if OptiCV disappeared tomorrow?
- Would you pay for it? How much?

Recommended reading: _The Mom Test_ (Rob Fitzpatrick).

### Feedback channels

- **Survey** after week 2 (short, 5–7 questions).
- **15-minute calls** with 5–10 testers. These are the most useful source of insight.
- **Follow-up after 4–6 weeks:** "Did you get interviews / an offer?" Use this for testimonials.

## 5. Use PostHog for the data

- **Funnel:** sign up → upload CV → run optimization → download/export → come back (2nd session).
  This shows where people drop off.
- **Session replays** for testers, if consent allows it. Make sure CV content and text inputs
  are masked.
- **PostHog Surveys:** a short in-app question after the 2nd or 3rd optimization.
- Tag beta users (for example, a person property `beta_tester: true`) so their data can be
  filtered.

## 6. Where to find testers

| Channel                                       | How                                                                                                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LinkedIn** (likely the best channel)        | Founder post: "I built this, looking for 30 job seekers to test it for free." Write personal messages to people with #OpenToWork in your network. Don't copy-paste.                 |
| **Reddit**                                    | r/resumes, r/jobs, r/careerguidance, r/cscareerquestions, country-specific subreddits. Read the self-promotion rules first. Open with useful advice and mention the app at the end. |
| **Bootcamp / course graduates**               | Career changers who are actively applying and happy to give feedback.                                                                                                               |
| **University career offices & alumni groups** | Students and recent graduates looking for their first job.                                                                                                                          |
| **Career coaches & recruiters**               | One coach can bring 10 clients and gives very sharp feedback. Possible future partnership.                                                                                          |
| **Facebook groups / Discord servers**         | Job-seeker communities in your country or industry.                                                                                                                                 |

## 7. After the beta

- **Testimonials:** get written permission from testers who got interviews and add their quotes
  to the landing page. This is the most useful thing the beta produces for marketing.
- **Public launch:** Product Hunt, plus posting regularly on LinkedIn / X about building the app.
- **SEO (long-term traffic):** pages like "CV keywords for [job title]", or a free limited
  "CV check" that leads into signup.
- **Referrals:** for example, a free month for each friend who signs up and pays.

## 8. Watch out for

- **Don't let the beta drag on.** Set an end date of 6–8 weeks, then decide what to change and
  launch.
- **Privacy / GDPR:** CVs contain personal data. Get explicit consent before quoting anyone or
  using their CV as an example, and mask text in session replays.

---

## Timeline (suggested)

| Week | Activity                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------- |
| 0    | Prepare the application form, promo codes, PostHog funnel and survey. Write the outreach posts.     |
| 1    | Publish posts (LinkedIn, Reddit, groups) and send personal messages. Select testers and send codes. |
| 2–3  | Testers use the app. Watch the funnel and replays. Send the week-2 survey.                          |
| 3–5  | Run feedback calls. Fix the biggest problems.                                                       |
| 6–8  | Outcome follow-up (interviews/offers). Collect testimonials. Decide on public launch.               |

## Next steps / materials to prepare

- [x] Beta application form questions → [beta-application-form.md](beta-application-form.md)
- [x] LinkedIn post and Reddit post drafts → [beta-recruitment-posts.md](beta-recruitment-posts.md)
- [x] Acceptance email with the deal and the promo code → [beta-acceptance-email.md](beta-acceptance-email.md)
- [x] Week-2 survey and feedback call script → [beta-survey-and-call-script.md](beta-survey-and-call-script.md)
- [ ] Stripe coupon and promotion code configuration
- [x] "Beta access ending" reminder email (about 1 week before the free months end) → [beta-access-ending-email.md](beta-access-ending-email.md)
- [ ] PostHog funnel, `beta_tester` property and in-app survey → setup described in [posthog-beta-setup.md](posthog-beta-setup.md)
