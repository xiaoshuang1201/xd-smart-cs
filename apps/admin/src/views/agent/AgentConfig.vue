<template>
  <div>
    <h2 class="text-xl font-bold mb-4">Agent 配置</h2>

    <a-card title="基本设置" size="small" class="mb-4">
      <a-form layout="vertical">
        <a-form-item label="欢迎语模板">
          <a-textarea v-model:value="config.greeting_message" :rows="2" />
        </a-form-item>
        <a-form-item label="转人工置信度阈值">
          <a-slider v-model:value="config.confidence_threshold" :min="0" :max="1" :step="0.05" style="width: 300px" />
          <span class="ml-2">{{ config.confidence_threshold }}</span>
        </a-form-item>
        <a-form-item label="单次对话Token上限">
          <a-input-number v-model:value="config.max_tokens_per_conversation" :min="1024" :max="16384" style="width: 200px" />
        </a-form-item>
        <a-form-item label="对话记忆滑动窗口(轮)">
          <a-input-number v-model:value="config.sliding_window_size" :min="4" :max="20" style="width: 200px" />
        </a-form-item>
        <a-form-item label="RAG检索返回片段数">
          <a-input-number v-model:value="config.top_k" :min="1" :max="20" style="width: 200px" />
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="对话测试" size="small" class="mb-4">
      <a-textarea v-model:value="testQuery" placeholder="输入测试问题..." :rows="2" class="mb-2" />
      <a-button type="primary" :loading="testing" @click="handleTest">测试</a-button>
      <div v-if="testResult" class="mt-3 p-3 bg-gray-50 rounded">
        <p class="text-sm text-gray-700">{{ testResult.answer }}</p>
        <div class="text-xs text-gray-400 mt-2">Token: {{ testResult.tokensUsed }} | 意图: {{ testResult.intent?.intent }}</div>
      </div>
    </a-card>

    <a-button type="primary" :loading="saving" @click="handleSave">保存配置</a-button>
  </div>
</template>

<script setup lang="ts">
import { agentApi } from '~/api/agent.api'

const config = reactive<Record<string, any>>({
  greeting_message: '您好！我是新鼎电炉智能客服，请问有什么可以帮您？',
  confidence_threshold: 0.6,
  max_tokens_per_conversation: 4096,
  sliding_window_size: 10,
  top_k: 5,
})

const testQuery = ref('')
const testResult = ref<any>(null)
const testing = ref(false)
const saving = ref(false)

async function loadConfig() {
  try {
    const data = await agentApi.getConfig()
    if (Array.isArray(data)) {
      for (const item of data) {
        const key = item.configKey.replace('agent.', '')
        config[key] = item.configValue?.val ?? item.configValue
      }
    }
  } catch { /* ignore */ }
}

async function handleSave() {
  saving.value = true
  try {
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(config)) {
      payload[`agent.${k}`] = { val: v }
    }
    await agentApi.updateConfig(payload)
  } finally { saving.value = false }
}

async function handleTest() {
  if (!testQuery.value.trim()) return
  testing.value = true
  try {
    testResult.value = await agentApi.testQuery(testQuery.value)
  } finally { testing.value = false }
}

onMounted(() => loadConfig())
</script>
