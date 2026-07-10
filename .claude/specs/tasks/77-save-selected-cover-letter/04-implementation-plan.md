# Implementation Plan: Task 77 — Save the selected cover letter and the eventual edited version

## Source

- Specification: `.claude/specs/tasks/77-save-selected-cover-letter/02-spec.md`
- Spec review: `.claude/specs/tasks/77-save-selected-cover-letter/03-spec-review.md` (PASS WITH ISSUES)

## Decisions resolving open review issues

These decisions are implementation-plan-level clarifications, not new requirements — each is a direct analogy to the existing summary pattern already in the codebase.

1. **"Apply once" restore guard** — Add a private boolean flag `hasAppliedInitialState = false` on `CoverLetterEditor`, analogous in spirit to the existing `userHasInteracted` flag. Inside the single constructor `effect()`, only consult `initialSelectedVariant()` / `initialEditedContent()` while `hasAppliedInitialState` is `false`; set it to `true` immediately after the effect body runs once. This avoids a second effect and avoids re-clobbering user edits/selections on unrelated change detection.
2. **State location: dedicated component signals, not `UserSelections`** — `UserSelections` is consumed by `applySelectionsToCV` for CV-merge logic unrelated to cover letters; adding cover-letter fields there would be scope creep on a type with a different purpose. Add two dedicated signals directly on `CvOptimization`: `selectedCoverLetterVariant = signal<CoverLetterHookType | null>(null)` and `editedCoverLetterContent = signal<string | null>(null)`. This mirrors how `bulletEdits`, `removedBullets`, etc. are already dedicated signals rather than `UserSelections` fields.
3. **Retry behavior** — No change. `coverLetterResultId` is reset only in `runOptimization()`, consistent with existing `summaryRewriteResultId` / `bulletUpgradeResultId` behavior on `retryOptimization()`. Not in scope.

## Files to change

### 1. `packages/shared/datatypes/src/lib/datatypes.ts`

- Add new type directly below `SummaryUserState` (end of file, line 500):
  ```ts
  export type CoverLetterUserState = {
    selectedVariant: CoverLetterHookType | null;
    editedContent: string | null;
  };
  ```

### 2. `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.ts`

- Import `CoverLetterHookType` alongside `CoverLetterResult` from `@opticv/datatypes`.
- Add inputs:
  - `readonly initialSelectedVariant = input<CoverLetterHookType | null>(null);`
  - `readonly initialEditedContent = input<string | null>(null);`
- Add outputs:
  - `readonly variantSelected = output<CoverLetterHookType>();`
  - `readonly contentEdited = output<string>();`
  - Import `output` from `@angular/core`.
- Add private field `private hasAppliedInitialState = false;`.
- Update constructor `effect()`:
  - Compute `idx` as before from `safeIndex()`, but only override with the restored variant on first application:
    - If `!hasAppliedInitialState`: look up `initialSelectedVariant()` against `this.result().variants` (`findIndex` by `hookType`). If found, use that index instead of `safeIndex()`. Otherwise fall back to `safeIndex()`.
    - Set `selectedVariantIndex` to the resolved index.
    - If `!hasAppliedInitialState` and `initialEditedContent()` is non-null, set `editorContent` to `initialEditedContent()`. Otherwise set it via `buildContent(idx)` as today.
    - Set `hasAppliedInitialState = true` at the end of the effect body (unconditionally, so it only gates the very first run).
- Update `selectVariant(index: number)`:
  - After setting `selectedVariantIndex` and `editorContent` as today, emit `variantSelected` with `this.result().variants[index].hookType`.
- Add a new template-bound method `onEditorContentChange(html: string): void` that sets `editorContent.set(html)` and emits `contentEdited` with `html`. This replaces the inline `(ngModelChange)="editorContent.set($event)"` handler.

### 3. `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.html`

- Change the `<p-editor>` binding:
  - Replace `(ngModelChange)="editorContent.set($event)"` with `(ngModelChange)="onEditorContentChange($event)"`.

### 4. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

- Import `CoverLetterHookType` and `CoverLetterUserState` from `@opticv/datatypes`.
- Add new signals (near `summaryRewriteResultId` / `bulletUpgradeResultId`):
  - `readonly coverLetterResultId = signal<string | null>(null);`
  - `readonly selectedCoverLetterVariant = signal<CoverLetterHookType | null>(null);`
  - `readonly editedCoverLetterContent = signal<string | null>(null);`
- Add `private readonly persistCoverLetterSubject = new Subject<void>();` next to `persistSummarySubject`.
- In `ngOnInit()`, wire it exactly like `persistSummarySubject`:
  ```ts
  this.persistCoverLetterSubject
    .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.persistCoverLetterState());
  ```
- In `loadStoredOptimization()`, add a new `if (r.promptType === PromptType.COVER_LETTER)` branch inside the `for (const r of results)` loop, alongside the existing `SUMMARY_REWRITE` / `BULLET_UPGRADE` branches:
  - `this.coverLetterResultId.set(r.id);`
  - If `r.userEditedOutput != null`, `try`/`catch` parse it as `CoverLetterUserState`:
    - On success: `this.selectedCoverLetterVariant.set(state.selectedVariant); this.editedCoverLetterContent.set(state.editedContent);`
    - On failure: `console.warn('Could not parse cover letter user state from stored optimization');` (matching existing message style for summary/bullet).
