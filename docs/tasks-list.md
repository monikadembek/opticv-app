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

**status: done**

- must be implemented bc Supabase has limit of sending only 2 email per hour
  https://supabase.com/docs/guides/auth/auth-smtp
- add option to send custom SMTP email in Supabase, needs passing data from Resend
- create free Resend account - 3000 email/month, 100 emails/day in free tier, 1 domain
- add domain in Resend: auth.opticv.net
- add necessary dns records to the created subdomain
- Resend settings - integrate with Supabase
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

**status - done**

- add Swagger to backend app
- works only in dev environment
- accessible under http://localhost:3000/swagger

---

### 20. Trigger optimization process from web, wait for runId and listen to SSE (FE)

**status: done**

- run optimization process from frontend
- for now run job by job for consecutive propmt types instead of running full optimization at once
- handle SSE - server sent events

---

### 21. Display ATS Autopsy results (FE)

**status - done**

- add ats-score component
- display there results for RESUME_AUTOPSY
- display with modern nice UX

---

### 22. Display keyword gap analysis results (FE)

**status - done**

- add keyword-gap component
- display there results for KEYWORD_GAP
- display with modern nice UX

---

### 23. Display rewritten summary results (FE)

**status - done**

- add keyword-gap component
- display there results for SUMMARY_REWRITE
- display with modern nice UX

---

### 24. Display bullet upgrade results (FE)

**status - done**

- add bullet-rewriter component
- display there results for BULLET_UPGRADE
- display with modern nice UX

---

### 25. Display cover letter output (FE)

**status - done**

- add cover-letter-editor component
- display there results for COVER_LETTER
- display with modern nice UX

---

### 26. Display interview prep results (FE)

**status - done**

- add interview-prep component
- display there results for INTERVIEW_PREP
- display with modern nice UX

---

### 27. Add functionality to retry failed optimization for given prompt (FE)

**status: done**

- Add 'Retry' button to each accordion panel in case optimization fails or if computed signals like autopsyResult and rest of those same type of signals return null, which means we got no data or data has invalid format which won't be passed to respective components to display it in UI.
- Retry should trigger only single optimization for that given prompt type which failed
- Retry button should be enabled only when optimization failed or returned result with wrong/missing values and nothing is displayed

---

### 28. Add 2 new endpoints to save user edited output and to get cvstructured data (BE)

**status: in progress**

- get structuredData for cv with given id
  GET /cv/:id/structured-data
- patch optimization with given id, save data to field userEditedOutout
  PATCH /optimizations/:id/user-output

---

### 29. Export interview prep output to pdf or docx (FE)

**status: done**

- add buttons "Export to pdf" and "Export to docx"
- export interview prep output to pdf file
- export interview prep to docx file

---

### 30. Export selected cover letter to pdf or docx

**status: done**

- Fix issue with double salutation displayed in cover letter text editor, only add the salution at the beginning of fullLetter if it is not already included.
- export selected cover letter with the eventual user tweaks to pdf file
- export selected cover letter with the eventual user tweaks to docx file

---

### 31. Select and apply optimizations, export optimized cv to pdf and docx

**status: done - partially**

1. Summary rewriten - allow selecting summary and editing

- allow user to select one of presented summary versions,
- display it in textarea so that user can edit it
- add button 'Apply selected version" to save it in db optimization_results for given prompt type in column userEditedOutput.

2. Keyword gap - allow selecting, modifying, adding missing keywords and applying it to cv -> moved to separate task

3. Bullet upgrades - allow selecting, modifying and applying suggestion to cv -> moved to separate task

4. Export optimized cv to pdf and docx

---

### 32. Create CV templates

**status: done**

- prepare 3 cv templates, based on the provided images;
- allow user to select one of the 3 templates before triggering the export to file,
- by default template number 1 should be selected and used for the exported cv in pdf and docx,
- the exported cv should reflect the visual style of the selected template.

---

### 33. Rate limiting: Per-user and per-IP, on both API and AI calls. Critical from day one. (BE, FE)

**status: done**

