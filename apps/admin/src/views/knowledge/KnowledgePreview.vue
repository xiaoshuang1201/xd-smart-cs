<template>
  <div>
    <a-page-header :title="`文档预览 - ${doc.title || ''}`" @back="$router.push('/knowledge')" />

    <a-card size="small" class="mb-4">
      <a-descriptions size="small" :column="3">
        <a-descriptions-item label="类型">{{ doc.fileType?.toUpperCase() }}</a-descriptions-item>
        <a-descriptions-item label="状态"><StatusTag :status="doc.status" /></a-descriptions-item>
        <a-descriptions-item label="分块数">{{ doc.chunkCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="版本">{{ doc.version }}</a-descriptions-item>
        <a-descriptions-item label="大小">{{ formatSize(doc.fileSize) }}</a-descriptions-item>
        <a-descriptions-item label="Token">{{ doc.totalTokens || '—' }}</a-descriptions-item>
      </a-descriptions>
      <a-space class="mt-2">
        <a-button size="small" @click="handleReprocess" :loading="reprocessing">重新处理</a-button>
        <a-button size="small" danger @click="handleDelete">删除</a-button>
      </a-space>
    </a-card>

    <a-card title="检索测试" size="small" class="mb-4">
      <a-input-search
        v-model:value="searchQuery"
        placeholder="输入问题测试检索..."
        enter-button="检索"
        :loading="searching"
        @search="handleSearch"
      />
      <div v-if="searchResults.length" class="mt-3">
        <div v-for="(r, i) in searchResults" :key="i" class="search-result-item">
          <div class="flex items-center gap-2 mb-1">
            <a-tag color="blue">#{{ i + 1 }}</a-tag>
            <span class="text-xs text-gray-400">相似度: {{ (r.score * 100).toFixed(1) }}%</span>
            <span class="text-xs text-gray-400">来自: {{ r.documentTitle }}</span>
          </div>
          <p class="text-sm text-gray-700">{{ r.content?.slice(0, 300) }}</p>
        </div>
      </div>
    </a-card>

    <a-card title="分块列表" size="small">
      <div v-for="chunk in doc.chunks || []" :key="chunk.id" class="chunk-item">
        <div class="text-xs text-gray-400 mb-1">#{{ chunk.chunkIndex }} ({{ chunk.tokenCount }} tokens)</div>
        <p class="text-sm text-gray-700">{{ chunk.content?.slice(0, 200) }}</p>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import StatusTag from '~/components/common/StatusTag.vue'
import { knowledgeApi } from '~/api/knowledge.api'

const route = useRoute()
const doc = ref<Record<string, any>>({})
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searching = ref(false)
const reprocessing = ref(false)

async function fetchDoc() {
  try {
    const data = await knowledgeApi.getDetail(route.params.id as string)
    if (data) doc.value = data
  } catch { /* ignore */ }
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  try {
    const data = await knowledgeApi.search(searchQuery.value)
    if (data?.retrievalResults) searchResults.value = data.retrievalResults
  } finally { searching.value = false }
}

async function handleReprocess() {
  reprocessing.value = true
  try {
    await knowledgeApi.reprocess(route.params.id as string)
    fetchDoc()
  } finally { reprocessing.value = false }
}

async function handleDelete() {
  await knowledgeApi.remove(route.params.id as string)
  useRouter().push('/knowledge')
}

function formatSize(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}

onMounted(() => fetchDoc())
</script>

<style scoped>
.search-result-item {
  padding: 10px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 8px;
}
.chunk-item {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}
</style>
