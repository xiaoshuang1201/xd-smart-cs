<template>
  <div>
    <!-- Date Range -->
    <a-card size="small" class="mb-4">
      <a-form layout="inline">
        <a-form-item label="日期范围">
          <a-range-picker v-model:value="dateRange" :allow-clear="false" @change="fetchDashboard" />
        </a-form-item>
        <a-form-item>
          <a-button @click="fetchDashboard">刷新</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- Stat Cards -->
    <a-spin :spinning="loading">
      <a-row :gutter="16" class="mb-4">
        <a-col :xs="24" :sm="12" :md="6">
          <StatCard title="总会话数" :value="dashboard.totalConversations" color="#1a56db" />
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <StatCard title="总消息数" :value="dashboard.totalMessages" color="#10b981" />
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <StatCard title="转人工率" :value="(dashboard.transferRate * 100).toFixed(1) + '%'" color="#f59e0b" />
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <StatCard title="好评率" :value="(dashboard.helpfulRate * 100).toFixed(1) + '%'" color="#8b5cf6" />
        </a-col>
      </a-row>

      <!-- Details -->
      <a-row :gutter="16" class="mb-4">
        <a-col :span="12">
          <a-card title="关键指标" size="small">
            <a-descriptions size="small" :column="1">
              <a-descriptions-item label="平均响应时间">{{ dashboard.avgResponseTimeMs > 0 ? dashboard.avgResponseTimeMs + 'ms' : '—' }}</a-descriptions-item>
              <a-descriptions-item label="平均置信度">{{ dashboard.avgConfidence > 0 ? dashboard.avgConfidence.toFixed(2) : '—' }}</a-descriptions-item>
              <a-descriptions-item label="平均Token/会话">{{ dashboard.avgTokensPerConversation > 0 ? dashboard.avgTokensPerConversation : '—' }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="今日实时" size="small">
            <a-descriptions size="small" :column="1">
              <a-descriptions-item label="今日会话">{{ realtime.totalConversations || 0 }}</a-descriptions-item>
              <a-descriptions-item label="今日消息">{{ realtime.totalMessages || 0 }}</a-descriptions-item>
              <a-descriptions-item label="转人工">{{ realtime.transferCount || 0 }}</a-descriptions-item>
              <a-descriptions-item label="好评">{{ realtime.helpfulCount || 0 }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>

      <!-- Intent Distribution -->
      <a-card v-if="dashboard.intentDistribution?.length" title="意图分布" size="small" class="mb-4">
        <div class="flex flex-wrap gap-4">
          <a-tag v-for="item in dashboard.intentDistribution" :key="item.intent" color="blue">
            {{ intentLabel(item.intent) }}: {{ item.count }} ({{ (item.percentage * 100).toFixed(0) }}%)
          </a-tag>
        </div>
      </a-card>

      <!-- Quick Links -->
      <a-card title="快捷入口" size="small">
        <a-space>
          <a-button type="primary" ghost @click="$router.push('/conversations')">对话管理</a-button>
          <a-button type="primary" ghost @click="$router.push('/knowledge')">知识库管理</a-button>
          <a-button type="primary" ghost @click="$router.push('/work-orders')">工单管理</a-button>
        </a-space>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import StatCard from '~/components/common/StatCard.vue'
import { analyticsApi } from '~/api/analytics.api'

const loading = ref(false)
const dateRange = ref<any[]>([dayjs().subtract(7, 'day'), dayjs()])
const dashboard = ref<Record<string, any>>({
  totalConversations: 0,
  totalMessages: 0,
  activeConversations: 0,
  avgConfidence: 0,
  transferRate: 0,
  helpfulRate: 0,
  avgResponseTimeMs: 0,
  intentDistribution: [],
})
const realtime = ref<Record<string, any>>({})

function intentLabel(intent: string): string {
  const map: Record<string, string> = {
    product_inquiry: '产品咨询',
    price: '询价',
    after_sales: '售后',
    chat: '闲聊',
    transfer: '转人工',
  }
  return map[intent] || intent
}

async function fetchDashboard() {
  loading.value = true
  try {
    const data = await analyticsApi.getDashboard({
      startDate: dateRange.value[0]?.format('YYYY-MM-DD'),
      endDate: dateRange.value[1]?.format('YYYY-MM-DD'),
    })
    if (data) dashboard.value = data
    realtime.value = data?.realtime || {}
  } catch {
    // Silently handle
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchDashboard())
</script>
