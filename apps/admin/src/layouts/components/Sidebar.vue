<template>
  <a-layout-sider
    :collapsed="appStore.sidebarCollapsed"
    collapsible
    theme="dark"
    width="220"
    class="sidebar"
  >
    <div class="logo">
      <span v-if="!appStore.sidebarCollapsed" class="logo-text">新鼎 · 智能客服</span>
      <span v-else class="logo-icon">XD</span>
    </div>
    <a-menu
      v-model:selectedKeys="selectedKeys"
      theme="dark"
      mode="inline"
      @click="handleMenuClick"
    >
      <a-menu-item key="dashboard">
        <DashboardOutlined />
        <span>数据看板</span>
      </a-menu-item>
      <a-menu-item key="conversations">
        <MessageOutlined />
        <span>对话管理</span>
      </a-menu-item>
      <a-menu-item key="knowledge">
        <BookOutlined />
        <span>知识库管理</span>
      </a-menu-item>
      <a-menu-item key="work-orders">
        <FileProtectOutlined />
        <span>工单管理</span>
      </a-menu-item>
      <a-menu-item key="agent">
        <RobotOutlined />
        <span>Agent配置</span>
      </a-menu-item>
      <a-menu-item v-if="authStore.user?.role === 'super_admin'" key="settings">
        <SettingOutlined />
        <span>系统设置</span>
      </a-menu-item>
    </a-menu>
  </a-layout-sider>
</template>

<script setup lang="ts">
import {
  DashboardOutlined,
  MessageOutlined,
  BookOutlined,
  FileProtectOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { useAppStore } from '~/stores/app.store'
import { useAuthStore } from '~/stores/auth.store'

const appStore = useAppStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const selectedKeys = ref<string[]>(['dashboard'])

watch(
  () => route.path,
  (path) => {
    const seg = path.split('/')[1]
    if (seg) selectedKeys.value = [seg]
  },
  { immediate: true },
)

function handleMenuClick({ key }: { key: string | number }) {
  router.push(`/${String(key)}`)
}
</script>

<style scoped>
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.logo-text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
}
.logo-icon {
  font-size: 18px;
  font-weight: 700;
}
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: 10;
}
</style>