- In `runOptimization()`, reset the new state alongside the existing resets (near `summaryRewriteResultId.set(null)`):
  - `this.coverLetterResultId.set(null);`
  - `this.selectedCoverLetterVariant.set(null);`
  - `this.editedCoverLetterContent.set(null);`
- Add two new handler methods, placed near `onAngleSelected` / `onSummaryTextEdited`:
  ```ts
  onCoverLetterVariantSelected(hookType: CoverLetterHookType): void {
    this.selectedCoverLetterVariant.set(hookType);
    this.persistCoverLetterSubject.next();
  }

  onCoverLetterTextEdited(content: string): void {
    this.editedCoverLetterContent.set(content);
    this.persistCoverLetterSubject.next();
  }
  ```
- Add a new private method `persistCoverLetterState()`, placed near `persistSummaryState()`, following the identical resolve-then-save structure:
  ```ts
  private persistCoverLetterState(): void {
    const jobApplicationId = this.jobApplicationId();
    if (jobApplicationId === null) return;

    const buildAndSave = (resultId: string) => {
      const state: CoverLetterUserState = {
        selectedVariant: this.selectedCoverLetterVariant(),
        editedContent: this.editedCoverLetterContent(),
      };
      this.cvOptimizationApiService
        .saveUserOutput(resultId, JSON.stringify(state))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Could not save changes',
              detail: 'Your edits are still applied locally.',
            });
          },
        });
    };

    const knownId = this.coverLetterResultId();
    if (knownId !== null) {
      buildAndSave(knownId);
      return;
    }

    this.cvOptimizationApiService
      .getOptimizationResults(jobApplicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const coverLetterResult = results.find(
            (r) => r.promptType === PromptType.COVER_LETTER,
          );
          if (coverLetterResult) {
            this.coverLetterResultId.set(coverLetterResult.id);
            buildAndSave(coverLetterResult.id);
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Could not save changes',
            detail: 'Your edits are still applied locally.',
          });
        },
      });
  }
  ```

### 5. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

- Update the `<app-cover-letter-editor>` element (currently line 269) to bind the new inputs/outputs:
  ```html
  <app-cover-letter-editor
    [result]="coverLetterResult()!"
    [initialSelectedVariant]="selectedCoverLetterVariant()"
    [initialEditedContent]="editedCoverLetterContent()"
    (variantSelected)="onCoverLetterVariantSelected($event)"
    (contentEdited)="onCoverLetterTextEdited($event)"
  />
  ```

### 6. `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.spec.ts`

- Add test cases:
  - Restores `selectedVariantIndex` and `editorContent` from `initialSelectedVariant` / `initialEditedContent` inputs when they match a variant in `result()`.
  - Falls back to AI-recommended variant (`safeIndex()`-derived) and generated content when `initialSelectedVariant` / `initialEditedContent` are `null`.
  - Falls back to AI-recommended variant when `initialSelectedVariant` does not match any `hookType` in `result().variants`.
  - `selectVariant(index)` emits `variantSelected` with the correct `hookType`.
  - Editing via the editor's change handler emits `contentEdited` with the new HTML string and updates `editorContent`.
  - After the initial restore is applied, a subsequent unrelated re-run of the effect (e.g. re-reading signals without `result()` identity change) does not re-clobber a user's own selection/edit — verify `hasAppliedInitialState` guard behavior by checking state is preserved across effect re-runs after user interaction.

### 7. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

- Add test cases:
  - `persistCoverLetterState()` (invoked via the debounced subject or directly if the spec calls private methods through the public handlers) builds `{ selectedVariant, editedContent }`, `JSON.stringify`s it, and calls `saveUserOutput` with the resolved `coverLetterResultId`.
  - `persistCoverLetterState()` resolves `coverLetterResultId` on demand via `getOptimizationResults` when not yet cached, then saves.
  - `loadStoredOptimization()` sets `coverLetterResultId` and restores `selectedCoverLetterVariant` / `editedCoverLetterContent` from valid `userEditedOutput` JSON on the `COVER_LETTER` result row.
  - `loadStoredOptimization()` handles corrupt/unparseable `userEditedOutput` for `COVER_LETTER` via `console.warn` fallback, leaving `selectedCoverLetterVariant` / `editedCoverLetterContent` at their defaults (`null`).
  - `runOptimization()` resets `coverLetterResultId`, `selectedCoverLetterVariant`, and `editedCoverLetterContent` to their initial values.
  - Save failure shows the same `MessageService` error toast pattern used by `persistSummaryState()`.

## Out of scope (unchanged)

- No backend/Prisma changes.
- No changes to cover letter AI generation logic.
- No changes to PDF/DOCX export logic (already reads from `editorContent()`).
- No migration of `cv-optimization.ts` to NgRx Signal Store.
- No reset of `coverLetterResultId` in `retryOptimization()` (mirrors existing summary/bullet behavior).

## Verification checklist

- [ ] `npm exec nx build datatypes`
- [ ] `npm exec nx build opticv-web`
- [ ] `npm exec nx build opticv-be`
- [ ] `npm exec nx typecheck opticv-web`
- [ ] `npm exec nx typecheck opticv-be`
- [ ] `npm exec nx lint opticv-web`
- [ ] `npm exec nx test opticv-web`
- [ ] Manual: select a non-recommended cover letter variant and/or edit the text, reload the stored optimization, confirm selection and edits are restored exactly as left.
- [ ] Manual: confirm no regression to summary/bullet persistence or cover letter PDF/DOCX export.
