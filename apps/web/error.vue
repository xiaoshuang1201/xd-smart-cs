<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-600">
    <div class="text-6xl mb-4">🔧</div>
    <h1 class="text-2xl font-bold text-gray-800 mb-2">页面暂时无法访问</h1>
    <p class="mb-6">{{ error?.message || '请稍后重试' }}</p>
    <button
      class="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
      @click="handleError"
    >
      返回首页
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: Error }>()

function handleError() {
  clearError({ redirect: '/' })
}
</script>
