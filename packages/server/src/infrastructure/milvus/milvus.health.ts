import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { MilvusService } from './milvus.service';

@Injectable()
export class MilvusHealthIndicator extends HealthIndicator {
  constructor(private readonly milvusService: MilvusService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const healthy = await this.milvusService.isHealthy();
      return this.getStatus(key, healthy);
    } catch (error) {
      throw new HealthCheckError('Milvus check failed', this.getStatus(key, false, { error }));
    }
  }
}
