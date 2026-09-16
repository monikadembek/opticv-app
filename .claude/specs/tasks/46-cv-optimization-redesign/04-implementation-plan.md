# Implementation Plan

## Task ID: 46-cv-optimization-redesign

---

## Pre-implementation decisions (resolving PASS WITH ISSUES findings)

These decisions are made here so that no ambiguity reaches the implementation steps.

| Issue | Decision |
|---|---|
| `InitialUploadForm` vs. `job-upload` | Keep the existing `JobUpload` component as the sole form owner. The new `InitialUploadForm` is a pure layout wrapper (heading, sub-heading, white card) that hosts `<app-job-upload>` as a child. No logic is duplicated. |
| `statuses` input type | `OptimSidebarComponent` and `MobileTabsComponent` accept `statuses = input<Map<PromptType, string>>()`. The parent derives this with `computed(() => new Map([...this.results().entries()].map(([k, v]) => [k, v.status])))`. An additional `processingSet = input<Set<PromptType>>()` distinguishes the actively-processing state from the result map. |
| `optimization-result-panel` fate | **Remove** `OptimizationResultPanel` from the page template. Its three responsibilities are absorbed: (a) loading → `SectionCard` shows `ProcessingPlaceholder` when `isProcessing` is true; (b) error → `SectionCard` shows an error block when status is `'failed'`; (c) no-data → sections simply don't render their child until `hasData` is true (guarded with `@if`). |
| `"error"` status in `SectionCard` header | Show a red `pi-times-circle` icon inline in the header, same alignment as the spinner for processing. No pill badge. |
| `pending` body content | `SectionCard` body is empty (no `<ng-content>`, no placeholder) when status is `'pending'`. |
| `ExportFooter` visibility | Controlled by `canExportCv()` (existing computed signal). Not a new "completed state" flag. This preserves the selection-required behaviour in non-stored mode. |
| `pageState` derivation | `pageState = computed<'initial' | 'processing' | 'completed'>(() => { if (!this.jobApplicationId()) return 'initial'; if (this.isProcessingAny()) return 'processing'; return 'completed'; })` — added to `cv-optimization.ts`. |
| `atsScore` / `keywordScore` sources | `autopsyResult()?.overallScore ?? null` and `keywordGapResult()?.matchScore ?? null`. |
| `cvDownloadUrl` input | Drop it. `JobInfoBannerComponent` emits `openCv = output<void>()` only; the parent calls `openOriginalCv()`. |
| `ExportSection` as `SectionCard` | Not created. Export CV lives only in `ExportFooter`. `CvTemplateSelector` is removed from the scroll area entirely. |
| Header height | Actual header is `5.5rem` (88px). CSS variable `--header-h: 5.5rem` is used throughout (not 64px). |
| CSS design tokens | The app has no `--space-*`, `--radius-*`, `--shadow-card`, `--duration-*`, `--ease-*` tokens. These are defined in `cv-optimization.css` as local `:root` additions scoped to the feature. |
| Mobile tabs initial state | `MobileTabsComponent` is only rendered when `pageState()` is not `'initial'`. |
| Scrollspy cleanup | `IntersectionObserver` is registered inside an Angular `effect()` that stores the observer reference and disconnects it via `DestroyRef.onDestroy()`. |

---

## Step 0 — Add CSS layout tokens to `cv-optimization.css`

