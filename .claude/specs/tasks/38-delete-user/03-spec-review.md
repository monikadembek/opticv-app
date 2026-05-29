# Spec Review — Task 38: Delete user account (BE & FE)

Reviewed against: `00-raw-task.md` and `02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, covers all explicit task requirements, and correctly documents the deletion sequence. However, two issues need attention before implementation: a logical ordering flaw in the backend deletion sequence (Supabase auth deleted before DB record, which creates an orphan risk inconsistency with the stated edge-case rule), and a vague/contradictory note in the Frontend Behavior section about how subscription data is loaded. Additionally, one assumption about `SupabaseService.user` exposing `displayName` and `avatarUrl` should be verified against the actual service code before implementation begins.

---

### Findings

#### Critical Issues

1. **Backend deletion order creates inconsistency with the stated edge-case rule (Behavior §4 vs Edge Cases §3)**

   The spec states in **Behavior §4d–e**: Supabase auth user is deleted *before* the DB record. Then in **Edge Cases**: "Supabase Admin API failure → return 500; do not delete the DB record."

   But if step 4d succeeds (Supabase auth deleted) and step 4e fails (DB delete fails), the auth identity is gone but the DB record remains — the user is locked out with no way to log back in, yet their data still exists in the DB. This is the worst possible partial-failure state and is not addressed.

   The spec needs to either:
   - Reverse the order (delete DB first, then Supabase auth), or
   - Explicitly acknowledge and accept this partial-failure scenario with a defined recovery path.

2. **Contradictory/ambiguous subscription data source in Frontend Behavior §2**

   The spec says: *"fetches subscription info from the backend (`GET /api/subscriptions/me` if it exists, otherwise derive from `SupabaseService`)"* — then immediately says *"Subscription tier/status are fetched via a new `GET /api/users/me` endpoint."*

   These three sources (`GET /api/subscriptions/me`, `SupabaseService`, `GET /api/users/me`) are mentioned in the same paragraph without a definitive ruling on which one to use. An implementer cannot determine the correct approach without guessing. The spec must pick exactly one source and remove the others.

#### Non-Critical Issues

3. **`GET /api/users/me` loading state not specified**

   The settings page needs to fetch data on load, but the spec does not describe loading or error states for the initial `GET /api/users/me` call (e.g., skeleton/spinner while loading, error message if the request fails). This is missing UI behavior.

4. **`ConfirmDialog` integration method not specified**

   PrimeNG's `ConfirmDialog` in Angular 21 standalone requires either `ConfirmationService` injection + `<p-confirmDialog>` in the template, or the newer `ConfirmDialog` imperative API. The spec says PrimeNG `ConfirmDialog` without specifying which integration pattern to use, which could lead to divergent implementation choices.

5. **No mention of `SUPABASE_URL` in the Admin client setup**

   The spec mentions `SUPABASE_SERVICE_ROLE_KEY` but does not mention `SUPABASE_URL`, which is also required to initialise the Supabase Admin client (`createClient(url, serviceRoleKey)`). The URL is likely already in env config, but the spec should reference it explicitly for completeness.

6. **`UserProfile` type duplication risk**

   The spec proposes adding `SubscriptionTier` and `SubscriptionStatus` as new string union types in `@opticv/datatypes`. These already exist as Prisma enums in the backend. The spec does not address whether the shared package should mirror the Prisma enum values or reference them — this could cause drift if the Prisma enum changes in the future.

#### Unclear or Ambiguous Sections

- **Behavior §2 (Frontend):** See Critical Issue #2 above — subscription data source is ambiguous.
- **Assumptions §1:** States that `SupabaseService.user` exposes `displayName` and `avatarUrl`. This is an unverified assumption about the existing service implementation and is marked as assumed rather than confirmed. It is explicitly listed, which is correct, but carries implementation risk if wrong.
- **Data / API — Supabase Admin API:** The spec says the Admin client "should be initialized in `UsersService` or a dedicated provider" — the "or" leaves the implementation location unresolved.

#### Invented or Unsupported Requirements

- **`GET /api/users/me` endpoint**: The raw task does not mention a read endpoint for user profile data. It says "display user data: email, current subscription tier" but does not prescribe *how* the frontend obtains that data. The spec introduces `GET /api/users/me` as a new endpoint. This is a reasonable implementation decision, but it goes beyond the explicit task text. It is not a blocking issue (the task implies the data must come from somewhere), but it should be flagged as a spec-level decision, not a task requirement.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | `SupabaseService.user` signal exposes `displayName` and `avatarUrl` | Yes (Assumptions §1) |
| 2 | No existing `GET /api/users/me` endpoint | Yes (Assumptions §2) |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` will be added to env files and Joi schema | Yes (Assumptions §3) |
| 4 | PrimeNG `ConfirmDialog` is already registered globally | Yes (Assumptions §4) |
| 5 | R2 files are deleted by individual `storageKey` from DB records | Yes (Assumptions §5) |
| 6 | `SUPABASE_URL` is already present in existing env config (not stated explicitly) | **No — implicit only** |
| 7 | The Prisma cascade deletes cover all related models without manual intervention | Mentioned in Context, not in Assumptions |
| 8 | `SubscriptionTier` and `SubscriptionStatus` do not already exist as exported types in `@opticv/datatypes` | **No — implicit only** |

---

### Recommendation

**Revise specification** — fix Critical Issue #1 (deletion order / partial-failure handling) and Critical Issue #2 (definitive subscription data source) before implementation begins. Non-critical issues can be resolved during implementation or in a follow-up update to the spec.
