<template>
  <div class="login-container">
    <a-card class="login-card">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-brand-700">新鼎电炉</h1>
        <p class="text-gray-500 text-sm mt-1">智能客服管理系统</p>
      </div>
      <a-form :model="form" layout="vertical" @finish="handleLogin">
        <a-form-item name="username" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input v-model:value="form.username" placeholder="用户名" size="large" autocomplete="username" />
        </a-form-item>
        <a-form-item name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="form.password" placeholder="密码" size="large" autocomplete="current-password" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" block size="large" :loading="loading">登录</a-button>
        </a-form-item>
      </a-form>
      <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '~/stores/auth.store'
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const router = useRouter()
const authStore = useAuthStore()

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(form.username, form.password)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.response?.data?.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a56db 0%, #1e3a8a 100%);
}
.login-card {
  width: 400px;
  border-radius: 12px;
}
</style>
