## What is docker-compose.yml file? What should I do with it? Why are we using it?

**What is docker-compose.yml?**

It's a configuration file that defines and runs Docker containers locally. Your file defines aance using the official redis:7-alpine image, exposed on port 6379.
Why do you need it?

It was added as part of Task 14 — Optimization process with BullMQ. BullMQ is a job queue library for Node.js, and BullMQ requires Redis as its backing store. Redis is where BullMQ stores the queue state, pending jobs, results, etc.

**What do you need to do with it?**

You need to run it before starting the backend when working on the optimization queue feature.d, just run:

`docker compose up -d`

This starts Redis in the background. To stop it:

`docker compose down`

**Summary**

┌────────────────┬───────────────────────────────────────────┐
│ What │ Why │
├────────────────┼───────────────────────────────────────────┤
│ redis:7-alpine │ Lightweight Redis image (~10 MB) │
├────────────────┼───────────────────────────────────────────┤
│ Port 6379 │ Default Redis port — BullMQ connects here │
├────────────────┼───────────────────────────────────────────┤
│ -d flag │ Runs in detached (background) mode │
└────────────────┴───────────────────────────────────────────┘

You don't need Redis for anything else in the app right now — it's purely for the BullMQ job queue that will drive the CV optimization process. When you eventually deploy, you'd replace this local Redis with a managed Redis service (e.g., Upstash, Redis Cloud).

---

## What is optimization-event-bus.ts doing? Why do we need it? Explain to me what is happenig the

**What OptimizationEventBus does**

It's a in-process message bus — a thin wrapper around Node.js's built-in EventEmitter. Its jobckend (the queue processor) notify another part (the HTTP controller) that something finished,without them directly calling each other.

---

**Why it's needed — the problem it solves**

The optimization runs 7 AI jobs in parallel via BullMQ. The frontend needs to know when each one finishes so it can update a progress UI. The challenge is:

- The BullMQ processor (optimization.processor.ts) runs jobs in the background — it has no reference to any HTTP response.
- The controller (optimization.controller.ts) holds the open HTTP connection to the frontend (via SSE — Server-Sent Events).

These two are completely separate classes. The event bus is the bridge between them.

---

**The full data flow**

Frontend Controller EventBus Processor (BullMQ)
| | | |
|-- POST /run ------------->| | |
|<-- 202 { runId } ---------| | |
| | 7 jobs enqueued |
|-- GET /stream ----------->| | |
| (SSE connection) |-- subscribe(runId) ----->| |
| | | |
| | |<-- job 1 finishes -----|
| | | emit(runId, event) |
|<-- event: job-complete ---|<-- handler called --------| |
| | |<-- job 2 finishes -----|
|<-- event: job-complete ---| | |
| ... x7 ... | | |
|<-- event: run-complete ---|-- unsubscribe() -------->| |
| (SSE closes) | | |

---

**The three pieces working together**

┌────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ File │ Role │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ optimization-event-bus.ts │ The message broker. Holds event listeners keyed by runId. │
├────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ optimization.processor.ts │ After each AI job finishes, calls eventBus.emit(runId, event) to announce the result. │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ optimization.controller.ts │ Subscribes to the event bus for a given runId, and forwards eache SSE connection. │
└────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

**Key details**

- run:${runId} — each optimization run gets its own event channel, so multiple users running optimizations simultaneously don't interfere.
- setMaxListeners(50) — by default Node warns if >10 listeners are on one emitter. This raises the cap to support concurrent SSE connections.
- subscribe() returns an unsubscribe function — the controller calls it when all 7 jobs are donnects (req.on('close', ...)), to avoid memory leaks.

---

### Shouldn't we use Redis for this?

Good question. The short answer is: for your current setup, no — but it's a valid concern worth understanding.

Why the current approach is fine

Your backend runs as a single NestJS process. The OptimizationEventBus lives in memory inside that process. The BullMQ processor also runs inside the same process. So when the processor calls eventBus.emit(), the controller's handler is right there in the same memory space — it works perfectly.

When you would need Redis for this

If you ever scaled to multiple backend instances (e.g., 3 pods in Kubernetes), you'd have a problem:

- The POST /run request hits instance A, which enqueues the jobs and opens the SSE connection, subscribing to the in-memory event bus on instance A.
- BullMQ picks up a job on instance B and calls eventBus.emit() — but that's the event bus on hears it.
- The frontend's SSE connection hangs forever.

In that case you'd replace OptimizationEventBus with a Redis Pub/Sub channel, so all instancesm. Redis is already in your stack (for BullMQ), so it would be a natural fit.

Summary