- implement per-user rate limiting (BE)
- implement per-IP rate limiting (BE)
- handle 429 too many requests error on frontend (FE)
- critical before deploy

---

### 34. Refactoring on backend - config service updates

**status: done**

The existing services use the flat uppercase key syntax (e.g. configService.get('SUPABASE_URL')), not the nested dot-path syntax (e.g. configService.get('supabase.url')). This is actually a deliberate NestJS ConfigModule behaviour — when you load env files, both styles work:

- configService.get('SUPABASE_URL') → reads directly from the env file ✅
- configService.get('supabase.url') → reads from the configuration() factory object ✅

The configuration.ts update is still correct and valuable because:

1. It documents all env vars in one typed place
2. It enables dot-path access (configService.get('openai.apiKey')) for future refactoring
3. It keeps the file in sync with validation.ts — no silent gaps

Why this matters: configuration.ts is the typed factory that maps raw env vars into the structured object injected via NestJS ConfigService. If a property isn't here, you can't access it through configService.get('supabaseUrl') — you'd have to fall back to process.env.SUPABASE_URL directly, which bypasses the config abstraction entirely.

The pattern should be: validate in validation.ts → map in configuration.ts → consume via ConfigService. Right now only the throttler vars follow this pattern consistently.

- update configuration.ts to add all the missing properties, grouping related ones (supabase, r2, redis, bullmq)
- update the use of configService.get() to use the properties from configuration.ts instead of raw env variables, which are taken from .env files and that skips the validation

---

### 35. Implement proper CORS handling

**status: done**

- allow only frontend app origin

---

### 36. Add Helmet middleware library for better security

**status: done**

- use helmet to improve security

---

### 37. Deploy to staging environment - Render

**status: done**

- Create .env file for staging environment.
- Create account on Upstash to use Redis, bc Redis from Docker can be used only in local environment.
- Deploy frontend and backend apps to Render free account which will be used as staging environment.
  frontend url: https://opticv-app-web.onrender.com/
  backend url: https://opticv-app.onrender.com/

---

### 38. Delete user account (BE & FE)

**status: done**

Backend:

- add endpoint to delete user account, when user deletes his account it should also delete all related data to this user and also delete files from R2

Frontend:

- add user settings section in dashboard where we display user data: email, current subscription tier, button to delete account,
- where user clicks delete accout we should get confirmation dialog,
- if user confirms account deletetion then when the account is deleted on backend we should log out current user.

---

### 39. Stored Optimizations - display list, dispplay selected optimization, delete single optimization

**status: done**
**time: 09.06.2026 - 10.06.2026**

- in dashboard display list of previous optimizations, divide uploaded cvs and executed optimizationas into 2 separate tabs
- add button to delete optimization - cascade delete job application data and cv optimization data
- display selected previous optimization in new route cv-optimization/:id - displays optimization suggestions, read-only job application data with link to cv and buttons to export optimized cv

---

### 40. Bullet upgrades - allow editing bullets and apply it to optimized cv

**status: done**
**time: 10.06.2026 - 11.06.2026**

- allow inline editing the suggested rewrite (BulletAction 'rewrite') and applying the edited version to cv;

---

### 41. Bullet upgrades - add missing bullets suggestions and remove recommended_cut bullets

**status: done**
**time: 11.06.2026**

- allow selecting suggested missing bullets and applying it to optimized cv;
- allow inline editing the suggested missing bullets and applying the edited version to optimized cv;
- allow selecting the recommended_cut bullets and removing them from optimized cv
- persist changes to bullets state on backend

---

### 42. Create landing page

**status: done**

**time: 30.05.2026 - 06.06.2026**

- build landing page in Astro

---

### 43. Improve UI

**status: Done**
**time: 7.06-09.06**

- add logo
- adjust top menu nav to reflect the styles used on landing page
- make footer similar to the one on landing page
- divide cv-optimization page into 4 sections with headers

---

### 44. Login and Verify pages - improve UI/UX

**status: done**
**time: 11.06.2026**

- improve UI and UX on login and verify pages - add necessary descriptions,
- match visual design of landing page,
- in Supabase change time expration of OTP code to 900s (15min)

