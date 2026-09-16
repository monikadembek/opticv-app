# Specification Review

Task ID: 50-job-posting-visible-after-upload
Spec file: `.claude/specs/tasks/50-job-posting-visible-after-upload/02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec correctly covers all task requirements and makes no unsupported inventions. The behavior logic, data flow, and acceptance criteria are well-structured and unambiguous for the main paths. Two non-critical issues exist: the severity choice for the "New Optimization" button is left open (`secondary` or default), and the mechanism for disabling the job-info-banner interactions during `processing` is described at intent level but not specified in terms of which component owns the logic (parent passes a flag vs. internal state). These are small but could cause implementation ambiguity.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Button severity underspecified** (Section: `"New Optimization" button`)
   The spec says `severity="secondary" (or default — match existing button styles)`. This leaves the implementer to guess. A definitive choice should be made (one value, not two options with "or").

2. **Banner disabled state mechanism not specified** (Section: `Job info display logic`, bullet for stored-mode + `processing`)
   The spec says "disable the 'View job description' toggle and the 'Open CV' button inside the banner" during `processing`, but does not specify how. Options: (a) add a `disabled = input<boolean>(false)` to `JobInfoBanner`, or (b) wrap the banner in a CSS overlay/pointer-events-none in the parent. Without specifying the approach, the implementer must decide independently.

3. **`submittedJobData` stores `extractedData` unnecessarily** (Section: `Storing submitted form data in the live flow`)
   The signal is typed as `signal<JobSubmittedData | null>` which includes `extractedData: CvStructuredData`. This field is not needed for the job info display — only `jobApplication` fields are used. Storing the full `JobSubmittedData` is not wrong but is slightly over-broad. Low risk, worth noting.

4. **No mention of visual treatment for the read-only form** (Section: `Making job-upload show in read-only/prefilled mode`)
   The spec says the form must be "visually blocked" but gives no guidance on styling (e.g. reduced opacity, `pointer-events: none` overlay, or relying solely on native `disabled` appearance). During `processing`, the task requires it to be "blocked so that user cannot change data or press buttons" (Q4 answer). Purely relying on native `disabled` may not communicate the blocked state clearly enough visually.

#### Unclear or Ambiguous Sections

- **`readonly` input naming vs. Angular reserved word**: The spec proposes `readonly = input<boolean>(false)` on `JobUpload`. In Angular, `readonly` is a standard HTML attribute name. While it is valid as an `input()` signal name in a component, it may conflict with linting rules or confuse readers. The spec does not acknowledge this. Low risk but worth a note.

- **`prefillData` type vs. `JobApplication`**: The spec defines a custom inline type for `prefillData` input rather than reusing `JobApplication` from `@opticv/datatypes`. The inline type is structurally compatible but adds a redundant type definition. The spec should clarify whether `JobApplication` can be used directly or whether the inline type is intentional (e.g. to avoid importing the full type into the component).

#### Invented or Unsupported Requirements

None. All requirements in the spec originate from the raw task or from clarifying answers provided during the spec phase.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | In the live flow, `jobApplication` signal on `CvOptimization` stays `null` (never set to the submitted value). | Yes — stated in Context section. |
| 2 | Stored-mode is identified by `isStoredMode()` signal (already exists). | Yes — referenced throughout Behavior section. |
| 3 | `JobInfoBanner` requires `JobApplicationWithCv`; it cannot be reused for the live flow. | Yes — stated in Data/API section. |
| 4 | Navigating to `/cv-optimization` (same route) fully resets component state via Angular's default route handling (no `onSameUrlNavigation` quirk). | **Not explicitly stated.** If `Router` is configured with `onSameUrlNavigation: 'reload'` or not, behavior may differ. Should be confirmed. |
| 5 | The form's `cvList` dropdown will display the correct CV name when patched, even in read-only mode, because the resource loads independently. | Yes — mentioned in Edge Cases. |
| 6 | Disabling all form controls via `form.disable()` is the intended mechanism for the read-only mode (not CSS-only). | Partially — "set all form controls to disabled state" implies `form.disable()`, but this is not spelled out explicitly. |
| 7 | The "New Optimization" button should not be disabled during `processing`. | Yes — explicitly stated. |

---

### Recommendation

**Revise specification** — address the two non-critical items that could cause implementation ambiguity:
1. Pick a definitive button severity.
2. Specify how `JobInfoBanner` receives its disabled state (new input vs. parent wrapper).

All other issues are minor and can be resolved at implementation time with a brief judgment call. The core logic is sound and ready to implement once those two points are resolved.
