# Specification Review: 96-cv-optimization-collapse-sections-by-default

### Summary

- Overall assessment: **PASS**
- The specification faithfully translates the raw task's exact prescription (guard flag + effect + `Set` computation formula) without deviation, correctly identifies `runOptimization()` as the reset point, and correctly concludes `handleSectionClick` needs no changes. The stored-mode extension goes beyond the raw task's literal text but was explicitly resolved with the user via clarifying questions during spec generation, and is documented as such rather than silently assumed. No critical issues found; a few non-critical clarity gaps are noted below.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Effect dependency on `allSectionIds()` not addressed.** Reading `allSectionIds()` inside the effect (Behavior step 2) makes the effect reactively depend on it too, not just on `pageState()` and `initializedDefaults()`. If `allSectionIds()` changes value on the same tick `pageState()` first becomes non-initial (plausible, since both can depend on `jobApplicationId`/`submittedJobApplication`/`jobApplication` updating together), the spec should clarify this is fine/expected rather than a race. Low risk given Edge Cases already accepts "section only appears later" as unhandled-by-design, but the spec never states whether `allSectionIds()` is intentionally meant to be a reactive dependency of the effect or just a value read once inside it — worth one clarifying sentence for the implementer.
2. **No mention of `computed()`/`effect()` execution order relative to `toggleAllSections`/`onSectionCollapsedChange` calls that might occur synchronously during the same change-detection cycle as the `pageState()` transition.** Extremely unlikely in practice (per Edge Cases item 3, sections aren't interactive pre-`processing`), but the spec could state this more definitively as "no possible race" rather than "not possible in practice," since "in practice" reads as slightly hedged for an acceptance-critical guarantee.
3. **Acceptance criteria bullet "Running a second optimization... re-applies the default" is not explicitly present in the raw task.** It's a reasonable and clearly-labeled consequence of the clarifying-question answer (flag reset scope), and the spec's Behavior section already flags this as coming from that decision — but since Acceptance (DEV) doesn't cross-reference that origin, a reviewer reading only the Acceptance section in isolation might mistake it for a raw-task requirement rather than a clarified one. Recommend a footnote or parenthetical noting it originates from the clarification, not the raw task text, for future auditability.

#### Unclear or Ambiguous Sections

None. The Behavior section is stated as explicit, ordered, implementable steps, and the Edge Cases section pre-empts the most likely reviewer questions (late-appearing sections, `pageState()` reverting, partial stored results, re-entrancy).

#### Invented or Unsupported Requirements

None strictly invented. One item — extending default-collapse behavior to stored-mode optimizations (`loadStoredOptimization()` / `isStoredMode`) — is not present in the raw task's literal text, which only describes the live-run path ("once results start arriving (pageState() becomes processing/completed)" in the context of `runOptimization`). This was surfaced as a clarifying question during spec generation and explicitly answered "Apply to stored mode too" by the user, so it is a legitimately resolved requirement, not a silent invention. Flagging it here per the review workflow's instruction to enumerate assumptions/clarifications distinctly from raw-task text, since a future reader of only `00-raw-task.md` + `02-spec.md` (without the conversation transcript) would not otherwise know this scope decision was made outside the raw task.

### Assumptions Detected

- **Stored-mode inclusion** (see above) — explicitly resolved via clarifying question, stated in spec's Goal/Scope/Behavior sections, but not cross-referenced to "this came from a clarification, not the raw task." Explicitly documented in spec content, though its provenance (clarification vs. raw task) is only visible to someone who saw the Q&A.
- **`initializedDefaults` flag reset scope tied to `runOptimization()` only** — explicitly resolved via clarifying question ("Reset on runOptimization()"), and the spec states this clearly in Scope and Behavior step 5. Same provenance note as above.
- **`allSectionIds()` is read, not subscribed-to-independently, inside the guarded effect** — implicit assumption in the Behavior section's mechanics; not explicitly called out as an assumption in the spec, though the Edge Cases section addresses its practical consequence (late-appearing sections aren't retroactively collapsed).
- **No collapse-state persistence across reloads** — explicitly listed under Out of scope, correctly labeled as "not requested."
- **`SectionCard`, `OptimSidebar`, `MobileTabs` require no interface changes** — explicitly stated in Data/API and Out of scope; consistent with the raw task's claim that "the infrastructure to solve this already exists and is simply unused."

### Recommendation

- **Proceed as-is.**
