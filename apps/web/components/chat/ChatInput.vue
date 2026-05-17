<template>
  <div class="chat-input-area">
    <div class="flex items-end gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-brand-500 transition-colors">
      <textarea
        ref="inputRef"
        v-model="text"
        class="flex-1 resize-none outline-none text-sm max-h-24 py-1"
        :rows="1"
        placeholder="请输入您的问题..."
        :disabled="disabled"
        @keydown.enter.exact.prevent="handleSend"
        @input="autoResize"
      />
      <button
        class="flex-shrink-0 w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-40"
        :disabled="!text.trim() || disabled"
        @click="handleSend"
      >
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      </button>
    </div>
    <p class="text-xs text-gray-400 text-center mt-1">
      Powered by 新鼎电炉 · 智能客服
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ send: [content: string] }>()
const text = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 96) + 'px'
}

function handleSend() {
  const content = text.value.trim()
  if (!content || props.disabled) return
  emit('send', content)
  text.value = ''
  nextTick(() => {
    const el = inputRef.value
    if (el) {
      el.style.height = 'auto'
      el.focus()
    }
  })
}
</script>

<style scoped>
.chat-input-area {
  padding: 0.75rem 1rem;
  border-top: 1px solid #e5e7eb;
  background: white;
}
</style>
