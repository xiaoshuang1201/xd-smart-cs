<template>
  <div>
    <h2 class="text-xl font-bold mb-4">系统设置</h2>

    <a-tabs>
      <a-tab-pane key="configs" tab="系统配置">
        <a-table
          :columns="configColumns"
          :data-source="configs"
          :loading="loading"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'value'">
              <code class="text-xs">{{ JSON.stringify(record.configValue) }}</code>
            </template>
          </template>
        </a-table>
        <a-button class="mt-2" @click="handleClearCache('config')">清除配置缓存</a-button>
      </a-tab-pane>

      <a-tab-pane key="users" tab="管理员管理">
        <a-button type="primary" class="mb-3" @click="showCreateUser = true">+ 新增管理员</a-button>
        <a-table
          :columns="userColumns"
          :data-source="users"
          :loading="loadingUsers"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'role'"><a-tag>{{ record.role }}</a-tag></template>
            <template v-if="column.key === 'status'"><a-tag :color="record.status === 'active' ? 'green' : 'red'">{{ record.status }}</a-tag></template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="cache" tab="缓存管理">
        <a-space direction="vertical">
          <a-button @click="handleClearCache('rag')">清除RAG缓存</a-button>
          <a-button @click="handleClearCache()">清除所有缓存</a-button>
        </a-space>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:visible="showCreateUser" title="新增管理员" @ok="handleCreateUser">
      <a-form layout="vertical">
        <a-form-item label="用户名" required><a-input v-model:value="newUser.username" /></a-form-item>
        <a-form-item label="密码" required><a-input-password v-model:value="newUser.password" /></a-form-item>
        <a-form-item label="显示名称"><a-input v-model:value="newUser.displayName" /></a-form-item>
        <a-form-item label="邮箱"><a-input v-model:value="newUser.email" /></a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="newUser.role">
            <a-select-option value="super_admin">超级管理员</a-select-option>
            <a-select-option value="customer_service">客服</a-select-option>
            <a-select-option value="knowledge_admin">知识管理员</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { systemApi } from '~/api/system.api'

const configs = ref<any[]>([])
const users = ref<any[]>([])
const loading = ref(false)
const loadingUsers = ref(false)
const showCreateUser = ref(false)
const newUser = reactive({ username: '', password: '', displayName: '', email: '', role: 'customer_service' })

const configColumns = [
  { title: 'Key', dataIndex: 'configKey', width: 250 },
  { title: 'Value', key: 'value' },
  { title: '描述', dataIndex: 'description' },
]
const userColumns = [
  { title: '用户名', dataIndex: 'username' },
  { title: '显示名', dataIndex: 'displayName' },
  { title: '角色', key: 'role', width: 120 },
  { title: '状态', key: 'status', width: 80 },
  { title: '最后登录', dataIndex: 'lastLoginAt', width: 170 },
]

async function loadConfigs() {
  loading.value = true
  try { configs.value = await systemApi.getConfigs() || [] } finally { loading.value = false }
}
async function loadUsers() {
  loadingUsers.value = true
  try { users.value = await systemApi.getUsers() || [] } finally { loadingUsers.value = false }
}

async function handleClearCache(type?: string) { await systemApi.clearCache(type) }
async function handleCreateUser() {
  await systemApi.createUser(newUser)
  showCreateUser.value = false
  loadUsers()
}

onMounted(() => { loadConfigs(); loadUsers() })
</script>
