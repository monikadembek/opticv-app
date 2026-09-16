Task 96: CV Optimization Results Page — UI/UX Improvement

Context
The CV optimization results page (cv-optimization.html/.ts) renders 7-9 result sections (ATS Analysis, Keyword Gap, Summary Rewrite, Bullet Upgrades, Cover Letter, Interview Prep, LinkedIn Profile, plus Job Posting) stacked vertically. Once an optimization run completes, the page is reportedly 15-20 screens of scrolling — a real risk that users won't read through it or won't discover value further down (e.g. Cover Letter, Interview Prep, LinkedIn Profile near the bottom).

Investigation shows the infrastructure to solve this already exists and is simply unused: every section is wrapped in a collapsible app-section-card component with a working collapsed model, there's a sidebar (app-optim-sidebar) with jump-to-section nav, live ATS/keyword score rings, per-section status icons, and an existing "Expand All / Collapse All" button. The actual bug: collapsedSections in cv-optimization.ts (line 255) initializes to an empty Set, so every section renders fully expanded by default — the entire wall of content is what a user sees immediately on page load, before they've had a chance to decide what to look at.

**To do:** 

1. Default to "first section open, rest collapsed"
In cv-optimization.ts, collapsedSections (line 255) currently starts empty. Add one-time initialization (via effect() guarded by an initializedDefaults flag, so it only fires once per optimization run and doesn't fight the user's manual toggles) that sets it to new Set(allSectionIds().filter(id => id !== PromptType.RESUME_AUTOPSY)) once results start arriving (pageState() becomes processing/completed).

Why ATS Analysis stays open: it's first in section order, already has a live projected score, and is the section users conceptually check first ("did this work / how good is my CV now"). Collapsing the other 6 removes ~90% of the initial wall of text — Keyword Gap alone is a 510-line template.

Nav-driven expansion needs no fix: handleSectionClick (cv-optimization.ts ~538) already un-collapses a section before scrolling to it, so sidebar/mobile-tab clicks will correctly open a collapsed section.