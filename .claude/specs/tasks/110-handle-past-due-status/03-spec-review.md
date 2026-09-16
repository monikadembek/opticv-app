# Specification Review: 110-handle-past-due-status

## Summary

- Overall assessment: **PASS WITH ISSUES**
- The spec is well-grounded in the actual codebase (correct file paths, correct existing patterns reused for the banner and portal redirect) and its core mechanism — an `getEffectiveTier` helper applied at the two real gating points — directly implements the task's suggested pattern. It passes with issues because two scope items (`allowedTemplates` gating, `maxStoredCvs` gating) and the per-session dismiss behavior are not present in or derivable from the raw task and were introduced via clarifying Q&A that is not visible in `00-raw-task.md`, and one Data/API claim about `getUsageStatus`'s `tier` argument is inconsistent with the referenced source line.

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **`Data / API` description of `getUsageStatus` is imprecise.** Line 86 says `UsersService.getUsageStatus` computes effective tier "before calling `TIER_LIMITS[...]` / `QuotaService.getQuotaStatus`" — correct — but Behavior item 3 (line 55) says it's used for "the `tier` argument passed to `QuotaService.getQuotaStatus`", which is accurate, yet the existing code (`users.service.ts:204,207-212`) computes `tier` once and reuses it for both `getQuotaStatus` and `TIER_LIMITS[tier].maxStoredCvs` — the spec should make explicit that a single `effectiveTier` variable replaces the single `tier` variable at that call site, to avoid an implementer computing it twice or inconsistently. Minor clarity gap, not a correctness blocker.
2. **`triggerSingleJob` not explicitly named in Behavior section.** Scope (line 23) lists both `triggerOptimization` and `triggerSingleJob` as consumers of `resolveTierAndPeriod`, but Behavior item 2 (lines 47–50) only narrates the `triggerOptimization` example. Since both call the same private `resolveTierAndPeriod` method, the fix is a single shared change, but the spec's narrative could mislead an implementer into checking only one call site during testing.
3. **Acceptance criteria for `quota.service.spec.ts`** is hedged with "if applicable" (line 30) without stating the applicability condition. Since the spec explicitly states `QuotaService` remains status-agnostic and unchanged (line 25), `quota.service.spec.ts` should almost certainly need no changes — the spec should state this affirmatively rather than leaving it conditional, to avoid an implementer wondering whether to touch it.

### Unclear or Ambiguous Sections

1. **Banner dismissal mechanism vs. "session" wording.** Behavior item 5 (line 68) and the Edge Cases section both describe dismissal as "in-memory signal — no persistence to localStorage/sessionStorage" that "resets on full page reload/new session." This is technically not a "session" dismiss in the conventional sense (which usually implies `sessionStorage` surviving reloads within the same tab) — it's a page-load-scoped dismiss. The spec does correctly describe the actual mechanism in detail, but the label "dismissible per session" (inherited from the clarifying question) is misleading terminology; an implementer following only the heading/label rather than the detailed bullet could reach for `sessionStorage`. Recommend the spec drop "session" terminology in favor of "current page view" to prevent ambiguity.
2. **Banner placement relative to SSR.** `app.html`/`app.ts` is SSR-enabled per project conventions. The spec doesn't state whether `PastDueBanner` needs any SSR-safety considerations (e.g., the dismiss signal defaulting correctly on server render, `window.location.href` usage guarded for platform). Given `Settings.onManageBilling` already uses `window.location.href` directly in a non-SSR-guarded way, this is likely a non-issue (existing precedent), but the spec doesn't call this out explicitly as "follows existing precedent, no new SSR handling needed."

### Invented or Unsupported Requirements

