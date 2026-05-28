# Backend Logging — Research & Planning Notes

This document captures the discussion, analysis, and decisions around improving backend logging for `opticv-be`.

---

## Current State (as of May 2026)

The backend uses NestJS's built-in `Logger` from `@nestjs/common` with this pattern across all services:

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  someMethod() {
    this.logger.log('message');
    this.logger.error('message');
    this.logger.warn('message');
  }
}
```

### Files currently using Logger

| File | Usage |
|---|---|
| `src/main.ts` | Static `Logger.log()` for startup message |
| `src/app/users/users.controller.ts` | User creation logs |
| `src/app/cv/cv.service.ts` | CV upload error logs |
| `src/app/cv/services/r2.service.ts` | R2 storage error logs |
| `src/app/cv/services/cv-extraction.service.ts` | Cache hit / extraction logs |
| `src/app/ai/services/openai.service.ts` | OpenAI API call logs |
| `src/app/ai/services/cost-calculator.service.ts` | Pricing warnings |
| `src/app/optimization/optimization.processor.ts` | Job queue error logs |

### Current gaps

1. **No structured output** — plain text strings, unqueryable by log aggregators
2. **No log level control** — no `LOG_LEVEL` env var; everything always prints
3. **No HTTP request/response logging** — no trace of endpoints called, response times, or status codes
4. **No centralised exception logging** — errors logged ad-hoc or swallowed silently
5. **No persistence** — ephemeral console stdout only; lost on process restart
6. **ThrottlerExceptionFilter silently discards events** — rate-limit hits are invisible
7. **No database query logging**
8. **No correlation IDs** for request tracing

---

## Why Logging Matters

| Concern | Impact |
|---|---|
| Debugging in production | Without structured logs you cannot search for errors by user ID, request path, or error type |
| Alerting | Error-level log streams feed PagerDuty / Slack alerts |
| Audit trails | Who called what, when — needed for compliance and security reviews |
| Performance monitoring | Request duration logs reveal slow endpoints before users complain |
| Post-incident analysis | Correlation IDs let you reconstruct the full call chain for a single failed request |

---

## Where Should Logs Be Persisted?

### Option considered: Database (PostgreSQL/Supabase)

**Pros:**
- Queryable with SQL — filter by user ID, date range, error type, etc.
- Already have PostgreSQL (Supabase) in the stack — no new infrastructure
- Logs survive container restarts without needing a mounted volume
- Easy to build an admin UI on top

**Cons:**
- **Logging can kill your database** — a spike in errors = a spike in writes = DB under pressure exactly when it's already struggling
- **Circular failure risk** — if the DB goes down, you lose the ability to log that the DB went down
- **Slow** — DB writes are orders of magnitude slower than file/stdout writes; synchronous logging blocks request handling
- **Cost** — Supabase has row/storage limits; high-traffic apps generate millions of log rows quickly
- **Not the industry standard** — log aggregators (Datadog, Logtail, Loki, Grafana) are purpose-built for this and far more capable

### ✅ Recommended: stdout (JSON) → log aggregator + rotating files

```
stdout (JSON)  →  log aggregator (Logtail / Datadog / Loki)
                      ↓
              full-text search, dashboards, alerts, retention policies
