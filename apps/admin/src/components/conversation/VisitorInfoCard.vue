<template>
  <a-descriptions size="small" bordered :column="2" v-if="visitor">
    <a-descriptions-item label="访客指纹">{{ String(visitor.fingerprint ?? '').slice(0, 16) }}...</a-descriptions-item>
    <a-descriptions-item label="IP地址">{{ visitor.ipAddress || '-' }}</a-descriptions-item>
    <a-descriptions-item label="首次访问">{{ visitor.firstSeenAt || '-' }}</a-descriptions-item>
    <a-descriptions-item label="访问次数">{{ visitor.visitCount || 1 }}</a-descriptions-item>
    <a-descriptions-item label="来源页面">{{ sourcePage || '-' }}</a-descriptions-item>
    <a-descriptions-item label="会话状态">
      <StatusTag :status="status || 'active'" />
    </a-descriptions-item>
  </a-descriptions>
</template>

<script setup lang="ts">
import StatusTag from '~/components/common/StatusTag.vue'

defineProps<{
  visitor?: Record<string, unknown> | null
  sourcePage?: string
  status?: string
}>()
</script>
