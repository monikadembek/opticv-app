# Keyword Gap Section — ATS Research Notes

Research notes on how ATS systems treat different keyword match types in the Keyword Gap section, and what that implies for whether the app should let users insert/replace wording in the optimized CV.

Relevant component: `apps/opticv-web/src/app/features/cv-optimization/components/keyword-gap/keyword-gap.ts` / `.html`
Relevant types: `KeywordGapResult`, `KeywordGapMatchedKeyword` (`matchType: 'exact' | ...`), `KeywordGapAcronymIssue`, `KeywordGapFabricationWarning` in `packages/shared/datatypes/src/lib/datatypes.ts`

---

## Semantic matches

Semantic matches are keywords matched by meaning but with different wording than the job posting (e.g. "led cross-functional teams" vs. required "team leadership"). Rendered in `keyword-gap.html` under "Semantic match", driven by `semanticMatchedKeywords()` (`matchType !== 'exact'`) in `keyword-gap.ts`.

### How ATS treats them

Three rough tiers of ATS keyword matching:

1. **Naive/legacy ATS** (still common in mid-market HR tools) — literal string/substring matching, maybe basic stemming ("manage" ↔ "managing"). Semantic paraphrases are **not detected at all**.
2. **Modern ATS with NLP-lite parsing** (Workday, Taleo, iCIMS, Greenhouse's older parsers) — lemmatization/stemming plus a curated synonym dictionary for well-known cases ("JS" = "JavaScript"), but general free-form semantic equivalence is unreliable and inconsistent across vendors/configs.
3. **AI-assisted ATS / resume-screening layers** (increasingly common 2025-2026, e.g. LinkedIn Recruiter, some Greenhouse/Lever AI add-ons) — can genuinely understand semantic equivalence via embeddings.

You don't know which tier a given employer's ATS falls into, and behavior is often configured per-employer even within one vendor.

### Why exact wording is usually the safer recommendation

- **Downside asymmetry**: keeping semantic phrasing risks silent filtering on tier 1/2 ATS (a hard, invisible failure). Switching to the exact keyword costs nothing on tier 3 ATS or with human reviewers — exact phrasing still reads naturally.
- **Human reviewers keyword-search literally too** (e.g. searching "Kubernetes" as a DB filter), not semantically.
- **Caveat**: don't force the exact term if it would misrepresent what the candidate did (e.g. JD wants "P&L ownership" but candidate only had budget input) — that becomes a fabrication risk, not just a wording tweak. This is presumably why `matchType` and `candidateLikelyHas` already exist as separate signals in the data model — the app already distinguishes "safe to insert" from "would overstate."

### Product recommendation

Treat semantic matches as a **suggested edit**, not just informational. The keyword-edit infrastructure already in `keyword-gap.ts` (`keywordEdits`, `keywordEditStarted`, `keywordEditSaved`, `keywordEditTextChanged`) is a natural fit — let users one-click replace the semantic phrase with the literal job-posting keyword, pre-filled with the exact term instead of blank. Given the fabrication risk, this should be **opt-in / user-confirmed**, not a silent auto-replace.

---

## Acronym issues

Acronym issues flag terms written inconsistently between resume and job description (e.g. resume has "AWS" but JD wants "Amazon Web Services", or vice versa). Rendered in `keyword-gap.html` under "Acronym issues" (`result().acronymIssues`), backed by `KeywordGapAcronymIssue { term, issue, fix }` in `datatypes.ts:328-332`.

Per the generation prompt in `apps/opticv-be/prisma/seed.ts` (~line 352-364), `fix` is generated as an **actionable instruction** (e.g. "use both forms: 'AWS (Amazon Web Services)'"), not just descriptive text like `issue` — the LLM already decides the safe target text.

### Should this section allow adding/replacing keywords too?

Yes — the case here is stronger than for semantic matches:

1. **ATS impact is more severe and more mechanical.** Acronym mismatch is the textbook ATS failure case in optimization guides. It's a narrower gap than semantic paraphrase failure — not "the ATS didn't understand my synonym" but "the ATS is comparing two literal strings that a human knows are equivalent" — and it's trivial to close.
2. **No fabrication risk.** "AWS" and "Amazon Web Services" are the identical fact under two spellings. Applying `fix` is a pure notation change, not a claims change — unlike semantic-match swaps, there's no real downside to being more automatic/default here.
3. **`fix` is already structured for direct use** as an apply action, not just explanation text.
4. **Not always a pure swap.** The seed prompt explicitly allows "use both forms" (spell out + acronym on first mention) as a fix, i.e. sometimes an insertion alongside the existing term rather than a straight find-replace. UI should show the suggested `fix` text before applying so the user can confirm placement — similar in spirit to how missing keywords use `keywordBulletPositionSelected` to choose where a bullet goes, though acronym fixes are simpler (usually inline text, not a new bullet).

### Product recommendation

Wire Acronym Issues into the same keyword-edit action pattern used elsewhere in the component. Can default toward auto-apply-friendly (vs. semantic matches' opt-in caution) since there's no fabrication tradeoff, but still surface the exact `fix` text before applying so the user can confirm placement/wording.

---

## UI copy

Explanatory line added for each collapsible group in `keyword-gap.html`, matching the existing style (e.g. Fabrication warnings, `keyword-gap.html:591-594`):

```html
<p class="text-sm text-surface-800">
  <span class="font-semibold">Acronym issues</span> - terms written
  differently than the job description (e.g. spelled out vs. abbreviated)
  that may not be picked up by ATS keyword matching
</p>
```

---

## Open questions / not yet decided

- Whether semantic-match replacement and acronym-fix application should share one exact UI pattern or diverge (semantic = opt-in replace, acronym = more automatic apply).
- Whether acronym "both forms" fixes need their own UI affordance (insert alongside) vs. reusing the existing edit-text flow.
- No code changes made yet — this file is research/analysis only.
