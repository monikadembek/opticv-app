# Implementation Plan

Task: 50 — Job posting visible after upload

## Resolved Ambiguities (from spec review)

- **Button severity**: Use `secondary` — consistent with other non-primary actions in the page.
- **Banner disabled state mechanism**: Add a `disabled = input<boolean>(false)` to `JobInfoBanner`. The parent passes `[disabled]="pageState() === 'processing'"`. This keeps the banner self-contained and avoids CSS hacks in the parent.
- **`prefillData` type**: Use `JobApplication` from `@opticv/datatypes` directly — no redundant inline type.
- **`readonly` input name**: Rename to `isReadonly` to avoid shadowing the HTML `readonly` attribute and to satisfy Angular lint rules.
- **`submittedJobData` signal type**: Store only `JobApplication` (not full `JobSubmittedData`) — `extractedData` is not needed here, `cvStructuredData` signal already holds it.
- **`form.disable()` for read-only mode**: Use `form.disable()` in an `effect()` when `isReadonly()` becomes `true`. This disables all controls natively and triggers PrimeNG disabled styles automatically.
- **"New Optimization" navigation**: `/cv-optimization` and `/cv-optimization/:jobApplicationId` are two distinct route definitions — navigating to `/cv-optimization` always instantiates a fresh component. No `onSameUrlNavigation` configuration needed.

---

## Files to Modify

1. `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts`
2. `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.html`
3. `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.ts`
4. `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.html`
5. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
6. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`
7. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css`

---

## Step 1 — Extend `JobUpload` component with `isReadonly` and `prefillData` inputs

**File:** `job-upload.ts`

### 1.1 Add imports
- Import `JobApplication` from `@opticv/datatypes`.
- Import `effect` from `@angular/core` (already imported via the component).

### 1.2 Add two new `input()` signals
```
isReadonly = input<boolean>(false)
prefillData = input<JobApplication | null>(null)
```

