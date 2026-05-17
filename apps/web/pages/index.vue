<template>
  <div class="min-h-screen bg-white">
    <!-- Navigation -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <nav class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold text-brand-600">新鼎电炉科技</span>
        </div>

        <!-- Desktop nav -->
        <div class="hidden md:flex gap-8 text-gray-600 text-sm">
          <NuxtLink to="/" class="hover:text-brand-500 transition-colors font-medium">首页</NuxtLink>
          <NuxtLink to="/products" class="hover:text-brand-500 transition-colors">产品中心</NuxtLink>
          <NuxtLink to="/solutions" class="hover:text-brand-500 transition-colors">解决方案</NuxtLink>
          <NuxtLink to="/about" class="hover:text-brand-500 transition-colors">关于我们</NuxtLink>
          <NuxtLink to="/chat" class="hover:text-brand-500 transition-colors">在线客服</NuxtLink>
        </div>

        <!-- Mobile hamburger -->
        <button class="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" @click="mobileOpen = !mobileOpen" aria-label="菜单">
          <svg v-if="!mobileOpen" class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <svg v-else class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </nav>

      <!-- Mobile menu -->
      <Transition name="slide-down">
        <div v-if="mobileOpen" class="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-3 text-sm text-gray-600">
          <NuxtLink to="/" class="hover:text-brand-500 py-1" @click="mobileOpen = false">首页</NuxtLink>
          <NuxtLink to="/products" class="hover:text-brand-500 py-1" @click="mobileOpen = false">产品中心</NuxtLink>
          <NuxtLink to="/solutions" class="hover:text-brand-500 py-1" @click="mobileOpen = false">解决方案</NuxtLink>
          <NuxtLink to="/about" class="hover:text-brand-500 py-1" @click="mobileOpen = false">关于我们</NuxtLink>
          <NuxtLink to="/chat" class="hover:text-brand-500 py-1" @click="mobileOpen = false">在线客服</NuxtLink>
        </div>
      </Transition>
    </header>

    <!-- Hero -->
    <section ref="heroRef" class="reveal-init relative overflow-hidden" style="background: linear-gradient(135deg, #FFF2E8 0%, #FFE0CC 50%, #FFF7F0 100%);">
      <div class="max-w-7xl mx-auto px-4 py-24 md:py-32">
        <div class="text-center max-w-3xl mx-auto">
          <h1 class="text-4xl md:text-6xl font-bold mb-6" style="color: #6B1C06; letter-spacing: -0.02em;">
            IGBT中频炉 · 智造未来
          </h1>
          <p class="text-lg md:text-xl text-gray-600 mb-12 leading-relaxed">
            专注于IGBT中频炉研发、生产与销售<br/>
            提供<span class="text-brand-600 font-semibold">7×24小时</span>智能客服支持
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button class="px-10 py-3.5 bg-brand-600 text-white rounded-full text-lg font-medium hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 hover:shadow-brand-400 hover:-translate-y-0.5" @click="triggerChat">
              在线咨询
            </button>
            <NuxtLink to="/chat" class="px-10 py-3.5 border-2 border-brand-300 text-brand-600 rounded-full text-lg font-medium hover:bg-brand-50 transition-all">
              全屏对话
            </NuxtLink>
          </div>
        </div>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-16 bg-white" style="border-radius: 50% 50% 0 0 / 100% 100% 0 0; transform: scaleX(1.5);"/>
    </section>

    <!-- Features -->
    <section ref="featuresRef" class="reveal-init py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-bold text-gray-800 mb-3">核心优势</h2>
          <p class="text-gray-500">用技术驱动电炉行业智能化升级</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="group p-8 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300">
            <div class="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-brand-100 transition-colors">⚡</div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">高效节能</h3>
            <p class="text-sm text-gray-500 leading-relaxed">IGBT串联谐振技术，比传统可控硅中频炉节电30%以上，年省百万电费</p>
          </div>
          <div class="group p-8 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300">
            <div class="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-brand-100 transition-colors">🔧</div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">智能控制</h3>
            <p class="text-sm text-gray-500 leading-relaxed">全数字控制系统，一键启动自动匹配负载，操作简单无需专业人员</p>
          </div>
          <div class="group p-8 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300">
            <div class="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-brand-100 transition-colors">🛡️</div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">安全可靠</h3>
            <p class="text-sm text-gray-500 leading-relaxed">多重保护机制实时监控，故障自动诊断预警，保障设备持续稳定运行</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Product Carousel -->
    <section class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4">
        <ProductCarousel />
      </div>
    </section>

    <!-- Contact Form -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4">
        <ContactForm />
      </div>
    </section>

    <!-- Contact & Footer -->
    <footer class="bg-gray-900 text-gray-300">
      <div class="max-w-7xl mx-auto px-4 py-16">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          <!-- About -->
          <div>
            <h3 class="text-white text-lg font-bold mb-4">新鼎电炉科技</h3>
            <p class="text-sm text-gray-400 leading-relaxed">专注IGBT中频感应电炉研发与制造，<br/>为全球客户提供高效节能的熔炼解决方案。</p>
          </div>

          <!-- Quick Links -->
          <div>
            <h3 class="text-white text-lg font-bold mb-4">快速导航</h3>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <NuxtLink to="/" class="text-gray-400 hover:text-brand-400 transition-colors">首页</NuxtLink>
              <NuxtLink to="/products" class="text-gray-400 hover:text-brand-400 transition-colors">产品中心</NuxtLink>
              <NuxtLink to="/solutions" class="text-gray-400 hover:text-brand-400 transition-colors">解决方案</NuxtLink>
              <NuxtLink to="/about" class="text-gray-400 hover:text-brand-400 transition-colors">关于我们</NuxtLink>
              <NuxtLink to="/chat" class="text-gray-400 hover:text-brand-400 transition-colors">在线客服</NuxtLink>
            </div>
          </div>

          <!-- Contact Info -->
          <div>
            <h3 class="text-white text-lg font-bold mb-4">联系我们</h3>
            <div class="space-y-3 text-sm text-gray-400">
              <div class="flex items-start gap-3">
                <span class="text-brand-400 mt-0.5">📞</span>
                <div>
                  <div class="text-white font-medium">0379-6xxx-xxxx</div>
                  <div class="text-xs text-gray-500">工作日 8:30-18:00</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-brand-400 mt-0.5">📱</span>
                <div>
                  <div class="text-white font-medium">138-xxxx-xxxx</div>
                  <div class="text-xs text-gray-500">7×24h 销售咨询</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-brand-400 mt-0.5">💬</span>
                <div>
                  <div class="text-white font-medium">xinding-electric</div>
                  <div class="text-xs text-gray-500">微信公众号</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-brand-400 mt-0.5">📧</span>
                <div>
                  <div class="text-white font-medium">sales@xinding.com</div>
                  <div class="text-xs text-gray-500">商务合作邮箱</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-brand-400 mt-0.5">📍</span>
                <div>
                  <div class="text-white font-medium">河南省洛阳市高新区</div>
                  <div class="text-xs text-gray-500">洛龙科技园区新鼎路88号</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-12 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
          © 2026 新鼎电炉科技有限公司 版权所有 | 豫ICP备XXXXXXXX号 | 智能客服系统 24h在线
        </div>
      </div>
    </footer>

    <ChatBubble />
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '~/stores/chat.store'
import { useScrollAnimation } from '~/composables/useScrollAnimation'
import ProductCarousel from '~/components/ProductCarousel.vue'
import ContactForm from '~/components/ContactForm.vue'

const store = useChatStore()
const { observe } = useScrollAnimation()
const mobileOpen = ref(false)

const heroRef = ref<HTMLElement | null>(null)
const featuresRef = ref<HTMLElement | null>(null)

function triggerChat() { store.open() }

onMounted(() => {
  observe(heroRef.value)
  observe(featuresRef.value)
})
</script>

<style>
/* Reveal Animation */
.reveal-init { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
.reveal-active { opacity: 1 !important; transform: translateY(0) !important; }

/* Mobile menu */
.slide-down-enter-active { transition: all 0.25s ease-out; }
.slide-down-leave-active { transition: all 0.2s ease-in; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; max-height: 0; overflow: hidden; }
.slide-down-enter-to, .slide-down-leave-from { opacity: 1; max-height: 300px; }
</style>
