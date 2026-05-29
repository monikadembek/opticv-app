# OptiCV — Landing Page Content

This document contains finalized copy for the OptiCV public landing page, in the order sections should appear. Each section includes purpose, copy, and visual notes so the content can be lifted straight into Angular templates.

**Tone:** Friendly & encouraging, second-person ("you", "your"), benefit-first.
**Brand palette (reference):** Emerald `#059669` primary, lime `#d7e506` accent, light yellow `#fdffde` background highlights.
**Fonts:** Montserrat (headings), Lato (body).

---

## 1. Hero

**Purpose:** Hook the visitor in 3 seconds — promise a tailored, ATS-ready CV without effort.

**Copy:**
- Headline: **Land more interviews — one tailored CV at a time.**
- Subhead: AI rewrites your CV for the exact job you're chasing, so it passes ATS filters and lands on a real recruiter's desk.
- Body (1 line, under subhead): Upload your CV, paste the job ad, and get an optimized version in under 2 minutes.
- Primary CTA: **Optimize my CV**
- Secondary CTA: **Sign in**
- Microcopy under CTA: Free to start · No credit card needed

**Visual notes:** Keep existing hero image slot (`/images/hero-image.png`) and decorative wavy circle. Headline on white background, primary color emerald for the verb "Land".

---

## 2. Stats band (social proof)

**Purpose:** Show why CV optimization matters using credible industry numbers — no testimonials yet.

**Copy (3 tiles):**

| # | Stat | Caption |
|---|------|---------|
| 1 | **~75%** | of CVs are rejected by ATS software before a human ever reads them. *[verify source]* |
| 2 | **7 seconds** | is the average time a recruiter spends scanning a CV. *[verify source]* |
| 3 | **2×** | more interview invites when a CV is tailored to the specific job. *[verify source]* |

**Visual notes:** Light yellow band background, 3-column grid on desktop, stacked on mobile. Each tile: big number in emerald, caption below in body font. Replace `[verify source]` with citations before publishing.

---

## 3. How it works

**Purpose:** Reassure visitors that the workflow is fast and simple — no resume writing skills required.

**Section heading:** **Three steps. Two minutes. One stronger CV.**
**Subhead:** No templates to wrestle with. No guessing what recruiters want.

**Steps:**

**Step 1 — Upload your CV**
Drop in your current CV as a PDF or DOCX. We'll read it, parse it, and keep your structure intact — nothing to retype.

**Step 2 — Paste the job description**
Found a role you want? Paste the listing. The more detail, the better we can tailor your CV to match.

**Step 3 — Get your optimized package**
In under two minutes you'll have an ATS-friendly CV, a tailored cover letter, and a personalized interview prep guide — ready to download.

**Visual notes:** Numbered cards in a horizontal row (desktop) / vertical stack (mobile). Each step gets a simple icon — upload, document, sparkle/check.

---

## 4. Features grid

**Purpose:** Show the real depth behind the simple flow.

**Section heading:** **Everything you need to apply with confidence.**
**Subhead:** Built around how recruiters and ATS actually read CVs.

**Cards (6):**

1. **Resume Autopsy**
   See exactly why an ATS might reject your CV — and how to fix every issue, ranked by severity.

2. **Keyword Gap Analysis**
   Get a match score against the job description, with the missing keywords highlighted before you apply.

3. **Summary Rewrites**
   Pick from three AI-generated professional summaries, each crafted around a different angle of your experience.

4. **Stronger Bullet Points**
   Turn flat duty descriptions into achievement-led bullets using the STAR method, with metrics where they matter.

5. **Tailored Cover Letters**
   Generate cover letter drafts written for the exact role — multiple variants so you can pick the voice that fits.

6. **Interview Prep**
   Walk in ready. Get 10+ likely interview questions for the role, plus pointers on how to answer each one.

**Visual notes:** 3×2 grid on desktop. Each card has an icon top-left, title (Montserrat semi-bold, emerald), 1-line description.

