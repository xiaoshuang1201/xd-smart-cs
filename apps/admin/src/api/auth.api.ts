import { http } from './request'

export const authApi = {
  login(username: string, password: string) {
    return http.post('/admin/auth/login', { username, password }).then((r) => r.data.data)
  },
  register(data: { username: string; password: string; email?: string; displayName?: string }) {
    return http.post('/admin/auth/register', data).then((r) => r.data.data)
  },
  refresh(refreshToken: string) {
    return http.post('/admin/auth/refresh', { refreshToken }).then((r) => r.data.data)
  },
  logout() {
    return http.post('/admin/auth/logout').then((r) => r.data.data)
  },
  getMe() {
    return http.get('/admin/auth/me').then((r) => r.data.data)
  },
}
