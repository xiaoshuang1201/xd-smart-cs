import { http } from './request'

export const agentApi = {
  getConfig() {
    return http.get('/admin/agent/config').then((r) => r.data.data)
  },
  updateConfig(data: Record<string, unknown>) {
    return http.put('/admin/agent/config', data).then((r) => r.data.data)
  },
  testQuery(query: string, config?: Record<string, unknown>) {
    return http.post('/admin/agent/test', { query, config }).then((r) => r.data.data)
  },
}
