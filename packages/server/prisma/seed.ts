import { PrismaClient, AdminRole, WorkOrderStatus, WorkOrderPriority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seeding...');

  // 1. 创建超级管理员
  const passwordHash = await bcrypt.hash('admin123!', 12);
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      displayName: '系统管理员',
      email: 'admin@xinding.com',
      role: AdminRole.super_admin,
      status: 'active',
    },
  });
  console.log(`[Seed] Admin user: ${admin.username}`);

  // 2. 创建示例客服账户
  const agentPassword = await bcrypt.hash('agent123!', 12);
  const agent = await prisma.adminUser.upsert({
    where: { username: 'zhang_san' },
    update: {},
    create: {
      username: 'zhang_san',
      passwordHash: agentPassword,
      displayName: '张工',
      email: 'zhangsan@xinding.com',
      role: AdminRole.customer_service,
      status: 'active',
    },
  });
  console.log(`[Seed] Agent user: ${agent.username}`);

  // 3. 系统配置初始化
  const configs = [
    { key: 'agent.confidence_threshold', value: { val: 0.6 }, description: '转人工置信度阈值' },
    { key: 'agent.max_tokens_per_conversation', value: { val: 4096 }, description: '单次对话Token上限' },
    { key: 'agent.sliding_window_size', value: { val: 10 }, description: '对话记忆滑动窗口轮数' },
    { key: 'agent.greeting_message', value: { val: '您好！我是新鼎电炉智能客服，请问有什么可以帮您？' }, description: '欢迎语模板' },
    { key: 'rag.top_k', value: { val: 5 }, description: 'RAG检索返回片段数' },
    { key: 'rag.similarity_threshold', value: { val: 0.7 }, description: '语义相似度最低阈值' },
    { key: 'rag.hybrid_search_weight', value: { val: 0.7 }, description: '混合检索语义权重' },
    { key: 'chat.idle_timeout_minutes', value: { val: 30 }, description: '会话空闲超时(分)' },
    { key: 'agent.rate_limit.ttl', value: { val: 60 }, description: '限流窗口(秒)' },
    { key: 'agent.rate_limit.max', value: { val: 30 }, description: '限流上限' },
    { key: 'agent.brand_tone', value: { val: 'professional' }, description: '品牌语气' },
    { key: 'agent.price_strategy', value: { val: 'range_only' }, description: '价格策略' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { configKey: config.key },
      update: { configValue: config.value },
      create: {
        configKey: config.key,
        configValue: config.value,
        description: config.description,
      },
    });
  }
  console.log(`[Seed] System configs: ${configs.length} items`);

  console.log('[Seed] Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
