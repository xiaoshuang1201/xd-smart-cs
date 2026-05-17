<template>
  <div>
    <a-page-header title="工单详情" @back="$router.push('/work-orders')" />

    <a-card size="small" class="mb-4">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="editData.status" style="width: 100%">
                <a-select-option value="pending">待处理</a-select-option>
                <a-select-option value="processing">处理中</a-select-option>
                <a-select-option value="resolved">已解决</a-select-option>
                <a-select-option value="closed">已关闭</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="优先级">
              <a-select v-model:value="editData.priority" style="width: 100%">
                <a-select-option value="urgent">紧急</a-select-option>
                <a-select-option value="high">高</a-select-option>
                <a-select-option value="medium">中</a-select-option>
                <a-select-option value="low">低</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="处理备注">
          <a-textarea v-model:value="editData.resolutionNotes" :rows="3" placeholder="输入处理备注..." />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card v-if="wo" size="small" class="mb-4">
      <a-descriptions size="small" :column="2">
        <a-descriptions-item label="标题">{{ wo.title }}</a-descriptions-item>
        <a-descriptions-item label="联系方式">{{ wo.customerContact || '—' }}</a-descriptions-item>
        <a-descriptions-item label="状态"><StatusTag :status="wo.status" /></a-descriptions-item>
        <a-descriptions-item label="优先级"><StatusTag :status="wo.priority" /></a-descriptions-item>
        <a-descriptions-item label="AI摘要" :span="2">{{ wo.aiSummary || '—' }}</a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-card v-if="wo?.conversation?.messages" title="关联对话" size="small">
      <MessageTimeline :messages="wo.conversation.messages" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import StatusTag from '~/components/common/StatusTag.vue'
import MessageTimeline from '~/components/conversation/MessageTimeline.vue'
import { workOrderApi } from '~/api/work-order.api'

const route = useRoute()
const wo = ref<Record<string, any>>({})
const editData = reactive({ status: '', priority: '', resolutionNotes: '' })
const saving = ref(false)

async function fetchDetail() {
  try {
    const data = await workOrderApi.getDetail(route.params.id as string)
    if (data) {
      wo.value = data
      editData.status = data.status
      editData.priority = data.priority
      editData.resolutionNotes = data.resolutionNotes || ''
    }
  } catch { /* ignore */ }
}

async function handleSave() {
  saving.value = true
  try {
    await workOrderApi.update(route.params.id as string, editData)
    fetchDetail()
  } finally { saving.value = false }
}

onMounted(() => fetchDetail())
</script>