**File:** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css`

Replace the existing single `.section-heading` rule with a new file that adds the layout tokens to `:root` and replaces `.section-heading` with nothing (the class is no longer used in the redesigned template).

Add to `:root`:
```
--header-h: 5.5rem;
--sidebar-w: 280px;
--sidebar-w-collapsed: 72px;
--shadow-card: 0 2px 8px rgba(15, 23, 42, 0.06);
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px; --space-12: 48px;
--duration-fast: 150ms;
--duration-base: 300ms;
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem;
--text-lg: 1.125rem; --text-xl: 1.25rem; --text-3xl: 1.875rem;
--weight-regular: 400; --weight-semibold: 600; --weight-bold: 700;
```

Also add the semantic color aliases that the design uses but are absent from `colors.css`:
```
--primary-50: #ecfdf5;  --primary-600: #059669; --primary-700: #047857;
--neutral-50: #f8fafc;  --neutral-100: #f1f5f9; --neutral-200: #e2e8f0;
--neutral-300: #cbd5e1; --neutral-400: #94a3b8;
--text-strong: #0f172a; --text-body: #334155;
--text-muted: #64748b;  --text-subtle: #94a3b8;
--border-subtle: #e2e8f0;
--success: #059669;  --warning: #f59e0b; --critical: #b91c1c;
--font-heading: Montserrat, ui-sans-serif, system-ui, sans-serif;
--font-body: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Add page-level layout CSS classes (see Behavior sections below for exact values):
- `.optim-layout`, `.optim-sidebar`, `.optim-sidebar.collapsed`
- `.sidebar-scores`, `.sidebar-group-label`, `.sidebar-divider`
- `.sidebar-nav`, `.nav-item`, `.nav-item.active`, `.nav-item.dimmed`
- `.nav-item__icon`, `.nav-item__label`, `.nav-item__status`
- `.sidebar-toggle`, `.sidebar-toggle button`
- `.optim-main`, `.optim-content`
- `.job-banner`
- `.section-card`, `.section-card__header`, `.section-card__icon`
- `.section-card__title`, `.section-card__body`
- `.processing-state`, `.skeleton`, `@keyframes shimmer`
- `.export-footer`
- `.mobile-tabs`, `.mobile-tab`, `.mobile-tab.active`
- Responsive media queries: ≤768px, 769–840px

---

## Step 1 — Create `ProcessingPlaceholderComponent`

**File (new):** `apps/opticv-web/src/app/features/cv-optimization/components/processing-placeholder/processing-placeholder.ts`

- Inline template: spinner icon + "Analyzing your resume…" paragraph + three `.skeleton` divs.
- `ChangeDetectionStrategy.OnPush`.
- No inputs.
- No CSS file (uses only global classes from `cv-optimization.css`).

---

## Step 2 — Create `SectionCardComponent`

**File (new):** `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.ts`

Inputs:
- `sectionId = input.required<string>()`
- `icon = input.required<string>()` (PrimeIcon class e.g. `'pi-chart-bar'`)
- `title = input.required<string>()`
- `status = input<string | undefined>(undefined)`

Template structure (inline or external `.html`):
```
<div [id]="'section-' + sectionId()" [attr.data-section]="sectionId()" class="section-card">
  <div class="section-card__header">
    <div class="section-card__icon"><i [class]="'pi ' + icon()"></i></div>
    <h2 class="section-card__title">{{ title() }}</h2>
    @if (status() === 'completed') { <span class="ocv-pill ocv-pill--success">Completed</span> }
    @if (status() === 'processing') { <span ...>spinner + "Processing"</span> }
    @if (status() === 'error') { <i class="pi pi-times-circle" style="color: var(--critical)"></i> }
  </div>
  <div class="section-card__body">
    @if (status() === 'processing' || status() === 'pending') {
      @if (status() === 'processing') { <app-processing-placeholder /> }
    } @else {
      <ng-content />
    }
  </div>
</div>
```

Imports: `ProcessingPlaceholderComponent`.
`ChangeDetectionStrategy.OnPush`.

---

## Step 3 — Create `JobInfoBannerComponent`

**File (new):** `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.ts`

Inputs:
- `jobApplication = input.required<JobApplicationWithCv>()`

Outputs:
- `openCv = output<void>()`

Local signal: `showDescription = signal(false)`

Template (external `.html`):
- Root div with class `job-banner`.
- 40×40 icon square (primary-50 bg, `pi pi-folder`).
- Job title + company name from `jobApplication()`.
- CV filename link: renders only when `jobApplication().cvDocument.fileName` is truthy; clicking emits `openCv`.
- Toggle button for job description. Uses `showDescription` signal.
- `@if (showDescription())` block with job description text.

`ChangeDetectionStrategy.OnPush`. Import `JobApplicationWithCv` from `@opticv/datatypes`.

---

## Step 4 — Create `OptimSidebarComponent`

**File (new):** `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts`

Inputs:
- `activeSection = input<string>('ats')`
- `statuses = input<Map<PromptType, string>>(new Map())`
- `processingSet = input<Set<PromptType>>(new Set())`
- `expanded = input<boolean>(true)`
- `atsScore = input<number | null>(null)`
- `keywordScore = input<number | null>(null)`
- `pageState = input<'initial' | 'processing' | 'completed'>('initial')`

Outputs:
- `sectionClicked = output<string>()`
- `toggleClicked = output<void>()`

