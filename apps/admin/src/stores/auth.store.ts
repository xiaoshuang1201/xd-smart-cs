import { defineStore } from 'pinia'
import { authApi } from '~/api/auth.api'

interface AdminUser {
  id: string
  username: string
  displayName: string
  role: string
  avatarUrl?: string
  email?: string
  lastLoginAt?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoggedIn = computed(() => !!accessToken.value)
  const router = useRouter()

  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    refreshToken.value = refresh
    try {
      localStorage.setItem('xd_admin_tokens', JSON.stringify({ access, refresh }))
    } catch { /* ignore */ }
  }

  function loadTokens(): boolean {
    try {
      const saved = localStorage.getItem('xd_admin_tokens')
      if (saved) {
        const { access, refresh } = JSON.parse(saved)
        accessToken.value = access
        refreshToken.value = refresh
        return true
      }
    } catch { /* ignore */ }
    return false
  }

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password)
    setTokens(res.accessToken, res.refreshToken)
    user.value = res.user
  }

  async function fetchProfile() {
    try {
      const res = await authApi.getMe()
      user.value = res
    } catch {
      logout()
    }
  }

  async function refreshAccessToken() {
    if (!refreshToken.value) throw new Error('No refresh token')
    const res = await authApi.refresh(refreshToken.value)
    accessToken.value = res.accessToken
    try {
      const saved = localStorage.getItem('xd_admin_tokens')
      if (saved) {
        const data = JSON.parse(saved)
        data.access = res.accessToken
        localStorage.setItem('xd_admin_tokens', JSON.stringify(data))
      }
    } catch { /* ignore */ }
  }

  function logout() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    try { localStorage.removeItem('xd_admin_tokens') } catch { /* ignore */ }
    router.push('/login')
  }

  return {
    user,
    accessToken,
    refreshToken,
    isLoggedIn,
    login,
    fetchProfile,
    refreshAccessToken,
    logout,
    loadTokens,
  }
})
