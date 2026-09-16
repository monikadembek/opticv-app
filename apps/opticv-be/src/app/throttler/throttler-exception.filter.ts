import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

const RETRY_AFTER_HEADERS = [
  'Retry-After-api-ip',
  'Retry-After-api-user',
  'Retry-After-ai-ip',
  'Retry-After-ai-user',
];

const DEFAULT_RETRY_AFTER = 900;

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_exception: ThrottlerException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let retryAfter = DEFAULT_RETRY_AFTER;
    for (const header of RETRY_AFTER_HEADERS) {
      const value = res.getHeader(header);
      if (value !== undefined) {
        const parsed = Number(value);
        if (!isNaN(parsed)) {
          retryAfter = parsed;
          break;
        }
      }
    }

    res.status(429).json({
      statusCode: 429,
      message: 'Too many requests. Please wait before trying again.',
      error: 'Too Many Requests',
      retryAfter,
    });
  }
}
