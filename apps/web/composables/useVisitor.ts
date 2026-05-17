import { generateFingerprint, getStoredFingerprint, storeFingerprint } from '~/utils/fingerprint'
import { useChatStore } from '~/stores/chat.store'
import type { SessionData } from '~/types/chat.types'

export function useVisitor() {
  const store = useChatStore()
  const config = useRuntimeConfig()

  async function initSession(): Promise<void> {
    if (store.loadSession()) return

    let fingerprint = getStoredFingerprint()
    if (!fingerprint) {
      fingerprint = generateFingerprint()
      storeFingerprint(fingerprint)
    }

    const body: Record<string, unknown> = {
      fingerprint,
      sourcePage: window.location.href,
    }

    if (store.pageContext) {
      body.sourceContext = store.pageContext
    }

    const { data } = await useFetch<{ code: number; data: SessionData }>(
      `${config.public.apiBase}/v1/auth/session`,
      {
        method: 'POST',
        body,
      },
    )

    if (data.value?.data) {
      const session = data.value.data
      store.setSession(session.sessionToken, session.csrfToken, session.conversationId)
    }
  }

  return { initSession }
}
