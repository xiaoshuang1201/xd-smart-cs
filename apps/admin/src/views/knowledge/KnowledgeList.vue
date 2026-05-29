<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">知识库管理</h2>
      <a-button type="primary" @click="$router.push('/knowledge/upload')">+ 上传文档</a-button>
    </div>

    <a-card size="small" class="mb-4">
      <a-form layout="inline">
        <a-form-item label="状态">
          <a-select v-model:value="filters.status" style="width: 140px" allow-clear placeholder="全部">
            <a-select-option value="active">已启用</a-select-option>
            <a-select-option value="processing">处理中</a-select-option>
            <a-select-option value="error">失败</a-select-option>
            <a-select-option value="archived">已归档</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="搜索">
          <a-input v-model:value="filters.keyword" placeholder="文档标题..." style="width: 200px" allow-clear />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchData">查询</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="{ current: page, pageSize, total }"
      row-key="id"
      size="middle"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'"><StatusTag :status="record.status" /></template>
        <template v-if="column.key === 'fileType'"><a-tag>{{ record.fileType?.toUpperCase() }}</a-tag></template>
        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="$router.push(`/knowledge/${record.id}`)">预览</a-button>
          <a-button type="link" size="small" @click="handleDelete(record.id)" danger>删除</a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import StatusTag from '~/components/common/StatusTag.vue'
import { knowledgeApi } from '~/api/knowledge.api'

const filters = reactive({ status: '', keyword: '' })
const items = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const columns = [
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '版本', dataIndex: 'version', width: 80 },
  { title: '类型', key: 'fileType', width: 80 },
  { title: '状态', key: 'status', width: 100 },
  { title: '分块', dataIndex: 'chunkCount', width: 70 },
  { title: '操作', key: 'action', width: 140 },
]

async function fetchData() {
  loading.value = true
  try {
    const data = await knowledgeApi.list({
      page: page.value,
      pageSize: pageSize.value,
      ...(filters.status && { status: filters.status }),
      ...(filters.keyword && { keyword: filters.keyword }),
    })
    if (data) {
      items.value = data.items || []
      total.value = data.total || 0
    }
  } finally { loading.value = false }
}

function handleTableChange(pag: { current?: number; pageSize?: number }) {
  page.value = pag.current || 1
  pageSize.value = pag.pageSize || 20
  fetchData()
}

async function handleDelete(id: string) {
  try {
    await knowledgeApi.remove(id)
    fetchData()
  } catch { /* ignore */ }
}

onMounted(() => fetchData())
</script>
