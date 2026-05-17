<template>
  <a-layout-header class="header">
    <div class="flex items-center gap-3">
      <MenuFoldOutlined v-if="!appStore.sidebarCollapsed" class="trigger" @click="appStore.toggleSidebar" />
      <MenuUnfoldOutlined v-else class="trigger" @click="appStore.toggleSidebar" />
      <a-breadcrumb>
        <a-breadcrumb-item v-for="b in breadcrumbs" :key="b">{{ b }}</a-breadcrumb-item>
      </a-breadcrumb>
    </div>
    <div class="flex items-center gap-4">
      <a-dropdown>
        <a-avatar class="cursor-pointer" size="small">
          {{ authStore.user?.displayName?.[0] || 'U' }}
        </a-avatar>
        <template #overlay>
          <a-menu>
            <a-menu-item disabled>
              <span class="text-gray-500">{{ authStore.user?.displayName }}</span>
              <a-tag class="ml-2" color="blue">{{ authStore.user?.role }}</a-tag>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item @click="authStore.logout()">
              <LogoutOutlined /> 退出登录
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </a-layout-header>
</template>

<script setup lang="ts">
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '~/stores/app.store'
import { useAuthStore } from '~/stores/auth.store'

const appStore = useAppStore()
const authStore = useAuthStore()
const route = useRoute()

const breadcrumbs = computed(() => {
  const pathMap: Record<string, string> = {
    dashboard: '数据看板',
    conversations: '对话管理',
    knowledge: '知识库管理',
    workorders: '工单管理',
    agent: 'Agent配置',
    settings: '系统设置',
  }
  const seg = route.path.split('/')[1]
  return ['首页', pathMap[seg] || seg]
})
</script>

<style scoped>
.header {
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  z-index: 9;
}
.trigger {
  font-size: 18px;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
}
.trigger:hover {
  color: #1a56db;
}
</style>
