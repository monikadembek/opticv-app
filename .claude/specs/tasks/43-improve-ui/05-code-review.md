# Code Review

Task ID: 43-improve-ui
Reviewer: Claude Code
Date: 2026-06-09

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The implementation correctly delivers all in-scope requirements: sticky header with scroll shadow, SVG logo, nav link hover/active styles, removal of padding-top from app.css, and removal of the green bottom border. One critical issue exists: `NgOptimizedImage` was specified in the plan but the `<img>` in the logo uses a plain `src` attribute instead of `ngSrc`, meaning the `NgOptimizedImage` import is missing from `top-header.ts` and the directive is not applied. Two non-critical issues are also noted.

---

### Conventions Violations

#### Critical (must fix before merge)

1. **`top-header.ts` — `NgOptimizedImage` not imported, `<img>` uses `src` instead of `ngSrc`**
   - Convention (`conventions.md`): "Use `NgOptimizedImage` for all static images."
   - Spec (`02-spec.md`, Behavior §1): "render `<img>` pointing to `/images/opticv-logo-icon.svg`… via `NgOptimizedImage`"
   - Plan (Step 2 + 3a): Add `NgOptimizedImage` to `imports` and use `ngSrc` attribute.
   - **Current state**: `top-header.ts` line 17 has `imports: [AvatarModule, MenubarModule, ButtonModule, RouterLink]` — `NgOptimizedImage` is absent. `top-header.html` line 7 uses `src="/images/opticv-logo-icon.svg"` — not `ngSrc`.

#### Non-Critical (should fix)

1. **`top-header.html` line 13 — logo text mismatch**
   - Spec (`02-spec.md`, Behavior §1): `<span>` text should be `"Opti CV"` (with a space).
   - Actual: `<span>OptiCV</span>` (no space).
   - Minor inconsistency between spec and implementation.

2. **`top-header.css` line 108 — `font-weight: 400` deviates from plan**
   - Plan (Step 4, `.header__menu-link`): specifies `font-weight: 500` (`font-medium`).
   - Actual: `font-weight: 400` (regular weight).
   - Spec (`02-spec.md`, Behavior §4): "Base: `font-medium text-neutral-700`" — medium (500) is the requirement.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Replace text-only logo with SVG icon + "Opti CV" text | Partial | SVG `<img>` is present but `NgOptimizedImage` not used; text reads "OptiCV" not "Opti CV" |
| `NgOptimizedImage` with `width/height` on logo `<img>` | Missing | Plain `src` attribute used; `NgOptimizedImage` not in imports |
| Switch header to `position: sticky; top: 0; z-index: 20` | Covered | Correctly applied to `:host` in `top-header.css` |
| Scroll-driven shadow animation with `@supports` | Covered | `fadeInShadow` keyframes + `@supports (animation-timeline: scroll())` implemented correctly |
| `background: rgba(255,255,255,0.9)` + `backdrop-filter: blur(4px)` | Covered | Applied directly on `.header` (not `::before`; plan noted both as acceptable) |
| Remove green bottom border | Covered | No `border-bottom` in new CSS |
| Nav links: `font-medium`, `px-6 py-4`, hover green, active green | Partial | Padding and color are correct; `font-weight` is 400 not 500 |
| `routerLinkActive="active"` on nav `<a>` | Covered | Present in `top-header.html` line 18 |
| PrimeNG active highlight background removed | Covered | Multiple `::ng-deep` rules force `background: transparent !important` |
| Remove `padding-top: 80px` from `app.css` | Covered | `.main` in `app.css` has no padding-top |
| `#end` slot (Sign In / Sign Out / avatar) unchanged in behavior | Covered | No behavioral changes |
| Logo `<img>` has meaningful `alt` attribute | Covered | `alt="OptiCV logo"` present |
| Header height `5.5rem` | Covered | `.header { height: 5.5rem }` |
| Keep PrimeNG `<p-menubar>` mobile behavior | Covered | `p-menubar` retained; no custom hamburger added |

---

### Plan Deviations

1. **`NgOptimizedImage` not added** — Plan Step 2 and 3a explicitly required adding `NgOptimizedImage` to the `imports` array and using `ngSrc`. Neither was done.

2. **`background` applied directly on `.header`, not via `::before` pseudo-element** — Plan Step 4 described a `::before` pseudo-element for the blurred background. The implementation applies the background directly on `.header`. This is functionally equivalent and the plan itself said "or directly on the header if pseudo-element is not feasible" — this is acceptable.

3. **`::ng-deep` scope broadened** — Plan specified targeting `.p-menubar-item-active` and `.p-menubar-item.p-highlight`. The implementation uses broader rules covering `:hover`, `:focus-within`, `.p-focus` states as well (lines 82–87). This is an enhancement for correctness, not a regression.

---

### Null Safety Issues

None.

---

### Code Smells

1. **`top-header.css` lines 117–124 use `!important`** on `.header__menu-link:hover` and `.header__menu-link.active`. This suggests PrimeNG styles are bleeding through and overriding the color. The root cause is the link rendering inside PrimeNG's `.p-menubar-item-content` which has its own color rules. Using `!important` here is pragmatic given PrimeNG's specificity but worth noting. Not a blocker — this pattern is consistent with the existing `::ng-deep` overrides in the file.

2. **`footer.css` line 3 — dead comment**: `/* fill: var(text-neutral-600); */` appears to be a malformed property reference left from debugging. Out of scope for this task but worth noting if the file is being touched.

---

### Recommendation

**Fix critical issues before merge.**

The single critical issue (missing `NgOptimizedImage`) is a convention violation specified both in project conventions and the spec. Fix:
- `top-header.ts`: add `NgOptimizedImage` to `imports` (import from `@angular/common`).
- `top-header.html`: change `src="/images/opticv-logo-icon.svg"` to `ngSrc="/images/opticv-logo-icon.svg"`.

Additionally fix `font-weight: 400` → `font-weight: 500` in `.header__menu-link` and the logo text `"OptiCV"` → `"Opti CV"` before merge.
