# Task Specification

## Source

Azure DevOps Task: 121 — Upstash Redis - reduce Redis command usage (BE)

## Goal

Cut the number of Redis commands the backend sends, especially while idle, so the Upstash free tier (500K commands/month) is no longer used up within days. This involves:

1. Slowing down the BullMQ `optimization` worker's idle polling (`stalledInterval`, `drainDelay`), with the values set from env.
2. Removing completed and failed jobs from Redis automatically (`removeOnComplete` / `removeOnFail`), with the values set from env.
3. Moving the shared retry options (`attempts`, `backoff`) into the queue's `defaultJobOptions`.
4. Making the throttler storage switchable through an env flag, defaulting to in-memory, so ordinary API requests no longer hit Redis.

## Context

Backend only (`apps/opticv-be`). Files involved:

| File | Current state |
| --- | --- |
| `src/app/app.module.ts` | `BullModule.forRootAsync` (Redis connection). `ThrottlerModule.forRootAsync` always uses `new ThrottlerStorageRedisService(...)` against the same Redis instance. |
| `src/app/optimization/optimization.module.ts` | `BullModule.registerQueue({ name: 'optimization' })` has no `defaultJobOptions`. |
| `src/app/optimization/optimization.service.ts` | Three `queue.add('optimize', …, { attempts: 2, backoff: { type: 'exponential', delay: 2000 } })` calls (around lines 139, 201, 294). No `removeOnComplete` / `removeOnFail`. |
| `src/app/optimization/optimization.processor.ts` | `@Processor('optimization', { concurrency: CONCURRENCY })`, where `CONCURRENCY` is read from `process.env['BULLMQ_CONCURRENCY']` at module load. No `stalledInterval` / `drainDelay`, so BullMQ defaults apply (30 000 ms / 5 s). `isFinalAttempt` relies on `job.opts.attempts`. |
| `config/validation.ts` | Joi schema: `BULLMQ_CONCURRENCY` default 5, `THROTTLER_*` TTL/limit vars. |
| `config/configuration.ts` | `bullmq: { concurrency }`, `throttler: { … }` sections. |
| `config/env/{development,staging,production}.env` | `REDIS_*`, `BULLMQ_CONCURRENCY=5`, commented-out `THROTTLER_*` lines. |
| `optimization.service.spec.ts` | Asserts `expect.objectContaining({ attempts: 2 })` on `queue.add` (around lines 272, 518, 793). |
| `optimization.processor.spec.ts` | Tests `process()` with `attempts`/`attemptsMade` on the job. |

Libraries: `bullmq ^5.76`, `@nestjs/bullmq ^11.0.4`, `@nestjs/throttler ^6.5`, `@nest-lab/throttler-storage-redis ^1.2`.

Production runs as a single Node.js app on Hostinger (`docs/production-deployment-plan.md`).

## Scope

### In scope

- `defaultJobOptions` on the `optimization` queue:
  - `attempts: 2`, `backoff: { type: 'exponential', delay: 2000 }`, both moved out of the three `queue.add(...)` calls.
  - `removeOnComplete: { age, count }`, taken from env.
  - `removeOnFail: { age }`, taken from env.
- Worker options `stalledInterval` and `drainDelay` on `@Processor('optimization', …)`, taken from env.
- A new env flag `THROTTLER_STORAGE` (`memory` | `redis`, default `memory`) that picks the throttler storage.
- New env vars added to `config/validation.ts`, to `config/configuration.ts`, and to all three `config/env/*.env` files.
- Updated and new backend unit tests for the queue, worker and throttler-storage options.

### Out of scope

- Moving to a different Redis provider or a flat-price plan. That decision is made separately.
- Frontend changes.
- Changes to the throttler TTLs/limits, the guards (`ApiThrottlerGuard`, `AiThrottlerGuard`) or the exception filter.
- Changes to the SSE / `OptimizationEventBus` mechanism, or to billing and quota logic.
- Fixing how `BULLMQ_CONCURRENCY` itself is loaded, beyond whatever shared mechanism the new worker options need (see Edge Cases).
- Cleaning up jobs that are already in Redis before this change. The new removal options only apply to jobs added afterwards (see Edge Cases).

## Behavior

### 1. New env variables

