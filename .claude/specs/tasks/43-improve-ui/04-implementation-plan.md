# Implementation Plan

Task ID: 43-improve-ui
Spec: `02-spec.md` | Review: `03-spec-review.md` (PASS WITH ISSUES — no critical issues)

---

## Pre-implementation notes (from spec review)

- **Tailwind colour tokens**: The project uses Tailwind CSS 4 with an `@theme` block in `styles.css`. The existing theme defines `--color-primary: #059669` and `--color-green-light: #10b981`. Tailwind 4 maps `@theme` variables to utilities automatically: `--color-primary` → `text-primary`, `bg-primary`, etc. There are **no** `primary-500` / `primary-700` tokens — these are Tailwind v3 shades. The landing page references must be translated to the project's actual tokens (`text-primary` for green). Use CSS custom property `var(--color-primary)` or its Tailwind utility `text-primary` / `hover:text-primary`.
- **`NgOptimizedImage`**: Must be added to `TopHeader`'s `imports` array. Requires `provideImageKitLoader` or no loader (default loader for local `/images/` paths works without a loader when `src` is a relative path — use `ngSrc` with a string literal).
- **`app.html` `padding-top`**: The `padding-top: 80px` is on `.main` in `app.css`, not an inline style in `app.html`. The change targets `app.css`.
- **Scroll shadow animation**: Implement with raw CSS keyframes in `top-header.css` (no Tailwind config change needed). Use `@supports (animation-timeline: scroll())` for progressive enhancement.
- **`#end` slot**: No visual changes — keep Sign In / Sign Out / avatar exactly as-is.
- **PrimeNG active highlight**: PrimeNG 21 Aura applies `p-menubar-item-active` class on the active item wrapper `<li>`. The `<a>` inside uses `routerLinkActive="active"` which adds the `active` class directly on the anchor. The custom CSS rule targets `.active` on the anchor — this does not conflict with PrimeNG's wrapper class. PrimeNG's default active background must be overridden via `::ng-deep`.

---

## Step 1 — Verify Tailwind colour token

**File**: `apps/opticv-web/src/styles.css`

Confirm `--color-primary: #059669` is already present in the `@theme` block (it is). No changes needed. The Tailwind utility classes to use throughout are:
- `text-primary` for green text (maps to `#059669`)
- `hover:text-primary` for hover state

---

## Step 2 — Update `TopHeader` component: add `NgOptimizedImage` import

**File**: `apps/opticv-web/src/app/layout/top-header/top-header.ts`

- Add `NgOptimizedImage` to the `imports` array (import from `@angular/common`).
- No other logic changes.

---

## Step 3 — Update `TopHeader` template

**File**: `apps/opticv-web/src/app/layout/top-header/top-header.html`

Changes:

### 3a — Logo (`#start` slot)
Replace the current `<a routerLink="/" class="logo">Opti CV</a>` with:
- An `<a routerLink="/">` anchor with classes: `header__logo` (defined in CSS step)
- Inside: `<img ngSrc="/images/opticv-logo-icon.svg" alt="OptiCV logo" width="40" height="48">` — use `width="40"` to respect the SVG's natural 220×264 aspect ratio at 48px height (220/264 × 48 ≈ 40)
- Followed by `<span>Opti CV</span>`

### 3b — Nav item template (`#item` slot)
The existing `<a [routerLink]="item.route" routerLinkActive="active" class="p-menubar-item-link">` is already structurally correct. Add class `header__menu-link` alongside `p-menubar-item-link` so the custom styles apply cleanly without fully fighting PrimeNG's class.

Result:
```
<a [routerLink]="item.route" routerLinkActive="active" class="p-menubar-item-link header__menu-link">
  {{ item.label }}
</a>
```

### 3c — No changes to `#end` slot

---

## Step 4 — Rewrite `top-header.css`

**File**: `apps/opticv-web/src/app/layout/top-header/top-header.css`

Full replacement. Key rules:

