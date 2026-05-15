<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BriefcaseBusiness, Eye, Loader2, Plus, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import {
  createFreelanceJob,
  deleteFreelanceJob,
  listFreelanceJobs,
  listMyFreelanceApplications,
  listMyFreelanceJobs,
  updateFreelanceJobStatus,
  type FreelanceApplication,
  type FreelanceJob,
  type FreelanceJobStatus,
  type FreelanceJobType,
} from '../../services'

type Tab = 'public' | 'posted' | 'applications'

const tabs: Array<{ label: string; value: Tab }> = [
  { label: 'Public jobs', value: 'public' },
  { label: 'My posted', value: 'posted' },
  { label: 'Applications', value: 'applications' },
]

const statusOptions: Array<{ label: string; value: FreelanceJobStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Pending review', value: 'pending_review' },
  { label: 'Live', value: 'live' },
  { label: 'Approved', value: 'approved' },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Deleted', value: 'deleted' },
]

const typeOptions: Array<{ label: string; value: FreelanceJobType | '' }> = [
  { label: 'All types', value: '' },
  { label: 'Contract', value: 'contract' },
  { label: 'Part-time', value: 'part-time' },
  { label: 'Project-based', value: 'project-based' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
]

const activeTab = ref<Tab>('public')
const jobs = ref<FreelanceJob[]>([])
const applications = ref<FreelanceApplication[]>([])
const query = ref('')
const status = ref<FreelanceJobStatus | ''>('')
const sort = ref('')
const skill = ref('')
const location = ref('')
const type = ref<FreelanceJobType | ''>('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const lastPage = ref(1)
const from = ref<number | null>(null)
const to = ref<number | null>(null)
const loading = ref(false)
const creating = ref(false)
const deletingId = ref<string | null>(null)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const showCreateForm = ref(false)
const viewingJob = ref<FreelanceJob | null>(null)
const viewingApplication = ref<FreelanceApplication | null>(null)
const updatingStatusId = ref<string | null>(null)

const title = ref('')
const companyName = ref('')
const skills = ref('')
const jobLocation = ref('')
const jobType = ref<FreelanceJobType>('project-based')
const description = ref('')
const qualifications = ref('')
const minFee = ref('')
const maxFee = ref('')
const currency = ref('NGN')
const applicationEndDate = ref('')
const agreedToTerms = ref(true)

const currentRowsLabel = computed(() => activeTab.value === 'applications' ? 'applications' : 'jobs')

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatLabel(value?: string | null) {
  if (!value) return 'Not available'
  return value.replace(/_/g, ' ').replace(/-/g, ' ')
}

function statusTone(value: string) {
  if (value === 'live' || value === 'approved' || value === 'active' || value === 'submitted') return 'success'
  if (value === 'pending_review') return 'warning'
  if (value === 'closed' || value === 'archived' || value === 'deleted' || value === 'suspended') return 'danger'
  return 'muted'
}

function formatFee(job: FreelanceJob) {
  if (job.feeLabel) return job.feeLabel
  if (job.minFee === null && job.maxFee === null) return 'Not listed'

  const code = job.currency || ''
  const minimum = job.minFee !== null ? `${code} ${job.minFee.toLocaleString()}` : null
  const maximum = job.maxFee !== null ? `${code} ${job.maxFee.toLocaleString()}` : null
  return [minimum, maximum].filter(Boolean).join(' - ')
}

function parseSkills() {
  return skills.value.split(',').map((item) => item.trim()).filter(Boolean)
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed)) throw new Error('Fee values must be valid numbers')
  return parsed
}

