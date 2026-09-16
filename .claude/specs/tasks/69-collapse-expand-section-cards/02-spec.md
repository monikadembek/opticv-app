# Task Specification

## Source

Azure DevOps Task: 69

## Goal

Add collapse/expand functionality to the section cards on the CV Optimization results page (`apps/opticv-web/src/app/features/cv-optimization`). Optimization result sections are often very long; users should be able to collapse a card to hide its body content and expand it again to reveal it, without losing any data or state.

## Context

The CV Optimization page (`cv-optimization.html` / `cv-optimization.ts`) renders up to 8 `<app-section-card>` instances (Job Posting, ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Profile). Each instance wraps a `SectionCard` component (`apps/opticv-web/src/app/features/cv-optimization/components/section-card/`), which currently renders a custom (non-PrimeNG) header (icon, title, status badge) and a body that either shows a `ProcessingPlaceholder` or the projected `<ng-content>`.

The page also has sidebar (`app-optim-sidebar`) and mobile tabs (`app-mobile-tabs`) navigation that call `handleSectionClick(id)` in `cv-optimization.ts`, which scrolls to `#section-{id}`. A `setupScrollspy()` `IntersectionObserver` watches `[data-section]` elements to update `activeSection` as the user scrolls.

## Scope

### In scope

- Add collapse/expand toggle affordance (chevron icon, clickable) to the `SectionCard` component header.
- Add collapsed/expanded state, local to each `SectionCard` instance (component-internal signal), defaulting to **expanded**.
- Clicking the toggle (or header) collapses/expands the card's body — hides/shows the projected `<ng-content>` / `ProcessingPlaceholder` region.
- When a card is collapsed, expose a way for the parent page to force-expand it (needed for the sidebar/mobile-tab navigation requirement below).
- Update `handleSectionClick` (or the section-card instances) so that clicking a sidebar/mobile-tab link expands the corresponding card if it is currently collapsed, then scrolls to it as today.
- Keyboard and screen-reader accessibility for the toggle: must be a focusable, keyboard-operable control (e.g. `<button>`), with `aria-expanded` reflecting state and an accessible name (e.g. "Collapse {title} section" / "Expand {title} section").
- Apply the toggle uniformly to all 8 `app-section-card` instances, including the Job Posting card.

### Out of scope

- Persisting collapsed/expanded state across page reloads or between sessions (e.g. localStorage, backend). State resets to expanded on every full page load.
- Auto-collapsing cards based on their `status` (e.g. auto-collapse on `completed`). All cards start expanded regardless of status.
- Refactoring `SectionCard` to use PrimeNG `p-panel`/`p-accordion`. The existing custom HTML/CSS structure is kept; the toggle is added on top of it.
- Changes to `ProcessingPlaceholder`, individual result components (`AtsScore`, `KeywordGap`, etc.), or the data/results models.
- A page-level "collapse all" / "expand all" control (not requested).

## Behavior

1. **Default state:** On page load (or whenever a new optimization run starts), every `SectionCard` renders expanded, exactly as today.
2. **Toggling:** The card header includes a chevron toggle button. Clicking it (or, per existing convention, the header itself) flips the card's local collapsed state:
   - Expanded → collapsed: the body (`section-card__body`, containing `ProcessingPlaceholder` or projected content) is hidden; the chevron icon rotates/changes to indicate the collapsed state; header (icon, title, status badge) remains visible.
   - Collapsed → expanded: the body is shown again, restoring exactly the content that was projected before (no re-fetch, no state loss — this is a pure visibility toggle, not a destroy/recreate).
3. **Status badge visibility:** The status badge (Completed / Processing / Error) remains visible in the header regardless of collapsed state, so users can see a section's status without expanding it.
4. **Sidebar / mobile-tab navigation interaction:** When the user clicks a section link in the sidebar or mobile tabs (`handleSectionClick`), if that section's card is currently collapsed, it is expanded first, then the existing scroll-to-section behavior runs, so the user always lands on visible content.
5. **Scrollspy:** No change to `setupScrollspy()` logic other than accounting for the fact that a collapsed card's `[data-section]` element still exists in the DOM (only its body content is hidden), so the observer continues to function against the header/card element.

## Edge Cases

- **Processing status:** A card showing the `ProcessingPlaceholder` (status = `processing`) can still be collapsed/expanded like any other card; collapsing does not stop or affect the underlying optimization request.
- **Pending status:** Cards with `status === 'pending'` render no body content today (per existing `@else if (status() !== 'pending')` check). The toggle should still be present and functional, but collapsing/expanding a pending card has no visible effect since there is nothing projected yet.
- **Retry action:** Result sections that show a "Retry" button (`retry-action` block, projected via `<ng-content>`) are hidden when collapsed, same as the rest of the body — consistent with treating the whole body as one collapsible region.
- **Job Posting card (live flow):** The read-only prefilled job upload form inside the Job Posting `app-section-card` is treated the same as any other card body — collapsible.
- **Keyboard navigation:** Toggle must be reachable via Tab and operable via Enter/Space, consistent with WCAG AA and the project's accessibility rules.

## Data / API

- No backend/API changes.
- No changes to `@opticv/datatypes` or Prisma models.
- New local component state only: a `collapsed` signal (default `false`) inside `SectionCard`.
- `SectionCard` gains a way for the parent to imperatively expand it when collapsed (e.g. via a two-way-bindable `collapsed` input/output pair such as `input<boolean>(false)` + `output<boolean>()` following `[(collapsed)]` banana-in-a-box convention), so `cv-optimization.ts` can track per-section collapsed state in a `Map<string, boolean>` (or similar) and force-expand from `handleSectionClick`.

## Acceptance (DEV)

- `npm exec nx build opticv-web` passes.
- `npm exec nx test opticv-web` passes; tests added/updated for `SectionCard` covering: default expanded state, toggle collapses/expands content, `aria-expanded` reflects state, and forced-expand via input binding.
- `npm exec nx lint opticv-web` passes.
- Toggle passes AXE checks and WCAG AA (focus visible, keyboard operable, accessible name, sufficient contrast for the chevron icon).
- No breaking changes to existing `SectionCard` consumers — all 8 usages in `cv-optimization.html` updated consistently.
- Manual verification: collapsing a card during an in-progress optimization does not interrupt or lose in-flight results; expanding it afterwards shows the completed result correctly.
