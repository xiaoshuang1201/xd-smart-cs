import { Injectable } from '@nestjs/common';

export interface IntentResult {
  intent: string;
  confidence: number;
}

@Injectable()
export class IntentResolverService {
  private readonly patterns: Array<{ intent: string; keywords: string[]; weight: number }> = [
    {
      intent: 'product_inquiry',
      keywords: ['功率', '规格', '参数', '型号', '选型', '尺寸', '重量', '电压', '频率', '容量', '性能', '配置'],
      weight: 0.8,
    },
    {
      intent: 'price',
      keywords: ['价格', '报价', '多少钱', '费用', '预算', '优惠', '性价比', '贵'],
      weight: 0.9,
    },
    {
      intent: 'after_sales',
      keywords: ['故障', '维修', '坏了', '不工作', '报修', '售后', '保修', '维护', '保养', '更换', '异常', '报警'],
      weight: 0.85,
    },
    {
      intent: 'installation',
      keywords: ['安装', '调试', '接线', '地基', '运输', '搬运', '就位'],
      weight: 0.75,
    },
    {
      intent: 'transfer',
      keywords: ['人工', '转人工', '客服', '电话', '联系', '微信'],
      weight: 0.95,
    },
  ];

  async resolve(query: string): Promise<IntentResult> {
    const normalized = query.toLowerCase().trim();

    let bestIntent = 'chat';
    let bestScore = 0;

    for (const pattern of this.patterns) {
      let matchCount = 0;
      for (const keyword of pattern.keywords) {
        if (normalized.includes(keyword)) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        const score = Math.min(1, (matchCount / pattern.keywords.length) * pattern.weight * 2);
        if (score > bestScore) {
          bestScore = score;
          bestIntent = pattern.intent;
        }
      }
    }

    return {
      intent: bestIntent,
      confidence: bestScore > 0 ? Math.round(bestScore * 100) / 100 : 0.3,
    };
  }
}
