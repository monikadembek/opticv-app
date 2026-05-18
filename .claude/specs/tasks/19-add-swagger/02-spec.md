# Task Specification

## Source

Azure DevOps Task: 19

## Goal

Integrate `@nestjs/swagger` into the `opticv-be` NestJS backend to generate interactive OpenAPI documentation for all existing REST endpoints. The Swagger UI should be available only in the development environment.

## Context

The backend (`apps/opticv-be`) is a NestJS 11 app built with Webpack, running on port 3000 with global prefix `/api`. It has multiple feature modules with controllers and DTOs:

- `CvController` — CV upload, parsing, extraction
- `JobApplicationController` — CRUD for job applications
- `OptimizationController` — AI optimization pipeline
- `UsersController` — user webhook handling
- `AppController` — health check

Authentication uses a Supabase JWT guard (`SupabaseGuard`). DTOs use `class-validator` decorators and are transformed by the global `ValidationPipe`.

## Scope

### In scope

- Install `@nestjs/swagger` and `swagger-ui-express` packages
- Bootstrap the Swagger document in `main.ts`, guarded behind a `NODE_ENV !== 'production'` check
- Add `@ApiTags()` decorators to each controller to group endpoints by feature
- Add `@ApiOperation()` decorators to each controller method with a short summary
- Add `@ApiResponse()` decorators for common HTTP responses (200/201, 400, 401, 403, 404 where applicable)
- Annotate existing DTOs with `@ApiProperty()` / `@ApiPropertyOptional()` so request/response bodies are documented
- Document the bearer token auth scheme globally so "Authorize" button works in Swagger UI
- Swagger UI served at `/docs` (outside the `/api` prefix)

### Out of scope

- Adding new endpoints or changing any business logic
- Generating a static OpenAPI JSON file for CI/CD
- Authentication enforcement on the `/docs` route itself (dev-only access via env guard is sufficient)
- E2E tests for Swagger UI

## Behavior

1. On startup, `bootstrap()` checks `configService.get('nodeEnv')`. If the value is not `'production'`, it calls `SwaggerModule.createDocument()` and `SwaggerModule.setup()`.
2. `SwaggerModule.setup('docs', app, document)` mounts the Swagger UI at `http://localhost:3000/docs`.
3. The OpenAPI document is configured with:
   - Title: `OptiCV API`
   - Description: `REST API for the OptiCV application`
   - Version: `1.0`
   - Bearer auth security scheme (JWT)
4. Each controller is decorated with `@ApiTags('feature-name')` matching its module name.
5. Each controller method is decorated with `@ApiOperation({ summary: '...' })`.
6. Each DTO property is annotated with `@ApiProperty()` (required) or `@ApiPropertyOptional()` (optional), including type, example, and description where meaningful.
7. Endpoints protected by `SupabaseGuard` are annotated with `@ApiBearerAuth()` so Swagger UI shows the lock icon.

## Edge Cases

- `NODE_ENV` is read from `ConfigService` (already available in `main.ts`) — no additional config key needed.
- The `/docs` path must not be prefixed with `/api` — pass the app instance before `setGlobalPrefix` or use `app.setGlobalPrefix(globalPrefix, { exclude: ['/docs'] })`.
- Webpack build: `@nestjs/swagger` works with Webpack without additional plugins; no `tsconfig` changes needed.
- The generated Prisma types in `src/generated/` are not DTOs and should not be annotated — only handwritten DTOs under `src/app/*/dto/` get Swagger decorators.

## Data / API

No new endpoints. Swagger UI available only in development:

| Route  | Description                    |
|--------|--------------------------------|
| `/docs` | Swagger UI (dev only)         |
| `/docs-json` | Raw OpenAPI JSON (dev only) |

DTOs to annotate:

- `apps/opticv-be/src/app/cv/` — any request/response DTOs
- `apps/opticv-be/src/app/job-application/dto/create-job-application.dto.ts`
- `apps/opticv-be/src/app/job-application/dto/update-job-application.dto.ts`
- `apps/opticv-be/src/app/job-application/dto/job-application-query.dto.ts`
- `apps/opticv-be/src/app/job-application/dto/update-ats-score.dto.ts`
- `apps/opticv-be/src/app/users/dto/webhook-payload.dto.ts`

## Assumptions

- Swagger UI is disabled in production (`NODE_ENV === 'production'`). This is a security best practice — exposing the API surface in production leaks internal model structure.
- Bearer JWT is the only auth scheme used; no API key or OAuth flows needed.
- No versioning prefix is added to the OpenAPI document; version `1.0` is a label only.

## Acceptance (DEV)

- `npm exec nx build opticv-be` passes with no errors
- `npm exec nx typecheck opticv-be` passes
- `npm exec nx lint opticv-be` passes
- Running `npm run start-be:dev` and navigating to `http://localhost:3000/docs` renders the Swagger UI
- All controllers appear as tag groups in Swagger UI
- All DTO fields are documented with types and examples
- Endpoints with `SupabaseGuard` show the lock icon and respond correctly when a bearer token is provided via the "Authorize" dialog
- No tests need to be added (Swagger integration is a configuration concern, not business logic)
