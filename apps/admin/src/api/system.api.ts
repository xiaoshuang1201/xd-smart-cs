import { http } from './request'

export const systemApi = {
  getConfigs() {
    return http.get('/admin/system/configs').then((r) => r.data.data)
  },
  updateConfig(key: string, value: unknown) {
    return http.put(`/admin/system/configs/${key}`, { value }).then((r) => r.data.data)
  },
  clearCache(type?: string) {
    return http.post('/admin/system/cache/clear', { type }).then((r) => r.data.data)
  },
  getUsers() {
    return http.get('/admin/system/users').then((r) => r.data.data)
  },
  createUser(data: Record<string, unknown>) {
    return http.post('/admin/system/users', data).then((r) => r.data.data)
  },
}
