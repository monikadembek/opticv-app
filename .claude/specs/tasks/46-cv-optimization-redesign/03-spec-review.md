# Specification Review

## Task ID: 46-cv-optimization-redesign

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured, thorough, and faithfully captures the design prototype layout. It correctly identifies the new components, their inputs/outputs, the responsive breakpoints, and the three page states. However, several implementation-critical gaps and ambiguities exist: the `InitialUploadForm` redesign conflicts with the existing `job-upload` component contract; the `statuses` input type on sidebar/tabs is under-specified relative to what the existing code actually produces; the `"error"` status is listed in the status table but not handled in `SectionCard` header spec; and the existing `optimization-result-panel` wrapper role during the transition is unaddressed. None of these are blockers if the implementer reads both the spec and the existing component code carefully, but they should be clarified before implementation starts.

---

### Findings

#### Critical Issues

1. **`InitialUploadForm` conflicts with `job-upload` component contract.**
   The spec says the initial state replaces `<p-accordion>` / `<app-job-upload>` with a new `InitialUploadForm` centred layout (max-width 600px). However, the current `job-upload` component is a standalone Angular component that owns the form logic, CV selection, API call, and emits `(jobSubmitted)` with a `JobSubmittedData` payload that the parent uses to call `runOptimization()`. The spec does not say whether:
   - `InitialUploadForm` is a new visual wrapper around the existing `app-job-upload`, or
   - `app-job-upload` is replaced with a new component that duplicates its logic.
   
   If `app-job-upload` is reused inside the new layout, it will render its own internal form (with its own labels and structure) inside the new card — which may conflict with the spec's prescribed field list. If it is replaced, the spec does not address migrating the existing form logic or the `jobSubmitted` output. This must be clarified.

2. **`statuses` input type mismatch.**
   The spec declares `statuses = input<Map<string, string>>()` on both `OptimSidebarComponent` and `MobileTabsComponent`. In the existing component, the actual data structure is `signal<Map<PromptType, SseJobCompleteEvent>>` (where `SseJobCompleteEvent` has a `status: string` property). The spec does not explain how the parent should derive a `Map<string, string>` from this. If the implementer passes the raw `results()` map it will be a type mismatch. A derived computed signal (e.g. `computed(() => new Map([...results().entries()].map(([k, v]) => [k, v.status])))`) would be needed. The spec should either specify the derived mapping or change the input type to accept the raw `results()` map.

#### Non-Critical Issues

3. **`"error"` status not covered in `SectionCard` header spec.**
   The status table in "Status icons per section" defines a `"error"` row (`pi-times-circle`, critical color), but the `SectionCard` "Header row" description only covers `"completed"` and `"processing"`. The `"error"` status header treatment in the card (badge, icon, or nothing) is unspecified.

4. **Role of `optimization-result-panel` during migration is not addressed.**
   The existing template wraps every section in `<app-optimization-result-panel [loading]="..." [error]="..." [hasData]="...">`. The spec says all existing section component interiors remain unchanged and only the wrapper changes — but it does not say whether `optimization-result-panel` is kept (nested inside `SectionCard`) or replaced by `SectionCard`'s own processing/error handling. If it is kept, there will be two layers of loading/error UI. If it is removed, the error and `hasData` handling it provides must be accounted for in `SectionCard`. This needs explicit guidance.

5. **Scrollspy cleanup on component destroy not mentioned.**
   The spec describes an `IntersectionObserver` for scrollspy but does not mention disconnecting it when the component is destroyed. Given the project's pattern of using `takeUntilDestroyed(this.destroyRef)`, the implementer needs to know to call `observer.disconnect()` in a cleanup function or via `DestroyRef`.

6. **`atsScore` and `keywordScore` derivation unspecified.**
   The spec says the sidebar shows two `MiniScore` rings for ATS and keyword scores "when results are available." It does not specify which field of which result object to read for each score. From the design prototype these are `autopsyResult().overallScore` and `keywordGapResult().matchScore` respectively. The spec should state this mapping.

7. **`SectionCardComponent` body slot behaviour when `status === "pending"`.**
   The spec states: "When status is `'processing'`: shows `ProcessingPlaceholder` instead of child content." It is silent on `"pending"`. The design prototype shows pending sections with no body content (just the header). The spec should state explicitly what renders in the card body when status is `"pending"`.

