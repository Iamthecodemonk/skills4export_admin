<script setup lang="ts">
import { Bell, Menu, Moon, Search, Sun, UserCircle } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme'

defineEmits<{
  'open-sidebar': []
}>()

const { resolvedTheme, setTheme } = useTheme()
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-[color:var(--border-soft)] bg-[var(--header-bg)] backdrop-blur">
    <div class="mx-auto flex h-16 max-w-[86rem] items-center gap-3 px-3">
      <button
        class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] text-[var(--text-secondary)] lg:hidden"
        aria-label="Open sidebar"
        @click="$emit('open-sidebar')"
      >
        <Menu class="h-4 w-4" />
      </button>

      <RouterLink to="/admin" class="flex items-center gap-2">
        <span class="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
          S4
        </span>
        <span class="hidden font-display text-base font-semibold text-[var(--text-primary)] sm:inline">
          Skills4Export
        </span>
      </RouterLink>

      <nav class="hidden items-center gap-1 lg:flex">
        <RouterLink class="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" to="/admin">
          Admin
        </RouterLink>
      </nav>

      <label class="ml-auto hidden h-10 min-w-0 max-w-md flex-1 items-center gap-2 rounded-full border border-transparent bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:flex">
        <Search class="h-4 w-4 shrink-0" />
        <input
          class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          placeholder="Search users, posts, reports"
          type="search"
        />
      </label>

      <button
        class="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:text-[var(--accent-strong)]"
        :aria-label="resolvedTheme === 'dark' ? 'Use light theme' : 'Use dark theme'"
        @click="setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')"
      >
        <Sun v-if="resolvedTheme === 'dark'" class="h-4 w-4" />
        <Moon v-else class="h-4 w-4" />
      </button>

      <button class="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" aria-label="Notifications">
        <Bell class="h-4 w-4" />
      </button>

      <button class="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]" aria-label="Account">
        <UserCircle class="h-5 w-5" />
      </button>
    </div>
  </header>
</template>
