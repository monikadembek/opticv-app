# Plan vs. Implementation: AI Layer (Phase 3)

Comparison of the Opus-model architecture plan against the current backend implementation.

---

## 3.1 Claude Service Abstraction → OpenAI Service

| Plan                                          | Implemented                                                  | Gap                                                               |
| --------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Uses **Anthropic/Claude** SDK                 | Uses **OpenAI** SDK                                          | Different AI provider — functionality equivalent but not the plan |
| `generateStreaming()` with per-chunk callback | `generateCompletion()` — no streaming, returns full response | Streaming to frontend is simulated via SSE after job completes    |
| `generateStructured()` using Claude tool use  | JSON mode via `response_format: { type: 'json_object' }`     | Functionally similar but different mechanism                      |
| Usage logging called inside every AI request  | `UsageLog` model exists in schema but not populated          | Usage tracking is incomplete                                      |

The plan called for real-time token streaming (AI response chunks → SSE). The implementation batches the full AI response and sends one event when done.

---

## 3.2 Prompt Versioning

**Implemented correctly.** `PromptVersion` model with `isActive`, `version`, `systemPrompt`, `userPromptTemplate`, `modelPreference`, `outputSchema`, `maxTokens` — matches the plan very closely.

---

## 3.3 Refined Prompts

Not yet seeded. The schema and service to fetch/render prompts exist, but the actual prompt content (e.g. the ATS Autopsy production prompt from the plan) isn't in the database yet.

---

## 3.4 Async Processing with BullMQ

Core pattern implemented and matches the plan well.

| Plan                                                                            | Implemented                                              | Gap                                                                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `@Processor('optimizations')` + `@Process('run-prompt')`                        | `@Processor('optimization')` + `@Process('optimize')`    | Same pattern, different naming                                                          |
| Redis pub/sub for streaming chunks                                              | In-memory `EventEmitter` EventBus                        | Redis pub/sub works across multiple Node instances; EventEmitter is single-process only |
| Single job per promptType triggered manually                                    | All 7 jobs triggered in one `triggerOptimization()` call | Matches intent                                                                          |
| Stores `promptVersion`, `rawOutput`, `inputTokens`, `outputTokens`, `costCents` | Stores all except `costCents`                            | Cost calculation not implemented                                                        |

---

## 3.5 Streaming to Frontend (SSE)

| Plan                                                 | Implemented                                                            | Gap                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| SSE endpoint subscribes to Redis pub/sub channel     | SSE endpoint subscribes to in-memory EventBus                          | Works but won't scale horizontally                                      |
| Events fire **per chunk** (real-time text streaming) | Events fire **per completed job** (7 events total, one per promptType) | No real-time text streaming — user waits for full AI response           |
| `@Sse()` decorator with `Observable<MessageEvent>`   | Manual `res.write()` with SSE headers                                  | Both valid; plan used NestJS built-in, implementation uses raw response |

---

## Summary of Key Gaps

1. **AI Provider**: Plan assumed Claude/Anthropic; implemented with OpenAI. Functionally equivalent for now.
2. **No real-time text streaming**: The plan streams individual tokens as they arrive from the AI. Current implementation waits for the full response then emits one event. Users see a spinner until the job completes rather than watching text appear progressively.
3. **Usage logging not wired up**: `UsageLog` table exists in schema but no code writes to it.
4. **Cost calculation not implemented**: `costCents` / `costUsd` field not populated.
5. **In-memory EventBus vs Redis pub/sub**: The plan's Redis pub/sub works across multiple server instances; the EventEmitter breaks if you ever run more than one backend process.
6. **Prompts not seeded**: The prompt content from the plan (e.g. the production ATS Autopsy prompt) isn't in the database.

The core architecture — BullMQ async jobs, prompt versioning, SSE, structured output — is solid and aligns with the plan's intent. The gaps are mostly around real-time streaming UX, observability (usage/cost), and production readiness.

---

## Would it be better to run Single job per promptType triggered manually or the current implementatio where all 7 jobs triggered in one triggerOptimization() call?

For this use case, all 7 triggered together is the right call.

The "triggered manually" approach from the plan was likely written with a more granular UI in mind — where a user picks which analyses to run one at a time. If you ever want that (e.g. "just re-run the keyword gap analysis"), you'd need per-promptType triggering anyway.

But for the current flow where the user clicks "Optimize my CV" and expects a full report, triggering all 7 at once is correct — it's simpler, the jobs run in parallel, and the SSE stream naturally signals completion per-job as they finish.

The one thing worth adding eventually: a way to re-trigger a single failed job without re-running all 7. Right now if one job fails, you'd have to retry the whole run.
