# Implementation Plan — Task 121: Upstash Redis - reduce Redis command usage (BE)

Inputs: `02-spec.md`, `03-spec-review.md` (PASS WITH ISSUES).

Backend only (`apps/opticv-be`). No frontend, shared-types, Prisma or API contract changes.

---

## Decisions (resolving review findings)

| Review finding | Decision in this plan |
| --- | --- |
| Clarification decisions not traceable | The env flag `THROTTLER_STORAGE` (default `memory`), env-configurable retention, and the values 5 min / 60 s / 1 h + 100 / 7 days were agreed in the spec clarification answers. This plan implements exactly those. |
| How env-file values reach `@Processor` options (firm requirement) | Add a small bootstrap module, `src/load-env.ts`. `main.ts` imports it **first**, and it loads `config/env/${NODE_ENV}.env` into `process.env` with Node's built-in `process.loadEnvFile` before `AppModule` (and so `optimization.processor.ts`) is evaluated. Verified on Node 22: variables already set in the real environment take precedence over file values, which matters on Hostinger, where production values are real env vars and the file is not deployed. If the file does not exist, nothing happens. No new dependency is needed. |
| `BULLMQ_CONCURRENCY` in or out of scope | It is handled by the same mechanism as a side effect. The worker-options builder reads concurrency the same way as the two new options. No other change to concurrency. |
| Testability of inline factories | Move the three config-driven option builders into small exported pure functions (queue job options, worker options, throttler storage), each unit-tested directly. The modules and decorator only call them. |
| Joi strictness | Use `Joi.number().integer().positive().default(...)` for the five new numeric vars. Existing vars stay unchanged. |
| Env file lines commented or not | The new lines are **uncommented** in all three env files, next to `BULLMQ_CONCURRENCY`. `THROTTLER_STORAGE=memory` is added as an uncommented line directly above the existing commented `THROTTLER_*` block. |

---

## Files

### Created

1. `apps/opticv-be/src/load-env.ts`
2. `apps/opticv-be/src/load-env.spec.ts`
3. `apps/opticv-be/src/app/optimization/optimization-queue.config.ts`
4. `apps/opticv-be/src/app/optimization/optimization-queue.config.spec.ts`
5. `apps/opticv-be/src/app/throttler/throttler-storage.factory.ts`
6. `apps/opticv-be/src/app/throttler/throttler-storage.factory.spec.ts`

### Modified

7. `apps/opticv-be/src/main.ts`
8. `apps/opticv-be/config/validation.ts`
9. `apps/opticv-be/config/configuration.ts`
10. `apps/opticv-be/config/env/development.env`
11. `apps/opticv-be/config/env/staging.env`
12. `apps/opticv-be/config/env/production.env`
13. `apps/opticv-be/src/app/optimization/optimization.module.ts`
14. `apps/opticv-be/src/app/optimization/optimization.processor.ts`
15. `apps/opticv-be/src/app/optimization/optimization.service.ts`
16. `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`
17. `apps/opticv-be/src/app/app.module.ts`

---

## Steps

### Step 1 — Config schema and values

**`config/validation.ts`**: add the following after `BULLMQ_CONCURRENCY`:

- `BULLMQ_STALLED_INTERVAL`: `Joi.number().integer().positive().default(300000)`
- `BULLMQ_DRAIN_DELAY`: `Joi.number().integer().positive().default(60)`
- `BULLMQ_REMOVE_ON_COMPLETE_AGE`: `Joi.number().integer().positive().default(3600)`
- `BULLMQ_REMOVE_ON_COMPLETE_COUNT`: `Joi.number().integer().positive().default(100)`
- `BULLMQ_REMOVE_ON_FAIL_AGE`: `Joi.number().integer().positive().default(604800)`

Add the following after the `THROTTLER_*` group:

- `THROTTLER_STORAGE`: `Joi.string().valid('memory', 'redis').default('memory')`

**`config/configuration.ts`**:

- Extend `bullmq` with `stalledInterval`, `drainDelay`, `removeOnCompleteAge`, `removeOnCompleteCount` and `removeOnFailAge`, using the existing `parseInt(process.env.X || '<default>', 10)` pattern and the same defaults.
- Extend `throttler` with `storage: process.env.THROTTLER_STORAGE === 'redis' ? 'redis' : 'memory'`. The result is typed as the `'memory' | 'redis'` literal union, not as a loose string.