| Variable | Unit | Joi default | Value in all `*.env` files | Used for |
| --- | --- | --- | --- | --- |
| `BULLMQ_STALLED_INTERVAL` | ms | `300000` (5 min) | `300000` | Worker `stalledInterval` |
| `BULLMQ_DRAIN_DELAY` | s | `60` | `60` | Worker `drainDelay` |
| `BULLMQ_REMOVE_ON_COMPLETE_AGE` | s | `3600` (1 h) | `3600` | `removeOnComplete.age` |
| `BULLMQ_REMOVE_ON_COMPLETE_COUNT` | jobs | `100` | `100` | `removeOnComplete.count` |
| `BULLMQ_REMOVE_ON_FAIL_AGE` | s | `604800` (7 days) | `604800` | `removeOnFail.age` |
| `THROTTLER_STORAGE` | enum | `'memory'` | `memory` | Throttler storage choice |

- `validation.ts`: the numeric vars use `Joi.number()` with the defaults above (positive integers). `THROTTLER_STORAGE` uses `Joi.string().valid('memory', 'redis').default('memory')`.
- `configuration.ts`: add `stalledInterval`, `drainDelay`, `removeOnCompleteAge`, `removeOnCompleteCount` and `removeOnFailAge` to the `bullmq` section, and `storage` to the `throttler` section. Each gets the same fallback default as above, following the existing `parseInt(process.env.X || 'default', 10)` pattern.
- Env files: add the vars next to `BULLMQ_CONCURRENCY` and the `THROTTLER_*` block, uncommented and set to the values above.

### 2. Queue default job options

- `optimization.module.ts` sets `defaultJobOptions` for the `optimization` queue to:
  - `attempts: 2`
  - `backoff: { type: 'exponential', delay: 2000 }`
  - `removeOnComplete: { age: <BULLMQ_REMOVE_ON_COMPLETE_AGE>, count: <BULLMQ_REMOVE_ON_COMPLETE_COUNT> }`
  - `removeOnFail: { age: <BULLMQ_REMOVE_ON_FAIL_AGE> }`
- The values come from `ConfigService`, using the existing async-registration style in `app.module.ts`, for example `BullModule.registerQueueAsync({ name: 'optimization', inject: [ConfigService], useFactory })`.
- `attempts` and `backoff` stay hard-coded. Only the retention values come from env.
- The three `queue.add('optimize', payload, …)` calls in `optimization.service.ts` no longer pass job options. Job name and payload stay the same.
- BullMQ merges `defaultJobOptions` into each job's `opts`, so `job.opts.attempts` is still `2` inside the processor and the `isFinalAttempt` logic keeps working unchanged.

### 3. Worker polling options

- `@Processor('optimization', { concurrency, stalledInterval, drainDelay })` uses the env values above.
- After a job is added, BullMQ v5 wakes the idle worker through its marker key, so a longer `drainDelay` does not delay new jobs. Fewer blocking calls go out while idle.
- `stalledInterval = 5 min`: if the process dies during a job, that job is picked up as stalled within about 5 minutes, instead of about 30 s, once a worker is running again. `lockDuration` keeps its default (30 s). Lock renewal only happens while a job is active, so it adds no idle commands.

### 4. Throttler storage

- When `throttler.storage === 'redis'`, `ThrottlerModule.forRootAsync` builds `ThrottlerStorageRedisService` with the current Redis connection settings (same as today).
- When `throttler.storage === 'memory'` (the default), no `storage` is passed, so `@nestjs/throttler` uses its built-in in-memory storage.
- Throttler names, TTLs, limits and guards stay as they are.
- All environments are set to `memory` in this task. Production runs a single backend instance, so in-memory counters behave the same as Redis counters there.

### 5. Manual verification (outside CI)

- Record the Upstash dashboard's daily command count for the staging/production Redis instance for one day before the deploy and one day after it, with the backend idle or under normal traffic. Expect a clearly lower count.

## Edge Cases

