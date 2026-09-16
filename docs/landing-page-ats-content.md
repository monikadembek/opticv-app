# OptiCV — ATS Page Content

This document contains finalized copy for the OptiCV public **ATS page** — an educational page that explains what an Applicant Tracking System is, why it rejects so many CVs, and how OptiCV helps you get past it. It is a companion to `landing-page-content.md` and `landing-page-features-age-content.md`: where those sell the product, this page builds understanding and trust. Each section includes purpose, copy, and visual notes so the content can be lifted straight into Angular templates.

**Tone:** Friendly & encouraging, second-person ("you", "your"), benefit-first — but here, also reassuring and educational. Demystify the ATS without fear-mongering.
**Brand palette (reference):** Emerald `#059669` primary, lime `#d7e506` accent, light yellow `#fdffde` background highlights.
**Fonts:** Montserrat (headings), Lato (body).

---

## 1. Page hero / intro

**Purpose:** Name the invisible gatekeeper in 3 seconds and promise to demystify it.

**Copy:**
- Headline: **The robot reading your CV before any human does.**
- Subhead: Most companies use an ATS to filter applications automatically. Here's what it is, how it decides, and how to make sure your CV gets through.
- Body (1 line, under subhead): Once you understand the ATS, beating it is simple — and OptiCV does the hard part for you.
- Primary CTA: **Optimize my CV**
- Secondary CTA: **Sign in**
- Microcopy under CTA: Free to start · No credit card needed

**Visual notes:** White background, consistent with the home hero. Emerald accent on "robot". Optional simple illustration of a document passing through a scanner/funnel.

---

## 2. What is an ATS?

**Purpose:** Give a clear, jargon-free definition before anything else.

**Section heading:** **ATS, explained in plain English.**

**Copy:**
An **Applicant Tracking System (ATS)** is software employers use to collect, sort, and filter the CVs they receive. When you apply for a job online, your CV usually goes into an ATS first — not onto a recruiter's desk.

The ATS scans your CV, pulls out your details, and ranks or filters candidates based on how well they match the job. Only the CVs that clear that first pass are seen by a human.

In short: **the ATS decides whether a person ever reads your CV at all.**

**Visual notes:** Single centered column of body text, generous line height. Pull the bold final line out as a highlighted callout in a light-yellow band.

---

## 3. Why it matters (stats band)

**Purpose:** Show the stakes with credible numbers — reuse the home page stats so the message stays consistent.

**Copy (3 tiles):**

| # | Stat | Caption |
|---|------|---------|
| 1 | **~75%** | of CVs are rejected by ATS software before a human ever reads them. *[verify source]* |
| 2 | **7 seconds** | is the average time a recruiter spends scanning a CV that does get through. *[verify source]* |
| 3 | **2×** | more interview invites when a CV is tailored to the specific job. *[verify source]* |

**Visual notes:** Light yellow band background, 3-column grid on desktop, stacked on mobile. Big number in emerald, caption below in body font. Reuse the exact stat values and styling from `landing-page-content.md` §2 — keep them in sync. Replace `[verify source]` with citations before publishing.

---

## 4. How an ATS reads your CV

**Purpose:** Show the mechanics so the visitor understands *what* to optimize, not just *that* they should.

**Section heading:** **What the ATS actually looks at.**
**Subhead:** It's not magic — it's pattern-matching. Once you know the patterns, you can work with them.

**Copy (4 points):**

**1. It parses your structure.**
The ATS breaks your CV into fields — name, contact, experience, education, skills. Unusual layouts, tables, columns, headers/footers, and images can confuse it, so details get lost or mis-filed.

**2. It matches keywords.**
It compares the words in your CV against the words in the job description — job titles, skills, tools, qualifications. Miss the language the role uses, and you score low even if you're qualified.

**3. It scores and ranks you.**
Based on that match, the ATS assigns a relevance score and sorts candidates. Recruiters often only review the top of the pile.

**4. It flags the gaps.**
Missing sections, unparseable dates, or required keywords you didn't include can drop you out of contention before a human sees a word.

**Visual notes:** Four numbered points, each with a small icon (parse, keywords, score, flag). Two-column grid on desktop, single column on mobile.

---

## 5. Common reasons CVs get rejected

**Purpose:** Make the abstract concrete — the visitor recognizes their own mistakes here.

**Section heading:** **Why good candidates get filtered out.**

