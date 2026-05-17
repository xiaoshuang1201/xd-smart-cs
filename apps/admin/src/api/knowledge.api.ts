import { http } from './request'

export const knowledgeApi = {
  list(params?: Record<string, unknown>) {
    return http.get('/admin/knowledge', { params }).then((r) => r.data.data)
  },
  getDetail(id: string) {
    return http.get(`/admin/knowledge/${id}`).then((r) => r.data.data)
  },
  upload(formData: FormData) {
    return http
      .post('/admin/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data)
  },
  update(id: string, data: Record<string, unknown>) {
    return http.patch(`/admin/knowledge/${id}`, data).then((r) => r.data.data)
  },
  remove(id: string) {
    return http.delete(`/admin/knowledge/${id}`).then((r) => r.data.data)
  },
  reprocess(id: string) {
    return http.post(`/admin/knowledge/${id}/reprocess`).then((r) => r.data.data)
  },
  search(query: string, topK = 5, threshold = 0.7) {
    return http.post('/admin/knowledge/search', { query, topK, threshold }).then((r) => r.data.data)
  },
}
