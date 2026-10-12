# Code Review — Task 121: Upstash Redis - reduce Redis command usage (BE)

Reviewed commit `d077ff2` (`git diff HEAD~1 HEAD`) against `02-spec.md` and `04-implementation-plan.md`.

Source files reviewed:

- `apps/opticv-be/config/{configuration,validation}.ts`
- `apps/opticv-be/config/env/.env.example`
- `apps/opticv-be/src/main.ts`
- `apps/opticv-be/src/load-env{,.spec}.ts`
- `apps/opticv-be/src/app/app.module.ts`
- `apps/opticv-be/src/app/optimization/optimization-queue.config{,.spec}.ts`
- `apps/opticv-be/src/app/optimization/optimization.{module,processor,service,service.spec}.ts`
- `apps/opticv-be/src/app/throttler/throttler-storage.factory{,.spec}.ts`
- `docs/tasks-list.md`

These were also checked against the installed libraries:

- `@nestjs/throttler`'s storage provider falls back to `ThrottlerStorageService` (in-memory) when `options.storage` is falsy, so returning `undefined` is correct.
- `@nestjs/bullmq` builds worker options only from `@Processor` metadata.
- `process.loadEnvFile` does not overwrite variables that are already set (checked on Node 22.16).

### Summary

- **Overall result: PASS WITH ISSUES**
- **Justification:** Every functional requirement in the spec is implemented as planned. Lint (0 errors), typecheck, all 310 tests and the build pass. The throttler falls back to in-memory storage correctly, and job retries still work because `job.opts.attempts` is still 2. No issue blocks merging. The remaining issues are maintainability ones: the same default values are written in three places, three config keys are never read, empty env values are handled differently in two places, and the plan's manual smoke test and Redis-key check haven't been done yet.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. **Empty env values are handled differently in two places.**
   - `apps/opticv-be/src/app/optimization/optimization-queue.config.ts:26-28` parses with `parseInt(env['X'] ?? '<default>', 10)`.
   - `apps/opticv-be/config/configuration.ts:29-46` uses `parseInt(process.env.X || '<default>', 10)`.

   For a set-but-empty value (`BULLMQ_DRAIN_DELAY=`), the worker builder produces `NaN`, while `configuration.ts` falls back to the default. In practice Joi (`Joi.number()`) rejects `''` and the app fails to boot before the worker starts, so this has no runtime effect today. The two parsing styles are still inconsistent. This follows the plan, which copied the old `CONCURRENCY` constant's `??` pattern.
2. **The new spec file uses a different import style from its neighbours.** `apps/opticv-be/src/app/throttler/throttler-storage.factory.spec.ts:3` imports `./throttler-storage.factory` without `.js`. That matches the other files in `throttler/` (`api-throttler.guard.spec.ts`). `load-env.spec.ts:15`, however, needed `./load-env.js` for the dynamic import because typecheck flagged it. This is consistent with each folder, but the spread of styles is worth knowing about. No change needed.
3. **The comment in `apps/opticv-be/src/load-env.ts:3-5` is three lines long.** It explains a non-obvious ordering constraint, which justifies it under "match surrounding comment density". It is still the only block comment among the new files. Acceptable.

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `defaultJobOptions` on `optimization` queue: `attempts: 2`, exponential backoff 2000 | Covered | `optimization-queue.config.ts:9-11`, wired via `registerQueueAsync` in `optimization.module.ts:19-25` |
| `removeOnComplete { age, count }` from env (1 h / 100) | Covered | `optimization-queue.config.ts:12-15` |
| `removeOnFail { age }` from env (7 days) | Covered | `optimization-queue.config.ts:16-18` |
| Remove per-call options from the three `queue.add` calls | Covered | `optimization.service.ts` (~139, ~200, ~289). Job name and payloads unchanged. |
| Worker `stalledInterval` / `drainDelay` from env (300000 ms / 60 s) | Covered | `optimization.processor.ts:19` → `buildOptimizationWorkerOptions()` |
| Env-file values actually reach `@Processor` options | Covered | `load-env.ts` imported first in `main.ts:5`. Existing env vars keep precedence, and a missing file does nothing. |
| `THROTTLER_STORAGE` flag (`memory` \| `redis`, default `memory`) | Covered | `validation.ts`, `configuration.ts:64-67`, `throttler-storage.factory.ts`, `app.module.ts:47` |
| New vars in `validation.ts` (`integer().positive()`) | Covered | `validation.ts:23-33, 47` |
| New vars in `configuration.ts` | Covered | Retention keys and `throttler.storage` are used. See Code Smells #2 for the unused `stalledInterval`/`drainDelay` keys. |
| New vars in all `config/env/*.env` files | Covered (local only) | The env files are gitignored, so they aren't in the commit. The tracked template `.env.example` is updated. |
| Unit tests: queue `defaultJobOptions` | Covered | `optimization-queue.config.spec.ts:10-32`, including fallbacks |
| Unit tests: worker options incl. fallback defaults | Partial | The builder is tested (`optimization-queue.config.spec.ts:34-51`). Nothing checks that the `@Processor` decorator actually receives these options. The spec only gave reading decorator metadata as an example, not a requirement. |
| Unit tests: throttler storage memory vs redis | Covered | `throttler-storage.factory.spec.ts`, including the TLS on/off cases |
| Updated `queue.add` assertions in service spec | Covered | Three `objectContaining({ attempts: 2 })` arguments removed |
| Existing processor retry tests unchanged and passing | Covered | `optimization.processor.spec.ts` untouched, and the suite passes |
| Build, lint, typecheck and tests pass | Covered | Verified during implementation. The 5 lint warnings are in files outside this task. |
| Completed and failed jobs removed after the configured age/count (runtime) | Not yet verified | Needs the local check with Docker Redis (plan Step 5.3) |
| Runs, retries and SSE behave as before (manual smoke test) | Not yet verified | Plan Step 5.3 not done yet |
| Upstash daily command count lower than before (manual) | Not yet verified | Post-deploy check (plan Step 5.4) |