- **Worker options must actually come from the env file.** `@Processor(...)` decorator options are evaluated when `optimization.processor.ts` is imported. That happens before `ConfigModule.forRoot` loads `config/env/${NODE_ENV}.env` into `process.env`, and `@nestjs/bullmq` only reads worker options from the decorator metadata. So reading `process.env['BULLMQ_STALLED_INTERVAL']` at module scope, the way `CONCURRENCY` is read today, would silently fall back to the hard-coded defaults whenever the value only exists in the `.env` file. The implementation plan must pick a mechanism that applies the env-file values (for example loading the env file before `AppModule` is imported, or another clean approach), and keep fallback defaults equal to the table above. If the chosen mechanism also fixes `BULLMQ_CONCURRENCY`, that is acceptable. A separate refactor of concurrency loading is not required.
- **Existing jobs:** jobs already in Redis before the deploy do not have `removeOnComplete` / `removeOnFail` in their stored options and are not removed automatically. Clearing them is optional and done manually (for example via the Upstash console). It is not part of the code change.
- **Retention semantics:** `removeOnComplete: { age, count }` keeps completed jobs while they are within the age limit, up to `count` jobs. Older or extra jobs are removed when later jobs complete. `removeOnFail` applies only after the final attempt fails. A job that failed on attempt 1 and is waiting to retry is not removed.
- **Retry behaviour unchanged:** a job that fails on attempt 1 is retried once with exponential backoff (2 s). The processor still emits the terminal SSE event only on the final attempt, because `job.opts.attempts` still resolves to `2`.
- **Process restart mid-job:** the job becomes stalled and is retried after up to `BULLMQ_STALLED_INTERVAL` once the worker is back. The UI may show the section as processing for up to ~5 minutes in that rare case. This is accepted as the cost of fewer idle commands.
- **In-memory throttler:** counters reset on restart or redeploy. If the backend is ever scaled to several instances, each instance keeps its own counters, so the effective limit is multiplied. In that case set `THROTTLER_STORAGE=redis`, with no code change. AI usage/billing limits are enforced in the database by `QuotaModule` and are not affected.
- **Invalid env values:** an unknown `THROTTLER_STORAGE` value or non-numeric BullMQ values fail Joi validation at startup, as other config errors do today.
- **Local development:** dev uses a local Docker Redis, where command count doesn't matter, but uses the same values for consistency.

## Data / API

- **Endpoints:** no changes. Request/response contracts and SSE events stay the same.
- **Models / DB:** no Prisma schema changes or migrations.
- **Shared types (`@opticv/datatypes`):** no changes.
- **Config:** 6 new env vars (see Behavior §1) in `validation.ts`, `configuration.ts` and all three `config/env/*.env` files.
- **Redis data:** finished jobs now expire from the `bull:optimization:*` keys according to the retention settings.

## Assumptions

- Production runs exactly one `opticv-be` process (one Hostinger Node.js app, per `docs/production-deployment-plan.md`). If Hostinger's runtime starts more than one worker process, in-memory throttling becomes per-process and therefore looser. The task accepts this, and the env flag allows switching back to Redis.
- Upstash accepts blocking commands with a 60 s timeout (`drainDelay`). If Upstash caps blocking timeouts lower, the worker still works and the savings are smaller.
- `attempts: 2` and the backoff config stay hard-coded constants. Only retention and polling values are configurable, as agreed.
- No other code path reads `job.opts` for anything besides `attempts`.

## Acceptance (DEV)

- `npm exec nx build opticv-be`, `lint`, `typecheck` and `test` pass.
- Unit tests:
  - `optimization.service.spec.ts`: the three `queue.add` assertions expect job name and payload only. Nothing asserts per-call `attempts`/`backoff` any more, so update or remove the `objectContaining({ attempts: 2 })` expectations.
  - A new or updated test checks the `optimization` queue registration's `defaultJobOptions`: `attempts: 2`, exponential backoff 2000, and `removeOnComplete` / `removeOnFail` built from config values.
  - A new or updated test checks the worker options on `OptimizationProcessor` (`concurrency`, `stalledInterval`, `drainDelay`), for example by reading the `@Processor` metadata, including the fallback defaults.
  - A test checks that the throttler storage factory returns no custom storage for `memory` and a `ThrottlerStorageRedisService` for `redis`.
  - Existing processor retry tests (`attemptsMade`/`attempts`) still pass unchanged.
- Completed and failed optimization jobs are removed from Redis after the configured age/count. This can be verified locally with Docker Redis using short values.
- Optimization runs, retries and SSE results behave as before (manual smoke test: start an optimization, retry a section, reopen a run).
- Manual: the Upstash daily command count is noticeably lower one day after deploy than one day before.
- No breaking changes to the API or frontend.
