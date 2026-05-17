<template>
  <div>
    <h2 class="text-xl font-bold mb-4">对话管理</h2>

    <a-card size="small" class="mb-4">
      <a-form layout="inline">
        <a-form-item label="状态">
          <a-select v-model:value="filters.status" style="width: 140px" allow-clear placeholder="全部">
            <a-select-option value="active">进行中</a-select-option>
            <a-select-option value="closed">已关闭</a-select-option>
            <a-select-option value="transferred">已转人工</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="关键词">
          <a-input v-model:value="filters.keyword" placeholder="搜索..." style="width: 200px" allow-clear />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchData">查询</a-button>
          <a-button class="ml-2" @click="resetFilters">重置</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="{ current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: ['10','20','50'] }"
      row-key="id"
      size="middle"
      @change="handleTableChange"
      @row-click="(r) => $router.push(`/conversations/${r.id}`)"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <StatusTag :status="record.status" />
        </template>
        <template v-if="column.key === 'firstMessage'">
          <span class="text-gray-600">{{ record.firstMessage?.slice(0, 40) || record.sourcePage?.slice(0, 40) || '—' }}</span>
        </template>
        <template v-if="column.key === 'createdAt'">
          {{ new Date(record.createdAt).toLocaleString('zh-CN') }}
        </template>
        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click.stop="$router.push(`/conversations/${record.id}`)">详情</a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import StatusTag from '~/components/common/StatusTag.vue'
import { conversationApi } from '~/api/conversation.api'

const filters = reactive({ status: '', keyword: '' })
const items = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const columns = [
  { title: '状态', key: 'status', width: 100 },
  { title: '首条消息', key: 'firstMessage', ellipsis: true },
  { title: '消息数', dataIndex: 'messageCount', width: 80 },
  { title: '置信度', dataIndex: 'agentConfidence', width: 80, align: 'center' },
  { title: '创建时间', key: 'createdAt', width: 170 },
  { title: '操作', key: 'action', width: 80 },
]

async function fetchData() {
  loading.value = true
  try {
    const data = await conversationApi.list({
      page: page.value,
      pageSize: pageSize.value,
      ...(filters.status && { status: filters.status }),
      ...(filters.keyword && { keyword: filters.keyword }),
    })
    if (data) {
      items.value = data.items || []
      total.value = data.total || 0
    }
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.status = ''
  filters.keyword = ''
  page.value = 1
  fetchData()
}

function handleTableChange(pag: { current: number; pageSize: number }) {
  page.value = pag.current
  pageSize.value = pag.pageSize
  fetchData()
}

onMounted(() => fetchData())
</script>
