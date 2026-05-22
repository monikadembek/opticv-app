# Code Review

Task ID: 27-retry-failed-optimization

---

### Summary

- **Overall result: PASS**
- The implementation correctly follows the spec and plan. All six panels have a working Retry button gated by a `retryablePromptTypes` computed signal. Signal update patterns, null guards, and RxJS cleanup are correct. One minor accessibility concern and one cosmetic template inconsistency are noted but neither is blocking.

---

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **`cv-optimization.html` — PrimeNG button `(onClick)` vs `(click)`**
   Lines 51, 96, 141, 186, 231, 276 use `(onClick)` (PrimeNG event). This works, but the conventions file and Angular best practices prefer native DOM event bindings `(click)` when there is no PrimeNG-specific payload needed. Not a bug, but inconsistent with how other interactive elements are wired in the template.

2. **`cv-optimization.html` — Retry button has no accessible label beyond "Retry"**
   The button shows only `label="Retry"` with an icon. With six identical "Retry" buttons on the page, screen readers cannot distinguish which panel each button targets. Per conventions (WCAG AA), each button should carry an `ariaLabel` input (e.g. `ariaLabel="Retry ATS Analysis"`) so it is announced in context. This is a non-critical accessibility gap — the component still works, but fails WCAG 2.4.6 (descriptive labels for identical controls).

---

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Store `jobApplicationId` as a component signal | Covered | `signal<string \| null>(null)` at line 120 |
| Reset `jobApplicationId` on new run | Covered | Set alongside `results`/`isProcessing` reset in `runOptimization` line 182 |
| `retryOptimization(promptType)` method added | Covered | Lines 219–252 |
| Guard early if `jobApplicationId()` is null | Covered | Line 221 |
| Set `isProcessing` to true before retry | Covered | Line 223 |
| Call `runSingleOptimizationProcess` then stream | Covered | Lines 225–233 |
| `next`: set processing false, update results | Covered | Lines 237–243 |
| `error`: set processing false, do NOT update results | Covered | Lines 244–250 |
| `takeUntilDestroyed` for cleanup | Covered | Line 234 |
| `retryablePromptTypes` computed signal | Covered | Lines 152–177 |
| Panel retryable when status `'failed'` | Covered | Line 169 |
| Panel retryable when status `'completed'` and computed is null | Covered | Lines 170–171 |
| Skip processing panels in retryable set | Covered | Line 166 |
| Skip all when `jobApplicationId` is null | Covered | Line 154 |
| Retry button added to panels 1–6 | Covered | All six panels in template |
| Retry button absent from panel 0 (upload) | Covered | Panel 0 has no Retry block |
| Retry button absent from panel 7 (LinkedIn) | Covered | Panel 7 has no Retry block |
| Button disabled while processing | Covered | `[disabled]` binding on all six buttons |
| `ButtonModule` added to imports | Covered | Line 14 in ts, line 100 in imports array |
| No `any` types introduced | Covered | `Array<[PromptType, unknown]>` used correctly |

---

### Plan Deviations

None. All six implementation steps from the plan are reflected in the code. `retryablePromptTypes` is built exactly as specified using the `promptResultPairs` array pattern. Button markup matches the plan's template snippet. `switchMap` is used as directed.

---

### Null Safety Issues

None. All `Map.get()` calls are guarded with `?.` or `?? false`. The `jobApplicationId` null check is the first guard in `retryOptimization`. The `retryablePromptTypes` computed exits early when `jobApplicationId()` is null.

---

### Code Smells

1. **`retryablePromptTypes` reads `results()` twice per loop iteration** (line 166 for `isProcessing`, line 167 for `status`). The `results()` map is accessed inside the loop body after already being accessed implicitly through the computed `autopsyResult()` etc. calls in `promptResultPairs`. This is fine for correctness and Angular's signal graph, but could be tightened by caching `const results = this.results()` and `const isProcessing = this.isProcessing()` before the loop. Minor readability issue only — not a bug.

2. **`retryOptimization` uses `event.promptType` instead of the closure-captured `promptType` in the `next` handler** (line 242). Both values should be the same since the stream is for a single prompt, but using `event.promptType` is slightly looser than using the locally captured `promptType`. Harmless in practice.

---

### Recommendation

**Merge as-is.** The two non-critical items (accessible button labels and `(onClick)` vs `(click)`) can be addressed in a follow-up; neither affects correctness or spec compliance.