```
┌────────────────────────────┬─────────────────┬───────────────┐
│ Scenario │ In-memory bus │ Redis Pub/Sub │
├────────────────────────────┼─────────────────┼───────────────┤
│ Single backend process │ Works perfectly │ Overkill │
├────────────────────────────┼─────────────────┼───────────────┤
│ Multiple backend instances │ Breaks │ Required │
└────────────────────────────┴─────────────────┴───────────────┘
```

Since you're a solo project at an early stage with a single backend process, the current implementation is the right call — simpler, no extra round-trips, no added failure surface. You'd only revisit this if you scaled horizontally.

---

## When would I need multiple backend instances?

When your app gets enough traffic that one server can't handle it all — you're nowhere near that yet.

Concretely, you'd think about it when:

- CPU is maxed out — your AI jobs are the most likely culprit here, since they're network-bound (waiting on OpenAI) not CPU-bound, so one instance handles a lot of concurrent jobs just fine via async/await.
- Memory pressure — one instance runs out of RAM under load.
- High availability — you want zero downtime during deploys or if one instance crashes (this is the most realistic early reason, not traffic).

Realistic timeline for your app

For a CV optimization SaaS, you'd probably have hundreds to low thousands of users before needing a second instance. A single NestJS process on a modest VPS (2 vCPU, 2GB RAM) can comfortably handle that. The OpenAI API is your actual bottleneck, not your server.

The first scaling move you'd make isn't even multiple instances — it's upgrading the VPS (vertling (multiple instances) comes much later and brings its own complexity (sticky sessions,shared state, load balancers).

Don't worry about this now. Ship the feature, get users, let real traffic tell you what to fix.

---

## Could you explane what is happening in optimization.service.ts?

**Here's what happens step by step:**

triggerOptimization() — the main method

This is called when the frontend hits POST /optimizations/job-applications/:id/run.

**Step 1 — Fetch and validate (lines 27–43)**

Loads the job application from the database (including the linked CV document) and checks three things:

- The job application exists and belongs to the current user — throws 403 if not
- The CV has already been parsed (parseStatus === 'COMPLETED') — throws 400 if not, because there's nothing to optimize yet
- A job description was actually provided — throws 400 if empty

**Step 2 — Generate a runId (line 44)**

Creates a unique ID for this specific optimization run. This is what ties the 7 background jobs together and is what the frontend uses to open the SSE stream (GET /stream?runId=...).

**Step 3 — Reset/create result rows in DB (lines 55–76)**

For each of the 7 prompt types, does an upsert into the OptimizationResult table:

- If no row exists yet → creates one with status: PENDING
- If a row already exists (user is re-running) → resets it back to PENDING, clearing any previous output

This is important — it means the user can re-run an optimization and get fresh results.

**Step 4 — Enqueue 7 BullMQ jobs (lines 78–86)**

Adds one job per prompt type to the optimization queue. Each job carries:

- The runId (so the processor can emit the right event when done)
- The CV text and structured data
- The job description
- Which promptType this job handles

Each job is configured with 2 attempts and exponential backoff (2s, 4s) — so if OpenAI fails transiently, it retries automatically.

**Step 5 — Returns { runId } (line 88)**

The frontend receives this immediately (HTTP 202 Accepted), then uses the runId to open the SSE stream and listen for the 7 jobs completing.

---

assertOwnership() — the small helper (lines 91–99)

**The overall picture**

triggerOptimization():

- validate (owned? parsed? has job description?)
- generate runId
- upsert 7 DB rows → PENDING
- enqueue 7 BullMQ jobs
- return { runId } ← frontend opens SSE with this

The service itself finishes in milliseconds. All the heavy AI work happens asynchronously in the processor.

---

## Can you explain optimization.processor.ts?

`OptimizationProcessor` is a **BullMQ worker**. BullMQ pulls jobs off the Redis queue one by one and hands each one to the `process()` method. The `@Processor('optimization')` decorator tells BullMQ which queue to listen to.

---

### `process()` — the single method

**Step 1 — Mark job as PROCESSING in DB**

The moment BullMQ hands the job over, it immediately updates the `OptimizationResult` row in the database to `PROCESSING`. This way the DB always reflects what's actually happening — useful if you ever want to show a live status to the user.

**Step 2 — Fetch the active prompt template**

Calls `promptService.getActivePrompt(promptType)` to load the prompt template for this specific prompt type from the database. The template contains:

- `systemPrompt` — instructions for the AI
- `userPromptTemplate` — a template with placeholders to fill in
- `outputSchema` — whether to expect JSON back or plain text
- `modelPreference` — which OpenAI model to use (falls back to `gpt-4o-mini` if not set)

