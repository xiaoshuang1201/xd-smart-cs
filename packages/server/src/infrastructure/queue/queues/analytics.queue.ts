import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('analytics-report')
export class AnalyticsQueueProcessor {
  private readonly logger = new Logger(AnalyticsQueueProcessor.name);

  @Process('daily_summary')
  async handleDailySummary(job: Job<{ date: string }>) {
    this.logger.log(`Generating daily summary for ${job.data.date}`);
    // Phase 5: 由 AnalyticsService 实现具体的聚合逻辑
    await job.progress(100);
  }

  @Process('hourly_stats')
  async handleHourlyStats(job: Job) {
    this.logger.log('Updating hourly statistics');
    await job.progress(100);
  }
}