---

### 45. Homepage - content change

**status: done**

**time: 11.06.2026-12.06.2026**

- change texts on homepage, use some content from landing page;
- display hero section,
- cards in grid with app features
- display the 3 step process of how to use OptiCV app

---

### 46. Cv-optimization page redesign

**status: done**

**time : 13.06.2026 - 15.06.2026**

- create a mockup of cv-optimization page with new visal structure consisting of sidebar on the left and content on the right displayed in cards and export section displayed in footer fixed to the bottom of the page, use Claude Design,
- implement mockup created with Claude Design

---

### 47. Apply UI changes to sections that present results of cv-optimization process

**status: in progress**

**time: 15.06.2026 -**

- based on the mockup created with Claude Design apply changes to the UI of sections that present cv-optimization results:
  - ATS Analysis
  - Keyword Gap
  - Summary Rewrite
  - Bullet Upgrades
  - Cover Letter
  - Interview Prep

---

### 48. Add new templates

**status: done**
**time: 16.06.2026 - 17.06.2026**

- add new templates, mockups are provided in html file
- add select with a limited number of accent colors that user can choose from and the selected color will be applied as the accent color on the cv
- in export footer component next to the templates select add button that will open dialog with information:
  - All templates are ATS friendly
  - Information ATS friendly template should consist of

---

### 49. Template preview - show in cards with A4 format

**status: done**
**time: 17.06.2026 - 18.06.2026**

- template preview should show optimized cv in A4 format instead of adjusting to the dialog size
- for longer cvs multiple A4 cards should be displayed with content flowing from one page to the next
- vertical and horizontal scrollbars should be displayed if A4 card is bigger than the dialog size
- set the same page margins as the pdf and docx have

---

### 50. After the optimization process runs the job posting section is hidden, it should still be visible

**status: done**

**time: 18.06.2026 - 19.06.2026**

- make the job posting form section still visible after the optimization process runs
- for state 'processing' and 'completed' the job posting section should still be visible, but form should be in readonly mode
- in the top right corner of the page display button to run new optimization

---

### 51. Keyword Gap - allow editing missing keyword and applying them to optimized cv

**status: done**

**time: 19.06.2026 - 22.06.20226**

- add edit buttons to missing keywords so user can edit keyword, similar to what is implemented in bullet upgrades section
- allow keywords with suggestedPlacement 'experience_bullet' to be added to the optimized CV by letting user pick which experience position to append the recommendation text as a new bullet
- when editing the 'experience_bullet' the edit input should display quoted text from the recommendation property, if that text is missing than edit field should contain just the keyword

---

### 52. ATS score and keywords score - update them when user applies suggestions

**status: done**

**time: 22.06.2026 - 23.06.2026**

- do research on how this could be implemented, do we need another call to AI to check the scores in order to update them or can we update without llm calls?
- update predicted ATS score and keywords score when user applies suggestions to cv
- display updated results in sidebar and in sections

---

### 53. Summary rewrite - reset selected summary to original

**status: done**

**time: 23.06.2026**

- implement functionality to reset selected summary to original

---

### 54. Visual improvements in docx and pdf exported files structure

**status: done**
**time: 24.06.2026 - 28.06.2026**

- pdfs and docx files need some improvements regarding their visual structure, they must be adjusted to look similar to html template preview
- disable the selector with accent colors when classic and minimal templates are selected

---

### 55. Expand job description allowed characters number to 8000 (BE & FE)

**status: done**
**time: 28.06.2026**

- update job description max length to 8000 characters

---

### 56. Small visual improvements

**status: done**
**time: 29.06.2026**

- Display link to cv optimization page after user successfully uploads cv file
- Define width and maxwidth of confirmation dialogs
- Change text on confirmation dialog when user deletes uploaded cv, add info that it will also remove all associated optimizations
- On first page add images to the 3-step process of using the app

---

### 57. LinkedIn Rewrite - prepare new prompt (BE)

**status: done**
**time: 30.06.2026**

