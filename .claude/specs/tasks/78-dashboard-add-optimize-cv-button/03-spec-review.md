# Specification Review — Task 78

## Source Files Reviewed

- `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/00-raw-task.md`
- `.claude/specs/tasks/78-dashboard-add-optimize-cv-button/02-spec.md`

### Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification is well-grounded in the actual codebase — every file path, component, signal, and pattern it references was verified to exist and behave as described. It correctly scopes the task to the three raw-task requirements without inventing new ones. Issues found are minor: one incomplete implementation detail (Router is not yet injected in `CvFileList`) and a few small ambiguities around the "Parsed" removal decision and test-file naming that don't block implementation but should be tightened.

---

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **Missing detail: `Router` is not currently injected in `CvFileList`.** The spec's "Context" and "Scope" sections instruct handling the new `optimize` output "by navigating to `/cv-optimization`... `this.router.navigate(...)`" but never states that `Router` must first be imported and injected into `cv-file-list.ts` (it currently has no `Router` usage at all — only a static `RouterLink` in the template). This is a small omission; an implementer following the spec literally would still discover it's needed, but the spec doesn't flag it as a step. The actual sibling pattern to mirror for `router.navigate` with a param exists in `optimization-list.ts` (`this.router.navigate(['/cv-optimization', item.id])`), not in `cv-file-list.ts` itself — the spec's phrasing ("navigating to... following the existing pattern") could be read as implying `cv-file-list.ts` already has a navigation pattern to extend, which it does not.

2. **`prefillData` effect interaction not fully addressed.** The existing `prefillData` effect in `job-upload.ts` does double duty: it patches the whole form AND toggles `form.enable()/disable()` based on `isReadonly()`, in a single `effect()`. The spec says the new `preselectedCvId` effect should "follow the same pattern... but keep it independent," which is directionally correct, but doesn't explicitly state that the new effect must be a **separate** `effect()` call (not merged into the existing one) to avoid unintended interaction (e.g., re-triggering enable/disable logic, or fighting with `prefillData` if both were ever present). Worth being explicit about this in the spec to prevent an implementer from merging the logic.

3. **Test acceptance criteria don't name exact test files.** The "Acceptance (DEV)" section describes test scenarios in prose but doesn't specify which spec files should contain them (e.g., `cv-file-list-item.spec.ts`, `cv-file-list.spec.ts`, `cv-optimization.spec.ts` or `job-upload.spec.ts` for the pre-selection case). Not a blocker, but slightly underspecified given the project convention of colocated spec files.

### Unclear or Ambiguous Sections

1. **"Scope" section, bullet on removing "Parsed" text** — the spec includes a self-referential hedge: "Decide during implementation whether to remove the whole status `@switch` block or keep `PENDING`/`FAILED` states — per this task's wording... only the completed-state text/icon should be removed." This reads as the spec author debating itself in the document rather than stating a clean decision. The final decision (keep `PENDING`/`FAILED`, remove only `COMPLETED`'s content) is correct and matches the raw task ("Remove 'Parsed' text"), but the surrounding deliberation should have been resolved before finalizing rather than left visible. This is a clarity/editing issue, not a substance issue — the actual instruction is unambiguous by the end of the bullet.

2. **Whether `@case ('COMPLETED')` should become an empty case or be removed entirely** — the spec doesn't say whether, after removing the "Parsed" text/icon, the `@case ('COMPLETED')` branch should remain as an empty case (rendering nothing) or be deleted from the `@switch` entirely. Both achieve the same visible behavior, but this is a small implementation-detail gap.

### Invented or Unsupported Requirements

None. All requirements in the spec trace back to the three numbered points in the raw task:
1. Add "Optimize CV" button before download button → covered (Scope, Behavior).
2. Remove "Parsed" text → covered (Scope, Behavior, Edge Cases).
3. Navigate to cv-optimization page with CV pre-selected → covered (Scope, Behavior, Edge Cases, Data/API).

No additional features, endpoints, or UI elements beyond these were introduced. The "Out of scope" section appropriately fences off adjacent areas (parsing pipeline, `jobApplicationId` stored-optimization flow, general query-param conventions, forced store reload) without expanding scope.

---

## Assumptions Detected

All of the following assumptions are explicitly stated in the spec (in "Context," "Scope," or "Edge Cases") and were independently verified against the current codebase as accurate:

1. `CvFileList` holds `cvFiles()` from `CvStore` and handles row actions — **verified true** (`cv-file-list.ts:43`).
2. `CvFileListItem` renders per-CV icon buttons and status, following an existing `download`/`delete` output pattern — **verified true**.
3. `CvOptimization`'s `pageState()` computed has an `'initial'` state used to conditionally render `JobUpload` — **verified true** (`cv-optimization.ts:303-307`, `.html:66-78`).
4. `JobUpload`'s CV select is a PrimeNG `<p-select formControlName="cvDocumentId">` bound to `CvStore.cvList()` — **verified true**.
5. `CvStore` exposes `cvList()` and `loadUserCVs()`, shared by dashboard and `JobUpload` — **verified true**, including the specific caching behavior (`loadUserCVs` skips the fetch unless `force=true` or the list is empty) that underpins the Edge Cases section's reasoning about reactive pre-fill.
6. "No existing query-param or router-state navigation pattern exists in the app" — **verified true** via a full-tree search; all existing navigation uses positional route-segment arrays only.
7. The existing `prefillData` effect pattern in `job-upload.ts` — **verified true**, code matches as described, though see Non-Critical Issue #2 above for a nuance the spec doesn't fully spell out.

No hidden or undisclosed assumptions were found. The spec's assumption disclosure is thorough and matches actual codebase state at time of review.

---

## Recommendation

- **Proceed as-is** (minor clarifications optional, not blocking). The spec is accurate, scoped correctly to the raw task, and implementable without guessing on any load-bearing point. If desired, tighten Non-Critical Issues #1–#3 before implementation, but none require revisiting the task definition or a full spec rewrite.
