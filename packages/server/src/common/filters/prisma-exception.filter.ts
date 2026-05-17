import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 50002;
    let message = '数据库操作失败';

    switch (exception.code) {
      case 'P2002': // Unique constraint
        status = HttpStatus.CONFLICT;
        code = 40901;
        message = '数据已存在';
        break;
      case 'P2025': // Record not found
        status = HttpStatus.NOT_FOUND;
        code = 40401;
        message = '记录不存在';
        break;
      case 'P2003': // Foreign key constraint
        status = HttpStatus.BAD_REQUEST;
        code = 40001;
        message = '关联数据不存在';
        break;
    }

    this.logger.warn(`Prisma error ${exception.code}: ${message}`);

    response.status(status).json({
      code,
      message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (request as any).requestId,
        path: request.url,
      },
    });
  }
}
