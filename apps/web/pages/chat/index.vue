<template>
  <div class="chat-fullscreen">
    <header class="chat-fs-header">
      <NuxtLink to="/" class="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        返回官网
      </NuxtLink>
      <div class="flex items-center gap-2">
        <span class="text-lg">🤖</span>
        <span class="font-semibold">新鼎电炉智能客服</span>
        <span class="flex items-center gap-1 text-xs text-green-500 ml-2">
          <span class="w-1.5 h-1.5 bg-green-500 rounded-full" />
          在线
        </span>
      </div>
      <div class="w-16" />
    </header>

    <div class="chat-fs-body" ref="bodyRef">
      <div v-if="store.messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <div class="text-5xl mb-4">🤖</div>
        <p class="text-lg mb-6">{{ greeting }}</p>
        <div class="flex flex-wrap gap-2 justify-center max-w-md">
          <button
            v-for="q in suggestedQuestions"
            :key="q"
            class="px-4 py-2 bg-gray-100 hover:bg-brand-50 text-gray-600 hover:text-brand-700 rounded-full text-sm transition-colors"
            @click="handleSend(q)"
          >
            {{ q }}
          </button>
        </div>
      </div>

      <div v-for="msg in store.messages" :key="msg.id" class="message-row" :class="msg.role">
        <div v-if="msg.role === 'assistant'" class="avatar">🤖</div>
        <div class="message-bubble" :class="msg.role">
          <MarkdownRenderer v-if="msg.role === 'assistant'" :content="msg.content" />
          <span v-else>{{ msg.content }}</span>
          <div class="text-xs text-gray-400 mt-1">{{ formatTime(msg.createdAt) }}</div>
        </div>
        <div v-if="msg.role === 'user'" class="avatar-user" />
      </div>

      <div v-if="store.isStreaming && typing.displayText.value" class="message-row assistant">
        <div class="avatar">🤖</div>
        <div class="message-bubble assistant">
          <MarkdownRenderer :content="typing.displayText.value" />
        </div>
      </div>
      <ChatTypingIndicator v-if="store.isStreaming && !typing.displayText.value" />
    </div>

    <div class="chat-fs-footer">
      <div class="max-w-3xl mx-auto flex items-end gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 focus-within:border-brand-500 transition-colors">
        <textarea
          ref="inputRef"
          v-model="inputText"
          class="flex-1 resize-none outline-none text-sm py-2 max-h-24"
          rows="1"
          placeholder="请输入您的问题..."
          :disabled="store.isStreaming"
          @keydown.enter.exact.prevent="handleSend(inputText)"
          @input="autoResize"
        />
        <button
          class="flex-shrink-0 w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-40"
          :disabled="!inputText.trim() || store.isStreaming"
          @click="handleSend(inputText)"
        >
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        </button>
      </div>
      <p class="text-xs text-gray-400 text-center mt-2">
        Powered by 新鼎电炉 · 智能客服
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTime } from '~/utils/format'
import { useChatStore } from '~/stores/chat.store'
import { useVisitor } from '~/composables/useVisitor'
import { useChat } from '~/composables/useChat'

const greeting = '您好！我是新鼎电炉智能客服，请问有什么可以帮您？'
const suggestedQuestions = ['IGBT中频炉有什么优势？', '如何选型？', '价格区间是多少？']

const store = useChatStore()
const { initSession } = useVisitor()
const { sendMessage, loadHistory, typing } = useChat()
const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 96) + 'px'
}

async function handleSend(content: string) {
  const text = content.trim()
  if (!text || store.isStreaming) return

  if (!store.sessionToken) {
    await initSession()
  }

  await sendMessage(text)
  inputText.value = ''
  nextTick(() => {
    const el = inputRef.value
    if (el) {
      el.style.height = 'auto'
      el.focus()
    }
  })
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const convId = params.get('conv')

  if (token && convId) {
    store.setSession(token, '', convId)
  }

  if (!store.sessionToken) {
    await initSession()
  }

  if (store.conversationId) {
    await loadHistory()
  }
})
</script>

<style scoped>
.chat-fullscreen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f9fafb;
}
.chat-fs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 56px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.chat-fs-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 0;
}
.chat-fs-footer {
  padding: 1rem 1.5rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.message-row {
  display: flex;
  gap: 0.75rem;
  max-width: 900px;
  margin: 0 auto;
  padding: 0.5rem 1.5rem;
}
.message-row.user {
  justify-content: flex-end;
}
.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}
.avatar-user {
  width: 2rem;
  flex-shrink: 0;
}
.message-bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  font-size: 0.9375rem;
  line-height: 1.6;
}
.message-bubble.user {
  background: #FFF2E8;
  color: #6B1C06;
  border-bottom-right-radius: 0.25rem;
}
.message-bubble.assistant {
  background: white;
  color: #1f2937;
  border-bottom-left-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>
