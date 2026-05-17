export default defineNuxtRouteMiddleware(async () => {
  // 全局访客中间件：在每次页面导航时确保访客指纹已生成
  if (import.meta.server) return

  const { getStoredFingerprint, generateFingerprint, storeFingerprint } = await import(
    '~/utils/fingerprint'
  )

  let fp = getStoredFingerprint()
  if (!fp) {
    fp = generateFingerprint()
    storeFingerprint(fp)
  }
})
