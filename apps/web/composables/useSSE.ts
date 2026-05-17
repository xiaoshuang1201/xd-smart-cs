import type { SSEEvent } from '~/types/chat.types'

export function useSSE() {
  const eventSource = ref<EventSource | null>(null)
  const retryCount = ref(0)
  const maxRetries = 3

  function connect(
    url: string,
    onEvent: (event: SSEEvent) => void,
    onError?: (err: Event) => void,
  ): void {
    disconnect()

    const es = new EventSource(url)
    eventSource.value = es

    es.addEventListener('message', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent(data as SSEEvent)
      } catch {
        // Ignore parse errors for heartbeat etc
      }
    })

    es.addEventListener('token', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent({ type: 'token', ...data })
      } catch { /* ignore */ }
    })

    es.addEventListener('done', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent({ type: 'done', ...data })
      } catch { /* ignore */ }
    })

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent({ type: 'error', ...data })
      } catch { /* ignore */ }
      onError?.(e as unknown as Event)
    })

    es.addEventListener('need_transfer', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent({ type: 'need_transfer', ...data })
      } catch { /* ignore */ }
    })

    es.addEventListener('thinking', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent({ type: 'thinking', ...data })
      } catch { /* ignore */ }
    })

    es.addEventListener('searching', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent({ type: 'searching', ...data })
      } catch { /* ignore */ }
    })

    es.onerror = () => {
      disconnect()
      if (retryCount.value < maxRetries) {
        retryCount.value++
        const delay = Math.min(1000 * Math.pow(2, retryCount.value - 1), 30000)
        setTimeout(() => connect(url, onEvent, onError), delay)
      }
    }

    es.onopen = () => {
      retryCount.value = 0
    }
  }

  function disconnect(): void {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
  }

  return { connect, disconnect, retryCount }
}
