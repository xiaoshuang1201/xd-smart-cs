<template>
  <div class="mx-4 my-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <p class="text-sm text-amber-800 mb-2">{{ message }}</p>
    <div class="flex gap-2">
      <input
        v-model="contact"
        class="flex-1 px-3 py-1.5 text-sm border border-amber-300 rounded focus:outline-none focus:border-amber-500"
        placeholder="请输入联系方式（手机/邮箱）"
        @keyup.enter="confirm"
      />
      <button
        class="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
        @click="confirm"
      >
        确认转接
      </button>
    </div>
    <button class="text-xs text-gray-400 mt-2 hover:text-gray-500" @click="$emit('cancel')">
      暂不需要
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ confirm: [contact: string]; cancel: [] }>()
const contact = ref('')

function confirm() {
  if (contact.value.trim()) {
    emit('confirm', contact.value.trim())
  }
}
</script>
