# Implementation Done Report

## Task ID: 46-cv-optimization-redesign

---

## Summary

The CV optimization page has been redesigned from a single-column accordion layout to a two-column layout with a sticky sidebar, scrollable main content area, and a fixed export footer. Six new Angular components were created (`ProcessingPlaceholder`, `SectionCard`, `JobInfoBanner`, `OptimSidebar`, `MobileTabs`, `ExportFooter`). The main page template and component class were fully rewritten. A `models.ts` file for the `SectionStatus` type was added as an extra. Global CSS design tokens were moved to `styles.css`. Unit tests were updated for all new and modified components.

---

## Specification Coverage

| # | Requirement | Status | Note |
|---|---|---|---|
| 1 | New two-column layout: sticky sidebar + scrollable main | Implemented | `.optim-layout` with flex display |
| 2 | `OptimSidebarComponent` — navigation groups, status icons, mini score rings, collapse toggle | Implemented | `optim-sidebar/optim-sidebar.ts` |
| 3 | `SectionCardComponent` — card wrapper with icon, title, status badge/spinner, body slot | Implemented | `section-card/section-card.ts` |
| 4 | `JobInfoBannerComponent` — job title, company, CV filename link, collapsible job description | Implemented | `job-info-banner/job-info-banner.ts` |
| 5 | `ExportFooterComponent` — fixed bottom bar, template picker, preview, PDF/DOCX buttons | Implemented | `export-footer/export-footer.ts` |
| 6 | `MobileTabsComponent` — horizontally scrollable row of icon+label tabs, sticky below header | Implemented | `mobile-tabs/mobile-tabs.ts` |
| 7 | `ProcessingPlaceholderComponent` — spinner + text + 3 skeleton shimmer lines | Implemented | `processing-placeholder/processing-placeholder.ts` |
| 8 | Sidebar — two groups: "Resume Analysis" and "Additional Materials" | Implemented | `NAV_GROUPS` constant in `optim-sidebar.ts` |
| 9 | Sidebar — nav item: icon square (emerald when active), label, status icon | Implemented | `optim-sidebar.html` |
| 10 | Sidebar — expanded (280px) shows group labels, item labels, status icons | Implemented | |
| 11 | Sidebar — collapsed (72px) shows only icon square and group divider | Implemented | |
| 12 | Sidebar — mini score SVG rings (ATS and Keyword) shown when results available | Implemented | SVG progress rings in `optim-sidebar.html` |
| 13 | Sidebar — toggle button (`pi-chevron-left` / `pi-chevron-right`) with CSS transition | Implemented | |
| 14 | Sidebar — initial state: all nav items at 45% opacity, non-interactive | Implemented | `dimmed` class + `[disabled]` binding |
| 15 | Scrollspy: `IntersectionObserver` watches `[data-section]` elements, updates `activeSection` | Implemented | `effect()` in `cv-optimization.ts` |
| 16 | Scrollspy cleanup via `DestroyRef.onDestroy()` | Implemented | |
| 17 | Smooth-scroll from sidebar nav click to section | Implemented | `handleSectionClick()` |
| 18 | `SectionCard` — `id="section-{id}"` and `data-section="{id}"` attributes | Implemented | |
| 19 | `SectionCard` — `scroll-margin-top` to avoid header overlap | Implemented | In section-card CSS |
| 20 | `SectionCard` — status "completed": green pill badge | Implemented | `ocv-pill ocv-pill--success` |
| 21 | `SectionCard` — status "processing": amber spinner + "Processing" label | Implemented | |
| 22 | `SectionCard` — status "error": red `pi-times-circle` icon | Implemented | Plan decision: inline icon, no pill |
| 23 | `SectionCard` — status "pending": empty body | Implemented | No content rendered when pending |
| 24 | `SectionCard` — status "processing": shows `ProcessingPlaceholder` instead of content | Implemented | |
| 25 | `JobInfoBanner` — 40×40 icon square, job title, company name | Implemented | |
| 26 | `JobInfoBanner` — CV filename link (omitted if fileName null/empty) | Implemented | |
| 27 | `JobInfoBanner` — collapsible job description toggle | Implemented | `showDescription` signal |
| 28 | `JobInfoBanner` — emits `openCv` output (no `cvDownloadUrl` input per plan decision) | Implemented | Plan deviation: input dropped |
| 29 | `ExportFooter` — fixed position, `left` transitions with sidebar width | Implemented | `[style.left.px]` binding |
| 30 | `ExportFooter` — template `<select>`, Preview button, Export PDF, Export DOCX | Implemented | |
| 31 | `ExportFooter` — Preview opens `CvTemplatePreview` in `p-dialog` | Implemented | |
| 32 | `ExportFooter` — visibility controlled by `canExportCv()` (per plan decision) | Implemented | |
| 33 | Mobile tabs — one tab per section, flattened order | Implemented | |
| 34 | Mobile tabs — active tab: primary-600 + 2px bottom border | Implemented | |
| 35 | Mobile tabs — click smooth-scrolls to section card | Implemented | |
| 36 | Mobile tabs — scrollspy auto-scrolls active tab into view | Implemented | `effect()` in `mobile-tabs.ts` |
| 37 | Mobile tabs — hidden on desktop, shown only when `pageState !== 'initial'` | Implemented | |
| 38 | Tablet (769–840px): sidebar auto-collapses to 72px | Implemented | Media query in CSS |
| 39 | Mobile (≤768px): sidebar hidden; mobile tabs strip shown | Implemented | |
| 40 | Mobile: main content padding reduced | Implemented | |
| 41 | Mobile: export footer spans full width (`left: 0`) | Implemented | |
| 42 | Initial state: centred `InitialUploadForm` wrapping `<app-job-upload>` | Implemented | Pure layout wrapper with `max-width: 600px` |
| 43 | Initial state: no `JobInfoBanner`, no section cards, no export footer | Implemented | `@if (pageState() !== 'initial')` guards |
| 44 | Processing state: `JobInfoBanner` visible, incomplete sections show placeholder | Implemented | |
| 45 | Completed state: all sections show content, export footer appears | Implemented | |
| 46 | Status icons per section: completed/processing/error/pending/undefined | Implemented | `sectionStatus()` helper method |
| 47 | Retry buttons remain inside section card body, right-aligned | Implemented | |
| 48 | Load error state: error block centred, no sidebar active | Implemented | `@if (loadError())` at template root |
| 49 | Stored mode without results: amber info banner above section cards | Implemented | |
| 50 | No `jobApplicationId()`: export footer and export section card hidden | Implemented | |
| 51 | Sidebar collapsed + export footer: `left` transitions in sync | Implemented | |
| 52 | Missing CV filename: filename link omitted | Implemented | |
| 53 | Missing job title / company name: conditionally rendered | Implemented | |
| 54 | `sidebarExpanded = signal(true)` added to parent | Implemented | |
| 55 | `activeSection = signal(...)` added to parent | Implemented | |
| 56 | `pageState` computed signal added to parent | Implemented | |
| 57 | `sectionStatuses` computed signal derived from `results()` | Implemented | |
| 58 | `processingSet` computed signal | Implemented | |
| 59 | `atsScore` = `autopsyResult()?.overallScore ?? null` | Implemented | |
| 60 | `keywordScore` = `keywordGapResult()?.matchScore ?? null` | Implemented | |
| 61 | `sidebarWidth` computed signal (280 / 72) | Implemented | |
| 62 | `handleSectionClick()` method | Implemented | |
| 63 | `sectionStatus()` helper method | Implemented | |
| 64 | Remove `AccordionModule`, `OptimizationResultPanel`, `CvTemplateSelector` from imports | Implemented | |
| 65 | Add new component imports to parent | Implemented | |
| 66 | CSS `:root` layout tokens (`--header-h`, `--sidebar-w`, `--sidebar-w-collapsed`, spacing, radius, shadow, colors, typography) | Implemented | Moved to `styles.css` (deviation from plan) |
| 67 | All WCAG AA: focus rings, `aria-label` on icon-only buttons, sidebar nav items as `<button>` | Implemented | |
| 68 | Build passes | Not verified | Not run as part of this workflow |
| 69 | Lint passes | Not verified | Not run as part of this workflow |
| 70 | Type check passes | Not verified | Not run as part of this workflow |
| 71 | Existing unit tests pass | Not verified | Not run as part of this workflow |

