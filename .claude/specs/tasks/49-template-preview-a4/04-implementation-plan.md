# Implementation Plan

## Task: 49 — Template preview A4 format

Based on: `02-spec.md` · Review: PASS WITH ISSUES (non-critical issues resolved below)

---

## Resolution of Review Issues Before Implementation

| Review issue | Resolution in this plan |
|---|---|
| `effect()` vs `afterNextRender()` ambiguity | Use `afterNextRender()` inside an `effect()` — the effect tracks signal changes and schedules a post-render measurement after every relevant input change |
| Spinner condition unclear | Use a dedicated `measuring = signal<boolean>(false)` flag; set `true` before measurement, `false` after |
| `pages` signal drives `@for` | Use `pages = signal<number[]>([])` (array of indices); `@for (i of pages())` iterates directly |
| Missing "tests added" acceptance criterion | A spec file `cv-a4-preview.spec.ts` is included in the plan |

---

## Constants (defined once, imported where needed)

Declare in the new component file (not a separate constants file — scope is local):

```
A4_WIDTH_PX  = 794
A4_HEIGHT_PX = 1123
```

---

## Step 1 — Create `CvA4Preview` component (TS)

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.ts`

### Inputs
- `cv = input.required<CvStructuredData | null>()`
- `templateId = input.required<CvTemplateId | null>()`
- `accentColor = input<string>(DEFAULT_ACCENT_COLOR)`

### Signals
- `pages = signal<number[]>([])` — array of page indices (e.g. `[0, 1, 2]`); length drives the `@for` loop
- `measuring = signal<boolean>(false)` — `true` while DOM measurement is pending

### ViewChild
- `hiddenContainer = viewChild.required<ElementRef<HTMLElement>>('hiddenContainer')` — reference to the off-screen measurement div

### Lifecycle / change detection
1. Inject `PLATFORM_ID` and check `isPlatformBrowser` — all DOM work is guarded by this check.
2. Inside the constructor, call `effect(() => { this.cv(); this.templateId(); this.accentColor(); })` to register input dependencies.
3. Inside that effect, set `this.measuring.set(true)` and schedule measurement via `afterNextRender(() => this.measure())`.
4. `measure()` method (private):
   - Returns early if not in browser or `hiddenContainer` is not yet available.
   - Reads `hiddenContainer().nativeElement.scrollHeight`.
   - Calculates `count = Math.ceil(scrollHeight / A4_HEIGHT_PX)`, minimum 1 when `cv()` is non-null.
   - Sets `pages.set(Array.from({ length: count }, (_, i) => i))`.
   - Sets `measuring.set(false)`.

### Imports to declare
- `CvTemplatePreview`
- `ProgressSpinner` (from `primeng/progressspinner`) — for the loading state

### Decorator
```
@Component({
  selector: 'app-cv-a4-preview',
  templateUrl: './cv-a4-preview.html',
  styleUrl: './cv-a4-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CvTemplatePreview, ProgressSpinner],
})
```

---

## Step 2 — Create `CvA4Preview` template

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.html`

### Structure

```
<div class="a4-preview-root">

  <!-- Hidden off-screen measurement container -->
  <div #hiddenContainer class="a4-hidden-container" aria-hidden="true">
    <app-cv-template-preview
      [cv]="cv()"
      [templateId]="templateId()"
      [accentColor]="accentColor()"
    />
  </div>

  <!-- Loading state -->
  @if (measuring()) {
    <div class="a4-spinner-wrapper">
      <p-progressSpinner strokeWidth="4" />
    </div>
  }

  <!-- Page stack (shown once measuring is done) -->
  @if (!measuring()) {
    <div class="a4-pages-wrapper">
      @for (i of pages(); track i) {
        <div class="a4-page" aria-label="Page {{ i + 1 }} of {{ pages().length }}">
          <div
            class="a4-page-clip"
            [style.transform]="'translateY(-' + (i * 1123) + 'px)'"
          >
            <app-cv-template-preview
              [cv]="cv()"
              [templateId]="templateId()"
              [accentColor]="accentColor()"
            />
          </div>
        </div>
      }
    </div>
  }

</div>
```

**Note:** `CvTemplatePreview` is rendered twice per page render cycle — once in the hidden container (for measurement) and once per visible page (for clipping). The hidden instance is always present in the DOM so measurement can happen immediately on input change without a conditional render guard.

---

## Step 3 — Create `CvA4Preview` styles

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.css`

### Rules

```
/* Off-screen measurement container */
.a4-hidden-container {
  position: absolute;
  left: -9999px;
  top: 0;
  width: 794px;
  visibility: hidden;
  pointer-events: none;
}

