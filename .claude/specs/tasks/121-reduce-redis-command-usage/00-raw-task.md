Task 121. Upstash Redis - reduce Redis command usage (BE)

**Description:**

**Problem**

Upstash Redis runs out of free-tier credits after a few days. Upstash bills per command (500K/month on the free tier), and the backend sends commands to Redis around the clock, even with no users and no jobs:

- The BullMQ worker (`@Processor('optimization')`) runs inside the Nest process and polls Redis all the time: a blocking wait for new jobs, renewed every few seconds, plus a stalled-job check on a timer. This idle polling uses most of the credits.
- `ThrottlerStorageRedisService` (`app.module.ts`) uses the same Redis instance on every API request.
- Neither the `optimization` queue (`optimization.module.ts`) nor any `queue.add(...)` call in `optimization.service.ts` sets `removeOnComplete` / `removeOnFail`, so completed and failed jobs stay in Redis forever.
- When the process restarts mid-job, the job is retried (`attempts: 2`) and can go through the stalled-job check again, which adds more commands.

Not fixed by task 119, which only changed billing and the UI spinner / Retry behaviour.

**To do**

- Add `defaultJobOptions` to `BullModule.registerQueue({ name: 'optimization' })`:
  - move `attempts: 2` and `backoff: { type: 'exponential', delay: 2000 }` there and remove them from the three `queue.add(...)` calls in `optimization.service.ts`
  - set `removeOnComplete` (e.g. keep for 1 hour / last 100 jobs)
  - set `removeOnFail` (keep longer for debugging, e.g. 3–7 days)
- Raise the worker's `stalledInterval` and `drainDelay` in the `@Processor('optimization', { ... })` options (`optimization.processor.ts`). Read them from env/config like `BULLMQ_CONCURRENCY`, add them to `config/validation.ts` and to all `config/env/*.env` files.
- Decide where the throttler stores its counters: keep Redis, or switch to in-memory storage while only one backend instance runs (at least on dev/staging).
- Update/add backend unit tests for the queue and worker options.
- Check the Upstash dashboard command count for a day before and after the change.
- Decide separately: move to a Redis plan with a flat monthly price (e.g. a small always-on instance) instead of Upstash's per-command pricing, because an idle BullMQ worker keeps polling no matter how it's tuned.

**Acceptance criteria**

- Completed and failed jobs are removed from Redis after the configured age/count.
- An idle backend (no traffic, no jobs) sends noticeably fewer commands per day than before.
- Optimization runs, retries and SSE results still work as before.