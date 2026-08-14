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

**status: done**
**time: 10.07.2026**

- In the dashboard in the tab with uploaded cvs, add 'Optimize CV' button to each CV item, place it before the download icon button,
- When user clicks the button it should navigate to cv-optimization page and the given cv should be selected in the select input,
- remove 'Parsed' text as we no longer parse the pdf files.

---

### 79. UX/UI - Bullet upgrades visual improvements

**status: done**
**time: 10.07.2026 - 11.07.2026**

- suggested version and original versions are not very visible, maybe create sth like a diff or make the rewritten bullet more stand out
- display original version next to the rewritten version of bullet point
- collapse information for weakness and reason for rewrite,

---

### 80. UX/UI - Bullet upgrades - missing bullet points visual improvements

**status: done**
**time: 11.07.2026**

- ui changes: selected mising bullet card should have light green background
- display edit button always not only when missing bullet isselected

---

### 81. UX/UI - Dashboard redesing

**status: done**
**time: 12.07.2026**

- implement new designs for the dashboard
- add stats above tabs
- get data in dashboard component and pass to list of cvs and list of optimizations
- redesign list of cvs - display in table
- redesign list of optimizations - display in table
- add search functionality

---

### 82. Bug - Settings page displays data from previously logged in user, the same with list of cvs displayed in dashboard

**status: done**
**time: 12.07.2026 - 13.07.2026**

- user logs out, user logs in with different account, setting page displays data from previous user account and only after page refresh settings page shows correct data
- cv list is also displayed from previous account

To do:

- clean cv store when user signs out
- settings page shows old data because httpResource cached data - reload data when user enters settings page

---

### 83. Implement limits for different subscription tiers

**status: done**
**time: 13.07.2026**

We need to implement some limits for different types of subscription tiers that the app will give its users.
The app will offer 3 tiers: free, basic and pro so we need to change SubscriptionTier enum to hold values: FREE, BASIC, PRO.

FREE tier allows monthly:

- 1 CV otpimization run
- 1 cover letter generation
- 1 interview prep generation
- 2 templates for CV to choose from: default and classic

BASIC tier allows monthly:

- 10 CV otpimizations runs
- 10 cover letter generations
- 10 interview prep generation
- 10 linkedin profile content generations
- all CV templates available

PRO tier allows monthly:

- 30 CV otpimizations runs
- 30 cover letter generations
- 30 interview prep generation
- 30 linkedin profile content generations
- all CV templates available

Introduce limits for the number of files with CVs that a user can upload?
FREE: 2, BASIC: 10, PRO: 20

---

### 84. Redesign Account Settings page

**status: done**

**time: 14.07.2026**

- implement new design for account settings page

---

### 85. Implement adding user full name (BE & FE)

**status: done**

**time: 14.07.2026**

- implement the functionality to add user full name in account settings page
- add new api endpoint to store user full name in users table in the displayName column,
- validate the coming display name, allow max length of 100 characters
- on frontend modify current tempplate driven form to signal form

---

### 86. Implement user email change

**status: done**

**time: 14.07.2026 - 15.07.2026**

- implement user email change via updating the user data in supabase authentication
- process of changing email should be executed when user provides new email addres in settings page, clicks Change email button and then confirms the message in dialog window, which sends confirmation email to new email address with link which must be clicked to confirm the change in supabase
- use the plan from @docs/user-email-change.md

---

### 87. Save user notifications preferences (BE & FE)

**status: done**

**time: 15.07.2026**

- in account setting page user can turn on notification for product updates and job tips
- add new table Notifications with those options and add relation to user table
- prepare endpoint where user can send notification type with value true/ false and it would update that data in database
- on frontend in Account Settings page implement passing notifications values to backend via prepared endpoint, which should be executed when user clicks the switch toggle button

---

### 88. Upload CV page - redesing (FE)

**status: done**

**time: 15.07.2026 - 16.07.2026**

- change UI in the upload CV page

---

### 89. Top menu should show which page is opened

**status: done**

**time: 17.07.2026**

- the item in the top menu should indicate currently opened page
- display it bolded and green

