<template>
  <a-layout style="min-height: 100vh">
    <Sidebar />
    <a-layout :style="{ marginLeft: appStore.sidebarCollapsed ? '80px' : '220px' }">
      <Header />
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import { useAppStore } from '~/stores/app.store'

const appStore = useAppStore()
</script>

<style scoped>
.content {
  margin: 20px;
  padding: 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 104px);
}
</style>
