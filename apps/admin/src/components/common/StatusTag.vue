<template>
  <a-tag :color="color">{{ label }}</a-tag>
</template>

<script setup lang="ts">
const props = defineProps<{ status: string; type?: string }>()

const statusMap: Record<string, { color: string; label: string }> = {
  // Conversation
  active: { color: 'green', label: '进行中' },
  closed: { color: 'default', label: '已关闭' },
  transferred: { color: 'orange', label: '已转人工' },
  // Knowledge
  processing: { color: 'blue', label: '处理中' },
  error: { color: 'red', label: '失败' },
  archived: { color: 'default', label: '已归档' },
  // Work order
  pending: { color: 'orange', label: '待处理' },
  resolved: { color: 'green', label: '已解决' },
  // Priority
  urgent: { color: 'red', label: '紧急' },
  high: { color: 'orange', label: '高' },
  medium: { color: 'blue', label: '中' },
  low: { color: 'default', label: '低' },
}

const info = computed(() => statusMap[props.status] || { color: 'default', label: props.status })
const color = computed(() => info.value.color)
const label = computed(() => info.value.label)
</script>
