# Task Specification

## Source

Azure DevOps Task: 43-improve-ui

## Goal

Restyle the Angular app's top header (`TopHeader` component) to closely match the visual design and behavior of the OptiCV landing page navigation bar. This includes: adding the SVG logo icon, restyling nav links with landing-page hover/active states, switching to sticky+scroll-shadow positioning, and aligning typography and spacing.

## Context

The `TopHeader` component lives at `apps/opticv-web/src/app/layout/top-header/`. It currently uses PrimeNG's `<p-menubar>` and is `position: fixed` with a green bottom border. The landing page (`NavigationBar.astro`) provides the reference styles. The SVG logo `opticv-logo-icon.svg` is already in `apps/opticv-web/public/images/`.

## Scope

### In scope

- Replace the text-only logo with SVG icon + "Opti CV" bold text (matching landing page logo layout)
- Switch header from `position: fixed` to `position: sticky; top: 0` with a scroll-triggered CSS shadow animation (matching landing page `animate-fadeInShadowLight`)
- Remove the green bottom border; use the backdrop-blur + semi-transparent white background approach from the landing page
- Restyle nav menu links: font weight, spacing (`px-6 py-4`), `hover:text-primary-500` transition, and `[&.active]:text-primary-500` for the active route
- Ensure `routerLinkActive="active"` is applied on nav links so active state is reflected via CSS
- Keep PrimeNG `<p-menubar>` with its built-in mobile responsive behavior (no custom hamburger)
- Keep the `#end` slot (Sign In / Sign Out + avatar) unchanged in behavior; only restyle to match font weight/spacing
- Update `top-header.css` (and/or use Tailwind utilities where appropriate)
- Update `app.html` padding-top: remove the hardcoded `80px` offset since the header will be sticky, not fixed

### Out of scope

- Light/dark mode switcher
- Landing page action buttons (Sign Up / Log In from landing page)
- Submenu (dropdown) support — current nav has no submenus
- Custom animated hamburger toggle
- Any changes to footer, routes, or auth logic

## Behavior

1. **Logo**: Inside `#start` slot, render `<img>` pointing to `/images/opticv-logo-icon.svg` (via `NgOptimizedImage`) with `width="48" height="48"`, followed by a `<span>` with text "Opti CV". The anchor wraps both and applies the landing page logo styles: `flex items-center gap-2 text-3xl font-bold tracking-wider text-primary-700`.

2. **Header positioning**: Change from `position: fixed` to `position: sticky; top: 0; z-index: 20`. Apply a CSS scroll-driven shadow animation (equivalent to landing page's `animate-fadeInShadowLight [animation-range:0%_20rem] [animation-timeline:scroll()]`). Use `background: rgba(255,255,255,0.9)` with `backdrop-filter: blur(4px)` on the `::before` pseudo-element (or directly on the header if pseudo-element is not feasible).

3. **Header height**: Keep `5.5rem` (88px) to match the landing page `h-[5.5rem]`.

4. **Nav link styles** (applied via `#item` template or global override):
   - Base: `font-medium text-neutral-700`
   - Padding: `px-6 py-4`
   - Hover: `hover:text-primary-500` with `transition-colors duration-300`
   - Active route: class `active` → `color: var(--primary-color)` (mapped to landing page's `primary-500`)
   - Remove PrimeNG default active highlight background

5. **Main content offset**: In `app.html`, remove `padding-top: 80px` (or equivalent inline style) from the `<main>` element, since a sticky header does not require an offset.

6. **Scroll shadow animation**: Define a `@keyframes fadeInShadow` that animates `box-shadow` from `none` to `0 4px 24px rgba(0,0,0,0.08)` over the scroll range. Apply with `animation-timeline: scroll()` and `animation-range: 0 20rem` using `@supports` for progressive enhancement (no shadow fallback for browsers without scroll-driven animations).

## Edge Cases

- On mobile (PrimeNG Menubar collapse), the open mobile menu panel should also use white/semi-transparent background and correct text color.
- If `NgOptimizedImage` requires a known width/height, provide them explicitly (`width="48" height="48"`).
- The scroll-driven animation CSS properties (`animation-timeline`, `animation-range`) are modern; use `@supports` or accept graceful degradation (header is still functional without the animation).
- `routerLinkActive` on the `#item` template `<a>` tag: verify that PrimeNG's `p-menubar-item-link` class does not conflict with the custom `.active` color rule.

## Data / API

- No backend changes.
- No new dependencies required.
- Logo asset: `apps/opticv-web/public/images/opticv-logo-icon.svg` (already committed).

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-web`)
- No TypeScript errors (`npm exec nx typecheck opticv-web`)
- Logo SVG + "Opti CV" text appear in the header
- Nav links show green color on hover and on active route
- Header sticks to top on scroll with a subtle shadow appearing after scrolling
- Green bottom border is removed
- Existing Sign In / Sign Out / avatar behavior is unchanged
- Existing unit tests pass (`npm exec nx test opticv-web`)
- No AXE accessibility regressions (logo `<img>` has meaningful `alt`, nav has `aria-label`)
