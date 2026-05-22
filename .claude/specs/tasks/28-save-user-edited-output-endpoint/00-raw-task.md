Task 28. Add 2 new endpoints on backend to save user edited output and to get cv structured data

Description:
- get structuredData from cv with given id
  GET /cv/:id/structured-data
- patch optimization with given id, save data to field userEditedOutput
  PATCH /optimizations/:id/user-output

The below spec is from my earlier conversation with Claude Code:
1. GET /cv/:id/structured-data
File: apps/opticv-be/src/app/cv/cv.controller.ts

Add a @Get(':id/structured-data') method. Call cvExtractionService.extractStructuredData(id, user.id) — this already handles the cache-hit path when extraction has run. Return { data: CvStructuredData } (same shape as the existing extract endpoint).

No migration needed — structuredData column already exists.

2. PATCH /optimizations/:id/user-output
Files:

apps/opticv-be/src/app/optimization/optimization.controller.ts — add @Patch(':id/user-output') method
apps/opticv-be/src/app/optimization/optimization.service.ts — add saveUserOutput(id, output, userId): verify ownership via include: { application: { select: { userId: true } } }, then prisma.optimizationResult.update({ where: { id }, data: { userEditedOutput } })
New file: apps/opticv-be/src/app/optimization/dto/save-user-output.dto.ts — SaveUserOutputDto with @IsString() userEditedOutput: string
The userEditedOutput column already exists in the schema — no migration needed.

