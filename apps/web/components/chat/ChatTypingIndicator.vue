<template>
  <div class="flex items-center gap-1 px-4 py-2">
    <span class="typing-dot" />
    <span class="typing-dot" />
    <span class="typing-dot" />
    <span class="text-xs text-gray-400 ml-2">AI正在输入...</span>
  </div>
</template>

<style scoped>
.typing-dot {
  width: 6px;
  height: 6px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite both;
}
.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
