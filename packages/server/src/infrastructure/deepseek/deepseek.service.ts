import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekChatResult {
  answer: string;
  messageId: string;
  tokensUsed: number;
}

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1');
    this.apiKey = this.configService.get('DEEPSEEK_API_KEY', '');
    this.model = this.configService.get('DEEPSEEK_MODEL', 'deepseek-chat');
  }

  async chat(
    messages: DeepSeekMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<DeepSeekChatResult> {
    const response = await lastValueFrom(
      this.httpService.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      ),
    );

    const choice = response.data.choices?.[0];
    return {
      answer: choice?.message?.content || '',
      messageId: response.data.id || '',
      tokensUsed: response.data.usage?.total_tokens || 0,
    };
  }

  async isHealthy(): Promise<boolean> {
    return !!this.apiKey && this.apiKey !== 'sk-xxxxx';
  }
}
