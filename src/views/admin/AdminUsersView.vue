<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AtSign, Eye, FileText, Loader2, MapPin, Plus, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import { createUser, listUsers, type AdminUser, type LatestRecord, type UserDetailRecord } from '../../services'

const users = ref<AdminUser[]>([])
const search = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const lastPage = ref(1)
const from = ref<number | null>(null)
const to = ref<number | null>(null)
const loading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const showCreateForm = ref(false)
const viewingUser = ref<AdminUser | null>(null)
const activeUserTab = ref<'overview' | 'content' | 'work' | 'network' | 'latest'>('overview')

const email = ref('')
const password = ref('')
const role = ref<'user' | 'admin'>('user')

const filteredUsers = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) {
    return users.value
  }

  return users.value.filter((user) => {
    return `${user.email} ${user.role || ''} ${user.profile?.username || ''} ${user.profile?.location || ''}`.toLowerCase().includes(term)
  })
})

const userStats = computed(() => [
  {
    label: 'Total users',
    value: total.value,
    detail: 'Across all pages',
    icon: Users,
  },
  {
    label: 'Admins',
    value: users.value.filter((user) => user.role === 'admin').length,
    detail: 'On this page',
    icon: ShieldCheck,
  },
  {
    label: 'Posts',
    value: users.value.reduce((sum, user) => sum + user.stats.posts, 0),
    detail: 'On this page',
    icon: FileText,
  },
  {
    label: 'Followers',
    value: users.value.reduce((sum, user) => sum + (user.stats.totalFollowers ?? user.stats.followers), 0),
    detail: 'On this page',
    icon: AtSign,
  },
])

const latestRecords = computed(() => {
  if (!viewingUser.value) {
    return []
  }

  return [
    { label: 'Post', record: viewingUser.value.latest.post },
    { label: 'Question', record: viewingUser.value.latest.question },
    { label: 'Job', record: viewingUser.value.latest.job },
    { label: 'Freelance job', record: viewingUser.value.latest.freelanceJob },
    { label: 'Page', record: viewingUser.value.latest.page },
  ]
})

const detailStats = computed(() => {
  if (!viewingUser.value) {
    return []
  }

  return [
    { label: 'Posts', value: viewingUser.value.stats.posts },
    { label: 'Questions', value: viewingUser.value.stats.questions },
    { label: 'Answers', value: viewingUser.value.stats.answers },
    { label: 'Comments', value: viewingUser.value.stats.comments },
    { label: 'Jobs', value: viewingUser.value.stats.jobs },
    { label: 'Job apps', value: viewingUser.value.stats.jobApplications },
    { label: 'Freelance jobs', value: viewingUser.value.stats.freelanceJobs },
    { label: 'Freelance apps', value: viewingUser.value.stats.freelanceApplications },
    { label: 'Pages', value: viewingUser.value.stats.pages },
    { label: 'Skills', value: viewingUser.value.stats.skills },
    { label: 'Portfolios', value: viewingUser.value.stats.portfolios },
    { label: 'Certifications', value: viewingUser.value.stats.certifications },
    { label: 'Education', value: viewingUser.value.stats.education },
    { label: 'Experiences', value: viewingUser.value.stats.experiences },
  ]
})

const userTabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Content', value: 'content' },
  { label: 'Work', value: 'work' },
  { label: 'Network', value: 'network' },
  { label: 'Latest', value: 'latest' },
] as const

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function roleTone(value: AdminUser['role']) {
  return value === 'admin' ? 'accent' : 'muted'
}

function displayName(user: AdminUser) {
  return user.profile?.username || user.email
}

function getLatestTitle(record: LatestRecord, fallback: string) {
  if (!record) {
    return 'None'
  }

  const value = record.title || record.name || record.slug || record.id
  return typeof value === 'string' ? value : fallback
}

function getLatestDate(record: LatestRecord) {
  if (!record) {
    return null
  }

  const value = record.created_at || record.createdAt || record.updated_at || record.updatedAt
  return typeof value === 'string' ? value : null
}

function getRecordTitle(record: UserDetailRecord) {
  const value = record.skill || record.title || record.name || record.degree || record.company || record.school || record.id
  return typeof value === 'string' ? value : 'Untitled'
}

function getRecordMeta(record: UserDetailRecord) {
  const values = [record.level, record.issuer, record.school, record.degree, record.company, record.link]
    .filter((value) => typeof value === 'string' && value.trim())
    .map(String)

  return values.join(' / ')
}

