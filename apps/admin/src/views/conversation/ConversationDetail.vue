<template>
  <div>
    <a-page-header title="对话详情" @back="() => $router.push('/conversations')">
      <template #tags>
        <StatusTag v-if="detail.status" :status="detail.status" />
      </template>
    </a-page-header>

    <a-spin :spinning="loading">
      <!-- Visitor Info -->
      <a-card size="small" class="mb-4" title="访客信息">
        <VisitorInfoCard :visitor="detail.visitor" :source-page="detail.sourcePage" :status="detail.status" />
      </a-card>

      <!-- Messages Timeline -->
      <a-card title="对话记录" size="small" class="mb-4">
        <a-empty v-if="!detail.messages?.length && !loading" description="暂无消息" />
        <MessageTimeline v-else :messages="detail.messages || []" />
      </a-card>

      <!-- Linked Work Order -->
      <a-card v-if="detail.workOrder" title="关联工单" size="small">
        <a-descriptions size="small" :column="2">
          <a-descriptions-item label="工单ID">
            <a @click="$router.push(`/work-orders/${detail.workOrder.id}`)">{{ detail.workOrder.id }}</a>
          </a-descriptions-item>
          <a-descriptions-item label="状态"><StatusTag :status="detail.workOrder.status" /></a-descriptions-item>
          <a-descriptions-item label="标题">{{ detail.workOrder.title }}</a-descriptions-item>
          <a-descriptions-item label="优先级"><StatusTag :status="detail.workOrder.priority" /></a-descriptions-item>
        </a-descriptions>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import StatusTag from '~/components/common/StatusTag.vue'
import VisitorInfoCard from '~/components/conversation/VisitorInfoCard.vue'
import MessageTimeline from '~/components/conversation/MessageTimeline.vue'
import { conversationApi } from '~/api/conversation.api'

const route = useRoute()
const loading = ref(false)
const detail = ref<Record<string, any>>({})

async function fetchDetail() {
  loading.value = true
  try {
    const data = await conversationApi.getDetail(route.params.id as string)
    if (data) detail.value = data
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchDetail())
</script>
