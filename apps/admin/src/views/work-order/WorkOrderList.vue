<template>
  <div>
    <h2 class="text-xl font-bold mb-4">工单管理</h2>

    <a-card size="small" class="mb-4">
      <a-form layout="inline">
        <a-form-item label="状态">
          <a-select v-model:value="filters.status" style="width: 140px" allow-clear placeholder="全部">
            <a-select-option value="pending">待处理</a-select-option>
            <a-select-option value="processing">处理中</a-select-option>
            <a-select-option value="resolved">已解决</a-select-option>
            <a-select-option value="closed">已关闭</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="优先级">
          <a-select v-model:value="filters.priority" style="width: 120px" allow-clear placeholder="全部">
            <a-select-option value="urgent">紧急</a-select-option>
            <a-select-option value="high">高</a-select-option>
            <a-select-option value="medium">中</a-select-option>
            <a-select-option value="low">低</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchData">查询</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-row :gutter="16" class="mb-4">
      <a-col :span="6"><a-card size="small">待处理: <b>{{ stats.pending }}</b></a-card></a-col>
      <a-col :span="6"><a-card size="small">处理中: <b>{{ stats.processing }}</b></a-card></a-col>
      <a-col :span="6"><a-card size="small">已解决: <b>{{ stats.resolved }}</b></a-card></a-col>
      <a-col :span="6"><a-card size="small">已关闭: <b>{{ stats.closed }}</b></a-card></a-col>
    </a-row>

    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="{ current: page, pageSize, total }"
      row-key="id"
      size="middle"
      @change="handleTableChange"
      @row-click="(r) => $router.push(`/work-orders/${r.id}`)"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'"><StatusTag :status="record.status" /></template>
        <template v-if="column.key === 'priority'"><StatusTag :status="record.priority" /></template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import StatusTag from '~/components/common/StatusTag.vue'
import { workOrderApi } from '~/api/work-order.api'

const filters = reactive({ status: '', priority: '' })
const items = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const stats = ref({ pending: 0, processing: 0, resolved: 0, closed: 0 })

const columns = [
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '状态', key: 'status', width: 100 },
  { title: '优先级', key: 'priority', width: 80 },
  { title: '处理人', dataIndex: ['assignee', 'displayName'], width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
]

async function fetchData() {
  loading.value = true
  try {
    const [listData, statsData] = await Promise.all([
      workOrderApi.list({ page: page.value, pageSize: pageSize.value, ...filters }),
      workOrderApi.getStats(),
    ])
    if (listData) {
      items.value = listData.items || []
      total.value = listData.total || 0
    }
    if (statsData) stats.value = statsData
  } finally { loading.value = false }
}

function handleTableChange(pag: { current?: number; pageSize?: number }) {
  page.value = pag.current || 1; pageSize.value = pag.pageSize || 20; fetchData()
}

onMounted(() => fetchData())
</script>
