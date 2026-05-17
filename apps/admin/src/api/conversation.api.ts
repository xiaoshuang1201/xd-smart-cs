import { http } from './request'

export const conversationApi = {
  list(params?: Record<string, unknown>) {
    return http.get('/admin/conversations', { params }).then((r) => r.data.data)
  },
  getDetail(id: string, page = 1, pageSize = 50) {
    return http.get(`/admin/conversations/${id}`, { params: { page, pageSize } }).then((r) => r.data.data)
  },
  getStats() {
    return http.get('/admin/conversations/stats').then((r) => r.data.data)
  },
}
