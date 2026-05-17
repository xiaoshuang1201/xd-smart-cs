import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

const apiBase = import.meta.env.VITE_API_BASE || '/api/v1'

const instance: AxiosInstance = axios.create({
  baseURL: apiBase,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach token
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const saved = localStorage.getItem('xd_admin_tokens')
    if (saved) {
      const { access } = JSON.parse(saved)
      if (access) {
        config.headers.Authorization = `Bearer ${access}`
      }
    }
  } catch { /* ignore */ }
  return config
})

// Response interceptor — token refresh on 401
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: Error) => void
}> = []

function processQueue(error: Error | null, token: string | null) {
  failedQueue.forEach((p) => {
    if (error || !token) p.reject(error || new Error('Refresh failed'))
    else p.resolve(token)
  })
  failedQueue = []
}

instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(instance(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const saved = localStorage.getItem('xd_admin_tokens')
        if (!saved) throw new Error('No tokens')
        const { refresh } = JSON.parse(saved)
        const { data } = await axios.post(`${apiBase}/admin/auth/refresh`, { refreshToken: refresh })

        const newAccess = data.data.accessToken
        const tokens = JSON.parse(saved)
        tokens.access = newAccess
        localStorage.setItem('xd_admin_tokens', JSON.stringify(tokens))

        processQueue(null, newAccess)
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return instance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        localStorage.removeItem('xd_admin_tokens')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

export { instance as http }