function openUser(user: AdminUser) {
  viewingUser.value = user
  activeUserTab.value = 'overview'
}

async function fetchUsers() {
  loading.value = true
  error.value = null

  try {
    const response = await listUsers({
      page: page.value,
      per_page: perPage.value,
    })

    users.value = response.data || []
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load users'
    users.value = []
  } finally {
    loading.value = false
  }
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchUsers()
}

function resetCreateForm() {
  email.value = ''
  password.value = ''
  role.value = 'user'
  formError.value = null
}

async function createNewUser() {
  formError.value = null

  if (!email.value.trim() || !password.value.trim()) {
    formError.value = 'Email and password are required'
    return
  }

  creating.value = true

  try {
    await createUser({
      email: email.value.trim(),
      password: password.value,
      role: role.value,
    })

    toast.success('User created')
    resetCreateForm()
    showCreateForm.value = false
    page.value = 1
    await fetchUsers()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create user'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Users</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Manage Users</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Review platform members, aggregate activity counts, latest records, and create user or admin accounts.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="fetchUsers"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            @click="showCreateForm = !showCreateForm"
          >
            <X v-if="showCreateForm" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ showCreateForm ? 'Close form' : 'New user' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-3xl" @submit.prevent="createNewUser">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <Users class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create user</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Create a member account with a user or admin role.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Email</label>
            <input
              v-model="email"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              placeholder="user@example.com"
              type="email"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Role</label>
            <select
              v-model="role"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Password</label>
            <input
              v-model="password"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              placeholder="P@ssw0rd"
              type="password"
            />
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
          {{ formError }}
        </p>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="showCreateForm = false">Cancel</button>
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            {{ creating ? 'Creating...' : 'Create user' }}
          </button>
        </div>
      </form>
    </section>

    <section class="min-w-0 overflow-hidden">
      <div class="app-scroll flex snap-x gap-4 overflow-x-auto pb-1">
        <article v-for="stat in userStats" :key="stat.label" class="min-h-36 min-w-[14rem] snap-start rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
          <div class="flex items-start justify-between gap-3">
            <p class="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{{ stat.label }}</p>
            <span class="grid h-9 w-9 place-items-center rounded-[0.8rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <component :is="stat.icon" class="h-4 w-4" />
            </span>
          </div>
          <p class="mt-5 font-display text-3xl font-semibold leading-none text-[var(--text-primary)]">{{ stat.value }}</p>
          <p class="mt-3 text-sm text-[var(--text-secondary)]">{{ stat.detail }}</p>
        </article>
      </div>
    </section>

    <section class="min-w-0 overflow-hidden rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Users</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} users</p>
        </div>

        <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-80">
          <Search class="h-4 w-4" />
          <input
            v-model="search"
            class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            placeholder="Search loaded users"
            type="search"
          />
        </label>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading users
      </div>

      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No users found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create a user or adjust your search.</p>
        </div>
      </div>

      <div v-else class="app-scroll hidden max-w-full overflow-x-auto md:block">
        <table class="w-full min-w-[58rem] table-fixed text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="w-[34%] px-4 py-3 font-semibold">User</th>
              <th class="w-[16%] px-4 py-3 font-semibold">Location</th>
              <th class="w-[20%] px-4 py-3 font-semibold">Content</th>
              <th class="w-[20%] px-4 py-3 font-semibold">Network</th>
              <th class="w-[10%] px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="user in filteredUsers" :key="user.id">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
                    <img v-if="user.profile?.avatar" :src="user.profile.avatar" alt="" class="h-full w-full object-cover" />
                    <Users v-else class="h-4 w-4 text-[var(--text-tertiary)]" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-[var(--text-primary)]">{{ displayName(user) }}</p>
                    <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ user.email }}</p>
                    <StatusChip class="mt-2" :tone="roleTone(user.role)">{{ user.role || 'No role' }}</StatusChip>
                  </div>
                </div>
              </td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ user.profile?.location || 'Not listed' }}</td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">
                <div>{{ user.stats.posts }} posts / {{ user.stats.questions }} questions</div>
                <div class="mt-1 text-xs text-[var(--text-tertiary)]">{{ user.stats.answers }} answers / {{ user.stats.comments }} comments</div>
              </td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">
                <div>{{ user.stats.totalFollowers ?? user.stats.followers }} followers</div>
                <div class="mt-1 text-xs text-[var(--text-tertiary)]">{{ user.stats.following }} following</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end">
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`View ${displayName(user)}`" @click="openUser(user)">
                    <Eye class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && filteredUsers.length > 0" class="space-y-3 p-4 md:hidden">
        <article v-for="user in filteredUsers" :key="user.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
                <img v-if="user.profile?.avatar" :src="user.profile.avatar" alt="" class="h-full w-full object-cover" />
                <Users v-else class="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <div class="min-w-0">
                <p class="truncate font-semibold text-[var(--text-primary)]">{{ displayName(user) }}</p>
                <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ user.email }}</p>
              </div>
            </div>
            <StatusChip :tone="roleTone(user.role)">{{ user.role || 'No role' }}</StatusChip>
          </div>
          <p v-if="user.profile?.bio" class="mt-3 line-clamp-3 text-sm text-[var(--text-secondary)]">{{ user.profile.bio }}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)]">
            <span class="inline-flex items-center gap-1"><MapPin class="h-3.5 w-3.5" />{{ user.profile?.location || 'Not listed' }}</span>
            <span>{{ user.stats.posts }} posts</span>
            <span>{{ user.stats.totalFollowers ?? user.stats.followers }} followers</span>
          </div>
          <div class="mt-3 flex justify-end">
            <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" :title="`View ${displayName(user)}`" @click="openUser(user)">
              <Eye class="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>

      <div v-if="!loading && !error && total > 0" class="flex flex-col gap-3 border-t border-[color:var(--border-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-[var(--text-secondary)]">Page {{ page }} of {{ lastPage }}</p>
        <div class="flex gap-2">
          <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-50" :disabled="page <= 1" @click="goToPage(page - 1)">Previous</button>
          <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-50" :disabled="page >= lastPage" @click="goToPage(page + 1)">Next</button>
        </div>
      </div>
    </section>

    <div v-if="viewingUser" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingUser = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <div class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
              <img v-if="viewingUser.profile?.avatar" :src="viewingUser.profile.avatar" alt="" class="h-full w-full object-cover" />
              <Users v-else class="h-5 w-5 text-[var(--text-tertiary)]" />
            </div>
            <div class="min-w-0">
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">User details</p>
              <h2 class="mt-2 truncate font-display text-xl font-semibold text-[var(--text-primary)]">{{ displayName(viewingUser) }}</h2>
              <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ viewingUser.email }}</p>
            </div>
          </div>
          <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingUser = null">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <StatusChip :tone="roleTone(viewingUser.role)">{{ viewingUser.role || 'No role' }}</StatusChip>
          <StatusChip tone="muted">Joined {{ formatDate(viewingUser.created_at) }}</StatusChip>
          <StatusChip tone="muted">Updated {{ formatDate(viewingUser.updated_at) }}</StatusChip>
        </div>

        <div class="app-scroll mt-5 flex gap-2 overflow-x-auto border-b border-[color:var(--border-soft)] pb-2">
          <button
            v-for="tab in userTabs"
            :key="tab.value"
            type="button"
            class="h-9 shrink-0 rounded-[0.75rem] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
            :class="activeUserTab === tab.value ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white' : ''"
            @click="activeUserTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="activeUserTab === 'overview'" class="mt-5 space-y-3">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Profile</p>
            <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{{ viewingUser.profile?.bio || 'No bio provided' }}</p>
            <p class="mt-2 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]">
              <MapPin class="h-4 w-4" />
              {{ viewingUser.profile?.location || 'Not listed' }}
            </p>
          </div>
          <div class="grid gap-2 sm:grid-cols-3">
            <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
              <p class="text-xs text-[var(--text-tertiary)]">Skills</p>
              <p class="mt-1 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingUser.stats.skills }}</p>
            </div>
            <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
              <p class="text-xs text-[var(--text-tertiary)]">Portfolios</p>
              <p class="mt-1 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingUser.stats.portfolios }}</p>
            </div>
            <div class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
              <p class="text-xs text-[var(--text-tertiary)]">Certifications</p>
              <p class="mt-1 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingUser.stats.certifications }}</p>
            </div>
          </div>
        </div>

        <div v-else-if="activeUserTab === 'content'" class="mt-5 grid gap-2 sm:grid-cols-3">
          <div v-for="item in detailStats.filter((stat) => ['Posts', 'Questions', 'Answers', 'Comments', 'Jobs', 'Job apps', 'Freelance jobs', 'Freelance apps', 'Pages'].includes(stat.label))" :key="item.label" class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs text-[var(--text-tertiary)]">{{ item.label }}</p>
            <p class="mt-1 font-display text-xl font-semibold text-[var(--text-primary)]">{{ item.value }}</p>
          </div>
        </div>

        <div v-else-if="activeUserTab === 'work'" class="mt-5 space-y-4">
          <div>
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Skills</h3>
            <div v-if="viewingUser.skills.length" class="mt-2 space-y-2">
              <div v-for="item in viewingUser.skills" :key="String(item.id || getRecordTitle(item))" class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="font-semibold text-[var(--text-primary)]">{{ getRecordTitle(item) }}</p>
                <p v-if="getRecordMeta(item)" class="mt-1 text-sm text-[var(--text-secondary)]">{{ getRecordMeta(item) }}</p>
              </div>
            </div>
            <p v-else class="mt-2 rounded-[0.85rem] bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-secondary)]">No skills listed</p>
          </div>

          <div>
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Portfolios</h3>
            <div v-if="viewingUser.portfolios.length" class="mt-2 space-y-2">
              <div v-for="item in viewingUser.portfolios" :key="String(item.id || getRecordTitle(item))" class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="font-semibold text-[var(--text-primary)]">{{ getRecordTitle(item) }}</p>
                <p v-if="getRecordMeta(item)" class="mt-1 break-all text-sm text-[var(--text-secondary)]">{{ getRecordMeta(item) }}</p>
              </div>
            </div>
            <p v-else class="mt-2 rounded-[0.85rem] bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-secondary)]">No portfolios listed</p>
          </div>

          <div>
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Certifications</h3>
            <div v-if="viewingUser.certifications.length" class="mt-2 space-y-2">
              <div v-for="item in viewingUser.certifications" :key="String(item.id || getRecordTitle(item))" class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="font-semibold text-[var(--text-primary)]">{{ getRecordTitle(item) }}</p>
                <p v-if="getRecordMeta(item)" class="mt-1 text-sm text-[var(--text-secondary)]">{{ getRecordMeta(item) }}</p>
              </div>
            </div>
            <p v-else class="mt-2 rounded-[0.85rem] bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-secondary)]">No certifications listed</p>
          </div>

          <div>
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Education</h3>
            <div v-if="viewingUser.education.length" class="mt-2 space-y-2">
              <div v-for="item in viewingUser.education" :key="String(item.id || getRecordTitle(item))" class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="font-semibold text-[var(--text-primary)]">{{ getRecordTitle(item) }}</p>
                <p v-if="getRecordMeta(item)" class="mt-1 text-sm text-[var(--text-secondary)]">{{ getRecordMeta(item) }}</p>
              </div>
            </div>
            <p v-else class="mt-2 rounded-[0.85rem] bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-secondary)]">No education listed</p>
          </div>

          <div>
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Experiences</h3>
            <div v-if="viewingUser.experiences.length" class="mt-2 space-y-2">
              <div v-for="item in viewingUser.experiences" :key="String(item.id || getRecordTitle(item))" class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="font-semibold text-[var(--text-primary)]">{{ getRecordTitle(item) }}</p>
                <p v-if="getRecordMeta(item)" class="mt-1 text-sm text-[var(--text-secondary)]">{{ getRecordMeta(item) }}</p>
              </div>
            </div>
            <p v-else class="mt-2 rounded-[0.85rem] bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-secondary)]">No experiences listed</p>
          </div>
        </div>

        <div v-else-if="activeUserTab === 'network'" class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Communities</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingUser.stats.communities }} joined</p>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ viewingUser.stats.ownedCommunities }} owned</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Following</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingUser.stats.totalFollowers ?? viewingUser.stats.followers }} followers</p>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ viewingUser.stats.following }} following</p>
          </div>
        </div>

        <div v-else class="mt-5">
          <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Latest records</h3>
          <div class="mt-3 space-y-2">
            <div v-for="record in latestRecords" :key="record.label" class="rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{{ record.label }}</p>
              <p class="mt-1 font-semibold text-[var(--text-primary)]">{{ getLatestTitle(record.record, 'Untitled') }}</p>
              <p class="mt-1 text-xs text-[var(--text-secondary)]">{{ formatDate(getLatestDate(record.record)) }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
