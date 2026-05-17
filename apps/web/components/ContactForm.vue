<template>
  <div ref="sectionRef" class="reveal-init max-w-2xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-gray-800 mb-3">获取最新方案</h2>
      <p class="text-gray-500">留下联系方式，我们的技术专家为您量身定制方案</p>
    </div>

    <form class="contact-form" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">姓名 <span class="text-red-500">*</span></label>
          <input
            v-model="form.name"
            type="text"
            class="form-input"
            placeholder="请输入您的姓名"
            :class="{ error: errors.name }"
          />
          <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">手机号 <span class="text-red-500">*</span></label>
          <input
            v-model="form.phone"
            type="tel"
            class="form-input"
            placeholder="请输入11位手机号码"
            maxlength="11"
            :class="{ error: errors.phone }"
          />
          <span v-if="errors.phone" class="form-error">{{ errors.phone }}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">留言</label>
        <textarea
          v-model="form.message"
          class="form-input form-textarea"
          placeholder="请描述您的需求（可选）"
          rows="3"
        />
      </div>

      <button type="submit" class="submit-btn" :disabled="submitted">
        {{ submitted ? '已提交' : '提交咨询' }}
      </button>
    </form>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="showToast" class="toast">
        <div class="toast-icon">✓</div>
        <div class="toast-text">表单已提交，我们会尽快联系您</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useScrollAnimation } from '~/composables/useScrollAnimation'

const form = reactive({ name: '', phone: '', message: '' })
const errors = reactive({ name: '', phone: '' })
const submitted = ref(false)
const showToast = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
const { observe } = useScrollAnimation()

function validate(): boolean {
  errors.name = ''
  errors.phone = ''
  let valid = true

  if (!form.name.trim()) {
    errors.name = '请输入姓名'
    valid = false
  }

  if (!form.phone.trim()) {
    errors.phone = '请输入手机号'
    valid = false
  } else if (!/^1\d{10}$/.test(form.phone)) {
    errors.phone = '请输入正确的11位手机号'
    valid = false
  }

  return valid
}

function handleSubmit() {
  if (!validate()) return

  submitted.value = true
  showToast.value = true

  setTimeout(() => {
    showToast.value = false
    submitted.value = false
    form.name = ''
    form.phone = ''
    form.message = ''
    errors.name = ''
    errors.phone = ''
  }, 2500)
}

onMounted(() => observe(sectionRef.value))
</script>

<style scoped>
.reveal-init { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
.reveal-active { opacity: 1; transform: translateY(0); }

.contact-form {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.05);
  border: 1px solid #f0f0f0;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.form-group {
  margin-bottom: 20px;
}
.form-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.95rem;
  color: #1f2937;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  background: #fafafa;
}
.form-input:focus {
  border-color: #D4380D;
  box-shadow: 0 0 0 3px rgba(212, 56, 13, 0.1);
  background: white;
}
.form-input.error { border-color: #ef4444; }
.form-textarea { resize: vertical; min-height: 80px; }
.form-error { font-size: 0.8rem; color: #ef4444; margin-top: 4px; display: block; }

.submit-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #FA8C33, #D4380D);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}
.submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.submit-btn:disabled { opacity: 0.6; cursor: default; transform: none; }

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 14px 28px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10000;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}
.toast-icon {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}
.toast-text { font-size: 0.95rem; }

.fade-enter-active { transition: all 0.3s ease-out; }
.fade-leave-active { transition: all 0.3s ease-in; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-12px); }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .contact-form { padding: 20px; }
}
</style>
