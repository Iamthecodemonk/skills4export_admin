<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  FileStack,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-vue-next'
import { logout } from '../composables/useAuth'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const router = useRouter()
const communitiesOpen = ref(route.path.startsWith('/admin/communit'))
const jobsOpen = ref(route.path.startsWith('/admin/jobs') || route.path.startsWith('/admin/freelance-jobs'))
const pagesOpen = ref(route.path.startsWith('/admin/page'))

const adminLinks = [
  { label: 'HOME', to: '/admin', icon: LayoutDashboard },
  { label: 'Manage users', to: '/admin/users', icon: Users },
  { label: 'Manage freelancers', to: '/admin/freelancers', icon: UserRoundCheck },
  { label: 'Manage questions', to: '/admin/questions', icon: CircleHelp },
  { label: 'Manage posts', to: '/admin/posts', icon: MessageSquareText },
  { label: 'Manage adverts', to: '/admin/adverts', icon: Megaphone },
  { label: 'Manage contest', to: '/admin/contest', icon: Trophy },
  { label: 'Manage admin users', to: '/admin/admin-users', icon: ShieldCheck },
]

const communityLinks = [
  { label: 'Community categories', to: '/admin/community-categories' },
  { label: 'Communities', to: '/admin/communities' },
]

const jobLinks = [
  { label: 'Jobs awaiting approval', to: '/admin/jobs/awaiting-approval' },
  { label: 'Manage jobs', to: '/admin/jobs' },
  { label: 'Freelance jobs', to: '/admin/freelance-jobs' },
]

const pageLinks = [
  { label: 'Page categories', to: '/admin/page-categories' },
  { label: 'Pages', to: '/admin/pages' },
]

const communitiesActive = computed(() => {
  return communityLinks.some((link) => route.path === link.to)
})

const jobsActive = computed(() => {
  return jobLinks.some((link) => route.path === link.to)
})

const pagesActive = computed(() => {
  return pageLinks.some((link) => route.path === link.to)
})

async function handleLogout() {
  try {
    await logout()
  } finally {
    emit('close')
    router.replace('/auth/login')
  }
}
</script>

<template>
  <div>
    <button
      v-if="open"
      class="fixed inset-0 z-40 bg-[var(--overlay-bg)] lg:hidden"
      aria-label="Close sidebar backdrop"
      @click="$emit('close')"
    />

    <aside
      class="app-scroll fixed inset-y-0 left-0 z-50 w-[17.5rem] border-r border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-3 transition-transform lg:sticky lg:top-20 lg:z-auto lg:max-h-[calc(100vh-5.5rem)] lg:translate-x-0 lg:overflow-y-auto lg:rounded-[1rem] lg:border"
      :class="open ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="mb-3 flex items-center justify-between lg:hidden">
        <p class="text-sm font-semibold text-[var(--text-primary)]">Admin menu</p>
        <button class="grid h-9 w-9 place-items-center rounded-full text-[var(--text-secondary)]" aria-label="Close sidebar" @click="$emit('close')">
          <X class="h-4 w-4" />
        </button>
      </div>

      <section>
        <nav class="space-y-1">
          <RouterLink
            v-for="link in adminLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
            active-class="bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white"
            @click="$emit('close')"
          >
            <component :is="link.icon" class="h-4 w-4 shrink-0" />
            <span>{{ link.label }}</span>
          </RouterLink>

          <div class="pt-1">
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-left text-sm font-medium leading-5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
              :class="communitiesActive ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : ''"
              :aria-expanded="communitiesOpen"
              @click="communitiesOpen = !communitiesOpen"
            >
              <Users class="h-4 w-4 shrink-0" />
              <span class="min-w-0 flex-1 truncate">Communities</span>
              <ChevronDown class="ml-auto h-4 w-4 transition-transform" :class="communitiesOpen ? 'rotate-180' : ''" />
            </button>
            <div v-if="communitiesOpen" class="ml-3 mt-1 space-y-1 border-l border-[color:var(--border-soft)] pl-3">
              <RouterLink
                v-for="link in communityLinks"
                :key="link.to"
                :to="link.to"
                class="flex rounded-[0.75rem] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                active-class="bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                @click="$emit('close')"
              >
                {{ link.label }}
              </RouterLink>
            </div>
          </div>

          <div class="pt-1">
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-left text-sm font-medium leading-5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
              :class="pagesActive ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : ''"
              :aria-expanded="pagesOpen"
              @click="pagesOpen = !pagesOpen"
            >
              <FileStack class="h-4 w-4 shrink-0" />
              <span class="min-w-0 flex-1 truncate">Pages</span>
              <ChevronDown class="ml-auto h-4 w-4 transition-transform" :class="pagesOpen ? 'rotate-180' : ''" />
            </button>
            <div v-if="pagesOpen" class="ml-3 mt-1 space-y-1 border-l border-[color:var(--border-soft)] pl-3">
              <RouterLink
                v-for="link in pageLinks"
                :key="link.to"
                :to="link.to"
                class="flex rounded-[0.75rem] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                active-class="bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                @click="$emit('close')"
              >
                {{ link.label }}
              </RouterLink>
            </div>
          </div>

          <div class="pt-1">
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-left text-sm font-medium leading-5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
              :class="jobsActive ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : ''"
              :aria-expanded="jobsOpen"
              @click="jobsOpen = !jobsOpen"
            >
              <BriefcaseBusiness class="h-4 w-4 shrink-0" />
              <span class="min-w-0 flex-1 truncate">Jobs</span>
              <ChevronDown class="ml-auto h-4 w-4 transition-transform" :class="jobsOpen ? 'rotate-180' : ''" />
            </button>
            <div v-if="jobsOpen" class="ml-3 mt-1 space-y-1 border-l border-[color:var(--border-soft)] pl-3">
              <RouterLink
                v-for="link in jobLinks"
                :key="link.to"
                :to="link.to"
                class="flex rounded-[0.75rem] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                active-class="bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                @click="$emit('close')"
              >
                {{ link.label }}
              </RouterLink>
            </div>
          </div>

          <button
            type="button"
            class="mt-1 flex items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4 shrink-0" />
            <span>Log out</span>
          </button>
        </nav>
      </section>
    </aside>
  </div>
</template>
