# OptiCV Design System

The design system for **OptiCV** — an AI app that optimizes your CV to pass Applicant Tracking Systems (ATS), then generates a tailored cover letter and interview prep, all matched to a specific job posting.

> **Tagline:** *Land more interviews — one tailored CV at a time.*

The product flow: **upload your CV once → paste a job description → get an ATS-optimized CV, cover letter and interview prep in under 2 minutes.** Core features: ATS score analysis ("Resume Autopsy"), keyword-gap analysis, professional-summary rewrites, achievement-led bullet upgrades, tailored cover letters, and interview prep.

---

## Sources

This system was reverse-engineered from two attached codebases (read-only, mounted locally — not bundled here):

| Source | Stack | What it gave us |
|---|---|---|
| `opticv-web/` | Angular 18 + PrimeNG + PrimeIcons + Tailwind v4 | The product app: tokens (`src/assets/css/colors.css`), the optimization/upload/dashboard/home screens, the score-ring + severity-pill patterns, PrimeIcons icon usage. |
| `opticv-landing-page/` | Astro + Tailwind v3 | The marketing site: full color ramps (`tailwind.config.mjs`), finalized copy (`docs/landing-page-content.md`), the logo SVGs, hero imagery. |

Uploaded font: `Montserrat-VariableFont_wght.ttf` (the heading typeface).

---

## Content fundamentals

**Voice:** friendly, encouraging, second-person. Always speak to **"you" / "your"**, never "users" or "the customer." Lead with the **benefit**, then explain the mechanism.

**Casing:** sentence case for headings and buttons (e.g. *"Optimize my CV"*, *"Everything you need to apply with confidence"*). Title Case only for proper feature names (*Resume Autopsy*, *Keyword Gap Analysis*).

**Tone rules:**
- Concrete over abstract: *"get an optimized version in under 2 minutes"* — not *"streamline your workflow."*
- Plain language, no jargon or hype. Explain ATS in human terms.
- Honest: industry stats are flagged *[verify source]*; no fake testimonials; pricing marked placeholder until confirmed.
- Consistent CTAs: the primary CTA is always exactly **"Optimize my CV"** — never paraphrased.
- **No emoji.** Punctuation is calm — minimal exclamation marks.

**Representative copy:**
- Hero: *"AI rewrites your CV for the exact job you're chasing, so it passes ATS filters and lands on a real recruiter's desk."*
- Microcopy: *"Free to start · No credit card needed"*
- Reassurance: *"No templates to wrestle with. No guessing what recruiters want."*
- Footer: *"Made for job seekers who deserve better odds."*

---

## Visual foundations

