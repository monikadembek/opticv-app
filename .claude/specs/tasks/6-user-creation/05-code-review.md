# Code Review — Task 6: Handle user creation on the backend

Reviewed: 2026-05-13
Reviewer: Claude Code (peer review mode)

---

### Summary

- **Overall result: PASS WITH ISSUES**
- The implementation is functionally correct and covers the primary and fallback paths described in the spec. The upsert logic, webhook verification, JWT guard, and unit tests are all present and working. However, there are two critical issues: (1) `development.env` contains real credentials committed to the repository, and (2) the Joi validation schema references `SUPABASE_PUBLISHABLE_KEY` while the spec and plan mandate `SUPABASE_ANON_KEY` — this naming inconsistency is present throughout the code. There are also minor non-critical issues.

---

### Conventions Violations

#### Critical (must fix before merge)

1. **Real secrets committed in `development.env`** (`apps/opticv-be/config/env/development.env`, lines 3–5)
   Actual `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_WEBHOOK_SECRET` values are hardcoded in a file that is (presumably) tracked by git. Secrets must never be committed. The env file should contain only placeholder values (e.g., `SUPABASE_URL=`) or the file must be in `.gitignore`. The `SUPABASE_WEBHOOK_SECRET` value in particular appears to be a real signing secret.

   **Response: env files are not commited**