### `.header`
- `position: sticky; top: 0; z-index: 20; width: 100%;`
- `height: 5.5rem` (88px — matches landing page)
- `display: flex; align-items: center;`
- Remove `border-bottom`
- Add background via `::before` for the blurred white layer (see below)
- Add scroll-driven shadow animation via `@supports`

### `.header::before`
- `content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); z-index: -1;`
- This replicates the landing page's `bg-white/90 lg:backdrop-blur-sm` approach

### Scroll shadow animation
```css
@keyframes fadeInShadow {
  from { box-shadow: none; }
  to   { box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); }
}

@supports (animation-timeline: scroll()) {
  .header {
    animation: fadeInShadow linear both;
    animation-timeline: scroll();
    animation-range: 0 20rem;
  }
}
```

### `.header-container`
- Keep `width: 100%; max-width: 1440px; margin: 0 auto;` and responsive padding as-is
- Remove nothing — this is structural layout

### `p-menubar` overrides (keep via `::ng-deep`)
- Keep `padding: 0 !important; border: none; background: transparent;`
- Keep `.p-menubar-start { margin-right: auto; }`

### `.header__logo`
```css
.header__logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.875rem; /* text-3xl */
  font-weight: 700;
  letter-spacing: 0.05em; /* tracking-wider */
  color: var(--color-primary);
  white-space: nowrap;
  text-decoration: none;
  padding: 0.75rem 0;
  transition: color 0.3s;
}
.header__logo:hover {
  color: var(--color-green-light);
}
```

### `.header__menu-link`
```css
.header__menu-link {
  font-weight: 500;
  color: #404040; /* neutral-700 equivalent */
  padding: 1rem 1.5rem; /* py-4 px-6 */
  transition: color 0.3s;
  text-decoration: none;
}
.header__menu-link:hover,
.header__menu-link:focus {
  color: var(--color-primary);
}
.header__menu-link.active {
  color: var(--color-primary);
}
```

### Remove PrimeNG active background on nav items
```css
::ng-deep .p-menubar .p-menubar-item-active > .p-menubar-item-content,
::ng-deep .p-menubar .p-menubar-item.p-highlight > .p-menubar-item-content {
  background: transparent !important;
}
```

### Remove old rules
- Remove `.logo` class (replaced by `.header__logo`)
- Remove `.user-menu-container` and the `::ng-deep .p-menu` / `.p-menu-overlay` rules (these were for an overlay menu that no longer exists)
- Remove `::ng-deep .p-menubar-mobile .p-menubar-root-list { z-index: 200; }` — will re-add only if mobile testing reveals a stacking issue

---

## Step 5 — Update `app.css`

**File**: `apps/opticv-web/src/app/app.css`

Change `.main`:
- Remove `padding-top: 80px` — sticky header does not require a content offset

---

## Step 6 — Manual verification checklist

Run after implementation:

1. `npm exec nx typecheck opticv-web` — no TypeScript errors
2. `npm exec nx build opticv-web` — build passes
3. `npm exec nx test opticv-web` — existing tests pass
4. Visual checks in browser (dev server `npm exec nx serve opticv-web`):
   - Logo SVG + "Opti CV" text render in header
   - Scroll down → shadow appears progressively on header
   - No green bottom border visible
   - Nav links: text is dark neutral; hover → green; active route → green
   - Sign In (logged out) and Sign Out + avatar (logged in) work unchanged
   - No layout gap between header and page content on any route
   - Mobile: PrimeNG hamburger toggle still works; menu panel readable

---

## Files modified

| File | Change |
|---|---|
| `apps/opticv-web/src/app/layout/top-header/top-header.ts` | Add `NgOptimizedImage` to `imports` |
| `apps/opticv-web/src/app/layout/top-header/top-header.html` | Update logo markup; add `header__menu-link` class to nav `<a>` |
| `apps/opticv-web/src/app/layout/top-header/top-header.css` | Full restyle: sticky, scroll shadow, logo class, nav link class, remove old rules |
| `apps/opticv-web/src/app/app.css` | Remove `padding-top: 80px` from `.main` |

**No new files. No backend changes. No dependency installs.**