- prepare new version of prompt for the LINKEDIN_REWRITE that will allow generating linkedIn profile informations based on uploaded cv and provided job description/job position, and will not require user to provede their current linkedin profile informations
- run npx prisma db seed

---

### 58. LinkedIn Rewrite - display results, allow export to pdf and docx (FE)

**status: done**
**time: 30.06.2026 - 1.07.2026**

- run process of preparing linkedIn informations based on uploaded cv and provided job description
- display results in ui
- export linkedin profile data to pdf and docx
- add information about linkedin feature on the home page

---

### 59. Bug - Missing scores in sidebar

**status: done**
**time: 2.07.2026**

- When user runs optimization process, after it finishes in the sidebar should appear section with scores, but it is not displayed.
- When user opens saved optimization the section with scores is also not displayed.
  Check why this is happening and suggest a fix.

---

Root Cause

The sidebar's showScores condition requires atsScore() !== null (line 94 of optim-sidebar.ts). The template passes projectedAtsScore() as the atsScore input (line 28 of cv-optimization.html).

projectedAtsScore() returns null in two situations (from recompute-scores.ts):

1. No selections have been made yet (lines 83–90)
2. Even after selections, if the projected score equals the original score (line 127–128)

So scores never show in the sidebar because:

- After running optimization: No selections made yet → projectedAtsScore() is null → showScores is false
- When opening saved optimization: Same problem — no selections active on load → null

The sidebar should show the baseline ATS score always (once results are available), and only switch to the projected score when it exists.

The Fix

In cv-optimization.html, change what's passed to the sidebar from projectedAtsScore() to a fallback:

[atsScore]="projectedAtsScore() ?? atsScore()"
[keywordScore]="liveKeywordScore()"

This way:

- If no selections have been made, projectedAtsScore() is null and it falls back to the raw atsScore() from the autopsy result
- Once the user makes selections that change the score, the projected score takes over

The liveKeywordScore() already handles this correctly because recomputeKeywordGapResult() returns the original score when no keywords are selected (it returns a clone with no changes on line 14 of recompute-scores.ts), so liveKeywordScore() will be non-null as soon as keywordGapResult is available. No change needed there.

File to edit: apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html, line 28

---

### 60. Add Sentry to monitor errors in app

**status: done**
**time: 02.07.2026 - 03.07.2026**

- add Sentry to frontend app - https://docs.sentry.io/platforms/javascript/guides/angular/manual-setup/
- add Sentry to backend app - https://docs.sentry.io/platforms/javascript/guides/nestjs/

---

### 61. LinkedIn Skills section - replace skills to add with list of recommended skills (BE and FE)

**status: done**
**time: 1.07.2026**

- add version 3 of prompt for LINKEDIN.REWRITE, changes include replacing skillsToAdd with list of recommended skills ranked by recruter-search relevance, returns skills that are already included in cv and new skills to add,
- display list of recommended skills containing skills from CV and suggested new skills, maximum of 50 skills allowed.

---

### 62. Posthog integration (FE)

**status: done**
**time: 3.07.2026**

- integrate Angular app with Posthog
- capture custom events:
  - cv uploaded
  - cv deleted
  - optimization deleted
  - cv optimization run
  - export cv pdf and docv
  - export cover letter pdf and docx
  - export interview prep pdf and docx
  - export linkedin materials pdf and docx
  - sign in and sign out buttons
  - account deleted

---

### 63. Bugfix - fix issue when uploading cv - duplicate email bug

**status: done**
**time: 5.07.2026**

Root cause: apps/opticv-be/src/app/users/users.service.ts:29-33 — upsertUser matched on where: { supabaseId }, but email is also @unique on the User model (schema.prisma:63). Since SupabaseGuard.canActivate calls upsertUser on every authenticated request, any time a request came in with an email that already had a user row but a supabaseId Prisma hadn't seen yet (e.g. a Supabase auth identity was re-created/re-verified for the same email, or two first-time requests raced), the upsert tried to create a duplicate row and hit the email unique constraint — crashing the guard and returning a 500 on POST /api/cv/upload (and any other authenticated route).

