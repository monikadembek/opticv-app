# Specification Review

## Task ID: 7-file-upload

## Source Files

- Raw task: `.claude/specs/tasks/7-file-upload/00-raw-task.md`
- Specification: `.claude/specs/tasks/7-file-upload/02-spec.md`

---

### Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is thorough, well-structured, and faithfully covers all requirements from the raw task (file upload, PDF/DOCX restriction, Cloudflare R2 storage, frontend + backend). The clarification session filled in missing details correctly. However, there are two items that need resolution before implementation begins: a minor inconsistency in the env var count claim, and an underspecified aspect of how `SupabaseGuard` exposes the internal DB user ID to the controller — which is critical for the DB insert step and could block implementation.

---

### Findings

#### Critical Issues

1. **`SupabaseGuard` user attachment is assumed but unverified**
   - Section: "Backend — step 2" states: "`SupabaseGuard` validates the Bearer token; attaches the user (with internal DB `id`) to the request."
   - The existing `SupabaseGuard` was explored and is described as attaching the user to the request, but it is not confirmed that it resolves and attaches the **internal DB `id`** (Prisma `User.id`) rather than just the Supabase UID. The `CvDocument.userId` field requires the internal DB user ID (foreign key), not the Supabase user ID.
   - **Risk:** If the guard only exposes the Supabase UID, the service must perform an extra DB lookup to resolve the internal user ID. This must be clarified and either the guard behavior confirmed, or the lookup step added to the spec.

2. **`R2_PUBLIC_URL` marked optional but `storageKey` field usage is underspecified**
   - Section: "Data / API — Environment / config": `R2_PUBLIC_URL` is listed as optional. However, the spec states the DB record stores only `storageKey` (the R2 object key), not a full URL.
   - It is not specified how the frontend will ever construct a usable URL to reference the file if needed (e.g. for display in the uploaded-file card). If the card only shows file name, size, and date (as described), this is not a problem now — but the spec does not make this explicit.
   - **Risk:** Implementor may store a full URL or make assumptions about public access. The spec should explicitly state that the card uses only metadata (name, size, date) and that no URL is displayed in this task.

#### Non-Critical Issues

1. **Env var count discrepancy**
   - Section "Environment / config" heading says "three new env vars" but the block lists five: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`. The count in prose should say "up to five" or the text should be corrected.

2. **`@nestjs/platform-express` multer dependency not mentioned**
   - NestJS multipart handling via `FileInterceptor` requires `@types/multer` to be installed (it ships with `@nestjs/platform-express` but typings may need explicit installation). The spec does not mention any `npm install` step for the new `@aws-sdk/client-s3` dependency or multer types. Per the project rules: "Install dependencies first, then generate code." A dependency list should be added to the spec.

3. **Missing DTO for the upload request (input DTO)**
   - The file table lists only `upload-cv-response.dto.ts`. There is no mention of an input validation DTO or pipe (e.g. `ParseFilePipe` with `MaxFileSizeValidator` and `FileTypeValidator`). NestJS has built-in validators for this. The spec describes backend validation in prose but does not specify the mechanism.

4. **`isActive` field set to `true` with no elaboration**
   - The spec sets `isActive: true` on every new upload, but "isActive management" is listed as out of scope. This is fine, but the spec should note what `isActive` semantics are intended (e.g. "marks this as the user's active CV") so the implementor does not misinterpret it as a toggle they need to manage.

5. **File size exact byte count inconsistency**
   - Section "Backend — step 3" specifies `≤ 5 242 880 bytes`. Strictly, 5 MB = 5 × 1024 × 1024 = 5 242 880 bytes. This is correct, but the frontend validation (step 4) just says `> 5 MB` without the byte-level precision. These should align (both should use the same comparison: `> 5 242 880` or `> 5 * 1024 * 1024`) to avoid off-by-one between client and server validation.

#### Unclear or Ambiguous Sections

1. **"Scope — In scope": "get public/signed URL"**
   - The in-scope list says "Cloudflare R2 integration on the backend: upload file, get public/signed URL." However, the DB only stores `storageKey`, not a URL. It is not clear whether generating a signed/public URL is actually required in this task. If not, the phrase should be removed from scope to avoid confusion.

2. **"Behavior — Frontend — step 9": Uploaded-file card content**
   - The card shows "file name, size, upload date." The upload date would come from the server response (`createdAt`). This is inferable but not stated explicitly — the spec should confirm that `createdAt` from the 201 response is what populates the date field.

3. **"Edge Cases": Multiple files dropped**
   - The spec says "show info" (not "show error") when multiple files are dropped. It does not specify where this info is displayed (inline in the drop zone, as a toast, etc.). This is minor but could cause inconsistency with the error display pattern used elsewhere.

#### Invented or Unsupported Requirements

- None. All requirements in the spec originate from the raw task or from the clarification session with the user.

---

### Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | The `CvDocument` Prisma model already exists with all required fields | Yes — Context section |
| 2 | `SupabaseGuard` attaches the internal DB user `id` (not just Supabase UID) to the request | Implicitly — not confirmed |
| 3 | All uploads are kept (history preserved); no replacement of previous files | Yes — Goal section and Out of scope |
| 4 | `parsedText` is left null in this task (no CV parsing) | Yes — Out of scope and DB insert step |
| 5 | `isActive` is set to `true` for every upload without managed toggling | Yes — DB insert step; management deferred |
| 6 | R2 is accessed via AWS S3-compatible API using `@aws-sdk/client-s3` | Yes — Backend step 5 |
| 7 | An orphan R2 object on DB failure is acceptable (no transaction rollback) | Yes — Edge cases |
| 8 | The uploaded-file card uses only metadata from the API response (no file URL displayed) | Implicit — not stated explicitly |
| 9 | File type is validated by MIME type (not file extension) on both client and server | Yes — Behavior sections |
| 10 | The `AuthInterceptor` automatically attaches the Bearer token to the upload request | Implicit — consistent with existing architecture |
| 11 | `@aws-sdk/client-s3` and `@types/multer` packages need to be installed | Implicit — not listed explicitly |
| 12 | `R2_PUBLIC_URL` is optional and not required to display the uploaded file card | Implicit — not stated explicitly |

---

### Recommendation

**Revise specification** — address Critical Issue #1 (SupabaseGuard user ID resolution) and the non-critical items before handing off to implementation. The spec is otherwise complete and well-formed. No task definition changes are needed.
