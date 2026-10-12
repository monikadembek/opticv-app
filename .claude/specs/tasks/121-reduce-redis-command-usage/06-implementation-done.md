# Implementation Done — Task 121: Upstash Redis - reduce Redis command usage (BE)

Commit: `d077ff2`
Spec review: PASS WITH ISSUES
Code review: PASS WITH ISSUES (`05-code-review.md`)

## Summary

Task 121 changes the backend (`apps/opticv-be`) so it sends fewer Redis commands:

- **Queue:** the `optimization` queue is registered with `defaultJobOptions`. These hold `attempts: 2` and the exponential backoff (2000 ms), plus `removeOnComplete` (1 h / 100 jobs) and `removeOnFail` (7 days), with the retention values read from config. The three `queue.add(...)` calls no longer pass their own options.
- **Worker:** the `optimization` worker gets `stalledInterval` (default 300000 ms) and `drainDelay` (default 60 s) from env.
- **Env loading:** a new bootstrap module, `load-env.ts`, imported first in `main.ts`, loads `config/env/${NODE_ENV}.env` before the worker reads its options. Existing env vars keep precedence, and nothing happens if the file is missing.
- **Throttler:** storage is chosen by the new `THROTTLER_STORAGE` flag (`memory` | `redis`, default `memory`).
- **Config:** six new env vars are added to the Joi schema, `configuration.ts`, the local env files and `.env.example`.
- **Tests:** unit tests are added for the queue options, the worker options, the throttler storage factory and the env loader. The `queue.add` assertions in the service spec are updated.

Results at the time of implementation:

| Check | Result |
| --- | --- |
| `lint` | 0 errors |
| `typecheck` | Pass |
| `test` | Pass (31 suites, 310 tests) |
| `build` | Pass |

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `defaultJobOptions` on `optimization` queue with `attempts: 2` and `backoff: { type: 'exponential', delay: 2000 }` | Implemented | `optimization-queue.config.ts`, `optimization.module.ts` (`registerQueueAsync`) |
| Remove `attempts`/`backoff` from the three `queue.add(...)` calls | Implemented | `optimization.service.ts` |
| `removeOnComplete: { age, count }` from env (3600 s / 100) | Implemented | `BULLMQ_REMOVE_ON_COMPLETE_AGE`, `BULLMQ_REMOVE_ON_COMPLETE_COUNT` |
| `removeOnFail: { age }` from env (604800 s) | Implemented | `BULLMQ_REMOVE_ON_FAIL_AGE` |
| Worker `stalledInterval` from env (300000 ms) | Implemented | `BULLMQ_STALLED_INTERVAL` via `buildOptimizationWorkerOptions()` |
| Worker `drainDelay` from env (60 s) | Implemented | `BULLMQ_DRAIN_DELAY` via `buildOptimizationWorkerOptions()` |
| Env-file values take effect for `@Processor` options | Implemented | `src/load-env.ts` imported first in `main.ts` |
| `THROTTLER_STORAGE` flag (`memory` \| `redis`, default `memory`) | Implemented | `throttler-storage.factory.ts`, used in `app.module.ts` |
| New vars in `config/validation.ts` | Implemented | Numeric vars `Joi.number().integer().positive()`; `THROTTLER_STORAGE` `valid('memory', 'redis')` |
| New vars in `config/configuration.ts` | Implemented | `bullmq.*` (5 keys) and `throttler.storage` |
| New vars in all `config/env/*.env` files | Implemented | `development.env`, `staging.env`, `production.env` (gitignored, local only) |
| Unit test: queue `defaultJobOptions` | Implemented | `optimization-queue.config.spec.ts` |
| Unit test: worker options incl. fallback defaults | Implemented | `optimization-queue.config.spec.ts` (tests the builder function) |
| Unit test: throttler storage memory vs redis | Implemented | `throttler-storage.factory.spec.ts` |
| Updated `queue.add` assertions in service spec | Implemented | `optimization.service.spec.ts` (3 assertions) |
| Existing processor retry tests still pass | Implemented | `optimization.processor.spec.ts` unchanged, passing |
| Build, lint, typecheck and tests pass | Implemented | See the results table in Summary |
| Manual: completed and failed jobs removed from Redis after the configured age/count | Not implemented | Runtime check with Docker Redis not done yet (plan Step 5.3) |
| Manual: runs, retries and SSE behave as before | Not implemented | Smoke test not done yet (plan Step 5.3) |
| Manual: Upstash daily command count before and after | Not implemented | Requires a baseline before deploy and a check after deploy (plan Step 5.4) |

## Files

### Created

- `apps/opticv-be/src/load-env.ts`
- `apps/opticv-be/src/load-env.spec.ts`
- `apps/opticv-be/src/app/optimization/optimization-queue.config.ts`
- `apps/opticv-be/src/app/optimization/optimization-queue.config.spec.ts`
- `apps/opticv-be/src/app/throttler/throttler-storage.factory.ts`
- `apps/opticv-be/src/app/throttler/throttler-storage.factory.spec.ts`

### Modified

- `apps/opticv-be/src/main.ts`
- `apps/opticv-be/config/validation.ts`
- `apps/opticv-be/config/configuration.ts`
- `apps/opticv-be/config/env/.env.example`
- `apps/opticv-be/config/env/development.env` (gitignored, not in commit)
- `apps/opticv-be/config/env/staging.env` (gitignored, not in commit)
- `apps/opticv-be/config/env/production.env` (gitignored, not in commit)
- `apps/opticv-be/src/app/app.module.ts`
- `apps/opticv-be/src/app/optimization/optimization.module.ts`
- `apps/opticv-be/src/app/optimization/optimization.processor.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.ts`
- `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`
- `docs/tasks-list.md`

## Components

| Component (from plan) | Status |
| --- | --- |
| `loadEnvFile()` + side-effect import (`src/load-env.ts`) | Exist |
| `OPTIMIZATION_QUEUE` constant | Exist |
| `buildOptimizationJobOptions(config)` | Exist |
| `buildOptimizationWorkerOptions(env)` | Exist |
| `createThrottlerStorage(config)` | Exist |
| `BullModule.registerQueueAsync` registration for `optimization` | Exist |
| `@Processor(OPTIMIZATION_QUEUE, buildOptimizationWorkerOptions())` | Exist |

## Stores

Not applicable. The plan defines no stores, since this is a backend-only task.

## Deviations

- `load-env.spec.ts` mocks `fs` with `jest.mock('fs', …)` and a `jest.requireActual` spread. The plan said `jest.spyOn` on `fs.existsSync`.
- `load-env.spec.ts` imports the module dynamically as `./load-env.js`, with the extension that typecheck requires.
- `optimization.service.ts`: after the third argument was removed, prettier collapsed the three `queue.add(...)` calls into single-object-argument formatting.
- The local env files (`development.env`, `staging.env`, `production.env`) are gitignored, so their changes are not part of commit `d077ff2`.
- Plan Steps 5.3 and 5.4 (local smoke test, Redis key and `MONITOR` checks, Upstash before/after) have not been done yet.

## Additional Implementation

Additional implementation not covered by the original documents:

- `apps/opticv-be/config/env/.env.example`: the six new variables were added with explanatory comments, at the user's request.
- `docs/tasks-list.md`: the task 121 entry (problem, to do, acceptance criteria) replaces an earlier free-form note about Upstash.
