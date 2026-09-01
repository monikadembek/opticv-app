# CV Builder — Research

## Goal

Let users build a CV from scratch inside the app (no upload required), and reuse the same form to fix up AI-extracted CV data that came out wrong (e.g. bad column/table parsing, see task #74).

## How it fits the existing app

No new data model is needed — `CvStructuredData` (contact, summary, experience, education, skills, certifications, projects, languages, GDPR clause) already is the CV builder's data model. Today it's only ever populated by AI extraction from an uploaded file (`CvDocument.structuredData`); a builder just adds a second way to populate the same field: a user typing into a form.

Everything downstream already works on `CvStructuredData` and needs no changes:

- Templates + accent colors + A4 preview (`CvA4Preview`) render this structure to screen, PDF, and DOCX.
- `applySelectionsToCV` already proves the pattern of structured data in → merged structured data out → export.
- The CV Optimization flow (paste job description → run the 7 AI prompts) accepts any CV with `structuredData` populated — a builder-created CV can flow straight into it.

## Decisions

**Scope: one reusable form, two entry points.**
A single structured-data form component powers both:
1. "Create CV from scratch" — blank form → new `CvDocument` with no underlying file.
2. "Edit CV" — pre-filled from an existing `structuredData` (uploaded + AI-extracted) → lets users correct bad extractions.

**Tier limits: separate from `maxStoredCvs`.**
Builder-created/edited CVs do **not** count against the existing `maxStoredCvs` cap or reuse `allowedTemplates` gating as-is — they get their own limit. Still to decide when scoping the implementation task:
- Quota-style (like `LimitedFeature` — resets monthly), vs.
- Cap-style (like `maxStoredCvs` — a storage ceiling, doesn't reset).
This choice determines whether gating happens at creation time (cap) or at usage/period time (quota).

## Proposed feature outline

### Data model
No new tables. A builder-created CV is a `CvDocument` row with `structuredData` populated directly; no underlying file (`storageKey`/`fileName` need to become nullable or get a sentinel value); `parseStatus`/`extractionStatus` marked not-applicable/complete.

### UI
Multi-section form, accordion-based (same pattern as `cv-optimization`), with a live A4 preview alongside it via the existing `CvA4Preview` component. Sections, mirroring `CvStructuredData`:

- Contact info
- Summary
- Experience (repeatable, with bullets)
- Education
- Skills
- Certifications, Projects, Languages (optional/secondary)
- GDPR clause (reuse existing checkbox logic from task #104)

### Entry points
1. Dashboard → "Create CV" → blank form → save → new `CvDocument`.
2. Dashboard/CV list → "Edit" on an existing CV → form pre-filled from `structuredData` → save → `PATCH` updates the same `CvDocument`.

### Backend additions
- `POST /cv/manual` (or similar) — create a `CvDocument` from a `CvStructuredData` payload, gated by the new builder limit.
- `PATCH /cv/:id/structured-data` — save edits (autosave-friendly, matches the pattern already used in task #28).
- New tier limit field (e.g. `maxBuilderCvs` or a new `CV_BUILDER` entry in `LimitedFeature`) + gating logic.

### Payoff
Once saved, a builder CV flows straight into the existing optimization pipeline unchanged. Also directly addresses:
- Task #64 — users who land on the app with no CV and don't know what to do next.
- Task #74 — bad AI extraction from CVs with columns/tables/graphics; the builder becomes the fix-up path.

## Open items for implementation scoping

- Quota-style vs. cap-style limit for builder CVs (see above).
- Whether "Edit CV" on an uploaded CV modifies `structuredData` in place or creates a new derived `CvDocument`.
- Whether template/export gating (`allowedTemplates`) applies the same way to builder CVs as uploaded ones.