**`config/env/{development,staging,production}.env`**: add the following below `BULLMQ_CONCURRENCY=5`:

```
BULLMQ_STALLED_INTERVAL=300000
BULLMQ_DRAIN_DELAY=60
BULLMQ_REMOVE_ON_COMPLETE_AGE=3600
BULLMQ_REMOVE_ON_COMPLETE_COUNT=100
BULLMQ_REMOVE_ON_FAIL_AGE=604800
THROTTLER_STORAGE=memory
```

`THROTTLER_STORAGE` goes directly above the commented `# THROTTLER_API_IP_TTL` block. Don't touch the `REDIS_*` lines, including the commented ones in `production.env`.

### Step 2 — Early env loading

**`src/load-env.ts`** (new):

- Export a function `loadEnvFile(): void` that:
  - builds the path `${process.cwd()}/apps/opticv-be/config/env/${process.env['NODE_ENV']}.env`, identical to `ConfigModule.envFilePath` in `app.module.ts`;
  - returns without doing anything if `NODE_ENV` is unset or the file does not exist (`existsSync`);
  - otherwise calls `process.loadEnvFile(path)`, which leaves existing env vars as they are.
- Call `loadEnvFile()` at module level, so a side-effect import runs it.

**`src/main.ts`**: add `import './load-env';` as the **first** import, above `import './instrument';`.

`ConfigModule.forRoot` continues to load and validate the same file, so behaviour for everything else is unchanged.

**`src/load-env.spec.ts`** (new), with `fs.existsSync` and `process.loadEnvFile` mocked via `jest.spyOn`, and `process.env.NODE_ENV` restored after each test:

- calls `process.loadEnvFile` with the expected path when `NODE_ENV` is set and the file exists;
- does not call it when the file is missing;
- does not call it when `NODE_ENV` is unset.

### Step 3 — Optimization queue and worker option builders

**`src/app/optimization/optimization-queue.config.ts`** (new). Export:

- `OPTIMIZATION_QUEUE = 'optimization'`. This replaces the queue-name string literal in the module and decorator. Leave `@InjectQueue('optimization')` in `optimization.service.ts` as it is, because that is outside the minimal footprint.
- `buildOptimizationJobOptions(config: ConfigService): DefaultJobOptions` (type from `bullmq`), returning:
  - `attempts: 2`
  - `backoff: { type: 'exponential', delay: 2000 }`
  - `removeOnComplete: { age: config.get('bullmq.removeOnCompleteAge'), count: config.get('bullmq.removeOnCompleteCount') }`
  - `removeOnFail: { age: config.get('bullmq.removeOnFailAge') }`

  Each `config.get<number>` falls back with `??` to the spec defaults (3600 / 100 / 604800). `ConfigService.get` can return `undefined`, so these values must not be assumed non-null.
- `buildOptimizationWorkerOptions(env: NodeJS.ProcessEnv = process.env)`, returning `{ concurrency, stalledInterval, drainDelay }`. Each value is `parseInt(env['BULLMQ_…'] ?? '<default>', 10)` with defaults 5 / 300000 / 60, using the same pattern as the current `CONCURRENCY` constant. The return type is the matching `Pick` of `WorkerOptions` from `bullmq`.

**`src/app/optimization/optimization.module.ts`**: replace `BullModule.registerQueue({ name: 'optimization' })` with `BullModule.registerQueueAsync({ name: OPTIMIZATION_QUEUE, inject: [ConfigService], useFactory: (config) => ({ defaultJobOptions: buildOptimizationJobOptions(config) }) })`. `ConfigModule` is global, so no extra import is needed.

**`src/app/optimization/optimization.processor.ts`**:

- Remove the `CONCURRENCY` constant.
- Change the decorator to `@Processor(OPTIMIZATION_QUEUE, buildOptimizationWorkerOptions())`.
- Leave `process()` and the `isFinalAttempt` logic unchanged. `job.opts.attempts` still resolves to `2` through `defaultJobOptions`.

**`src/app/optimization/optimization.service.ts`**: in the three `this.queue.add('optimize', payload, { attempts: 2, backoff: … })` calls (around lines 139, 201, 294), remove the third argument. Payloads and job names stay unchanged.

