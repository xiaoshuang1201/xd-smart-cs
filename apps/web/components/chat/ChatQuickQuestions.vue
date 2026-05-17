<template>
  <div class="flex flex-wrap gap-2 px-4 py-3">
    <button
      v-for="q in questions"
      :key="q"
      class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-brand-100 text-gray-600 hover:text-brand-700 rounded-full transition-colors"
      @click="$emit('select', q)"
    >
      {{ q }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ questions: string[] }>()
defineEmits<{ select: [question: string] }>()
</script>
