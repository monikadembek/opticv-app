Task 119: Billing Bug: one logical run costs four credits instead of one. A FREE user can never complete a single optimization.

UI Bug: a failed or never-arriving job leaves the card spinning with no error shown.

Description:

The problem

cv-optimization.ts:846 loops over every active prompt type and calls the single-job endpoint once per prompt — four separate HTTP calls. The bulk /run endpoint exists but the UI never uses it.

Every one of those four calls independently runs the quota check (optimization.service.ts:159), and all four map to the same feature, CV_OPTIMIZATION. Your FREE tier allows 1. So:

- Call 1 (RESUME_AUTOPSY) → takes the 1 credit → 202 Accepted, job queued
- Call 2 (KEYWORD_GAP) → no credit left → 403 QUOTA_EXCEEDED
- Call 3 (SUMMARY_REWRITE) → cancelled, because in RxJS a single error tears down the whole stream

That's exactly the pattern you saw. The quota isn't broken — one run is being billed four times.

The stuck spinner is a second, separate bug. runOptimization only sets isProcessing = false when a completion event arrives (:878). The error handler at :884 just logs. So RESUME_AUTOPSY — whose request actually succeeded — spins forever if its result never arrives, and the three that failed never get their spinners cleared either.

So there are two real bugs:

1. Billing: one logical run costs four credits instead of one. A FREE user can never complete a single optimization.
2. UI: a failed or never-arriving job leaves the card spinning with no error shown.

How to fix it

For the billing bug, the clean fix is to make the frontend call the bulk endpoint /run, which already charges once and queues all four jobs (optimization.service.ts:85-132). That's what it was built for. You'd rework runOptimization to make one call, then open one SSE stream on the returned runId for all four results.

The alternative — charge only on the first prompt type server-side — would keep the frontend as-is but bolts special-case logic onto the quota service. I'd go with the bulk endpoint.

For the UI bug, the error handler needs to clear isProcessing for the affected prompt type and surface the message, so quota errors show as "you're out of credits" instead of an eternal spinner.