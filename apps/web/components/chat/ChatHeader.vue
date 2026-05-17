<template>
  <div class="chat-header">
    <div class="flex items-center gap-2.5">
      <div class="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg">🤖</div>
      <div>
        <div class="font-semibold text-white text-sm">新鼎电炉智能客服</div>
        <div class="flex items-center gap-1 text-xs text-brand-100">
          <span class="w-1.5 h-1.5 bg-green-300 rounded-full" /> 在线
        </div>
      </div>
    </div>
    <div class="flex items-center gap-0.5">
      <button class="header-btn" @click="$emit('toggle-fullscreen')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
      <button class="header-btn" @click="$emit('minimize')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
        </svg>
      </button>
      <button class="header-btn" @click="$emit('close')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ minimize: []; close: []; 'toggle-fullscreen': [] }>()
</script>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  background: linear-gradient(135deg, #D4380D, #AD2E0A);
  flex-shrink: 0;
}
.header-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.65);
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.header-btn:hover { color: white; background: rgba(255,255,255,0.12); }
</style>
