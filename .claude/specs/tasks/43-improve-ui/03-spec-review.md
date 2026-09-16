# Specification Review

Task ID: 43-improve-ui
Spec file: `.claude/specs/tasks/43-improve-ui/02-spec.md`
Raw task: `.claude/specs/tasks/43-improve-ui/00-raw-task.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification correctly captures all explicit task requirements: logo with SVG icon, nav link restyling matching the landing page, sticky header with scroll shadow, and exclusion of the dark mode switcher. The clarification answers are well-incorporated. A few sections have implementation-level ambiguities (notably around `NgOptimizedImage` usage and the exact mapping of CSS custom properties to PrimeNG/Tailwind tokens) that could cause implementation drift without being resolved. No requirements are invented beyond what the task and clarification answers justify.

---

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **`text-primary-700` vs `text-primary-500` colour token inconsistency** — Behavior §1 specifies the logo anchor uses `text-primary-700`, while Behavior §4 specifies active/hover nav links use `text-primary-500` (and maps it to `var(--primary-color)`). The landing page source confirms the logo is `text-primary-700` and links are `primary-500`, so the distinction is correct. However, it is not stated whether these Tailwind tokens (`primary-500`, `primary-700`) are already configured in the project's Tailwind theme, or whether they need to be added. If they are not present, the acceptance criterion "Nav links show green color" would silently fail. The spec should confirm or note this.

2. **`NgOptimizedImage` import not mentioned** — Behavior §1 says to use `NgOptimizedImage` for the logo `<img>`, but the spec does not mention that `NgOptimizedImage` must be imported into `TopHeader` (currently not in its `imports` array). This is a small but concrete implementation step that should be listed in Scope → In scope or Behavior.

3. **`app.html` padding-top removal is assumed but not verified** — Scope and Behavior §5 state to remove `padding-top: 80px` from `<main>` in `app.html`. The raw task does not mention this; it is an architectural consequence of switching from `position: fixed` to `position: sticky`. The assumption is valid and well-reasoned, but it should be listed in the Assumptions section (it is currently missing from there).

4. **Header height change not flagged** — The current implementation uses `height: 80px` (via `.header` CSS). Behavior §3 proposes changing this to `5.5rem` (88px). This is an 8px change that could cause minor layout shifts. The spec doesn't flag this as a potential regression for pages with content close to the header. A note in Edge Cases would be appropriate.

5. **`#end` slot restyling is underspecified** — Scope §In scope states the `#end` slot should be restyled "to match font weight/spacing", but Behavior has no section describing what those changes are. If the intent is no visual change to Sign In/Sign Out, this should be stated explicitly. If minor spacing changes are intended, they should be specified.

#### Unclear or Ambiguous Sections

- **Behavior §2 — `::before` pseudo-element**: The spec says "on the `::before` pseudo-element (or directly on the header if pseudo-element is not feasible)." This leaves implementation choice open. Angular's component styles with `::ng-deep` or `:host` may affect pseudo-element scoping. The ambiguity is acceptable but the implementer should be aware.

- **Behavior §6 — `@keyframes` vs Tailwind animation**: The spec defines a custom `@keyframes fadeInShadow` but also references matching the landing page's `animate-fadeInShadowLight` utility class. It is unclear whether the implementer should define a custom Tailwind animation (in `tailwind.config`) or write raw CSS keyframes in `top-header.css`. Both produce the same result but the approach should be stated.

- **Behavior §4 — "Remove PrimeNG default active highlight background"**: No specific PrimeNG CSS class or selector is named. The implementer will need to discover this via browser devtools. A reference to `::ng-deep .p-menubar-item.p-highlight` or similar would reduce guesswork.

#### Invented or Unsupported Requirements

None.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | The Tailwind theme already includes `primary-500` and `primary-700` colour tokens matching the landing page green palette. | No |
| 2 | `NgOptimizedImage` works with the public assets path `/images/opticv-logo-icon.svg` (no CDN loader required). | No |
| 3 | Switching from `position: fixed` to `position: sticky` does not break any existing page layout other than `app.html`'s `padding-top`. | No — only `app.html` is mentioned |
| 4 | `routerLinkActive="active"` will correctly apply the `.active` class when the current route matches the menu item's `route` property. | Partially (flagged as a verification step in Edge Cases) |
| 5 | The green bottom border removal will not require changes to any other component that visually depends on that border for layout separation. | No |
| 6 | `animation-timeline: scroll()` refers to the root scroll container, which is the correct target for a sticky page header. | No |

---

### Recommendation

**Revise specification** — minor revision only. Address the following before implementation:

1. Add an Assumptions section listing items from the table above, particularly #1 (Tailwind token availability) and #3 (layout impact beyond `app.html`).
2. Add `NgOptimizedImage` import to Scope → In scope or Behavior §1.
3. Clarify the `#end` slot restyling intent (no change vs. minor spacing update).
4. Choose and state the keyframe animation approach (raw CSS vs. Tailwind config extension).
5. Note the `height: 80px → 5.5rem` change in Edge Cases.
