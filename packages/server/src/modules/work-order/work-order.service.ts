import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class WorkOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    page: number;
    pageSize: number;
    status?: string;
    priority?: string;
    assigneeId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.assigneeId) where.assigneeId = params.assigneeId;

    const [items, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { assignee: { select: { id: true, displayName: true } } },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  }

  async getDetail(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        conversation: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        },
        assignee: { select: { id: true, displayName: true } },
      },
    });
    if (!workOrder) throw new NotFoundException('工单不存在');
    return workOrder;
  }

  async update(id: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = { ...data };

    if (data.assigneeId) {
      updateData.assignedAt = new Date();
    }
    if (data.status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    return this.prisma.workOrder.update({ where: { id }, data: updateData });
  }

  async getStats() {
    const [pending, processing, resolved, closed] = await Promise.all([
      this.prisma.workOrder.count({ where: { status: 'pending' } }),
      this.prisma.workOrder.count({ where: { status: 'processing' } }),
      this.prisma.workOrder.count({ where: { status: 'resolved' } }),
      this.prisma.workOrder.count({ where: { status: 'closed' } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.workOrder.count({
      where: { createdAt: { gte: today } },
    });

    return { pending, processing, resolved, closed, today: todayCount };
  }
}
