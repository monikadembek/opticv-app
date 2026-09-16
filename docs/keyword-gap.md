# Plan: Add experience_bullet keyword placement to optimized CV

## Context

Keywords with `suggestedPlacement === 'experience_bullet'` are currently silently skipped in `applySelectionsToCV` — selecting them does nothing to the exported CV. The goal is to let users assign such keywords to a specific experience position, which appends a new bullet (using the keyword's `recommendation` text) to that position in the exported CV.

Bullet text is the `recommendation` field from the keyword (a full sentence). The user can still edit it via the existing Edit pencil before exporting.

## Approach

Reuse every existing pattern — the `selectedMissingBullets` / `missingBulletEdits` / `persistBulletState` flow for appending bullets, and the existing `keywordEdits` Map for the edit override. No new API endpoints or DB changes needed.

When a keyword with `experience_bullet` placement is selected (checkbox checked), an inline `<select>` appears for the user to pick which experience position to add the bullet to. On position pick, the assignment is stored in a new `keywordBulletPositions` signal/map, and persisted into `BulletUserState`. `applySelectionsToCV` appends `recommendation` text (or edited text from `keywordEdits`) to the chosen experience entry's `bullets` array.

---

## Files to modify

| File | Change |
|------|--------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `keywordBulletPositions?` to `BulletUserState` |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` | Add 2 inputs, 1 output, 2 helper methods |
| `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.html` | Render position `<select>` when keyword is selected + placement is `experience_bullet` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.ts` | Add signal, computed, handler, hydration, persistence, pass to `applySelectionsToCV` |
| `apps/opticv-web/src/app/features/cv-optimization/cv-optimization.html` | Wire 2 new inputs + 1 new output on `<app-keyword-gap>` |
| `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.ts` | Add `keywordBulletPositions` param; handle `experience_bullet` branch |
| `apps/opticv-web/src/app/features/cv-optimization/utils/apply-selections.spec.ts` | Add test cases for new branch |

---

## Step-by-step

### 1. `datatypes.ts` — extend `BulletUserState`

```typescript
keywordBulletPositions?: Array<{ keyword: string; forPosition: string }>;
```

Optional for backwards compatibility with stored payloads that predate this change.

---

### 2. `keyword-gap.ts` — new inputs, output, helpers

**New inputs:**
```typescript
readonly experiencePositions = input<string[]>([]);
readonly keywordBulletPositions = input<Map<string, string>>(new Map());
```

**New output:**
```typescript
readonly keywordBulletPositionSelected = output<{ keyword: string; forPosition: string }>();
```

**New helper methods:**
```typescript
getKeywordPosition(keyword: string): string {
  return this.keywordBulletPositions().get(keyword) ?? '';
}

onPositionChange(keyword: string, forPosition: string): void {
  this.keywordBulletPositionSelected.emit({ keyword, forPosition });
}
```

---

### 3. `keyword-gap.html` — inline position picker

Apply to both keyword list sections (`missingLikelyHas` and `missingGenuinelyLacks`). Render immediately after the `@if (isEditingKeyword...)` edit section block, before the `<p class="recommendation">`:

```html
@if (isSelected(item.keyword) && item.suggestedPlacement === 'experience_bullet') {
  <div class="mt-2 flex items-center gap-2">
    <label [for]="'kw-pos-' + item.keyword" class="text-xs text-surface-600 shrink-0">
      Add to position:
    </label>
    <select
      [id]="'kw-pos-' + item.keyword"
      class="text-sm border border-(--border-subtle) rounded px-2 py-1 flex-1 bg-white"
      [value]="getKeywordPosition(item.keyword)"
      (change)="onPositionChange(item.keyword, $any($event.target).value)"
    >
      <option value="">— pick a position —</option>
      @for (pos of experiencePositions(); track pos) {
        <option [value]="pos">{{ pos }}</option>
      }
    </select>
  </div>
  @if (!getKeywordPosition(item.keyword)) {
    <p class="text-xs text-amber-600 mt-1">Pick a position to include this in your CV.</p>
  }
}
```

The picker appears only when the keyword is selected. Unchecking hides it. The position assignment is retained in the map if the user re-checks.

---

### 4. `cv-optimization.ts` — signal, computed, handler, hydration, persistence

**New signal** (after `keywordEdits`):
```typescript
readonly keywordBulletPositions = signal<Map<string, string>>(new Map());
```

**New computed** (after `keywordGapResult`):
```typescript
readonly experiencePositionLabels = computed<string[]>(() =>
  (this.cvStructuredData()?.experience ?? []).map(
    (e) => `${e.company ?? ''} - ${e.title ?? ''}`
  )
);
```

**Update `mergedCv` computed** — add `this.keywordBulletPositions()` as the new last argument to `applySelectionsToCV`.

**Reset in `runOptimization()`**:
```typescript
this.keywordBulletPositions.set(new Map());
```

**New handler**:
```typescript
onKeywordBulletPositionSelected(event: { keyword: string; forPosition: string }): void {
  this.keywordBulletPositions.update((map) => {
    const next = new Map(map);
    if (event.forPosition === '') {
      next.delete(event.keyword);
    } else {
      next.set(event.keyword, event.forPosition);
    }
    return next;
  });
  this.persistBulletState();
}
```

**Hydration** in `loadStoredOptimization()` inside the `BULLET_UPGRADE` block, after keyword edits hydration:
```typescript
const kwBulletPosMap = new Map<string, string>();
for (const p of state.keywordBulletPositions ?? []) {
  kwBulletPosMap.set(p.keyword, p.forPosition);
}
this.keywordBulletPositions.set(kwBulletPosMap);
```

**Persistence** in `persistBulletState()` inside `buildAndSave()`, alongside `keywordEditsArr`:
```typescript
const keywordBulletPositionsArr: Array<{ keyword: string; forPosition: string }> = [];
for (const [keyword, forPosition] of this.keywordBulletPositions()) {
  keywordBulletPositionsArr.push({ keyword, forPosition });
}
// Add to state object:
keywordBulletPositions: keywordBulletPositionsArr,
```

---

### 5. `cv-optimization.html` — wire bindings

```html
<app-keyword-gap
  ...existing bindings...
  [experiencePositions]="experiencePositionLabels()"
  [keywordBulletPositions]="keywordBulletPositions()"
  (keywordBulletPositionSelected)="onKeywordBulletPositionSelected($event)"
/>
```

---

### 6. `apply-selections.ts` — new parameter and `experience_bullet` branch

Add `keywordBulletPositions: Map<string, string> = new Map()` as the new last parameter.

In the keyword selection loop, split on placement — the `recommendation` field is used as bullet text, with `keywordEdits` override taking precedence:

```typescript
if (placement === 'skills' || placement === 'multiple' || !placement) {
  // existing logic unchanged
} else if (placement === 'experience_bullet') {
  const forPosition = keywordBulletPositions.get(kw);
  if (!forPosition) continue;
  const entry = keywordResult.missingKeywords.find((m) => m.keyword === kw);
  const baseText = entry?.recommendation ?? kw;
  const displayText = keywordEdits.get(kw) ?? baseText;
  const expIndex = clone.experience.findIndex((e) => {
    const dashFormat = `${e.company ?? ''} - ${e.title ?? ''}`;
    const atFormat   = `${e.title ?? ''} at ${e.company ?? ''}`;
    return dashFormat === forPosition || atFormat === forPosition;
  });
  if (expIndex !== -1) {
    clone.experience[expIndex].bullets.push(displayText);
  }
}
```

---

### 7. `apply-selections.spec.ts` — new tests

Add to the keyword selection describe block:

- Keyword with `experience_bullet` + position assigned → bullet appended using `recommendation` text
- Keyword with `experience_bullet` + position assigned + `keywordEdits` override → edited text used
- Keyword with `experience_bullet` + no position assigned → no experience entry modified
- Keyword with `experience_bullet` + non-matching position label → no experience entry modified
- Existing "does not add keywords with placement experience_bullet" test — update to pass empty `keywordBulletPositions` map explicitly

---

## Key reused patterns

- Position matching: `${e.company ?? ''} - ${e.title ?? ''}` / `${e.title ?? ''} at ${e.company ?? ''}` — already in `apply-selections.ts`
- Bullet append: `clone.experience[expIndex].bullets.push(text)` — same as `selectedMissingBullets` path
- Persistence/hydration: same `BulletUserState` JSON + `saveUserOutput` / `loadStoredOptimization` pattern as `keywordEdits`

## Verification

1. `npm exec nx typecheck opticv-web` — should pass
2. `npm exec nx test opticv-web -- --testFile=apply-selections.spec.ts` — all new and existing tests pass
3. `npm exec nx lint opticv-web` — no new errors in modified files
4. Manual: Load a stored optimization, select a keyword whose placement badge shows "experience bullet", verify position picker appears, pick a position, export CV — verify the `recommendation` text appears as a new bullet on that experience entry. Reload page — verify position assignment is restored.
