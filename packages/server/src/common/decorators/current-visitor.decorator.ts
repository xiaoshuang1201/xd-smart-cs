import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentVisitor = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const visitor = request.visitor;
    return data ? visitor?.[data] : visitor;
  },
);
