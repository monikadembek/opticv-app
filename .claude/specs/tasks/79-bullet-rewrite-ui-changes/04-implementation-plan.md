# Implementation Plan

## Source

- Specification: `.claude/specs/tasks/79-bullet-rewrite-ui-changes/02-spec.md`
- Specification review: `.claude/specs/tasks/79-bullet-rewrite-ui-changes/03-spec-review.md` (PASS)

## Scope Confirmation

This plan only touches the `bullet.action === 'rewrite'` card (with `rewrittenText` present) inside `BulletRewriter`. `recommend_cut`, `keep_as_is`, the no-`rewrittenText` fallback branch, and "Missing Bullet Suggestions" are unchanged. No backend, datatypes, or parent-component (`cv-optimization`) contract changes.

## Files to Change

- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.ts` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.html` (modify)
- `apps/opticv-web/src/app/features/cv-optimization/components/bullet-rewriter/bullet-rewriter.spec.ts` (modify)

No new files are required (no dedicated stylesheet is introduced — inline Tailwind utility classes stay consistent with current convention).

---

## Step 1 — Component class: add local "Why this works" expand/collapse state

File: `bullet-rewriter.ts`

1. Add a private signal to track expanded bullet keys:
   - `private readonly expandedWhyKeys = signal<Set<string>>(new Set());`
   - Import `signal` from `@angular/core`.
2. Add a public method `isWhyExpanded(company: string, title: string, originalText: string): boolean` that checks `this.expandedWhyKeys().has(this.bulletKey(company, title, originalText))`.
3. Add a public method `toggleWhy(company: string, title: string, originalText: string): void` that reads the current key via `bulletKey(...)`, and updates `expandedWhyKeys` with `update()` — clone the `Set`, `delete` if present else `add`, and `set` the new `Set` instance (per conventions: no `mutate`, use `update`/`set`).
4. No new `input()`/`output()` signals. No changes to existing public methods' signatures.

## Step 2 — Template: restructure the `rewrite` card with `rewrittenText`

File: `bullet-rewriter.html`, inside the existing `@case ('rewrite')` → `@if (bullet.rewrittenText)` block (current lines ~36–148). Replace this block's inner markup; keep the outer `@switch`/`@case`/`@if` structure and all existing output emissions unchanged.

### 2.1 Selected-state background on the `<li>`

- Extend the existing `<li>` class bindings (around line 32–34) to add a light-green background class bound to the same `isSelected(...)` condition already used for `border-green-400`, e.g. `[class.bg-green-50]="bullet.action === 'rewrite' && bullet.rewrittenText && isSelected(...)"`.
- Keep the existing `border-green-400` binding — background is additive, not a replacement, per spec Behavior item 8.

### 2.2 Header row

- Remove the current `<label class="flex items-start gap-3 cursor-pointer">` wrapper that wraps the entire card content (checkbox + all following content). Header must become its own row so checkbox + "Bullet {n}" + Edit button lay out horizontally with Edit right-aligned; content below is no longer nested inside a `<label>`.
- New header row: `flex items-center gap-3` containing:
  - Checkbox `<input type="checkbox">` — same `[checked]`, `(change)="toggleBullet(...)"`, `class="accent-primary-500"`, same `aria-label`. Since it's no longer inside a `<label>`, wrap checkbox alone in a `<label>` or add an explicit visually-hidden `<span>`/rely on `aria-label` (already present) — keep the checkbox's existing `aria-label` attribute, no behavior change needed since `aria-label` alone satisfies accessible name.
  - `"Bullet {{ bi + 1 }}"` label — `<span class="font-semibold text-sm">Bullet {{ bi + 1 }}</span>` (1-based, using existing `bi` index from the `@for` on `position.bullets`).
  - "Edited" badge — keep exactly as-is (`isEdited(...)` check), same classes, positioned after the "Bullet {n}" label.
  - Edit button — keep the existing `p-button` with `pi-pencil`, same `(click)="editStarted.emit(...)"`, same `aria-label="Edit rewritten bullet"`, `@if (!isEditing(...))` guard unchanged. Add/keep `class="ml-auto"` so it right-aligns within the header row flex container (drop the `py-0!` sizing override only if it no longer applies in the new layout — keep it if visually consistent, this is a minor visual judgment call at code time, not a contract change).

