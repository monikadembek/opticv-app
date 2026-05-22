# Implementation Plan

Task ID: 28-save-user-edited-output-endpoint

---

## Resolved Ambiguities (from review)

1. **GET /cv/:id/structured-data** — read-only. If `extractionStatus !== 'COMPLETED'` or `structuredData` is null, return `404 Not Found`. Do NOT trigger AI extraction.
2. **PATCH response** — return `{ userEditedOutput: string }` only.

---

## Step 1 — Add `SaveUserOutputDto`

**File (new):** `apps/opticv-be/src/app/optimization/dto/save-user-output.dto.ts`

- Create class `SaveUserOutputDto`.
- Add property `userEditedOutput: string` decorated with `@ApiProperty` and `@IsString()`.
- No `@IsNotEmpty()` — empty string is explicitly allowed so the user can clear their edits.
- Import from `class-validator` and `@nestjs/swagger`.

---

## Step 2 — Add `SaveUserOutputResponseDto`

**File (modified):** `apps/opticv-be/src/app/optimization/dto/optimization-response.dto.ts`

- Append class `SaveUserOutputResponseDto` with a single property `userEditedOutput: string` decorated with `@ApiProperty`.

---

## Step 3 — Add `saveUserOutput` to `OptimizationService`

**File (modified):** `apps/opticv-be/src/app/optimization/optimization.service.ts`

- Add public async method `saveUserOutput(id: string, userEditedOutput: string, userId: string): Promise<{ userEditedOutput: string }>`.
- Query: `prisma.optimizationResult.findUnique({ where: { id }, include: { application: { select: { userId: true } } } })`.
- If record is `null` or `record.application.userId !== userId`, throw `ForbiddenException`.
- Update: `prisma.optimizationResult.update({ where: { id }, data: { userEditedOutput }, select: { userEditedOutput: true } })`.
- Return the result of the update call (shape: `{ userEditedOutput: string | null }`). Cast `userEditedOutput` to `string` — it is guaranteed non-null because we just wrote a `string` value.
- Add `ForbiddenException` to existing NestJS imports.

---

## Step 4 — Add `PATCH :id/user-output` to `OptimizationController`

**File (modified):** `apps/opticv-be/src/app/optimization/optimization.controller.ts`

- Import `Patch`, `Body` from `@nestjs/common` (both are already imported — verify; add if missing).
- Import `SaveUserOutputDto` and `SaveUserOutputResponseDto` from their respective DTO files.
- Add method `saveUserOutput(@Param('id') id: string, @Body() body: SaveUserOutputDto, @CurrentUser() user: UserModel): Promise<{ userEditedOutput: string }>`.
- Decorator: `@Patch(':id/user-output')`.
- No explicit `@HttpCode` — NestJS default is 200 for PATCH; no `@HttpCode` decorator needed.
- Swagger decorators:
  - `@ApiOperation({ summary: 'Save user-edited output for an optimization result' })`
  - `@ApiResponse({ status: 200, type: SaveUserOutputResponseDto, description: 'User output saved' })`
  - `@ApiResponse({ status: 400, description: 'Validation error' })`
  - `@ApiResponse({ status: 401, description: 'Unauthorized' })`
  - `@ApiResponse({ status: 403, description: 'Forbidden' })`
- Body: calls `this.optimizationService.saveUserOutput(id, body.userEditedOutput, user.id)` and returns the result.

---

## Step 5 — Add `GET :id/structured-data` to `CvController`

**File (modified):** `apps/opticv-be/src/app/cv/cv.controller.ts`

- The new endpoint does NOT reuse `CvExtractionService.extractStructuredData` directly, because that method triggers AI extraction. Instead, implement a direct DB read.
- Add method `getStructuredData(@Param('id') id: string, @CurrentUser() user: UserModel): Promise<{ data: CvStructuredData }>`.
- Decorator: `@Get(':id/structured-data')`.
- Implementation: call a new service method `cvService.getStructuredData(id, user.id)` (see Step 6).
- Swagger decorators:
  - `@ApiOperation({ summary: 'Get extracted structured data for a CV' })`
  - `@ApiResponse({ status: 200, type: CvExtractResponseDto, description: 'Structured CV data' })`
  - `@ApiResponse({ status: 401, description: 'Unauthorized' })`
  - `@ApiResponse({ status: 404, description: 'CV not found or extraction not completed' })`

---

## Step 6 — Add `getStructuredData` to `CvService`

**File (modified):** `apps/opticv-be/src/app/cv/cv.service.ts`

- Add public async method `getStructuredData(cvId: string, userId: string): Promise<{ data: CvStructuredData }>`.
- Query: `prisma.cvDocument.findUnique({ where: { id: cvId }, select: { userId: true, extractionStatus: true, structuredData: true } })`.
- If `doc` is null or `doc.userId !== userId`, throw `NotFoundException('CV document not found.')`.
- If `doc.extractionStatus !== 'COMPLETED'` or `doc.structuredData === null`, throw `NotFoundException('Structured data not available.')`.
- Return `{ data: doc.structuredData as unknown as CvStructuredData }`.
- Import `NotFoundException` from `@nestjs/common` (verify it is already imported; add if missing).
- Import `CvStructuredData` from `@opticv/datatypes` (verify; add if missing).

---

## Step 7 — Unit tests for `OptimizationService.saveUserOutput`

**File (modified):** `apps/opticv-be/src/app/optimization/optimization.service.spec.ts`

- Add `optimizationResult.findUnique` and `optimizationResult.update` to `mockPrisma`.
- Add a new `describe('saveUserOutput', ...)` block with the following cases:

| Test case | Mock setup | Expected outcome |
|-----------|-----------|-----------------|
| record not found | `findUnique` returns `null` | throws `ForbiddenException` |
| wrong owner | `findUnique` returns record with `application.userId = 'other-user'` | throws `ForbiddenException` |
| happy path | `findUnique` returns owned record; `update` returns `{ userEditedOutput: 'edited' }` | resolves to `{ userEditedOutput: 'edited' }` |
| empty string allowed | `findUnique` returns owned record; `update` returns `{ userEditedOutput: '' }` | resolves to `{ userEditedOutput: '' }` |

- Follow existing test style: `jest.fn()`, `mockResolvedValue`, `expect(...).rejects.toThrow(...)`, `expect(...).resolves.toEqual(...)`.
- Use `jest.clearAllMocks()` in `beforeEach` (already present in the file).

---

## Step 8 — Verify

Run in order:

```
npm exec nx typecheck opticv-be
npm exec nx test opticv-be
npm exec nx build opticv-be
```

All must pass with no errors.

---

## Files Summary

| File | Action |
|------|--------|
| `apps/opticv-be/src/app/optimization/dto/save-user-output.dto.ts` | **Create** |
| `apps/opticv-be/src/app/optimization/dto/optimization-response.dto.ts` | **Modify** — add `SaveUserOutputResponseDto` |
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | **Modify** — add `saveUserOutput` method |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | **Modify** — add `PATCH :id/user-output` endpoint |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | **Modify** — add `GET :id/structured-data` endpoint |
| `apps/opticv-be/src/app/cv/cv.service.ts` | **Modify** — add `getStructuredData` method |
| `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` | **Modify** — add `saveUserOutput` test suite |
