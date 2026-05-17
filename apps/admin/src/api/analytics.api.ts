import { http } from './request'

export const analyticsApi = {
  getDashboard(params?: Record<string, unknown>) {
    return http.get('/admin/analytics/dashboard', { params }).then((r) => r.data.data)
  },
  getConversationStats() {
    return http.get('/admin/analytics/conversations').then((r) => r.data.data)
  },
  getKnowledgeStats() {
    return http.get('/admin/analytics/knowledge').then((r) => r.data.data)
  },
}
