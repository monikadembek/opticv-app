# Tasks list

### 1. Create project structure - setup (FE, BE)

**status: done**

- Nx Monorepo with backend (Nest.js), frontend (Angular 21) and shared datatypes library
- use previously prepared template repository https://github.com/monikadembek/fullstack-app-template-nx-nestjs-angular

---

### 2. Implement basic layout in frontend app (FE)

**status: done**

- top header
- footer
- main container
- home page

---

### 3. Supabase passwordless auth with OTP 6 digit (FE)

**status: done**

- login page - sends link to user with 6 digit code
- if user signs in for the first time then new user is created in Supabase and email with sign up confirmation link is sent
- verify page - form to submit 6 digit code (only in user sign in flow, not in user sign up flow)
- if success navigates to main page
- **sending emails with custom SMTP** - needs to be implemented bc Supabase has limit of sending only 2 email per hour, use Resend service (3000 email/month, 100 emails/day in free tier)

---

### 4. Sending emails with custom SMTP (Supabase, Resend services)

**status: blocked**

- must be implemented bc Supabase has limit of sending only 2 email per hour
  https://supabase.com/docs/guides/auth/auth-smtp
- use Resend service - 3000 email/month, 100 emails/day in free tier
- Resend needs url of the application, so app must be deployed first
- https://resend.com/docs/send-with-supabase-smtp

---

### 5. Create database schema (BE)

**status: done**

- create database schema - prisma
- run initial migration

---

### 6. Handle user creation on the backend (BE)

**status: done**

Option 1 — Supabase Database Webhook (recommended)

Supabase can fire an HTTP POST to your NestJS backend whenever a row is inserted into auth.users. You configure this in the Supabase Dashboard under Database → Webhooks, pointing at e.g. POST /api/users/sync.

- Triggered automatically on first confirmed sign-in (when Supabase creates the auth user)
- No changes needed to frontend code
- Your NestJS endpoint receives the new user's id, email, etc. and does prisma.user.create(...)
- Also create the free Subscription row here atomically

Option 2 — "upsert on first authenticated request"

Add a NestJS guard or middleware that, after validating the Supabase JWT on any protected route, checks if a User row exists for that supabaseId and creates one if not.

- Lazy creation — user row appears on first real API call, not at sign-up
- Slightly more latency on the first request; also means User may not exist when you need it (e.g., a race with a webhook)
- Simpler to implement, no external webhook config needed

Option 3 — Explicit /api/users/me endpoint called by the frontend

After the OTP verify step succeeds, the frontend calls POST /api/users/me (or GET with upsert semantics). The backend creates the user if they don't exist, returns their profile.

- Frontend controls timing exactly
- Adds coupling — if the frontend skips this call (e.g., deep link after email confirm), no user row is created

---

My recommendation: Option 1 (webhook) + Option 2 as a safety net.

Use the Supabase webhook as the primary creation path, and add a lightweight upsert-if-missing check in your JWT guard as a fallback. This way you're never in a state where a valid Supabase session has no corresponding User row, regardless of how the user landed in the app.

---

### 7. Implement CV file upload (FE, BE, Cloudflare)

**Status: done**

- create account on Cloudflare R2 for storage
- upload user cv file - allow pdf or docx
- backend endpoint
- frontend new page upload-cv

---

### 8. Show list of user uploaded files in dashboard (BE, FE)

**status: done**

- new endpoint to retrieve licv of user cvs from CvDocument table
- new endpoint to delete cv
- new endpoint to download cv
- add dashboard page and display there a list of user uploaded cvs
- add buttons to download and delete cv

---

### 9. Implement parsing of uploaded user CV file (BE)

**status: done**

- parse pdfs and docx files
- store parsed content in table CvDocument in parsedText field

---

### 10. CV structured extraction (BE)

**status: done**

- extract cv data as structured output json from parsed text
- use some cheap model from Open AI for now, for example GPT-4.0-mini model
- prepare new endpoint which will be consumed by frontend as the first step in cv optimization creator after usr selects cv from the list

---

### 11. Prepare prompt templates for CV optimizations (BE)

**status: done**

- prepare prompt templates for 7 steps of CV optimization process
- seed database with prompt templates

---

### 12. Implement Job Application module on backend (BE)

**status: done**

- add CRUD endpoints related to job application

---

### 13. First step of CV optimization creator (FE)

**status: done**

- add new page /cv-optimization which will hold cv optimization creator
- add first step of creator where user can select cv and paste job application data
- run endpoint to save job application

---

### 14. Optimization process on backend - BullMq (BE)

**status - done**

- implement optimization process on backend
- add BullMq + Redis
- add docker compose
- add EventBus to inform controller when job is finished
- send SSE to FE

---

### 15. Trigger single job (BE)

**status: done**

- implement single job per promptType triggered manually in case a job fails, because currently all 7 jobs are triggered in one triggerOptimization() call
- add new POST endpoint for that

---

### 16. Usage tracking (BE)

**status: done**

- implement usage logging called inside every AI request
- implement cos t calculation, store costCents
- wire up Usage logging: UsageLog table exists in schema but no code writes to it currently, we need to populate it with proper data.

---

### 17. Refactor cv-optimization component (FE)

**status - done**

- rename cv-optimization-step1 component to job-upload component
- replace stepper primeng component with primeng accordion

---

### 18. Run cv data extraction in web app (FE)

**status: done**

- After user selects cv and submits job description call request to extract structured data from selected cv

---

### 19. Integrate Swagger (BE)

**status - in progress**

- add Swagger to backend app

---

### 20. Trigger optimization process from web, wait for runId and listen to SSE (FE)

**status: todo**

- run optimization process from frontend
- wait for response with runId and use it to leisten to SSE - server sent events

---

### Refactor fetching list of cvs in dashboard (FE)

**status - todo**

- implement httpResource to get list of user cvs in dashboard

---

### Handle CV files with images (photo)

**status - todo**

- rethink the parsing strategy to handle cv files which may contain user photo

---
