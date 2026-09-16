# Implementation Plan: Task 61 — LinkedIn Section: Skills Improvements

## Prerequisites

- Spec review result: **PASS**
- No dependency installations needed — all packages already present.
- Rebuild order: `@opticv/datatypes` must be rebuilt before the frontend or backend
  apps are type-checked/built.

---

## Step 1 — Shared Type: `packages/shared/datatypes/src/lib/datatypes.ts`

**What to change:**

1. Add a new exported type `RecommendedSkill` immediately before the
   `LinkedInRewriteResult` type:
   ```
   export type RecommendedSkill = {
     name: string;
     isNew: boolean;
   };
   ```
2. In `LinkedInRewriteResult`, replace `skillsToAdd?: string[];` with
   `recommendedSkills?: RecommendedSkill[];`.
   - Keep the field optional (backward compat with stored results that may still
     be in transit; the one stored DB record will be deleted separately).

**Verify:** `skillsToAdd` no longer appears in `datatypes.ts`.

---

## Step 2 — Backend Seed: `apps/opticv-be/prisma/seed.ts`

**What to change:**

1. In the `seeds` array, locate the `LINKEDIN_REWRITE v2.0.0` entry (currently the
   last entry, `isActive: true`). Change its `isActive` to `false`.

2. Append a new seed object after `v2.0.0` — `LINKEDIN_REWRITE v3.0.0`:
   - `promptType: PromptType.LINKEDIN_REWRITE`
   - `version: '3.0.0'`
   - `isActive: true`
   - `modelPreference: 'gpt-4o-mini'`
   - `maxTokens: null`
   - `notes`: `'v3.0.0: merged, ranked, deduplicated recommended skills list (CV + gap), max 50, isNew flag'`

   **systemPrompt** — copy v2.0.0's system prompt and insert a "Skills section
   strategy" block after the existing "About section principles" section:
   ```
   Skills section strategy:
   - Start from the candidate's existing CV skills present in <parsed_resume_sections>.
   - Add target-role skills that are missing from the CV, identified from the job description.
   - Deduplicate case-insensitively.
   - Rank all skills by recruiter-search relevance for the target role (most valuable first).
   - Cap the list at 50 skills.
   - Set isNew: true for newly-suggested gap skills; isNew: false for skills already present in the CV.
   - Never invent skills the candidate does not have and that the job description does not call for.
   ```

   **userPromptTemplate** — copy v2.0.0's and replace item 3 (the skills item):
   - Old: `3. Skills to add based on the target role requirements and CV content`
   - New: `3. A complete, ranked recommended skills list that merges CV skills with target-role gap skills (deduplicated, ranked by recruiter-search relevance, max 50, each flagged isNew: true if newly suggested or isNew: false if already on the CV)`

   **outputSchema** — copy v2.0.0's `submit_linkedin_sync` schema and:
   - Remove the `skillsToAdd` property.
   - Add `recommendedSkills` property at the same level:
     ```json
     "recommendedSkills": {
       "type": "array",
       "maxItems": 50,
       "items": {
         "type": "object",
         "required": ["name", "isNew"],
         "properties": {
           "name": { "type": "string" },
           "isNew": { "type": "boolean" }
         }
       }
     }
     ```
   - Leave the top-level `required` array unchanged (field stays optional).

**After coding:** Run `npm run seed` to apply. Verify in Prisma Studio:
- Exactly one `LINKEDIN_REWRITE` row with `isActive = true` (v3.0.0).
- v2.0.0 row has `isActive = false`.

---

## Step 3 — Frontend Component: `linkedin-updates.ts`

**What to change:**

1. Update the import from `@opticv/datatypes` to include `RecommendedSkill`:
   ```
   import type { LinkedInRewriteResult, RecommendedSkill } from '@opticv/datatypes';
   ```

2. Replace the existing `hasSkills` computed with three new computeds:
   ```
   protected readonly recommendedSkills = computed<RecommendedSkill[]>(
     () => this.result().recommendedSkills?.slice(0, 50) ?? [],
   );
   protected readonly hasSkills = computed(() => this.recommendedSkills().length > 0);
   protected readonly skillsCount = computed(() => this.recommendedSkills().length);
   ```

3. Add a `copyAllSkills()` method after the existing `copyToClipboard()` method:
   ```
   protected copyAllSkills(): void {
     this.copyToClipboard(this.recommendedSkills().map((s) => s.name).join(', '));
   }
   ```

**No other changes** to imports, the class, or decorators.

---

## Step 4 — Frontend Template: `linkedin-updates.html` (Section C only)

Replace the entire `<!-- Section C: Skills to Add -->` block with the new markup.

**New Section C structure:**

1. Section heading row — flex container with:
   - `<h3>` text: **"Recommended LinkedIn Skills"**
   - Count badge: `{{ skillsCount() }} / 50`

