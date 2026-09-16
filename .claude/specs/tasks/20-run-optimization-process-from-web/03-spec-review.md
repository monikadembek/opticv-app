# Specification Review

## Source
Task: 20 — Trigger optimization process from web, wait for runId and listen to SSE (FE)
Reviewed: `.claude/specs/tasks/20-run-optimization-process-from-web/02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification correctly covers the core intent of the raw task (trigger optimization, receive runId, listen to SSE). The backend change for query-param auth is a valid and necessary addition. However, there are two ambiguities that could block implementation: (1) the spec is internally inconsistent about whether the guard change is applied to all endpoints or scoped to SSE only, and (2) the `result` field in `SseJobCompleteEvent` is typed as `unknown` with no indication of how the accordion panel should render it, which contradicts the in-scope requirement to "display each result's text." These should be resolved before implementation begins.

---

### Findings

#### Critical Issues

1. **Guard scope is contradictory (Data/API section vs. Scope section)**
   In the `Data / API` section the spec says:
   > "Modify `canActivate` to fall back to `request.query['token']` when the `Authorization` header is absent"
   
   But immediately below it adds:
   > "Apply this only when the token source is a query param (consider a decorator or a separate guard variant scoped to the SSE endpoint)"
   
   These two sentences are contradictory — one describes modifying the existing guard globally, the other suggests scoping it. The implementer cannot know which approach to take without guessing. The spec must pick one and describe it unambiguously.

2. **`result` field type is `unknown` but the template must render text**
   The in-scope requirement states "Display each result's text inside the corresponding accordion panel." The `SseJobCompleteEvent.result` is typed as `unknown`. The spec shows the template using `r.result | json` (plan file shows this, spec references it as "result text"). If `result` is a complex object, `| json` is a debug output, not a user-facing display. The spec does not specify the shape of `result` for any PromptType, making the template rendering requirement unimplementable without guessing.
   
   This is a gap — the shape of `result` is defined by the backend (`optimization.types.ts` / the OpenAI output), so the spec should reference or describe it, or explicitly acknowledge `| json` is a temporary display.

#### Non-Critical Issues

3. **Concurrency model left ambiguous in Scope section**
   The Scope section says "(one call per `PromptType`, sequentially or in parallel — see Behavior)". The Behavior section says "For each of the 7 PromptType values (in order or in parallel)" — still not resolved. The plan file picks `mergeMap` with concurrency 3, but this is not in the spec itself. The spec should commit to one approach (sequential, fully parallel, or bounded concurrency).

4. **No loading/pending UI state specified**
   The in-scope list includes "Handle SSE `error` events gracefully (log, set error state in signal)" but there is no signal defined for "loading" or "pending" state per PromptType. The accordion panels show "Coming soon" before results arrive — the user could perceive the panels as broken if there is no indication that processing is in progress. This is a UX gap implied by the task but not addressed.

5. **`streamOptimizationEvents` return type inconsistency**
   In `Data / API` the method signature declares `Observable<MessageEvent>`, but the `SseJobCompleteEvent` interface is defined as the parsed domain type. The service implementation would need to parse `MessageEvent.data` before returning. The spec should either show the return type as `Observable<SseJobCompleteEvent>` (after parsing inside the method) or `Observable<MessageEvent>` (raw, parsed by consumer). The current spec mixes both.

6. **`run-complete` behavior note may be incorrect**
   The spec states:
   > "Because the backend `run-complete` fires after `TOTAL_JOBS` completions (`Object.values(PromptType).length === 7`), and each single-job run has only 1 job, the `run-complete` fires immediately after the single `job-complete`."
   
   This relies on `TOTAL_JOBS` in the backend controller being correctly set to 7. If the backend counts completions per `runId` globally (not per single-job run), a single-job stream would never receive `run-complete`. This is a factual assumption about backend behavior that should be verified. Misreading this would cause the `EventSource` to never close.

#### Unclear or Ambiguous Sections

- **`Data / API` → Backend change:** Two conflicting approaches described in the same paragraph (see Critical Issue #1).
- **`Behavior` → Step 3:** "in order or in parallel" — not resolved.
- **`Data / API` → Frontend method signature:** `Observable<MessageEvent>` vs. the intent to return parsed `SseJobCompleteEvent` events (see Non-Critical Issue #5).

#### Invented or Unsupported Requirements

- **`result` field type note** — The spec defines a local `SseJobCompleteEvent` interface with `result?: unknown`. This mirrors the backend `OptimizationJobEvent` but is marked as "frontend-only." This is a valid design choice, not an invented requirement, but it is unsupported by the raw task which does not specify typing strategy.
- **Concurrency limit of 3** — Mentioned in the plan file but not in the spec. If it appears in the spec, it would be an invented constraint. Currently it is absent from `02-spec.md`, which is correct.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | `EventSource` cannot set custom headers — JWT must be passed via query param | Yes (Context section) |
| 2 | `run-complete` fires after exactly 1 job for a single-job run (TOTAL_JOBS logic applies per-runId) | Partially — stated as a note but not verified |
| 3 | `result` in `SseJobCompleteEvent` contains text that can be meaningfully rendered | No — shape is `unknown` |
| 4 | `Supabase` service exposes `currentSession()` signal with `access_token` | No — referenced in the plan, not in the spec |
| 5 | `PromptType` enum is importable in the Angular template via a component property | Yes (implied by template binding description) |
| 6 | No new npm dependencies are required (native `EventSource`, no polyfill) | No — not stated; SSR environments may need a polyfill or must be guarded |
| 7 | The 7 PromptTypes in the frontend `PromptType` enum match the 7 backend `PromptType` values exactly | No — not stated explicitly |
| 8 | Each single-job run produces exactly 1 SSE `job-complete` event before `run-complete` | Partially — explained via backend logic but not confirmed |

---

### Recommendation

**Revise specification** — address Critical Issues #1 and #2 before implementation:

1. Decide and document the guard scoping strategy (global fallback vs. SSE-only variant).
2. Specify the shape of `result` for at least one PromptType, or explicitly mark `| json` as a temporary debug display with a note that a follow-up task will render it properly.
3. Optionally resolve the concurrency approach and method return type to avoid implementer guesswork.