---

## Files

### Created

| File | Type |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/models.ts` | New (SectionStatus type) |
| `apps/opticv-web/src/app/features/cv-optimization/components/processing-placeholder/processing-placeholder.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/processing-placeholder/processing-placeholder.css` | New styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/processing-placeholder/processing-placeholder.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.css` | New styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.css` | New styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.css` | New styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.css` | New styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.css` | New styles |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts` | New test |

### Modified

| File | Change summary |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Added signals, computed signals, scrollspy, `handleSectionClick`, `sectionStatus()`, updated imports |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Full rewrite: sidebar + main layout, section cards, export footer |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css` | Rewritten: layout classes, responsive rules; `:root` tokens moved to `styles.css` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Updated imports, stubs, added tests for new signals and computed values |
| `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.ts` | Modified (scroll-to-top fix noted in commit) |
| `apps/opticv-web/src/app/features/cv-optimization/components/cover-letter-editor/cover-letter-editor.html` | Modified (scroll-to-top fix noted in commit) |
| `apps/opticv-web/src/app/layout/top-header/top-header.ts` | Added "Job Posting" nav item |
| `apps/opticv-web/src/app/layout/top-header/top-header.spec.ts` | Updated for nav item change |
| `apps/opticv-web/src/app/layout/top-header/top-header.css` | Updated for nav item change |
| `apps/opticv-web/src/styles.css` | Added `:root` CSS design tokens (layout, colors, typography, spacing) |
| `apps/opticv-web/src/app/features/home/home.spec.ts` | Updated |

