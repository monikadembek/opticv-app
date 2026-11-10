# PostHog Setup for the Beta

What's needed in PostHog to measure the OptiCV beta. See `beta-testing-and-launch-plan.md`
(section 5) and `beta-survey-and-call-script.md`.

Summary: the base is in place. What's missing is mostly **knowing who each user is**
(`identify`) plus some setup in the PostHog dashboard.

---

## Current state

- **posthog-js** on the EU host (`https://eu.i.posthog.com`), initialised in
  `apps/opticv-web/src/app/core/services/posthog.service.ts`.
- **Consent-gated:** starts only after cookies are accepted (`CookieConsentStore`). On withdrawal it
  runs `reset()` + `opt_out_capturing()` and clears leftover storage and cookies.
- **Pageviews:** captured manually on every `NavigationEnd`.
- **Custom events** (about 25), including:

| Area           | Events                                                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing / auth | `optimize_my_cv_button_clicked`, `upload_button_clicked`, `signin_button_clicked`, `supabase_signinwithotp_executed`, `supabase_verifyotp_executed`, `signout_button_clicked` |
| Onboarding     | `welcome_modal_shown`, `welcome_modal_dismissed`, `help_icon_clicked`                                                                                                         |
| Core flow      | `cv_file_uploaded`, `start_optimization_process_button_clicked`, `cv_and_job_description_submitted_and_cv_parsed`, `optimization_started`, `optimization_job_complete_event`  |
| Exports        | `optimized_cv_exported`, `cover_letter_exported`, `interview_prep_exported`, `linkedin_content_exported`, `original_cv_downloaded`                                            |
| Account        | `email_change_requested`, `account_deleted`, `cv_deleted`, `optimization_deleted`                                                                                             |

---

## Code changes needed

### 1. Identify users (highest priority)

Nothing in the code calls `posthog.identify()`, so every user is anonymous. Until it's added:

- beta testers can't be tagged or filtered
- PostHog surveys can't target them
- the same person on two devices counts as two users
- survey answers can't be matched to what that person did in the app

**Change:**

- After sign-in (`verifyOtp` success) and when an existing Supabase session is restored on load,
  call `posthog.identify(user.id)` with the **Supabase user UUID**.
- On sign-out, call `posthog.reset()`. Today `reset()` only runs when cookie consent is withdrawn.
- Only call these when PostHog is initialised and consent is `accepted`. The natural place is
  `PosthogService`, reacting to `SupabaseService.user()` (e.g. an `effect`), so the consent logic
  stays in one place.
- Use the **user ID, not the email**. The privacy policy doesn't say that PostHog receives emails.
  Look up which email belongs to which ID in Supabase when needed.

### 2. Person properties

- `plan`: `FREE` | `BASIC` | `PRO`, set with `posthog.setPersonProperties({ plan })` whenever the
  subscription is loaded. This lets you compare free users with paying ones.
- `beta_tester: true`. Two options:
  - **Manual (enough for 20–40 testers):** set it in the PostHog UI on each tester's person profile.
  - **Automatic:** set it from code if the subscription has the beta coupon. This needs the coupon
    or promotion code exposed by the backend.

### 3. Billing events

| Event                    | Where                                                                         | Properties                                 |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------ |
| `upgrade_clicked`        | `settings.ts` → `onUpgrade()`                                                 | `plan` (`BASIC`/`PRO`), `page: 'settings'` |
| `subscription_activated` | `settings.ts` when loaded with `?billing=success` (already read at ~line 176) | `plan`                                     |
| `checkout_canceled`      | `settings.ts` when loaded with `?billing=canceled`                            | —                                          |
| `manage_billing_clicked` | `settings.ts` → "Manage billing" button                                       | —                                          |

These show whether the promo-code flow works and, later on, how many free users upgrade.

### 4. Separate dev and production data

`environment.ts`, `environment.staging.ts` and `environment.prod.ts` all use the **same PostHog
project key**, so localhost and staging testing ends up mixed into production data. Pick one:

- **Recommended:** create a separate PostHog project for dev/staging and put its key in
  `environment.ts` and `environment.staging.ts`.
