<template>
  <div>
    <a-page-header title="上传文档" @back="$router.push('/knowledge')" />

    <a-card size="small" class="mb-4">
      <FileUpload ref="uploadRef" @file="onFileSelected" />
    </a-card>

    <a-card size="small" class="mb-4">
      <a-form layout="vertical">
        <a-form-item label="文档标题" required>
          <a-input v-model:value="title" placeholder="请输入文档标题" />
        </a-form-item>
        <a-form-item label="文档描述">
          <a-textarea v-model:value="description" placeholder="可选" :rows="2" />
        </a-form-item>
        <a-form-item label="版本号">
          <a-input v-model:value="version" placeholder="1.0" style="width: 120px" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="uploading" :disabled="!selectedFile" @click="handleUpload">
            开始上传
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card v-if="result" title="上传结果" size="small">
      <a-result
        :status="result.status === 'processing' ? 'success' : 'error'"
        :title="result.status === 'processing' ? '上传成功' : '上传失败'"
      >
        <template #subTitle>{{ result.message }}</template>
        <template #extra>
          <a-button type="primary" @click="$router.push(`/knowledge/${result.id}`)">查看文档</a-button>
          <a-button @click="$router.push('/knowledge')">返回列表</a-button>
        </template>
      </a-result>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import FileUpload from '~/components/common/FileUpload.vue'
import { knowledgeApi } from '~/api/knowledge.api'

const uploadRef = ref()
const selectedFile = ref<File | null>(null)
const title = ref('')
const description = ref('')
const version = ref('1.0')
const uploading = ref(false)
const result = ref<any>(null)

function onFileSelected(file: File) {
  selectedFile.value = file
  if (!title.value) title.value = file.name.replace(/\.[^.]+$/, '')
}

async function handleUpload() {
  if (!selectedFile.value) return
  uploading.value = true
  uploadRef.value?.startUpload()

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('title', title.value || selectedFile.value.name)
    if (description.value) formData.append('description', description.value)
    formData.append('version', version.value)

    const res = await knowledgeApi.upload(formData)
    result.value = res
    uploadRef.value?.markSuccess()
  } catch {
    uploadRef.value?.markFailed()
  } finally {
    uploading.value = false
  }
}
</script>
