<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { BriefcaseBusiness, CircleHelp, FileText, Loader2, RefreshCw, UserRoundCheck, Users } from 'lucide-vue-next'
import StatusChip from '../../components/StatusChip.vue'
import { listFreelancers, listJobs, listPosts, listQuestions, listUsers, type Post, type Question } from '../../services'

type DashboardStat = {
  label: string
  value: number
  detail: string
  tone: 'success' | 'warning' | 'danger' | 'muted' | 'accent'
  icon: typeof Users
  to: string
}

const loading = ref(false)
const error = ref<string | null>(null)
const usersTotal = ref(0)
const postsTotal = ref(0)
const questionsTotal = ref(0)
const jobsTotal = ref(0)
const freelancersTotal = ref(0)
const recentPosts = ref<Post[]>([])
const recentQuestions = ref<Question[]>([])

const stats = computed<DashboardStat[]>(() => [
  {
    label: 'Users',
    value: usersTotal.value,
    detail: 'Registered accounts',
    tone: 'accent',
    icon: Users,
    to: '/admin/users',
  },
  {
    label: 'Posts',
    value: postsTotal.value,
    detail: 'Feed content',
    tone: 'warning',
    icon: FileText,
    to: '/admin/posts',
  },
  {
    label: 'Questions',
    value: questionsTotal.value,
    detail: 'Q&A threads',
    tone: 'success',
    icon: CircleHelp,
    to: '/admin/questions',
  },
  {
    label: 'Jobs',
    value: jobsTotal.value,
    detail: 'Job listings',
    tone: 'muted',
    icon: BriefcaseBusiness,
    to: '/admin/jobs',
  },
  {
    label: 'Freelancers',
    value: freelancersTotal.value,
    detail: 'Talent profiles',
    tone: 'accent',
    icon: UserRoundCheck,
    to: '/admin/freelancers',
  },
])

function formatDate(value?: string | null) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

async function fetchOverview() {
  loading.value = true
  error.value = null

  try {
    const [users, posts, questions, jobs, freelancers] = await Promise.all([
      listUsers({ page: 1, per_page: 1 }),
      listPosts({ page: 1, per_page: 5 }),
      listQuestions({ page: 1, per_page: 5 }),
      listJobs({ page: 1, per_page: 1 }),
      listFreelancers({ page: 1, per_page: 1 }),
    ])

    usersTotal.value = users.total || 0
    postsTotal.value = posts.total || 0
    questionsTotal.value = questions.total || 0
    jobsTotal.value = jobs.total || 0
    freelancersTotal.value = freelancers.total || 0
    recentPosts.value = posts.data || []
    recentQuestions.value = questions.data || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOverview()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Admin</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Overview</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Monitor live platform totals and jump into the main moderation surfaces.</p>
        </div>

        <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading" @click="fetchOverview">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </section>

    <div v-if="loading" class="flex min-h-40 items-center justify-center gap-2 rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] text-sm font-medium text-[var(--text-secondary)]">
      <Loader2 class="h-4 w-4 animate-spin" />
      Loading dashboard
    </div>

    <div v-else-if="error" class="rounded-[1rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
      {{ error }}
    </div>

    <section v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="stat in stats"
        :key="stat.label"
        :to="stat.to"
        class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4 hover:border-[var(--accent-soft)]"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-[var(--text-secondary)]">{{ stat.label }}</p>
            <p class="mt-2 font-display text-3xl font-semibold text-[var(--text-primary)]">{{ stat.value }}</p>
          </div>
          <span class="grid h-10 w-10 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <component :is="stat.icon" class="h-5 w-5" />
          </span>
        </div>
        <StatusChip class="mt-4" :tone="stat.tone">{{ stat.detail }}</StatusChip>
      </RouterLink>
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <div class="min-w-0 overflow-hidden rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
        <div class="border-b border-[color:var(--border-soft)] p-4">
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Recent posts</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Latest loaded feed items.</p>
        </div>
        <div v-if="recentPosts.length === 0" class="p-4 text-sm text-[var(--text-secondary)]">No recent posts loaded.</div>
        <div v-else class="divide-y divide-[color:var(--border-soft)]">
          <RouterLink v-for="post in recentPosts" :key="post.id" to="/admin/posts" class="block p-4 hover:bg-[var(--surface-secondary)]">
            <p class="truncate font-semibold text-[var(--text-primary)]">{{ post.title }}</p>
            <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ post.content }}</p>
            <p class="mt-2 text-xs text-[var(--text-tertiary)]">{{ formatDate(post.created_at) }} / {{ post.comment_count }} comments</p>
          </RouterLink>
        </div>
      </div>

      <div class="min-w-0 overflow-hidden rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
        <div class="border-b border-[color:var(--border-soft)] p-4">
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Recent questions</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Questions linked to their answers page.</p>
        </div>
        <div v-if="recentQuestions.length === 0" class="p-4 text-sm text-[var(--text-secondary)]">No recent questions loaded.</div>
        <div v-else class="divide-y divide-[color:var(--border-soft)]">
          <RouterLink v-for="question in recentQuestions" :key="question.id" :to="`/admin/questions/${question.id}/answers`" class="block p-4 hover:bg-[var(--surface-secondary)]">
            <p class="truncate font-semibold text-[var(--text-primary)]">{{ question.title }}</p>
            <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ question.body }}</p>
            <p class="mt-2 text-xs text-[var(--text-tertiary)]">{{ question.totalAnswers }} answers / {{ formatDate(question.createdAt) }}</p>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
