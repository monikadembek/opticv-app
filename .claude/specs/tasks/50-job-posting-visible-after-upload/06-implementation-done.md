# Implementation Done — Task 50: Job posting visible after upload

## Summary

The task extends the `CvOptimization` page to display job posting data in the `processing` and `completed` states. In the live flow, a read-only prefilled `app-job-upload` form is shown. A "New Optimization" button was added to the heading row. `JobInfoBanner` was **not** extended with a `disabled` input — the banner is shown in stored-mode without the planned disabled state during `processing`.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Show job info in `processing` and `completed` states in the live flow | Implemented | `@if (!isStoredMode() && submittedJobApplication())` renders `<app-job-upload [isReadonly]="true">` |
| In the live flow: show read-only/disabled `app-job-upload` form pre-filled with submitted data | Implemented | |
| In stored-mode: keep showing `app-job-info-banner` as before | Implemented | |
| During `processing` in stored-mode: disable "View job description" toggle and "Open CV" button in the banner | Not implemented | `JobInfoBanner` `disabled` input was not added; parent does not pass a disabled flag |
| `isReadonly = input<boolean>(false)` on `JobUpload` | Implemented | `job-upload.ts` line 57 |
| `prefillData = input<JobApplication \| null>(null)` on `JobUpload` | Implemented | Uses `JobApplication` from `@opticv/datatypes` directly (plan deviation from spec's inline type) |
| `effect()` patches form values when `prefillData` changes | Implemented | |
| `form.disable()` when `isReadonly()` is true; `form.enable()` otherwise | Implemented | |
| Submit button hidden when `isReadonly()` is true | Implemented | |
| "Reload CVs" button hidden when `isReadonly()` is true | Implemented | |
| `submittedJobApplication = signal<JobApplication \| null>(null)` in `CvOptimization` | Implemented | Signal stores only `JobApplication`, not full `JobSubmittedData` |
| Set `submittedJobApplication` in `runOptimization()` after `jobApplicationId.set()` | Implemented | |
| Reset `submittedJobApplication` in `runOptimization()` reset block | Implemented | Reset placed immediately before the new `set(jobApplication)` call, not at top of reset block |
| "New Optimization" button inside `optim-heading-wrap`, right-aligned | Implemented | |
| Button visible in `processing` and `completed` states | Implemented | |
| Button label "New Optimization", icon `pi pi-plus` | Implemented | |
| Button severity `secondary` | Not implemented | Implemented with `severity="success"` |
| Button uses `routerLink="/cv-optimization"` | Implemented | |
| Button is not disabled during `processing` | Implemented | No `[disabled]` binding on button |
| `optim-heading-wrap` updated to flex row with `justify-between items-center` | Implemented | Applied in `cv-optimization.css` |
| `margin: 0 auto` removed from `.optim-heading-wrap` | Implemented | Not present in final CSS |
| Edge case: `submittedJobApplication()` null in live flow → no form rendered | Implemented | `@if (!isStoredMode() && submittedJobApplication())` handles this |
| No AXE accessibility violations introduced | Implemented | Native `form.disable()` sets `disabled` attribute on inputs |
| No backend changes | Implemented | Only frontend files modified |

---

## Files

### Modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts` | Added `isReadonly` and `prefillData` inputs; added `effect()` for form patching and disabling |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.html` | Added `@if (!isReadonly())` guards on submit button section and "Reload CVs" button |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added `submittedJobApplication` signal; set and reset it in `runOptimization()` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Added "New Optimization" button; added `@if (!isStoredMode() && submittedJobApplication())` block with `<app-job-upload [isReadonly]="true">` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css` | Updated `.optim-heading-wrap` to `display: flex; align-items: center; justify-content: space-between` |

### Created

None.

### Not modified (plan said to modify)

| File | Reason |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.ts` | Steps 3 & 4 not implemented |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.html` | Steps 3 & 4 not implemented |

---

## Components

| Component | Status |
|---|---|
| `JobUpload` (extended with `isReadonly`, `prefillData`) | Exist |
| `JobInfoBanner` (extended with `disabled`) | Missing — not modified |

---

## Stores

None planned. None implemented.

---

## Deviations from Plan

1. **`JobInfoBanner` not extended** — Plan Steps 3 & 4 (adding `disabled` input to `JobInfoBanner` TS and HTML, passing `[disabled]="pageState() === 'processing'"` from parent) were not implemented.

2. **Button severity** — Plan resolves to `secondary`; implemented as `success`.

3. **`submittedJobApplication.set(null)` placement** — Plan specifies placing the reset at the top of the reset block in `runOptimization()`. It is placed at line 510, immediately before `set(jobApplication)` on line 512 (after all other resets).

4. **Live-flow form wrapper** — Plan specifies `<div class="job-banner">` wrapper. Implemented using `<app-section-card sectionId="JOB_POSTING" icon="pi-folder" title="Job Posting">`.

5. **`prefillData` type** — Spec defines an inline object type; plan and implementation use `JobApplication` from `@opticv/datatypes` directly.

---

## Additional Implementation

- `cv-optimization.spec.ts` appears in the git diff (listed in changed files), but no new test cases for the added functionality were added. The file change is minor (import-related or pre-existing test adjustments).