---

### 90. Bug - the NaN in ATS score ring

**status: done**

**time: 17.07.2026**

- Fix the NaN ATS score bug - missing/non-finite issue.estimatedImpact treat as 0 instead of letting undefined \* n propagate as NaN
- investigate - the stored RESUME_AUTOPSY record you pasted has no estimatedImpact on any issue even though the type requires it — that's likely from before the field existed, or the AI prompt/schema isn't enforcing it.
  estimatedImpact was not required - must be reuired field

---

### 91. UX - Adding Help information to section in CV Optimization page

**status: done**

**time: 17.07.2026**

- add short, per-section explanations to the cv-optimization page, so users understand what each section is, why it matters, and how ATS uses it
- job-info-banner component should look like the rest of sections, now it is missing the header part

---

### Bug 92 - after user logs out or deletes account all items in menu stay visible

**status: done**

**time: 18.07.2026**

- when user logs out all items in the menu that are meant for the logged in users should be hidden,
- When user deletes its account, gets logged out, but account is already deleted so supabase logout returns error, we are redirected to login page but all item in top menu are visible, even the ones which should be visible only to logged in users.

---

### 93. Bug - Keywords gap section - position for added experience bullet type items is not preserved

**status: done**

**time: 18.07.2026 - 19.07.2026**

If we open cv-optimization page in stored mode, in the Keywords gap section if we selected previously keyword with suggested placement experience bullet the the selected position is not preserved and it should be. This must be fixed.

---

### 94. UX - In-app user guide - welcome guide + help icon

**status: done**
**time: 19.07.2026**

Help user understand and use the app by implementing in-app user guide.
Implement:

- A welcome modal shown once on first login, explaining the 3-step process.
- A persistent help icon in the header that reopens the welcome modal / guide on demand.
- after adding help icon to top menu, change Sign out button to icon button on mobile view so that everything fits on the screen

---

### 95. UX/UI - Redesign welcome modal

**status: done**
**time: 20.07.2026**

- implement new designs for the welcome modal, version 1c Intro -> tour -> finish Full first login journey, the html code is stored in the ui folder of that task together with the necessary images in uploads folder,
- when user clicks the help icon button in top menu show only the carousell steps 1-7, don't show the welcome screen and the finish screen, they should only be displayed for the first time login

---

### 96. UX/UI - CV optimization page - collapse all sections by default, expand first

**status: done**

**time: 22.07.2026 - 23.07.2026**

There is a lot of informations displayed on cv-optimization page, it might be overwhelming for the user.

The CV optimization results page (cv-optimization.html/.ts) renders 7-9 result sections (ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Profile, plus Job Posting) stacked vertically. Once an optimization run completes, the page is reportedly 15-20 screens of scrolling, a real risk that users won't read through it or won't discover value further down (e.g. Cover Letter, Interview Prep, LinkedIn Profile near the bottom). Everything is rendered flat and expanded at once, with no hierarchy of "what matters most" vs "supporting detail."

- The first fix should be to collapse all sections by default and expand only the first section with ATS analysis results

---

### 97. UX/UI - CV optimization page - split results into 2 groups displayed in separate tabs

**status: done**

**time: 23.07.2026 - 24.07.2026**

Split result sections into two groups by content type, shown as separate tabs (or eventually separate routes), instead of one long page mixing both:

Group A — "CV Analysis": ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades. These relate directly to editing/improving the resume itself.
Group B — "Additional Materials": Cover Letter, Interview Prep, LinkedIn Profile. Supplementary job-application materials, not resume edits.

---

### 98. Bug - Race condition error in usageQuota

**status: done**

**time: 23.07.2026**

**Prisma quota race condition**

Here's what's happening:

The bug: a classic upsert race condition.

checkAndConsume does this inside a transaction:

const row = await tx.usageQuota.upsert({
where: { userId_feature_periodStart: { userId, feature, periodStart } },
create: { userId, feature, periodStart, count: 0 },
update: {},
});

