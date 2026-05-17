export interface DashboardOverview {
  totalConversations: number;
  totalMessages: number;
  avgConfidence: number;
  transferRate: number;
  helpfulRate: number;
  avgResponseTimeMs: number;
  dailyTrend: DailyTrend[];
  intentDistribution: IntentDistribution[];
  hourlyDistribution: HourlyDistribution[];
}

export interface DailyTrend {
  date: string;
  conversations: number;
  transfers: number;
}

export interface IntentDistribution {
  intent: string;
  count: number;
  percentage: number;
}

export interface HourlyDistribution {
  hour: number;
  count: number;
}
