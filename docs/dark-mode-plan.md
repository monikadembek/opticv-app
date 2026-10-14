# Dark / Light Mode — Implementation Plan

**Status:** Draft (not implemented)
**Estimated effort:** Medium — ~2–4 days. The infrastructure is easy; most of the work is replacing hardcoded colors.

## Current State

- **PrimeNG Aura** is configured in `app.config.ts` without a `darkModeSelector`. PrimeNG's default is `system`, so PrimeNG components already follow the OS `prefers-color-scheme` setting. Users with a dark OS may see dark PrimeNG widgets inside an otherwise light app.
- **Global styles** (`src/styles.css`, `src/assets/css/colors.css`) already define CSS variables (~240 `var(--…)` usages). There is some overlap and inconsistency: `--green` is defined twice, and both `--text-color` and `--text-body` exist.
- **Hardcoded colors still to convert:**
  - ~71 hex and ~12 `rgba()` values in 10 component CSS files. The largest are `welcome-guide-modal`, `export-footer`, `optim-sidebar`, `home`, `login` and `verify`.
  - ~206 Tailwind palette classes (`bg-white`, `text-neutral-600`, …) in templates. Most are in `keyword-gap` (55), `bullet-rewriter` (28), `settings` (26) and `ats-score` (15).
  - ~20 hex values in `.ts` files (`ats-score`, `keyword-gap`, `optim-sidebar`, `cv-templates`).
  - Only `layout/footer/footer.html` uses `dark:` variants so far.
- **Out of scope:** the 119 hex values in `cv-template-preview.html` are the CV document itself. Like the A4 preview, it must stay light (paper) in both modes.

## Plan

### 1. Configure the dark-mode trigger

- In `app.config.ts`, set `darkModeSelector: '.app-dark'` in `providePrimeNG({ theme: { preset, options } })`. This stops PrimeNG from following the OS on its own.
- In `styles.css`, add `@custom-variant dark (&:where(.app-dark, .app-dark *));` so Tailwind `dark:` variants use the same class.
- Enable `cssLayer` in the PrimeNG options and order the layers (`theme, base, primeng, components, utilities`) so Tailwind and PrimeNG styles don't override each other unpredictably.

### 2. Consolidate semantic color tokens

- Merge `colors.css` and the `:root` block in `styles.css` into one set of semantic tokens:
  - `--surface-page`, `--surface-card`, `--surface-muted`
  - `--text-strong`, `--text-body`, `--text-muted`
  - `--border-subtle`
  - `--primary-*`, plus the status colors (`--success`, `--warning`, `--critical`, `--info`)
- Give each token a dark value under `.app-dark { … }`.
- Expose the tokens through `@theme` so Tailwind utilities like `bg-surface-card` and `text-body` switch automatically, without adding `dark:` variants everywhere.
- Optionally, tune the PrimeNG dark palette with `definePreset(Aura, { semantic: { colorScheme: { dark: … } } })` so it matches the brand green.

### 3. `ThemeService` (`core/services/theme.service.ts`)

- Holds the current mode as a signal: `'light' | 'dark' | 'system'`.
- Adds or removes `.app-dark` on `document.documentElement`.
- Saves the choice to `localStorage`.
- In `system` mode, listens to `matchMedia('(prefers-color-scheme: dark)')`.
- **SSR-safe:** checks `isPlatformBrowser` before touching `document`, `localStorage` or `matchMedia`.

### 4. Prevent a flash of the wrong theme on load

- The server can't read `localStorage`, so the first paint would be light before the app switches to dark.
- Fix: add a small inline script in the `index.html` `<head>` that reads the saved preference (and falls back to `prefers-color-scheme`), then sets `.app-dark` on `<html>` before the app starts.
- Alternative: store the preference in a cookie and read it in `server.ts` to render the correct class on the server. This avoids the inline script but needs more wiring.

### 5. Toggle UI

- Add a sun/moon icon button to `layout/top-header`.
- Optional: a Light / Dark / System selector on the Settings page.

### 6. Convert hardcoded colors (bulk of the work)

- Replace hex/rgba values in component CSS files with the semantic tokens.
- Replace Tailwind palette classes in templates with token-based utilities, or add `dark:` variants where a token doesn't fit.
- Move the colors in `.ts` files (score, badge and chart colors) to CSS variables, or select them based on the current theme.
- Force the CV template preview and A4 preview to stay light.

Suggested order, so each step can ship on its own:

1. App shell: header, footer, sidebar, layout
2. Auth pages: login, verify
3. Home, upload-cv, settings
4. cv-optimization feature components
5. Welcome guide modal and banners

### 7. Polish & testing

- Check contrast in dark mode. The brand lime (`#d7e506`) and light-yellow (`#fdffde`) will need dark variants.
- Review shadows (`--shadow-card`) and any images or logos that assume a white background.
- Write unit tests for `ThemeService`: mode switching, persistence, system mode, and SSR safety.
- Visually check every page in both modes.

## Optional Extensions

- **Save the preference to the user's account** so it follows them across devices. This needs a new field in the Prisma user settings model, a backend endpoint update, and changes to `user-settings-api.service`. For a first version, `localStorage` is enough.

## Phasing

- **Phase 1 (~0.5 day):** Steps 1–5. The toggle works and PrimeNG components render correctly in both modes.
- **Phase 2 (~1.5–3 days):** Steps 6–7, converting pages one at a time in the order above.