upsert is not atomic at the database level the way you'd hope — Prisma implements it as roughly "try to find/insert, and if a unique constraint violation happens during the insert, retry as an update." When two requests for the same (userId, feature, periodStart) arrive close together (e.g. a double-click, a retry, or two tabs), both transactions can simultaneously determine "no row exists yet" and both attempt to INSERT. Postgres's unique constraint on (userId, feature, periodStart) correctly allows only one insert to succeed — the second raises exactly this error: PrismaClientKnownRequestError ... Unique constraint failed on the fields: (userId, feature, periodStart). Prisma surfaces this as an unhandled exception rather than silently retrying the upsert as an update.

In this specific stack trace, it happened on the first call of the month for that user+feature (RESUME_AUTOPSY → some feature), since that's the only time the row doesn't already exist and the create branch of the upsert is exercised. Once the row exists, subsequent calls hit the update: {} branch of the upsert without issue — only concurrent first calls collide.

Why it's "unhandled" (handled: no): nothing in checkAndConsume or its caller (OptimizationService.triggerSingleJob) catches PrismaClientKnownRequestError with code P2002 (unique constraint violation), so it bubbles up to the global exception filter and gets reported as a 500 to the client — the user's RESUME_AUTOPSY run failed even though quota logic itself is conceptually fine.

Likely trigger: the user probably double-submitted the run (double click, or a retry from the frontend/network layer) so two run/RESUME_AUTOPSY requests landed at nearly the same time for the same job application/user.

No code changes made, per your request — let me know if you'd like me to suggest/implement a fix (e.g., catching P2002 and retrying, or restructuring as createMany ... skipDuplicates followed by the updateMany).

**Fix summary**

apps/opticv-be/src/app/quota/quota.service.ts — checkAndConsume now catches the race where two concurrent requests both try to INSERT the first usageQuota row for a (userId, feature, periodStart) combo. On a P2002 unique-constraint violation, it re-fetches the now-existing row via findUniqueOrThrow instead of letting the error bubble up as an unhandled 500.

No other behavior changed — the quota-limit check (updateMany with count: { lt: limit }) still runs the same way after the row is resolved.

---

### 99. Login form, Verify form - submit button enabled when form is not submitting

**status: done**

**time: 24.07.2026**

- remove disabled state when form is not submitting for Submit buttons in Login and Verify components

---

### 100. UI/UX - Changes in Welcome Guide component

**status: done**

**time: 24.07.2026**

- Remove text "2-minutes" text from intro screen of welcome guide - can makes user want to close welcome guide straight away
- update images because now the cv optimization page has tabs and sidebar displays only items included in active tab

---

### 101. UI/UX - Keyword Gap section

**status: done**

**time: 25.07.2026 - 28.07.2026**

- Do we need all informations that are currently displayed?
- UI/UX improvements:
  - missing keywords should be visible more, its the most important part of this section,
  - matched keywords are taking too much space, display in pills,
  - make some sections collapsible to not display so much information at once,
  - add explanations to what acronym issues, underweighted keywords and fabrication warnings are,
- Acronym issues - implement replacing acronym keywords in optimized CV,
- Replace Keyword Gap with Keywords in the sidebar nav and Section card header.

---

### 102. Optimized CV is missing the position title (BE & FE)

**status: done**

**time: 29.07.2026 - 30.07.2026**

- in the extract-cv-data.prompt.ts we don't specify any property to hold position title that user might have in their cv, this needs to be added,
- if user has the position title in their CV and this data is extracted we need to include it in the optimized CV, position title should be displayed below the candidate's name

---

## 103. Sort and display missing keywords by importance

**status: done**

**time: 31.07.2026**

- display missing keywords that user likely has in the order of importance: Critical, High, Medium, Low

- display missing keywords that candidate doesn't likey has also in order of importance

---

### 104. Handle GDPR clause in CV

**status: done**

**time: 31.07.2026-02.08.2026**

If user is applying to jobs in the EU/EEA (or UK, under UK GDPR) it should have GDPR clause included in CV.