- **Alternative:** add `environmentName: 'development' | 'staging' | 'production'` to the
  environment files, call `posthog.register({ environment: environment.environmentName })` after
  `init`, and filter `environment = production` in every insight.

### Order

1. Identify on sign-in and reset on sign-out (about an hour, unlocks everything else)
2. Separate dev data from production
3. The `plan` property and the billing events
4. Dashboard setup (below), done once the first testers are using the app

---

## Setup in the PostHog dashboard (no code)

| What                      | Setup                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cohort "Beta testers"** | Person property `beta_tester = true`                                                                                                                                  |
| **Core funnel**           | `cv_file_uploaded` → `optimization_started` → `optimization_job_complete_event` → `optimized_cv_exported`, filtered to the beta cohort. Shows where testers drop off. |
| **Activation funnel**     | `supabase_verifyotp_executed` → `upgrade_clicked` → `subscription_activated` → `cv_file_uploaded`. Shows whether testers get through promo activation to first use.   |
| **Retention**             | Start: `optimization_started`; return: `optimization_started`; weekly; beta cohort. Coming back in week 2–3 is the clearest sign the app is useful.                   |
| **Usage by feature**      | Trend of `optimized_cv_exported`, `cover_letter_exported`, `interview_prep_exported` and `linkedin_content_exported` (unique users). Compare with survey Q6/Q7.       |
| **Beta dashboard**        | Pin all of the above on one dashboard. Check it 2–3 times a week.                                                                                                     |

### In-app survey (optional)

The week-2 survey is planned for Tally (`beta-survey-and-call-script.md`). For an extra in-app
question, PostHog Surveys can show e.g. "How useful was this optimization?" (1–5) to the beta cohort
after their 2nd `optimization_job_complete_event`. This **requires step 1 (identify)**. Surveys are
part of posthog-js and are on by default unless disabled in `init`.

---

## Privacy: session replays

The privacy policy says session replays are recorded by **Sentry** (`main.ts`:
`replaysSessionSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`, all text masked). It **doesn't
mention PostHog replays**.

| Option                                            | Pros                                                                                                  | Cons                                                                                                                                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Sentry replays (recommended for the beta)** | Nothing new to disclose. Already running.                                                             | Text is masked, so mainly useful for bugs and seeing where people get stuck. Linked to errors, not to the PostHog funnel. You could raise `replaysSessionSampleRate` during the beta.                 |
| **Turn on PostHog replays**                       | Each replay is linked to the user's events and funnel steps, which is better for understanding usage. | Privacy policy update needed. Mask all text (`session_recording` mask settings, or a block class on CV content areas) so CV content isn't recorded. Check a few real recordings before relying on it. |

Also: Sentry's **feedback widget** (`feedbackIntegration` in `main.ts`) is already in the app.
Mention it in the acceptance email ("found a bug? use the feedback button") so testers can
report problems from inside the app.

---

## Watch out for

- **Cookie consent:** testers who decline cookies won't appear in PostHog at all. Add a line to the
  acceptance email asking testers to accept analytics cookies so you can see how they use the app.
  Make it a request, not a condition. The survey and calls cover anyone who declines.
- **Small numbers:** with 20–40 testers, funnels and retention show directions, not statistics.
  Look at individual person timelines in PostHog too. With identify in place, you can see one
  tester's full journey.
- **Event names are fixed once the beta starts.** Renaming an event mid-beta splits the data, so
  finalise the names (including the new billing events) before sending the first promo codes.

## Checklist

- [ ] `identify(user.id)` on sign-in and session restore, `reset()` on sign-out
- [ ] Dev/staging data separated from production
- [ ] `plan` person property
- [ ] Billing events (`upgrade_clicked`, `subscription_activated`, `checkout_canceled`, `manage_billing_clicked`)
- [ ] Decision: Sentry replays only, or PostHog replays + privacy policy update
- [ ] Acceptance email: line about accepting analytics cookies + feedback button mention
- [ ] `beta_tester` set on each tester (manually or automatically)
- [ ] Beta cohort, funnels, retention and feature usage on one dashboard
- [ ] (Optional) in-app PostHog survey
