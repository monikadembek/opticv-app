# Homepage Redesign Plan — Task 45

## Context

The current homepage is a simple hero section with "CV Online" as the heading, a subheading about ATS requirements, a short paragraph, and two buttons. It doesn't reflect the polished visual identity of the opticv.net landing page, and it lacks content that communicates the product's value proposition clearly. The goal is to:

- Replace the placeholder copy with compelling, conversion-oriented content inspired by opticv.net
- Add a features summary section (6 key capabilities)
- Add a 3-step "How it works" section
- Match the visual style of the landing page (clean, professional, green primary color, card-based layout)

---

## Proposed Content

### Hero Section

- **Headline:** "Land more interviews, one tailored CV at a time."
- **Subheadline:** "75% of CVs never reach a recruiter — they're rejected by ATS software first. OptiCV uses AI to optimize your CV, write your cover letter, and prepare you for the interview — all tailored to the specific job you're applying for."
- **Buttons:** "Optimize my CV" (primary) + "Sign In" (secondary/outlined)

### Features Strip (6 cards)

1. **ATS Score Analysis** — Find out exactly why your CV gets rejected before a human even reads it.
2. **Keyword Matching** — Automatically surface missing keywords from the job description and add them to your CV.
3. **Summary Rewrite** — Get an AI-rewritten professional summary optimised for the role you're targeting.
4. **Bullet Upgrades** — Strengthen your experience bullets with impact-driven language tailored to the job.
5. **Cover Letter** — Get a tailored, job-specific cover letter generated alongside your optimized CV.
6. **Interview Prep** — Receive likely interview questions and model answers based on the role and your background.

### How It Works (3-step process)

1. **Upload your CV** — Import your existing CV in PDF or DOCX format.
2. **Paste the job description** — Tell OptiCV which role you're targeting.
3. **Get your optimized CV** — Review AI suggestions, apply changes, and export your tailored CV.

---

## Implementation Plan

### Files to modify

- `apps/opticv-web/src/app/features/home/home.html` — replace all template content
- `apps/opticv-web/src/app/features/home/home.css` — add styles for new sections
- `apps/opticv-web/src/app/features/home/home.ts` — no logic changes needed (routing methods stay)

### HTML Structure

```
<div>
  <!-- HERO SECTION (keep existing layout skeleton) -->
  <section class="hero ...">
    <!-- updated heading/copy/buttons -->
  </section>

  <!-- FEATURES SECTION (new) -->
  <section class="features-section responsive-horizontal-padding main-container ...">
    <h2>Why OptiCV?</h2>
    <div class="features-grid"> <!-- 4 card items --> </div>
  </section>

  <!-- HOW IT WORKS SECTION (new) -->
  <section class="how-it-works responsive-horizontal-padding main-container ...">
    <h2>How it works</h2>
    <div class="steps-grid"> <!-- 3 numbered step cards --> </div>
  </section>
</div>
```

### CSS Additions (home.css)

- `.features-section` — background `var(--light-yellow)`, vertical padding
- `.features-grid` — CSS Grid, 1 col mobile → 2 cols on `sm` → 3 cols on `lg`
- `.feature-card` — white background, border-radius, padding, subtle box-shadow
- `.feature-icon` — green circle icon container (using PrimeIcons)
- `.how-it-works` — white background, vertical padding
- `.steps-grid` — CSS Grid, 1 col → 3 cols on `md`
- `.step-card` — border with green left accent or numbered badge, padding
- `.step-number` — large green number, Montserrat font

### TypeScript (`home.ts`)

No changes needed. Navigation methods `goToCreator()` and `signIn()` remain as-is.

---

## Visual Style Rules (matching landing page)

- Primary green `#059669` for accents, badges, icons
- Lime `#d7e506` for decorative highlights
- Light yellow `#fdffde` as section background fill
- Montserrat for headings, Lato for body
- Subtle card shadows, rounded corners (`border-radius: 12px`)
- No heavy gradients — clean white or off-white section backgrounds
- Keep existing hero image and decorative circles

---

## Verification

1. Run `npm exec nx serve opticv-web` and open http://localhost:4200
2. Check hero section — new headline and subheadline render correctly
3. Check features section — 6 cards visible, grid collapses to 1 column on mobile
4. Check how-it-works section — 3 numbered steps visible, consistent spacing
5. Resize to mobile (< 768px) — all sections stack vertically with no overflow
6. Click "Optimize my CV" → navigates to `/optimize-cv`
7. Click "Sign In" → navigates to `/login`