2. **`SUPABASE_ANON_KEY` renamed to `SUPABASE_PUBLISHABLE_KEY` without spec/plan alignment** (multiple files)
   The spec (`02-spec.md`) and implementation plan (`04-implementation-plan.md`) both specify the variable name `SUPABASE_ANON_KEY`. The implementation uses `SUPABASE_PUBLISHABLE_KEY` throughout:
   - `apps/opticv-be/config/validation.ts` line 7
   - `apps/opticv-be/src/app/auth/supabase-client.provider.ts` line 12
   - `apps/opticv-be/config/env/development.env` line 4
   - `apps/opticv-be/config/env/production.env` line 3

   Renaming is a deliberate deviation from the spec. If this name was intentionally changed (e.g., to match Supabase's current dashboard terminology), the spec and plan must be updated to document it. As-is, this creates confusion.

   **Response: According to sSupabase docs SUPABASE_ANON_KEY is deprecated and now should be used SUPABASE_PUBLISHABLE_KEY**

#### Non-Critical (should fix)

1. **`UsersService` uses constructor injection instead of `inject()`** (`apps/opticv-be/src/app/users/users.service.ts`, line 7)
   The conventions doc (`conventions.md`) mandates: *"Use the `inject()` function instead of constructor injection"* for services. `UsersService` uses `constructor(private readonly prisma: PrismaService)`. Should use `private readonly prisma = inject(PrismaService)` with a field declaration instead.

**Response: inject() should be used in Angular Frontend App, not in Nest.js**

2. **`UsersController` uses constructor injection instead of `inject()`** (`apps/opticv-be/src/app/users/users.controller.ts`, lines 21–24)
   Same violation — `UsersController` injects `UsersService` and `ConfigService` via constructor. Should use `inject()`.

3. **`SupabaseGuard` uses constructor injection instead of `inject()`** (`apps/opticv-be/src/app/auth/supabase.guard.ts`, lines 16–18)
   Same pattern — `SupabaseGuard` uses `@Inject(SUPABASE_CLIENT)` and constructor parameter injection. The plan specifically says: *"Uses `inject()` for `SUPABASE_CLIENT` and `UsersService`"* — this deviates from both the plan and the convention.

4. **`Logger.log` leaks user email in production** (`apps/opticv-be/src/app/users/users.controller.ts`, line 53)
   `Logger.log('New user created: ', upsertUser.email)` logs PII (email) to stdout with no environment guard. This is a data handling concern. At minimum, log the user ID rather than the email, or omit PII from logs entirely.

5. **`@UsePipes` on endpoint is redundant** (`apps/opticv-be/src/app/users/users.controller.ts`, line 27)
   `main.ts` registers `ValidationPipe` globally (`app.useGlobalPipes(new ValidationPipe({ whitelist: true }))`). Applying `@UsePipes(new ValidationPipe({ whitelist: true }))` again on the endpoint creates a second validation pass. The local pipe is redundant and should be removed.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| `POST /api/users/sync` endpoint | Covered | Path and HTTP method match |
| Webhook secret verification via header comparison | Covered | `timingSafeEqual` used correctly; length check on mismatch is handled |
| 401 on invalid webhook secret | Covered | `UnauthorizedException` thrown |
| 400 on missing `supabaseId` or `email` | Covered | `ValidationPipe` + `WebhookPayloadDto` handles this |
| Upsert `User` + `Subscription` atomically | Covered | `prisma.$transaction` used |
| No-op upsert on duplicate | Covered | `update: {}` in both upserts |
| `SupabaseGuard` JWT validation | Covered | `supabase.auth.getUser(token)` used |
| 401 on invalid JWT | Covered | |
| Fallback upsert in guard when no User row exists | Covered | Guard always calls `upsertUser` |
| `request.user` populated after guard | Covered | |
| Modules registered in `AppModule` | Covered | `UsersModule` and `AuthModule` imported |
| `ValidationPipe` enabled globally | Covered | Added in `main.ts` |
| Joi validation for 3 new env vars | Partial | Covered for `SUPABASE_URL` and `SUPABASE_WEBHOOK_SECRET`; `SUPABASE_ANON_KEY` from spec is registered as `SUPABASE_PUBLISHABLE_KEY` |
| Unit tests: `UsersService` | Covered | 3 test cases as planned |
| Unit tests: `SupabaseGuard` | Covered | 5 test cases; all scenarios from plan covered |
| Env vars added to both env files | Covered | Both `development.env` and `production.env` updated |
| `respond 200 OK with { received: true }` | Covered | |
| Missing `supabaseId` or `email` → 400 and log | Partial | 400 is handled; logging on 400 is not present |

---

### Plan Deviations

1. **`inject()` not used in `UsersService`, `UsersController`, or `SupabaseGuard`** — Plan step 3b explicitly says *"Uses `inject()` for `SUPABASE_CLIENT` and `UsersService`"*. All three classes use constructor injection instead.

2. **`SUPABASE_ANON_KEY` renamed to `SUPABASE_PUBLISHABLE_KEY`** — Plan step 3a says `configService.getOrThrow('SUPABASE_ANON_KEY')`. Implementation uses `SUPABASE_PUBLISHABLE_KEY`. This is an undocumented deviation.

3. **`Logger.log` after successful upsert in controller** — Not mentioned in the plan. Minor addition, but the email is PII (see non-critical issue above).

4. **Local `@UsePipes` on `sync` endpoint** — Plan step 4c describes the controller using `ValidationPipe` but does not specify applying it locally when already global. Redundant decorator added.

---

### Null Safety Issues

1. **`email` guard in `SupabaseGuard` handles null email** (`supabase.guard.ts`, lines 36–38)
   The guard correctly checks `if (!email)` and throws before calling `upsertUser`. This is good — the `UsersService` signature requires `email: string` (not nullable).

2. **`webhookSecret` is typed `string | undefined`** (`users.controller.ts`, line 29)
   The guard against `undefined` is handled (`webhookSecret !== undefined` in the `isValid` check). Safe.

No unguarded nullable issues found.

---

### Code Smells

1. **Magic strings `'FREE'` and `'ACTIVE'`** (`apps/opticv-be/src/app/users/users.service.ts`, lines 22–23)
   `tier: 'FREE'` and `status: 'ACTIVE'` are raw string literals. If these map to Prisma enum values, using the generated enum (`SubscriptionTier.FREE`, `SubscriptionStatus.ACTIVE`) would be safer and self-documenting. Verify whether Prisma enums are generated for these fields.

2. **`upsertUser` result assigned to `const upsertUser`** (`apps/opticv-be/src/app/users/users.controller.ts`, line 48)
   Variable name `upsertUser` shadows the method name pattern and reads as a verb. Should be named `user` for clarity.

3. **`WebhookRecord` class not exported** (`apps/opticv-be/src/app/users/dto/webhook-payload.dto.ts`, line 4)
   `WebhookRecord` is used only internally within the DTO file. Not exporting it is intentional and acceptable — just noting it is fine as-is.

---

### Recommendation

**Fix critical issues before merge.**

The two critical issues — committed secrets and `SUPABASE_ANON_KEY` vs `SUPABASE_PUBLISHABLE_KEY` naming mismatch — must be resolved. Rotate the `SUPABASE_WEBHOOK_SECRET` value that appears to have been committed, then replace real credentials in the env file with placeholders (or add the file to `.gitignore`). Align the variable name across spec, plan, code, and env files. The non-critical `inject()` convention violations should also be addressed to stay consistent with the project's coding standards.
