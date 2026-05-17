import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  // 尝试从 localStorage 恢复 token
  let token: string | null = null
  try {
    const saved = localStorage.getItem('xd_admin_tokens')
    if (saved) {
      const { access } = JSON.parse(saved)
      token = access
    }
  } catch { /* ignore */ }

  if (to.meta.requiresAuth === false) {
    next()
    return
  }

  if (!token) {
    next('/login')
    return
  }

  // 角色权限检查
  const roles = to.meta.roles as string[] | undefined
  if (roles && roles.length > 0) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (!roles.includes(payload.role) && payload.role !== 'super_admin') {
        next('/dashboard')
        return
      }
    } catch {
      next('/login')
      return
    }
  }

  next()
})

export default router
