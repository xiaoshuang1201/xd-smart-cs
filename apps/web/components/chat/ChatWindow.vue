<template>
  <Transition name="chat-slide">
    <div v-if="store.isOpen" class="chat-window" :class="{ mobile: isMobile }">
      <ChatHeader
        @minimize="store.close()"
        @close="handleClose"
        @toggle-fullscreen="goFullscreen"
      />

      <ChatMessageList
        :messages="store.messages"
        :greeting="greeting"
        :suggested-questions="suggestedQuestions"
        :is-streaming="store.isStreaming"
        :typing-text="typing.displayText.value"
        :need-transfer="store.needTransfer"
        @quick-select="handleSend"
        @rate="handleRate"
        @transfer="handleTransfer"
        @cancel-transfer="store.needTransfer = false"
      />

      <ChatInput
        :disabled="store.isStreaming"
        @send="handleSend"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useChatStore } from '~/stores/chat.store'

const props = withDefaults(
  defineProps<{
    greeting?: string
    suggestedQuestions?: string[]
  }>(),
  {
    greeting: '您好！我是新鼎电炉智能客服，请问有什么可以帮您？',
    suggestedQuestions: () => ['IGBT中频炉有什么优势？', '如何选型？', '价格区间是多少？'],
  },
)

const store = useChatStore()
const isMobile = ref(false)

const { sendMessage, submitFeedback, requestTransfer, disconnectSSE, typing } = useChat()

function handleSend(content: string) {
  sendMessage(content)
}

function handleRate(messageId: string, rating: 'helpful' | 'unhelpful') {
  submitFeedback(messageId, rating)
}

function handleTransfer(contact: string) {
  requestTransfer(contact)
}

function handleClose() {
  disconnectSSE()
  store.close()
}

function goFullscreen() {
  const params = new URLSearchParams()
  if (store.sessionToken) params.set('token', store.sessionToken)
  if (store.conversationId) params.set('conv', store.conversationId)
  window.open(`/chat?${params.toString()}`, '_blank')
}

onMounted(() => {
  isMobile.value = window.innerWidth < 640
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 640
  })
})
</script>

<style scoped>
.chat-window {
  position: fixed;
  bottom: 88px;
  right: 24px;
  width: 380px;
  height: 560px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 9999;
}
.chat-window.mobile {
  width: 100vw;
  height: 100vh;
  bottom: 0;
  right: 0;
  border-radius: 0;
}

.chat-slide-enter-active {
  transition: all 0.3s ease-out;
}
.chat-slide-leave-active {
  transition: all 0.2s ease-in;
}
.chat-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
