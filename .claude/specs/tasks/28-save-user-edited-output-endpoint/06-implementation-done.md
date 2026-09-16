# Implementation Done

Task ID: 28-save-user-edited-output-endpoint

---

## Summary

Two new REST endpoints were added to the NestJS backend: `GET /api/cv/:id/structured-data` for reading extracted CV structured data (read-only, no AI trigger), and `PATCH /api/optimizations/:id/user-output` for saving a user-edited text output to `OptimizationResult.userEditedOutput`. All associated DTOs, service methods, controller handlers, Swagger decorators, and unit tests were delivered. A new `CvService.getStructuredData` method was introduced (deviation from plan: replaces the originally specified standalone `getStructuredData` step, which routed through `CvExtractionService` in early spec drafts). Extra controller and service tests were added beyond what the plan specified.

---

## Specification Coverage

| Requirement | Status |
|---|---|
| `GET /cv/:id/structured-data` endpoint in `CvController` | Implemented |
| `PATCH /optimizations/:id/user-output` endpoint in `OptimizationController` | Implemented |
| `SaveUserOutputDto` with `@IsString()` and `@ApiProperty`, no `@IsNotEmpty()` | Implemented |
| `SaveUserOutputResponseDto` in `optimization-response.dto.ts` | Implemented |
| `OptimizationService.saveUserOutput(id, userEditedOutput, userId)` | Implemented |
| Ownership check via `include: { application: { select: { userId: true } } }` | Implemented |
| `ForbiddenException` thrown when record not found or wrong owner | Implemented |
| `prisma.optimizationResult.update` with `select: { userEditedOutput: true }` | Implemented |
| Response shape `{ userEditedOutput: string }` for PATCH | Implemented |
| `CvService.getStructuredData` — read-only, no AI trigger | Implemented |
| `NotFoundException` when CV not found or belongs to different user | Implemented |
| `NotFoundException` when `extractionStatus !== 'COMPLETED'` or `structuredData === null` | Implemented |
| Response shape `{ data: CvStructuredData }` for GET | Implemented |
| `CvExtractResponseDto` reused as Swagger response type for GET | Implemented |
| Swagger `@ApiOperation`, `@ApiResponse` on all new methods | Implemented |
| Unit tests for `OptimizationService.saveUserOutput` — record not found | Implemented |
| Unit tests for `OptimizationService.saveUserOutput` — wrong owner | Implemented |
| Unit tests for `OptimizationService.saveUserOutput` — happy path | Implemented |
| Unit tests for `OptimizationService.saveUserOutput` — empty string allowed | Implemented |
| No DB migration (columns already exist) | Implemented |
| No breaking changes to existing endpoints | Implemented |

---

## Files

### Created

| File | Description |
|---|---|
| `apps/opticv-be/src/app/optimization/dto/save-user-output.dto.ts` | `SaveUserOutputDto` with `@IsString()` and `@ApiProperty` |

### Modified

| File | Description |
|---|---|
| `apps/opticv-be/src/app/optimization/dto/optimization-response.dto.ts` | Added `SaveUserOutputResponseDto` |
| `apps/opticv-be/src/app/optimization/optimization.service.ts` | Added `saveUserOutput` method |
| `apps/opticv-be/src/app/optimization/optimization.service.spec.ts` | Added `saveUserOutput` test suite (4 cases) |
| `apps/opticv-be/src/app/optimization/optimization.controller.ts` | Added `PATCH :id/user-output` handler with Swagger decorators |
| `apps/opticv-be/src/app/optimization/optimization.controller.spec.ts` | Added `saveUserOutput` controller test suite (3 cases) |
| `apps/opticv-be/src/app/cv/cv.service.ts` | Added `getStructuredData` method |
| `apps/opticv-be/src/app/cv/cv.service.spec.ts` | Added `getStructuredData` service test suite (5 cases) |
| `apps/opticv-be/src/app/cv/cv.controller.ts` | Added `GET :id/structured-data` handler with Swagger decorators |
| `apps/opticv-be/src/app/cv/cv.controller.spec.ts` | Added `getStructuredData` controller test suite (2 cases) |

---

## Components

| Component | Status |
|---|---|
| `SaveUserOutputDto` | Exist |
| `SaveUserOutputResponseDto` | Exist |
| `OptimizationService.saveUserOutput` | Exist |
| `OptimizationController.saveUserOutput` (PATCH `:id/user-output`) | Exist |
| `CvService.getStructuredData` | Exist |
| `CvController.getStructuredData` (GET `:id/structured-data`) | Exist |

---

## Stores

None — this task is backend-only with no frontend state management.

---

## Deviations

| # | Deviation |
|---|---|
| 1 | Plan Step 5 stated the GET endpoint would call a new `cvService.getStructuredData` method (Step 6). Implemented as specified: `CvService.getStructuredData` is a new method on `CvService`, not on `CvExtractionService`. No deviation from the resolved plan. |
| 2 | `@ApiBody({ type: SaveUserOutputDto })` decorator was added to `OptimizationController.saveUserOutput`; this was not listed in the plan but does not conflict with it. |

---

## Additional Implementation

Controller-level unit tests were added for both new endpoints beyond what the plan specified (plan only required service-level tests for `saveUserOutput`):

- `OptimizationController.saveUserOutput` — 3 test cases in `optimization.controller.spec.ts`
- `CvController.getStructuredData` — 2 test cases in `cv.controller.spec.ts`
- `CvService.getStructuredData` — 5 test cases in `cv.service.spec.ts`