**Copy (bullet list):**
- **Fancy formatting** — tables, columns, text boxes, and graphics the ATS can't read cleanly.
- **Missing keywords** — the skills and terms from the job description simply aren't on the page.
- **Wrong section labels** — creative headings ("What I bring") instead of standard ones ("Work Experience") the ATS expects.
- **Unparseable files** — scanned PDFs, images of text, or unusual file types.
- **Generic, untailored CVs** — one CV blasted to every job, matching none of them well.
- **Inconsistent dates and details** — formatting the ATS can't interpret, leaving gaps in your profile.

**Visual notes:** Clean bulleted list with emerald bullet markers or small "x" icons. Keep it scannable — bold the lead phrase of each item.

---

## 6. How OptiCV gets you through

**Purpose:** Pivot from problem to solution — connect the education directly to the product.

**Section heading:** **OptiCV checks all of this for you — automatically.**
**Subhead:** You don't need to become an ATS expert. Upload your CV, paste the job, and we handle the rest.

**Copy (mapped to features):**

- **Resume Autopsy** spots the formatting, structure, and labeling issues that confuse an ATS — ranked by severity, each with a fix.
- **Keyword Gap Analysis** scores your CV against the exact job description and highlights the missing keywords before you apply.
- **Stronger Bullet Points** and **Summary Rewrites** put the right language on the page in a way that reads well to humans *and* machines.
- **Clean, ATS-friendly export** gives you a CV in PDF or DOCX that parses correctly — no risky layouts.

Every check runs against the **specific job** you're applying for, not a generic template — because that's exactly how the ATS reads you.

**Visual notes:** Feature names in Montserrat semi-bold emerald, descriptions in body font. Consider linking each feature name to the Features page. Keep titles identical to `landing-page-features-age-content.md` so the product feels coherent.

---

## 7. ATS FAQ

**Purpose:** Answer the lingering questions an ATS-curious visitor still has.

**Section heading:** **ATS questions, answered.**

**Q: Do all companies use an ATS?**
Most medium and large employers do, and many smaller ones too — especially anyone hiring through an online application form. If you're applying on a company careers page or a job board, assume there's an ATS in the loop.

**Q: Will a perfectly ATS-optimized CV guarantee an interview?**
No — passing the ATS just means a human finally sees your CV. From there it still has to impress a person, which is why OptiCV optimizes for both: machine-readable *and* genuinely compelling.

**Q: Is "beating the ATS" the same as keyword stuffing?**
No. Stuffing keywords reads badly to humans and modern systems can penalize it. OptiCV weaves the right terms in naturally, where they actually fit your experience.

**Q: What file format is safest for an ATS?**
A clean, text-based PDF or DOCX — not a scanned image or an unusual format. OptiCV exports both in ATS-friendly layouts.

**Q: Does the same CV work for every job?**
Rarely. Each ATS scores you against that job's description, so tailoring per application is what moves the needle. OptiCV makes per-job tailoring take about two minutes.

**Visual notes:** Accordion-style list, one question expanded by default. Match the FAQ styling from `landing-page-content.md` §6 for consistency.

---

## 8. Final CTA band

**Purpose:** Convert the now-informed visitor.

**Copy:**
- Headline: **Don't let a robot decide your career.**
- Subhead: Give your CV the best shot at getting past the filter and in front of a person — free to try, no credit card.
- Primary CTA: **Optimize my CV**

**Visual notes:** Full-width emerald band, white text, single centered CTA button in lime — identical to the home page final CTA (section 7 of `landing-page-content.md`) for visual consistency.

---

## Notes for the implementer

- **Educational, not fear-based.** The page should leave visitors feeling informed and capable, not anxious. Keep the tone reassuring — the ATS is a hurdle, not a villain.
- **Stats must stay in sync.** The three stats in §3 are reused from `landing-page-content.md` §2 — keep the values and `[verify source]` flags identical across both, and cite sources (Jobscan, Ladders, etc.) before going live.
- **CTAs are consistent on purpose.** The primary CTA "Optimize my CV" and secondary "Sign in" must match the home page exactly — don't paraphrase.
- **Feature names should match.** §6 references features by name — keep them identical to `landing-page-content.md` §4 and `landing-page-features-age-content.md` so navigation feels coherent. Consider linking them to the Features page.
- **Future i18n.** Copy is English only; the section structure above can be reused as a translation key map if Polish is added later.
