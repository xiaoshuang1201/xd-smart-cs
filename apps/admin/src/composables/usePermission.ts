import { useAuthStore } from '~/stores/auth.store'

export function usePermission() {
  const authStore = useAuthStore()

  function hasRole(...roles: string[]): boolean {
    if (!authStore.user) return false
    if (authStore.user.role === 'super_admin') return true
    return roles.includes(authStore.user.role)
  }

  function canEdit(): boolean {
    return !!authStore.user && authStore.user.role !== 'customer_service'
  }

  function canManageUsers(): boolean {
    return authStore.user?.role === 'super_admin'
  }

  return { hasRole, canEdit, canManageUsers }
}
