<template>
  <a-upload-dragger
    :accept="accept"
    :before-upload="handleBeforeUpload"
    :show-upload-list="false"
    :disabled="uploading"
  >
    <p class="text-3xl mb-2">📁</p>
    <p class="text-sm text-gray-600">拖拽文件到此处，或点击选择文件</p>
    <p class="text-xs text-gray-400 mt-1">
      支持格式: PDF / Word / Excel / TXT / Markdown
    </p>
    <p class="text-xs text-gray-400">单个文件最大: 50MB</p>
  </a-upload-dragger>
  <div v-if="file" class="mt-3 text-sm text-gray-600">
    已选择: {{ file.name }} ({{ formatSize(file.size) }})
  </div>
  <a-progress v-if="uploading" class="mt-3" :percent="progress" :status="progressStatus" />
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
const props = defineProps<{ accept?: string }>()
const emit = defineEmits<{ file: [file: File] }>()
const file = ref<File | null>(null)
const uploading = ref(false)
const progress = ref(0)
const progressStatus = ref<'active' | 'success' | 'exception'>('active')

function handleBeforeUpload(f: File) {
  const maxSize = 50 * 1024 * 1024
  if (f.size > maxSize) {
    message.error('文件不能超过50MB')
    return false
  }
  file.value = f
  emit('file', f)
  return false // Prevent auto upload
}

function startUpload() {
  uploading.value = true
  progress.value = 0
  progressStatus.value = 'active'
}

function updateProgress(pct: number) {
  progress.value = pct
}

function markSuccess() {
  progressStatus.value = 'success'
  uploading.value = false
}

function markFailed() {
  progressStatus.value = 'exception'
  uploading.value = false
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}

defineExpose({ startUpload, updateProgress, markSuccess, markFailed })
</script>
