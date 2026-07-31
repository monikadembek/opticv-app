# DriverAdapterError: current transaction is aborted, commands ignored until end of transaction block

**Sentry Issue ID:** 137037975
**Short ID:** OPTICV-NODE-NESTJS-A
**Project:** opticv-node-nestjs
**First seen:** Jul 28, 2026 2:01:09 PM CEST
**Environment:** production
**Endpoint:** `POST /api/optimizations/job-applications/:jobApplicationId/run/:promptType` (observed with `promptType=SUMMARY_REWRITE`)

## Raw error

```
DriverAdapterError: current transaction is aborted, commands ignored until end of transaction block
```

Tags: browser Chrome 150 / Windows, node v22.16.0, handled: no, mechanism: auto.http.nestjs.global_filter.

## Explanation

This message is generic Postgres behavior, not the real bug: once any statement inside a transaction fails, Postgres refuses to run any further statements in that same transaction until a `ROLLBACK` happens. So this error is always a *symptom* of an earlier statement in the same transaction failing, with the code continuing to use that transaction handle afterward.

### Where it happens

`apps/opticv-be/src/app/quota/quota.service.ts`, `QuotaService.checkAndConsume` (~lines 42-69), called from `optimization.service.ts` (`triggerSingleJob`) when a prompt run is triggered from `optimization.controller.ts`.

Inside one `$transaction`:

1. `tx.usageQuota.upsert(...)` — insert-or-update the quota row for `(userId, feature, periodStart)`
2. On a caught `P2002` (unique violation) — `tx.usageQuota.findUniqueOrThrow(...)`
3. `tx.usageQuota.updateMany(...)` to actually consume the quota

### Likely root cause

The frontend fires the four prompt-type runs (`RESUME_AUTOPSY`, `KEYWORD_GAP`, `SUMMARY_REWRITE`, `BULLET_UPGRADE`) close together for the same job application, and they all map to the same `LimitedFeature.CV_OPTIMIZATION` quota bucket. Multiple concurrent transactions try to `upsert` the same `usage_quotas` row (unique constraint on `userId, feature, periodStart`, defined in `apps/opticv-be/prisma/migrations/20260713125454_subscription_limits/migration.sql`).

Under concurrency, Postgres can raise something other than a clean `P2002` for the "losing" transaction (e.g. a deadlock or serialization failure). The code's catch block only special-cases `P2002`, so on any other failure the transaction is left aborted, and the next statement in that same `tx` (the `findUniqueOrThrow` recovery query, or the final `updateMany`) fails with "current transaction is aborted...". SUMMARY_REWRITE just happened to be the request that lost the race in this occurrence — any of the four prompt types could surface it.

### Ruled out

Not related to the task-101 keyword-gap acronym-issues branch changes. Those only touch `Json?` columns (`packages/shared/datatypes/src/lib/datatypes.ts`, `apps/opticv-be/prisma/seed.ts`) with no Prisma schema/migration changes, and they aren't read anywhere in the quota/optimization-run code path. `schema.prisma` is unmodified on that branch and migrations are in sync (no drift for `UsageQuota`/`LimitedFeature`).

## Suggested fix direction (not yet applied)

- Make quota consumption resilient to concurrent writes for the same `(userId, feature, periodStart)`:
  - Handle broader error classes in the catch block (not just `P2002`), or
  - Use `INSERT ... ON CONFLICT DO NOTHING` plus a separate atomic increment, or
  - Serialize access with `SELECT ... FOR UPDATE`.
- Consider whether the frontend needs to fire all four prompt runs simultaneously per job application — that concurrency is what triggers the race in the first place.
