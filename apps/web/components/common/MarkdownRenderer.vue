<template>
  <div class="markdown-body" v-html="rendered" />
</template>

<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{ content: string }>()
const rendered = computed(() => renderMarkdown(props.content))
</script>

<style scoped>
.markdown-body :deep(p) {
  margin: 0.25rem 0;
  line-height: 1.6;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.25rem 0;
}
.markdown-body :deep(code) {
  font-size: 0.875em;
}
.markdown-body :deep(pre) {
  margin: 0.5rem 0;
}
.markdown-body :deep(blockquote) {
  border-left: 3px solid #d1d5db;
  padding-left: 0.75rem;
  color: #6b7280;
  margin: 0.5rem 0;
}
.markdown-body :deep(a) {
  color: #1a56db;
  text-decoration: underline;
}
.markdown-body :deep(table) {
  font-size: 0.875rem;
}
</style>
