<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'

const route = useRoute()
const sidebarOpen = ref(false)

const usesAppLayout = computed(() => route.meta.layout === 'app')
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]">
    <AppHeader v-if="usesAppLayout" @open-sidebar="sidebarOpen = true" />

    <div
      v-if="usesAppLayout"
      class="mx-auto grid w-full max-w-[86rem] grid-cols-1 gap-4 px-3 py-4 lg:grid-cols-[17.5rem_minmax(0,1fr)]"
    >
      <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

      <main class="app-scroll min-w-0 overflow-x-hidden lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">
        <RouterView />
      </main>
    </div>

    <RouterView v-else />

    <Toaster position="top-right" rich-colors />
  </div>
</template>
