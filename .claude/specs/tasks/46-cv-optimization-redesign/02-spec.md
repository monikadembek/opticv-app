# Task Specification

## Source

Task 46: CV Optimization Page Redesign

## Goal

Redesign the `/cv-optimization` page to match the new two-column layout from the Claude Design prototype: a sticky left sidebar for navigation and a scrollable main content area with card-based sections. Replace the current accordion-heavy single-column layout with a sidebar + section-card layout that matches the OptiCV design system.

## Context

The affected file tree:

```
apps/opticv-web/src/app/features/cv-optimization/
  cv-optimization.ts        ← main page component (layout owner)
  cv-optimization.html      ← main template (layout)
  cv-optimization.css       ← page-level styles
  components/
    ats-score/              ← ATS Analysis section content
    keyword-gap/            ← Keyword Gap section content
    summary-rewrite/        ← Summary Rewrite section content
    bullet-rewriter/        ← Bullet Upgrades section content
    cover-letter-editor/    ← Cover Letter section content
    interview-prep/         ← Interview Prep section content
    cv-template-selector/   ← Export CV section content
    cv-template-preview/    ← CV preview modal
    job-upload/             ← initial upload form
    optimization-result-panel/ ← loading/error wrapper
```

The top nav is **out of scope** — do not touch `app-header` or `app-layout`.

## Scope

### In scope

- New two-column layout: sticky sidebar (280 px expanded / 72 px collapsed) + scrollable main area
- `OptimSidebar` Angular component: navigation groups, status icons, mini score rings, collapse toggle
- `SectionCard` Angular component: card wrapper with icon, title, status badge/spinner, and body slot
- `JobInfoBanner` Angular component: job title, company, CV filename link, collapsible job description
- `ExportFooter` Angular component: fixed bottom bar (template picker, preview, PDF/DOCX buttons)
- Mobile tabs strip (≤768 px) to replace the desktop sidebar
- Scrollspy: active sidebar item tracks the visible section as the user scrolls
- Smooth-scroll from sidebar nav click to the corresponding section
- Processing skeleton / placeholder state inside each section card
- Page-level CSS for all new layout primitives (`.optim-layout`, `.optim-sidebar`, `.optim-main`, `.section-card`, `.job-banner`, `.export-footer`, `.mobile-tabs`, `.mobile-tab`)
- Initial / upload state: centred narrow form replaces the accordion in the main area; sidebar items dimmed
- All existing section component **interiors** remain unchanged; only their wrapper changes

### Out of scope

- Top nav menu / `app-header`
- Changes to section component logic (ATS, Keyword, Summary, Bullet, Cover Letter, Interview Prep, LinkedIn, Export interior components)
- Backend or API changes
- LinkedIn Updates section (remains a "coming soon" placeholder)
- New PrimeNG or npm dependencies

## Behavior

### Layout — desktop (>768 px)

1. The page renders with a **sticky sidebar** on the left and a **scrollable main** on the right inside `.optim-layout { display: flex; min-height: calc(100vh - header-height) }`.
2. **Sidebar** (`OptimSidebar`):
   - Two groups: "Resume Analysis" (ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades) and "Additional Materials" (Cover Letter, Interview Prep, LinkedIn Updates).
   - Export CV is not a sidebar nav item; it moves to the sticky footer after completion.
   - Each nav item shows: icon in a 32×32 rounded square (emerald background when active, neutral-100 otherwise), label (hidden when collapsed), status icon (`pi-check-circle` green / `pi-spin pi-spinner` amber / `pi-circle` neutral-300 for pending / nothing before processing starts).
   - When expanded (`width: 280px`) shows group labels (uppercase, slate-400, 11 px), item labels, and status icons.
   - When collapsed (`width: 72px`) shows only the icon square and a divider between groups.
   - At the top of the expanded sidebar, when results are available: two `MiniScore` SVG rings — ATS score and Keyword Match score.
   - At the bottom: a toggle button (`pi-chevron-left` / `pi-chevron-right`) that collapses/expands with a CSS transition.
   - In **initial state** all nav items are rendered at 45% opacity and are non-interactive.
3. **Main content** (`OptimMain`):
   - Background: `--neutral-50`.
   - Max-width: 920 px; padded `space-8` on all sides.
   - Shows `JobInfoBanner` at the top (only in stored/results mode).
   - Sections rendered in scroll order as `SectionCard` components.
   - **Scrollspy**: an `IntersectionObserver` watches `[data-section]` elements and updates `activeSection` signal to keep the sidebar highlight in sync as the user scrolls.
   - Clicking a sidebar nav item smooth-scrolls to `#section-{id}`.