1. In the extract-cv-data.prompt.ts we don't specify any property to hold gdpr clause that user might have in their cv, this needs to be added, it should be of type eiher string or null.
2. If user has the gdpr clause in their CV and this data is extracted we need to include it in the optimized CV, it should be displayed at the bottom of last page.
3. All templates should also display the gdpr clause if it is precent.
4. In the export-footer component add checkbox with label gdpr clause, if user contains already a gdpr clause the checkbox should be checked, if there is no gdpr clause in the extracted CV then the checkbox should be unchecked. The checkbox should display in the title: "Include if you're applying to companies based in the EU, EEA, UK, or Switzerland"

5. If user selects this checkbox and doesnt have the clause in his cv a default gdpr clause should be added to the optimized CV, at the bottom of last page. Uchecking the checkbox should remove the clause from optimized CV.

6. Gdpr clause should be repeated on every page - implemented in template preview and pdf, in docx implemented displaying gdpr clause at the bottom of last page

The content of the clause should be:

I hereby give consent for my personal data included in this application to be processed for the purposes of the recruitment process, in accordance with Regulation (EU) 2016/679 (GDPR).

---

Research:
A GDPR clause on a resume is really only relevant if you're applying to jobs in the EU/EEA (or UK, under UK GDPR). Here's the quick breakdown:

Include it if:

You're applying to companies based in the EU, EEA, UK, or Switzerland
The job posting or application portal is in a European country
You're following a CV format common in countries like Germany, Poland, France, Spain, etc., where this clause is still customary (even though strictly speaking, GDPR consent isn't legally required just to submit a CV — legitimate interest usually covers it)

Skip it if:

You're applying in the US, Canada, or other non-GDPR jurisdictions — it'll look out of place and signal a template that wasn't localized
The employer already has a standard privacy notice covering applicant data (most large companies do, making the clause redundant)

If you do include it, keep it short, e.g.:

"I hereby give consent for my personal data included in this application to be processed for the purposes of the recruitment process, in accordance with Regulation (EU) 2016/679 (GDPR)."

One nuance: many HR/legal experts now consider this clause unnecessary even in the EU, since processing a job application is generally justified under "legitimate interest" or "steps prior to entering a contract" — not consent. So some updated CV guides actually recommend dropping it. If you tell me which country/market you're applying in, I can give you a more specific answer.

---

### 105. Security check - especially related to AI attacks

**status: done**

**time: 03.08.2026-05.08.2026**

- make security review of the app, fix issues,

- review app for the prompt injections or AI-specific attacks, get to know about security in terms of AI, what kind of attacks the app should be protected from - prompt injections

report is under that link:
https://claude.ai/code/artifact/b00de1f1-9afc-4a07-a847-a6ca3a77b98d?via=auto_preview

- implement things from security list that need to be fixed before launch

---

## 106. Job title match checked automatically

**status: done**

**time: 06.08.2026 - 09.08.2026**

- add job title match section inside keyword gap section
- allow updating or adding suggested job title to the optimized cv

Research:

Incorporate it into the existing Keyword Gap section, not a new one, it fits the existing pattern well:

- KeywordGapResult already has a suggestedPlacement: 'title' option on missing keywords — meaning the model already flags when a keyword should live in the job title, it's just not surfaced as its own thing today.
- The KEYWORD_GAP AI job already receives both texts: the CV's contact.position (extracted candidate title) and the job posting's jobTitle/jobDescription, via the seeded prompt in apps/opticv-be/prisma/seed.ts and PromptService's SHARED_CONTEXT. No new AI call is needed — this can be one more field in the existing structured JSON output the model already returns.
- The Keyword Gap UI (apps/opticv-web/.../components/keyword-gap/keyword-gap.ts) already renders the match score, matched/missing keywords, underweighted keywords, and acronym issues in one card — a "Job Title Match" sub-block at the top (right under the score ring, before the keyword lists) reads naturally as "here's your overall alignment, and here's specifically whether your title matches."

What the functionality should include

