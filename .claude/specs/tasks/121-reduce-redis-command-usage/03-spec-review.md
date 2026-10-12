# Specification Review — Task 121: Upstash Redis - reduce Redis command usage (BE)

Reviewed: `02-spec.md` against `00-raw-task.md`.

The review checked these technical claims in the spec against the installed code:

- `bullmq@5.76.10` defaults are `drainDelay: 5` (seconds) and `stalledInterval: 30000` (ms), and `drainDelay` sets the `bzpopmin` timeout on the marker key. The block is capped at 10 s only while delayed jobs are waiting.
- `@nestjs/bullmq` builds worker options only from `@Processor` decorator metadata plus the queue's connection, prefix and telemetry. This confirms the env-loading constraint described in Edge Cases.
- `optimization.service.spec.ts` asserts `objectContaining({ attempts: 2 })` at lines 272, 518 and 793.

### Summary

- Overall assessment: **PASS WITH ISSUES**
- Justification: The spec covers every "To do" item and acceptance criterion in the raw task, and its technical claims match the installed library code. It also flags a real loading problem: decorator-time `process.env` reads ignore values that exist only in the env file. The issues are about traceability and testability. The env flag and the env-configurable retention come from clarification answers, but the spec doesn't record that. Two test requirements also assume factories can be tested without saying how, and the fix for the env-loading problem is left to the plan without a clear choice. None of these blocks implementation, but they should be cleared up before planning.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Clarification decisions are not recorded.** The `THROTTLER_STORAGE` flag, the configurable retention values (`BULLMQ_REMOVE_ON_*`) and the chosen polling values (5 min / 60 s) were agreed during clarification, but the spec has no "Clarifications" or "Decisions" section saying so. A reader comparing it with the raw task can't tell these are agreed decisions rather than invented ones (Scope, Behavior §1, §4).
2. **How to test inline factories is not specified.** Acceptance (DEV) asks for tests of the throttler storage factory (memory vs redis) and of the queue's `defaultJobOptions`, both built from config. Today the throttler `useFactory` is inline in `app.module.ts`, and the queue registration would be inline in `optimization.module.ts`. The spec doesn't say whether these factories should be pulled out into testable functions or tested by bootstrapping the module. That leaves the plan to decide something with a structural impact (Behavior §2, §4, Acceptance).
3. **The env-loading fix is left open.** Edge Cases correctly finds that `@Processor` options are evaluated before `ConfigModule` loads the env file. It then leaves the fix open ("loading the env file before `AppModule` is imported, or another clean approach"). Its effect on `BULLMQ_CONCURRENCY` is also optional ("acceptable" if fixed, "not required" otherwise). One of the task's goals is that these values are configurable from env, so how this gets solved decides whether that goal is met. It should be a firm requirement with a clear decision point in the plan (Edge Cases, first bullet, and Out of scope).
4. **Joi strictness is unclear.** Behavior §1 says the numeric vars use `Joi.number()` with defaults "(positive integers)". The existing schema uses plain `Joi.number()`, so it's unclear whether `.integer().positive()` should be added. BullMQ itself throws when `stalledInterval`/`drainDelay` are ≤ 0, so this matters for where startup errors show up.
5. **Delayed-job behaviour is not mentioned.** Behavior §3 says a longer `drainDelay` cuts idle blocking calls. It doesn't mention that BullMQ caps the block at 10 s while delayed jobs exist, which includes retries waiting on exponential backoff. Idle savings are therefore lower while a retry is pending. This is minor and transient, and it doesn't change requirements.
6. **Manual verification depends on a baseline that may not be captured.** Behavior §5 needs a "before" daily command count, which has to be recorded before deploying. The spec doesn't say who records it or when, relative to merge and deploy.

#### Unclear or Ambiguous Sections

- **Edge Cases, "Worker options must actually come from the env file":** "another clean approach" is open-ended. The acceptable options aren't listed.
- **Out of scope, "Fixing how `BULLMQ_CONCURRENCY` itself is loaded":** this conflicts in spirit with the Edge Cases bullet, which says fixing it is acceptable. It's unclear whether a change that also affects concurrency is in scope or out.
- **Behavior §1, "Value in all `*.env` files":** it's unclear whether the new lines should be active (uncommented) in every env file, given that the existing `THROTTLER_*` lines are commented out. The text says "uncommented", but the existing commented-out `THROTTLER_*` block makes the convention inconsistent.
- **Acceptance (DEV), "can be verified locally with Docker Redis using short values":** this doesn't say whether it's a required manual step or optional guidance.
- **Acceptance, "noticeably lower":** this is inherited from the raw task, but no threshold or target is given, so it's a judgement call.

#### Invented or Unsupported Requirements

None that aren't grounded in the task or in clarification answers. The items below are not in the raw task text. They are supported by the clarification answers, but the spec doesn't trace them (see Non-Critical Issue 1):

- `THROTTLER_STORAGE` env flag with default `memory` (the raw task only says "decide where the throttler stores its counters").
- Env-configurable `removeOnComplete` / `removeOnFail` (the raw task gives example values only).
- The specific values: 5 min, 60 s, 1 h / 100, 7 days.

### Assumptions Detected

| # | Assumption | Explicitly stated? |
| --- | --- | --- |
| 1 | Production runs exactly one `opticv-be` process on Hostinger | Yes (Assumptions) |
| 2 | Upstash accepts blocking commands with a 60 s timeout | Yes (Assumptions) |
| 3 | `attempts` and `backoff` stay hard-coded; only retention and polling values are configurable | Yes (Assumptions) |
| 4 | No other code path reads `job.opts` beyond `attempts` | Yes (Assumptions) |
| 5 | BullMQ merges `defaultJobOptions` into `job.opts`, so `job.opts.attempts` is still `2` in the processor | Stated in Behavior §2 as fact, not listed under Assumptions |
| 6 | BullMQ v5's marker key wakes an idle worker immediately when a job is added, so a longer `drainDelay` adds no latency | Stated in Behavior §3 as fact, not listed under Assumptions (consistent with the installed `bullmq@5.76.10`) |
| 7 | Idle worker polling and per-request throttler calls are the main sources of Redis commands, so tuning them will noticeably cut usage | Implicit, taken from the raw task's problem statement, not listed |
| 8 | `QueueEvents` or other extra BullMQ connections are not used, so there's no other idle polling source | Implicit, not stated |
| 9 | Restarting the in-memory throttler (counter reset) is acceptable because `QuotaModule` enforces AI usage limits in the DB | Stated in Edge Cases, not listed under Assumptions |
| 10 | Production env vars come only from `config/env/production.env`, not from Hostinger panel env vars. This is why the decorator-time read problem matters in production. | Implicit, not stated |
| 11 | Jobs already in Redis before the deploy are left in place, with optional manual cleanup | Stated in Edge Cases / Out of scope |

### Recommendation

- **Revise specification**, with minor revisions before running `/plan`:
  1. Add a short "Clarifications / Decisions" section that records the agreed throttler flag, retention configurability and chosen values.
  2. Make the env-loading fix for `@Processor` options a firm requirement, and settle whether `BULLMQ_CONCURRENCY` is in scope.
  3. Say how the queue and throttler factories should be made testable, or leave this explicitly to the plan as a named decision.
  4. Move the implicit assumptions (#5–#10) into the Assumptions section.