4. **SectionCard** component:
   - White card, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-card)`, `margin-bottom: space-6`.
   - Header row: 36×36 emerald circle with PrimeIcon, `h2` title, right-aligned status badge.
     - Status "completed": green pill badge ("Completed").
     - Status "processing": amber spinner + "Processing" label.
     - Status "pending" / no status: nothing shown.
   - Body: `padding: space-6`. Hosts the existing section component.
   - When status is `"processing"`: shows `ProcessingPlaceholder` (spinner, "Analyzing your resume…", three skeleton shimmer lines) instead of child content.
   - `id="section-{id}"` and `data-section="{id}"` on the card root for scrollspy.
   - `scroll-margin-top: calc(header-height + 16px)` so sticky header does not overlap the card.
5. **JobInfoBanner**:
   - White card with shadow, `padding: space-5 space-6`, `margin-bottom: space-6`.
   - 40×40 emerald-50 icon square with `pi pi-folder` (primary-600).
   - Job title (Montserrat 18px semibold, text-strong) + company name (text-muted 13px).
   - CV filename link: `pi pi-file` icon + filename + " · View job description" toggle.
   - Collapsible job description text block (`--neutral-50` background, rounded, 13 px body).
6. **ExportFooter** (fixed bottom bar, visible only in "completed" state):
   - `position: fixed; bottom: 0; right: 0; left: var(--sidebar-w);` transitions when sidebar collapses.
   - White background, top border, soft shadow.
   - Left: palette icon + "Template:" label + `<select>` (ATS Classic / Modern / Executive).
   - Right: "Preview" outline button, "Export PDF" primary button, "Export DOCX" outline button.
   - Preview opens the existing `CvPreviewModal` (already inside `cv-template-preview`).

### Layout — tablet (769–840 px)

- Sidebar auto-collapses to `width: 72px` (icon-only), labels/scores/group-labels hidden via CSS.

### Layout — mobile (≤768 px)

- Sidebar hidden entirely (`display: none`).
- **Mobile tabs strip**: horizontally scrollable row of icon+label tabs, sticky below header.
  - One tab per section item (same order as sidebar groups, flattened).
  - Active tab: primary-600 text + 2 px bottom border.
  - Clicking a tab smooth-scrolls to the section card.
  - Scrollspy auto-scrolls the active tab into view.
- Main content padding reduced to `space-4`.
- Export footer spans full width (`left: 0`), wraps buttons at narrow widths.

### Initial state (no job application loaded yet)

- Sidebar renders but all items are dimmed/non-interactive.
- Main content shows centred `InitialUploadForm` (max-width 600px, centred):
  - Page heading "CV Optimization" (Montserrat, text-3xl, bold).
  - Sub-heading "Select your CV and paste the job description to start." (text-muted).
  - White card (`.job-banner`) containing:
    - `<select>` for CV selection (label "Select CV").
    - Company name input.
    - Job title input.
    - Job description `<textarea>` (6 rows).
    - Notes `<textarea>` (3 rows, optional).
    - Primary button "Start optimization process" with `pi pi-bolt` icon.
  - This replaces the current `<p-accordion>` / `<app-job-upload>` block.
- No `JobInfoBanner`, no section cards, no export footer shown.

### Processing state

- `JobInfoBanner` visible.
- Sections that have not yet returned results show `ProcessingPlaceholder`.
- Sections that have completed show their content.
- Export footer not shown.

### Completed state

- All sections show their content.
- Export footer appears.

### Status icons per section

| Status value | Icon | Color |
|---|---|---|
| `"completed"` | `pi-check-circle` | `--success` (#059669) |
| `"processing"` | `pi-spin pi-spinner` | `--warning` (#f59e0b) |
| `"error"` | `pi-times-circle` | `--critical` (#b91c1c) |
| `"pending"` | `pi-circle` | `--neutral-300` |
| `undefined` / not started | — | — |

### Retry buttons

Retry buttons (existing feature) remain inside the section card body, below the section component, right-aligned. Layout unchanged.

## Edge Cases

- **Load error**: if `loadError()` is set, show the existing error block (red message + "Back to Dashboard" button) centred in the main area; no sidebar navigation active.
- **Stored mode without results** (`hasPartialStoredResults()`): amber info banner renders inside the main content area above the section cards (same as today).
- **No `jobApplicationId()`**: Export footer and export section card are hidden (existing guard `canExportCv()` / `jobApplicationId()` logic unchanged).
- **Sidebar collapsed + export footer**: footer `left` transitions to `var(--sidebar-w-collapsed)` (72 px) in sync with sidebar width CSS transition.
- **Missing CV filename**: the filename link in `JobInfoBanner` is omitted if `cvDocument.fileName` is null/empty.
- **Missing job title / company name**: each field is conditionally rendered.

## Data / API

No new API endpoints or data model changes. All data bindings (`jobApplication()`, `results()`, `isProcessing()`, `autopsyResult()`, etc.) remain on the existing `cv-optimization.ts` component class.

New signals/state needed on `cv-optimization.ts`:
- `sidebarExpanded = signal(true)` — toggled by sidebar collapse button.
- `activeSection = signal('ats')` — updated by scrollspy and sidebar clicks.

## Component breakdown

New Angular components to create:

| Component | Selector | Location |
|---|---|---|
| `OptimSidebarComponent` | `app-optim-sidebar` | `components/optim-sidebar/` |
| `SectionCardComponent` | `app-section-card` | `components/section-card/` |
| `JobInfoBannerComponent` | `app-job-info-banner` | `components/job-info-banner/` |
| `ExportFooterComponent` | `app-export-footer` | `components/export-footer/` |
| `MobileTabsComponent` | `app-mobile-tabs` | `components/mobile-tabs/` |
| `ProcessingPlaceholderComponent` | `app-processing-placeholder` | `components/processing-placeholder/` |

`OptimSidebarComponent` inputs:
- `activeSection = input<string>()`
- `statuses = input<Map<string, string>>()` (reuse existing `results()` map)
- `expanded = input<boolean>()`
- `atsScore = input<number | null>(null)`
- `keywordScore = input<number | null>(null)`
- `pageState = input<'initial' | 'processing' | 'completed'>()`

`OptimSidebarComponent` outputs:
- `sectionClicked = output<string>()`
- `toggleClicked = output<void>()`

`SectionCardComponent` inputs:
- `sectionId = input.required<string>()`
- `icon = input.required<string>()` (PrimeIcon class, e.g. `'pi-chart-bar'`)
- `title = input.required<string>()`
- `status = input<string | undefined>(undefined)` (`'completed'` | `'processing'` | `'error'` | `'pending'` | undefined)

`SectionCardComponent`: uses `ng-content` to project the section interior.

`ExportFooterComponent` inputs:
- `sidebarWidth = input<number>(280)` (px — for `left` positioning)
- `selectedTemplate = model<string>()` (two-way binding for template selection)
- `isExportingPdf = input<boolean>(false)`
- `isExportingDocx = input<boolean>(false)`

`ExportFooterComponent` outputs:
- `exportPdf = output<void>()`
- `exportDocx = output<void>()`

`MobileTabsComponent` inputs:
- `activeSection = input<string>()`
- `statuses = input<Map<string, string>>()`

`MobileTabsComponent` outputs:
- `sectionClicked = output<string>()`

`JobInfoBannerComponent` inputs:
- `jobApplication = input.required<JobApplication>()`
- `cvDownloadUrl = input<string | null>(null)`

`JobInfoBannerComponent` outputs:
- `openCv = output<void>()`

## Design tokens used

All tokens come from the existing design system already available in the app (the OptiCV CSS token set in `src/assets/css/colors.css` and equivalents):

| Token | Value |
|---|---|
| `--primary-50/600/700` | emerald shades |
| `--neutral-50/100/200/300/400` | slate shades |
| `--text-strong/body/muted/subtle` | text semantic |
| `--border-subtle` | `--neutral-200` |
| `--shadow-card` | `0 2px 8px rgba(15,23,42,.06)` |
| `--radius-md/lg/full` | 8/12/9999px |
| `--success/warning/critical` | semantic colors |
| `--space-*` | 4px grid |
| `--duration-fast/base` | transition durations |
| `--ease-standard` | cubic-bezier(.4,0,.2,1) |
| `--font-heading/body` | Montserrat / Lato |

CSS variables for layout dimensions (add to `:root` in `cv-optimization.css`):

```css
--sidebar-w: 280px;
--sidebar-w-collapsed: 72px;
--header-h: 64px;
```

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`).
- Lint passes (`npm exec nx lint opticv-web`).
- Type check passes (`npm exec nx typecheck opticv-web`).
- Existing unit tests pass without modification (`npm exec nx test opticv-web`).
- No breaking changes to existing section component APIs (inputs/outputs unchanged).
- Sidebar collapses and expands with CSS transition; active section updates on scroll.
- Mobile view (≤768 px) shows tab strip instead of sidebar.
- Export footer appears only in "completed" state (when `jobApplicationId()` is set and results are available).
- Initial upload form is shown when there is no current job application context.
- All WCAG AA requirements met: focus rings on all interactive elements, ARIA labels on icon-only buttons (`aria-label="Collapse sidebar"` / `"Expand sidebar"`), sidebar nav items are `<button>` elements with visible focus.
- AXE automated checks pass.
