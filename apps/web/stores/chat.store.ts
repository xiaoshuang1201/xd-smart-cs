import { defineStore } from 'pinia'
import type { ChatMessage, PageContext } from '~/types/chat.types'

export const useChatStore = defineStore('chat', () => {
  const sessionToken = ref<string | null>(null)
  const csrfToken = ref<string | null>(null)
  const conversationId = ref<string | null>(null)
  const messages = ref<ChatMessage[]>([])
  const isOpen = ref(false)
  const isMinimized = ref(false)
  const isStreaming = ref(false)
  const unreadCount = ref(0)
  const pageContext = ref<PageContext | null>(null)
  const needTransfer = ref(false)

  function setSession(token: string, csrf: string, convId: string) {
    sessionToken.value = token
    csrfToken.value = csrf
    conversationId.value = convId
    try {
      localStorage.setItem('xd_session', JSON.stringify({ token, csrf, convId }))
    } catch { /* ignore */ }
  }

  function loadSession(): boolean {
    try {
      const saved = localStorage.getItem('xd_session')
      if (saved) {
        const { token, csrf, convId } = JSON.parse(saved)
        sessionToken.value = token
        csrfToken.value = csrf
        conversationId.value = convId
        return true
      }
    } catch { /* ignore */ }
    return false
  }

  function clearSession() {
    sessionToken.value = null
    csrfToken.value = null
    conversationId.value = null
    messages.value = []
    try { localStorage.removeItem('xd_session') } catch { /* ignore */ }
  }

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
  }

  function updateLastAssistant(content: string) {
    const last = messages.value.filter((m) => m.role === 'assistant').pop()
    if (last) {
      last.content = content
    }
  }

  function open() {
    isOpen.value = true
    isMinimized.value = false
    unreadCount.value = 0
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    if (isOpen.value) {
      isMinimized.value = !isMinimized.value
      if (isMinimized.value) {
        isOpen.value = false
      }
    } else {
      open()
    }
  }

  function setStreaming(val: boolean) {
    isStreaming.value = val
  }

  function setPageContext(ctx: PageContext) {
    pageContext.value = ctx
  }

  return {
    sessionToken,
    csrfToken,
    conversationId,
    messages,
    isOpen,
    isMinimized,
    isStreaming,
    unreadCount,
    pageContext,
    needTransfer,
    setSession,
    loadSession,
    clearSession,
    addMessage,
    updateLastAssistant,
    open,
    close,
    toggle,
    setStreaming,
    setPageContext,
  }
})
