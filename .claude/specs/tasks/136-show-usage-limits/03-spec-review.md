# Spec Review – Task 136: Show limits usage on the pages where limits matter

### Summary

- Overall assessment: PASS WITH ISSUES
- The spec covers all three explicit task requirements: dashboard usage for optimizations and stored CVs with an upgrade link near or at the limit, stored-CV usage on the upload page, and an upgrade prompt instead of a plain error when a quota is hit. It reuses the existing `usageStatus` data as the task asks. The decisions made during clarification (≥ 80% threshold, a global dialog, a separate dashboard panel, replacing the dropzone at the limit) are reflected consistently. The remaining issues are a few unlisted assumptions, some UI copy and terminology that is not grounded in the task, and one user-facing effect of a pre-existing backend inconsistency that is marked out of scope but not explained. None of these blocks implementation.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Effective vs. raw tier mismatch becomes user-facing.** Out of scope excludes fixing the difference between `CvService.uploadCv` (raw tier) and `/users/me/usage` (effective tier). However, the new upload-page gating (Behavior › Upload CV page #3) is driven by `usageStatus`, which uses the effective tier. Take a PAST_DUE or CANCELED BASIC user with 2–5 stored CVs. The UI would show "N of 1 CVs stored" and replace the dropzone, while the backend would still accept the upload. The spec should state this consequence explicitly, in Edge Cases or Assumptions, so it is a conscious decision and not a surprise.
2. **Unlisted assumptions.** Several decisions in the body are missing from "Assumptions":
   - Settings is not refactored onto the new usage-meter component (Out of scope only).
   - The location of the new component is `shared/components/usage-meter/`. That folder does not exist yet; `shared/` currently holds only `constants.ts`, `utils.ts` and `welcome-guide-modal/`.
   - An unknown tier is treated as upgradable (Edge Cases).
   - Only the first quota error is shown while the dialog is open (Behavior › Dialog #5).
   - The dialog takes the tier from `userProfile` and the effective tier, not from the error payload. The payload carries no tier.
3. **Existing interceptor tests will break.** `quota-error-interceptor.spec.ts` asserts `messageService.add` calls (lines 51, 71, …). The Acceptance section says the tests are "added/updated" but does not say that the existing toast assertions must be replaced. This is minor but worth making explicit.
4. **"Usage this month" heading on the dashboard** covers stored CVs, which the spec itself says are a total cap and not monthly (Assumptions, Behavior › Shared rules #4). The terminology is inconsistent in the same panel.
5. **Template deviation.** The spec adds an "Assumptions" section that is not in `template.md`. The workflow requires assumptions to be listed, so this is acceptable. It is noted only for consistency.

#### Unclear or Ambiguous Sections

- **Behavior › Upload CV page #2:** The usage row is placed "above the dropzone / result area". The spec does not say whether it is also shown in the error state (`error()` branch) and in the success state, or only alongside the dropzone.
- **Behavior › Shared rules #5:** "the text clearly states it (e.g. 'Limit reached')". The exact copy and where it appears relative to "X of Y … used" are left open by the "e.g.".
- **Behavior › Dialog #1:** "a root-provided state holder, e.g. a small service/signal store". Whether this is a plain service with signals or an NgRx Signal Store is left to the implementer. Conventions prefer the NgRx signal store for shared state.
- **Behavior › Dialog #4:** "Both are tracked in PostHog (View plans at least)" is hedged. The spec does not say which events are mandatory or name the events and properties.
- **Behavior › Upload CV page #5:** The spec describes "Upload another CV" at the limit. It does not say whether the "Ready to go" left panel still offers that button when the user is already at the limit.
- **Dialog table, PRO + `FEATURE_NOT_AVAILABLE` / no `resetsAt`:** These cells are marked "n/a" but still list a **Close** action. The intended fallback copy is not stated.

#### Invented or Unsupported Requirements

- **PostHog tracking for Upgrade / View plans.** This is not in the task. It is listed as an assumption based on Task 135 precedent, but it is still an addition.
- **All dialog and limit-prompt copy.** The texts in the dialog table and the upload limit prompt are authored. They are derived from the existing interceptor toasts and are reasonable, but the task does not specify them.
- **Suppressing the "Upload failed" toast for `CV_LIMIT_EXCEEDED`.** This is not in the task. It is a reasonable consequence of "upgrade prompt rather than only an error".
- **Usage refresh triggers** (page init, after upload, after CV delete). These are not in the task but are implied by showing current usage.
- **Dialog de-duplication** (ignore later payloads while open). This is not in the task. It is a defensive behavior.
- **Accessibility details** (focus management, Escape, text over colour). These are not in the task but are supported by the project rules (AXE / WCAG AA). Acceptable.
- **PRO users get no upgrade CTA.** This is not in the task, but it is logically implied because no higher tier exists. It was surfaced during clarification and listed as an assumption.

### Assumptions Detected

| # | Assumption | Explicitly stated? |
|---|---|---|
| 1 | Stored CVs are a running total against the tier cap, not a monthly count | Yes (Assumptions) |
| 2 | Upgrade destination is `/pricing` | Yes |
| 3 | PRO users never see upgrade CTAs | Yes |
| 4 | Near-limit threshold is ≥ 80% (`limit > 0`) | Yes (confirmed in clarification) |
| 5 | PostHog tracking follows the Task 135 convention | Yes |
| 6 | Unknown tier (profile not loaded) is treated as upgradable | No – Edge Cases only |
| 7 | Settings usage section is not refactored onto the new component | No – Out of scope only |
| 8 | New component lives in `shared/components/usage-meter/` (new folder) | No – Scope, "e.g." |
| 9 | Only CV_OPTIMIZATION and stored CVs are shown (other features excluded) | Partially – Out of scope, justified by task wording |
| 10 | Usage UI is hidden silently on load or error (no error state) | No – Behavior › Shared rules #6 |
| 11 | Dialog tier comes from `userProfile` (effective tier), and the payload has no tier | No – implicit |
| 12 | The first quota error wins while the dialog is open | No – Behavior only |
| 13 | The existing inline messages on the CV optimization page remain alongside the dialog | Yes – Edge Cases |
| 14 | The effective/raw tier mismatch in the backend is acceptable for the new upload gating | No – only "fixing it" is out of scope; the UX impact is not stated |

### Recommendation

- Proceed as-is, optionally after a minor revision. Make assumptions 6–8, 10–12 and 14 explicit, decide the placement of the upload usage row across states, and fix the "Usage this month" heading terminology. These can also be settled during implementation planning without blocking it.