Internal constant (in the `.ts` file, not an input):
```ts
const NAV_GROUPS = [
  { group: 'Resume Analysis', items: [
    { id: PromptType.RESUME_AUTOPSY, icon: 'pi-chart-bar', label: 'ATS Analysis' },
    { id: PromptType.KEYWORD_GAP, icon: 'pi-key', label: 'Keyword Gap' },
    { id: PromptType.SUMMARY_REWRITE, icon: 'pi-pen-to-square', label: 'Summary Rewrite' },
    { id: PromptType.BULLET_UPGRADE, icon: 'pi-list-check', label: 'Bullet Upgrades' },
  ]},
  { group: 'Additional Materials', items: [
    { id: PromptType.COVER_LETTER, icon: 'pi-file-edit', label: 'Cover Letter' },
    { id: PromptType.INTERVIEW_PREP, icon: 'pi-comments', label: 'Interview Prep' },
    { id: PromptType.LINKEDIN_REWRITE, icon: 'pi-link', label: 'LinkedIn Updates' },
  ]},
];
```

Computed: `showScores = computed(() => this.pageState() !== 'initial' && this.expanded() && this.atsScore() !== null)`

Template (external `.html`):
- `:host` bound with `[class.collapsed]="!expanded()"`.
- `<aside class="optim-sidebar">` (or use `:host` as the aside via `host: { class: 'optim-sidebar' }`).
- Mini score rings section (SVG inline): two rings for ATS and Keyword scores, shown via `showScores()`.
- `<nav class="sidebar-nav">`: `@for (group of NAV_GROUPS)`, renders group label when `expanded()`, nav items as `<button>` elements.
- Each nav item button: `[class.active]="activeSection() === item.id"`, `[class.dimmed]="pageState() === 'initial'"`, `(click)="sectionClicked.emit(item.id)"`, `[disabled]="pageState() === 'initial'"`, `[title]="!expanded() ? item.label : null"`.
- Status icon inside each nav item (when `expanded()`): check `processingSet().has(item.id)` for spinner; else check `statuses().get(item.id)` for completed/error/pending icons.
- Sidebar toggle button at bottom.

`ChangeDetectionStrategy.OnPush`.

---

## Step 5 — Create `MobileTabsComponent`

**File (new):** `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.ts`

Inputs:
- `activeSection = input<string>('ats')`
- `statuses = input<Map<PromptType, string>>(new Map())`

Outputs:
- `sectionClicked = output<string>()`

Uses the same flattened `NAV_GROUPS` array (defined once in a shared constant file or duplicated).

Template: `<div class="mobile-tabs">` with `@for` over all items. Each `<button class="mobile-tab" [class.active]="activeSection() === item.id">` shows icon + first word of label.

Local effect: when `activeSection()` changes, scroll the active tab button into view using `ElementRef` / `ViewChildren`.

`ChangeDetectionStrategy.OnPush`.

---

## Step 6 — Create `ExportFooterComponent`

**File (new):** `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`

Inputs:
- `sidebarWidth = input<number>(280)`
- `selectedTemplate = model<CvTemplateId>('ats')`
- `isExportingPdf = input<boolean>(false)`
- `isExportingDocx = input<boolean>(false)`

Outputs:
- `exportPdf = output<void>()`
- `exportDocx = output<void>()`

Local signal: `previewVisible = signal(false)`

Template (external `.html`):
- `<div class="export-footer" [style.left.px]="sidebarWidth()">`.
- Left: `<i class="pi pi-palette">`, "Template:" label, `<select>` bound to `selectedTemplate` model.
- Middle: "Preview" PrimeNG `p-button` outline that sets `previewVisible(true)`.
- Right: "Export PDF" primary `p-button` (`[loading]="isExportingPdf()"`, `(onClick)="exportPdf.emit()"`), "Export DOCX" outline.
- `<app-cv-template-selector>` is **not** used here; the footer uses a plain `<select>` with template IDs.
- `<app-cv-template-preview>` or the existing `<p-dialog>` preview from `CvTemplateSelector` — **reuse the existing `CvTemplateSelector` preview dialog** by extracting the preview state or use a separate `<p-dialog>` in the footer with `<app-cv-template-preview>` as content. Decision: host the preview via `CvTemplatePreview` component in a PrimeNG `p-dialog` within the footer.

`ChangeDetectionStrategy.OnPush`. Imports: `ButtonModule`, `DialogModule`, `CvTemplatePreview`, `FormsModule`.

---

