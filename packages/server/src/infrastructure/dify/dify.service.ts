import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, timeout, tap } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import type {
  DifyChatRequest,
  DifyChatResponse,
  DifyStreamEvent,
} from './dify.types';
import { DIFY_ENDPOINTS } from './dify.constants';

@Injectable()
export class DifyService {
  private readonly logger = new Logger(DifyService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('DIFY_API_URL', 'http://localhost:5001/v1');
    this.apiKey = this.configService.get('DIFY_API_KEY', '');
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async chatBlocking(request: DifyChatRequest): Promise<DifyChatResponse> {
    const response = await lastValueFrom(
      this.httpService
        .post<DifyChatResponse>(
          `${this.baseUrl}${DIFY_ENDPOINTS.CHAT_MESSAGES}`,
          { ...request, response_mode: 'blocking' },
          { headers: this.getHeaders() },
        )
        .pipe(
          timeout(30000),
          retry({ count: 2, delay: 1000 }),
          catchError((err) => {
            this.logger.error(`Dify blocking chat failed: ${err.message}`);
            return throwError(() => err);
          }),
        ),
    );
    return response.data;
  }

  chatStream(
    request: DifyChatRequest,
  ): Observable<any> {
    return this.httpService
      .post(`${this.baseUrl}${DIFY_ENDPOINTS.CHAT_MESSAGES}`, {
        ...request,
        response_mode: 'streaming',
      }, {
        headers: this.getHeaders(),
        responseType: 'stream',
      })
      .pipe(
        timeout(30000),
        retry({ count: 2, delay: (_err, retryCount) => timer(retryCount * 1000) }),
        catchError((err) => {
          this.logger.error(`Dify streaming chat failed: ${err.message}`);
          return throwError(() => err);
        }),
      );
  }

  async getConversations(userId: string, limit = 20, page = 1) {
    const response = await lastValueFrom(
      this.httpService.get(`${this.baseUrl}${DIFY_ENDPOINTS.CONVERSATIONS}`, {
        headers: this.getHeaders(),
        params: { user: userId, limit, page },
      }),
    );
    return response.data;
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Dify API health endpoint is at root, not under /v1
      const baseUrl = this.baseUrl.replace(/\/v1$/, '');
      await lastValueFrom(
        this.httpService.get(`${baseUrl}/health`, { timeout: 5000 }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
