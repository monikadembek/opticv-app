# OptiCV — Features Page Content

This document contains finalized copy for the OptiCV public **Features page**, in the order sections should appear. It is the deep-dive companion to the 6-card Features grid in `landing-page-content.md` (section 4): where the home page teases, this page explains. Each section includes purpose, copy, and visual notes so the content can be lifted straight into Angular templates.

**Tone:** Friendly & encouraging, second-person ("you", "your"), benefit-first.
**Brand palette (reference):** Emerald `#059669` primary, lime `#d7e506` accent, light yellow `#fdffde` background highlights.
**Fonts:** Montserrat (headings), Lato (body).

---

## 1. Page hero / intro

**Purpose:** Frame the page in 3 seconds — this is the full toolkit behind every tailored application, not a list of disconnected gadgets.

**Copy:**
- Headline: **Everything your CV needs to beat the bots — and win the human.**
- Subhead: OptiCV turns one upload and one job ad into a complete, ATS-ready application package. Here's exactly what you get.
- Body (1 line, under subhead): Upload your CV, paste the job description, and let AI handle the rest — in under 2 minutes.
- Primary CTA: **Optimize my CV**
- Secondary CTA: **Sign in**
- Microcopy under CTA: Free to start · No credit card needed

**Visual notes:** White background, consistent with the home hero. Emerald accent on the verb "beat". Keep the headline on a single clean line where possible; allow it to wrap on mobile.

---

## 2. How it all fits together

**Purpose:** Reassure the visitor that the seven features below aren't separate tools to learn — they're stages of one connected workflow.

**Section heading:** **Seven tools. One workflow. Zero busywork.**
**Subhead:** Every feature works from the same two inputs — your CV and the job you're chasing — so nothing has to be set up twice.

**Copy (3 stages):**

**Upload**
Drop in your CV once. We parse it, keep your structure intact, and reuse it across every feature on this page.

**Tailor**
Paste the job description and OptiCV goes to work — scoring, rewriting, and flagging gaps against that specific role, not a generic template.

**Export**
Edit anything inline, then download a polished, ATS-friendly package: CV, cover letter, and interview prep, ready to send.

**Visual notes:** Three connected steps in a horizontal flow (desktop) / vertical stack (mobile), linked by a thin arrow or line. Light yellow band background to separate it from the hero and the deep-dives below. Simple icons: upload, sparkle/tailor, download.

---

## 3. Feature deep-dives

**Purpose:** Give each MVP capability room to explain what it does, why it matters, and what the user walks away with.

**Section heading (optional band intro):** **A closer look at what OptiCV does for you.**

> **Implementer note:** Render these as alternating image/text rows (zig-zag) on desktop, stacked on mobile. Each feature: icon, title in Montserrat semi-bold emerald, one-line promise, then the three short blocks below. Apply a light-yellow highlight band to every other row for rhythm. Keep titles **identical** to the home Features grid so the two pages feel like one product.

---

### 3.1 Resume Autopsy

**Promise:** See exactly why an ATS might reject your CV — and how to fix every issue.

**What it does:** OptiCV runs your CV through an ATS-style review and surfaces every problem that could get you screened out — from missing sections and unparseable formatting to vague wording. Each issue is ranked by severity, so you know what to fix first.

**Why it matters:** Most CVs are filtered out by software before a human ever reads them. The Autopsy shows you the rejection reasons you can't see on your own.

**What you get:**
- A ranked list of issues, most critical first
- A plain-English explanation of each problem
- A specific, actionable fix for every item

---

### 3.2 Keyword Gap Analysis

**Promise:** Know your match score before you hit apply.

**What it does:** OptiCV compares your CV against the job description and gives you a visual match score, then highlights the important keywords and skills the posting expects but your CV is missing.

**Why it matters:** Recruiters and ATS both look for the language of the role. Closing the keyword gap is often the difference between landing in the "yes" pile and never being seen.

**What you get:**
- A clear match score against the specific job
- Missing keywords and skills highlighted
- Guidance on where to weave them in naturally

---

### 3.3 Summary Rewrites

**Promise:** A professional summary that actually sells you — your pick of three.

**What it does:** OptiCV generates three professional summaries, each built around a different angle of your experience, so you can lead with the story that fits the role best. Every version is editable inline.

