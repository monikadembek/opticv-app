# Implementation Done Report

## Task

79-bullet-rewrite-ui-changes

## Source

- Specification: `.claude/specs/tasks/79-bullet-rewrite-ui-changes/02-spec.md`
- Specification review: `.claude/specs/tasks/79-bullet-rewrite-ui-changes/03-spec-review.md` (PASS)
- Implementation plan: `.claude/specs/tasks/79-bullet-rewrite-ui-changes/04-implementation-plan.md`
- Code review: `.claude/specs/tasks/79-bullet-rewrite-ui-changes/05-code-review.md`

## Summary

The `bullet.action === 'rewrite'` card in `BulletRewriter` was restructured with a BEFORE/AFTER split, a green-accented AFTER box, a "Why this works" collapsible toggle for weakness/rationale text, and a light-green selected-state card background. Changes span two commits (`ab2fa63`, `4e82d69`) plus an uncommitted test-file update fixing two tests broken by the second commit's markup changes.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Header row: checkbox + "Bullet {n}" label + right-aligned Edit button | Not implemented | Checkbox and Edit button present; "Bullet {n}" label was replaced with `{position.title} at {position.company} - bullet point rewrite` in `4e82d69`. |
| "BEFORE" row: labeled box with icon, shows `bullet.originalText` | Implemented | Rendered as "Original" label with `pi-file` icon (spec called for "Before" wording with a circle/outline icon). |
| Centered downward-arrow divider between BEFORE/AFTER | Implemented | Vertical stack with `pi-arrow-down` at narrow widths; at `lg` breakpoint, layout becomes horizontal (`lg:flex-row`) with `pi-arrow-right` — not described in spec. |
| "AFTER" row: labeled box with check-circle icon, green left-border accent, bold/higher-contrast text | Implemented | Rendered as "Rewritten" label (spec called for "After" wording); `border-green-500` left border and bold text present. |
| Placeholders-to-fill block below AFTER box, unchanged behavior | Implemented | `@if (bullet.needsUserInput && bullet.placeholdersToFill.length > 0)` block preserved unchanged. |
| Collapsible "Why this works" toggle (chevron + label), collapsed by default | Implemented | `isWhyExpanded`/`toggleWhy` added to `bullet-rewriter.ts`; `@if (bullet.weakness \|\| bullet.rewriteRationale)` guard present. |
| Keywords chips always visible, rendered after "Why this works" | Implemented | `@if (bullet.keywordsIncorporated.length > 0)` block unchanged, positioned after the toggle/panel. |
| "Edited" badge behavior unchanged | Implemented | `isEdited(...)` check and classes unchanged. |
| Selected state: subtle light-green card background, additive to border | Implemented | `[class.bg-green-50]` bound alongside existing `[class.border-green-400]` on the `<li>`. |
| Editing state: textarea + Save/Cancel replaces AFTER box content, BEFORE/arrow/"Why this works"/keywords stay visible | Implemented | Textarea/Save/Cancel block relocated into the AFTER column; other sections remain visible during editing. |
| Local, non-persisted `expandedWhyKeys` state keyed by `bulletKey` | Implemented | `signal<Set<string>>` added to `bullet-rewriter.ts`, not part of `input()`/`output()` contract. |
| Preserve existing `input()`/`output()` contracts and helper methods | Implemented | No signature changes to `isSelected`, `toggleBullet`, `bulletKey`, `getDisplayText`, `isEditing`, `isEdited`, `editStarted`, `editSaved`, `editCancelled`, `editTextChanged`. |
| Accessibility: aria-labels preserved; `aria-expanded`/`aria-controls` on toggle; toggle is a real `<button>` | Implemented | Checkbox `aria-label` preserved (separator character changed from em dash to hyphen in `4e82d69`); toggle uses `[attr.aria-expanded]`/`[attr.aria-controls]` and is a `<button type="button">`. |
| "Bullet {n}" numbering restarts at 1 per position (Edge Case) | Not implemented | No numbering is rendered at all as of `4e82d69`; edge case is moot since the numbered label no longer exists. |
| Existing `bullet-rewriter.spec.ts` tests updated/passing | Implemented | Two tests referencing "Bullet 1"/"Bullet 2" text were updated (uncommitted) to assert against current header/content instead; full suite run confirms 950/950 passing. |
| No breaking changes to `recommend_cut`, `keep_as_is`, missing-bullet-suggestions rendering | Implemented | These branches were not touched by either commit; test suite confirms no regressions. |

---

## Files

### Modified

- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts` (commit `ab2fa63`)
- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html` (commits `ab2fa63`, `4e82d69`)
- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.spec.ts` (commit `ab2fa63`; further uncommitted changes fixing two test assertions)

### Created

None.

---

## Components

| Component (per plan) | Status |
|---|---|
| `bullet-rewriter.ts` — local "Why this works" expand/collapse state (`expandedWhyKeys`, `isWhyExpanded`, `toggleWhy`) | Exist |
| `bullet-rewriter.html` — restructured `rewrite` card template | Exist |
| `bullet-rewriter.spec.ts` — updated test coverage | Exist |

---

## Stores

Not applicable — no NgRx Signals store changes are part of this task's plan.

---

## Deviations

- Plan §2.2 specifies the header renders `"Bullet {{ bi + 1 }}"`. As implemented (`4e82d69`), the header renders `{{position.title}} at {{position.company}} - bullet point rewrite` instead; no numbered label is rendered.
- Plan §2.3/§2.4/§2.5 specify a single-column vertical BEFORE → arrow (down) → AFTER structure. As implemented (`4e82d69`), the layout is a responsive flex row (`flex-col lg:flex-row`) with the arrow icon switching between `pi-arrow-down` (narrow) and `pi-arrow-right` (`lg` and above).
- Plan Scope Confirmation restricts changes to the `rewrite` card. As implemented (`4e82d69`), a `pi-briefcase` icon was additionally inserted into the position header (`<h4>`), outside the plan's declared file/scope boundary.
- Plan §2.3 labels the BEFORE row "Before" with a `pi-circle` icon. As implemented, the label reads "Original" with a `pi-file` icon.
- The checkbox `aria-label` separator character changed from an em dash (`—`, per `ab2fa63`) to a hyphen (`-`, per `4e82d69`); the sibling `recommend_cut` checkbox `aria-label` still uses the em dash.
- `bullet-rewriter.spec.ts` tests `'renders "Bullet 1" for the first bullet in a position's list'` and `'restarts "Bullet {n}" numbering at 1 for each position's bullet list'` (as authored per plan §Step 4/item 5) were renamed and their assertions changed to match the header text and per-bullet content actually rendered, since the "Bullet {n}" label no longer exists in the template.

---

## Additional Implementation

None.
