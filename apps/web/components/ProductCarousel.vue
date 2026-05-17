<template>
  <div ref="sectionRef" class="reveal-init">
    <div class="text-center mb-10">
      <h2 class="text-3xl font-bold text-gray-800 mb-3">IGBT中频炉系列</h2>
      <p class="text-gray-500">覆盖全功率段，满足不同熔炼需求</p>
    </div>

    <div class="carousel-container" @mouseenter="pause" @mouseleave="resume">
      <div class="carousel-track" :style="{ transform: `translateX(-${current * 100}%)` }">
        <div v-for="(p, i) in products" :key="i" class="carousel-slide">
          <div class="slide-card">
            <img :src="p.image" :alt="p.name" class="slide-img" loading="lazy" />
            <div class="slide-info">
              <h3 class="slide-name">{{ p.name }}</h3>
              <p class="slide-desc">{{ p.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrows -->
      <button class="carousel-arrow carousel-arrow-left" @click="prev" aria-label="上一个">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <button class="carousel-arrow carousel-arrow-right" @click="next" aria-label="下一个">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>

      <!-- Dots -->
      <div class="carousel-dots">
        <button
          v-for="(p, i) in products"
          :key="i"
          class="carousel-dot"
          :class="{ active: i === current }"
          @click="goTo(i)"
          :aria-label="`第${i + 1}个产品`"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScrollAnimation } from '~/composables/useScrollAnimation'

const products = [
  {
    name: 'IGBT-500KW 中频炉',
    desc: '节能30% · 熔炼效率高 · 覆盖800-1200kg钢料',
    image: 'https://images.unsplash.com/photo-1581094794329-c8612de9b92b?w=600&h=400&fit=crop',
  },
  {
    name: '一拖二串联谐振炉',
    desc: '双炉体交替工作 · 不间断生产 · 批量熔炼首选',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=400&fit=crop',
  },
  {
    name: 'IGBT-1000KW 大功率炉',
    desc: '超大功率输出 · 快速熔化 · 适合3吨以上钢料',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop',
  },
  {
    name: '小型实验感应炉',
    desc: '实验室级精度 · 温控±1°C · 高校科研必备',
    image: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=600&h=400&fit=crop',
  },
]

const current = ref(0)
const interval = ref<ReturnType<typeof setInterval> | null>(null)
const sectionRef = ref<HTMLElement | null>(null)
const { observe } = useScrollAnimation()

function next() {
  current.value = (current.value + 1) % products.length
}
function prev() {
  current.value = (current.value - 1 + products.length) % products.length
}
function goTo(i: number) {
  current.value = i
}
function pause() {
  if (interval.value) clearInterval(interval.value)
}
function resume() {
  interval.value = setInterval(next, 4000)
}

onMounted(() => {
  observe(sectionRef.value)
  resume()
})
onUnmounted(() => pause())
</script>

<style scoped>
.reveal-init { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
.reveal-active { opacity: 1; transform: translateY(0); }

.carousel-container {
  position: relative;
  max-width: 1000px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 16px;
  background: #fafafa;
}
.carousel-track {
  display: flex;
  transition: transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.carousel-slide {
  min-width: 100%;
  padding: 0 4px;
  box-sizing: border-box;
}
.slide-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
}
.slide-img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  display: block;
}
.slide-info {
  padding: 20px 24px;
}
.slide-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}
.slide-desc {
  font-size: 0.9rem;
  color: #6b7280;
}

/* Arrows */
.carousel-arrow {
  position: absolute;
  top: 45%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255,255,255,0.92);
  border: 1px solid #e5e7eb;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 5;
}
.carousel-arrow:hover { background: #D4380D; color: white; border-color: #D4380D; }
.carousel-arrow-left { left: 16px; }
.carousel-arrow-right { right: 16px; }

/* Dots */
.carousel-dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 5;
}
.carousel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(0,0,0,0.15);
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0;
}
.carousel-dot.active { background: #D4380D; width: 26px; border-radius: 5px; }

@media (max-width: 640px) {
  .slide-img { height: 200px; }
  .slide-info { padding: 14px 16px; }
  .slide-name { font-size: 1.1rem; }
  .carousel-arrow { width: 34px; height: 34px; }
}
</style>