1. A jobTitleMatch field on KeywordGapResult (new type in datatypes.ts), something like:
   export type KeywordGapJobTitleMatch = {
   candidateTitle: string | null; // from CvStructuredData.contact.position
   targetTitle: string; // from JobApplication.jobTitle
   matchLevel: 'exact' | 'close' | 'mismatch';
   suggestedTitle: string | null; // AI-suggested title to use instead
   reasoning: string; // short explanation of the gap
   };
2. Prompt change: extend the KEYWORD_GAP prompt in seed.ts to also compare the candidate's current title against the job's title and return this block — reusing the same call rather than adding a second AI round-trip.
3. UI: a compact banner/row in keyword-gap.html, e.g. "Your title: Senior Backend Developer → Job wants: Staff Software Engineer" with a match badge (exact/close/mismatch) and a one-line reasoning.
4. Actionable fix (task #106 explicitly asks for this): a button "Use suggested title" that updates the title used in the optimized/exported CV — reusing the existing edit/override pattern already used for keywords and acronyms (keywordEdits map, apply-selections.ts), just targeting contact.position (and optionally the most recent experience[0].title) instead of a keyword string.
5. Score contribution (optional, worth deciding explicitly): whether title mismatch factors into matchScore/matchScoreBreakdown, or stays purely informational. Given title is one of the highest-weight ATS signals, I'd lean toward folding it into the score rather than leaving it decorative — but that's a product call worth confirming with you before implementing.

---

## 107. Setup Stripe in development/test mode

**status: done**

**time: 09.08.2026-11.08.2026**

- setup Stripe payments, for now in dev mode

https://www.youtube.com/watch?v=ag7HXbgJtuk

Plan for dev-mode Stripe setup (no real bank account needed — Stripe test mode works fully without one):

1. Stripe dashboard (test mode): create Products/Prices for BASIC/PRO tiers, get test API keys and a webhook signing secret. Test mode requires no bank account — only needed later when you enable live payments/payouts.
2. Backend: add STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET to development.env + Joi validation; create a StripeModule with StripeService (SDK client), a checkout-session endpoint, and a webhook endpoint (raw-body) that updates the Subscription row on checkout.session.completed / customer.subscription.updated / deleted.
3. Frontend: a "Upgrade" button that calls the checkout-session endpoint and redirects to Stripe Checkout; a billing/settings section showing current tier and a "Manage billing" link (Stripe customer portal).
4. Local webhook testing: Stripe CLI (stripe listen --forward-to localhost:3000/api/...) to forward events in dev.

---

## 108. Sync billing periods to Stripe, make FREE tier never renew

**status: done**

**time: 12.08.2026-13.08.2026**

In settings page we display 'Plan renews on' date, currently it always displays first day of next month date. Now that we have integrated Stripe payments we should display the currentPeriodEnd date from Subscription table.

The first day of the month logic for periodStart in usage_quotas table is incorrect now.
PeriodStart should be the same as currentPeriodStart from Subscriptions table.

CurrentPeriodEnd and CurrentPeriodStart should be synced with Stripe.

The FREE tier should only allow to use the specified limits and after that it should show information to upgrade plan, it should not renew each month. The currentPeriodEnd should be null for Free plan.
When user cancells subscription it goes to Free plan.

Update resets at and cancells at labels on settings page.

---

## 109. Handle Stripe webhook in staging environment on Render

**status: Done**

**time: 13.08.2026**

1. Register webhook in Stripe Dashboard.

Since staging is a real publicly reachable URL (not localhost), you don't need the CLI listener/forwarding trick at all — you can register it as a proper webhook endpoint:

- Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: https://opticv-app.onrender.com/api/stripe/webhook
- Select the events you handle: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed
- Stripe gives you a stable signing secret for that endpoint — set that as STRIPE_WEBHOOK_SECRET in Render's env vars for the staging service
- Do this in test mode (toggle top-left in Dashboard) so you're using test API keys/cards, not live ones — assuming staging uses your sktest... key already

2. Add all Stripe env variables on Render.

3. Test payments on Render.

---

## 110. Handle PAST_DUE status in backend, frontend and Stripe dashboard

**status: done**

**time: 13.08.2026-14.08.2026**

PAST_DUE means a renewal invoice payment failed, but Stripe hasn't given up yet.

Stripe automates chasing the card holder. It does not automatically restrict what the app lets the user do — that's the application's responsibility.

Gap: PAST_DUE is stored but not enforced
status is written to the Subscription table and passed through into UserProfile (users.service.ts) for display only. There is no guard or check anywhere gating CV generation/premium features based on status !== 'PAST_DUE'. Today, a user whose card fails keeps full BASIC/PRO access indefinitely until Stripe eventually cancels the subscription outright (which could be weeks later) — no earlier feature-gating happens on the app side.

To do:

- Enforce feature gating based on subscription status, not just tier. Today a user whose Stripe subscription is PAST_DUE keeps full BASIC/PRO access indefinitely, because every quota/tier check reads subscription.tier and ignores subscription.status. Introduce an "effective tier" concept — tier is only honored when status is ACTIVE or TRIALING; otherwise the user is treated as FREE for all gated features Add effective tier when checking quota limits before running optimization and returning user usage limits.
- display "payment failed, update your card" banner in the frontend when status === 'PAST_DUE', pointing the user at the billing portal session (createPortalSession, stripe.controller.ts), since Stripe's portal lets customers update their payment method directly. Banner is fixed to top, below menu and closable.

---

## 111. Connect landing page with app

**status: todo**

**time:**

- connect landing page with the app, make the login or optimize CV navigate to the app
- consider whether we should keep the home page in the app, should we move user after login directly to dashboard, and home menu item should move back to landing page?
- check if it would be possible to show login status in the landing page

---

## 112. UI/UX - Export footer redesing

**status: todo**

**time: **

- currently there is too much elements in the export footer, it fits on big screen, but on smaller resolutions it gets cramped,
- export settings and template settings should be displayed in a modal window, a popover or sth similar,
- on export footer display only a button for export which opens the popover and maybe button for preview

---

## Review AI-tailored version side-by-side with original

---

## Supabase session expires too quickly

**status: todo**

**time:**

- after longer inactivity Supabase session times out and user needs to refresh the page to be logged in back. How can we avoid it? Can w make the token expiry time longer? Can we identify the issue and show button to refresh page or sth similar?
  Currently user will not know what is going on.

---

### Test different jobs with different models and compare results

**status: todo**

**time:**

Use more intelligent models for the most demanding, more important sections:

- keywords gap & bullet rewrite - chatgpt-5.1

---

### UX/UI - CV optimization page - add scorecard / compact summary of section's results

**status: todo**

**time:**

- add scorecard or short summary with section's results, below the section header, when section card is in collapsed state, to instantly show user some preview of results.

---

### UX/UI - Update section with 3-step process on homepage

**status: todo**
**time:**

- udate section with 3-step process on homepage, update images, maybe change it to align more with help modal

---

### UX - In-app user guide - cv-optimization page guided tour

**status: todo**
**time:**

Implement a guided tour specific to the cv-optimization page, highlighting its key areas step by step.

---

### Bug avatar in top nav header doesn't react to user email change

**status: todo**
**time:**

---

### Bug - some selected bullet rewrites are not applied to A4 cv template preview and not applied to exported CV

**status: todo**
**time:**

- some selected bullet rewrites are not applied to A4 cv template preview and not applied to exported CV, investigate the issue, it happens when missing bullets target position which is not listed on the cv, it may be included in results in 'other' property

---

### UX - create animations or video on how to use the app

**status: todo**
**time:**

- create animations or video with the process of using the app - from upload to pasting job offer to running optimization process and then exporting cv
- put it on the homepage

---

### Add functionality to remove bullet point

---

### On the backend implement open router service so we can choose different models to run prompts.

---

### Implement logging to db/file

**status: todo**

- implement saving backend logs to database or saving logs to file with Winston?

---

### Check alternatives to to PrimeNg Text Editor

https://ngx-simple-text-editor.netlify.app/usage.html

---

### Privacy: Resumes contain PII. Encrypt at rest, allow users to delete data, and be explicit in your privacy policy that resumes aren't used to train models. This is a real concern for your users.
