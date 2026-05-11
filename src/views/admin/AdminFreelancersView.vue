<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BadgeCheck, Eye, Loader2, MapPin, Plus, RefreshCw, Search, Star, UserRoundCheck, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import {
  createFreelancer,
  listFreelancers,
  type Freelancer,
  type FreelancerAvailability,
  type FreelancerStatus,
} from '../../services'

const statusOptions: Array<{ label: string; value: FreelancerStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending review', value: 'pending_review' },
  { label: 'Available', value: 'available' },
  { label: 'Certified', value: 'certified' },
  { label: 'Suspended', value: 'suspended' },
]

const availabilityOptions: Array<{ label: string; value: FreelancerAvailability | '' }> = [
  { label: 'All availability', value: '' },
  { label: 'Available now', value: 'available_now' },
  { label: 'Open', value: 'open' },
  { label: 'Busy', value: 'busy' },
  { label: 'Unavailable', value: 'unavailable' },
]

const sortOptions = [
  { label: 'Newest first', value: '' },
  { label: 'Name', value: 'name' },
  { label: 'Rating', value: 'rating' },
  { label: 'Completed jobs', value: 'completed_jobs' },
]

const freelancers = ref<Freelancer[]>([])
const query = ref('')
const status = ref<FreelancerStatus | ''>('')
const sort = ref('')
const skill = ref('')
const location = ref('')
const availability = ref<FreelancerAvailability | ''>('')
const remoteOnly = ref(false)
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
const viewingFreelancer = ref<Freelancer | null>(null)

const name = ref('')
const title = ref('')
const skills = ref('')
const freelancerLocation = ref('')
const bio = ref('')
const passportMediaId = ref('')
const freelancerAvailability = ref<FreelancerAvailability>('available_now')
const freelancerRemoteOnly = ref(false)
const agreedToTerms = ref(true)

const freelancerStats = computed(() => [
  {
    label: 'Total profiles',
    value: total.value,
    detail: 'Across all pages',
    icon: UserRoundCheck,
  },
  {
    label: 'Available',
    value: freelancers.value.filter((freelancer) => freelancer.status === 'available').length,
    detail: 'On this page',
    icon: BadgeCheck,
  },
  {
    label: 'Certified',
    value: freelancers.value.filter((freelancer) => freelancer.status === 'certified').length,
    detail: 'On this page',
    icon: Star,
  },
  {
    label: 'Remote only',
    value: freelancers.value.filter((freelancer) => freelancer.remoteOnly).length,
    detail: 'On this page',
    icon: MapPin,
  },
])

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

function formatLabel(value?: string | null) {
  if (!value) {
    return 'Not available'
  }

  return value.replace(/_/g, ' ').replace(/-/g, ' ')
}

function statusTone(value: FreelancerStatus) {
  if (value === 'available' || value === 'certified') return 'success'
  if (value === 'pending_review') return 'warning'
  if (value === 'suspended') return 'danger'
  return 'muted'
}

function formatRate(freelancer: Freelancer) {
  if (freelancer.hourlyRateMin === null && freelancer.hourlyRateMax === null) {
    return 'Not listed'
  }

  const currency = freelancer.currency || ''
  const minimum = freelancer.hourlyRateMin !== null ? `${currency} ${freelancer.hourlyRateMin.toLocaleString()}` : null
  const maximum = freelancer.hourlyRateMax !== null ? `${currency} ${freelancer.hourlyRateMax.toLocaleString()}` : null

  return [minimum, maximum].filter(Boolean).join(' - ')
}

