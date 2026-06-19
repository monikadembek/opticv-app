# Task Specification

## Source

Azure DevOps Task: 50 — Job posting visible after upload

## Goal

Display the job posting data on the cv-optimization page during and after the optimization process, and add a "New Optimization" button that navigates to the initial state.

## Context

`CvOptimization` page (`apps/opticv-web/src/app/features/cv-optimization/`) has three page states: `initial`, `processing`, `completed`. Currently in `processing` and `completed` states the job info banner (`app-job-info-banner`) is only shown when `jobApplication()` is set — which happens in stored-mode (loading from route param) but NOT in the live flow (user submits from the form). In the live flow the signal `jobApplication` stays `null` after submission, so nothing appears where the form was.

## Scope

### In scope

- Show job info in `processing` and `completed` states regardless of whether the session is stored-mode or live-flow.
- In the live flow: show a read-only/disabled `app-job-upload` form pre-filled with the submitted data.
- In the stored-mode: keep showing `app-job-info-banner` as today.
- During `processing` state: the shown job info (form or banner) must be visually blocked (disabled, no interactive actions possible).
- Add a "New Optimization" button inside the `optim-heading-wrap` row, aligned to the right.
- Clicking "New Optimization" navigates to `/cv-optimization` (fresh route navigation resets all state).

### Out of scope

- Editing job posting data after submission.
- Making `job-upload` form editable in the results view.
- Any backend changes.

## Behavior

### Job info display logic

1. `pageState() === 'initial'` — no change, `app-job-upload` form is shown as today.
2. `pageState() === 'processing'` or `'completed'`:
   - If `isStoredMode()` is `true` and `jobApplication()` is set → show `app-job-info-banner` (existing behavior). During `processing`, disable the "View job description" toggle and the "Open CV" button inside the banner.
   - If `isStoredMode()` is `false` (live flow) → show `app-job-upload` form in **disabled/read-only** mode, pre-filled with the data from the last submission. The form fields must be non-interactive (inputs disabled, submit button hidden or disabled).

### Storing submitted form data in the live flow

- After successful submission in `runOptimization()`, the parent already receives a `JobSubmittedData` object with `jobApplication` (type `JobApplication`) and `extractedData`.
- Add a new signal `submittedJobData = signal<JobSubmittedData | null>(null)` to `CvOptimization`.
- In `runOptimization()`, after setting `jobApplicationId`, also call `this.submittedJobData.set({ jobApplication, extractedData })`.
- When the user clicks "New Optimization" and navigates away, this signal naturally resets (component is destroyed).

### Making job-upload show in read-only/prefilled mode

- Add an `input` to `JobUpload` component: `readonly = input<boolean>(false)`.
- Add an `input` for prefill data: `prefillData = input<{ cvDocumentId: string; companyName: string; jobTitle: string; jobDescription: string; notes?: string | null } | null>(null)`.
- When `prefillData()` changes (use `effect()`), patch the form values.
- When `readonly()` is `true`: set all form controls to disabled state, hide the submit button, hide the "Reload CVs" button.
- In the parent template, pass `[readonly]="true"` and `[prefillData]="submittedJobData()?.jobApplication"` when in `processing`/`completed` and `!isStoredMode()`.

### "New Optimization" button

- Location: inside the existing `<div class="optim-heading-wrap">` in `cv-optimization.html`, to the right of `<h2 class="optim-heading">`.
- Make the heading row a flex row with `justify-between items-center`.
- Button: PrimeNG `p-button`, label `"New Optimization"`, icon `pi pi-plus`, severity `secondary` (or default — match existing button styles), `routerLink="/cv-optimization"`.
- Button is visible in both `processing` and `completed` states.
- During `processing` state, the button is **not** disabled — the user can navigate away at any time.

## Edge Cases

- If `submittedJobData()` is `null` in live flow for any reason (e.g. state was cleared), skip rendering the form section gracefully (render nothing, same as today).
- The `JobUpload` component's `cvList` resource still loads in read-only mode (no harm); the CV dropdown just shows the previously selected CV name (from patch).
- `job-upload` in read-only mode should still be accessible: disabled inputs need `aria-disabled="true"` or native `disabled` attribute (native `disabled` on `<input>` satisfies this).

## Data / API

No API or DB changes. All data comes from the `JobSubmittedData` already emitted by `app-job-upload` on submission.

Relevant types (from `@opticv/datatypes`):
```ts
type JobApplication = {
  id: string; userId: string; cvDocumentId: string;
  jobTitle: string | null; companyName: string | null;
  jobDescription: string; atsScore: number | null;
  notes: string | null; createdAt: Date | string; updatedAt: Date | string;
};
type JobApplicationWithCv = JobApplication & { cvDocument: { id: string; fileName: string } };
```

`JobInfoBanner` requires `JobApplicationWithCv`; it is only rendered in stored-mode where the full object is loaded.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`).
- Type check passes (`npm exec nx typecheck opticv-web`).
- Live flow: submitting a job on `/cv-optimization` transitions to processing state; the job-upload form is visible, pre-filled, and fully disabled (no inputs editable, no submit button).
- Live flow: after optimization completes the form remains visible and disabled.
- Stored-mode: loading `/cv-optimization/:id` still shows `app-job-info-banner` as before.
- During `processing` state, the job info area (banner or form) is visually non-interactive.
- "New Optimization" button is visible in `processing` and `completed` states, aligned to the right of the "CV Optimization" heading.
- Clicking "New Optimization" navigates to `/cv-optimization` and shows the fresh initial state (empty form).
- No regressions in existing sections (ATS score, keyword gap, etc.).
- No AXE accessibility violations introduced.
