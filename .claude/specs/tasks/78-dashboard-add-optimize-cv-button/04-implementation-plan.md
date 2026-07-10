# Implementation Plan — Task 78: Add "Optimize CV" button in the dashboard

## Source

- Specification: `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/02-spec.md`
- Spec review: `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/03-spec-review.md` (PASS WITH ISSUES)

This plan resolves the review's non-critical issues by making the following explicit before implementation begins:

- `Router` must be newly imported and injected in `cv-file-list.ts` (it does not currently use `Router` anywhere).
- The new `preselectedCvId` effect in `job-upload.ts` must be a separate `effect()` call from the existing `prefillData` effect, not merged into it.
- The `@case ('COMPLETED')` branch in `cv-file-list-item.html` is removed entirely from the `@switch` (not left as an empty case), since removing the block entirely is the more minimal/clean change and produces identical rendered output (nothing).
- Exact test files to update: `cv-file-list-item.spec.ts`, `cv-file-list.spec.ts`, `job-upload.spec.ts`. No new spec file needed for `cv-optimization.ts` per the "Out of scope" fencing — the query-param read is a single line, and its effect is observed through `JobUpload`'s existing input, so it's covered by `job-upload.spec.ts` (new `preselectedCvId` input tests) rather than needing standalone `CvOptimization` tests. `cv-optimization.spec.ts` does not currently exist in the repo, and this task does not warrant creating one for a single line of param-reading glue code.

---

## Step 1 — `CvFileListItem`: add "Optimize CV" button and remove "Parsed" text

**File:** `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.ts`

- Add a new output: `optimize = output<CvDocumentListItem>();` (placed before `download`, mirroring the visual order buttons will appear in).
- Add a new method `onOptimize(): void` that calls `this.optimize.emit(this.file());`, placed before `onDownload()`.

**File:** `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.html`

- In the status `<span>` block (lines 11–25): remove the entire `@case ('COMPLETED') { ... }` branch (the check-circle icon and "Parsed" text). Keep `@case ('PENDING')` and `@case ('FAILED')` unchanged. The `@switch (file().parseStatus)` wrapper stays, now with only two `@case` branches.
- In the button row (lines 27–44): add a new `<p-button>` before the existing download button:
  - `icon="pi pi-bolt"` (or another icon distinct from download/delete/parsing icons — confirm no clash with existing PrimeIcons usage in this component; `pi-bolt` is not used elsewhere in this file)
  - `severity="secondary"`
  - `size="small"`
  - `[text]="true"`
  - `title="Optimize CV"`
  - `(onClick)="onOptimize()"`
  - No `[disabled]` binding — button is always enabled regardless of `parseStatus`, per spec.

---

## Step 2 — `CvFileList`: handle `optimize` output, navigate with query param

**File:** `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.ts`

- Import `Router` from `@angular/router` (new import; currently only `RouterLink` is imported).
- Inject it: `private readonly router = inject(Router);`
- Add a new method `optimizeCv(file: CvDocumentListItem): void` that calls:
  `this.router.navigate(['/cv-optimization'], { queryParams: { cvId: file.id } });`
- Placement: add this method before `downloadCv()`, matching the button order (Optimize, Download, Delete).
- No PostHog tracking call is specified in the spec for this action — do not add one (out of scope; not requested).

**File:** `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html`

- On `<app-cv-file-list-item>` (lines 28–32), add a new output binding before `(download)`:
  `(optimize)="optimizeCv($event)"`

---

## Step 3 — `CvOptimization`: read `cvId` query param, pass to `JobUpload`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

- Add a new signal: `readonly preselectedCvId = signal<string | null>(null);`
- In `ngOnInit()`, alongside the existing `jobApplicationId` snapshot read (around line 436–443), read the `cvId` query param from the snapshot and set the signal:
  ```
  const cvId = this.route.snapshot.queryParamMap.get('cvId');
  if (cvId) {
    this.preselectedCvId.set(cvId);
  }
  ```
  Place this read unconditionally (not nested inside the `if (jobApplicationId)` block), since `cvId` is only relevant/read when in `initial` state but reading it unconditionally is harmless and matches the spec's edge case ("not applicable/read" in stored mode simply means `JobUpload` won't be rendered there, not that the signal must stay unset).

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

- On the initial-state `<app-job-upload>` (line 76), add a new input binding:
  `[preselectedCvId]="preselectedCvId()"`
  Result: `<app-job-upload [preselectedCvId]="preselectedCvId()" (jobSubmitted)="runOptimization($event)" />`
- Do not touch the other `<app-job-upload>` usage (line 89–92, read-only/`prefillData` mode) — out of scope per spec.

---

