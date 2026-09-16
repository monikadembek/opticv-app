# Code Review — 112-export-footer-redesign

## Summary

- Overall result: **FAIL**
- The core restructuring (fixed bar reduced to Preview/Export, new bottom-right Export dialog with template/accent/ATS/GDPR/PDF/DOCX controls) is implemented and mostly matches the spec. However, the mandatory responsive icon-only behavior for ≤768px (spec Behavior #2) was dropped entirely, and the test suite for this component fails as written (`export-footer.spec.ts` asserts 4 footer buttons, actual markup renders 2) — `npm exec nx test opticv-web` does not pass for this file, which is an explicit Acceptance criterion.

## Conventions Violations

#### Critical (must fix before merge)

- **`export-footer.html:1-20`** — The fixed footer bar renders a single `p-button` per action (`label="Preview"`, `label="Export CV"`) with no icon-only variant for narrow viewports. Spec Behavior #2 explicitly requires: "On viewports ≤768px, both buttons show icon-only... matching the current small-screen pattern already used for Preview." The pre-existing implementation (`git show HEAD~1`) had this pattern (`class="preview-button hidden md:inline"` + a duplicate icon-only `p-button` with `class="md:hidden"`); it was removed rather than carried forward/extended to the new Export button. `export-footer.css:35-39` also no longer contains any button-hiding rules for the 768px breakpoint — only footer padding changes.
- **`export-footer.spec.ts:41-51`** — Test `'renders exactly two p-button triggers (Preview and Export)'` asserts `buttons.length` to be `4` with a comment claiming "Each action renders twice (desktop label+icon / mobile icon-only)". This does not match the actual template, which renders exactly 2 `p-button`s. Confirmed by running the suite: `AssertionError: expected 2 to be 4` at `export-footer.spec.ts:48`. Per spec Acceptance: `npm exec nx test opticv-web -- --testFile=export-footer.spec.ts passes` — it currently does not.

#### Non-Critical (should fix)

- **`export-footer.html:13`** — Footer button label is `"Export CV"`, while spec/plan (02-spec.md §Behavior 1, §Assumptions; 04-implementation-plan.md §2a) consistently describe a button labeled **"Export"**. Minor label drift from spec text; not necessarily a functional problem but inconsistent with what was specified and with the dialog's own header (also "Export CV"), which may read redundantly ("Export CV" button opening an "Export CV" dialog).
- **`export-footer.html:110-121`** — The ATS info trigger was changed from a `p-button` (`icon="pi pi-info"`, `[rounded]`, `[outlined]`) to a plain native `<button class="ats-info-banner">` with new banner-style content ("New to ATS templates?..."). The spec (line 38, line 62) says "ATS info button (moved from footer into this dialog, **same behavior**)" and the plan (§2c) says "same `p-button`". This is a bigger UI change than "moved" — it's a redesigned banner, not a relocated button. Functionally it still opens `infoDialogVisible`, so behavior is preserved, but it deviates from the "same markup, same behavior, just relocated" instruction in both spec and plan.

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Footer reduced to exactly Preview + Export buttons | Partial | Correct button set, but missing required icon-only responsive variant at ≤768px (spec Behavior #2) |
| Preview button unchanged behavior | Covered | `previewVisible.set(true)`, dialog unchanged |
| Export button opens new dialog (`position="bottomright"`, modal, non-draggable) | Partial | Dialog uses `position="bottomright"`, `[draggable]="false"`, `styleClass="export-dialog"` — but `[modal]="true"` is **missing** on the Export dialog (present on Preview and ATS Info dialogs, absent here); spec Behavior #4 requires it |
| Template selector in dialog, same bindings/behavior | Covered | Same `optionLabel`/`optionValue`/`optionDisabled`/model bindings |
| Accent color selector in dialog, same bindings/disabled logic | Covered | `accentColorDisabled()` preserved |
| ATS info button moved into dialog, same behavior | Partial | Opens same `infoDialogVisible` dialog, but markup/style changed from a button to a banner (see Non-Critical) |
| GDPR checkbox in dialog, same behavior | Covered | Same model binding, aria-label |
| Export PDF/DOCX buttons in dialog, same behavior | Covered | Same loading/disabled bindings, same outputs |
| Dialog stays open after export triggered | Covered | No auto-close logic added |
| `maxWidth: '95vw'` on Export dialog | Covered | `[style]="{ width: '420px', maxWidth: '95vw' }"` |
| Public `@Component` API unchanged | Covered | All inputs/outputs/models preserved verbatim in `export-footer.ts` |
| `export-footer.spec.ts` updated and passing | Missing | Test file updated but fails (`expected 2 to be 4`) |
| No wrapping at narrow widths | Covered | `flex-wrap: wrap` / `min-height: 64px` rules removed from `@media (max-width: 768px)` block |

## Plan Deviations

- Plan §2a specifies the Export button should follow "the same responsive icon/label pattern as Preview (label+icon on desktop, icon-only with `title="Export"` below 768px)". Neither button (Preview or Export) retains this pattern in the final markup — both plan and spec agree on this requirement, and neither is met.
- Plan §2c specifies `[modal]="true"` for the Export dialog; the implemented dialog omits `[modal]` entirely.
- Plan §2c/2d specify the ATS info trigger should be "the same `p-button`"; implementation replaces it with a custom native-button banner component.

## Null Safety Issues

None.

## Code Smells

- `export-footer.spec.ts:41-51` — Test assertion count is stale/incorrect relative to the actual template (magic number `4` not backed by real markup), indicating the test was written against an earlier draft of the template (the one with icon-only duplicates) and not re-verified after the final markup was finalized without that duplication.

## Recommendation

- Fix critical issues before merge (restore the required ≤768px icon-only responsive behavior for both footer buttons, and correct `export-footer.spec.ts` so the full suite passes — either by adding back the icon-only duplicate buttons and updating the count assertion accordingly, or by revising the spec test to match a intentionally-simplified footer, which would require spec sign-off since it contradicts spec Behavior #2).