2. `@if (hasSkills())` block containing:
   - A "Copy all" `p-button` with:
     - `icon="pi pi-copy"`
     - `label="Copy all"`
     - `size="small"`, `severity="secondary"`, `[text]="true"`
     - `ariaLabel="Copy all skills"`
     - `(onClick)="copyAllSkills()"`
   - A `div.flex.flex-wrap.gap-2` with `@for (skill of recommendedSkills(); track skill.name)`:
     - If `!skill.isNew`: blue chip
       `class="inline-flex items-center rounded-full px-3 py-1 text-sm bg-blue-100 text-blue-800"`
       — displays `{{ skill.name }}`
     - If `skill.isNew`: green chip with a "new" badge
       `class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm bg-green-100 text-green-800"`
       — displays `{{ skill.name }}` and a `<span>` badge
       `class="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800"` with text `new`

3. `@else` block: `<p class="text-sm text-gray-500">No skills recommended</p>`

**Conventions to follow:**
- `@if` / `@for` native control flow with `track`.
- `class` bindings (not `ngClass`).
- No new PrimeNG components beyond `Button` (already imported).
- All ARIA/WCAG AA requirements: the "Copy all" button has `ariaLabel`; chips use semantic `<span>` elements.

---

## Step 5 — Export Service: `linkedin-export.service.ts`

**What to change:**

1. Add `RecommendedSkill` to the type import from `@opticv/datatypes`.

2. **PDF — Section 3** (around line 149–156):
   - Change section title from `'Skills to Add'` to `'Recommended LinkedIn Skills'`.
   - Replace `const skills = result.skillsToAdd ?? [];` with
     `const skills = result.recommendedSkills ?? [];`
   - Replace the body render: instead of `skills.join(', ')`, build a single
     string joining skill names with `(new)` appended for new skills:
     ```
     skills.map((s: RecommendedSkill) => s.isNew ? `${s.name} (new)` : s.name).join(', ')
     ```
   - Change empty-state text from `'None suggested'` to `'No skills recommended'`.

3. **DOCX — Section 3** (around line 284–293):
   - Change `heading1` argument from `'Skills to Add'` to
     `'Recommended LinkedIn Skills'`.
   - Replace `const skills = result.skillsToAdd ?? [];` with
     `const skills = result.recommendedSkills ?? [];`
   - Replace the loop body: instead of `bullet(skill)`, use
     `bullet(s.isNew ? \`${s.name} (new)\` : s.name)` where the loop variable is
     `s: RecommendedSkill`.
   - Change empty-state `body(...)` text from `'None suggested'` to
     `'No skills recommended'`.

---

## Step 6 — Unit Tests: `linkedin-updates.spec.ts`

**What to change:**

1. In `MOCK_RESULT`, replace `skillsToAdd: ['TypeScript', 'RxJS']` with:
   ```
   recommendedSkills: [
     { name: 'TypeScript', isNew: false },
     { name: 'RxJS', isNew: true },
   ],
   ```

2. Replace the `describe('skills to add')` block with `describe('recommended skills')`:
   - `'renders skill chips when recommendedSkills is non-empty'`
     — checks DOM contains `'TypeScript'` and `'RxJS'`
   - `'renders blue chip for CV skill (isNew: false)'`
     — checks the TypeScript chip has class `bg-blue-100`
   - `'renders green chip for new skill (isNew: true)'`
     — checks the RxJS chip has class `bg-green-100`
   - `'shows new badge on new skills'`
     — checks DOM contains `'new'` badge text adjacent to RxJS chip
   - `'shows "No skills recommended" when recommendedSkills is empty'`
     — sets input `{ ...MOCK_RESULT, recommendedSkills: [] }`, asserts text
   - `'shows "No skills recommended" when recommendedSkills is undefined'`
     — sets input `{ ...MOCK_RESULT, recommendedSkills: undefined }`, asserts text

3. Replace the `describe('hasSkills')` block:
   - `'returns true when recommendedSkills is non-empty'`
   - `'returns false when recommendedSkills is empty'` (set `recommendedSkills: []`)
   - `'returns false when recommendedSkills is undefined'` (set `recommendedSkills: undefined`)

4. Add `describe('skillsCount')`:
   - `'returns the number of recommendedSkills'` — asserts `comp().skillsCount() === 2`
   - `'returns 0 when recommendedSkills is undefined'` — asserts `0`

5. Add `describe('recommendedSkills computed')`:
   - `'slices to 50 entries when more than 50 are provided'`
     — set input with 51 items, assert `comp().recommendedSkills().length === 50`
   - `'preserves array order (no re-sort)'`
     — confirm order matches input order

