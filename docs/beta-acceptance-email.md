# Beta Acceptance Email

Email sent to selected beta testers with their promo code. See `beta-testing-and-launch-plan.md`,
`beta-application-form.md` and `beta-recruitment-posts.md`.

Replace before sending:

- `[First name]`: from Q1 of the application form
- `[PROMO CODE]`: the tester's unique Stripe promotion code
- `[REDEEM BY DATE]`: the promotion code's `expires_at` (give about 2 weeks)
- `[SURVEY DATE]`: about 2 weeks after the email is sent
- `[CALENDAR LINK]`: a booking link for the 15-minute call (Calendly, Cal.com, Google Calendar
  appointment schedule)

Send it from your personal address (or a `monika@opticv.net`-style address), not a `no-reply`
address. Testers should be able to reply to it directly.

---

## Subject line (pick one)

- You're in! Your OptiCV beta access 🎉
- [First name], welcome to the OptiCV beta
- Your 2 free months of OptiCV Basic

## Email body

> Hi [First name],
>
> Thank you for applying. You're in! 🎉 Welcome to the OptiCV beta.
>
> **Your promo code: `[PROMO CODE]`**
> It gives you **2 months of the Basic plan for free**. Please activate it by **[REDEEM BY DATE]**.
>
> **How to activate it (2 minutes):**
>
> 1. Go to **opticv.net** and click **Sign in**.
> 2. Enter your email. We'll send you a 6-digit code, with no password needed.
> 3. Open **Settings** and click **Upgrade to Basic**.
> 4. On the payment page, click **Add promotion code** and enter `[PROMO CODE]`.
> 5. The total should show **0.00**. Confirm, and you're on Basic.
>
> You won't need to enter a card, and nothing will be charged. Before the 2 months end, I'll
> remind you, and you can decide whether to continue on a paid plan or move to the Free plan.
>
> **How to get the most out of the beta:**
>
> - Use it for **real applications**: upload your CV and paste a job ad you're actually applying to.
> - Try it with **2–3 different job ads** to see how the CV changes for each.
> - Look at the **keyword gap analysis**, the **cover letter** and the **interview prep**, not
>   only the CV.
> - **Check the results before you send them.** It's a beta, and you know your experience best.
>
> **What I'm asking in return:**
>
> - **Around [SURVEY DATE]** I'll send a short survey (about 5 minutes).
> - If you said yes to a call, you can book a 15-minute slot here whenever you're ready:
>   [CALENDAR LINK]
> - **Anytime:** just reply to this email. Something broken, confusing or annoying? Something you
>   loved? I read every reply, and short messages like "this button made no sense" help a lot.
>
> Please be honest, even brutally. "This part is useless" helps me much more than "looks nice". 🙂
>
> Good luck with your applications! I really hope OptiCV helps you land the interviews you want.
>
> Monika
> Founder, OptiCV
> opticv.net

---

## Waitlist email (applicants not selected)

**Subject:** Your OptiCV beta application

> Hi [First name],
>
> Thank you so much for applying to the OptiCV beta. I got more applications than I have spots for,
> so I couldn't include everyone in this first group.
>
> I've put you on the **waitlist**. If a spot opens up, you'll be the first to know. And when
> OptiCV launches publicly, I'll send you a discount code as a thank-you.
>
> In the meantime, you can still use OptiCV on the free plan at opticv.net.
>
> Good luck with your job search!
>
> Monika
> Founder, OptiCV

---

## Before sending

- [ ] Promo code tested end to end on production: sign in → Settings → Upgrade to Basic → code → 0.00
      total → no card asked → subscription active
- [ ] One unique promotion code created per tester (with first-time-customer restriction and expiry)
- [ ] `promo_code` column filled in the applicants sheet
- [ ] Calendar booking link set up (only for testers who said yes or maybe to a call)
- [ ] Sent from an address that accepts replies
- [ ] Tester tagged in PostHog (`beta_tester: true`) after they sign up