The raw task (`00-raw-task.md`) only describes two concrete asks: (1) gate tier-based feature access using `tier !== 'FREE' && status === 'ACTIVE'` (optionally allowing `TRIALING`) "wherever tier is currently checked for feature access," and (2) surface a banner pointing to the billing portal. The following spec items extend beyond what's explicitly stated in the raw task, though they were introduced through the clarification phase (per `task-to-spec.md` Step 1) and are consistent with the raw task's own instruction to apply the pattern "wherever tier is currently checked":

1. **`allowedTemplates` gating in `cv-optimization.ts`** (Scope line 27, Behavior item 4) — not mentioned in the raw task, but the raw task explicitly says the pattern should be applied "wherever tier is currently checked for feature access," and `allowedTemplateIds` is indeed such a site. Reasonable extrapolation, added via clarifying question, not fabricated silently.
2. **`maxStoredCvs` gating in `getUsageStatus`** (Scope line 24, Behavior item 3) — same reasoning as above; `maxStoredCvs` is a tier-gated limit not explicitly named in the raw task but structurally identical to the quota checks the raw task does name.
3. **Dismissible-per-session banner behavior** (Behavior item 5, line 68) — the raw task only says "surface a … banner"; it says nothing about dismissibility. This was a UX preference decided during clarification with no grounding in the raw task text.
4. **`CANCELED` status handling** (Edge Cases line 74) — the raw task only discusses `PAST_DUE`; `CANCELED` is not mentioned anywhere in `00-raw-task.md`. The spec's decision to fold `CANCELED` into the same "effective tier = FREE" treatment is a reasonable generalization of "status === 'ACTIVE' (or explicitly allow TRIALING too)" but is technically an inference beyond the literal task text.

None of these are unreasonable, and the workflow's clarification step is the sanctioned mechanism for resolving such gaps — but per the review criteria's strict definition ("does every requirement originate from the task"), items 1–4 above are not literally present in `00-raw-task.md` and should be flagged as extensions made during clarification rather than treated as directly sourced. The task ID's raw file does not contain a record of the clarifying Q&A, so a reviewer reading only `00-raw-task.md` + `02-spec.md` cannot verify these were user-approved without external session context.

## Assumptions Detected

Explicitly stated in the spec:
- `subscription === null` defaults to effective tier `FREE` (Edge Cases, line 73) — stated and consistent with existing `?? 'FREE'` fallback code.
- `QuotaService` stays unchanged/status-agnostic (Scope, line 25) — explicitly stated.
- `UserProfile` DTO shape and `getProfile` remain unchanged; raw tier/status still shown for display (Scope line 26, Behavior item 3 last bullet) — explicitly stated, with rationale given.
- No Stripe Dashboard changes are in scope (Out of scope, line 34) — explicitly stated with justification (no such settings found in codebase).
- No webhook/sync logic changes (Out of scope, line 35) — explicitly stated.

Not explicitly flagged as assumptions but present in the spec (implicit):
- That "wherever tier is currently checked for feature access" (raw task wording) maps to exactly three call sites: `OptimizationService.resolveTierAndPeriod`, `UsersService.getUsageStatus`, and `cv-optimization.ts`'s `allowedTemplateIds` — the spec asserts these are the complete set (via Context/Scope) but doesn't explicitly state "we verified no other tier-check call site exists" as an assumption; it's presented as settled fact. If any other tier-gating site exists elsewhere in the codebase, it would be missed by both the spec and this review, since the review does not itself re-audit the codebase.
- That the banner should only ever appear for `PAST_DUE` and not other non-active statuses (`CANCELED`) — stated as a decision (Edge Cases line 74) but the underlying assumption ("banner scope should track the task's literal wording rather than the broader effective-tier logic") is not separately called out as an assumption, just asserted.

## Recommendation

- **Proceed as-is.** The non-critical issues and ambiguous-wording notes are clarity improvements, not correctness blockers, and the "invented requirements" are traceable to the mandatory clarification phase rather than silent scope creep. Optionally tighten the three non-critical issues and reword "dismissible per session" before implementation to reduce risk of an implementer choosing `sessionStorage` unintentionally.
