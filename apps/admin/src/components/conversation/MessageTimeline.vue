<template>
  <div class="message-timeline">
    <div v-for="msg in messages" :key="msg.id" class="message-item" :class="msg.role">
      <div class="flex items-start gap-3">
        <div :class="msg.role === 'user' ? 'avatar-user' : 'avatar-ai'">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-medium text-gray-500">
              {{ msg.role === 'user' ? '访客' : 'AI助手' }}
            </span>
            <span class="text-xs text-gray-400">{{ msg.createdAt }}</span>
            <a-tag v-if="msg.intent" color="blue" class="text-xs">{{ msg.intent }}</a-tag>
            <a-tag v-if="msg.confidenceScore" :color="msg.confidenceScore >= 0.7 ? 'green' : 'orange'" class="text-xs">
              置信度: {{ (msg.confidenceScore * 100).toFixed(0) }}%
            </a-tag>
          </div>
          <div class="message-content">{{ msg.content }}</div>
          <div v-if="msg.feedback" class="text-xs text-gray-400 mt-1">
            用户评价: {{ msg.feedback === 'helpful' ? '👍 有用' : '👎 无用' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TimelineMessage {
  id: string
  role: string
  content: string
  intent?: string
  confidenceScore?: number
  feedback?: string
  createdAt: string
}

defineProps<{ messages: TimelineMessage[] }>()
</script>

<style scoped>
.message-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.avatar-user,
.avatar-ai {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.avatar-ai {
  background: #dbeafe;
}
.avatar-user {
  background: #f3f4f6;
}
.message-content {
  background: #f9fafb;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
