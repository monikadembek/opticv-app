# Task Specification

## Source

Azure DevOps Task: 132 — Move buttons for Resume Analysis and Additional Materials back to sidebar

## Goal

Make the "Resume Analysis" and "Additional Materials" switchers permanently visible by moving them from the in-page `p-tabs` tab bar (below the Job Posting section, scrolls out of view) into the left sidebar (and the mobile section strip). The right-hand content continues to render only the sections of the selected switcher, so the user does not scroll through all result sections.

## Context

Frontend only (`apps/opticv-web`), feature `features/cv-optimization`:

- `cv-optimization.html` / `cv-optimization.ts` — hosts `<p-tabs>` bound to `activeResultsTab` (`'cv-analysis' | 'additional-materials'`), with `onResultsTabChanged()`; also drives the export footer (visible only on `cv-analysis`), per-tab default expand state (`initializedTabDefaults`), scrollspy, and Expand/Collapse All (`activeTabSectionIds`).
- `components/optim-sidebar/*` — renders `NAV_GROUPS` filtered by `activeTab` (Job Posting + the active group only). Group labels are plain text; in collapsed mode a divider replaces the label.
- `components/mobile-tabs/*` — mobile horizontal strip, same filtering by `activeTab`.
- Shared model `ActiveResultsTab` in `../../models`.

No backend, API, or DB impact.

## Scope

### In scope

- Sidebar: both groups ("Resume Analysis", "Additional Materials") are always visible as accordion-style headers (clickable buttons). The selected group is expanded and lists its section items; the other group is collapsed to its header only. "Job Posting and CV" item remains at the top as today.
- Clicking a group header switches the active results tab (same effect as the old tab click) and expands that group.
- Sidebar collapsed (icon-only) mode: each group header is rendered as an icon button with a `title` tooltip (e.g. `pi-chart-bar` for Resume Analysis, `pi-file-edit` for Additional Materials — final icons chosen to be distinct from item icons), highlighted when active. Section item icons of the active group follow below as today.
- Remove the `<p-tablist>` (tab bar) from the main content; keep showing only the active tab's panel content (`p-tabpanel` / equivalent conditional) so the right side shows only the selected group's sections.
- Mobile: `app-mobile-tabs` gets two switcher buttons (Resume Analysis / Additional Materials) in addition to the section items of the active group, because the in-page tab bar no longer exists.
- Sidebar/mobile emit a new output (e.g. `tabSelected`) that `cv-optimization.html` wires to `onResultsTabChanged()`, preserving its existing side effects (cancelling bullet/keyword edits, first-view default expansion, scrollspy re-setup, export footer visibility, Expand/Collapse All scope).
- Accessibility: header buttons are real `<button>`s with `aria-expanded` and `aria-controls` for the group's item list, visible focus, keyboard operable, WCAG AA contrast.
- Update unit tests (`optim-sidebar.spec.ts`, `mobile-tabs.spec.ts`, `cv-optimization.spec.ts` where it relies on the tab bar).

### Out of scope

- Changes to section content, scoring rings, export footer behavior, backend/API.
- Changing which sections belong to which group.
- New routes or URL-persisted tab state.
- Redesigning sidebar styling beyond what the accordion headers need.

## Behavior

1. On the CV optimization page (processing/completed states), the sidebar shows: score rings (unchanged), the "Job Posting and CV" item, then the "Resume Analysis" and "Additional Materials" headers. The group matching `activeResultsTab` is expanded showing its items (with status icons / spinner as today); the other is collapsed.
2. Clicking the inactive group header sets `activeResultsTab` to that group's tab; the right side swaps to that group's sections only, the sidebar expands that group and collapses the other. Clicking the already active header leaves it as is (it does not collapse, so there is always one active tab).
3. Clicking a section item behaves as today (`handleSectionClick`: set active section, expand the card if collapsed, smooth scroll to it).
4. In the initial state (before a run) the sidebar nav is disabled/dimmed as today; group headers are disabled/dimmed too.
5. Collapsed sidebar: group headers appear as icon buttons with tooltips; clicking switches the tab as in (2).
6. Mobile: the strip shows the two group switchers (active highlighted) followed by Job Posting + the active group's items; switching works as in (2).
7. Main content shows no tab bar; the Job Posting section stays above, followed by the active tab's section cards.

## Edge Cases

- Initial page state: group buttons disabled, no tab switching possible.
- Stored mode vs. live flow: identical behavior; partial stored results still show "not processed" placeholders per section.
- Switching tabs while a keyword/bullet edit is active: edits are cancelled as in the current `onResultsTabChanged`.
- First visit to Additional Materials applies its default expansion (Cover Letter expanded) once, as today.
- Export footer only visible on Resume Analysis, unchanged.
- Active section when switching tabs: to be set to the first item of the newly selected group so the sidebar highlight and scrollspy are consistent (assumption — see below).
- "New Optimization" resets `activeResultsTab` to `cv-analysis`; sidebar must follow.

## Data / API

- Endpoints: none.
- Models: reuse `ActiveResultsTab`; `NAV_GROUPS` may gain a tab id / icon per group so groups map to tabs without string comparison on labels.
- DB: none.

## Assumptions

- Accordion semantics: exactly one group expanded at a time, tied to the active tab (no independent expand/collapse of the inactive group).
- Group header icons are chosen by the implementer; no UI mockups were provided for this task.
- Existing `p-tabs` panels may be replaced by `@if (activeResultsTab() === ...)` blocks, or the tab bar hidden, whichever keeps the existing section markup and tests simplest.

## Acceptance (DEV)

- build passes (`nx build opticv-web`), lint and typecheck pass
- unit tests added/updated for sidebar (both groups visible, active expanded, click emits tab change, collapsed icon mode, disabled in initial state), mobile-tabs, and page-level tab switching via sidebar
- no breaking changes to export footer, scrollspy, Expand/Collapse All, or per-tab default expansion
- AXE/WCAG AA: keyboard navigable, `aria-expanded` set, sufficient contrast
- Both switcher buttons visible without scrolling on desktop and mobile
