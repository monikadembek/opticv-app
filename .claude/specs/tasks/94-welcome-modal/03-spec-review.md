# Specification Review — Task 94: Welcome Modal + Help Icon

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification correctly scopes down the design doc's three-part plan to the two items the raw task actually asks for (welcome modal + help icon), explicitly and correctly excluding the guided tour. Technical claims about existing code (`app.ts` login effect, `top-header.ts` structure) were spot-checked and are accurate. The main issue is a significant, unflagged semantic deviation from the design doc: "first login" is redefined from a single global boolean flag to a per-email map, which is a judgment call presented as settled fact rather than a flagged decision point.

---

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **Per-email storage model is a deviation from the design doc, not clearly flagged as such.** `docs/in-app-user-guide.md` §1 specifies `hasSeenWelcome: boolean` — a single global flag. The spec (Behavior → Storage shape, `UserGuideStore`) instead uses `seenByEmail: Record<string, boolean>`. The spec's Assumptions section says this is "per the user's clarification," but that clarification is not visible anywhere in `00-raw-task.md` or the design doc provided as inputs to this review. This may well be correct (it's a more sensible interpretation of "first login"), but as written it reads as an assumption grounded in an off-record conversation rather than in the reviewable inputs. Recommend either citing where the clarification occurred or explicitly marking it as a spec-author decision with rationale, so a reader of just the two source documents doesn't perceive it as invented.

2. **`localStorage` key name changed from the design doc without comment.** Design doc says key `opticv_has_seen_welcome` would hold a boolean-flag-oriented value; spec keeps the same key name but repurposes its value shape (object instead of implied boolean-ish flag). Not a functional problem, but worth a one-line note in the spec that the key is reused with a new value shape, for anyone diffing against the design doc later.

3. **`help_icon_clicked` and `welcome_modal_shown`/`welcome_modal_dismissed` event names are not in the raw task**, but they are a reasonable extrapolation of the existing PostHog convention cited in Context (`signin_button_clicked` precedent). Low risk, but technically an addition beyond the literal task text — listed here for completeness rather than as a blocker (see "Invented or Unsupported Requirements" below for why this isn't flagged there).

### Unclear or Ambiguous Sections

1. **"Trigger flow" — email hydration timing.** The Edge Cases section says "No email available... skip auto-open for that transition; do not crash," but doesn't specify whether there's any retry/re-check if the email becomes available shortly after (e.g., async Supabase session hydration racing the login-transition effect). Given the existing `wasLoggedIn` effect pattern is reused as-is (per Context), this is presumably an accepted known limitation inherited from the existing pattern rather than a new gap — but the spec doesn't say so explicitly.

2. **Dialog dismiss event wiring.** Spec says both the "Got it" button and `(onHide)` must call `markWelcomeSeen`, and that `welcome_modal_dismissed` "fires from this single path." It's not fully unambiguous whether "Got it" button click should *also* trigger `(onHide)` naturally (since clicking "Got it" would presumably close the dialog, which fires `(onHide)` anyway) — if so, the button's own click handler doesn't need to separately call `markWelcomeSeen`/capture the event, only close the dialog, and `(onHide)` becomes the single source of truth. As written, "Welcome modal component" (line ~75) still describes the button's `(click)` as calling `markWelcomeSeen` directly, which risks a double-call unless implementers realize `(onHide)` alone should own it. Worth tightening to avoid an implementation split.

### Invented or Unsupported Requirements

None. All in-scope requirements trace to either the raw task text directly (modal shown once on first login, persistent help icon reopening it) or to the referenced design doc (`docs/in-app-user-guide.md`), which the raw task explicitly incorporates by reference ("The initial plan was already discussed and prepared... it is stored in file @docs/in-app-user-guide.md"). The per-email storage model (Non-Critical Issue #1) is a deviation in *how* "seen" is tracked, not an unsupported new feature — it still serves the same task requirement ("shown once on first login"), so it is not classified as an invented requirement, only as an insufficiently-cited assumption.

### Structure & Conventions

No issues. The spec follows a clear, logically ordered structure (Source → Goal → Context → Scope → Behavior → Edge Cases → Data/API → Assumptions → Acceptance) and is internally consistent in terminology (`UserGuideStore`, `WelcomeGuideModal`, `hasSeenWelcome`/`seenByEmail` used consistently once introduced).

---

## Assumptions Detected

All explicitly listed in the spec's own "Assumptions" section:

1. "First login" = first time this email is seen on this browser (not global one-time, not server-persisted). — **Explicitly stated**, but see Non-Critical Issue #1: its grounding ("per the user's clarification") is not verifiable from the two reviewed input documents.
2. No secondary CTA (e.g., "Start guided tour") on the modal, since the tour is out of scope. — **Explicitly stated and well-grounded** (consistent with the Scope section's exclusion).
3. Modal copy reuses homepage step copy/images verbatim, condensed. — **Explicitly stated**, reasonable given no new copy was supplied in the task.
4. Help icon placement in `#end` template near avatar, since no UI mockup exists. — **Explicitly stated**, consistent with design doc §4 placement guidance.

No hidden/implicit assumptions were found beyond what's already listed — the spec's Assumptions section is thorough.

---

## Recommendation

- **Proceed as-is**, provided the spec author either (a) confirms the per-email "first login" interpretation was in fact discussed with the user and adds a pointer to that discussion, or (b) reframes it plainly as the spec author's own design decision with rationale, since it materially changes behavior (multi-account same-browser scenario) versus the design doc's simpler global-flag model. This does not block implementation — the per-email model is arguably the better interpretation of "first login" — but the review criteria require assumptions to be clearly and verifiably grounded, and this one currently is not.
