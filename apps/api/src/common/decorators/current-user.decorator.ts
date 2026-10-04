import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserResponse } from '@planejador-bncc/shared-types';

export const CurrentUser = createParamDecorator(
  (data: keyof UserResponse | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserResponse;
    return data ? user?.[data] : user;
  },
);
