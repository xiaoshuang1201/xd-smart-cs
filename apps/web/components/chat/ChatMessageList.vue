<template>
  <div ref="containerRef" class="chat-message-list" @scroll="$emit('scroll')">
    <!-- 欢迎消息 -->
    <div v-if="messages.length === 0" class="px-4 py-8 text-center">
      <div class="text-4xl mb-3">🤖</div>
      <p class="text-gray-500 text-sm">{{ greeting }}</p>
      <ChatQuickQuestions
        v-if="suggestedQuestions.length"
        :questions="suggestedQuestions"
        @select="(q) => $emit('quickSelect', q)"
      />
    </div>

    <ChatMessageItem
      v-for="msg in messages"
      :key="msg.id"
      :message="msg"
      @rate="(mid, r) => $emit('rate', mid, r)"
    />

    <!-- AI 输入中 -->
    <div v-if="isStreaming && typingText" class="message-item assistant px-4 py-2">
      <div class="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs">
        🤖
      </div>
      <div class="message-bubble assistant">
        <MarkdownRenderer :content="typingText" />
      </div>
    </div>

    <ChatTypingIndicator v-if="isStreaming && !typingText" />

    <!-- 转人工确认 -->
    <ChatTransferConfirm
      v-if="needTransfer"
      message="您的问题比较复杂，是否为您转接人工客服？"
      @confirm="(c) => $emit('transfer', c)"
      @cancel="$emit('cancelTransfer')"
    />
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/types/chat.types'

defineProps<{
  messages: ChatMessage[]
  greeting: string
  suggestedQuestions: string[]
  isStreaming: boolean
  typingText: string
  needTransfer: boolean
}>()

defineEmits<{
  scroll: []
  quickSelect: [question: string]
  rate: [messageId: string, rating: 'helpful' | 'unhelpful']
  transfer: [contact: string]
  cancelTransfer: []
}>()

const containerRef = ref<HTMLElement | null>(null)
defineExpose({ containerRef })
</script>

<style scoped>
.chat-message-list {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.message-item {
  display: flex;
  gap: 0.5rem;
}
.message-bubble {
  max-width: 80%;
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
}
.message-bubble.assistant {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 0.25rem;
}
</style>
