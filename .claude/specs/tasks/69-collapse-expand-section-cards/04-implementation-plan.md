# Implementation Plan: Task 69 — Collapse/Expand Section Cards

## Source

- Specification: `.claude/specs/tasks/69-collapse-expand-section-cards/02-spec.md`
- Spec review: `.claude/specs/tasks/69-collapse-expand-section-cards/03-spec-review.md` (PASS WITH ISSUES)

## Pre-implementation clarifications (from spec review, resolved before coding)

- **Header-click-to-toggle:** Not implemented. Only the chevron `<button>` toggles the card. There is no existing codebase convention for whole-header click-to-toggle, so the spec's hedge ("or, per existing convention") is dropped. Only the explicit toggle button is interactive.
- **Retry button visibility:** Confirmed per spec Edge Cases — the retry action is part of the projected body content and is hidden when collapsed, consistent with treating the whole body as one region.

## Affected Files

### Modified

1. `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.ts`
2. `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.html`
3. `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.css`
4. `apps/opticv-web/src/app/features/cv-optimization/components/section-card/section-card.spec.ts`
5. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts`
6. `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html`

### Created

None — no new files needed; all changes fit within existing components.

---

## Step 1 — `SectionCard`: add collapsed state and toggle input/output

File: `section-card.ts`

- Add a two-way-bindable boolean state using Angular's `model()` signal API (Angular 21 convention for `[(x)]` bindings, replaces manual `input()`/`output()` pairing):
  - `readonly collapsed = model<boolean>(false);`
- Add a method `toggleCollapsed(): void` that calls `this.collapsed.update((c) => !c);`
- No other inputs change. `sectionId`, `icon`, `title`, `status` remain as-is.
- Import `model` from `@angular/core` alongside the existing `input` import.

## Step 2 — `SectionCard`: update template for toggle button and conditional body rendering

File: `section-card.html`

- Add a toggle `<button>` inside `.section-card__header`, positioned after the status badges (so tab order is icon → title → status → toggle):
  - `type="button"`
  - `class="section-card__toggle"`
  - `[attr.aria-expanded]="!collapsed()"`
  - `[attr.aria-label]="(collapsed() ? 'Expand ' : 'Collapse ') + title() + ' section'"`
  - `(click)="toggleCollapsed()"`
  - Contains a chevron icon: `<i class="pi" [class.pi-chevron-down]="collapsed()" [class.pi-chevron-up]="!collapsed()"></i>`
- Wrap the existing `.section-card__body` block in `@if (!collapsed()) { ... }` so the entire body (placeholder or `<ng-content>`) is removed from render when collapsed, per spec Behavior §2 (this is a structural `@if`, not a CSS `display:none` — acceptable since the spec requires no data loss and Angular's projected `<ng-content>` preserves the underlying component instance state as long as the parent component itself isn't destroyed; only the collapsed `SectionCard`'s own template toggles, the projected child components stay alive in the Angular component tree since `@if` here only wraps the section-card's own body wrapper, not the ng-content source — confirm this holds in Step 6 testing).

  **Correction based on Angular semantics:** An `@if` around a block containing `<ng-content>` still destroys and recreates the projected content's DOM (and the projected component's view) when toggled off/on, because `<ng-content>` is only a projection point — the actual component instances live in the parent (`cv-optimization.ts`) template, not inside `SectionCard`. Structurally removing the `<ng-content>` outlet via `@if` will still destroy/recreate the child component instance (e.g. `AtsScore`, `KeywordGap`) on each collapse/expand, which violates the spec's "no re-fetch, no state loss" requirement for components that hold their own internal state (e.g. `KeywordGap`'s selection/edit state, which per `cv-optimization.html` is actually lifted to the parent's signals, not local to the child — verify this per-component in Step 2a below). **To guarantee no state loss regardless of where state lives, use CSS visibility instead of structural removal:** bind `[style.display]="collapsed() ? 'none' : null"` on `.section-card__body`, keeping the projected content mounted at all times and only hiding it visually. Screen readers should also skip hidden content — add `[attr.hidden]="collapsed() ? '' : null"` alongside `[style.display]`, since the native `hidden` attribute is the standard accessible way to hide content from assistive tech while keeping it in the DOM (equivalent to `display:none` semantics, layered for clarity and to satisfy AXE's expectations for hidden regions).

### Step 2a — Verify no per-child local state exists that would need explicit preservation

- Before finalizing Step 2, grep the components projected into `SectionCard` (`AtsScore`, `KeywordGap`, `SummaryRewrite`, `BulletRewriter`, `CoverLetterEditor`, `InterviewPrep`, `LinkedInUpdates`, `JobUpload`) for local component state (signals declared inside those components, not passed via `input()`).
- This is a verification step only — no code change here. If any local state is found, it confirms the CSS-hide approach (not structural `@if`) is mandatory (already the plan). If none is found, the CSS-hide approach is still used (per spec's explicit "pure visibility toggle, not destroy/recreate" requirement in Behavior §2), so this step is a safety confirmation, not a decision point.

## Step 3 — `SectionCard`: CSS for toggle button and hidden body

File: `section-card.css`

- Add `.section-card__toggle` styles: reset button appearance (background: none, border: none, cursor: pointer), sizing consistent with `.section-card__icon` (e.g. `width: 32px; height: 32px;`), flex-shrink: 0, focus-visible outline per WCAG AA (`:focus-visible { outline: 2px solid var(--primary-700); outline-offset: 2px; }`), and hover state (subtle background, e.g. `var(--primary-50)`, border-radius `var(--radius-full)`).
- No new class needed for the hidden body state — hidden via `[style.display]` binding directly in the template (Step 2), not a CSS class, since it's a per-instance runtime toggle rather than a static style.

## Step 4 — `SectionCard`: update unit tests

File: `section-card.spec.ts`

- Add test: toggle button renders with `aria-expanded="true"` by default (card starts expanded).
- Add test: clicking the toggle button sets `aria-expanded="false"` and hides body content (query `.section-card__body` and assert `hidden` attribute or computed `display: none`).
- Add test: clicking the toggle button again restores `aria-expanded="true"` and visible body content.
- Add test: setting the `collapsed` model input to `true` externally (via `fixture.componentRef.setInput('collapsed', true)`) collapses the card without requiring a click (verifies the parent can force-expand/collapse via binding).
- Add test: toggle button has an accessible name that includes the section title (verify `aria-label` contains `"Test Section"`).
- Keep all existing tests unmodified — they remain valid since `collapsed` defaults to `false` (expanded), matching current rendering behavior.

## Step 5 — `cv-optimization.ts`: track per-section collapsed state and force-expand on navigation

File: `cv-optimization.ts`

- Add a signal to track collapsed state per section, keyed by section id string:
  - `readonly collapsedSections = signal<ReadonlySet<string>>(new Set());`
- Add a method to check collapsed state for template binding:
  - `isSectionCollapsed(id: string): boolean { return this.collapsedSections().has(id); }`
- Add a method to update collapsed state when a card's own toggle fires (bound via `(collapsedChange)` from `model()`, since `[(collapsed)]` two-way binding desugars to `[collapsed]` + `(collapsedChange)`):
  - `onSectionCollapsedChange(id: string, collapsed: boolean): void` — adds/removes `id` from `collapsedSections` (create a new `Set` from the previous one and `.set()` it, since NgRx/Angular signals rule requires `update`/`set`, not `mutate`).
- Update `handleSectionClick(id: string): void` (existing method, `cv-optimization.ts:452`): before the existing scroll logic, if `this.isSectionCollapsed(id)`, remove `id` from `collapsedSections` first (force-expand), then proceed with the existing scroll-to-element logic unchanged.
- No changes to `setupScrollspy()` — per spec Behavior §5, the `[data-section]` element remains in the DOM regardless of collapsed state (only the body's `display` is toggled), so the `IntersectionObserver` continues to observe the same elements without modification.

## Step 6 — `cv-optimization.html`: wire collapsed state into each `<app-section-card>`

File: `cv-optimization.html`

- For each of the 8 `<app-section-card>` instances (Job Posting, ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Profile), add:
  - `[collapsed]="isSectionCollapsed(<sectionId>)"`
  - `(collapsedChange)="onSectionCollapsedChange(<sectionId>, $event)"`
  - where `<sectionId>` matches the existing `[sectionId]`/`sectionId` value already present on that instance (e.g. `PromptType.RESUME_AUTOPSY`, or the literal `"JOB_POSTING"` for the Job Posting card).
- No other template changes — all existing bindings (`icon`, `title`, `status`, projected content) remain unchanged.

## Step 7 — Manual verification (per spec Acceptance criteria)

- Run `npm exec nx serve opticv-web`, navigate to an in-progress or completed CV optimization page.
- Verify: all 8 cards render expanded by default.
- Verify: clicking a card's chevron collapses it (body hidden, header + status badge remain visible, chevron icon flips), and clicking again expands it with content intact (no re-fetch, e.g. any user-edited keyword/bullet selections in `KeywordGap`/`BulletRewriter` are preserved across collapse/expand).
- Verify: collapsing a card mid-`processing` does not interrupt the underlying SSE/optimization request; expanding afterward shows the completed result once it arrives.
- Verify: clicking a sidebar link (or mobile tab) for a currently-collapsed section auto-expands it and scrolls to it.
- Verify keyboard access: Tab to each toggle button, operate with Enter/Space, confirm visible focus outline.
- Run AXE audit (e.g. via `chrome-devtools-mcp:a11y-debugging` skill or browser extension) on the page in both collapsed and expanded states for at least one card.

## Step 8 — Quality gates

Run in order, fixing any failures before proceeding to the next:

1. `npm exec nx format:write`
2. `npm exec nx lint opticv-web`
3. `npm exec nx typecheck opticv-web`
4. `npm exec nx test opticv-web`
5. `npm exec nx build opticv-web`

---

## Explicit Non-Goals (per spec Out of Scope — do not implement)

- No localStorage/backend persistence of collapsed state.
- No auto-collapse based on section `status`.
- No refactor of `SectionCard` onto PrimeNG `p-panel`/`p-accordion`.
- No changes to `ProcessingPlaceholder` or any individual result component (`AtsScore`, `KeywordGap`, etc.) beyond what Step 2a verifies.
- No page-level "collapse all"/"expand all" control.