### 2.3 BEFORE row

- New markup below the header:
  ```
  <div class="flex items-center gap-1.5 text-xs font-medium text-surface-400 uppercase tracking-wide">
    <i class="pi pi-circle text-[10px]"></i> Before
  </div>
  <div class="rounded-md border border-(--border-subtle) bg-white p-2.5 text-sm text-surface-700">
    {{ bullet.originalText }}
  </div>
  ```
- This replaces the old `<p class="text-sm text-surface-400 mt-3">Original: ...</p>` line. `bullet.originalText` display consolidates into this one BEFORE box — do not render it twice.

### 2.4 Arrow divider

- Centered downward arrow between BEFORE and AFTER boxes:
  ```
  <div class="flex justify-center">
    <i class="pi pi-arrow-down text-(--text-muted)" aria-hidden="true"></i>
  </div>
  ```
- `aria-hidden="true"` since it is purely decorative (accessibility requirement — do not let screen readers announce a meaningless arrow).

### 2.5 AFTER row (display mode, i.e. `@if (!isEditing(...))`)

- Label row: `<div class="flex items-center gap-1.5 text-xs font-medium text-green-700 uppercase tracking-wide"><i class="pi pi-check-circle text-[10px]"></i> After</div>`
- Box: `<div class="rounded-md border-l-4 border-green-500 bg-white p-2.5 text-sm font-medium text-surface-900">{{ getDisplayText(...) }}</div>` — reuses existing `getDisplayText(position.company, position.title, bullet.originalText, bullet.rewrittenText)` call unchanged. `font-medium`/`text-surface-900` (vs. BEFORE's `text-surface-700`) plus the left border accent satisfy spec Behavior item 4 ("stronger text styling... visually dominates").
- Text must wrap, not truncate — do not add `truncate`/`overflow-hidden`; default block wrapping is sufficient (Edge Cases: long AFTER text).

### 2.6 AFTER row (editing mode, i.e. `@if (isEditing(...))`)

- Keep the existing textarea + Save/Cancel block byte-for-byte (same `pTextarea`, `[autoResize]`, `[value]`, `(input)`, `aria-label`, Save/Cancel `p-button`s and their `(onClick)` emissions) — only relocate it so it renders in place of the AFTER box under the "After" label row, per the edit-state mockup (BEFORE box, arrow, "Why this works", and keywords remain visible/unchanged while editing).

### 2.7 Placeholders block

- Keep existing `@if (bullet.needsUserInput && bullet.placeholdersToFill.length > 0)` block and its markup unchanged, positioned directly below the AFTER box/textarea (spec Behavior item 5).

### 2.8 "Why this works" toggle + collapsible content

- Only render the toggle when there is something to show: `@if (bullet.weakness || bullet.rewriteRationale) { ... }` (Edge Cases: no weakness and no rationale → toggle must not render at all).
- Toggle button:
  ```
  <button
    type="button"
    class="flex items-center gap-1.5 text-sm font-medium text-green-700"
    [attr.aria-expanded]="isWhyExpanded(position.company, position.title, bullet.originalText)"
    [attr.aria-controls]="'why-' + bulletKey(position.company, position.title, bullet.originalText)"
    (click)="toggleWhy(position.company, position.title, bullet.originalText)"
  >
    <i class="pi" [class.pi-chevron-down]="!isWhyExpanded(...)" [class.pi-chevron-up]="isWhyExpanded(...)"></i>
    Why this works
  </button>
  ```
  - Must be a real `<button>` (not a `div`) — accessibility requirement from spec. Default browser focus ring is acceptable; if it's suppressed elsewhere in the app's global styles, add an explicit `focus-visible:` ring utility class to guarantee visible focus (verify against existing global button focus styles in `styles.css`/Tailwind config at implementation time; do not assume).
  - `[attr.aria-controls]` must reference an `id` set on the collapsible panel element (below) — use the same `'why-' + bulletKey(...)` string on both.
- Collapsible panel:
  ```
  @if (isWhyExpanded(position.company, position.title, bullet.originalText)) {
  <div [id]="'why-' + bulletKey(position.company, position.title, bullet.originalText)" class="space-y-1">
    @if (bullet.weakness) {
    <p class="text-sm text-surface-500 m-0"><span class="font-semibold">Weakness:</span> {{ bullet.weakness }}</p>
    }
    @if (bullet.rewriteRationale) {
    <p class="text-sm text-surface-500 m-0"><span class="font-semibold">Reason for rewrite:</span> {{ bullet.rewriteRationale }}</p>
    }
  </div>
  }
  ```
  - Reuses the existing `@if (bullet.weakness)` / `@if (bullet.rewriteRationale)` guards and text content verbatim — only the wrapping/visibility mechanism changes.
  - Panel is collapsed by default: `expandedWhyKeys` starts as an empty `Set`, so `isWhyExpanded(...)` is `false` on initial render for every bullet (Behavior item 6).

### 2.9 Keywords row

- Keep the existing `@if (bullet.keywordsIncorporated.length > 0)` block and its markup unchanged, moved to render after the "Why this works" toggle/panel (always visible regardless of collapse state — Behavior item 7).

### 2.10 Overall structural note

- The card's root content wrapper changes from `<label class="flex items-start gap-3 cursor-pointer"><input.../><div class="space-y-2 flex-1">...` to a non-`<label>` container, e.g. `<div class="space-y-3">` holding: header row → BEFORE row → arrow → AFTER row/edit block → placeholders → "Why this works" → keywords. This mirrors the `space-y-3` wrapper already present at the outermost level of this branch (current line 38) — reuse it as the direct parent instead of introducing an extra nesting level.

## Step 3 — Accessibility pass (manual, post-markup)

1. Verify checkbox retains its accessible name via `aria-label` now that it's outside a `<label>` wrapper (no visible label text lost).
2. Verify the "Why this works" `<button>` has visible `:focus-visible` styling (keyboard Tab into it in the browser).
3. Verify `aria-expanded` toggles `true`/`false` correctly and `aria-controls` points to an existing element `id` only when expanded (when collapsed, the panel doesn't exist in the DOM since it's behind `@if` — this is acceptable per ARIA spec: `aria-controls` may reference an id that doesn't currently exist while collapsed, as this is a standard disclosure pattern, but confirm no AXE violation is raised for it; if AXE flags it, keep the panel always in the DOM and toggle visibility via a `class` binding instead of `@if`, using `hidden` attribute binding).
4. Run color-contrast check (browser DevTools or AXE) on: green "AFTER" label text on white box background, green left-border AFTND box, and the light-green selected-card background against the dark body text sitting on top of it — must meet WCAG AA (4.5:1 for normal text, 3:1 for large text/non-text UI).
5. Confirm the "Bullet {n}" text and BEFORE/AFTER icons are not the sole means of conveying state (they're supplemented by text labels "Before"/"After" — already satisfied by markup in step 2.3/2.5).

## Step 4 — Update `bullet-rewriter.spec.ts`

File: `bullet-rewriter.spec.ts`. Existing tests in `describe('rewrite bullets', ...)` and `describe('inline editing', ...)` reference text/structure that moves (e.g. `'Original:'` prefix text is removed — original text now lives in the BEFORE box without that literal prefix). Update as follows:

1. Any assertion relying on the literal string `"Original:"` must be removed or changed to check the BEFORE box content instead (the spec's Weakness/Reason-for-rewrite text moves behind the collapsed toggle, so assertions checking for that text via plain `textContent.toContain(...)` must first expand the toggle, or query the panel directly).
2. Update `'renders the rewrite rationale'` test: since the rationale is now hidden by default (collapsed "Why this works"), this test must first find and click the toggle button, `fixture.detectChanges()`, then assert the rationale text is present.
3. Add new tests (per spec Acceptance/DEV criteria):
   - Selected rewrite bullet card has the light-green background class (e.g. assert the `<li>` has `bg-green-50` — or whichever class is chosen in step 2.1 — when `selectedBullets` input includes the bullet's key).
   - "Why this works" toggle is collapsed by default: query for the rationale/weakness text and assert it is NOT present until the toggle is clicked; click it (via the button matched by its accessible role/label or a distinguishing selector) and assert the text now appears; assert `aria-expanded` flips from `"false"` to `"true"`.
   - Toggling one bullet's "Why this works" does not affect another bullet's expand state — requires extending `MOCK_RESULT` (or a local variant) with a second `rewrite` bullet that also has `weakness`/`rewriteRationale`, toggling one, and asserting the other's panel is still collapsed.
   - "Why this works" toggle does not render when both `weakness` and `rewriteRationale` are empty/absent — set both to falsy on a bullet and assert no toggle button exists for that card.
   - Existing edit flow (`Edit` → textarea → Save/Cancel) still passes against the new layout — re-verify existing `describe('inline editing', ...)` tests pass unmodified in behavior (selectors like `[aria-label="Edit rewritten bullet"]`, `textarea[aria-label="Edit rewritten bullet text"]` are unchanged, so most of this `describe` block should require no changes beyond what's noted in item 1).
4. Do not modify `describe('recommend_cut bullets', ...)`, `describe('keep_as_is bullets', ...)`, or `describe('missing bullet suggestions', ...)` — those branches are out of scope and unchanged.
5. Update the "Bullet {n}" numbering: add a test asserting `"Bullet 1"` renders for the first bullet in a position's list; if a second position/bullet scenario is added for the independence test in item 3, assert its numbering also restarts at 1 for that position.

## Step 5 — Build, Lint, Typecheck, Test

Run in order, fixing any failures before proceeding to the next:

1. `npm exec nx lint opticv-web`
2. `npm exec nx typecheck opticv-web`
3. `npm exec nx test opticv-web`
4. `npm exec nx build opticv-web`

## Step 6 — Manual Browser Verification

1. Run `npm exec nx serve opticv-web` (and backend if needed for real data) and navigate to the CV Optimization → Bullet Upgrades section with at least one `rewrite` bullet.
2. Compare rendered card against `task-79-rewritten-bullet-selected-state.png` (checkbox checked, light-green card background, green-bordered AFTER box, chevron-down closed "Why this works").
3. Click the checkbox to select; confirm background tint appears.
4. Click "Why this works"; confirm chevron flips and Weakness/Reason text appears; click again to collapse.
5. Click "Edit"; compare against `task-79-rewritten-bullet-edit-state.png` (textarea replaces AFTER box, BEFORE/arrow/"Why this works"/keywords remain visible and functional); Save and Cancel behave as before.
6. Verify a bullet with no `weakness`/`rewriteRationale` shows no "Why this works" row.
7. Verify `recommend_cut`, `keep_as_is`, and "Missing Bullet Suggestions" sections render unchanged.
8. Run an AXE scan (browser extension or `chrome-devtools-mcp` a11y skill) on the Bullet Upgrades section and confirm no new violations.

---

## Explicitly Out of Scope (do not implement)

- Any change to `recommend_cut`, `keep_as_is`, or missing-bullet-suggestions markup/styling.
- Any change to the no-`rewrittenText` fallback branch (current `@else` under `rewrite`).
- Persisting "Why this works" expand state across reloads or to the backend.
- New `input()`/`output()` signals or changes to `BulletUpgradeResult`/`BulletItem`/`BulletSelectionKey`/`BulletUserState` types.
