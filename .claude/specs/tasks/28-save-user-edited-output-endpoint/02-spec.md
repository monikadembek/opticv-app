# Task Specification

## Source

Task 28: Add 2 new endpoints on backend to save user edited output and to get CV structured data

## Goal

Add two new REST endpoints to the NestJS backend:

1. `GET /api/cv/:id/structured-data` — retrieve already-extracted structured data for a CV document (cache-hit path via `CvExtractionService`).
2. `PATCH /api/optimizations/:id/user-output` — save a user-edited text output to the `userEditedOutput` field on an `OptimizationResult`.

## Context

Both columns already exist in the database schema — no migrations are needed.

- `CvDocument.structuredData` (Json?) — populated by the existing extraction flow.
- `OptimizationResult.userEditedOutput` (String?) — exists in the schema but has no write path yet.

The backend follows NestJS patterns: `SupabaseGuard` protects all routes, `@CurrentUser()` injects the authenticated user, and `PrismaService` is used for DB access.

## Scope

### In scope

- New `GET /cv/:id/structured-data` endpoint in `CvController`.
- New `PATCH /optimizations/:id/user-output` endpoint in `OptimizationController`.
- New `SaveUserOutputDto` with validation.
- New `saveUserOutput` method in `OptimizationService` with ownership check.
- Swagger decorators on all new methods and DTOs.
- Unit tests for the new service method.

### Out of scope

- Database migrations (columns already exist).
- Frontend changes.
- Changes to the existing extraction trigger flow (`POST /cv/:id/extract`).
- Any changes to optimization result status or other fields.

## Behavior

### 1. GET /cv/:id/structured-data

1. Request arrives at `CvController.getStructuredData(id, user)`.
2. Controller calls `cvExtractionService.extractStructuredData(id, user.id)`.
3. `extractStructuredData` already handles the cache-hit path: if `extractionStatus === 'COMPLETED'` and `structuredData` is non-null, it returns the stored data immediately without calling the AI.
4. If data is not yet extracted, the service runs the AI extraction (same behaviour as the existing `POST :id/extract` endpoint).
5. Controller returns `{ data: CvStructuredData }`.

**Behaviour is identical to `POST /cv/:id/extract`** — the only difference is the HTTP method (`GET`) and route suffix (`/structured-data`).

### 2. PATCH /optimizations/:id/user-output

1. Request arrives at `OptimizationController.saveUserOutput(id, body, user)`.
2. Controller calls `optimizationService.saveUserOutput(id, body.userEditedOutput, user.id)`.
3. Service queries `OptimizationResult` by `id`, using `include: { application: { select: { userId: true } } }` to verify ownership.
4. If the record does not exist or `application.userId !== user.id`, throw `ForbiddenException`.
5. Service calls `prisma.optimizationResult.update({ where: { id }, data: { userEditedOutput } })`.
6. Returns the updated record (or just the patched field — see Data section).

## Edge Cases

- CV not found or belongs to a different user → `NotFoundException` (handled inside `extractStructuredData`).
- CV parsed text is empty → `BadRequestException` (handled inside `extractStructuredData`).
- `OptimizationResult` not found or wrong owner → `ForbiddenException`.
- `userEditedOutput` is an empty string — allowed (user can clear their edits); no extra validation beyond `@IsString()`.

## Data / API

### GET /cv/:id/structured-data

| Field    | Value                          |
|----------|--------------------------------|
| Method   | GET                            |
| Path     | `/api/cv/:id/structured-data`  |
| Auth     | Bearer (SupabaseGuard)         |
| Params   | `id` — CV document UUID        |
| Response | `{ data: CvStructuredData }` (HTTP 200) |
| Errors   | 401, 404                       |

Response DTO: reuse existing `CvExtractResponseDto`.

---

### PATCH /optimizations/:id/user-output

| Field    | Value                                    |
|----------|------------------------------------------|
| Method   | PATCH                                    |
| Path     | `/api/optimizations/:id/user-output`     |
| Auth     | Bearer (SupabaseGuard)                   |
| Params   | `id` — OptimizationResult UUID           |
| Body     | `SaveUserOutputDto`                      |
| Response | `{ userEditedOutput: string }` (HTTP 200) |
| Errors   | 400 (validation), 401, 403               |

**New file:** `apps/opticv-be/src/app/optimization/dto/save-user-output.dto.ts`

```ts
export class SaveUserOutputDto {
  @ApiProperty({ example: 'My edited output text...' })
  @IsString()
  userEditedOutput!: string;
}
```

**New response DTO:** `SaveUserOutputResponseDto` in `optimization-response.dto.ts`

```ts
export class SaveUserOutputResponseDto {
  @ApiProperty({ example: 'My edited output text...' })
  userEditedOutput!: string;
}
```

### Files changed

| File | Change |
|------|--------|
| `apps/opticv-be/src/app/cv/cv.controller.ts` | Add `@Get(':id/structured-data')` method |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | Add `@Patch(':id/user-output')` method |
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | Add `saveUserOutput(id, output, userId)` method |
| `apps/opticv-be/src/app/optimization/dto/save-user-output.dto.ts` | New file — `SaveUserOutputDto` |
| `apps/opticv-be/src/app/optimization/dto/optimization-response.dto.ts` | Add `SaveUserOutputResponseDto` |

No DB migration, no schema change.

## Acceptance (DEV)

- Build passes (`npm exec nx build opticv-be`).
- Typecheck passes (`npm exec nx typecheck opticv-be`).
- Unit tests added for `OptimizationService.saveUserOutput` (ownership check, happy path, not-found/forbidden path).
- No breaking changes to existing endpoints.
- Swagger docs reflect both new endpoints.