6. Add `describe('copyAllSkills')`:
   - `'copies comma-joined skill names to clipboard'`
     — calls `comp().copyAllSkills()`, asserts `clipboard.writeText` was called
     with `'TypeScript, RxJS'`

7. Keep all other `describe` blocks unchanged (headline, about, recommendations,
   queries, sortedRecommendations, priorityClass, charCountClass, copyToClipboard,
   export buttons).

---

## Step 7 — Unit Tests: `linkedin-export.service.spec.ts`

**What to change:**

1. In `MOCK_RESULT`, replace `skillsToAdd: ['TypeScript', 'RxJS']` with:
   ```
   recommendedSkills: [
     { name: 'TypeScript', isNew: false },
     { name: 'RxJS', isNew: true },
   ],
   ```

2. Find every test that references the old `skillsToAdd` field or old text
   (`'None suggested'`, `'Skills to Add'`) and update:
   - Test descriptions referencing `skillsToAdd` → update to `recommendedSkills`
   - Section title assertions: `'Skills to Add'` → `'Recommended LinkedIn Skills'`
   - Empty-state assertions: `'None suggested'` → `'No skills recommended'`
   - Skill name rendering: existing name checks (`'TypeScript'`, `'RxJS'`) still
     hold — add assertions for `(new)` suffix on `'RxJS (new)'`
   - Empty/undefined `recommendedSkills` tests:
     set `{ ...MOCK_RESULT, recommendedSkills: [] }` and
     `{ ...MOCK_RESULT, recommendedSkills: undefined }` respectively

3. For PDF bullet test (currently `'uses bullet paragraphs for skillsToAdd items'`):
   rename and update to assert PDF renders `'TypeScript'` (no suffix) and
   `'RxJS (new)'` (with suffix).

4. For DOCX bullet test: same rename and suffix assertions as PDF.

---

## Step 8 — DB Data Cleanup

Before running the seed or starting the app with the new code, delete the one
existing stored LinkedIn optimization result from the database.

Use Prisma Studio (`npm exec prisma studio --schema=apps/opticv-be/prisma/schema.prisma`)
or a direct SQL statement:
```sql
DELETE FROM "OptimizationResult" WHERE "promptType" = 'LINKEDIN_REWRITE';
```

This is a manual step; it is **not** automated in seed or migrations.

---

## Step 9 — Seed Execution

```bash
npm run seed
```

Expected output includes:
```
Upserted: LINKEDIN_REWRITE v3.0.0
```

Verify in Prisma Studio: exactly one `LINKEDIN_REWRITE` row has `isActive = true`.

---

## Step 10 — Verification Checklist

Run in order:

```bash
npm exec nx build @opticv/datatypes
npm exec nx typecheck opticv-web
npm exec nx typecheck opticv-be
npm exec nx lint opticv-web
npm exec nx lint opticv-be
npm exec nx test opticv-web
npm exec nx test opticv-be
npm exec nx format:check
```

All commands must exit cleanly with no errors.

---

## Step 11 — Manual E2E

1. Start backend: `npm run start-be:dev`
2. Start frontend: `npm exec nx serve opticv-web`
3. Run a fresh CV optimization that triggers the LinkedIn Boost feature.
4. Confirm Section C shows:
   - Heading: "Recommended LinkedIn Skills"
   - Count badge: `n / 50`
   - CV skills as blue chips (`bg-blue-100 text-blue-800`)
   - New skills as green chips with a "new" badge (`bg-green-100 text-green-800`)
   - "Copy all" button — clicking copies comma-joined skill names to clipboard
5. Export PDF: section title is "Recommended LinkedIn Skills", skills appear ranked
   with `(new)` marker on new skills, empty state shows "No skills recommended".
6. Export DOCX: same checks.
7. Run AXE / WCAG AA check on Section C (focus, contrast, ARIA).

---

## Files Modified

| File | Action |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Modified — add `RecommendedSkill`; replace `skillsToAdd` in `LinkedInRewriteResult` |
| `apps/opticv-be/prisma/seed.ts` | Modified — flip v2.0.0 `isActive: false`; add v3.0.0 entry |
| `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/linkedin-updates.ts` | Modified — replace `hasSkills` computed; add `recommendedSkills`, `skillsCount`, `copyAllSkills()` |
| `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/linkedin-updates.html` | Modified — replace Section C |
| `apps/opticv-web/src/app/features/cv-optimization/components/linkedin-updates/linkedin-updates.spec.ts` | Modified — update MOCK_RESULT; replace skills tests; add new computeds/action tests |
| `apps/opticv-web/src/app/features/cv-optimization/services/linkedin-export.service.ts` | Modified — update Section 3 (PDF + DOCX) title, skill rendering, empty state |
| `apps/opticv-web/src/app/features/cv-optimization/services/linkedin-export.service.spec.ts` | Modified — update MOCK_RESULT; update all `skillsToAdd` references |