---

## 5. Pricing

**Purpose:** Make it clear the app is free to try, with a low-commitment paid upgrade for active job seekers.

**Section heading:** **Start free. Upgrade when you're job hunting hard.**
**Subhead:** Cancel anytime. No catches.

**Plan: Free**
- **$0 / month**
- 1 CV optimization per month
- All core AI features (autopsy, keyword gap, summary rewrites, bullets)
- Cover letter generator
- Interview prep
- PDF + DOCX export

CTA: **Get started — free**

**Plan: Pro** *(recommended badge)*
- **$9 / month** *[placeholder — confirm pricing]*
- **Unlimited** CV optimizations
- All premium CV templates
- Priority AI processing
- LinkedIn profile rewrite *(coming soon)*
- Everything in Free

CTA: **Go Pro**

**Visual notes:** Two side-by-side cards, Pro card slightly elevated with lime accent border and "Most popular" badge. Mobile: stacked.

---

## 6. FAQ

**Purpose:** Defuse common objections before they become reasons to bounce.

**Section heading:** **Questions, answered.**

**Q: Is my CV data private?**
Yes. Your CV stays tied to your account — we don't share it, sell it, or train public AI models on it. You can delete your CVs and account whenever you want.

**Q: What file formats can I upload?**
PDF and DOCX. Both are parsed automatically, no reformatting needed on your end.

**Q: How is OptiCV different from just using ChatGPT?**
ChatGPT gives you generic advice. OptiCV reads your actual CV, scores it against a specific job, flags ATS issues, and gives you ready-to-export documents — all in one place, no prompt engineering required.

**Q: Do I need to install anything?**
No. OptiCV runs entirely in your browser. Sign in with your email — we'll send you a 6-digit code, no password to remember.

**Q: Can I cancel my Pro subscription anytime?**
Yes. Cancel in one click, keep Pro until the end of your billing period, then drop back to Free with no charge.

**Q: What's an ATS — and why should I care?**
An Applicant Tracking System is the software employers use to filter CVs before a human sees them. If your CV isn't formatted and worded the way an ATS expects, you can be rejected before anyone reads a word. OptiCV checks for those issues automatically.

**Visual notes:** Accordion-style list, one question expanded by default. Keep typography simple — plenty of vertical breathing room.

---

## 7. Final CTA band

**Purpose:** Last-chance conversion for visitors who scrolled all the way down.

**Copy:**
- Headline: **Your next interview is one upload away.**
- Subhead: Give your CV the edge it deserves — free to try, no credit card.
- Primary CTA: **Optimize my CV**

**Visual notes:** Full-width emerald band, white text, single centered CTA button in lime. Optional small decorative circle-wavy element on the side.

---

## 8. Footer

**Purpose:** Standard footer links and legal essentials.

**Columns / links:**

- **Product:** Features · Pricing · How it works · Sign in
- **Company:** About · Contact · Blog *(when ready)*
- **Legal:** Privacy Policy · Terms of Service · Cookie Policy
- **Connect:** Email · LinkedIn · GitHub *(if public)*

**Bottom row:** `© 2026 OptiCV. Made for job seekers who deserve better odds.`

**Visual notes:** Dark or light-yellow background, small typography. Logo top-left, links in columns, bottom row centered or left-aligned.

---

## Notes for the implementer

- **Stats need verification.** All three numbers in section 2 are commonly cited but should be confirmed with sources (Jobscan, Ladders, etc.) before going live.
- **Pricing is a placeholder.** $9/month is a sensible default — confirm with the actual billing setup before launch.
- **CTAs are consistent on purpose.** The primary CTA "Optimize my CV" repeats in hero + final band. Keep it identical across both — don't paraphrase.
- **No fake testimonials.** When real ones are available, insert a testimonials section between Features (4) and Pricing (5).
- **Future i18n.** Copy is English only for now; if Polish is added later, the section structure above can be reused as a translation key map.
