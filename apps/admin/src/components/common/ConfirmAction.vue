<template>
  <a-popconfirm
    :title="title"
    :ok-text="okText"
    :cancel-text="cancelText"
    :ok-type="danger ? 'danger' : 'primary'"
    @confirm="$emit('confirm')"
  >
    <slot />
  </a-popconfirm>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    okText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  {
    title: '确认执行此操作？',
    okText: '确认',
    cancelText: '取消',
    danger: false,
  },
)

defineEmits<{ confirm: [] }>()
</script>
