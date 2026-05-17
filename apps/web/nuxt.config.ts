import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-05-17',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

  css: ['@/assets/css/main.css', '@/assets/css/animation.css'],

  plugins: ['@/plugins/ant-design-vue.client'],

  app: {
    head: {
      title: '新鼎电炉科技',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '新鼎电炉科技——IGBT中频炉研发生产' },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3100/api',
    },
  },

  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },

  typescript: {
    strict: true,
    shim: false,
  },

  vite: {
    resolve: {
      alias: {
        '@xd/shared': '../packages/shared/src',
      },
    },
  },
});
