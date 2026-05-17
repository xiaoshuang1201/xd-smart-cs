<template>
  <div class="min-h-screen bg-white">
    <!-- Nav (same style as homepage) -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <nav class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-bold text-brand-600">新鼎电炉科技</NuxtLink>
        <div class="hidden md:flex gap-8 text-gray-600 text-sm">
          <NuxtLink to="/" class="hover:text-brand-500 transition-colors">首页</NuxtLink>
          <NuxtLink to="/products" class="hover:text-brand-500 transition-colors font-medium text-brand-600">产品中心</NuxtLink>
          <NuxtLink to="/solutions" class="hover:text-brand-500 transition-colors">解决方案</NuxtLink>
          <NuxtLink to="/about" class="hover:text-brand-500 transition-colors">关于我们</NuxtLink>
          <NuxtLink to="/chat" class="hover:text-brand-500 transition-colors">在线客服</NuxtLink>
        </div>
      </nav>
    </header>

    <!-- Page title -->
    <section class="py-16" style="background: linear-gradient(135deg, #FFF2E8 0%, #FFE0CC 50%, #FFF7F0 100%);">
      <div class="max-w-7xl mx-auto px-4 text-center">
        <h1 class="text-4xl font-bold mb-4" style="color: #6B1C06;">产品中心</h1>
        <p class="text-gray-500 text-lg">覆盖全功率段，满足不同熔炼需求</p>
      </div>
    </section>

    <!-- Products grid -->
    <section class="py-16 bg-white">
      <div class="max-w-7xl mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div v-for="(p, i) in products" :key="i" class="group p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row gap-6">
            <img :src="p.image" :alt="p.name" class="w-full md:w-56 h-48 object-cover rounded-xl" loading="lazy"/>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-800 mb-2">{{ p.name }}</h3>
              <p class="text-sm text-gray-500 mb-3">{{ p.desc }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="tag in p.tags" :key="tag" class="px-3 py-1 bg-brand-50 text-brand-600 text-xs rounded-full">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Specs table -->
        <div class="mt-16 max-w-4xl mx-auto">
          <h2 class="text-2xl font-bold text-gray-800 text-center mb-8">技术规格对比</h2>
          <div class="overflow-x-auto rounded-2xl border border-gray-100">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-brand-50">
                  <th class="px-6 py-4 text-left font-semibold text-gray-700">型号</th>
                  <th class="px-6 py-4 text-left font-semibold text-gray-700">功率</th>
                  <th class="px-6 py-4 text-left font-semibold text-gray-700">频率</th>
                  <th class="px-6 py-4 text-left font-semibold text-gray-700">熔炼量</th>
                  <th class="px-6 py-4 text-left font-semibold text-gray-700">电耗</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="s in specs" :key="s.model" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 font-medium text-gray-800">{{ s.model }}</td>
                  <td class="px-6 py-4 text-gray-600">{{ s.power }}</td>
                  <td class="px-6 py-4 text-gray-600">{{ s.freq }}</td>
                  <td class="px-6 py-4 text-gray-600">{{ s.capacity }}</td>
                  <td class="px-6 py-4 text-gray-600">{{ s.consumption }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-12 bg-gray-50">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h3 class="text-xl font-bold text-gray-800 mb-3">需要定制化方案？</h3>
        <p class="text-gray-500 mb-6">我们的技术团队根据您的实际工况，为您量身推荐最佳配置</p>
        <button class="px-10 py-3 bg-brand-600 text-white rounded-full text-lg font-medium hover:bg-brand-700 transition-all shadow-lg" @click="store.open()">在线咨询</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '~/stores/chat.store'

const store = useChatStore()

const products = [
  {
    name: 'IGBT-500KW 中频炉',
    desc: '适用于800-1200kg钢料熔炼，采用串联谐振技术，节能效果出色，广泛用于铸造行业。',
    image: 'https://images.unsplash.com/photo-1581094794329-c8612de9b92b?w=600&h=400&fit=crop',
    tags: ['节能30%', '熔炼效率高', '一键操作'],
  },
  {
    name: '一拖二串联谐振炉',
    desc: '双炉体交替工作设计，不间断连续生产。一台电源驱动两台炉体，大幅提高产能。',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=400&fit=crop',
    tags: ['双炉体', '不间断生产', '批量熔炼'],
  },
  {
    name: 'IGBT-1000KW 大功率炉',
    desc: '超大功率输出，快速熔化，适合3吨以上钢料。广泛应用于大型铸造和钢铁冶炼。',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop',
    tags: ['超大功率', '快速熔化', '3吨+'],
  },
  {
    name: '小型实验感应炉',
    desc: '实验室级精度控制，温控±1°C。适合高校科研、新材料研发、小批量试制。',
    image: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=600&h=400&fit=crop',
    tags: ['实验室级', '±1°C温控', '科研必备'],
  },
]

const specs = [
  { model: 'IGBT-300', power: '300KW', freq: '1000Hz', capacity: '500-800kg', consumption: '580kWh/t' },
  { model: 'IGBT-500', power: '500KW', freq: '1000Hz', capacity: '800-1200kg', consumption: '560kWh/t' },
  { model: 'IGBT-750', power: '750KW', freq: '800Hz', capacity: '1500-2000kg', consumption: '550kWh/t' },
  { model: 'IGBT-1000', power: '1000KW', freq: '600Hz', capacity: '2500-3500kg', consumption: '540kWh/t' },
  { model: 'IGBT-1500', power: '1500KW', freq: '500Hz', capacity: '4000-6000kg', consumption: '520kWh/t' },
]
</script>