Fix applied: changed the upsert's where to key on email (the stable identity) and update supabaseId on match, so re-authentication under a changed Supabase ID updates the existing row instead of trying to insert a duplicate.

Note: this narrows the race but doesn't eliminate it for two truly concurrent first-ever requests for a brand-new email — Postgres could still throw the same unique violation if two transactions insert the same new email simultaneously. If uploads are frequently fired in parallel right after signup, consider wrapping the upsert in a catch for the P2002 (unique constraint) Prisma error code and falling back to a plain findUnique, or moving to ON CONFLICT DO UPDATE via raw SQL.

Also fixed the corresponding test expectation in users.service.spec.ts. Found 27 pre-existing test failures in the opticv-be suite unrelated to this change (missing test providers like R2Service/ConfigService) — same failures exist on unmodified dev, so I left those alone.

---

### 64. UX - user doesn't know that must upload cv first before running cv optimization

**status: done**
**time: 5.07.2026**

Problem:
User logs in the app, clicks the Optimize my CV button in the hero section, gets navigated to optimize-cv page, pastes job offer and then it turns out thatthere is no cv uploaded and user doesn't know what to do, didn't know that cv must be uploaded first before any optimization can run.

Solution:
On homepage when user is logged in check if has any cv's already uploaded, if not, display button to Upload CV, otherwise display button to Optimize my CV.
On the upload page after successful upload replace link to Optimize Cv page with button to make it more obvious for the user as to what his next step should be.

Todo:

1. Add cvs signal store
2. Add to cvs signal store methods regarding getting user cvs
3. On homepage get user user cvs via signal store method and depending if user has cvs or not display either 'Upload your first CV' button or 'Optimize CV' button.
4. On upload page after successful upload replace link to Optimize Cv page with button

---

### 65. Use cv signal store for operations related to cvs

**status: done**
**time: 5.07.2026 - 6.07.2026**

- in the dashboard page incorporate cv store - replace loading cvs with method from cv store and update store state when deleting cv file
- on cv optimizations tab display button to go to upload page if user doesn't have any cvs uploaded yet instead of 'Run your first optimization' button
- move loading user cvs and populating store to app component from home component
- refresh cv store after user succesfully uploads a cv file
- on cv-optimization page use cvs from store instead of making request to api to get users cvs

---

### 66. Remove Sentry's 'Report a bug button'

**status: done**
**time: 06.07.2026**

- remove / hide 'Report a bug' button that is placed in bottom right corner of every page and was added when Sentry was integrated

---

### 67. UX - homepage changes

**status: done**
**time: 06.07.2026**

- remove photo with woman below the hero section
- put section with 3 step process below the hero section

---

### 68. UX - user uploads cv in language different than english, but OptiCV currently supports english cvs

**status: done**
**time: 06.07.2026**

- add warning or information on the upload page that OptiCV currently supports only English language cvs
- display it on the upload page and on homepage - step 1 upload

---

### 69. UX - Cv optimization page - allow collapsing/expanding section cards

**status: done**
**time: 7.07.2026**

- sections with optimizations are usually very long, add functionality to collapse/expand sections - add button in the header of each section to collapse/expand that section
- add a page-level "collapse all" / "expand all" button to expand/callapse all sections, place it in the top right corner, next to '+ New optimization' button,

---

### 70. UX - on the home page when user is not logged in hide button to upload cv

**status: done**
**time: 7.07.2026**

- homepage hero section displays button to sign in and button to upload cv or optimize cv even though user is not logged in - hide upload/optimize button for not signed in users

---

### 71. UX - add information about checking spam folder for email with 6-digit code

**status: done**
**time: 7.07.2026**

- sometimes emails from auth.opticv.net land in spam folder, add information for the user to check spam folder for email with login code - verify page
- add info that in case of first time login user will receive link instead of code - login page

---

### 72. Set up social media accounts - Facebook and Instagram

**status: done**
**time: 7.07.2026 - 08.07.2026**

- create account on Facebook for OptiCV - business account
- create account on Instagram for OptiCV - business account
- add icons with links to social media in the footer

