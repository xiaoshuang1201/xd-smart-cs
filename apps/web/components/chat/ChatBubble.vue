<template>
  <div>
    <Transition name="bubble-btn">
      <button
        v-if="!store.isOpen"
        class="chat-trigger-btn"
        @click="handleOpen"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span v-if="store.unreadCount > 0" class="unread-badge">{{ store.unreadCount > 99 ? '99+' : store.unreadCount }}</span>
      </button>
    </Transition>

    <ChatWindow :greeting="greeting" :suggested-questions="suggestedQuestions" />
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '~/stores/chat.store'
import { useVisitor } from '~/composables/useVisitor'

const props = withDefaults(
  defineProps<{ greeting?: string; suggestedQuestions?: string[] }>(),
  {
    greeting: '您好！我是新鼎电炉智能客服，请问有什么可以帮您？',
    suggestedQuestions: () => ['IGBT中频炉有什么优势？', '如何选型？', '价格区间是多少？'],
  },
)

const store = useChatStore()
const { initSession } = useVisitor()

async function handleOpen() {
  if (!store.sessionToken) await initSession()
  store.open()
}
</script>

<style scoped>
.chat-trigger-btn {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 58px;
  height: 58px;
  background: linear-gradient(135deg, #FA8C33, #D4380D);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 24px rgba(212, 56, 13, 0.35);
  cursor: pointer;
  border: none;
  transition: transform 0.3s, box-shadow 0.3s;
  z-index: 9999;
}
.chat-trigger-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 10px 32px rgba(212, 56, 13, 0.5);
}
.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  background: #FA8C33;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 2px solid white;
}
.bubble-btn-enter-active,
.bubble-btn-leave-active { transition: all 0.25s ease; }
.bubble-btn-enter-from,
.bubble-btn-leave-to { opacity: 0; transform: scale(0.75); }
</style>
