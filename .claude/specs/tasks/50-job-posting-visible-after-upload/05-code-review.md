# Code Review — Task 50: Job posting visible after upload

## Summary

- **Overall result: PASS WITH ISSUES**
- The core feature is implemented correctly: `submittedJobApplication` signal is stored, the read-only `app-job-upload` is shown in the live flow, and the "New Optimization" button is added. However, two plan steps were **skipped** (Steps 3 & 4 — the `disabled` input on `JobInfoBanner`), one spec requirement is unmet (banner disabled during processing), and the button severity deviates from the plan decision. No type errors are expected, but the missing banner-disabled behavior is a visible regression path.

---

## Conventions Violations

### Critical (must fix before merge)

None that break Angular conventions outright.

### Non-Critical (should fix)

1. **`job-upload.ts` line 33 — blank line before export**
   Extra blank line between the closing brace of `JobSubmittedData` interface and the `@Component` decorator is cosmetically inconsistent with the rest of the codebase but not a rule violation.

2. **`cv-optimization.ts` line 510–512 — redundant `set(null)` before immediately setting a real value**
   ```ts
   this.submittedJobApplication.set(null);   // line 510
   this.jobApplicationId.set(jobApplication.id);
   this.submittedJobApplication.set(jobApplication); // line 512
   ```
   The `set(null)` on line 510 is immediately overwritten two lines later. It has no observable effect (Angular signals are synchronous, no template re-render happens between these two lines in the same call stack). The implementation plan says to add `set(null)` to the reset block at the top of `runOptimization()` — the intent was to reset the signal during repeated submissions, not to clear it mid-call. The current placement is harmless but misleading. The plan's intent (reset at top of method alongside other resets like `this.results.set(new Map())`) was not followed.

3. **`job-upload.html` — inconsistent whitespace in `@if` blocks**
   Some `@if` blocks have a space before the `(` (`@if (`) and others do not (`@if(`). Minor style inconsistency; not a rule violation.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Show `app-job-upload` in read-only/pre-filled mode during live flow in `processing` and `completed` states | **Covered** | `@if (!isStoredMode() && submittedJobApplication())` renders `<app-job-upload [isReadonly]="true" [prefillData]="submittedJobApplication()">` |
| `isReadonly = input<boolean>(false)` on `JobUpload` | **Covered** | `job-upload.ts` line 57 |
| `prefillData = input<JobApplication \| null>(null)` on `JobUpload` | **Covered** | `job-upload.ts` line 58 |
| `effect()` patches form values when `prefillData` changes | **Covered** | `job-upload.ts` lines 100–117 |
| `form.disable()` when `isReadonly()` is true | **Covered** | `job-upload.ts` line 113 |
| Submit button hidden when `isReadonly()` | **Covered** | `job-upload.html` line 151 |
| "Reload CVs" button hidden when `isReadonly()` | **Covered** | `job-upload.html` line 30–35 |
| `submittedJobApplication = signal<JobApplication \| null>(null)` in `CvOptimization` | **Covered** | `cv-optimization.ts` line 186 |
| Set `submittedJobApplication` in `runOptimization()` after `jobApplicationId.set()` | **Covered** | `cv-optimization.ts` line 512 |
| Reset `submittedJobApplication` in `runOptimization()` | **Covered** (with deviation) | Reset is placed at line 510 mid-method, not at the top of the reset block (see Plan Deviations) |
| `app-job-info-banner` shown in stored-mode (`isStoredMode() && jobApplication()`) | **Covered** | `cv-optimization.html` lines 79–84 |
| `disabled = input<boolean>(false)` on `JobInfoBanner` | **Missing** | Step 3 from the plan was not implemented. The `JobInfoBanner` component has no `disabled` input. |
| During `processing`, disable "View job description" toggle and "Open CV" button in banner | **Missing** | Step 4 from the plan was not implemented. The banner template has no disabled bindings. |
| Pass `[disabled]="pageState() === 'processing'"` to `app-job-info-banner` | **Missing** | Not present in `cv-optimization.html` line 80–84 — only `[jobApplication]` and `(openCv)` are passed. |
| "New Optimization" button inside `optim-heading-wrap`, aligned to the right | **Covered** | `cv-optimization.html` lines 41–49, `.optim-heading-wrap` has `justify-content: space-between` |
| Button visible in `processing` and `completed` states | **Covered** | Wrapped in `@if (pageState() === 'processing' \|\| pageState() === 'completed')` |
| Button uses `routerLink="/cv-optimization"` | **Covered** | `cv-optimization.html` line 46 |
| Button severity `secondary` | **Partial** | Spec says "secondary or default", plan resolves to `secondary`. Implemented as `success` (line 44 in `cv-optimization.html`). |
| Button is not disabled during `processing` | **Covered** | No `[disabled]` binding on the button |
| Edge case: `submittedJobApplication()` null → no form rendered | **Covered** | `@if (!isStoredMode() && submittedJobApplication())` handles this |
| Live flow form wrapped in `app-section-card` (not plain `<div class="job-banner">`) | **Deviation** | The plan said use `<div class="job-banner">`, the implementation uses `<app-section-card sectionId="JOB_POSTING">` — this is an improvement but a deviation from the plan |
| `aria-disabled` or native `disabled` on form inputs when readonly | **Covered** | `form.disable()` adds native `disabled` to all form controls |
| No API or backend changes | **Covered** | Only frontend files modified |

