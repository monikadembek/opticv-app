# Beta Week-2 Survey & Feedback Call Script

Feedback tools for OptiCV beta testers. See `beta-testing-and-launch-plan.md` (section 4) and
`beta-acceptance-email.md`.

Principle for both: **ask about what people actually did, not their opinions.** "Do you like it?"
gets polite answers. "What did you do with the CV afterwards?" gets the truth.

---

## Part 1: Week-2 survey

Send it about 2 weeks after the acceptance email (Tally / Google Forms). It should take about
5 minutes. Most questions are multiple choice, and the open questions are optional except Q8.

### Email that sends the survey

**Subject:** 5 minutes to shape OptiCV? 🙏

> Hi [First name],
>
> You've had OptiCV for about 2 weeks. I'd love to hear how it's going!
>
> Here's a short survey (about 5 minutes): [SURVEY LINK]
>
> Honest answers help most, including "I haven't used it". That's useful to know too.
>
> Thank you!
> Monika

### Survey questions

**Intro text:**

> Thanks for testing OptiCV! There are no wrong answers. Negative feedback is the most useful kind.

**1. Email** (email, required)
_Helper text:_ So I can match your answers with your beta account.

**2. How many times have you used OptiCV so far?** (single choice, required)

- Not yet → _skip to Q11_
- Once
- 2–3 times
- 4–10 times
- More than 10 times

**3. What did you do with the optimized CV?** (multiple choice, required)

- Sent it as-is to a job application
- Edited it a bit, then sent it
- Edited it a lot, then sent it
- Downloaded it but haven't sent it yet
- Didn't use it
- Other: \_\_\_

**4. How many applications have you sent with an OptiCV CV?** (single choice, required)

- 0
- 1–2
- 3–5
- 6–10
- More than 10

**5. Have you had any responses to those applications yet?** (single choice, required)

- Too early to say
- No responses yet
- Rejections only
- Got at least one interview / recruiter call
- Got an offer 🎉

**6. Which features did you use?** (multiple choice, required)

- Optimized CV
- Keyword gap analysis / match score
- Resume autopsy (ATS issues)
- Cover letter
- Interview prep
- LinkedIn updates
- CV templates / PDF export

**7. Which feature was the most useful?** (single choice, same options as Q6 + "None", required)

**8. What did you have to change by hand in the optimized CV?** (long text, required)
_Placeholder:_ e.g. wrong dates, invented skills, too long, wrong tone, formatting

**9. When were you confused, stuck, or about to give up?** (long text, optional)

**10. How disappointed would you be if you could no longer use OptiCV?** (single choice, required)

- Very disappointed
- Somewhat disappointed
- Not disappointed

_This is the Sean Ellis "product–market fit" question. If 40% or more answer "Very disappointed",
it's a strong signal._

**11. (Only if Q2 = "Not yet") What stopped you from trying it?** (multiple choice + other)

- Haven't had time
- Not applying to any jobs right now
- Couldn't activate the promo code
- Had trouble signing in or uploading my CV
- Wasn't sure how to start
- Other: \_\_\_

**12. What did you use before OptiCV to tailor your CV, and how does OptiCV compare?** (long text, optional)

**13. After the beta, would you pay for OptiCV?** (single choice, required)

- Yes, at the current Basic price
- Yes, but only at a lower price
- Only while I'm actively job hunting
- No
- Not sure

**14. If you could change one thing about OptiCV, what would it be?** (long text, optional)

**15. Can I contact you for a 15-minute call?** (single choice, required)

- Yes (booking link on the next screen)
- Already booked
- No, thanks

**Thank-you screen:**

> Thank you! 🙏 Every answer gets read. If you said yes to a call, book a slot here: [CALENDAR LINK]

### How to read the results

- **Engagement:** what share of testers used it 2+ times (Q2)? Fewer than half → onboarding or
  activation problem. Check Q11 and the PostHog funnel.
