<template>
  <div class="message-item" :class="message.role === 'user' ? 'user' : 'assistant'">
    <!-- AI Avatar -->
    <div v-if="message.role === 'assistant'" class="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs">
      🤖
    </div>

    <div class="message-bubble" :class="message.role">
      <MarkdownRenderer v-if="message.role === 'assistant'" :content="message.content" />
      <span v-else class="whitespace-pre-wrap">{{ message.content }}</span>

      <!-- 引用来源 -->
      <div
        v-if="message.role === 'assistant' && message.retrievalSources?.length"
        class="mt-2 pt-2 border-t border-gray-100"
      >
        <details class="text-xs text-gray-400">
          <summary class="cursor-pointer hover:text-brand-600">
            📎 来源: {{ message.retrievalSources.length }} 个参考文档
          </summary>
          <div
            v-for="(src, i) in message.retrievalSources"
            :key="i"
            class="mt-1 text-gray-500"
          >
            {{ src.documentTitle }} (相似度: {{ (src.score * 100).toFixed(0) }}%)
          </div>
        </details>
      </div>

      <!-- 反馈按钮 -->
      <ChatSatisfaction
        v-if="message.role === 'assistant' && !message.feedback"
        :message-id="message.id"
        @rate="(mid, r) => $emit('rate', mid, r)"
      />

      <div class="text-xs text-gray-300 mt-1">
        {{ formatTime(message.createdAt) }}
        <span v-if="message.tokensUsed" class="ml-2">Token: {{ message.tokensUsed }}</span>
      </div>
    </div>

    <!-- 间距占位 -->
    <div v-if="message.role === 'user'" class="flex-shrink-0 w-7" />
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/types/chat.types'
import { formatTime } from '~/utils/format'

defineProps<{ message: ChatMessage }>()
defineEmits<{ rate: [messageId: string, rating: 'helpful' | 'unhelpful'] }>()
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}
.message-item.user {
  justify-content: flex-end;
}
.message-bubble {
  max-width: 80%;
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
}
.message-bubble.user {
  background: #FFF2E8;
  color: #6B1C06;
  border-bottom-right-radius: 0.25rem;
}
.message-bubble.assistant {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 0.25rem;
}
</style>
