# Spec Review: 74-bug-invalid-parsed-pdf-text

### Summary

- Overall assessment: **PASS WITH ISSUES**
- The specification is well-grounded in the original task and discussed plan, and verification against the current codebase confirms all cited file paths, method signatures, module wiring, and constants are accurate. It correctly scopes the fix to PDFs only, leaves DOCX untouched, and defines clear edge-case and error-handling behavior. It has two model-choice gaps inherited unchanged from the raw task's plan (undocumented `gpt-4o` cost/latency tradeoff, and no fallback if the Responses API `input_file` shape differs from assumption) and one internal inconsistency around the `CvExtractionService` guard changes that should be clarified before implementation.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Model switch to `gpt-4o` is asserted, not justified.** The spec (Scope, Data/API) states the PDF path switches from `gpt-4o-mini` to `gpt-4o` "per clarification — `gpt-4o-mini` reliability for file/PDF input via the Responses API was not confirmed." This is a reasonable engineering decision, but the spec doesn't note the cost/latency implication (gpt-4o is materially more expensive per token than gpt-4o-mini) or specify whether this should be a hardcoded model string or a new named constant analogous to `CV_EXTRACTION_OPENAI_MODEL`. Worth clarifying in the spec's Data/API section so the implementer doesn't have to guess the constant-naming convention.
2. **No behavior specified for `client.responses.create` API/SDK shape risk.** The spec commits to `client.responses.create` with an `input_file` content part and inline base64 `file_data`, per the OpenAI SDK v6.37 already in the repo. It does not mention what happens if this exact API shape doesn't behave as expected at implementation time (e.g., different param naming, base64 size limits distinct from chat completions). Given Rules require no guessing/fabrication and a 2-attempt limit before stopping to ask for help, it would be useful for the spec to note this as a known implementation risk rather than leaving it implicit.
3. **`CvExtractionService.extractStructuredData` guard restructuring is underspecified.** Current code (`cv-extraction.service.ts:40-44`) has a single unconditional `parsedText` check that applies to both mime types today. The spec's Behavior section (item 3) says to skip this check for PDFs and keep it for DOCX, but doesn't explicitly describe the resulting control flow (e.g., whether mime-type branching happens before or after the `extractionStatus !== 'PENDING'` update at lines 46-51, and whether that status-update step applies identically to both branches). The Data/API section implies the whole method restructures around a mime-type branch, but the precise ordering of cache-hit check → mime branch → status update → try/catch is left for the implementer to infer. Not a blocker, but worth a one-line clarification.

#### Unclear or Ambiguous Sections

- **"Data / API" section, `OpenAiService` bullet:** States `extractCvDataFromFile` uses `gpt-4o` but doesn't say whether this is a new exported constant (e.g. `CV_EXTRACTION_FILE_OPENAI_MODEL` in `constants.ts`, mirroring the existing `CV_EXTRACTION_OPENAI_MODEL`) or an inline string literal. Given the repo's existing convention (a named constant in `constants.ts`), this should likely be explicit.
- **Acceptance criteria, `cv-extraction.service.spec.ts` bullet:** Says "new cases for the PDF branch" and "existing DOCX branch coverage kept" but doesn't state whether the existing DOCX-path tests need any changes to accommodate the new `R2Service` constructor dependency (they will need updated test module providers regardless of behavior — this is implied but not called out as a required test-file change, only as new-case coverage).

#### Invented or Unsupported Requirements

None. Every requirement in the spec traces to either the raw task description or the "Plan" section embedded within it (which the user stated was already discussed with Claude). Cross-checked against current code:
- File paths, line ranges, and class/method names cited (`CvService.uploadCv`, `CvParserService.parse`, `CvExtractionService.extractStructuredData`, `OpenAiService.extractCvData`, `R2Service`) all match the current codebase.
- `StorageModule` exports `R2Service` and `CvModule` already imports `StorageModule` — confirmed, so the spec's claim that "no module wiring changes needed beyond confirming the export" is accurate.
- `CV_EXTRACTION_OPENAI_MODEL` constant confirmed as `'gpt-4o-mini'` in `constants.ts`, used only in `OpenAiService.extractCvData` — confirmed unchanged for DOCX per spec.
- `parsedText` frontend usage confirmed to appear only in `.spec.ts` test mock files, not in any rendered UI component — supports the "No frontend changes" claim in Out of Scope.
- `pdf-parse` usage confirmed limited to `cv-parser.service.ts` and its spec file — supports the removal plan.

### Assumptions Detected

1. **"OpenAI Responses API `input_file` with inline base64 `file_data` is the correct/working approach for PDF extraction."** Stated explicitly in the spec (Goal, Scope, Data/API). This is inherited from the raw task's embedded plan and is a reasonable reading of the SDK's public API, but it is unverified against a live OpenAI account/API response in this spec — flagged as inherent implementation risk (see Non-Critical Issue #2), not a spec defect.
2. **"Base64 encoding overhead on a 5 MB PDF is within OpenAI request limits."** Stated explicitly in Out of Scope as the reason `MAX_FILE_SIZE` isn't changed. This is a factual assumption about OpenAI's request size limits that isn't independently verified in the spec — explicitly flagged as an assumption by the spec itself, which is good practice, but implementers should confirm this against current OpenAI documentation before considering it settled.
3. **"`gpt-4o-mini` reliability for file/PDF input via the Responses API was not confirmed" → therefore switch to `gpt-4o`.** Explicitly stated as "per clarification" in the Scope section. This is presented as a user decision (consistent with the raw task's "Decisions from clarification with the user" section), so it is appropriately sourced, not an invented requirement.
4. **Implicit assumption: `CvDocument.fileName` is always available and suitable to pass to `extractCvDataFromFile(buffer, fileName)`.** Not explicitly flagged in the spec, but low risk since `fileName` is a required field already used elsewhere (e.g., `UploadCvResponse`).

### Recommendation

- **Proceed as-is**, with the three non-critical clarifications (model constant naming, Responses API risk acknowledgment, and guard-restructuring control flow) optionally folded into the spec or left for the implementer to resolve using existing repo conventions during implementation. None of these rise to the level of blocking implementation.
