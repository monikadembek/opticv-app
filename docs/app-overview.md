**OptiCV App – high level overview of application which will help users to optimize their CV with AI**

---

## 1. Product Vision & Positioning

**Core promise**: "Upload your CV + paste a job description → get an ATS-optimized resume, tailored cover letter, and interview prep in under 2 minutes."

**Differentiation angles**:

- Per-job tailoring (not just "a better CV" — a CV optimized for this specific posting)
- ATS-first (transparent scoring against the job description)
- End-to-end (resume + cover letter + LinkedIn + interview prep, not just one piece) (for future)

**MVP - per-application tailoring with a visible ATS score and one-click regeneration.**

---

## 2. Tech Stack

Since you're comfortable with Angular and NestJS, here's a stack that plays to your strengths:

### Frontend (Angular)

- Angular 21 with standalone components and signals
- PrimeNG for UI components
- TailwindCSS for custom styling
- NgRx signal store and Angular signals for state management
- ngx-file-drop for CV uploads, ngx-extended-pdf-viewer for previews

### Backend (NestJS)

- NestJS 11 with Prisma 7
- PostgreSQL as the primary database on Supabase
- Redis for caching, rate limiting, and job queues (BullMQ integrates cleanly with Nest)
- BullMQ for async AI processing — important because AI calls take 5-30 seconds and you don't want HTTP timeouts

### AI Layer

- OpenAI models
- Consider a fallback to Anthropic or Gemini models for redundancy
- Build a thin abstraction layer so you can swap models per prompt type

### File Processing

- pdf-parse or pdfjs-dist for PDF text extraction
- mammoth for .docx parsing
- docx library for generating downloadable Word files
- puppeteer or playwright for PDF generation from HTML templates

### Auth & Payments

- Supabase Auth – paswordless OTP Auth (requires sending emails with custom SMTP as Supabase has a limit of sending only 2 emails per hour – use resend.com service, https://resend.com/docs/send-with-supabase-smtp)
- Stripe for subscriptions and one-time purchases
- Stripe Customer Portal for self-service billing

### Infrastructure

- Backend: Cloudways for early stage; AWS ECS/Fargate when scaling
- Frontend: Cloudways or Netlify
- File storage: Cloudflare R2 (R2 has no egress fees — meaningful for resume downloads)
- Monitoring: Sentry for errors, PostHog for product analytics

Why this stack: It minimizes new things you have to learn, keeps infrastructure costs low at the start (~$50-100/month), and scales reasonably. The async job queue is the one piece you must get right — AI latency will kill UX if calls block the request thread.

---

## 3. Core Features (MVP → V2)

### MVP (launch in 6-8 weeks)

The smallest thing that delivers real value:

1. CV upload (PDF, DOCX) with parsed preview
2. Job description input (paste text)
3. The 7 prompts as workflows, each producing structured output:

- Resume Autopsy (ATS rejection reasons)
- Keyword Gap Analysis (with visual match score)
- Summary Rewrite
- Bullet Point Upgrade (STAR method, side-by-side before/after)
- Cover Letter Generator
- Interview Prep (10 likely questions + tailored answers)
- LinkedIn Headline & About rewrite

4. Editable output — users can tweak AI suggestions inline
5. Export to PDF and DOCX with 2-3 clean templates
6. Account system with usage tracking
7. Stripe subscription with a free tier

### V2 (post-launch, based on user feedback)

- Job board integration (paste a LinkedIn/Indeed URL → auto-extract JD)
- Multiple CV versions stored per user, organized by application
- Application tracker (which CV did I send where, status, follow-up reminders)
- Browser extension that grabs JDs from LinkedIn/Indeed with one click
- Cover letter library (save and adapt past letters)
- A/B testing — generate two CV variants and let users pick
- Industry-specific templates (tech, finance, creative, academic)

### V3 (differentiation moats)

- Recruiter feedback marketplace (real humans review, paid add-on)
- Interview practice with voice (record answers, AI critiques)
- Salary negotiation prep based on the role and resume

---

## 4. Architecture Notes

A few things that will save you pain later:

**Prompt management:** Store prompts in a versioned database table, not hardcoded. You'll iterate on them constantly. Track which prompt version produced which output so you can A/B test improvements.

**Token & cost tracking:** Log input/output tokens per user per prompt. You need this for billing accuracy and for catching abuse early. A free user running the same prompt 50 times is your worst-case scenario.

**Streaming responses:** Use Claude's streaming API and pipe to the frontend via Server-Sent Events. Watching text appear feels 10x faster than waiting 20 seconds for a blob.

**Output schemas:** Use structured output (JSON schemas) for things like keyword gap analysis and ATS scoring. Free-text outputs are harder to render cleanly in your UI.

**Rate limiting:** Per-user and per-IP, on both API and AI calls. Critical from day one.

**Privacy:** Resumes contain PII. Encrypt at rest, allow users to delete data, and be explicit in your privacy policy that resumes aren't used to train models. This is a real concern for your users.

---

## 5. Monetization

Recommended model: Freemium subscription with credits

## Tier| Price| What's included

Free| $0| 1 full optimization (all 7 prompts) per month, 1 saved CV, basic templates

Pro| $19-24/mo| Unlimited optimizations, all templates, cover letters, interview prep, LinkedIn sync

Pro Annual| $144/yr| (~$12/mo) Same as Pro, billed yearly — your highest-LTV tier

One-time "Job Sprint"| $29 7-day| unlimited access, no recurring charge — great for passive job seekers

---

## 6 Build Plan

### Phase 0 - Setup and foundation

1. Create nx repository
2. Set local environment
3. Environment variables

### Phase 1 - Database schema and auth

1. Database schema - Prisma
2. Auth - Supabase passwordless auth with OTP 6 digit code

### Phase 2 - File upload and parsing

### Phase 3 - AI layer

### Phase 4 - Frontend

### Phase 5 - Export generation

1. Pdf export
2. Docx export

### Phase 6 - Billing

### Phase 7 - Polish and prelaunch

### Phase 8 - Beta and Launch