---

### 73. Bug - exported cv doesn't contain polish letters

**status: done**
**time: 08.07.2026**

- extracted cv doesn't output polish letters in pdf files - helvetica font used in pdf doesn't support polish letters

Root cause: all four PDF export services (cv-export.service.ts, cover-letter-export.service.ts, interview-prep-export.service.ts, linkedin-export.service.ts) used jsPDF's built-in 'helvetica' font, which is a PDF Standard-14 font restricted to WinAnsi/Latin-1 encoding — it has no glyphs for Polish characters (ą, ć, ę, ł, ń, ó, ś, ź, ż and uppercase forms).

Fix:

- Added apps/opticv-web/src/app/features/cv-optimization/services/fonts/roboto-font-base64.ts — static Roboto TTF weights (Regular/Bold/Italic/BoldItalic), base64-encoded, which cover Latin Extended-A (Polish diacritics).
- Added fonts/register-pdf-font.ts — a registerPdfFont(doc) helper that embeds the font into a jsPDF document via addFileToVFS/addFont, and exports the PDF_FONT constant.
- Updated all four export services to call registerPdfFont(doc) right after creating the jsPDF instance, and replaced every 'helvetica' reference with PDF_FONT. The DOCX profiles/exports were left untouched — Word resolves fonts against installed system fonts and already handles Unicode correctly.
- Verified via a standalone Node script that the generated PDF embeds the TrueType font (FontFile2) with a ToUnicode CMap and correctly encodes Polish text.
- Fixed the three .spec.ts jsPDF mocks (cv-export, cover-letter-export, linkedin-export) to include addFileToVFS/addFont so tests don't break on the new call. Full test suite now passes except one pre-existing, unrelated failure in supabase.spec.ts.

---

### 74. Bug - invalid pdf text parsing

**status: done**
**time: 08.07.2026 - 09.07.2026**

- issue with extracting proper data from cvs that may contain columns, tables or more graphic elements

To test:

- test different models for the cv extraction, for the tests used cv with 2 columns and graphical items:
  - gpt-4o-mini - failed
  - gpt-5-mini - failed
  - gpt-5.4-mini - failed
  - gpt-5.2 - failed
  - claude-sonnet-4.5 - ok
  - gemini-3.5-flash-high - ok
- run tests on various CVs

Real reason for bug:
-issue is with pdf-parse library, it parses pdf with 2 columns in invalid way and then the model cannot properly extract data and return it in the given data structure

To do:

- consider omitting the pdf-parse library if it doesn't product proper results and instead run prompt with the pdf file attached to extract text content and put it in the defined data structure and then save the structured data in db

---

### 75. Bug - selected summary variant is not saved

**status: done**
**time: 09.07.2026**

- Selected summary variant is not persisted

---

### 76. Bug - selected keywords are not saved and reloaded correctly

**status: done**
**time: 09.07.2026**

- Selected keywords are not saved and then reloaded correctly when user opens stored optimizations

The bug had two parts, both in apps/opticv-web/.../cv-optimization.ts:

1. Toggling a keyword never triggered a save. When you click a keyword to select/deselect it, onKeywordToggled() only updated the in-memory selections signal — it never called the method that sends data to the backend. Every other similar action (editing a keyword, saving a bullet, etc.) called persistBulletState() after updating state; this one didn't.
2. Even if it had saved, the field didn't exist in the saved data shape. The app persists optimization edits as a JSON blob matching a type called BulletUserState. That type had fields for bullet edits, keyword edits, keyword-bullet positions, etc. — but no field for "which keywords are selected." So the data had nowhere to go, and there was nothing to read back when reloading.

The fix — 4 small changes:

1. packages/shared/datatypes/src/lib/datatypes.ts — added selectedKeywords?: string[] to BulletUserState, so the persisted shape can actually hold this data.
2. cv-optimization.ts — onKeywordToggled() — added a call to this.persistBulletState() after toggling, so a save is now triggered (matching the pattern used by sibling handlers).
3. cv-optimization.ts — persistBulletState() — added selectedKeywords: this.selections().selectedKeywords to the object that gets JSON-stringified and sent to the backend, so the current selection is actually included in the save payload.
4. cv-optimization.ts — loadStoredOptimization() — when reloading a stored optimization, added selectedKeywords: state.selectedKeywords ?? [] to the restore logic, so previously saved selections populate the UI again.