```

This is what the file + stdout approach sets you up for. The aggregator handles storage, search, and alerting — your DB stays reserved for business data.

### When DB logging *does* make sense

There is one specific case where storing logs in the DB is a good idea: **structured business events / audit logs** — things like:

- "User X optimized CV Y at time T, cost $0.003"
- "User X uploaded a CV"
- "Job application Z was created"

These are **not** the same as application logs. They're domain events you'd query for billing, analytics, or compliance. The app already has a `usage_logs` table (referenced in `optimization.processor.ts`) — this is exactly the right pattern.

### Summary

| Type | Where to store |
|---|---|
| Application logs (errors, HTTP requests, warnings) | stdout → log aggregator |
| Business/audit events (usage, actions) | PostgreSQL (already doing this) |

---

## Chosen Approach: nest-winston + DailyRotateFile

**Library stack:**

| Package | Purpose |
|---|---|
| `nest-winston` | Thin NestJS adapter over Winston; keeps the existing `Logger` API intact — zero changes to service code |
| `winston` | The actual logging engine with structured JSON output |
| `winston-daily-rotate-file` | File transport with automatic rotation, size cap, and gzip compression |

No changes to existing service code. `nest-winston` intercepts NestJS `Logger` calls and routes them through Winston transports.

---

## Log Persistence

### Console (stdout) — always on, both environments
- **Development:** pretty-printed, colorized output in the terminal
- **Production:** JSON-formatted lines on stdout — collected by your hosting platform (Docker, Railway, Fly.io) and shipped to any log aggregator

### Rotating log files — production only

Files are written to a `logs/` directory at the process working directory root (e.g. `/app/logs` in Docker):

| File | Level | Max size | Retention |
|---|---|---|---|
| `logs/opticv-YYYY-MM-DD.log` | `info` and above | 20 MB | 14 days |
| `logs/opticv-error-YYYY-MM-DD.log` | `error` only | 10 MB | 30 days |

Old files are gzip-compressed on rotation (`zippedArchive: true`). In development, file transports are disabled — only the console transport runs.

The `logs/` directory is added to `.gitignore`.

---

## Implementation Plan

### 1. Install dependencies

```bash
npm install nest-winston winston winston-daily-rotate-file
```

### 2. Create Winston logger factory

**New file:** `apps/opticv-be/src/logger/winston.logger.ts`

```typescript
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export function createWinstonLoggerOptions(nodeEnv: string, logLevel: string) {
  const isDev = nodeEnv !== 'production';

  const consoleTransport = new winston.transports.Console({
    format: isDev
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('OptiCV', { prettyPrint: true, colors: true }),
        )
      : winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
  });

  const fileTransports = isDev
    ? []
    : [
        new (winston.transports as any).DailyRotateFile({
          dirname: 'logs',
          filename: 'opticv-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new (winston.transports as any).DailyRotateFile({
          dirname: 'logs',
          filename: 'opticv-error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '10m',
          maxFiles: '30d',
          level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ];

  return {
    level: logLevel,
    transports: [consoleTransport, ...fileTransports],
  };
}
```

### 3. Wire Winston in `main.ts`

**File:** `apps/opticv-be/src/main.ts`

Read `LOG_LEVEL` and `NODE_ENV` from `process.env` directly (ConfigService is not available before `NestFactory.create`):

```typescript
import { WinstonModule } from 'nest-winston';
import { createWinstonLoggerOptions } from './logger/winston.logger';
import { AllExceptionsFilter } from './logger/all-exceptions.filter';
import { HttpLoggingInterceptor } from './logger/http-logging.interceptor';

async function bootstrap() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const logLevel = process.env.LOG_LEVEL ?? (nodeEnv === 'production' ? 'info' : 'debug');

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(createWinstonLoggerOptions(nodeEnv, logLevel)),
  });

  // ... existing ConfigService, Swagger, helmet, prefix, pipes, CORS setup unchanged ...

  // Update global filters — AllExceptionsFilter first (catch-all), ThrottlerExceptionFilter last (specific)
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new ThrottlerExceptionFilter(),
  );

  // Add HTTP request logging
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  // ... existing app.listen() and Logger.log() startup message unchanged ...
}
```

> **Filter order note:** NestJS applies the last-registered filter first when multiple match. `ThrottlerExceptionFilter` is registered last, so it takes priority for `ThrottlerException`; `AllExceptionsFilter` catches everything else.

### 4. Register WinstonModule in AppModule

**File:** `apps/opticv-be/src/app/app.module.ts`

Add to `imports` array:

```typescript
import { WinstonModule } from 'nest-winston';
import { createWinstonLoggerOptions } from '../../src/logger/winston.logger';

WinstonModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    createWinstonLoggerOptions(
      config.get('nodeEnv') ?? 'development',
      config.get('logLevel') ?? 'info',
    ),
}),
```

### 5. HTTP Request Logging Interceptor

**New file:** `apps/opticv-be/src/logger/http-logging.interceptor.ts`

Logs `METHOD /path STATUS +Xms` after each response is finalized:

```typescript
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const status = context.switchToHttp().getResponse<Response>().statusCode;
          this.logger.log(`${method} ${url} ${status} +${Date.now() - start}ms`);
        },
        error: () => {
          // Errors are handled and logged by AllExceptionsFilter — avoid double-logging
        },
      }),
    );
  }
}
```

### 6. Global All-Exceptions Filter

**New file:** `apps/opticv-be/src/logger/all-exceptions.filter.ts`

Logs exceptions before responding. Preserves the same JSON response shape so the API contract is unchanged.

- `HttpException` 4xx → `logger.warn(...)` (client mistake)
- `HttpException` 5xx → `logger.error(...)` with stack
- Unknown exceptions → `logger.error(...)` with full stack

```typescript
import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      message = typeof response === 'string' ? response : (response as any).message ?? response;
      error = exception.message;
    }

    const logMsg = `${req.method} ${req.url} ${status} — ${JSON.stringify(message)}`;

    if (status >= 500) {
      this.logger.error(logMsg, exception instanceof Error ? exception.stack : undefined);
    } else if (status >= 400) {
      this.logger.warn(logMsg);
    }

    res.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
