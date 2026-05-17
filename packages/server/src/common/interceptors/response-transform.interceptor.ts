import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface WrappedResponse<T> {
  code: number;
  message: string;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    pagination?: unknown;
  };
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, WrappedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<WrappedResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || uuidv4();

    return next.handle().pipe(
      map((data) => {
        const pagination = data?.pagination || undefined;
        const responseData = pagination ? data.items ?? data : data;
        const message = data?.message || 'success';

        const response: WrappedResponse<T> = {
          code: 0,
          message,
          data: responseData,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        };

        if (pagination) {
          response.meta.pagination = pagination;
        }

        return response;
      }),
    );
  }
}
