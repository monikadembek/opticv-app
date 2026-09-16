# Production-Ready Logging — opticv-be

## Context

The backend currently uses NestJS's built-in `Logger` with plain text string messages. While sufficient for development, this approach has serious gaps for production:

- **No structured output**: log lines are plain strings, unqueryable by log aggregators (Datadog, Logtail, Loki, etc.)
- **No log level control**: everything always prints — no way to silence verbose debug output in production
- **No HTTP request/response logging**: no trace of what endpoints were called, response times, or status codes
- **No centralised exception logging**: errors are either swallowed or logged ad-hoc; there is no uniform error record with stack trace
- **No persistence**: all output is ephemeral console stdout; logs disappear when the process restarts
- **ThrottlerExceptionFilter silently discards events**: rate-limit hits are invisible

The goal is a transparent drop-in replacement: Winston replaces the underlying transport, but **every existing `new Logger(ClassName.name)` instance in every service stays completely unchanged**. Three new files are created, four existing files are lightly modified.

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

## Recommended Approach: nest-winston + DailyRotateFile

**Library stack:**
```
nest-winston        — thin NestJS adapter over Winston; keeps the Logger API intact
winston             — the actual logging engine with structured JSON output
winston-daily-rotate-file — file transport with automatic rotation, size cap, and compression
```

No changes to service code. `nest-winston` intercepts the NestJS `Logger` calls and routes them through Winston transports.

---

## Implementation Steps

### 1. Install dependencies

```bash
npm install nest-winston winston winston-daily-rotate-file
```

### 2. Create Winston logger factory

**New file:** `apps/opticv-be/src/logger/winston.logger.ts`

```typescript
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
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

Read `LOG_LEVEL` and `NODE_ENV` from `process.env` directly (ConfigService is not available before `NestFactory.create`). Pass the options to `WinstonModule.createLogger`:

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

Add to `imports` array (uses the same factory, but now driven by `ConfigService`):

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

Logs `METHOD /path STATUS +Xms` after each response is finalized. Uses `new Logger(...)` so it routes through Winston automatically.

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

Logs exceptions before responding. Preserves the same JSON response shape as NestJS's built-in filter so the API contract is unchanged.

- `HttpException` 4xx → `logger.warn(...)` (client mistake)
- `HttpException` 5xx → `logger.error(...)` with stack
- Unknown exceptions → `logger.error(...)` with full stack and raw error

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

Also import `Request` from `express`.

### 8. Update configuration.ts

Add to the returned config object in `apps/opticv-be/config/configuration.ts`:

```typescript
logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
```

### 9. Update validation.ts

Add to the Joi schema in `apps/opticv-be/config/validation.ts`:

```typescript
LOG_LEVEL: Joi.string()
  .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
  .default('info'),
```

### 10. Update env files

`apps/opticv-be/config/env/development.env` — add:
```
LOG_LEVEL=debug
```

`apps/opticv-be/config/env/production.env` — add:
```
LOG_LEVEL=info
```

### 11. Add `logs/` to .gitignore

In `.gitignore` at repo root:
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
