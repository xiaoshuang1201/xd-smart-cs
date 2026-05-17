import { http } from './request'

export const workOrderApi = {
  list(params?: Record<string, unknown>) {
    return http.get('/admin/work-orders', { params }).then((r) => r.data.data)
  },
  getDetail(id: string) {
    return http.get(`/admin/work-orders/${id}`).then((r) => r.data.data)
  },
  update(id: string, data: Record<string, unknown>) {
    return http.patch(`/admin/work-orders/${id}`, data).then((r) => r.data.data)
  },
  getStats() {
    return http.get('/admin/work-orders/stats').then((r) => r.data.data)
  },
}
