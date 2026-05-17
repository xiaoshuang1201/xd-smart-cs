import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { MinioService } from './minio.service';

@Injectable()
export class MinioHealthIndicator extends HealthIndicator {
  constructor(private readonly minioService: MinioService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const healthy = await this.minioService.isHealthy();
      return this.getStatus(key, healthy);
    } catch (error) {
      throw new HealthCheckError('MinIO check failed', this.getStatus(key, false, { error }));
    }
  }
}