- **Trust in the output:** Q3 + Q8. "Edited it a lot" or invented content → prompt-quality problem.
  This is the most important area to fix.
- **Value:** Q10 (≥ 40% "Very disappointed" = strong) and Q13 (willingness to pay).
- **Focus:** Q6/Q7 show which features to invest in and which to simplify or hide.
- **Outcome:** Q5. Save positive answers for testimonials later (with permission).
- Compare survey answers with PostHog data (e.g. people who say "4–10 times" against their
  actual sessions).

---

## Part 2: 15-minute feedback call script

**Goal:** understand how testers actually use OptiCV in their job search, where it fails them, and
whether it's worth paying for. **Listen ~80%, talk ~20%.**

### Before the call

- [ ] Read the tester's application form answers and survey answers
- [ ] Check their PostHog activity (number of optimizations, features used, where they dropped off)
- [ ] Ask for permission to record. If they say no, take notes
- [ ] Have the notes template (below) open

### Rules for you

- **Don't explain, defend or pitch.** If they misunderstood something, that's a finding, not a
  mistake to correct.
- Ask about **past behaviour** ("Last time you…"), not the future ("Would you…").
- Use **silence**. After an answer, wait 3 seconds. People often add the most valuable part then.
- Follow up with "Why?", "Tell me more", "Can you show me?"
- Don't ask "Do you like it?" or "Would you use feature X?"

### Script

**1. Intro (1 min)**

> Thanks so much for taking the time! The goal today is to learn how OptiCV fits into your job
> search, and especially what doesn't work. You can't hurt my feelings. Honest criticism is exactly
> what I need. Is it OK if I record this, just for my notes?

**2. Their job search (3 min)**

- How's the job search going right now?
- Walk me through what you do when you find a job you want to apply for. What happens next?
- How did you prepare your CV for applications before you used OptiCV?
- What's the most frustrating part of the process?

**3. Using OptiCV (6 min)**

- Tell me about the last time you used OptiCV. What job was it for? What did you do, step by step?
- What did you do with the result afterwards?
- What did you change by hand? Why?
- Was there a moment you were confused or stuck? What happened?
- _(If possible)_ Could you share your screen and show me how you'd optimize a CV for a new job?
  _Watch silently and note where they hesitate._
- Was there anything you expected OptiCV to do that it didn't?

**4. Value & outcome (3 min)**

- Did anything change in your applications after using it, like responses or interviews?
- If OptiCV disappeared tomorrow, what would you do instead?
- After the beta, would you pay for it? What would make it worth paying for?
- _(If they say yes)_ What price would feel fair? At what price would it feel too expensive?

**5. Wrap-up (2 min)**

- If you could change one thing, what would it be?
- Is there someone else who's job hunting who might want to try it?
- **Testimonial (only if things went well):** Would you be OK with me quoting something you said on
  the website, with your first name or anonymously? (Get the agreement in writing afterwards by email.)

> Thank you so much! This really helps. Good luck with your search, and I'll check in in a few weeks
> to see how it's going.

### Notes template (per call)

```
Tester:            [first name]   Date: [date]
Role / industry:   ...            Seniority: ...
Uses per week:     ...            Applications sent with OptiCV: ...

Job-search workflow:
-

What they did with OptiCV (step by step):
-

Changed by hand / didn't trust:
-

Confusion / friction points:
-

Value & outcome (interviews? alternatives?):
-

Would pay? Price mentioned:
-

Best quote (for testimonial / insight):
"..."

Top 3 takeaways:
1.
2.
3.

Follow-ups (bugs to fix, testimonial permission, referral):
-
```

### After the calls

- After every call, add the top 3 takeaways to one shared sheet.
- After 5–6 calls, group the takeaways by theme (output quality, onboarding, pricing, missing
  features). Repeated themes are the priorities.
- Turn the priorities into tasks in `tasks-list.md`.
- Send a short thank-you email after each call, and the testimonial confirmation if one was agreed.
