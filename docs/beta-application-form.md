# Beta Application Form

https://docs.google.com/forms/d/e/1FAIpQLScVWJQW4kJL-hiVDoqw4EyJZWmO91-BpA5Mgd74KP-H1gUZ-w/viewform?usp=publish-editor

https://forms.gle/exd6PyFatr8BpUDx5

Questions for the OptiCV beta tester application (see `beta-testing-and-launch-plan.md`).
Built to work in Tally, Google Forms or a landing-page form. The form should take about 2–3 minutes to fill in.

Don't ask for the CV itself in the form. Testers upload it in the app, where it's covered by the
privacy policy and account deletion.

---

## Form intro (shown at the top)

> **Join the OptiCV beta**
>
> I'm looking for 30 people who are actively job hunting to test OptiCV, an AI tool that tailors
> your CV to each job offer.
>
> **You get:** 2 months of the Basic plan for free.
> **I ask for:** using the app while you apply, a short survey after 2 weeks and, if you can,
> a 15-minute call.
>
> Spots are limited. I'll reply to everyone within a few days.

---

## Section 1: About you

**1. First name** (short text, required)

**2. Email** (email, required)
_Helper text:_ Use the email you'll sign in to OptiCV with. Your promo code will be sent here.

**3. Country** (dropdown, required)

**4. LinkedIn profile URL** (URL, optional)
_Helper text:_ Optional. It helps me understand your background.

## Section 2: Your job search

**5. What's your current situation?** (single choice, required)

- Employed, looking for a new job
- Unemployed, looking for a job
- Student / recent graduate looking for my first job
- Changing careers into a new field
- Other: \_\_\_

**6. What role are you applying for?** (short text, required)
_Placeholder:_ e.g. Frontend Developer, Marketing Manager, Accountant

**7. Industry** (single choice, required)

- IT / Software
- Marketing / Sales
- Finance / Accounting
- Engineering / Manufacturing
- Healthcare
- Education
- Customer service / Administration
- Other: \_\_\_

**8. Seniority level** (single choice, required)

- Intern / Entry level
- Junior
- Mid
- Senior
- Lead / Manager / Executive

**9. How long have you been looking?** (single choice, required)

- I'm just starting
- Less than 1 month
- 1–3 months
- 3–6 months
- More than 6 months

**10. How many applications do you send per week?** (single choice, required)

- 0–2
- 3–5
- 6–10
- More than 10

**11. How many responses do you get?** (single choice, required)

- Almost none
- A few, but rarely interviews
- Some interviews
- Regular interviews

**12. Do you currently tailor your CV for each job?** (multiple choice, required)

- No, I send the same CV everywhere
- Yes, I edit it manually
- Yes, with ChatGPT or another AI chat
- Yes, with a CV tool (which one?): \_\_\_

**13. What's the most frustrating part of applying for jobs right now?** (long text, optional)

## Section 3: Beta commitment

**14. Will you use OptiCV for real applications during the next 2–4 weeks?** (single choice, required)

- Yes
- Probably
- Not sure yet

**15. Would you fill in a short survey (about 5 minutes) after 2 weeks?** (yes/no, required)

**16. Would you join a 15-minute video call to share feedback?** (single choice, required)

- Yes
- Maybe
- No, I prefer written feedback

**17. Can I ask you in 1–2 months how your job search went?** (yes/no, required)
_Helper text:_ For example, whether you got interviews. This tells me if OptiCV actually helps.

**18. How did you hear about the beta?** (single choice, required)

- LinkedIn
- Reddit
- Facebook group
- Discord
- A friend / colleague
- University / bootcamp
- Career coach / recruiter
- Other: \_\_\_

## Section 4: Consent

**19.** ☐ I agree to the [Terms of Use] and [Privacy Policy]. (required)

**20.** ☐ I agree to be contacted by email about the OptiCV beta (promo code, survey, feedback call). (required)

_Footer text:_ Your answers are used only to select beta testers and are deleted after the beta
ends. You can withdraw at any time by replying to any beta email.

---

## Thank-you screen

> **Thanks for applying!**
>
> I'll review applications and reply within a few days. If you're selected, you'll get your
> promo code and a short guide to get started.

---

## Selection criteria (internal)

Score each applicant and pick the top 20–40, keeping a mix of industries and seniority levels.

| Signal               | Question                                                  | Points |
| -------------------- | --------------------------------------------------------- | ------ |
| Actively applying    | Q10: 3–5 → 1, 6–10 or 10+ → 2                             | 0–2    |
| Has the problem      | Q11: "Almost none" or "A few…" → 2, "Some interviews" → 1 | 0–2    |
| Currently searching  | Q9: 1–6 months → 2, < 1 month or 6+ → 1                   | 1–2    |
| Will use it          | Q14: Yes → 2, Probably → 1                                | 0–2    |
| Feedback call        | Q16: Yes → 2, Maybe → 1                                   | 0–2    |
| Outcome follow-up    | Q17: Yes → 1                                              | 0–1    |
| Useful answer to Q13 | Thoughtful and specific → 1                               | 0–1    |

**Diversity guideline:** no more than ~40% from a single industry (likely IT, if recruiting through
your own network), and at least a few people from each of: entry level, mid, senior, career changers.

Applicants who aren't selected go on a **waitlist**. Send them a friendly email and offer them a
spot if a tester drops out, or a discount at public launch.

## Notes for implementation

- Export responses to a sheet and add columns: `score`, `status` (selected / waitlist),
  `promo_code`, `survey_done`, `call_done`, `outcome`.
- Use Q18 answers to see which channel brings the best testers and focus the public launch there.
- After selection, tag testers in PostHog (`beta_tester: true`) once they sign up with the email
  from Q2.