**`src/app/optimization/optimization-queue.config.spec.ts`** (new):

- `buildOptimizationJobOptions`:
  - With a `ConfigService` stub returning configured values: `attempts: 2`, exponential backoff 2000, `removeOnComplete: { age, count }` and `removeOnFail: { age }` from config.
  - With a stub returning `undefined`: falls back to 3600 / 100 / 604800.
- `buildOptimizationWorkerOptions`:
  - With an explicit env object: parses `concurrency`, `stalledInterval` and `drainDelay`.
  - With an empty env object: 5 / 300000 / 60.

**`src/app/optimization/optimization.service.spec.ts`**: in the three assertions (around lines 272, 518, 793), drop the `expect.objectContaining({ attempts: 2 })` argument so that `queue.add` is expected with `('optimize', expect.objectContaining({...}))` only. No other test changes. `optimization.processor.spec.ts` stays as it is and must keep passing.

### Step 4 — Throttler storage switch

**`src/app/throttler/throttler-storage.factory.ts`** (new). Export `createThrottlerStorage(config: ConfigService): ThrottlerStorage | undefined`:

- `config.get('throttler.storage') === 'redis'` → return `new ThrottlerStorageRedisService({ host, port, password, tls })`, built from `redis.*` config exactly as in today's `app.module.ts`.
- Any other value (default `memory`) → return `undefined`, so `@nestjs/throttler` uses its built-in in-memory storage and no Redis connection is opened.

**`src/app/app.module.ts`**: in `ThrottlerModule.forRootAsync`'s `useFactory`, replace the inline `storage: new ThrottlerStorageRedisService(...)` with `storage: createThrottlerStorage(config)`. Remove the now-unused `ThrottlerStorageRedisService` import. The throttler list stays as it is.

**`src/app/throttler/throttler-storage.factory.spec.ts`** (new), with `@nest-lab/throttler-storage-redis` mocked via `jest.mock` so that no real Redis connection is opened:

- `'memory'` → returns `undefined`, and the Redis storage constructor is not called;
- `undefined` (unset) → returns `undefined`;
- `'redis'` → returns an instance of the mocked `ThrottlerStorageRedisService`, built with the host, port, password and TLS (`{}` when `redis.tls` is true, `undefined` otherwise) from config.

### Step 5 — Verification

1. `npm exec nx run-many -t lint typecheck test build -p opticv-be` passes.
2. `npm exec nx format:check` passes. Run `format:write` on the changed files if needed.
3. Local smoke test (Docker Redis, `npm run start-be:dev` + frontend):
   - Start an optimization. All sections complete and SSE updates arrive.
   - Retry a section. Reopen a finished run.
   - `redis-cli KEYS 'bull:optimization:*'`: completed job hashes disappear after `BULLMQ_REMOVE_ON_COMPLETE_AGE`. To check quickly, temporarily set the local env value to a small number such as `10`, then restore it to `3600` before committing.
   - Log or inspect once that the worker started with `stalledInterval=300000` and `drainDelay=60` from the env file. For example, temporarily change `BULLMQ_DRAIN_DELAY` in `development.env` and confirm with `redis-cli MONITOR` that the `BZPOPMIN` timeout follows it. Revert afterwards.
   - `redis-cli MONITOR` while hitting a normal API endpoint shows no throttler commands (`memory` mode).
4. Manual, outside CI:
   - Before merging and deploying, record the Upstash dashboard's daily command count for the staging/production instance for one full day.
   - After deploying, record it again for one day. It should be noticeably lower.
5. Deployment note: the new env vars all have Joi and code defaults equal to the agreed values, so the Hostinger env-var UI needs no new entries. They can optionally be added to make the values visible, and `THROTTLER_STORAGE=redis` can be set there later if the backend is scaled out.

---

## Out of scope (unchanged)

- Moving to another Redis provider or plan.
- Cleaning up jobs already stored in Redis before the deploy. Their stored options lack `removeOn*`, so they are not removed automatically. Remove them manually via the Upstash console if wanted.
- Throttler TTLs and limits, guards and the exception filter.
- `OptimizationEventBus` / SSE, quota and billing.