## Step 7 — Update `cv-optimization.ts` (parent component)

**File (modified):** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`

### 7a — New signals

Add to the component class:
```ts
readonly sidebarExpanded = signal(true);
readonly activeSection = signal<string>(PromptType.RESUME_AUTOPSY);
```

### 7b — New computed signals

```ts
readonly pageState = computed<'initial' | 'processing' | 'completed'>(() => {
  if (!this.jobApplicationId()) return 'initial';
  if (this.isProcessingAny()) return 'processing';
  return 'completed';
});

readonly sectionStatuses = computed(() =>
  new Map(
    [...this.results().entries()].map(([k, v]) => [k, v.status])
  )
);

readonly processingSet = computed(() => {
  const set = new Set<PromptType>();
  for (const [k, v] of this.isProcessing().entries()) {
    if (v) set.add(k);
  }
  return set;
});

readonly atsScore = computed(() => this.autopsyResult()?.overallScore ?? null);
readonly keywordScore = computed(() => this.keywordGapResult()?.matchScore ?? null);
readonly sidebarWidth = computed(() => this.sidebarExpanded() ? 280 : 72);
```

### 7c — Scrollspy setup

Add `AfterViewInit` lifecycle or use an Angular `afterNextRender` / `effect()`:
- After results are available (when `pageState()` moves to `processing` or `completed`), register an `IntersectionObserver` on all `[data-section]` elements.
- Observer callback: `this.activeSection.set(entry.target.getAttribute('data-section') ?? '')` for the intersecting entry.
- `rootMargin: '-30% 0px -50% 0px'`.
- Store the observer reference. In `DestroyRef.onDestroy()`, call `observer.disconnect()`.
- Re-run setup when `pageState()` changes from `'initial'` to non-initial (use `effect()`).

### 7d — `handleSectionClick` method

```ts
handleSectionClick(id: string): void {
  this.activeSection.set(id);
  const el = document.getElementById(`section-${id}`);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - (5.5 * 16 + 16);
    window.scrollTo({ top, behavior: 'smooth' });
  }
}
```

### 7e — Update imports array

Remove: `AccordionModule`, `OptimizationResultPanel`, `CvTemplateSelector`.
Add: `OptimSidebarComponent`, `SectionCardComponent`, `JobInfoBannerComponent`, `ExportFooterComponent`, `MobileTabsComponent`.

---

## Step 8 — Rewrite `cv-optimization.html`

**File (modified):** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

Full new structure:

```
@if (loadError()) {
  <!-- existing error block, centred in main -->
} @else {
  <!-- Mobile tabs (hidden in initial state) -->
  @if (pageState() !== 'initial') {
    <app-mobile-tabs
      [activeSection]="activeSection()"
      [statuses]="sectionStatuses()"
      (sectionClicked)="handleSectionClick($event)"
    />
  }

  <div class="optim-layout">
    <!-- Sidebar -->
    <app-optim-sidebar
      [activeSection]="activeSection()"
      [statuses]="sectionStatuses()"
      [processingSet]="processingSet()"
      [expanded]="sidebarExpanded()"
      [atsScore]="atsScore()"
      [keywordScore]="keywordScore()"
      [pageState]="pageState()"
      (sectionClicked)="handleSectionClick($event)"
      (toggleClicked)="sidebarExpanded.set(!sidebarExpanded())"
    />

    <!-- Main content -->
    <main class="optim-main">
      <div class="optim-content">
        @if (pageState() === 'initial') {
          <!-- Initial upload form wrapper -->
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h2>CV Optimization</h2>
              <p>Select your CV and paste the job description to start.</p>
            </div>
            <div class="job-banner">
              <app-job-upload (jobSubmitted)="runOptimization($event)" />
            </div>
          </div>
        } @else {
          <!-- Job info banner -->
          @if (jobApplication()) {
            <app-job-info-banner
              [jobApplication]="jobApplication()!"
              (openCv)="openOriginalCv()"
            />
          }

          <!-- Partial results warning -->
          @if (hasPartialStoredResults()) {
            <div class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              <i class="pi pi-info-circle mr-2"></i>
              Some optimization results are unavailable for this stored optimization.
            </div>
          }

          <!-- Section cards -->
          <app-section-card
            sectionId="ats"
            icon="pi-chart-bar"
            title="ATS Analysis"
            [status]="sectionStatus(PromptType.RESUME_AUTOPSY)"
          >
            @if (autopsyResult()) {
              <app-ats-score [data]="autopsyResult()!" />
            }
            <!-- retry button -->
            @if (retryablePromptTypes().has(PromptType.RESUME_AUTOPSY)) {
              <div class="mt-4 flex justify-end">
                <p-button label="Retry" ... (onClick)="retryOptimization(PromptType.RESUME_AUTOPSY)" />
              </div>
            }
          </app-section-card>

          <!-- repeat pattern for: keywords, summary, bullets, cover-letter, interview, linkedin -->
          <!-- LinkedIn: always shows "coming soon" content, no status-gated logic -->
        }
      </div>
    </main>
  </div>

  <!-- Export footer -->
  @if (canExportCv() && jobApplicationId()) {
    <app-export-footer
      [sidebarWidth]="sidebarWidth()"
      [(selectedTemplate)]="selectedTemplate"
      [isExportingPdf]="isExportingPdf()"
      [isExportingDocx]="isExportingDocx()"
      (exportPdf)="exportCvAsPdf()"
      (exportDocx)="exportCvAsDocx()"
    />
  }
}
```

### `sectionStatus()` helper method on the component

```ts
sectionStatus(type: PromptType): string | undefined {
  if (this.isProcessing().get(type)) return 'processing';
  const r = this.results().get(type);
  if (!r) return undefined;
  return r.status === 'completed' ? 'completed' : r.status === 'failed' ? 'error' : 'pending';
}
```

---

## Step 9 — Clean up `cv-optimization.css`

Remove the `.section-heading` rule (no longer used). The file now contains only the `:root` token definitions and layout classes added in Step 0.

---

## Step 10 — Update unit tests

**File (modified):** `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts`

- Replace `AccordionModule` and `OptimizationResultPanel` in `TestBed` imports with the new components (or stub them).
- Verify that `pageState` signal returns `'initial'` when `jobApplicationId()` is null.
- Verify `sectionStatuses` computed returns the correct string map.
- Verify `handleSectionClick` updates `activeSection`.
- Existing behaviour tests remain valid; update selectors from `p-accordion-panel` to `app-section-card`.

**Files (new, minimal tests):**

Each new component gets a `.spec.ts` with a single `should create` smoke test:
- `processing-placeholder.spec.ts`
- `section-card.spec.ts`
- `job-info-banner.spec.ts`
- `optim-sidebar.spec.ts`
- `mobile-tabs.spec.ts`
- `export-footer.spec.ts`

---

## File list

### Created

| File | Type |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/processing-placeholder/processing-placeholder.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/processing-placeholder/processing-placeholder.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/job-info-banner/job-info-banner.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/optim-sidebar/optim-sidebar.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/mobile-tabs/mobile-tabs.spec.ts` | New test |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts` | New component |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html` | New template |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.spec.ts` | New test |

### Modified

| File | Change summary |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add signals, computed signals, scrollspy, `handleSectionClick`, `sectionStatus()`, update imports |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Full rewrite: sidebar + main layout, section cards, export footer |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.css` | Full rewrite: add `:root` tokens + all layout CSS classes |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.spec.ts` | Update stubs/imports, add tests for new signals |

### Untouched (existing components, no changes)

- `components/ats-score/`
- `components/keyword-gap/`
- `components/summary-rewrite/`
- `components/bullet-rewriter/`
- `components/cover-letter-editor/`
- `components/interview-prep/`
- `components/cv-template-selector/`
- `components/cv-template-preview/`
- `components/job-upload/`
- `components/optimization-result-panel/` *(kept in codebase, just removed from this page's template)*
- `services/`, `utils/`, `cv-templates.ts`

---

## Implementation order

1. Step 0 — CSS tokens (no dependencies)
2. Step 1 — `ProcessingPlaceholderComponent` (no dependencies)
3. Step 2 — `SectionCardComponent` (depends on Step 1)
4. Step 3 — `JobInfoBannerComponent` (no dependencies)
5. Step 4 — `OptimSidebarComponent` (no dependencies)
6. Step 5 — `MobileTabsComponent` (no dependencies)
7. Step 6 — `ExportFooterComponent` (depends on `CvTemplatePreview` which already exists)
8. Step 7 — Update `cv-optimization.ts` (depends on all new components)
9. Step 8 — Rewrite `cv-optimization.html` (depends on Step 7)
10. Step 9 — Clean up `cv-optimization.css` (done as part of Step 0)
11. Step 10 — Tests