---

## Plan Deviations

1. **Steps 3 & 4 skipped entirely** — `JobInfoBanner` was not modified. The `disabled` input was not added to `job-info-banner.ts`, and the template was not updated to disable buttons. The parent (`cv-optimization.html`) does not pass `[disabled]` to the banner. This is a spec requirement gap (processing state should make the banner non-interactive).

2. **`submittedJobApplication.set(null)` placement** — The plan (Step 5.2) specifies adding the `set(null)` call at the *top* of `runOptimization()` alongside the other resets (`this.results.set(new Map())`, etc.). The implementation places `set(null)` at line 510, after all other resets and just before the `set(jobApplication)` on line 512. This means the null reset is immediately overwritten and serves no practical purpose at that location. Move it to the top of the reset block (after line 496).

3. **Button severity** — Plan resolves to `secondary`; implementation uses `severity="success"` (`cv-optimization.html` line 44). This is a visual inconsistency with the plan decision.

4. **Live-flow form wrapped in `app-section-card`** — The plan specifies a plain `<div class="job-banner">` wrapper. The implementation uses `<app-section-card sectionId="JOB_POSTING" icon="pi-folder" title="Job Posting">`. This is functionally better (scrollspy integration, consistent card UI) but is an undocumented deviation.

---

## Null Safety Issues

None. The `submittedJobApplication()` signal is guarded by `@if (!isStoredMode() && submittedJobApplication())` before being passed to `[prefillData]`. The `form.patchValue()` call is guarded by `if (data)`. The `jobApplication()` bang assertion (`jobApplication()!`) in the banner binding is safe because the condition wrapping it already checks `jobApplication()` is truthy.

---

## Code Smells

1. **`console.log` calls in production code** — `job-upload.ts` lines 161 and 177 still have `console.log('submit job description result: ...')` and `console.log('extraced data from cv: ...')`. These appear to be pre-existing, but they should be removed. (Pre-existing, not introduced by this task.)

2. **Typo in toast message** — `job-upload.ts` line 174: `'CV and job description were successfully submited'` — "submited" should be "submitted". (Pre-existing.)

---

## Recommendation

**Fix critical issues before merge.**

Two items require a fix:

1. **Implement Steps 3 & 4** (JobInfoBanner `disabled` input and template updates, parent passing `[disabled]="pageState() === 'processing'"`) — this is a spec requirement and currently unimplemented.
2. **Change button `severity` from `"success"` to `"secondary"`** — aligns with the plan decision and avoids a green "New Optimization" button that implies a success action.

The `submittedJobApplication.set(null)` placement is harmless but should ideally be moved to the top reset block for clarity.