```

### 7. Add logging to ThrottlerExceptionFilter

**File:** `apps/opticv-be/src/app/throttler/throttler-exception.filter.ts`

Add a `Logger` instance and a `warn` call inside `catch()`:

```typescript
import { Logger } from '@nestjs/common';
// in the class:
private readonly logger = new Logger(ThrottlerExceptionFilter.name);
// in catch():
const req = host.switchToHttp().getRequest<Request>();
this.logger.warn(`Rate limit exceeded — ${req.method} ${req.url} from ${req.ip}`);
```

### 8. Update configuration.ts

Add to `apps/opticv-be/config/configuration.ts`:

```typescript
logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
```

### 9. Update validation.ts

Add to `apps/opticv-be/config/validation.ts`:

```typescript
LOG_LEVEL: Joi.string()
  .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
  .default('info'),
```

### 10. Update env files

`apps/opticv-be/config/env/development.env`:
```
LOG_LEVEL=debug
```

`apps/opticv-be/config/env/production.env`:
```
LOG_LEVEL=info
```

### 11. Add `logs/` to .gitignore

```
apps/opticv-be/logs/
```

---

## What Does NOT Change

- Every `private readonly logger = new Logger(ClassName.name)` in all 8 service/controller files — **zero changes**
- `CvService`, `R2Service`, `CvExtractionService`, `OpenAiService`, `CostCalculatorService`, `OptimizationProcessor`, `UsersController` — **untouched**
- Swagger setup, helmet, CORS, ValidationPipe, app prefix in `main.ts` — **untouched**

---

## Log Output Examples

**Development (pretty-printed):**
```
[Nest] LOG [NestApplication] Nest application successfully started +2ms
[Nest] LOG [HttpLoggingInterceptor] GET /api/cv 200 +45ms
[Nest] WARN [AllExceptionsFilter] GET /api/cv/unknown 404 — "CV not found"
```

**Production (JSON on stdout):**
```json
{"timestamp":"2026-05-27T10:00:00.000Z","level":"info","context":"HttpLoggingInterceptor","message":"GET /api/cv 200 +45ms"}
{"timestamp":"2026-05-27T10:00:01.000Z","level":"warn","context":"AllExceptionsFilter","message":"GET /api/cv/unknown 404 — \"CV not found\""}
```

---

## Files Summary

| Action | File |
|---|---|
| **Create** | `apps/opticv-be/src/logger/winston.logger.ts` |
| **Create** | `apps/opticv-be/src/logger/http-logging.interceptor.ts` |
| **Create** | `apps/opticv-be/src/logger/all-exceptions.filter.ts` |
| **Modify** | `apps/opticv-be/src/main.ts` |
| **Modify** | `apps/opticv-be/src/app/app.module.ts` |
| **Modify** | `apps/opticv-be/config/configuration.ts` |
| **Modify** | `apps/opticv-be/config/validation.ts` |
| **Modify** | `apps/opticv-be/config/env/development.env` |
| **Modify** | `apps/opticv-be/config/env/production.env` |
| **Modify** | `apps/opticv-be/src/app/throttler/throttler-exception.filter.ts` |

---

## Verification

1. **Dev startup:** `npm run start-be:dev` — pretty-printed colored NestJS startup logs appear in terminal
2. **HTTP logging:** make any API call (`GET /api/health`) — `GET /api/health 200 +Xms` log line appears
3. **4xx logging:** call a non-existent endpoint — `warn` line with 404 appears; API JSON response shape is unchanged
4. **5xx logging:** trigger an unhandled error — `error` line with stack trace appears
5. **Throttle logging:** exceed rate limits — `warn` from `ThrottlerExceptionFilter` appears
6. **Production JSON:** run with `NODE_ENV=production` — each stdout line is valid JSON with `timestamp`, `level`, `context`, `message`
7. **Log files:** `logs/opticv-YYYY-MM-DD.log` is created in production mode
8. **Log level suppression:** set `LOG_LEVEL=error` — `info`-level HTTP request lines stop appearing; error logs still appear

---

## Optional Future Enhancement: Correlation IDs

After this task is done, correlation IDs can be added with zero changes to existing service code:

1. Install `cls-hooked` (async-local-storage based request context)
2. Create a `CorrelationIdMiddleware` that reads `x-request-id` header or generates a UUID and stores it in the CLS namespace
3. Add a custom Winston format that reads the CLS namespace and appends `correlationId` to every log entry
4. Register the middleware in `AppModule.configure`

Every log line from every service will automatically carry the correlation ID without touching any service code.