### 1.3 Add an `effect()` in the constructor to patch the form when `prefillData` changes
- When `prefillData()` is non-null, call `this.form.patchValue({ cvDocumentId, companyName, jobTitle, jobDescription, notes: notes ?? '' })`.
- When `isReadonly()` is `true`, call `this.form.disable()`.
- When `isReadonly()` is `false` (component switches back to editable — won't happen in practice but guard it), call `this.form.enable()`.
- Both conditions should live in one `effect()` so they react together.

### 1.4 Computed `isSubmitDisabled`
- No change needed — `form.disable()` makes `form.invalid` irrelevant; the button will also be hidden in the template.

---

## Step 2 — Update `JobUpload` template for read-only mode

**File:** `job-upload.html`

### 2.1 Hide the submit button and error when `isReadonly()` is true
- Wrap the `<div class="flex flex-col gap-3">` that contains the submit button in `@if (!isReadonly())`.

### 2.2 Hide the "Reload CVs" button when `isReadonly()` is true
- Wrap the `<p-button type="button" label="Reload" ...>` inside the `@if (cvList.error())` block with an additional `@if (!isReadonly())` condition, or use `[style.display]`. Prefer the `@if` approach for clarity.
- The `<p class="text-sm text-red-600">` error message inside `cvList.error()` block can remain visible — the user should know what CV is selected even in read-only mode.

### 2.3 No changes to validation error messages
- They will not appear in read-only mode because `form.disable()` prevents touched state from being triggered, and the fields are already valid (pre-filled).

---

## Step 3 — Extend `JobInfoBanner` with `disabled` input

**File:** `job-info-banner.ts`

### 3.1 Add new input
```
disabled = input<boolean>(false)
```
No other logic changes in the TS file.

---

## Step 4 — Update `JobInfoBanner` template for disabled state

**File:** `job-info-banner.html`

### 4.1 Disable the "Open CV" button when `disabled()` is true
- On the `<button type="button" (click)="openCv.emit()" ...>` element, add `[disabled]="disabled()"` and `[attr.aria-disabled]="disabled()"`.
- Add `[class.opacity-50]="disabled()"` and `[class.cursor-not-allowed]="disabled()"` for visual feedback.

### 4.2 Disable the "View/Hide job description" toggle button when `disabled()` is true
- On the `<button type="button" (click)="showDescription.set(!showDescription())" ...>` element, add `[disabled]="disabled()"` and `[attr.aria-disabled]="disabled()"`.
- Add `[class.opacity-50]="disabled()"` and `[class.cursor-not-allowed]="disabled()"`.

---

## Step 5 — Add `submittedJobApplication` signal to `CvOptimization`

**File:** `cv-optimization.ts`

### 5.1 Add new signal
```
readonly submittedJobApplication = signal<JobApplication | null>(null)
```
Import `JobApplication` from `@opticv/datatypes` (already imported).

### 5.2 Set the signal in `runOptimization()`
- After `this.jobApplicationId.set(jobApplication.id)`, add:
  `this.submittedJobApplication.set(jobApplication)`
- In `runOptimization()` reset block (top of the method), add:
  `this.submittedJobApplication.set(null)` alongside the other resets.

### 5.3 Add `RouterLink` import if not already present
- `RouterLink` is already imported in the component — confirmed from the existing template.

---

## Step 6 — Update `CvOptimization` template

**File:** `cv-optimization.html`

### 6.1 Add "New Optimization" button to the heading row
- The existing heading block is:
  ```html
  @if (pageState() === 'processing' || pageState() === 'completed') {
  <div class="optim-heading-wrap">
    <h2 class="optim-heading">CV Optimization</h2>
  </div>
  }
  ```
- Add `class="flex items-center justify-between"` to the `optim-heading-wrap` div (via inline Tailwind on the element, or update the CSS class — prefer updating the CSS class to keep template clean, see Step 7).
- Inside the div, after the `<h2>`, add:
  ```html
  <p-button
    label="New Optimization"
    icon="pi pi-plus"
    severity="secondary"
    size="small"
    routerLink="/cv-optimization"
    ariaLabel="Start a new optimization"
  />
  ```

### 6.2 Add job info section for live flow (non-stored-mode)
- In the `@else` branch (the `pageState() !== 'initial'` branch), before `app-job-info-banner`, add:
  ```html
  @if (!isStoredMode() && submittedJobApplication()) {
  <div class="job-banner">
    <app-job-upload
      [isReadonly]="true"
      [prefillData]="submittedJobApplication()"
    />
  </div>
  }
  ```
- The existing `@if (jobApplication())` block for `app-job-info-banner` stays unchanged and only fires in stored-mode (since `jobApplication()` is only set in `loadStoredOptimization()`).

### 6.3 Pass `disabled` to `app-job-info-banner`
- Update the existing `app-job-info-banner` usage to:
  ```html
  <app-job-info-banner
    [jobApplication]="jobApplication()!"
    [disabled]="pageState() === 'processing'"
    (openCv)="openOriginalCv()"
  />
  ```

---

## Step 7 — Update `cv-optimization.css`

**File:** `cv-optimization.css`

### 7.1 Update `.optim-heading-wrap`
- Add `display: flex`, `align-items: center`, `justify-content: space-between` to the existing `.optim-heading-wrap` rule.
- Also remove the `margin: 0 auto` that is currently there (the heading-wrap is inside `.optim-content` which already constrains width).
- Keep `margin-bottom` on `.optim-heading` (currently `margin: 0 0 32px`).

---

## Step 8 — Verify no spec file changes needed

- `job-upload.spec.ts` — no existing tests cover `isReadonly` or `prefillData`; no test breaks are expected from adding inputs with defaults. No new tests are required by this task (spec does not mandate tests for the new inputs).
- `job-info-banner.spec.ts` — same reasoning; `disabled` input defaults to `false`, existing tests unaffected.

---

## Implementation Order

1. Step 1 & 2 — `JobUpload` TS + HTML (self-contained, no dependencies)
2. Step 3 & 4 — `JobInfoBanner` TS + HTML (self-contained)
3. Step 5 — `CvOptimization` TS (signal + reset)
4. Step 6 — `CvOptimization` HTML (uses updated child components)
5. Step 7 — `CvOptimization` CSS (layout fix)

After all steps: run `npm exec nx typecheck opticv-web` and `npm exec nx build opticv-web -- --configuration=development`.
