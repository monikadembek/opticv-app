# Tasks list

### 1. Create project structure

**status: done**

- Nx Monorepo with backend (Nest.js), frontend (Angular 21) and shared datatypes library
- use previously prepared template repository https://github.com/monikadembek/fullstack-app-template-nx-nestjs-angular

---

### 2. Implement basic layout in frontend app

**status: done**

- top header
- footer
- main container
- home page

---

### 3. Supabase passwordless auth with OTP 6 digit

**status: done**

- login page - sends link to user with 6 digit code
- if user signs in for the first time then new user is created in Supabase and email with sign up confirmation link is sent
- verify page - form to submit 6 digit code (only in user sign in flow, not in user sign up flow)
- if success navigates to main page
- **sending emails with custom SMTP** - needs to be implemented bc Supabase has limit of sending only 2 email per hour, use Resend service (3000 email/month, 100 emails/day in free tier)

---

### 4. Sending emails with custom SMTP

**status: blocked**

- must be implemented bc Supabase has limit of sending only 2 email per hour
  https://supabase.com/docs/guides/auth/auth-smtp
- use Resend service - 3000 email/month, 100 emails/day in free tier
- Resend needs url of the application, so app must be deployed first
- https://resend.com/docs/send-with-supabase-smtp

---

### 5. Create database schema

**status: done**

- create database schema - prisma
- run initial migration

---

### 6. Handle user creation on the backend

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

### 7. Implement CV file upload

**Status: in progress**

- create account on Cloudflare R2 for storage
- upload user cv file - allow pdf or docx

---

### 8. Implement parsing of uploaded user CV file

**status: todo**

- parse pdfs and docx files