### Plan Deviations

1. **`.env.example` updated.** Not in the plan's file list. It was added at the user's request, and it's the tracked template that matches the gitignored env files.
2. **`load-env.spec.ts` mocks `fs` with `jest.mock('fs', …)`** and a `jest.requireActual` spread. The plan said `jest.spyOn` on `fs.existsSync`. The behaviour tested is the same.
3. **`docs/tasks-list.md` is in the same commit.** It is the task description (replacing an earlier free-form note about Upstash with the task 121 entry), not code. It isn't in the plan, but it is related to the task.
4. **Plan Step 5.3/5.4 (local smoke test, Redis key and `MONITOR` checks, Upstash before/after) has not been done yet.**

### Null Safety Issues

None.

- `buildOptimizationJobOptions` guards every `config.get<number>` with `??`.
- `createThrottlerStorage` passes `config.get('redis.host')` (typed `string | undefined`) directly to `ThrottlerStorageRedisService`. That is the same as the code it replaced, and `REDIS_HOST` is `required()` in Joi, so this is not a new risk.
- `loadEnvFile` checks `NODE_ENV` before using it.

### Code Smells

1. **Each default value is written in three places.** The values `300000`, `60`, `3600`, `100` and `604800` each appear in:
   - `config/validation.ts:23-33`
   - `config/configuration.ts:30-46`
   - `src/app/optimization/optimization-queue.config.ts:13-17, 27-28`

   The worker defaults (`5`, `300000`, `60`) are repeated again in `buildOptimizationWorkerOptions`. Changing a default means editing up to three files that must stay in sync. This follows the existing pattern for `BULLMQ_CONCURRENCY` and the `THROTTLER_*` values, which also repeat their defaults, so it is consistent with the codebase. It is still the main maintenance cost of this change.
2. **Three config keys are never read.** `config/configuration.ts:29-34` defines `bullmq.concurrency` (existing), `bullmq.stalledInterval` and `bullmq.drainDelay`, but nothing in `src/` reads them. The worker reads `process.env` directly through `buildOptimizationWorkerOptions` because of the decorator timing constraint. The keys were added on purpose, as Plan Step 1 required, but they are dead config and could mislead someone into thinking the worker reads them from `ConfigService`.
3. **The env-file path is written in two places.** `${process.cwd()}/apps/opticv-be/config/env/${NODE_ENV}.env` appears in both `app.module.ts:29` (`ConfigModule.envFilePath`) and `load-env.ts:12`. If one changes and the other doesn't, the worker and `ConfigModule` would silently read different files.
4. **The queue name is only partly centralised.** `OPTIMIZATION_QUEUE` replaces the literal in the module and processor, but `@InjectQueue('optimization')` in `optimization.service.ts:44` still uses the string. The plan deliberately left this alone to keep the change small.

### Recommendation

- **Merge as-is**, after the manual verification in plan Step 5.3:
  - a smoke test of runs, retries and SSE;
  - a check that finished jobs expire from `bull:optimization:*`.

  Record the Upstash baseline (Step 5.4) before deploying. Code Smells #1–#3 are optional follow-ups and don't block the merge.