**Step 3 — Build the user prompt**

Fills in the placeholders in `userPromptTemplate` with the actual data from the job payload — the CV text, parsed sections JSON, and job description. The `targetRole`, `seniority`, `industry` etc. are empty strings for now (future fields).

**Step 4 — Call OpenAI**

Sends the system prompt + built user prompt to OpenAI. The `useJsonFormat` flag tells OpenAI whether to respond in JSON mode or plain text — determined by whether the prompt version has an `outputSchema` defined.

**Step 5 — Save the result to DB**

Parses the response depending on format:

- JSON response → stored in `structuredOutput`
- Plain text response → stored in `textOutput`

Also saves token counts (`inputTokens`, `outputTokens`) for usage tracking, and marks the row `COMPLETED`.

**Step 6 — Emit the event**

Calls `eventBus.emit(runId, event)` — this is the signal that wakes up the controller's SSE handler and pushes a `job-complete` event to the browser.

---

### The `catch` block — failure path

If anything throws (OpenAI error, DB error, JSON parse failure):

- Logs the error
- Updates the DB row to `FAILED` with the error message
- **Still emits the event** to the event bus with `status: 'failed'` — so the frontend isn't left hanging, it gets notified of the failure too
- Re-throws the error so BullMQ knows the job failed and can retry (up to 2 attempts with exponential backoff, as configured in the service)

---

### The full flow for one job

```
BullMQ dequeues job
  └── process(job)
        ├── DB row → PROCESSING
        ├── fetch prompt template from DB
        ├── build user prompt (fill in CV + job description)
        ├── call OpenAI API  ← the slow part (~2-10s)
        │     ├── success
        │     │     ├── DB row → COMPLETED (save result + tokens)
        │     │     └── eventBus.emit → SSE → browser
        │     └── failure
        │           ├── DB row → FAILED (save error message)
        │           ├── eventBus.emit → SSE → browser (status: failed)
        │           └── throw → BullMQ retries up to 2x
```

Since 7 jobs are enqueued simultaneously, 7 instances of this `process()` method run concurrently — each handling a different `promptType`, all racing to finish and emit their events.

---

## Explain optimization.controller.ts

The controller exposes two endpoints, both protected by `SupabaseGuard` (authenticated users only).

---

### `POST /api/optimizations/job-applications/:jobApplicationId/run`

Kicks off the optimization process. It delegates straight to `optimizationService.triggerOptimization()` and returns `{ runId }` with HTTP **202 Accepted** — meaning "I've received your request and started working on it, but it's not done yet." The actual AI work happens asynchronously in the background.

This is the first call the frontend makes. It gets back the `runId` and immediately uses it to open the SSE stream.

---

### `GET /api/optimizations/job-applications/:jobApplicationId/stream?runId=...`

Opens a long-lived **Server-Sent Events (SSE)** connection that streams progress back to the browser as each of the 7 AI jobs finishes.

**Step 1 — Verify ownership**

Calls `assertOwnership()` to make sure the job application belongs to the requesting user before opening the connection. Throws `403` if not.

**Step 2 — Set SSE headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

Then calls `res.flushHeaders()` to send the headers immediately — this is what tells the browser "this is an SSE stream, start listening." The connection stays open from this point.

**Step 3 — Subscribe to the event bus**

Subscribes to `eventBus` for the given `runId`. Every time a BullMQ job finishes (success or failure), the processor emits an event here, and the handler fires.

**Step 4 — Forward each event to the browser**

Each event is written to the response in SSE format:

```
event: job-complete
data: {"promptType":"...","status":"completed","result":{...}}
```

A counter (`resolved`) tracks how many of the 7 jobs have reported back.

**Step 5 — Close when all 7 are done**

When `resolved === 7`, it writes a final `run-complete` event with a timestamp, then unsubscribes from the event bus and closes the response with `res.end()`.

**Step 6 — Handle browser disconnect**

If the user closes the browser tab or navigates away before all jobs finish, `req.on('close', ...)` fires and calls `unsubscribe()` — cleaning up the event listener so it doesn't leak memory.

---

### The two-request pattern

```
Frontend
  │
  ├── POST /run  →  gets { runId }  (instant, ~100ms)
  │
  └── GET /stream?runId=...  →  stays open, receives events as jobs finish
        ├── event: job-complete  (promptType: SUMMARY, status: completed)
        ├── event: job-complete  (promptType: SKILLS, status: completed)
        │   ... x7 total ...
        └── event: run-complete  { completedAt: "..." }  → connection closes
```

This pattern (trigger + stream separately) is intentional — it means the frontend can reconnect to the stream if the connection drops, as long as it still has the `runId`.

---
