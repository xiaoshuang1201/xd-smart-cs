<template>
  <a-card class="stat-card" hoverable>
    <a-statistic :title="title" :value="value" :value-style="{ color, fontSize: '28px' }">
      <template #prefix>
        <component :is="icon" v-if="icon" />
      </template>
      <template #suffix>
        <span v-if="trend !== undefined" class="text-sm" :class="trend >= 0 ? 'text-green-500' : 'text-red-500'">
          {{ trend >= 0 ? '↑' : '↓' }} {{ Math.abs(trend) }}%
        </span>
      </template>
    </a-statistic>
  </a-card>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  value: number | string
  color?: string
  icon?: Component
  trend?: number
}>()
</script>

<style scoped>
.stat-card {
  border-radius: 8px;
}
</style>