**Color.** Emerald green is the brand. `--primary-600` (#059669) is the action color; `--primary-500` (#10b981) is the bright hover/accent. Lime `--accent-500` (#d7e506) is a high-energy secondary used *sparingly* — the Pro plan border, the final-CTA button, a wavy underline. Neutrals are the **slate** scale (cool grey-blue), used for text and borders; in the app these map to PrimeNG's "surface" scale. Backgrounds are mostly white and `--neutral-50`; section bands use the soft `--light-yellow` (#fdffde). Status/severity is a fixed semantic set: red=critical, orange=high, amber=medium, slate=low, emerald=success, blue="Required". The brand "black" is a soft charcoal (#404040), never pure black.

**Type.** Two families. **Montserrat** (semibold 600 / bold 700) for all headings and display — tight line-height (1.1), balanced wrapping. **Lato** (400 / 700) for body and UI, 1.5–1.6 line-height. Buttons and the logo use wide letter-spacing (0.05em). Body default is slate-700 at 16px.

**Imagery.** Warm, candid lifestyle photography (real job-seekers, natural light) for heroes — see `assets/images/app-hero.jpg`. Product screenshots sit on the `--neutral-50` hero background with a rounded top and a large soft shadow. No illustration system; no stock-vector clip art.

**Shape & elevation.** Corners are modest: 4px buttons/badges, 8px inputs/list rows, 12px cards, full-round for pills, avatars, score rings and icon circles. Shadows are **soft and low-contrast slate** — cards rest gently above the page (`--shadow-card`: `0 2px 8px rgba(15,23,42,.06)`); hero CTAs get a tinted emerald glow. Cards are white with either a soft shadow *or* a 1px slate-200 border (not both); the "step" card adds a 4px emerald left accent.

**Motion.** Restrained. 300ms ease (`cubic-bezier(.4,0,.2,1)`) on color/shadow transitions; the sticky header fades in a shadow on scroll and uses a backdrop blur (glassy translucent white). Score rings animate their arc on mount (600ms). No bounces, no infinite loops, no parallax.

**Interaction states.** Hover = a step darker (primary 600→700) or a soft tint fill for ghost/outline buttons. Focus = a 3px emerald focus ring. Selected list items (keywords, bullets) get an emerald-400 border + primary-50 fill. Disabled primary = primary-300.

**Layout.** Marketing max-width 1440px with responsive horizontal padding (20→32→40→80px). App content is narrower: `max-w-4xl` (896px) for the optimization view, `max-w-2xl` (672px) for forms. Sticky 5.5rem header. Generous vertical section rhythm (64–80px).

---

## Iconography

OptiCV uses **PrimeIcons** (the PrimeNG icon font) throughout the app — referenced as class names like `pi pi-chart-bar`, `pi pi-download`, `pi pi-check-circle`, `pi pi-file-pdf`, `pi pi-spin pi-spinner`. This system links PrimeIcons from CDN (`https://unpkg.com/primeicons@7.0.0/primeicons.css`) in every card and UI kit; components that take an `icon` prop expect a PrimeIcons class string. **No emoji, no unicode glyphs as icons.** Icons inside the emerald feature circles are white; inline status icons take their semantic color (emerald check, amber warning).

**Logos** (`assets/logos/`): `opticv-logo.svg` (full wordmark — a green document-with-checkmark mark + "Opti" in dark emerald, "CV" in brand emerald), `opticv-logo-icon.svg` (the mark alone, used as the app/favicon mark and reversed to white on emerald), `opticv-logo-splash.svg`. The wordmark text is set in Segoe UI in the source SVG; lockups recreated in HTML use Montserrat.

> ⚠️ The source repos' generic `favicon.svg`/`logo.svg` are leftover **template** assets (a pink gem) — *not* OptiCV brand. Ignore them; use the `opticv-*` logos only.

---

## File index

```
styles.css                  ← single entry point consumers link (imports only)
tokens/
  colors.css                emerald / lime / slate ramps, semantic + surface aliases
  typography.css            Montserrat + Lato families, scale, weights, tracking
  spacing.css               4px spacing grid, radii, layout widths, breakpoints
  elevation.css             soft slate shadows, focus ring, transitions
  fonts.css                 @font-face (Montserrat); Lato via Google Fonts in styles.css
components/
  components.css            token-based component classes (.ocv-*)
  forms/                    Button · Input · Checkbox
  feedback/                 Badge · SeverityBadge · Callout · ScoreRing
  data-display/             Card · Avatar · FeatureCard · StepCard · StatTile · Accordion
ui_kits/
  app/                      OptiCV web-app click-through (Home/Upload/Optimize/Dashboard)
  marketing/                OptiCV landing page (hero/stats/features/pricing/FAQ/CTA)
guidelines/                 foundation specimen cards (Type, Colors, Spacing, Brand)
assets/
  logos/                    opticv-logo*.svg
  images/                   app-hero, homepage-preview, circle-wavy, hero-01
  fonts/                    Montserrat variable TTF
SKILL.md                    Agent Skill entry point
```

### Components (13)
`Button`, `Input`, `Checkbox` · `Badge`, `SeverityBadge`, `Callout`, `ScoreRing` · `Card`, `Avatar`, `FeatureCard`, `StepCard`, `StatTile`, `Accordion`.

Each lives in its own directory with `<Name>.jsx`, `<Name>.d.ts` (props contract), `<Name>.prompt.md` (usage), and a shared `*.card.html` specimen. Load the compiled bundle via `<script src=".../_ds_bundle.js">` and read components from `window.OptiCVDesignSystem_167779`.

### UI kits (2)
`ui_kits/app/` — the product app · `ui_kits/marketing/` — the landing page. Both open via their `index.html`.
