import { useChatStore } from '~/stores/chat.store'
import { useSSE } from './useSSE'
import { useTyping } from './useTyping'
import { useScrollToBottom } from './useScrollToBottom'
import type { ChatMessage, SSEEvent, SendMessageResponse } from '~/types/chat.types'

export function useChat() {
  const store = useChatStore()
  const config = useRuntimeConfig()
  const { connect, disconnect } = useSSE()
  const typing = useTyping()
  const messageContainer = ref<HTMLElement | null>(null)
  const { scrollToBottom, onScroll, reset } = useScrollToBottom(messageContainer)

  watch(
    () => store.messages.length,
    () => {
      nextTick(() => scrollToBottom())
    },
  )

  watch(typing.displayText, () => {
    nextTick(() => scrollToBottom())
  })

  async function sendMessage(content: string): Promise<void> {
    if (!store.sessionToken || !store.conversationId) return

    const { data } = await useFetch<{ code: number; data: any }>(
      `${config.public.apiBase}/v1/conversations/${store.conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'X-Session-Token': store.sessionToken,
          'X-CSRF-Token': store.csrfToken || '',
        },
        body: { content },
      },
    )

    if (data.value?.data) {
      const d = data.value.data
      // 存储用户消息
      store.addMessage({
        id: d.messageId,
        role: 'user',
        content: d.content,
        createdAt: d.createdAt,
      })

      // 后端同步返回了 AI 回复
      if (d.reply?.content) {
        store.addMessage({
          id: d.reply.messageId,
          role: 'assistant',
          content: d.reply.content,
          intent: d.reply.intent,
          confidenceScore: d.reply.confidenceScore,
          retrievalSources: d.reply.retrievalSources,
          tokensUsed: d.reply.tokensUsed,
          createdAt: d.reply.createdAt,
        })
      }

      // 如果后端有 SSE 流，也连接上监听
      if (d.sseStreamUrl) {
        connectSSE(d.sseStreamUrl)
      }
    }
  }

  function connectSSE(url: string) {
    const fullUrl = url.startsWith('http') ? url : `${config.public.apiBase}${url}`

    connect(
      fullUrl,
      (event: SSEEvent) => {
        switch (event.type) {
          case 'token':
            typing.start((typing.fullText || '') + event.content)
            break
          case 'done': {
            typing.finish()
            // 避免重复添加（同步返回已经加了）
            if (event.fullContent) {
              const exists = store.messages.find(
                (m) => m.id === event.messageId && m.role === 'assistant',
              )
              if (!exists) {
                store.addMessage({
                  id: event.messageId,
                  role: 'assistant',
                  content: event.fullContent,
                  intent: event.intent,
                  confidenceScore: event.confidenceScore,
                  retrievalSources: event.retrievalSources,
                  tokensUsed: event.tokensUsed,
                  createdAt: new Date().toISOString(),
                })
              }
            }
            store.setStreaming(false)
            break
          }
          case 'error':
            store.setStreaming(false)
            break
          case 'need_transfer':
            store.needTransfer = true
            break
        }
      },
      () => {
        store.setStreaming(false)
      },
    )
  }

  async function loadHistory(page = 1): Promise<void> {
    if (!store.sessionToken || !store.conversationId) return

    const { data } = await useFetch<{ code: number; data: ChatMessage[] }>(
      `${config.public.apiBase}/v1/conversations/${store.conversationId}/messages`,
      {
        headers: { 'X-Session-Token': store.sessionToken },
        params: { page, pageSize: 50, order: 'asc' },
      },
    )

    if (data.value?.data) {
      store.messages = data.value.data
      nextTick(() => reset())
    }
  }

  async function submitFeedback(messageId: string, rating: 'helpful' | 'unhelpful'): Promise<void> {
    if (!store.sessionToken) return
    await useFetch(`${config.public.apiBase}/v1/messages/${messageId}/feedback`, {
      method: 'POST',
      headers: {
        'X-Session-Token': store.sessionToken,
        'X-CSRF-Token': store.csrfToken || '',
      },
      body: { rating },
    })
  }

  async function requestTransfer(contact: string): Promise<void> {
    if (!store.sessionToken || !store.conversationId) return
    await useFetch(
      `${config.public.apiBase}/v1/conversations/${store.conversationId}/transfer`,
      {
        method: 'POST',
        headers: {
          'X-Session-Token': store.sessionToken,
          'X-CSRF-Token': store.csrfToken || '',
        },
        body: { reason: '用户请求', contact },
      },
    )
    store.needTransfer = false
  }

  return {
    messageContainer,
    typing,
    sendMessage,
    loadHistory,
    submitFeedback,
    requestTransfer,
    onScroll,
    disconnectSSE: disconnect,
    scrollToBottom: () => scrollToBottom(),
  }
}
