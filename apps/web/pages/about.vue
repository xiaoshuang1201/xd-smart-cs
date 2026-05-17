<template>
  <div class="min-h-screen bg-white">
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <nav class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-bold text-brand-600">新鼎电炉科技</NuxtLink>
        <div class="hidden md:flex gap-8 text-gray-600 text-sm">
          <NuxtLink to="/" class="hover:text-brand-500 transition-colors">首页</NuxtLink>
          <NuxtLink to="/products" class="hover:text-brand-500 transition-colors">产品中心</NuxtLink>
          <NuxtLink to="/solutions" class="hover:text-brand-500 transition-colors">解决方案</NuxtLink>
          <NuxtLink to="/about" class="hover:text-brand-500 transition-colors font-medium text-brand-600">关于我们</NuxtLink>
          <NuxtLink to="/chat" class="hover:text-brand-500 transition-colors">在线客服</NuxtLink>
        </div>
      </nav>
    </header>

    <section class="py-16" style="background: linear-gradient(135deg, #FFF2E8 0%, #FFE0CC 50%, #FFF7F0 100%);">
      <div class="max-w-7xl mx-auto px-4 text-center">
        <h1 class="text-4xl font-bold mb-4" style="color: #6B1C06;">关于我们</h1>
        <p class="text-gray-500 text-lg">专注IGBT中频炉研发制造，用心服务每一位客户</p>
      </div>
    </section>

    <!-- Intro -->
    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <div class="prose max-w-none">
          <p class="text-gray-700 leading-relaxed text-lg mb-6">
            新鼎电炉科技有限公司成立于2015年，是一家集研发、设计、生产、销售
            于一体的高新技术企业，专注于<span class="text-brand-600 font-semibold">IGBT串联谐振中频感应电炉</span>的研发与制造。
          </p>
          <p class="text-gray-600 leading-relaxed mb-6">
            公司坐落于河南省洛阳市，拥有20000㎡现代化生产车间和先进的检测设备。
            核心技术团队由多名电力电子领域的高级工程师组成，与多所高校建立了产学研合作关系。
          </p>

          <!-- Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 my-12">
            <div class="text-center p-6 bg-brand-50 rounded-2xl">
              <div class="text-3xl font-bold text-brand-600">10+</div>
              <div class="text-sm text-gray-500 mt-1">年行业经验</div>
            </div>
            <div class="text-center p-6 bg-brand-50 rounded-2xl">
              <div class="text-3xl font-bold text-brand-600">500+</div>
              <div class="text-sm text-gray-500 mt-1">服务客户</div>
            </div>
            <div class="text-center p-6 bg-brand-50 rounded-2xl">
              <div class="text-3xl font-bold text-brand-600">20000㎡</div>
              <div class="text-sm text-gray-500 mt-1">生产基地</div>
            </div>
            <div class="text-center p-6 bg-brand-50 rounded-2xl">
              <div class="text-3xl font-bold text-brand-600">24h</div>
              <div class="text-sm text-gray-500 mt-1">售后服务</div>
            </div>
          </div>

          <h3 class="text-2xl font-bold text-gray-800 mb-4">企业愿景</h3>
          <p class="text-gray-600 leading-relaxed">
            以技术创新为驱动，致力于成为国内一流的感应加热设备供应商。
            我们坚持"品质为本、服务至上"的经营理念，持续为客户创造价值，
            助力中国制造业转型升级。
          </p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-12 bg-gray-50">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h3 class="text-xl font-bold text-gray-800 mb-3">了解更多？</h3>
        <p class="text-gray-500 mb-6">联系我们的销售团队获取产品资料和报价</p>
        <button class="px-10 py-3 bg-brand-600 text-white rounded-full text-lg font-medium hover:bg-brand-700 transition-all shadow-lg" @click="store.open()">立即咨询</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '~/stores/chat.store'
const store = useChatStore()
</script>
