<template>
  <div class="flex items-center gap-2 text-xs text-gray-400 mt-1">
    <span>这个回答对你有帮助吗？</span>
    <button
      class="px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
      :class="{ 'text-green-500': rated === 'helpful' }"
      :disabled="!!rated"
      @click="rate('helpful')"
    >
      👍 有用
    </button>
    <button
      class="px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
      :class="{ 'text-red-400': rated === 'unhelpful' }"
      :disabled="!!rated"
      @click="rate('unhelpful')"
    >
      👎 无用
    </button>
    <span v-if="rated" class="text-gray-400">感谢反馈</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ messageId: string }>()
const emit = defineEmits<{ rate: [messageId: string, rating: 'helpful' | 'unhelpful'] }>()
const rated = ref<'helpful' | 'unhelpful' | null>(null)

function rate(rating: 'helpful' | 'unhelpful') {
  rated.value = rating
  emit('rate', props.messageId, rating)
}
</script>
