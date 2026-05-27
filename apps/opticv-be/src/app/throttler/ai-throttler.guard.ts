import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Request } from 'express';
import type { UserModel } from '../../generated/prisma/models.js';

@Injectable()
export class AiThrottlerGuard extends ThrottlerGuard {
  protected override async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, throttler } = requestProps;
    const { req } = this.getRequestResponse(context);
    const expressReq = req as Request & { user?: UserModel };
    const name = throttler.name ?? 'default';

    if (name === 'ai-ip') {
      return super.handleRequest({
        ...requestProps,
        getTracker: async () => expressReq.ip ?? '127.0.0.1',
      });
    }

    if (name === 'ai-user') {
      if (!expressReq.user?.id) return true;
      return super.handleRequest({
        ...requestProps,
        getTracker: async () => expressReq.user!.id,
      });
    }

    return true;
  }
}