/* Root wrapper fills available dialog content area */
.a4-preview-root {
  position: relative;
  background: #e5e7eb; /* Tailwind neutral-200 — page area grey */
  padding: 24px 16px;
  min-height: 200px;
}

/* Spinner centering */
.a4-spinner-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* Vertical stack of A4 pages with gaps */
.a4-pages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

/* Individual A4 sheet */
.a4-page {
  width: 794px;
  height: 1123px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

/* Clipping inner div — shifts the full template upward to show the correct page slice */
.a4-page-clip {
  width: 794px;
}

/* Narrow viewport scaling — scale down A4 card to fit dialog width */
@media (max-width: 900px) {
  .a4-page {
    width: min(794px, calc(95vw - 32px));
    height: calc(min(794px, calc(95vw - 32px)) * 1.414);
    transform-origin: top left;
  }

  .a4-page-clip {
    transform-origin: top left;
    transform: scale(calc(min(794px, calc(95vw - 32px)) / 794));
  }
}
```

**Note on narrow-viewport scaling:** The media-query approach is used here instead of a `ResizeObserver` to avoid SSR complexity. The scale factor is computed in CSS using `min()` and `calc()`, which is client-rendered naturally and does not require `isPlatformBrowser` guards.

---

## Step 4 — Update `ExportFooter` template

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html`

### Changes to the preview `p-dialog` block only

Replace:
```html
<p-dialog
  header="CV Preview"
  [visible]="previewVisible()"
  (visibleChange)="$event ? null : previewVisible.set(false)"
  [modal]="true"
  [style]="{ width: '900px', maxWidth: '95vw' }"
  [draggable]="false"
>
  <app-cv-template-preview
    [cv]="mergedCv()"
    [templateId]="selectedTemplate()"
    [accentColor]="accentColor()"
  />
</p-dialog>
```

With:
```html
<p-dialog
  header="CV Preview"
  [visible]="previewVisible()"
  (visibleChange)="$event ? null : previewVisible.set(false)"
  [modal]="true"
  [style]="{ width: '900px', maxWidth: '95vw' }"
  [contentStyle]="{ padding: '0', overflowY: 'auto', height: '90vh' }"
  [draggable]="false"
>
  <app-cv-a4-preview
    [cv]="mergedCv()"
    [templateId]="selectedTemplate()"
    [accentColor]="accentColor()"
  />
</p-dialog>
```

No other changes in this file.

---

## Step 5 — Update `ExportFooter` component class

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts`

- Add `CvA4Preview` to the `imports` array of the `@Component` decorator.
- Import `CvA4Preview` from `'../cv-a4-preview/cv-a4-preview'`.
- Remove `CvTemplatePreview` from `imports` (it is no longer used directly by `ExportFooter`).

---

## Step 6 — Write unit tests

**File:** `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.spec.ts`

### Test cases

#### `CvA4Preview` component

Setup: use `TestBed.configureTestingModule({ imports: [CvA4Preview] })`. Mock `CvTemplatePreview` is **not** needed — let it render normally (it has no side-effects). Provide a minimal `CvStructuredData` fixture.

| # | Description |
|---|---|
| 1 | Creates successfully |
| 2 | `measuring()` is `false` initially (before inputs are set) |
| 3 | When `cv` is `null`, no A4 page cards are rendered (delegates to `CvTemplatePreview`'s null guard) |
| 4 | `pages()` starts as empty array `[]` |
| 5 | After `fixture.detectChanges()` with valid `cv` input, `measuring()` eventually becomes `false` and `pages().length` is at least 1 |
| 6 | The hidden container element has `aria-hidden="true"` |
| 7 | A4 page elements have `aria-label` containing "Page 1 of" text |

**Note on DOM measurement in tests:** `scrollHeight` will be `0` in JSDOM (no layout engine). Test 5 should check `pages().length >= 1` using the minimum-1 guard logic in `measure()`, not the pixel height. Alternatively, stub `hiddenContainer().nativeElement.scrollHeight` via `Object.defineProperty` in the test.

---

## Step 7 — Verify

Run in order:

```bash
npm exec nx typecheck opticv-web
npm exec nx lint opticv-web
npm exec nx test opticv-web -- --testPathPattern=cv-a4-preview
npm exec nx build opticv-web -- --configuration=development
```

---

## Files Summary

| File | Action |
|---|---|
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.ts` | **Create** |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.html` | **Create** |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.css` | **Create** |
| `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.spec.ts` | **Create** |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.html` | **Modify** — preview dialog only |
| `apps/opticv-web/src/app/features/cv-optimization/components/export-footer/export-footer.ts` | **Modify** — swap import |
