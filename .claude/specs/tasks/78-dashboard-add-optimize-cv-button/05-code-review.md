# Code Review — Task 78: Add "Optimize CV" button to dashboard

### Summary

- Overall result: **PASS WITH ISSUES**
- The implementation correctly wires the `optimize` output, query-param navigation, `preselectedCvId` reactive pre-fill, and removal of the "Parsed" status text. Unit tests (942 tests, 49 files) pass, covering all spec-required scenarios. The main issue is a visual/markup deviation from the plan: the new button is not styled as an icon-only button matching the download/delete buttons. Separately, `npm exec nx build opticv-web` fails on a pre-existing bundle-size budget (1 MB max, actual 1.52 MB) — this failure is unrelated to task 78's changes (see Acceptance Criteria note below) but the DEV acceptance criteria explicitly require the production build to pass, so this blocks a clean "Merge as-is" verdict.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

- `cv-file-list-item.html:25-32` — The "Optimize CV" `<p-button>` is missing `severity="secondary"` (plan Step 1) and includes a visible `label="Optimize CV"`, unlike the plan's icon-only spec. The download/delete buttons have no `label`, are icon-only with a `title` tooltip, and use explicit `severity`. This makes the new button visually inconsistent (defaults to primary color, wider due to text) with its siblings in the same row, contradicting spec's "matching the existing icon-button style (`severity`, `size="small"`, `[text]="true"`, `title`)" requirement (`02-spec.md:23`).

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| "Optimize CV" button added before download button, matching icon-button style | Partial | Present and positioned correctly, but styling deviates (visible label, no `severity`) — see Non-Critical above. |
| `optimize` output emitted from `CvFileListItem`, following `download`/`delete` pattern | Covered | `cv-file-list-item.ts:20,27-29`. |
| `CvFileList` navigates to `/cv-optimization` with `cvId` query param on `optimize` | Covered | `cv-file-list.ts:52-56`, tested in `cv-file-list.spec.ts:112-123`. |
| `CvOptimization` reads `cvId` query param, passes to `JobUpload` as `preselectedCvId` | Covered | `cv-optimization.ts:446-449`, `cv-optimization.html:77`. |
| `JobUpload` new `preselectedCvId` input, separate `effect()` pre-filling `cvDocumentId` | Covered | `job-upload.ts:61,120-127`, kept independent from `prefillData` effect as required. |
| "Parsed" status text/icon removed for `COMPLETED`; `PENDING`/`FAILED` unchanged | Covered | `cv-file-list-item.html:11-22`; tests at `cv-file-list-item.spec.ts:111-130`. |
| Optimize button always visible/enabled regardless of `parseStatus` | Covered | No `[disabled]` binding on the button. |
| Edge case: `cvId` not in `cvList()` → no pre-selection, no error | Covered | `job-upload.spec.ts:296-301`. |
| Edge case: `cvList()` loads after `cvId` is read → pre-fill applies reactively | Covered | `job-upload.spec.ts:303-314`. |
| Edge case: no `cvId` param → unchanged behavior | Covered | `job-upload.spec.ts:316-319` (default `null` case). |
| AXE/WCAG AA — icon-only button needs accessible name | Partial | Button now has both `title="Optimize CV"` and a visible `label`, so an accessible name exists, but it no longer matches the "icon-only" pattern the spec described, and severity styling isn't applied — see Non-Critical above. |

### Plan Deviations

- Plan Step 1 specified the new button use `severity="secondary"` and be icon-only (no visible label) to match download/delete. Implementation (`cv-file-list-item.html:25-32`) omits `severity` and adds `label="Optimize CV"`. Functionally equivalent (click still emits `optimize`), but visually inconsistent with plan and spec wording.

### Acceptance Criteria (DEV) — Build Verification

- `npm exec nx build opticv-web` **fails**: `bundle initial exceeded maximum budget. Budget 1.00 MB was not met by 522.92 kB with a total of 1.52 MB.` (`opticv-web:build:production`).
- This is **not caused by task 78's diff** — the diff for this task touches only `cv-file-list-item`, `cv-file-list`, `cv-optimization`, and `job-upload` (Router/ActivatedRoute wiring, a new output/input, and template bindings; no new npm dependencies). The budget config (`maximumError: "1mb"` in `apps/opticv-web/project.json`) predates this task's commit. The overflow is driven by pre-existing heavy third-party dependencies already in the app (`jspdf`, `canvg`, `quill`, `dompurify`, flagged as non-ESM in the build warnings) used by the CV export/cover-letter features, unrelated to the dashboard/optimize-CV-button work.
- Per spec's Acceptance (DEV) section, `npm exec nx build opticv-web` passing is an explicit requirement. As committed, this criterion is not met — though the root cause is pre-existing tech debt outside this task's scope, not a regression introduced by it.

### Null Safety Issues

None. Query param reads (`route.snapshot.queryParamMap.get('cvId')`) and store list lookups (`cvStore.cvList().some(...)`) are guarded correctly before use.

### Code Smells

None. (Previously flagged: `cv-optimization.spec.ts`'s `makeActivatedRoute` had an unused `cvId` parameter. Fixed — `createComponent`'s `CreateComponentOptions` now accepts `cvId`, threads it into `makeActivatedRoute`, and a new `describe('preselectedCvId', ...)` block asserts `component.preselectedCvId()` is set from the query param and stays `null` when absent.)

### Recommendation

- Fix critical issues before merge — none are critical to this task's own code. However, the production build currently fails the DEV acceptance criteria due to a pre-existing bundle-size budget overflow unrelated to this diff; this should be resolved or explicitly waived (e.g. raise the budget, or address the underlying heavy dependencies in a separate task) before this branch can be considered mergeable. Also recommend addressing the Non-Critical button-styling deviation (align `severity`/icon-only style with spec, or confirm with stakeholder that a labeled button is the intended UX).