function parseSkills() {
  return skills.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function fetchFreelancers() {
  loading.value = true
  error.value = null

  try {
    const response = await listFreelancers({
      page: page.value,
      per_page: perPage.value,
      q: query.value,
      status: status.value,
      sort: sort.value,
      skill: skill.value,
      location: location.value,
      availability: availability.value,
      remoteOnly: remoteOnly.value || undefined,
    })

    freelancers.value = response.data || []
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load freelancers'
    freelancers.value = []
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  fetchFreelancers()
}

function resetFilters() {
  query.value = ''
  status.value = ''
  sort.value = ''
  skill.value = ''
  location.value = ''
  availability.value = ''
  remoteOnly.value = false
  applyFilters()
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchFreelancers()
}

function resetCreateForm() {
  name.value = ''
  title.value = ''
  skills.value = ''
  freelancerLocation.value = ''
  bio.value = ''
  passportMediaId.value = ''
  freelancerAvailability.value = 'available_now'
  freelancerRemoteOnly.value = false
  agreedToTerms.value = true
  formError.value = null
}

async function createNewFreelancer() {
  formError.value = null

  if (!name.value.trim() || !title.value.trim() || !freelancerLocation.value.trim() || !bio.value.trim() || parseSkills().length === 0) {
    formError.value = 'Name, title, skills, location, and bio are required'
    return
  }

  if (!agreedToTerms.value) {
    formError.value = 'Terms agreement is required'
    return
  }

  creating.value = true

  try {
    await createFreelancer({
      name: name.value.trim(),
      title: title.value.trim(),
      skills: parseSkills(),
      location: freelancerLocation.value.trim(),
      bio: bio.value.trim(),
      passportMediaId: passportMediaId.value.trim() || undefined,
      availability: freelancerAvailability.value,
      remoteOnly: freelancerRemoteOnly.value,
      agreedToTerms: agreedToTerms.value,
    })

    toast.success('Freelancer profile created')
    resetCreateForm()
    showCreateForm.value = false
    page.value = 1
    await fetchFreelancers()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create freelancer profile'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchFreelancers()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Freelancers</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Manage Freelancers</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Review approved freelancer profiles, filter public availability, and create freelancer records.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60" :disabled="loading" @click="fetchFreelancers">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="showCreateForm = !showCreateForm">
            <X v-if="showCreateForm" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ showCreateForm ? 'Close form' : 'New freelancer' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-4xl" @submit.prevent="createNewFreelancer">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <UserRoundCheck class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create freelancer profile</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Register a profile with skills, location, bio, and availability.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
            <input v-model="name" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Samuel Bada" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Title</label>
            <input v-model="title" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Software Developer" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Location</label>
            <input v-model="freelancerLocation" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Lagos" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Skills</label>
            <input v-model="skills" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Vue, Node.js" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Availability</label>
            <select v-model="freelancerAvailability" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]">
              <option v-for="option in availabilityOptions.filter((item) => item.value)" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Passport media ID</label>
            <input v-model="passportMediaId" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="media-uuid" />
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Bio</label>
            <textarea v-model="bio" class="min-h-32 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Describe achievements, skills, and experience."></textarea>
          </div>
          <div class="md:col-span-2 flex flex-wrap gap-3">
            <label class="inline-flex items-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]">
              <input v-model="freelancerRemoteOnly" type="checkbox" class="h-4 w-4 accent-[var(--accent)]" />
              Remote only
            </label>
            <label class="inline-flex items-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]">
              <input v-model="agreedToTerms" type="checkbox" class="h-4 w-4 accent-[var(--accent)]" />
              Terms agreed
            </label>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ formError }}</p>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="showCreateForm = false">Cancel</button>
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            {{ creating ? 'Creating...' : 'Create freelancer' }}
          </button>
        </div>
      </form>
    </section>

    <section class="min-w-0 overflow-hidden">
      <div class="app-scroll flex snap-x gap-4 overflow-x-auto pb-1">
        <article v-for="stat in freelancerStats" :key="stat.label" class="min-h-36 min-w-[14rem] snap-start rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
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
      <div class="border-b border-[color:var(--border-soft)] p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Freelancer profiles</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} profiles</p>
          </div>

          <div class="grid min-w-0 gap-2 sm:grid-cols-2">
            <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
              <Search class="h-4 w-4" />
              <input v-model="query" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search freelancers" type="search" @keyup.enter="applyFilters" />
            </label>
            <select v-model="status" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" @change="applyFilters">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select v-model="availability" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" @change="applyFilters">
              <option v-for="option in availabilityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select v-model="sort" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" @change="applyFilters">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <label class="inline-flex h-10 items-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)]">
              <input v-model="remoteOnly" type="checkbox" class="h-4 w-4 accent-[var(--accent)]" @change="applyFilters" />
              Remote only
            </label>
          </div>
        </div>

        <div class="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <input v-model="skill" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="Filter by skill" @keyup.enter="applyFilters" />
          <input v-model="location" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="Filter by location" @keyup.enter="applyFilters" />
          <button type="button" class="h-10 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="applyFilters">Apply</button>
          <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="resetFilters">Reset</button>
        </div>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading freelancers
      </div>
      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
      </div>
      <div v-else-if="freelancers.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No freelancers found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create a profile or adjust the active filters.</p>
        </div>
      </div>

      <div v-else class="app-scroll hidden max-w-full overflow-x-auto md:block">
        <table class="w-full min-w-[66rem] table-fixed text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="w-[30%] px-4 py-3 font-semibold">Freelancer</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Location</th>
              <th class="w-[15%] px-4 py-3 font-semibold">Availability</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Rate</th>
              <th class="w-[11%] px-4 py-3 font-semibold">Work</th>
              <th class="w-[10%] px-4 py-3 font-semibold">Status</th>
              <th class="w-[6%] px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="freelancer in freelancers" :key="freelancer.id">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
                    <img v-if="freelancer.avatar" :src="freelancer.avatar" alt="" class="h-full w-full object-cover" />
                    <UserRoundCheck v-else class="h-4 w-4 text-[var(--text-tertiary)]" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-[var(--text-primary)]">{{ freelancer.name }}</p>
                    <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ freelancer.title }}</p>
                    <div v-if="freelancer.skills.length" class="mt-2 flex flex-wrap gap-1.5 overflow-hidden">
                      <span v-for="item in freelancer.skills.slice(0, 3)" :key="item" class="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[0.7rem] font-semibold text-[var(--text-tertiary)]">{{ item }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ freelancer.location || 'Not listed' }}</td>
              <td class="px-4 py-3 capitalize text-[var(--text-secondary)]">
                <div class="truncate">{{ formatLabel(freelancer.availability) }}</div>
                <div class="mt-1 truncate text-xs text-[var(--text-tertiary)]">{{ freelancer.remoteOnly ? 'Remote only' : 'Flexible' }}</div>
              </td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ formatRate(freelancer) }}</td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">
                <div>{{ freelancer.completedJobsCount }} completed</div>
                <div class="mt-1 text-xs text-[var(--text-tertiary)]">{{ freelancer.rating ?? 'No rating' }}</div>
              </td>
              <td class="px-4 py-3">
                <StatusChip :tone="statusTone(freelancer.status)">{{ formatLabel(freelancer.status) }}</StatusChip>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end">
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`View ${freelancer.name}`" @click="viewingFreelancer = freelancer">
                    <Eye class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && freelancers.length > 0" class="space-y-3 p-4 md:hidden">
        <article v-for="freelancer in freelancers" :key="freelancer.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-[var(--text-primary)]">{{ freelancer.name }}</p>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ freelancer.title }}</p>
            </div>
            <StatusChip :tone="statusTone(freelancer.status)">{{ formatLabel(freelancer.status) }}</StatusChip>
          </div>
          <p class="mt-3 line-clamp-3 text-sm text-[var(--text-secondary)]">{{ freelancer.bio || 'No bio provided' }}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)]">
            <span class="inline-flex items-center gap-1"><MapPin class="h-3.5 w-3.5" />{{ freelancer.location || 'Not listed' }}</span>
            <span>{{ formatLabel(freelancer.availability) }}</span>
            <span>{{ freelancer.completedJobsCount }} completed</span>
          </div>
          <div class="mt-3 flex justify-end">
            <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" :title="`View ${freelancer.name}`" @click="viewingFreelancer = freelancer">
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

    <div v-if="viewingFreelancer" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingFreelancer = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <div class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
              <img v-if="viewingFreelancer.avatar" :src="viewingFreelancer.avatar" alt="" class="h-full w-full object-cover" />
              <UserRoundCheck v-else class="h-5 w-5 text-[var(--text-tertiary)]" />
            </div>
            <div class="min-w-0">
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Freelancer details</p>
              <h2 class="mt-2 truncate font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingFreelancer.name }}</h2>
              <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ viewingFreelancer.title }}</p>
            </div>
          </div>
          <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingFreelancer = null">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <StatusChip :tone="statusTone(viewingFreelancer.status)">{{ formatLabel(viewingFreelancer.status) }}</StatusChip>
          <StatusChip tone="accent">{{ formatLabel(viewingFreelancer.availability) }}</StatusChip>
          <StatusChip tone="muted">{{ viewingFreelancer.remoteOnly ? 'Remote only' : 'Flexible' }}</StatusChip>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Bio</p>
            <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{{ viewingFreelancer.bio || 'No bio provided' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Work</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingFreelancer.completedJobsCount }} completed jobs</p>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Rating: {{ viewingFreelancer.rating ?? 'No rating' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Location</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingFreelancer.location || 'Not listed' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Rate</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ formatRate(viewingFreelancer) }}</p>
          </div>
        </div>

        <div v-if="viewingFreelancer.skills.length" class="mt-5">
          <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Skills</h3>
          <div class="mt-2 flex flex-wrap gap-2">
            <span v-for="item in viewingFreelancer.skills" :key="item" class="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">{{ item }}</span>
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Passport media</p>
            <p class="mt-2 font-mono text-xs text-[var(--text-secondary)]">{{ viewingFreelancer.passportMediaId || 'Not attached' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Updated</p>
            <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ formatDate(viewingFreelancer.updatedAt) }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
