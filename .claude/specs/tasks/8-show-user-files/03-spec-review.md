# Spec Review — Task 8: Show list of user uploaded files in dashboard

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured, covers all explicit requirements from the raw task, and adds reasonable detail from clarifying questions. However, it contains two invented/unsupported requirements (Download and View details actions) that were not in the original task, two ambiguous sections (service naming and download fallback behaviour), and one missing explicit assumption. These issues should be acknowledged and, where necessary, reconciled with the task owner before implementation.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **`GET /api/cv/:id/download` response when streaming** — The spec states "or, if R2 does not support pre-signing with the current adapter, streams the file directly." Streaming and returning `{ url: string }` are two different contracts. If streaming is used the frontend code (`openURL in new tab`) would break. The fallback path needs a defined resolution (pick one approach or specify how the frontend adapts).

2. **Service naming left open** — Section "Frontend service" says "Add methods to the existing `CvUploadApiService` (or create a new `CvApiService`)". This ambiguity will cause a decision to be made at implementation time without guidance. The spec should pick one.

3. **`CvDocumentListItem` includes `parsedText`** — The list view does not display `parsedText`; it is only used in the View details dialog. Returning it in the list payload may be acceptable, but the trade-off (potentially large text field returned for every row) is not acknowledged. Should be noted as an explicit assumption or the type should use a separate detail endpoint/type.

4. **Acceptance criterion for Download not present** — The acceptance section covers list, delete, empty state, and auth, but there is no acceptance criterion for the Download action (e.g. "clicking Download opens the file in a new tab").

5. **Acceptance criterion for View details not present** — Similarly, no acceptance criterion covers the View details dialog behaviour.

---

### Unclear or Ambiguous Sections

- **Section "Data / API — Frontend service"**: The `(or create a new CvApiService)` alternative is left open. One path should be chosen.
- **Section "Behavior — Backend — GET /api/cv/:id/download"**: The pre-sign vs. stream fallback is not resolved. Two incompatible response shapes are implied in the same bullet.
- **Section "Data / API — GET /api/cv/:id/download"**: The response shape `{ url: string }` only applies to the pre-signed URL path. No shape is defined for the streaming fallback.

---

### Invented or Unsupported Requirements

The raw task says: *"display there a list of cvs uploaded by currently logged in user."* It does not mention file actions. The following requirements were added via clarifying questions with the developer/PO and are not present in the raw task:

1. **Download action** (`GET /api/cv/:id/download` endpoint + frontend behaviour) — added based on clarifying-question answer, not in raw task.
2. **View details action** (Dialog showing `parsedText` and full metadata) — added based on clarifying-question answer, not in raw task.
3. **Delete action** (`DELETE /api/cv/:id` endpoint + ConfirmDialog) — added based on clarifying-question answer, not in raw task.

> Note: these are listed here for traceability. They were confirmed by the developer/PO during the clarification phase, so they are legitimate scope additions — but they should be acknowledged as scope extensions beyond the literal raw task text.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | `SupabaseGuard` handles 401 responses for missing/invalid JWTs without additional code | Yes — Edge Cases section |
| 2 | R2 supports pre-signed URLs with the existing `R2Service`/adapter | Partially — a fallback is mentioned but the question is not resolved |
| 3 | All files are returned in a single response (no pagination) | Yes — Out of scope + Edge Cases |
| 4 | Local component signals are sufficient for dashboard state (no NgRx store) | Yes — Frontend state section |
| 5 | `parsedText` is populated by the upload pipeline and may be `null` | Yes — Edge Cases |
| 6 | The `storageKey` on every `CvDocument` record is valid and non-null | Implicit — not stated; the edge case only covers a missing key or missing R2 object |
| 7 | Returning `parsedText` in the list payload (potentially large) is acceptable for performance | Implicit — not stated |
| 8 | The `@CurrentUser()` decorator reliably returns a `userId` after `SupabaseGuard` passes | Implicit — inherited from upload feature convention, not restated |

---

## Recommendation

**Revise specification** — resolve the two ambiguities (service name choice; pre-sign vs. stream approach) and add the two missing acceptance criteria (Download, View details) before handing off to implementation.
