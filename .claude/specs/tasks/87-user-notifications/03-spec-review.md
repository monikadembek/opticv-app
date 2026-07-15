# Specification Review — Task 87: User Notifications

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-grounded in the actual codebase — file paths, current signatures, and the `Subscription` model precedent were checked and match reality exactly. It fully covers the raw task's four requirements (settings toggle, `Notification` table + user relation, update endpoint, frontend wiring). A few non-critical gaps and one notable precedent deviation (upsert-on-read for `getProfile`, which no existing code path does) should be acknowledged before implementation, but nothing blocks proceeding.

---

## Findings

### Critical Issues

None.

### Non-Critical Issues

1. **`getProfile` upsert-on-read is a new pattern, not an extension of an existing one.** The spec (Behavior §6, Data/API "Backend" section) asks `UsersService.getProfile` to upsert a `Notification` row if missing. Verified against current code: `getProfile` (users.service.ts:49-68) only ever *reads* `subscription` via `include`; the only place `subscription` is upserted is `upsertUser` (users.service.ts:39-43), which runs once at webhook-sync time, not on every profile read. The spec's plan to upsert `Notification` inside `getProfile` itself (an on-every-GET write) is a reasonable and clearly-justified solution to the stated edge case ("existing users without a row"), but it is a new pattern in this codebase, not a mirrored one as the spec's phrasing ("Existing pattern to mirror") might suggest for this specific piece. Implementers should be aware this diverges from the `Subscription` precedent's write-once-at-sync approach.
2. **`@IsIn` validator has no existing precedent in the codebase.** Verified `update-display-name.dto.ts` — the only existing DTO — uses `@IsString`, `@IsNotEmpty`, `@MaxLength`, `@MinLength` from `class-validator`. No DTO currently uses `@IsIn` or an enum validator. The spec's suggestion is valid (`class-validator` supports `@IsIn`), but it's an assumption extending beyond an established local pattern rather than a direct mirror — worth a one-line note rather than presenting it as precedent.
3. **Migration naming/rollback not specified.** The spec says "Prisma migration for the new table" and gives the exact command, but doesn't name the migration or note any rollback/verification step beyond "applied cleanly against a dev database." Minor, since this matches the project's general lack of migration-naming conventions elsewhere, but worth calling out as a gap.
4. **No mention of `UserProfileDto`'s Swagger decorators for the new nested `notifications` field.** The spec says "`UserProfileDto` gets a nested `NotificationPreferencesDto`" but doesn't show the `@ApiProperty`/`@ApiPropertyOptional` decoration, unlike its treatment of the existing `SubscriptionDto` (verified in user-profile.dto.ts:4-27, which the spec doesn't quote but which sets the decorator precedent). Not a blocker — implementer can follow the adjacent `SubscriptionDto` pattern — but the spec could have made this explicit given it explicitly modeled other DTOs after existing code.

### Unclear or Ambiguous Sections

1. **Behavior §5** ("upserts a `Notification` row (`create` with both fields at their default plus the changed one set, `update` sets only the field matching `type`)") is slightly ambiguous on the `create` case: "both fields at their default plus the changed one set" could be read as "defaults for both, then override the changed field" (consistent with the Data/API section's fuller description) or as two separate operations. The Data/API section (line 134) clarifies this correctly ("defaults for the other field on create"), so the ambiguity is resolved elsewhere in the doc, but the Behavior section alone is not self-sufficient.
2. **Edge case "Concurrent double-click"** (line 55) states "last response wins (no debouncing/locking added)" — this is a reasonable and explicitly-stated design choice, not a gap, but it's worth flagging that it wasn't verified against how `onFullNameUpdateSubmit` handles concurrent submits (that flow uses a `isSavingName` disabled-button guard, which is a form of debouncing the notifications toggles won't have). This is a real behavioral inconsistency between the two "mirrored" flows that the spec doesn't call out.

### Invented or Unsupported Requirements

None. Every requirement traces back to the raw task (`00-raw-task.md`): settings toggle for two notification types → Notification table + user relation → endpoint accepting type/value → frontend wiring on switch click. The spec's additions (upsert-on-read for missing rows, DTO validation, error-toast/revert UX, unit test coverage) are reasonable elaborations needed to make the raw task's four bullet points implementable, not new features.

---

## Assumptions Detected

| Assumption | Explicitly stated in spec? |
|---|---|
| Default values are `productUpdatesEnabled: true`, `weeklyTipsEnabled: false`, matching today's hardcoded FE signal defaults (verified: `settings.ts:75-76` — `signal(true)` / `signal(false)`, confirmed exact match) | Yes (Behavior §6, Data/API Prisma schema) |
| One `Notification` row per user (1:1), not a per-type row | Yes (Scope, Prisma schema) |
| The response shape returned by the new endpoint is identical to `getProfile`/`updateDisplayName`'s `UserProfile` (verified: current `updateDisplayName` returns the full profile object, not a partial — confirmed exact match at users.service.ts:89-100) | Yes (Data/API "Backend") |
| No debouncing/locking needed on rapid double-clicks, diverging from the `isSavingName`-guarded full-name form | Yes, but not flagged as an inconsistency with the mirrored flow (see Unclear section above) |
| `getProfile` performing a write (upsert) on every read is an acceptable pattern here, despite no existing precedent for it | Implicit — not explicitly flagged as new/non-precedented (see Non-Critical Issue #1) |
| `class-validator`'s `@IsIn` is an acceptable validator despite no current DTO using it | Implicit — presented as equivalent to existing validation style without noting it's a first use |

---

## Recommendation

- **Proceed as-is.** The non-critical issues are clarifications an implementer can resolve inline (mirroring the adjacent `SubscriptionDto` for decorators, treating the `getProfile` upsert as a deliberate new-but-justified pattern) without needing the spec rewritten. No critical issues or invented requirements were found.
