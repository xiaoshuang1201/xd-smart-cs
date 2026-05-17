import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('document-process') private readonly documentQueue: Queue,
    @InjectQueue('analytics-report') private readonly analyticsQueue: Queue,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
  ) {}

  async addDocumentJob(data: { documentId: string }): Promise<Job> {
    return this.documentQueue.add('parse-and-index', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      timeout: 300000, // 5min
    });
  }

  async addAnalyticsJob(data: { type: string; date?: string }): Promise<Job> {
    return this.analyticsQueue.add(data.type, data, {
      attempts: 1,
      timeout: 600000, // 10min
    });
  }

  async addNotificationJob(data: {
    type: 'work_order' | 'alert';
    payload: Record<string, unknown>;
  }): Promise<Job> {
    return this.notificationQueue.add(data.type, data.payload, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 30000 },
      timeout: 30000,
    });
  }

  async getJobStatus(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  async cleanOldJobs(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(24 * 3600 * 1000, 'completed');
    await queue.clean(24 * 3600 * 1000, 'failed');
  }

  private getQueue(name: string): Queue {
    switch (name) {
      case 'document-process':
        return this.documentQueue;
      case 'analytics-report':
        return this.analyticsQueue;
      case 'notification':
        return this.notificationQueue;
      default:
        throw new Error(`Unknown queue: ${name}`);
    }
  }
}