No backend or database changes were needed — the backend just stores this as an opaque JSON string (userEditedOutput), so once the frontend both writes and reads the new field, everything works end-to-end.

I also added 4 unit tests in cv-optimization.spec.ts covering: saving on toggle-on, saving on toggle-off, restoring keywords from stored state, and defaulting to [] when the field is missing (for backward compatibility with older saved data). Full suite passes except for 5 pre-existing, unrelated failures in home.spec.ts/footer.spec.ts.

---

### 77. Bug - selected cover letter and the eventual edited version is not saved

**status: done**
**time: 09.07.2026 - 10.07.2026**

- perist selected cover letter and edited content in database
- reload saved cover letter and edited content when user opens stored cv optimization

---

### 78. Add 'Optimize CV' button in the dashboard to each listed CV

**status: todo**
**time: 09.07.2026**

- In the dashboard in the tab with uploade cvs, add 'Optimize CV' button to each CV item
- When user clicks the button it should navigate to cv-optimization page and the given cv should be selected in the select input

---

### Bug - some selected bullet rewrites are not applied to A4 cv template preview and not applied to exported CV

**status: todo**
**time:**

- some selected bullet rewrites are not applied to A4 cv template preview and not applied to exported CV, investigate the issue, it happens when missing bullets target position which is not listed on the cv, it may be included in results in 'other' property

---

### UX - Add help informations

**status: todo**
**time:**

- add help informations which will explain what are keywords and why are they important,
- what is summary, ats, etc.

---

### UX - Bullet upgrades visual improvements

**status: todo**
**time:**

- suggested version and original versions are not very visible, maybe create sth like a diff

---

### UX - Too much informations on cv-optimizations page

**status: todo**
**time:**

- there is a lot of informations on cv-optimization page, it might be overwhelmig for the user,
- maybe the additional materials should be moved to new page?

---

### UX - explain user how to use app

**status: todo**
**time:**

- in the beginning it would be good to have some welcome screen or user guide
  so we can guide user with how to use the app, how the entire process works

---

### UX - create animations or video on how to use the app

**status: todo**
**time:**

- create animations or video with the process of using the app - from upload to pasting job offer to running optimization process and then exporting cv
- put it on the homepage

---

### Keyword Gap - Acronym issues and underweighted keywords

- think of what we can do with those sections, are tey mportant, should we display them, how we could apply the acronym issues

---

### Add functionality to remove bullet point

---

### Setup Stripe

---

### On the backend implement open router service so we can choose different models to run prompts.

---

### Bug - after account is deleted all items in menu stay visible

**status: todo**

When user deletes its account, gets logged out, but account is already deleted so supabase logout returns error, we are redirected to login page but all item in top menu are visible, even the ones which should be visible only to logged in users.

---

### Bug - Fix issue with selecting template card with keyboard

**status: cancelled - no longer relevant, this is no longer used**

---

### Implement logging to db/file

**status: todo**

- implement saving backend logs to database or saving logs to file with Winston?

---

### Check alternatives to to PrimeNg Text Editor

https://ngx-simple-text-editor.netlify.app/usage.html

---

### Run full optimization process instead of running promptTypes one by one

**status: todo**

- use method runFullOptimizationProcess(jobApplicationId: string) from cv-optimization-api.service.ts

---

### Privacy: Resumes contain PII. Encrypt at rest, allow users to delete data, and be explicit in your privacy policy that resumes aren't used to train models. This is a real concern for your users.

---

### Refactor fetching list of cvs in dashboard (FE)

**status - todo**

- implement httpResource to get list of user cvs in dashboard

---

### Handle CV files with images (photo)

**status - todo**

- rethink the parsing strategy to handle cv files which may contain user photo

---
