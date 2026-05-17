<template>
  <div class="min-h-screen bg-white">
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <nav class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-bold text-brand-600">新鼎电炉科技</NuxtLink>
        <div class="hidden md:flex gap-8 text-gray-600 text-sm">
          <NuxtLink to="/" class="hover:text-brand-500 transition-colors">首页</NuxtLink>
          <NuxtLink to="/products" class="hover:text-brand-500 transition-colors">产品中心</NuxtLink>
          <NuxtLink to="/solutions" class="hover:text-brand-500 transition-colors font-medium text-brand-600">解决方案</NuxtLink>
          <NuxtLink to="/about" class="hover:text-brand-500 transition-colors">关于我们</NuxtLink>
          <NuxtLink to="/chat" class="hover:text-brand-500 transition-colors">在线客服</NuxtLink>
        </div>
      </nav>
    </header>

    <section class="py-16" style="background: linear-gradient(135deg, #FFF2E8 0%, #FFE0CC 50%, #FFF7F0 100%);">
      <div class="max-w-7xl mx-auto px-4 text-center">
        <h1 class="text-4xl font-bold mb-4" style="color: #6B1C06;">解决方案</h1>
        <p class="text-gray-500 text-lg">从设备选型到生产运营，提供全生命周期支持</p>
      </div>
    </section>

    <section class="py-16 bg-white">
      <div class="max-w-7xl mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div v-for="(s, i) in solutions" :key="i" class="group p-8 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300">
            <div class="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-brand-100 transition-colors">{{ s.icon }}</div>
            <h3 class="text-lg font-bold text-gray-800 mb-3">{{ s.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-4">{{ s.desc }}</p>
            <ul class="text-sm text-gray-600 space-y-2">
              <li v-for="(item, j) in s.items" :key="j" class="flex items-start gap-2">
                <span class="text-brand-500 mt-0.5">✓</span> {{ item }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Flow -->
        <div class="max-w-4xl mx-auto">
          <h2 class="text-2xl font-bold text-gray-800 text-center mb-12">服务流程</h2>
          <div class="flex flex-col md:flex-row justify-between items-center gap-6">
            <div v-for="(step, i) in steps" :key="i" class="flex flex-col items-center text-center flex-1">
              <div class="w-16 h-16 bg-brand-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-3 shadow-lg shadow-brand-200">{{ i + 1 }}</div>
              <h4 class="font-semibold text-gray-800 mb-1">{{ step.title }}</h4>
              <p class="text-xs text-gray-500">{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const solutions = [
  {
    icon: '🏭', title: '铸造行业方案',
    desc: '为铸造企业提供从熔炼到浇注的完整解决方案',
    items: ['合金钢熔炼系统', '球铁/灰铁熔炼方案', '连续铸造产线配套'],
  },
  {
    icon: '🔩', title: '锻造行业方案',
    desc: '针对锻造工艺特点，提供棒料和管坯加热方案',
    items: ['棒料透热系统', '管坯在线加热', '模具预热设备'],
  },
  {
    icon: '⚙️', title: '热处理方案',
    desc: '精密温度控制，满足各类金属热处理工艺要求',
    items: ['淬火加热系统', '回火温控方案', '表面热处理设备'],
  },
]

const steps = [
  { title: '需求沟通', desc: '了解您的工况与产能需求' },
  { title: '方案设计', desc: '工程师量身定制技术方案' },
  { title: '设备生产', desc: '严格品控，按期交付' },
  { title: '安装调试', desc: '专业团队上门安装调试' },
  { title: '售后保障', desc: '7×24h技术支持与维修' },
]
</script>
