# Specification Review — Task 139: CV Builder — add export CV dialog

Reviewed: `02-spec.md` against `00-raw-task.md`, the four clarification answers recorded in the spec, and the current codebase (`export-footer.*`, `cv-optimization.ts`, `cv-builder.*`, `cv-templates.ts`, `cv-export.service.ts`, `user-settings-api.service.ts`, `datatypes.ts`).

### Summary

- Overall assessment: **PASS WITH ISSUES**
- Justification: The spec covers all five explicit task requirements: the builder gets an export dialog like the one on the optimization page, with template and accent color selection, the same tier limits, PDF and DOCX export, and no Compliance section. The design choices beyond the task (shared dialog extraction, fixed footer bar, exporting the current form state, file name from the CV name) are each backed by a recorded clarification. The code facts the spec relies on check out against the repository (types, providers, hard-coded file names, the scope of the sidebar offset, the tier limits). Nothing blocks implementation. A few small additions aren't listed as assumptions, and a few points in the test setup and on mobile need more precision.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Builder test setup will need a new provider, but the spec doesn't mention it** (Acceptance → `CvBuilder`).
   `CvBuilder` will now inject `UserSettingsApiService`, which builds `httpResource`s when it's constructed. The existing `cv-builder.spec.ts` only provides `CvApiService`, `MessageService`, `Router`, `Location` and `ActivatedRoute` (lines 105–110 and 500–503). Without a mock `UserSettingsApiService` (or `provideHttpClient` + `provideHttpClientTesting`), the existing builder tests will fail. The spec should say how the tier source is mocked in tests, since tests need to vary `userProfile().subscription`.

2. **Signature of `getAllowedTemplateIds` vs. the `UserProfile` type** (Behavior §C).
   `UserProfile.subscription` is `{ tier; status; cancelAtPeriodEnd; currentPeriodEnd } | null`, so it's assignable to the parameter `{ tier; status } | null | undefined`. That works, but importing `cv-templates.ts` will now pull in runtime values (`TIER_LIMITS`, `getEffectiveTier`) from `@opticv/datatypes`, whereas today that file is pure constants. This is acceptable, but worth a one-line note so the implementer doesn't think it introduces a circular dependency.

3. **What happens to the dialog on mobile isn't described** (Behavior §F.4, Edge Cases).
   Below 1024px, `.builder-preview` stacks under the form rather than staying sticky beside it. The statement "changing the template/accent updates the live preview straight away because the dialog is non-modal" only gives visible feedback on desktop. On narrow screens the bottom-right dialog (max 95vw) covers most of the viewport and the preview is off-screen. The spec should say whether that's accepted on mobile.

4. **Effect of template and accent changes on unsaved-changes tracking is implicit** (Behavior §F.6).
   `currentSnapshot` is built from `{ name, cv: mergedCv() }` only, so changing the template or accent won't mark the form dirty. That's consistent with assumption 2 (not saved), but the spec only says that export doesn't change the snapshot. It doesn't say that template and accent changes don't count as unsaved changes either. This should be stated so a reviewer doesn't flag it as a bug later.

5. **Footer accessibility is minimal** (Behavior §F.3, Acceptance → Accessibility).
   The spec gives the button an accessible name, but doesn't say whether the fixed bar is a landmark (e.g. `<footer>` or `role="contentinfo"`/`region` with a label). It also doesn't address whether the bar covers keyboard focus near the bottom of the page. The bottom-padding rule covers the content, but not focus scrolling (`scroll-padding-bottom`). This is minor, but it's relevant to the "MUST pass AXE / WCAG AA" rule.

6. **Exact bottom padding value is vague** (Behavior §F.3).
   "Footer height + the existing spacing" can be read as `64px + var(--space-6)` or as replacing the existing `padding: var(--space-6)` bottom value. It's low risk, but a concrete value would help.

7. **`toExportFileName` doesn't handle Windows reserved device names** (Behavior §E).
   A CV named `CON`, `NUL`, `COM1` etc. passes the sanitizer, and the browser download then silently renames or rejects it on Windows. Browsers usually handle this themselves, so this is only worth listing as a known limitation, not as a requirement.

8. **Moving tests out of `export-footer.spec.ts`** (Acceptance → `ExportFooter`).
   The current spec file has dialog-internal tests at lines 87–240 (template options, accent, ATS info, export buttons), some of which read `templates`, `accentColors` and `infoDialogVisible` directly from the footer instance. The spec says they move, which is correct. It could also state plainly that those members are **removed** from `ExportFooter`, so the old tests must be deleted rather than adapted.

#### Unclear or Ambiguous Sections

- **Behavior §A, "Contents (moved from `ExportFooter` without changes …)"**: it says "without changes" but then changes the ARIA labels. The exception is stated, but the wording contradicts itself a little.
- **Behavior §F.5, "Do nothing if that format's export is already running"**: it isn't clear whether this check is in addition to the button's `[disabled]` binding (belt and braces) or replaces it. The Edge Cases section suggests both. Fine, but say so in one place.
- **Assumption 6** ("doesn't need to account for the app's top header"): it isn't obvious why the top header would affect a bottom-anchored bar. The assumption looks unnecessary or poorly worded.

#### Invented or Unsupported Requirements

None that change user-facing scope beyond the recorded clarifications. Minor additions that aren't in the task and aren't listed as assumptions:

- **Duplicate-click guard in `exportCvAsPdf/Docx`** (§F.5): the optimization page has no such guard. It's harmless and defensive, but not in the task.
- **`getAllowedTemplateIds` refactor of `CvOptimization`** (§C): this touches optimization code beyond the dialog extraction. It's justified by "keep the same limits" and DRY, but it's a refactor rather than a requirement.
- **Generic ARIA label change on the optimization page** (Assumption 5): it's listed as an assumption, so that's fine.

### Assumptions Detected

| # | Assumption | Explicitly stated? |
| --- | --- | --- |
| 1 | The builder footer contains only Export CV (no Preview button) | Yes (A1) |
| 2 | Template and accent selection are not saved, only kept for the session | Yes (A2) |
| 3 | No PostHog event for builder export | Yes (A3) |
| 4 | No error toast when export fails | Yes (A4) |
| 5 | ARIA labels become generic on both pages | Yes (A5) |
| 6 | Footer doesn't account for the top header | Yes (A6) |
| 7 | The new dialog lives in `features/cv-optimization/components/` (not `shared/`) | Yes (Context, convention note) |
| 8 | The FREE tier applies while the user profile is loading | Yes (§F.1, Edge Cases) |
| 9 | CVs with almost no content and invalid names can still be exported | Yes (Edge Cases) |
| 10 | PDF and DOCX can export at the same time | Yes (Edge Cases) |
| 11 | Template and accent changes don't affect unsaved-changes tracking | **No** (implicit, see Non-Critical #4) |
| 12 | Losing the live preview feedback on mobile is acceptable | **No** (implicit, see Non-Critical #3) |
| 13 | The duplicate-click guard is wanted | **No** (implicit, see Invented #1) |
| 14 | Builder footer z-index 100 is enough to sit above page content and below PrimeNG overlays | **No** (copied from optimization, not stated) |

### Recommendation

- **Proceed as-is**, with the non-critical points (especially #1, the test provider, and #4, the unsaved-changes note) dealt with during planning. The spec doesn't need a full revision.