async function fetchRows() {
  loading.value = true
  error.value = null

  try {
    const params = {
      page: page.value,
      per_page: perPage.value,
      q: query.value,
      status: status.value,
      sort: sort.value,
      skill: skill.value,
      location: location.value,
      type: type.value,
    }

    const response = activeTab.value === 'public'
      ? await listFreelanceJobs(params)
      : activeTab.value === 'posted'
        ? await listMyFreelanceJobs(params)
        : await listMyFreelanceApplications({
          page: page.value,
          per_page: perPage.value,
          q: query.value,
          status: status.value,
          sort: sort.value,
        })

    if (activeTab.value === 'applications') {
      applications.value = response.data as FreelanceApplication[]
      jobs.value = []
    } else {
      jobs.value = response.data as FreelanceJob[]
      applications.value = []
    }

    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load freelance jobs'
    jobs.value = []
    applications.value = []
  } finally {
    loading.value = false
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  page.value = 1
  fetchRows()
}

function applyFilters() {
  page.value = 1
  fetchRows()
}

function resetFilters() {
  query.value = ''
  status.value = ''
  sort.value = ''
  skill.value = ''
  location.value = ''
  type.value = ''
  applyFilters()
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchRows()
}

function resetCreateForm() {
  title.value = ''
  companyName.value = ''
  skills.value = ''
  jobLocation.value = ''
  jobType.value = 'project-based'
  description.value = ''
  qualifications.value = ''
  minFee.value = ''
  maxFee.value = ''
  currency.value = 'NGN'
  applicationEndDate.value = ''
  agreedToTerms.value = true
  formError.value = null
}

async function createNewFreelanceJob() {
  formError.value = null
  const parsedSkills = parseSkills()

  if (!title.value.trim() || !companyName.value.trim() || !jobLocation.value.trim() || !description.value.trim() || !qualifications.value.trim() || !applicationEndDate.value || parsedSkills.length === 0) {
    formError.value = 'Title, company, skills, location, description, qualifications, and application end date are required'
    return
  }

  if (!agreedToTerms.value) {
    formError.value = 'Terms agreement is required'
    return
  }

  creating.value = true

  try {
    await createFreelanceJob({
      title: title.value.trim(),
      companyName: companyName.value.trim(),
      skills: parsedSkills,
      location: jobLocation.value.trim(),
      type: jobType.value,
      description: description.value.trim(),
      qualifications: qualifications.value.trim(),
      minFee: parseOptionalNumber(minFee.value),
      maxFee: parseOptionalNumber(maxFee.value),
      currency: currency.value.trim() || undefined,
      applicationEndDate: applicationEndDate.value,
      agreedToTerms: agreedToTerms.value,
    })

    toast.success('Freelance job created')
    resetCreateForm()
    showCreateForm.value = false
    activeTab.value = 'posted'
    page.value = 1
    await fetchRows()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create freelance job'
  } finally {
    creating.value = false
  }
}

async function removeFreelanceJob(job: FreelanceJob) {
  deletingId.value = job.id

  try {
    await deleteFreelanceJob(job.id)
    toast.success('Freelance job deleted')
    jobs.value = jobs.value.filter((item) => item.id !== job.id)
    total.value = Math.max(total.value - 1, 0)
    if (viewingJob.value?.id === job.id) viewingJob.value = null
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to delete freelance job')
  } finally {
    deletingId.value = null
  }
}

async function changeFreelanceJobStatus(job: FreelanceJob, nextStatus: FreelanceJobStatus) {
  updatingStatusId.value = job.id

  try {
    const response = await updateFreelanceJobStatus(job.id, nextStatus)
    jobs.value = jobs.value.map((item) => item.id === response.data.id ? response.data : item)
    if (viewingJob.value?.id === job.id) viewingJob.value = response.data
    toast.success(`Freelance job moved to ${formatLabel(nextStatus)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to update freelance job status')
  } finally {
    updatingStatusId.value = null
  }
}

onMounted(() => {
  fetchRows()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Freelance Jobs</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Manage Freelance Jobs</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Review public freelance jobs, your posted jobs, and freelance applications.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading" @click="fetchRows">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="showCreateForm = !showCreateForm">
            <X v-if="showCreateForm" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ showCreateForm ? 'Close form' : 'New freelance job' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-4xl" @submit.prevent="createNewFreelanceJob">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <BriefcaseBusiness class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create freelance job</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Skills are submitted as an array, matching the freelance jobs schema.</p>
          </div>
        </div>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <input v-model="title" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Title" />
          <input v-model="companyName" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Company name" />
          <input v-model="skills" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="JavaScript, React" />
          <input v-model="jobLocation" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Location" />
          <select v-model="jobType" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]">
            <option v-for="option in typeOptions.filter((item) => item.value)" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <input v-model="applicationEndDate" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" type="date" />
          <input v-model="minFee" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Minimum fee" inputmode="numeric" />
          <input v-model="maxFee" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Maximum fee" inputmode="numeric" />
          <input v-model="currency" class="h-11 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="NGN" />
          <label class="inline-flex h-11 items-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)]">
            <input v-model="agreedToTerms" type="checkbox" class="h-4 w-4 accent-[var(--accent)]" />
            Terms agreed
          </label>
          <textarea v-model="description" class="min-h-28 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)] md:col-span-2" placeholder="Description"></textarea>
          <textarea v-model="qualifications" class="min-h-28 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)] md:col-span-2" placeholder="Qualifications"></textarea>
        </div>
        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ formError }}</p>
        <div class="mt-5 flex justify-end">
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            {{ creating ? 'Creating...' : 'Create freelance job' }}
          </button>
        </div>
      </form>
    </section>

    <section class="min-w-0 overflow-hidden rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="border-b border-[color:var(--border-soft)] p-4">
        <div class="app-scroll flex gap-2 overflow-x-auto pb-2">
          <button v-for="tab in tabs" :key="tab.value" type="button" class="h-9 shrink-0 rounded-[0.75rem] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :class="activeTab === tab.value ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white' : ''" @click="switchTab(tab.value)">
            {{ tab.label }}
          </button>
        </div>
        <div class="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
          <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
            <Search class="h-4 w-4" />
            <input v-model="query" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search" type="search" @keyup.enter="applyFilters" />
          </label>
          <select v-model="status" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" @change="applyFilters">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <select v-if="activeTab !== 'applications'" v-model="type" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" @change="applyFilters">
            <option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <input v-if="activeTab !== 'applications'" v-model="skill" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Skill" @keyup.enter="applyFilters" />
          <input v-if="activeTab !== 'applications'" v-model="location" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Location" @keyup.enter="applyFilters" />
          <div class="flex gap-2">
            <button type="button" class="h-10 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="applyFilters">Apply</button>
            <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="resetFilters">Reset</button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading {{ currentRowsLabel }}
      </div>
      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
      </div>

      <div v-else-if="activeTab !== 'applications' && jobs.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <p class="font-semibold text-[var(--text-primary)]">No freelance jobs found</p>
      </div>
      <div v-else-if="activeTab === 'applications' && applications.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <p class="font-semibold text-[var(--text-primary)]">No applications found</p>
      </div>

      <div v-else-if="activeTab !== 'applications'" class="app-scroll hidden max-w-full overflow-x-auto md:block">
        <table class="w-full min-w-[68rem] table-fixed text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="w-[30%] px-4 py-3 font-semibold">Job</th>
              <th class="w-[16%] px-4 py-3 font-semibold">Company</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Location</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Fee</th>
              <th class="w-[10%] px-4 py-3 font-semibold">Status</th>
              <th class="w-[16%] px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="job in jobs" :key="job.id">
              <td class="px-4 py-3">
                <p class="truncate font-semibold text-[var(--text-primary)]">{{ job.title }}</p>
                <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ job.description || job.slug }}</p>
              </td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ job.companyName }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ job.location || 'Not listed' }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ formatFee(job) }}</td>
              <td class="px-4 py-3"><StatusChip :tone="statusTone(job.status)">{{ formatLabel(job.status) }}</StatusChip></td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" @click="viewingJob = job"><Eye class="h-4 w-4" /></button>
                  <select class="h-9 rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-2 text-xs capitalize outline-none focus:border-[var(--accent)] disabled:opacity-60" :disabled="updatingStatusId === job.id" :value="job.status" @change="changeFreelanceJobStatus(job, ($event.target as HTMLSelectElement).value as FreelanceJobStatus)">
                    <option v-for="option in statusOptions.filter((item) => item.value)" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-400/20 dark:text-red-200 dark:hover:bg-red-400/10" :disabled="deletingId === job.id" @click="removeFreelanceJob(job)">
                    <Loader2 v-if="deletingId === job.id" class="h-4 w-4 animate-spin" />
                    <Trash2 v-else class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="divide-y divide-[color:var(--border-soft)]">
        <article v-for="application in applications" :key="application.id" class="p-4">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="font-semibold text-[var(--text-primary)]">Application {{ application.id }}</p>
              <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ application.proposal || 'No proposal provided' }}</p>
            </div>
            <div class="flex gap-2">
              <StatusChip :tone="statusTone(application.status)">{{ application.status }}</StatusChip>
              <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" @click="viewingApplication = application"><Eye class="h-4 w-4" /></button>
            </div>
          </div>
          <p class="mt-2 text-xs text-[var(--text-tertiary)]">{{ application.currency || '' }} {{ application.bidAmount?.toLocaleString() || 'No bid' }} / {{ formatDate(application.appliedAt) }}</p>
        </article>
      </div>

      <div v-if="!loading && !error && total > 0" class="flex flex-col gap-3 border-t border-[color:var(--border-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-[var(--text-secondary)]">Page {{ page }} of {{ lastPage }} / {{ from || 0 }}-{{ to || 0 }} of {{ total }}</p>
        <div class="flex gap-2">
          <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-50" :disabled="page <= 1" @click="goToPage(page - 1)">Previous</button>
          <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-50" :disabled="page >= lastPage" @click="goToPage(page + 1)">Next</button>
        </div>
      </div>
    </section>

    <div v-if="viewingJob" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingJob = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Freelance job details</p>
            <h2 class="mt-2 truncate font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingJob.title }}</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ viewingJob.companyName }} / {{ viewingJob.location || 'Not listed' }}</p>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingJob = null"><X class="h-4 w-4" /></button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <StatusChip :tone="statusTone(viewingJob.status)">{{ formatLabel(viewingJob.status) }}</StatusChip>
          <StatusChip tone="accent">{{ formatLabel(viewingJob.type) }}</StatusChip>
          <StatusChip :tone="viewingJob.verified ? 'success' : 'muted'">{{ viewingJob.verified ? 'Verified' : 'Unverified' }}</StatusChip>
          <select class="h-9 rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-2 text-xs capitalize outline-none focus:border-[var(--accent)] disabled:opacity-60" :disabled="updatingStatusId === viewingJob.id" :value="viewingJob.status" @change="changeFreelanceJobStatus(viewingJob, ($event.target as HTMLSelectElement).value as FreelanceJobStatus)">
            <option v-for="option in statusOptions.filter((item) => item.value)" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        <div class="mt-5 space-y-4">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Description</p>
            <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">{{ viewingJob.description || 'No description provided' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Qualifications</p>
            <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">{{ viewingJob.qualifications || 'No qualifications provided' }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span v-for="item in viewingJob.skills" :key="item" class="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">{{ item }}</span>
          </div>
        </div>
      </section>
    </div>

    <div v-if="viewingApplication" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingApplication = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Application details</p>
            <h2 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingApplication.status }}</h2>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingApplication = null"><X class="h-4 w-4" /></button>
        </div>
        <p class="mt-5 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">{{ viewingApplication.proposal || 'No proposal provided' }}</p>
        <div class="mt-5 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <p class="text-sm font-semibold text-[var(--text-primary)]">Bid</p>
          <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ viewingApplication.currency || '' }} {{ viewingApplication.bidAmount?.toLocaleString() || 'No bid' }}</p>
        </div>
      </section>
    </div>
  </div>
</template>
