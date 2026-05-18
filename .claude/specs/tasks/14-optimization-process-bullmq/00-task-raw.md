Task 14: Optmization process, BullMQ

Description:
The Core User Flow of Cv optmimization:
Design the main optimization screen as a single-page wizard with collapsible sections — not 7 separate pages. Users want to see everything at once.
┌─────────────────────────────────────────────────────────┐
│  [Resume.pdf]  →  [Job Description Pasted]   [⟳ Re-run] │
├─────────────────────────────────────────────────────────┤
│  ATS Match Score: 47%  →  Predicted: 89% after fixes    │
├─────────────────────────────────────────────────────────┤
│  ▼ ATS Autopsy (12 issues found)                        │
│    🔴 Critical: Missing keywords [Python, AWS, Docker]  │
│    🟡 High: Vague achievements in bullets 2-4           │
│    ...                                                   │
├─────────────────────────────────────────────────────────┤
│  ▼ Keyword Gap Analysis                                 │
│    Missing: [Python] [AWS] [Kubernetes] [+ Add to CV]   │
├─────────────────────────────────────────────────────────┤
│  ▼ Rewritten Summary                    [Original|New]  │
├─────────────────────────────────────────────────────────┤
│  ▼ Bullet Upgrades (8 rewrites)         [Apply All]     │
├─────────────────────────────────────────────────────────┤
│  ▼ Cover Letter                                         │
│  ▼ Interview Prep (10 Q&A)                              │
│  ▼ LinkedIn Updates                                     │
├─────────────────────────────────────────────────────────┤
│           [Download PDF]  [Download DOCX]               │
└─────────────────────────────────────────────────────────┘
Each section runs in parallel as separate BullMQ jobs and streams in independently. The UI feels alive even though total processing is 30-60 seconds.

The architecture:
1. User submits CV + job description → backend creates a parent job with 7 child jobs queued in BullMQ
2. Each worker calls OpenAI and emits results via SSE (Server-Sent Events) back to the frontend as jobs complete
3. Frontend sections render progressively — ATS score might appear in 5s, Cover Letter in 25s
4. Each section shows a skeleton/spinner until its job resolves

I need to implement this. For now just focus on backend implementation, frontend will be implented in next task.
