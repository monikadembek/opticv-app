# Plan: Recommended LinkedIn Skills — merged & ranked

## Context

The LinkedIn Profile Boost feature currently outputs `skillsToAdd?: string[]` — only a
handful of **new** skills that are missing from the CV (the gap). The user wants this
section to instead present a **complete, recommended LinkedIn skills list**: the user's
existing CV skills **merged** with new gap skills, **deduplicated**, and **ranked by
relevance to the target role / recruiter-search visibility** (most valuable first, since
LinkedIn pins the top skills and recruiters filter on them). LinkedIn's skills section
holds up to 50 skills.

Confirmed product decisions:
- Show a **single merged list** = existing CV skills + new suggested skills (deduped).
- **Rank** by relevance to the target role (most important first).
- **Visually distinguish** CV skills from newly-suggested ones (a small "new" badge),
  while presenting them as one ranked list.

Outcome: users get a ready-to-paste, prioritized skills list instead of just the gap.

## Design decision

Rename `skillsToAdd?: string[]` → `recommendedSkills?: RecommendedSkill[]`:

```typescript
export type RecommendedSkill = {
  name: string;
  isNew: boolean; // true = new gap skill; false = already in the CV
};
```

- The object shape is needed to render the "new" badge without re-deriving `isNew` on the
  frontend (which doesn't have the raw CV skills in this component).
- **Ranking is encoded by array order** (most valuable first) — same convention as the
  existing `sortedRecommendations`. No separate score field.
- Kept **optional** for backward-compat with already-stored results (which have
  `skillsToAdd` and no `recommendedSkills`).
- Renamed rather than overloaded so old vs. new stored data stay unambiguous.

## Changes

### 1. Shared type — `packages/shared/datatypes/src/lib/datatypes.ts`
- Add `RecommendedSkill` type (near the other LinkedIn types, ~line 437).
- In `LinkedInRewriteResult` (lines 438-445), replace line 443
  `skillsToAdd?: string[];` → `recommendedSkills?: RecommendedSkill[];`.
- `@opticv/datatypes` must be rebuilt before dependent apps pick it up (Nx `^build`).

### 2. Backend prompt v3.0.0 — `apps/opticv-be/prisma/seed.ts`
No backend application code references `skillsToAdd`/`LinkedInRewriteResult` (AI output is
persisted/passed through generically), so **only seed.ts changes** on the backend.

- Add a **new** `LINKEDIN_REWRITE` seed entry `version: '3.0.0'`, `isActive: true`
  (sibling of the v2.0.0 block at lines 1127-1273; do not edit v2.0.0's body).
- Flip the existing **v2.0.0** entry (line 1130) to `isActive: false`.
- v3.0.0 content edits vs. v2.0.0:
  - **systemPrompt**: add a "Skills section strategy" block — start from CV skills in
    `<parsed_resume_sections>`, add target-role skills that are missing, dedupe
    case-insensitively, rank by recruiter-search relevance (most valuable first), cap at
    50, set `isNew: true` for newly-suggested gap skills else `false`; never invent skills.
  - **userPromptTemplate**: replace item 3 with a "complete, ranked recommended skills
    list (merge CV + gap, dedupe, rank, max 50, flag new vs existing)".
  - **outputSchema** (`submit_linkedin_sync`, line 1269): replace
    `skillsToAdd: { type: 'array', items: { type: 'string' } }` with:
    ```typescript
    recommendedSkills: {
      type: 'array', maxItems: 50,
      items: {
        type: 'object', required: ['name', 'isNew'],
        properties: { name: { type: 'string' }, isNew: { type: 'boolean' } },
      },
    },
    ```
    Leave the schema `required` array (lines 1179-1184) unchanged (field stays optional).

**Activating the prompt in the DB (important):** runtime resolution is
`getActivePrompt` in `apps/opticv-be/src/app/ai/services/prompt.service.ts`
(`findFirst({ where: { promptType, isActive: true }, orderBy: { createdAt: 'desc' } })`).
The seed `main()` (lines 1277-1298) does an `upsert` keyed on `promptType_version` whose
`update` branch writes `isActive`. So re-running the seed on an existing DB will both
deactivate v2.0.0 and activate v3.0.0 — idempotent and matches the existing
v1.0.0(false)/v2.0.0(true) convention. Explicitly deactivating v2.0.0 is **mandatory**
(`createdAt` isn't refreshed on update, so order alone is unreliable). Run: `npm run seed`.

### 3. Frontend component — `.../linkedin-updates/linkedin-updates.ts`
- Replace `hasSkills` (lines 44-46) with a normalized, backward-compatible computed:
  ```typescript
  protected readonly recommendedSkills = computed<RecommendedSkill[]>(() => {
    const r = this.result();
    if (r.recommendedSkills?.length) return r.recommendedSkills;
    const legacy = (r as { skillsToAdd?: string[] }).skillsToAdd; // old results
    return legacy?.map((name) => ({ name, isNew: true })) ?? [];
  });
  protected readonly hasSkills = computed(() => this.recommendedSkills().length > 0);
  protected readonly skillsCount = computed(() => this.recommendedSkills().length);
  ```
  Array order is already the AI's ranking — no re-sort.
- Add `copyAllSkills()` reusing existing `copyToClipboard` (lines 93-101):
  `this.copyToClipboard(this.recommendedSkills().map((s) => s.name).join(', '))`.

### 4. Frontend template — `.../linkedin-updates/linkedin-updates.html`
Replace Section C (lines 210-226):
- Heading → **"Recommended LinkedIn Skills"** with a `{{ skillsCount() }} / 50` count.
- Add a **Copy all** `p-button` (mirror the copy button at lines 62-70).
- Render ranked chips over `recommendedSkills()`; CV skills as blue chips
  (`bg-blue-100 text-blue-800`), new skills as green chips with a small "new" badge
  (green convention, matching the "Recommended" headline badge at line 42).
- Empty state → "No skills recommended".
Angular 21 conventions preserved: OnPush, signals/`computed`, `input.required`, `@for`/`@if`,
no explicit `standalone: true` (default in Angular 21).

### 5. Export service — `.../services/linkedin-export.service.ts`
- Add a private `resolveSkills(result)` helper (same legacy fallback as the component) and
  import `RecommendedSkill` (lines 3-8 import block).
- **PDF** (Section 3, lines 149-156): title → "Recommended LinkedIn Skills"; use
  `this.resolveSkills(result)`; render comma-joined with `(new)` marker for new skills;
  keep the "None suggested" fallback.
- **DOCX** (Section 3, lines 284-294): same title; iterate `resolveSkills`; emit
  `bullet(s.isNew ? \`${s.name} (new)\` : s.name)`; keep the fallback.

### 6. Handling old stored results (defensive)
Old results were persisted as `skillsToAdd: string[]` and won't be regenerated. The
fallback in the component computed and the export `resolveSkills` helper maps them to
`{ name, isNew: true }` (old data was purely "new" skills). Centralized in two places so
the legacy branch is easy to remove later. No DB migration/backfill required.

## Critical files
- `packages/shared/datatypes/src/lib/datatypes.ts`
- `apps/opticv-be/prisma/seed.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/linkedin-updates.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/linkedin-updates.html`
- `apps/opticv-web/src/app/features/cv-optimization/services/linkedin-export.service.ts`
- (reference only) `apps/opticv-be/src/app/ai/services/prompt.service.ts`

## Verification

```bash
npm exec nx build @opticv/datatypes        # rebuild shared types first (^build)
npm exec nx typecheck opticv-web
npm exec nx typecheck opticv-be
npm exec nx lint opticv-web
npm exec nx lint opticv-be
npm exec nx test opticv-web
npm exec nx test opticv-be
npm exec nx format:check
npm run seed                               # activate v3.0.0 / deactivate v2.0.0
```
- Watch seed output for `Upserted: LINKEDIN_REWRITE v3.0.0`; optionally confirm in
  `prisma studio` that exactly one `LINKEDIN_REWRITE` row has `isActive=true`.

Manual end-to-end:
1. Start backend (`npm run start-be:dev`) + frontend (`npm exec nx serve opticv-web`).
2. Run a fresh CV optimization that triggers the LinkedIn feature.
3. Confirm "Recommended LinkedIn Skills" shows one ranked list — CV skills as blue chips,
   new skills as green chips with a "new" badge, a `n / 50` count, and "Copy all" copies
   the comma-joined names.
4. Export PDF and DOCX; confirm skills appear ranked with `(new)` markers.
5. Open a previously-generated (old) result; confirm its `skillsToAdd` still renders (all
   chips as "new"), proving the fallback.
