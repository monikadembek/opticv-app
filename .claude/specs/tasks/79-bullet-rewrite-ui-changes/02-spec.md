# Task Specification

## Source

Azure DevOps Task: 79 — UX/UI - Bullet upgrades visual improvements

## Goal

Redesign the "rewrite" bullet card in `BulletRewriter` (Bullet Upgrades section of CV Optimization) so the rewritten ("AFTER") version stands out clearly from the original ("BEFORE") version, the card shows a subtle green background when selected, and the weakness/reason-for-rewrite explanation is tucked behind a collapsible "Why this works" toggle — matching the attached mockups:

- `.claude/specs/tasks/79-bullet-rewrite-ui-changes/ui/task-79-rewritten-bullet-selected-state.png`
- `.claude/specs/tasks/79-bullet-rewrite-ui-changes/ui/task-79-rewritten-bullet-edit-state.png`

## Context

- Component: `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/`
  - `bullet-rewriter.ts` — presentational component, `input()`/`output()` signals, `ChangeDetectionStrategy.OnPush`, no local state today.
  - `bullet-rewriter.html` — template for all bullet actions (`rewrite`, `recommend_cut`, `keep_as_is`) plus missing-bullet suggestions.
  - No dedicated stylesheet; all styling is inline Tailwind utility classes.
- Parent: `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` / `.html` owns all persisted state (`selectedBullets`, `bulletEdits`, `activeBulletEditKey`, `editedBulletText`, `removedBullets`, etc.) and passes it down as inputs; `BulletRewriter` emits events back up. This change only affects the `bullet.action === 'rewrite'` card markup/styles and adds one new piece of **local, non-persisted** UI state (expanded/collapsed "Why this works").
- Only the `rewrite` action card (lines ~36–162 of `bullet-rewriter.html`) is in scope. `recommend_cut`, `keep_as_is`, and the "Missing Bullet Suggestions" section are out of scope per product decision.

## Scope

### In scope