8. **`ExportFooter` visibility condition is subtly different from the spec wording.**
   The spec says the footer appears "only in 'completed' state (when `jobApplicationId()` is set and results are available)." The existing code's `canExportCv()` computed signal requires at minimum one selection to be made (not just results being available) when not in stored mode. The footer's visibility condition as written in the spec would show the footer even before the user has selected anything, diverging from the current behaviour. The spec should clarify whether the footer appears as soon as any result is present, or only when `canExportCv()` is true.

9. **`JobInfoBannerComponent.cvDownloadUrl` input appears redundant.**
   The spec declares a `cvDownloadUrl = input<string | null>(null)` on `JobInfoBannerComponent`, but the existing `openOriginalCv()` method calls `cvApiService.downloadCv()` asynchronously and opens the result in a new tab. The URL is not pre-computed. The input seems invented; a `openCv = output<void>()` (which is also declared) is sufficient. The redundant input should be removed or its purpose clarified.

#### Unclear or Ambiguous Sections

- **"Behavior → Processing state"**: States "Export footer not shown." This is coherent but conflicts with non-critical issue #8 — the existing `canExportCv()` can return true during processing if stored mode is active with pre-existing selections.
- **"Component breakdown → `OptimSidebarComponent` inputs — `pageState`"**: Typed as `'initial' | 'processing' | 'completed'` but the existing component has no single `pageState` signal; this would need to be derived (e.g. `computed()`). The derivation rule is not specified.
- **"Design tokens used → `--shadow-card`"**: Listed as `0 2px 8px rgba(15,23,42,.06)` — this hardcoded value may not be a defined CSS custom property in the current app token set (`src/assets/css/colors.css` does not expose `--shadow-card`). The implementer should verify it exists or define it.

#### Invented or Unsupported Requirements

- **`cvDownloadUrl` input on `JobInfoBannerComponent`**: No evidence in the raw task or design prototype that a pre-computed download URL is passed in. The existing code computes it asynchronously via `cvApiService`. This input appears to be an invention. (See non-critical issue #9 above.)
- **`ExportSection` as a `SectionCard`**: The spec lists Export CV as a sidebar section card but also as an `ExportFooter`. The design prototype removes "Export CV" from the sidebar nav items entirely and puts it only in the footer. If the spec intends Export CV to also exist as a `SectionCard` in the scroll area, this contradicts the design. If it does not, the component table listing `cv-template-selector` as unchanged is fine, but the `ExportSection` spec reference needs to be removed.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The design prototype's React JSX components map 1:1 to new Angular components | Implicit — stated as new components to create, not as a mapping |
| 2 | `--shadow-card`, `--radius-lg`, `--space-*`, `--duration-fast`, etc. are already defined in the app's existing CSS token files | Implicit — stated in "Design tokens used" without verification |
| 3 | `atsScore` = `autopsyResult().overallScore` and `keywordScore` = `keywordGapResult().matchScore` | Not stated |
| 4 | The `pageState` derived signal is `computed(() => isInitial ? 'initial' : isProcessingAny() ? 'processing' : 'completed')` | Not stated |
| 5 | `optimization-result-panel` will be removed and its error/loading responsibility absorbed by `SectionCard` | Implicit only |
| 6 | The `InitialUploadForm` reuses the existing `job-upload` component as its form logic host | Not stated — contradicted by field-level prescription |
| 7 | Scrollspy `IntersectionObserver` uses `rootMargin: "-30% 0px -50% 0px"` (from prototype) | Not stated |
| 8 | The mobile tabs strip is only shown when not in initial state | Implicit (design prototype does `{!isInitial && <MobileTabs />}`) — not stated in spec |
| 9 | `header-h` (64px) matches the existing app header height | Assumed — not verified against the Angular layout |
| 10 | The `SectionCard` `status` input accepts a string derived from `SseJobCompleteEvent.status` values (`'completed'`, `'failed'`, etc.) or `isProcessing` booleans, but this mapping is not specified | Not stated |

---

### Recommendation

**Revise specification** — address the two critical issues (InitialUploadForm/job-upload contract, statuses type mismatch) and the `optimization-result-panel` migration gap before implementation begins. The remaining non-critical issues can be resolved inline during implementation if the implementer has access to the existing code, but making them explicit will reduce ambiguity.
