import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserModel } from '../../../generated/prisma/models.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserModel => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: UserModel }>();
    return request.user;
  },
);