- Redesign the `bullet.action === 'rewrite'` card (with `rewrittenText` present) to match the mockup structure:
  - Header row: checkbox + "Bullet {n}" label (1-indexed position within the position's bullet list, using the existing `bi` `$index` from the `@for`), with the existing Edit button aligned to the right (only shown when not editing).
  - "BEFORE" row: small uppercase label with a circle/outline icon, followed by a boxed original-text panel (white/neutral background, bordered box) showing `bullet.originalText`.
  - A centered downward-arrow divider between BEFORE and AFTER blocks.
  - "AFTER" row: small uppercase label with a check-circle icon, followed by a boxed rewritten-text panel with a distinct left-border accent (green) and bold/higher-contrast text so it visually stands out from BEFORE. This box shows the current display text (`getDisplayText(...)`, i.e. edited text if present, else `bullet.rewrittenText`).
  - Below the AFTER box: the existing "Placeholders to fill" block (unchanged behavior), if applicable.
  - A collapsible "Why this works" row (chevron icon + label) that toggles visibility of the existing Weakness (`bullet.weakness`) and Reason for rewrite (`bullet.rewriteRationale`) text. Collapsed by default.
  - Keywords chips row remains visible at all times (not part of the collapsible section), rendered below/after the "Why this works" toggle per mockup.
  - "Edited" badge behavior unchanged (still shown next to the header when `isEdited(...)` is true).
- Selected state: when the rewrite bullet is selected (`isSelected(...)` true), the whole card gets a subtle light-green background (in addition to/replacing the current green border), per the "selected state" mockup.
- Editing state: replace the AFTER box content with the existing `pTextarea` + Save/Cancel controls (unchanged behavior/outputs), matching the "edit state" mockup — BEFORE box, arrow, and "Why this works"/keywords remain visible and unchanged while editing.
- Add local component state in `BulletRewriter` to track which bullet cards have "Why this works" expanded (e.g., a `signal<Set<string>>` keyed by the existing `bulletKey(company, title, originalText)`), with a method to toggle it. Not persisted to backend, not part of `input()`/`output()` contract.
- Preserve all existing `input()`/`output()` contracts, event emissions, and helper methods (`isSelected`, `toggleBullet`, `bulletKey`, `getDisplayText`, `isEditing`, `isEdited`, `editStarted`, `editSaved`, `editCancelled`, `editTextChanged`) — this is a template/visual restructuring plus one new local toggle method, not a data-flow change.
- Accessibility: maintain existing `aria-label`s on checkbox, edit button, textarea; add appropriate `aria-expanded`/`aria-controls` (or equivalent) semantics to the new "Why this works" toggle so it is keyboard-operable and screen-reader friendly; ensure the toggle is a real button (not a non-interactive div) with visible focus state.

### Out of scope

- `recommend_cut` and `keep_as_is` card variants (colors/layout unchanged).
- "Missing Bullet Suggestions" section (colors/layout unchanged).
- Any backend/API/persisted-state changes — `BulletUserState`, `saveUserOutput`, debounce logic, etc. are untouched.
- Persisting the expanded/collapsed state of "Why this works" across sessions or reloads.
- The "rewrite action but no rewrittenText" read-only fallback branch (`@else` at line 149) — left as-is, since no mockup covers this state.

## Behavior

1. Each rewrite bullet card renders a header with checkbox, "Bullet {n}" label (n = 1-based index of the bullet within its position), the "Edited" badge (if applicable), and the Edit button (if not currently editing).
2. Below the header, a "BEFORE" labeled box always shows `bullet.originalText`, read-only, unaffected by edit/selection state.
3. A centered arrow visually separates BEFORE from AFTER.
4. An "AFTER" labeled box shows the current effective rewritten text (`getDisplayText(...)`) with a green left-border accent and stronger text styling than BEFORE, so it visually dominates the card. When the user clicks Edit, this box's content is replaced by the existing textarea + Save/Cancel controls; Save/Cancel/edit outputs behave exactly as they do today.
5. If `bullet.needsUserInput` and there are placeholders, the existing "Placeholders to fill" panel renders below the AFTER box as it does today.
6. A "Why this works" toggle row (chevron + label) appears below the AFTER/placeholders content. It starts collapsed. Clicking it (or activating via keyboard) expands/collapses a panel containing the existing Weakness and Reason-for-rewrite text (only rendered if `bullet.weakness` / `bullet.rewriteRationale` are present, as today). Toggle state is local to the component instance and per-bullet (keyed by `bulletKey`), reset on reload since it's not persisted.
7. Keyword chips render below the "Why this works" toggle, always visible (unaffected by collapse state), same data/content as today.
8. When the checkbox is checked (`isSelected(...)` true), the entire card gets a subtle light-green background fill, in addition to existing selected-state border styling, per the mockup. Unselected cards keep the current neutral border with no background tint.

## Edge Cases

- Bullet has no `weakness` and no `rewriteRationale`: the "Why this works" toggle should not render at all (nothing to show), consistent with current `@if` guards — avoids an empty expandable section.
- Bullet has `keywordsIncorporated.length === 0`: keyword chips row is omitted, as today.
- Long "AFTER" text: box must wrap and grow (existing `pTextarea` `autoResize` already handles this in edit mode; the display-mode box should allow text wrapping without truncation).
- Toggling "Why this works" on one card must not affect the expand/collapse state of other bullet cards (state keyed per bullet, not global).
- Switching into edit mode while "Why this works" is expanded should not force-collapse it (independent state).
- Multiple positions each with multiple bullets: "Bullet {n}" numbering restarts at 1 for each position's own bullet list (uses the existing per-position `@for` index `bi`), not a global counter across all positions.

## Data / API

- No backend/API changes.
- No changes to `BulletUpgradeResult`, `BulletItem`, `BulletSelectionKey`, or `BulletUserState` types in `packages/shared/datatypes/src/lib/datatypes.ts`.
- No new `input()`/`output()` signals added to `BulletRewriter`'s public contract; only new private/local component state (expanded "Why this works" keys) and template restructuring.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`).
- Existing `bullet-rewriter.spec.ts` tests updated/passing; add test coverage for:
  - Selected rewrite bullet card has the green background class/styling applied.
  - "Why this works" toggle is collapsed by default and expands/collapses weakness+reason text on click, independently per bullet.
  - "Why this works" toggle does not render when both `weakness` and `rewriteRationale` are absent.
  - Existing edit flow (Edit → textarea shown → Save/Cancel emit correctly) still passes with the new layout.
- No breaking changes to `recommend_cut`, `keep_as_is`, or missing-bullet-suggestions rendering.
- Passes AXE checks / WCAG AA: focus visible on the new toggle button, correct `aria-expanded` state, sufficient color contrast for green-on-green selected+AFTER-box text.
- Manually verified in browser against both mockup images (selected state, editing state).