## Step 4 — `JobUpload`: add `preselectedCvId` input, pre-fill CV select reactively

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts`

- Add a new input: `preselectedCvId = input<string | null>(null);` (placed after `prefillData` input, before `jobSubmitted` output).
- Add a **new, separate** `effect()` in the constructor (do not merge into the existing `prefillData` effect), placed after the existing effect block:
  ```
  effect(() => {
    const cvId = this.preselectedCvId();
    if (!cvId) return;
    const exists = this.cvStore.cvList().some((cv) => cv.id === cvId);
    if (exists) {
      this.form.controls.cvDocumentId.setValue(cvId);
    }
  });
  ```
- Behavior notes to satisfy spec edge cases:
  - Runs reactively on every change to `preselectedCvId()` or `cvStore.cvList()` (signal reads inside `effect()` register both as dependencies), so it re-fires once the store list loads asynchronously after the id is already known — satisfies "cvList() still empty/loading at mount" edge case.
  - If `cvId` doesn't match any entry in `cvList()`, `setValue` is simply never called — the control keeps its default `''` value, so the placeholder "Select a CV" still shows — satisfies the "CV deleted" edge case without extra branching.
  - Independent of `isReadonly()`/`prefillData` enable-disable logic — this effect never touches `form.enable()`/`form.disable()`, so it cannot interfere with the read-only stored-optimization case. When `prefillData` is set (read-only mode), `preselectedCvId` is simply never passed in from `cv-optimization.html`, so this effect is a no-op there regardless.

No changes needed to `job-upload.html` — the existing `<p-select formControlName="cvDocumentId">` binding already reflects the form control's value.

---

## Step 5 — Update unit tests

**File:** `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.spec.ts`

- Update the two button-order tests (`'should emit download when the download button is clicked'` and `'...delete...'`, lines 69–89) — the queried `buttons` array now has 3 entries instead of 2; update indices: Optimize = `buttons[0]`, Download = `buttons[1]`, Delete = `buttons[2]`.
- Add a new test: `'should emit optimize output when onOptimize is called'`, following the existing `onDownload`/`onDelete` pattern (subscribe to `component.optimize`, call `component.onOptimize()`, assert emitted equals `mockFile`).
- Add a new test: `'should emit optimize when the optimize button is clicked'`, following the existing click-triggers-output pattern using `buttons[0]`.
- Update/remove the test `'should show "Parsed" status for COMPLETED'` (lines 91–96) — since the "Parsed" text is removed, replace this test with one asserting the text is **absent**: `'should NOT show "Parsed" status for COMPLETED'`, asserting `el.textContent` does not contain `'Parsed'`.
- Keep the `PENDING`/`FAILED` status tests (lines 98–110) unchanged.

**File:** `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.spec.ts`

- Add `provideRouter([])` is already present (line 57) — reuse it.
- Add a new `describe('optimizeCv', ...)` block with a test asserting that calling `component.optimizeCv(mockFiles[0])` triggers navigation with the correct `queryParams`. Use `Router`'s injected instance via `TestBed.inject(Router)` and spy on `navigate` (`vi.spyOn(router, 'navigate')`), then assert it was called with `['/cv-optimization']` and `{ queryParams: { cvId: mockFiles[0].id } }`.
- Import `Router` from `@angular/router` in the spec file.

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.spec.ts`

- Add a new `describe('preselectedCvId', ...)` block:
  - Test: setting `preselectedCvId` input to an id present in `cvList()` patches `cvDocumentIdControl.value` to that id. Use `fixture.componentRef.setInput('preselectedCvId', 'cv-id-1')` (matching `mockCv.id`) then `fixture.detectChanges()`, assert `component.cvDocumentIdControl.value` equals `'cv-id-1'`.
  - Test: setting `preselectedCvId` to an id **not** present in `cvList()` leaves the control at its default value (`''`) — no error thrown, placeholder behavior implied by unchanged empty value.
  - Test: reactive pre-fill — construct the component with `cvStore.cvList` initially empty (`makeCvStore({ cvList: [] })`) and `preselectedCvId` set to `'cv-id-1'`, then update the underlying `cvList` signal to include `mockCv` (simulating the store loading asynchronously) and assert the control updates to `'cv-id-1'` only after the list becomes available. This exercises the effect's reactivity to `cvList()` changes, not just `preselectedCvId()`.
  - Test: `preselectedCvId` has no effect when left at its default (`null`) — control remains `''`.

---

## Step 6 — Verification (DEV acceptance criteria)

Run in order, fixing any failures before proceeding to the next:

1. `npm exec nx test opticv-web` — all unit tests pass, including the new/updated ones above.
2. `npm exec nx build opticv-web` — production build succeeds.
3. Manual/AXE check: the new "Optimize CV" button has a `title` attribute (already specified in Step 1) — confirm this satisfies the existing AXE pass state for icon-only `p-button`s, consistent with the existing `download`/`delete` buttons (no additional `aria-label` needed since `title` matches the existing pattern in this file).

No backend, database, or routing-config (`app.routes.ts`) changes are required — the existing `cv-optimization` route already supports query params without modification.

---

## Files Changed

- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.ts` (modified)
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.html` (modified)
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list-item/cv-file-list-item.spec.ts` (modified)
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.ts` (modified)
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.html` (modified)
- `apps/opticv-web/src/app/features/dashboard/components/cv-file-list/cv-file-list.spec.ts` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.ts` (modified)
- `apps/opticv-web/src/app/features/cv-optimization/components/job-upload/job-upload.spec.ts` (modified)

No new files are created. No files are deleted.
