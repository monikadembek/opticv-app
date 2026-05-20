# Code Review — Task 20: Trigger Optimization Process from Web

## Summary

- **Overall result: PASS WITH ISSUES**
- The core feature is correctly implemented: `SupabaseGuard` accepts a JWT from the `token` query param, `streamOptimizationEvents()` wraps `EventSource` in an Observable with proper SSR guard and teardown, and the component drives the full run→stream pipeline per `PromptType`. The unit test suite is thorough for the service and component. However, there are two non-trivial issues: (1) debug `console.log` and `tap` calls left in production component code, which the project rules explicitly forbid as incomplete work; (2) the `SupabaseGuard` spec was not updated to cover the new `token` query param path, meaning the new auth surface has zero test coverage. Three TODO comments also violate the rules.

---

## Conventions Violations

### Critical (must fix before merge)

1. **`cv-optimization.ts` lines 26–27 — TODO comments left in production code**
   ```ts
   // TODO: run full optimimzation process instead one by one
   // TODO: retry failed job - run single optimization for prompt type that failed
   ```
   Rules state: "Never leave `TODO` comments when performing a task. Every task must be completed fully and correctly from start to finish." These are explicitly out-of-scope follow-up items, so they must be removed rather than noted as TODOs, or filed as separate tasks.

2. **`cv-optimization.ts` line 42 — debug `tap` + `console.log` left in production code**
   ```ts
   tap((promptType) => console.log('promptType:', promptType)),
   ```
   This is debugging scaffolding. It also keeps `tap` in the import list solely for debug output. Must be removed.

3. **`cv-optimization.ts` line 64 — debug `console.log` left in production code**
   ```ts
   console.log('SSE - job complete event:', event);
   ```
   Same issue — debug log left in ship code.

4. **`supabase.guard.spec.ts` — no test for the new `token` query param path**
   The guard was specifically modified to accept a JWT via `request.query['token']`, which is the sole purpose of this backend change and a new auth surface. The spec file has zero coverage for this path (valid token via query param succeeds, invalid/empty query token throws `UnauthorizedException`). The `makeContext` helper only supports an `authHeader` argument; no overload or new helper exists for query param context. This is a meaningful gap.

### Non-Critical (should fix)

1. **`cv-optimization.ts` line 10 — unused `tap` import** (consequence of the debug code above; resolves automatically once the `tap` call is removed).

2. **`cv-optimization.ts` line 34 — `isProcessing` signal not in the spec**
   The spec and plan do not mention an `isProcessing` signal. While the extra UX is a reasonable addition, it goes slightly beyond "minimal footprint" — the plan says only to set `isProcessing` inside `switchMap` and clear it in `next`. The implementation follows the plan but the signal itself was not in the original spec. This is minor because it adds value without breaking anything.

3. **`cv-optimization.html` lines 17–31 (and all panels) — `@else` branch unconditionally renders a red status span when no result yet exists**
   When `results().get(PromptType.X)` is `undefined` (before any run), `status?.toUpperCase()` evaluates to `undefined`, and the red `<span>` is rendered with empty text. This produces invisible but present empty red spans in the DOM on initial load before any run has started. A small guard (`@else if (results().get(PromptType.X))`) would prevent this.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Trigger `runSingleOptimizationProcess` per `PromptType` | Covered | `from(Object.values(PromptType))` + `mergeMap` with concurrency 3 |
| Implement `streamOptimizationEvents()` using native `EventSource` Observable | Covered | Correct implementation in the service |
| `isPlatformBrowser` guard for SSR | Covered | Returns `EMPTY` on server |
| `SupabaseGuard` fallback to `request.query['token']` | Covered | Implemented correctly in the guard |
| `SseJobCompleteEvent` local type | Covered | Exported from service |
| `results` signal map keyed by `PromptType` | Covered | |
| Close `EventSource` after `job-complete` (not `run-complete`) | Covered | Plan deviation correctly applied: `observer.complete()` + `es.close()` inside `job-complete` handler |
| `takeUntilDestroyed` to clean up on component destroy | Covered | |
| Reset `results` on re-submission | Covered | `this.results.set(new Map())` at top of `runOptimization` |
| Template renders result per panel using `@if` / `@else` | Covered | All 7 `PromptType` panels handled |
| Handle SSE `error` events (log, close) | Covered | `es.onerror` → `observer.error` + `es.close()` |
| `JsonPipe` imported in component | Covered | |

---

## Plan Deviations

1. **`isProcessing` signal added** — The plan (Step 3a) does not mention an `isProcessing` signal. The component adds `readonly isProcessing = signal<Map<PromptType, boolean>>(new Map())` and uses it in the template to show a spinner and status badge. This is beyond the plan scope but does not violate the spec (which is silent on this). It is benign but technically a deviation.

2. **`tap` debug operator added** — The plan does not include a `tap((promptType) => console.log(...))` call. This is a debugging artifact, not a plan deviation per se, but it should not be present.

3. **Template goes beyond "render result text in each accordion panel"** — The plan specifies a simple `@if / @else` with `r.result | json` and a "Coming soon" fallback. The implementation adds status badges (green/red/spinner) in accordion headers. This is an enhancement beyond the plan, but it adds clear value.

4. **`isProcessing` not reset between runs for the previous subscription** — `runOptimization` resets `isProcessing` to an empty Map synchronously, but the previous `mergeMap` subscription (from a prior call) is still alive until `takeUntilDestroyed` fires. A quick re-submit will reset `isProcessing` while in-flight SSE events from the old subscription could then re-set individual keys to `false` before the new run begins, causing transient incorrect state. The plan does not address subscription cancellation on re-submit (only component destroy), so this is a plan gap rather than a deviation. It is noted as a code smell below.

---

## Null Safety Issues

1. **`cv-optimization-api.service.ts` line 92** — `this.supabase.currentSession()?.access_token ?? ''` is correct. An empty token will cause the SSE endpoint to return 401, which triggers `onerror` and surfaces as an observable error. This is acceptable per the spec.

2. **`cv-optimization.html` — red status span on initial load (no result yet)** — As noted above, `results().get(PromptType.X)?.status?.toUpperCase()` evaluates to `undefined` when no result exists, producing empty text inside a red span. Not a crash, but semantically misleading and a render artefact.

---

## Code Smells

1. **`cv-optimization.ts` — no `Subscription` stored for re-submit cancellation**
   When `runOptimization` is called a second time before the first completes, `this.results.set(new Map())` resets the display, but the first `mergeMap` pipeline keeps running (issuing HTTP calls and opening SSE connections) until its inner observables complete. `takeUntilDestroyed` only fires on component destroy, not on re-submit. In-flight requests from the old run will still write to `this.results`. The plan notes this edge case ("Multiple form submissions: Re-submitting resets the `results` signal map") but does not specify cancelling the in-flight subscription. A `Subject` + `takeUntil` pattern would properly cancel the old run.

2. **`cv-optimization.ts` lines 26–27 — typo in TODO comment**: "optimimzation" (three m's). Minor but present.

3. **Template repetition** — The accordion header status badge block is repeated verbatim for all 7 panels with only the `PromptType` key changing. This is expected for a template without a sub-component, but could be extracted to a small `optimization-status` component in a follow-up. Not a blocker for this task.

---

## Recommendation

**Fix critical issues before merge.**

The feature logic is sound and well-tested, but three `console.log` / debug `tap` calls and two `TODO` comments must be removed before merging to align with project rules. The guard spec must also be extended with at least one test covering the new `token` query param authentication path.
