export interface WorkOrder {
  id: string;
  conversationId: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assigneeId?: string;
  aiSummary?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkOrderStatus = 'pending' | 'processing' | 'resolved' | 'closed';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
