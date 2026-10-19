# Specification Review — Task 128

### Summary

- Overall assessment: **PASS WITH ISSUES**
- Justification: The spec covers both explicit task requirements: making "Product updates" off by default and making all promotional emails off by default. Every scope item traces back to the task or to answers the developer gave in the clarification phase. The issues found are minor: a migration-authoring detail, vague wording about which tests to change, and a few facts that are stated in Context instead of in the Assumptions list. None of them blocks implementation.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **How the migration is authored (Data / API, Scope).** The migration must contain both an `ALTER COLUMN ... SET DEFAULT false` and an `UPDATE` statement. `prisma migrate dev` generates only the schema diff (the `ALTER`). The spec doesn't say that the `UPDATE` has to be added by hand, for example by creating the migration with `--create-only` and then editing it. An implementer might apply a migration that has only the `ALTER`.
2. **Which tests to update (Scope, Acceptance).** "Update the existing unit tests … where they assume `true` as the default" is vague. In `settings.spec.ts` and `users.service.spec.ts`, many places use `productUpdatesEnabled: true` as plain fixture data (for example the mock profile at `settings.spec.ts:22`), not as a default. The spec should say which assertions cover default or newly created values, such as the result of `ensureNotificationPreferences` and the initial signal value, so that fixture data isn't changed for no reason.
3. **No rollback or reversibility note (Edge Cases).** The data reset can't be undone: earlier real opt-ins are lost for good. The spec mentions this under "User who really opted in" but doesn't say whether a down-migration or a pre-migration backup is expected. It's fine to state "no rollback". The spec should just say it explicitly.
4. **Placeholder in the migration name.** `<timestamp>_product_updates_opt_in` is a reasonable placeholder, but the spec doesn't say that the name is only a suggestion.

#### Unclear or Ambiguous Sections

- **Behavior §5 / Acceptance:** "never briefly shows as on before the data arrives." This holds for the client-rendered initial state. With SSR, the server-rendered HTML also shows the initial signal value, so it's `false` too. The spec doesn't say whether it means SSR output, hydration, or both. The meaning is clear enough, but it's not explicit.
- **Scope → "Update the existing unit tests":** see Non-Critical Issue 2.

#### Invented or Unsupported Requirements

None. Notes on traceability:

- **Resetting existing rows to `false`:** this isn't in the raw task. It comes from an explicit clarification answer ("Reset all to false").
- **Initial frontend signal set to `false`:** this isn't stated in the task, but it follows directly from "off by default" (the UI default). It's acceptable.
- **Excluding the consent audit trail:** this comes from a clarification answer.

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
| --- | --- | --- |
| 1 | "Promotional emails" means exactly `PRODUCT_UPDATES` and `WEEKLY_TIPS`; no other email categories exist | Yes (Assumptions) |
| 2 | The data reset runs in all environments through the normal migration flow | Yes (Assumptions) |
| 3 | Users aren't notified about the reset | Yes (Assumptions) |
| 4 | The codebase doesn't send promotional emails yet | Partly: stated as a fact in Context, not in Assumptions |
| 5 | The privacy policy wording needs no change | Partly: stated in Context, not in Assumptions |
| 6 | No other code path sets `productUpdatesEnabled = true` on creation (for example `upsertUser`) | No: implicit (checked against `users.service.ts`, where `upsertUser` doesn't touch `Notification`) |
| 7 | The task's legal interpretation (Polish law requires opt-in for these emails) is correct and not re-verified | No: taken from the task as given |
| 8 | Losing earlier real opt-ins is acceptable | Yes (Edge Cases; confirmed in clarification) |

### Recommendation

- **Proceed as-is.** The non-critical issues (especially 1 and 2) can be dealt with in the implementation plan without revising the spec.