---

## Components

| Component | Plan file | Status |
|---|---|---|
| `ProcessingPlaceholderComponent` | `processing-placeholder/processing-placeholder.ts` | Exist |
| `SectionCardComponent` | `section-card/section-card.ts` | Exist |
| `JobInfoBannerComponent` | `job-info-banner/job-info-banner.ts` | Exist |
| `OptimSidebarComponent` | `optim-sidebar/optim-sidebar.ts` | Exist |
| `MobileTabsComponent` | `mobile-tabs/mobile-tabs.ts` | Exist |
| `ExportFooterComponent` | `export-footer/export-footer.ts` | Exist |

---

## Stores

No new NgRx stores were planned or created. State is managed with Angular signals on the parent component.

---

## Deviations from Plan

| # | Deviation |
|---|---|
| 1 | **CSS `:root` tokens placed in `styles.css` instead of `cv-optimization.css`**: Plan Step 0 specified adding design tokens to `cv-optimization.css`. They were placed in the global `styles.css` instead. |
| 2 | **Component-level CSS files created**: Plan specified "No CSS file (uses only global classes)" for `ProcessingPlaceholderComponent`. All six new components were given individual `.css` files. |
| 3 | **`top-header.ts` modified**: Not in the plan's file list. A "Job Posting" nav item was added to the application top header. |
| 4 | **`cover-letter-editor` modified**: Not in the plan's file list (marked "Untouched"). A scroll-to-top fix was applied to prevent Quill auto-focus from scrolling to the cover letter editor on page load. |
| 5 | **`models.ts` created**: Not in the plan's file list. A new `SectionStatus` type was extracted to a dedicated file. |
| 6 | **`home.spec.ts` modified**: Not in the plan's file list. Updated as a side effect of related changes. |
| 7 | **`styles.css` modified**: Not explicitly in the plan's file list as a modified file (plan listed `:root` additions in `cv-optimization.css`). |

---

## Additional Implementation

- `models.ts`: New file defining `SectionStatus = 'completed' | 'processing' | 'error' | 'pending' | undefined`, not mentioned in the plan.
- Job Posting nav item added to `top-header.ts` — sidebar navigation item linking to the cv-optimization page job posting section.
- Scroll-to-top fix in `cover-letter-editor` to prevent Quill auto-focus from hijacking the page scroll position on page refresh.