**Why it matters:** Your summary is the first thing a recruiter reads in those few seconds of attention. A sharp, role-aligned opener earns you the rest of the page.

**What you get:**
- Three distinct AI-written summaries
- Each crafted around a different strength or angle
- Inline editing to make any version your own

---

### 3.4 Stronger Bullet Points

**Promise:** Turn flat duties into achievements that get noticed.

**What it does:** OptiCV rewrites your responsibility-style bullets into achievement-led statements using the STAR method, adding metrics where they make an impact — shown side-by-side with your original so you stay in control.

**Why it matters:** "Responsible for X" tells a recruiter nothing. Outcome-driven bullets prove you delivered results — and that's what gets the interview.

**What you get:**
- STAR-method, achievement-led rewrites
- Before/after shown side-by-side
- Metrics surfaced where they strengthen the point

---

### 3.5 Tailored Cover Letters

**Promise:** A cover letter written for this role — in the voice that fits you.

**What it does:** OptiCV drafts cover letters built around the exact job, in multiple variants so you can choose the tone that feels right. Edit inline and export alongside your CV.

**Why it matters:** A generic cover letter reads like a form. A tailored one shows you understood the role — without you staring at a blank page for an hour.

**What you get:**
- Role-specific cover letter drafts
- Multiple variants and voices to choose from
- Inline editing and one-click export

---

### 3.6 Interview Prep

**Promise:** Walk in ready for the questions you'll actually be asked.

**What it does:** OptiCV generates 10+ likely interview questions tailored to the role and your CV, each paired with pointers on how to frame a strong answer.

**Why it matters:** The hard part isn't getting the interview — it's not freezing in it. Practising the right questions ahead of time turns nerves into confidence.

**What you get:**
- 10+ role-specific interview questions
- A pointer on how to approach each answer
- Prep grounded in your CV and the job, not generic lists

---

### 3.7 LinkedIn Headline & About Rewrite

**Promise:** Make recruiters find you — and want to click.

**What it does:** OptiCV rewrites your LinkedIn headline and About section to match the roles you're targeting, optimized for the keywords recruiters search and the story they want to read.

**Why it matters:** Recruiters source candidates on LinkedIn every day. A sharp, keyword-aligned profile means more of them reach out to you — before you've even applied.

**What you get:**
- A recruiter-optimized headline
- A rewritten, keyword-aware About section
- Wording aligned to your target roles

> **Implementer note (LinkedIn consistency):** `landing-page-content.md` lists "LinkedIn profile rewrite" as *coming soon* under the Pro plan. Decide whether the Features page presents this feature as live or "coming soon" and keep both docs in sync. If it's not yet live, add a small "Coming soon" badge to this card and soften the copy to future tense.

---

## 4. Final CTA band

**Purpose:** Last-chance conversion for visitors who read all the way down.

**Copy:**
- Headline: **Your next interview is one upload away.**
- Subhead: Put all seven tools to work on your CV — free to try, no credit card.
- Primary CTA: **Optimize my CV**

**Visual notes:** Full-width emerald band, white text, single centered CTA button in lime — identical to the home page final CTA (section 7 of `landing-page-content.md`) for visual consistency. Optional small decorative circle-wavy element on the side.

---

## Notes for the implementer

- **This page expands the home grid.** It is the deep-dive companion to the 6-card Features grid in `landing-page-content.md` §4. Keep feature **titles identical** across both pages so navigation feels coherent.
- **Seventh feature.** This page adds **LinkedIn Headline & About Rewrite** (the 7th MVP prompt from `app-overview.md` §3) beyond the six shown on the home grid. See the LinkedIn consistency note in §3.7.
- **CTAs are consistent on purpose.** The primary CTA "Optimize my CV" and secondary "Sign in" must match the home page exactly — don't paraphrase.
- **Grounded in real capabilities.** All seven features map to the MVP prompts/workflows in `app-overview.md` §3 (Resume Autopsy, Keyword Gap, Summary Rewrite, Bullet Upgrade, Cover Letter, Interview Prep, LinkedIn rewrite), plus editable output and PDF/DOCX export.
- **Future i18n.** Copy is English only; the section structure above can be reused as a translation key map if Polish is added later.
