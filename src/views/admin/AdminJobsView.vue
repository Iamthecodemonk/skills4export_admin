<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BriefcaseBusiness,
  CalendarDays,
  Eye,
  Loader2,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import { apiRequest } from '../../composables/useApi'
import {
  createJob,
  listFreelanceJobs,
  listJobs,
  listMyFreelanceJobs,
  listMyPostedJobs,
  updateFreelanceJobStatus,
  updateJobStatus,
  type FreelanceJob,
  type FreelanceJobStatus,
  type FreelanceJobType,
  type Job,
  type JobStatus,
  type JobType,
  type WorkMode,
} from '../../services'

type JobFeedTab = 'regular' | 'freelance'

const props = withDefaults(defineProps<{
  defaultStatus?: JobStatus | ''
  pageTitle?: string
  pageDescription?: string
}>(), {
  defaultStatus: '',
  pageTitle: 'Manage Jobs',
  pageDescription: 'Create postings, review approvals, inspect applicants, and manage the public job feed.',
})

const statusOptions: Array<{ label: string; value: JobStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending review', value: 'pending_review' },
  { label: 'Live', value: 'live' },
  { label: 'Approved', value: 'approved' },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Deleted', value: 'deleted' },
]

const adminJobStatuses: JobStatus[] = ['pending_review', 'approved', 'active', 'live', 'draft', 'closed', 'archived', 'suspended', 'deleted']
const adminFreelanceJobStatuses: FreelanceJobStatus[] = ['pending_review', 'approved', 'active', 'live', 'closed', 'archived', 'suspended', 'deleted']

const typeOptions: Array<{ label: string; value: JobType | '' }> = [
  { label: 'All types', value: '' },
  { label: 'Full-time', value: 'full-time' },
  { label: 'Part-time', value: 'part-time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Remote', value: 'remote' },
]

const freelanceTypeOptions: Array<{ label: string; value: FreelanceJobType | '' }> = [
  { label: 'All types', value: '' },
  { label: 'Contract', value: 'contract' },
  { label: 'Part-time', value: 'part-time' },
  { label: 'Project-based', value: 'project-based' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
]

const workModeOptions: Array<{ label: string; value: WorkMode | '' }> = [
  { label: 'All work modes', value: '' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Onsite', value: 'onsite' },
]

const sortOptions = [
  { label: 'Newest first', value: '' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Title', value: 'title' },
  { label: 'Company', value: 'company' },
]

const jobs = ref<Job[]>([])
const freelanceJobs = ref<FreelanceJob[]>([])
const activeFeedTab = ref<JobFeedTab>('regular')
const query = ref('')
const status = ref<JobStatus | ''>(props.defaultStatus)
const sort = ref('')
const location = ref('')
const type = ref<JobType | FreelanceJobType | ''>('')
const skill = ref('')
const experience = ref('')
const workMode = ref<WorkMode | ''>('')
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
const viewingJob = ref<Job | null>(null)
const viewingFreelanceJob = ref<FreelanceJob | null>(null)
const updatingStatusId = ref<string | null>(null)
const reportingJobId = ref<string | null>(null)
const actionMenuId = ref<string | null>(null)

const feedTabs: Array<{ label: string; value: JobFeedTab }> = [
  { label: 'Regular Jobs', value: 'regular' },
  { label: 'Freelance Jobs', value: 'freelance' },
]

const title = ref('')
const companyName = ref('')
const description = ref('')
const skills = ref('')
const jobLocation = ref('')
const jobType = ref<JobType>('full-time')
const jobWorkMode = ref<WorkMode>('remote')
const senderEmail = ref('')
const qualifications = ref('')
const tasks = ref('')
const workExperience = ref('')
const minSalary = ref('')
const maxSalary = ref('')
const salaryCurrency = ref('NGN')
const applicationEndDate = ref('')

const jobStats = computed(() => [
  {
    label: 'Total jobs',
    value: total.value,
    detail: 'Across all pages',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Public jobs',
    value: jobs.value.filter((job) => ['live', 'approved', 'active'].includes(job.status)).length,
    detail: 'On this page',
    icon: CalendarDays,
  },
  {
    label: 'Pending review',
    value: jobs.value.filter((job) => job.status === 'pending_review').length,
    detail: 'On this page',
    icon: Eye,
  },
  {
    label: 'Applicants',
    value: jobs.value.reduce((sum, job) => sum + (job.applicantCount || 0), 0),
    detail: 'On this page',
    icon: Users,
  },
])

const visibleRows = computed(() => activeFeedTab.value === 'regular' ? jobs.value : freelanceJobs.value)
const currentTableTitle = computed(() => activeFeedTab.value === 'regular' ? 'Regular Jobs Table' : 'Freelance Jobs Table')
const isFreelanceFeed = computed(() => activeFeedTab.value === 'freelance')
const currentTypeOptions = computed(() => isFreelanceFeed.value ? freelanceTypeOptions : typeOptions)

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

  return value.replace(/-/g, ' ').replace(/_/g, ' ')
}

function statusTone(value: string) {
  if (value === 'live' || value === 'approved' || value === 'active') return 'success'
  if (value === 'pending_review') return 'warning'
  if (value === 'closed' || value === 'archived' || value === 'deleted' || value === 'suspended') return 'danger'
  return 'muted'
}

function formatSalary(job: Job) {
  if (job.salaryLabel) {
    return job.salaryLabel
  }

  if (job.salaryMin === null && job.salaryMax === null) {
    return 'Not listed'
  }

  const currency = job.salaryCurrency || ''
  const minimum = job.salaryMin !== null ? `${currency} ${job.salaryMin.toLocaleString()}` : null
  const maximum = job.salaryMax !== null ? `${currency} ${job.salaryMax.toLocaleString()}` : null

  return [minimum, maximum].filter(Boolean).join(' - ')
}

function formatFee(job: FreelanceJob) {
  if (job.feeLabel) {
    return job.feeLabel
  }

  if (job.minFee === null && job.maxFee === null) {
    return 'Not listed'
  }

  const currency = job.currency || ''
  const minimum = job.minFee !== null ? `${currency} ${job.minFee.toLocaleString()}` : null
  const maximum = job.maxFee !== null ? `${currency} ${job.maxFee.toLocaleString()}` : null

  return [minimum, maximum].filter(Boolean).join(' - ')
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)

  if (Number.isNaN(parsed)) {
    throw new Error('Salary values must be valid numbers')
  }

  return parsed
}

async function fetchJobs() {
  loading.value = true
  error.value = null

  try {
    const params = {
      page: page.value,
      per_page: perPage.value,
      q: query.value,
      status: status.value,
      sort: sort.value,
      location: location.value,
      type: type.value,
      skill: skill.value,
    }

    const response = activeFeedTab.value === 'regular'
      ? status.value
        ? await fetchRegularJobStatus(params, status.value)
        : await fetchAllRegularJobStatuses(params)
      : status.value
        ? await fetchFreelanceJobStatus(params, status.value as FreelanceJobStatus)
        : await fetchAllFreelanceJobStatuses(params)

    if (activeFeedTab.value === 'regular') {
      jobs.value = response.data as Job[] || []
      freelanceJobs.value = []
    } else {
      freelanceJobs.value = response.data as FreelanceJob[] || []
      jobs.value = []
    }
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load jobs'
    jobs.value = []
    freelanceJobs.value = []
  } finally {
    loading.value = false
  }
}

function paginateMergedJobs<T extends { id: string, createdAt: string }>(items: T[], currentPage: number, currentPerPage: number) {
  const uniqueItems = Array.from(new Map(items.map((item) => [item.id, item])).values())
  const sortedItems = uniqueItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const start = (currentPage - 1) * currentPerPage
  const data = sortedItems.slice(start, start + currentPerPage)

  return {
    data,
    current_page: currentPage,
    from: sortedItems.length ? start + 1 : null,
    last_page: Math.max(Math.ceil(sortedItems.length / currentPerPage), 1),
    per_page: currentPerPage,
    to: sortedItems.length ? start + data.length : null,
    total: sortedItems.length,
  }
}

async function fetchRegularJobStatus(params: {
  page: number
  per_page: number
  q: string
  status: string
  sort: string
  location: string
  type: string
  skill: string
}, jobStatus: JobStatus) {
  const requestParams = {
    ...params,
    page: params.page,
    per_page: params.per_page,
    status: jobStatus,
    experience: experience.value,
    workMode: workMode.value,
  }
  const [publicResponse, postedResponse] = await Promise.all([
    listJobs(requestParams),
    listMyPostedJobs(requestParams),
  ])
  const merged = paginateMergedJobs([...(publicResponse.data || []), ...(postedResponse.data || [])], params.page, params.per_page)

  return {
    ...publicResponse,
    ...merged,
  }
}

async function fetchRegularJobsWithoutStatus(params: {
  page: number
  per_page: number
  q: string
  status: string
  sort: string
  location: string
  type: string
  skill: string
}) {
  const requestParams = {
    ...params,
    page: params.page,
    per_page: params.per_page,
    status: '',
    experience: experience.value,
    workMode: workMode.value,
  }
  const [publicResponse, postedResponse] = await Promise.all([
    listJobs(requestParams),
    listMyPostedJobs(requestParams),
  ])
  const merged = paginateMergedJobs([...(publicResponse.data || []), ...(postedResponse.data || [])], params.page, params.per_page)

  return {
    ...publicResponse,
    ...merged,
  }
}

async function fetchFreelanceJobStatus(params: {
  page: number
  per_page: number
  q: string
  status: string
  sort: string
  location: string
  type: string
  skill: string
}, jobStatus: FreelanceJobStatus) {
  const requestParams = {
    ...params,
    page: params.page,
    per_page: params.per_page,
    status: jobStatus,
    type: type.value as FreelanceJobType | '',
  }
  const [publicResponse, postedResponse] = await Promise.all([
    listFreelanceJobs(requestParams),
    listMyFreelanceJobs(requestParams),
  ])
  const merged = paginateMergedJobs([...(publicResponse.data || []), ...(postedResponse.data || [])], params.page, params.per_page)

  return {
    ...publicResponse,
    ...merged,
  }
}

async function fetchAllRegularJobStatuses(params: {
  page: number
  per_page: number
  q: string
  status: string
  sort: string
  location: string
  type: string
  skill: string
}) {
  const responses = await Promise.all([
    fetchRegularJobsWithoutStatus(params),
    ...adminJobStatuses.map((jobStatus) => fetchRegularJobStatus(params, jobStatus)),
  ])
  const data = responses.flatMap((response) => response.data || [])
  const merged = paginateMergedJobs(data, params.page, params.per_page)

  return {
    ...responses[0],
    ...merged,
  }
}

async function fetchAllFreelanceJobStatuses(params: {
  page: number
  per_page: number
  q: string
  status: string
  sort: string
  location: string
  type: string
  skill: string
}) {
  const responses = await Promise.all(adminFreelanceJobStatuses.map((jobStatus) => fetchFreelanceJobStatus(params, jobStatus)))
  const data = responses.flatMap((response) => response.data || [])
  const merged = paginateMergedJobs(data, params.page, params.per_page)

  return {
    ...responses[0],
    ...merged,
  }
}

function switchFeedTab(tab: JobFeedTab) {
  activeFeedTab.value = tab
  page.value = 1
  type.value = ''
  workMode.value = ''
  experience.value = ''
  viewingJob.value = null
  viewingFreelanceJob.value = null
  fetchJobs()
}

function applyFilters() {
  page.value = 1
  fetchJobs()
}

function resetFilters() {
  query.value = ''
  status.value = props.defaultStatus
  sort.value = ''
  location.value = ''
  type.value = ''
  skill.value = ''
  experience.value = ''
  workMode.value = ''
  applyFilters()
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchJobs()
}

async function changeJobStatus(job: Job, nextStatus: JobStatus) {
  updatingStatusId.value = job.id
  actionMenuId.value = null

  try {
    const response = await updateJobStatus(job.id, nextStatus)
    jobs.value = jobs.value.map((item) => item.id === response.data.id ? response.data : item)
    if (viewingJob.value?.id === job.id) viewingJob.value = response.data
    toast.success(`Job moved to ${formatLabel(nextStatus)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to update job status')
  } finally {
    updatingStatusId.value = null
  }
}

async function changeFreelanceJobStatus(job: FreelanceJob, nextStatus: FreelanceJobStatus) {
  updatingStatusId.value = job.id
  actionMenuId.value = null

  try {
    const response = await updateFreelanceJobStatus(job.id, nextStatus)
    freelanceJobs.value = freelanceJobs.value.map((item) => item.id === response.data.id ? response.data : item)
    if (viewingFreelanceJob.value?.id === job.id) viewingFreelanceJob.value = response.data
    toast.success(`Freelance job moved to ${formatLabel(nextStatus)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to update freelance job status')
  } finally {
    updatingStatusId.value = null
  }
}

function toggleActionMenu(id: string) {
  actionMenuId.value = actionMenuId.value === id ? null : id
}

function getActionMenuKey(kind: JobFeedTab, id: string) {
  return `${kind}:${id}`
}

function regularJobActions(job: Job): Array<{ label: string, status: JobStatus, tone?: 'danger' }> {
  const actions: Array<{ label: string, status: JobStatus, tone?: 'danger' }> = [
    { label: 'APPROVE', status: 'approved' },
    { label: 'SUSPEND', status: 'suspended' },
    { label: 'UNSUSPEND', status: 'active' },
    { label: 'DELETE', status: 'deleted', tone: 'danger' },
  ]

  return actions.filter((action) => action.status !== job.status)
}

function freelanceJobActions(job: FreelanceJob): Array<{ label: string, status: FreelanceJobStatus, tone?: 'danger' }> {
  const actions: Array<{ label: string, status: FreelanceJobStatus, tone?: 'danger' }> = [
    { label: 'APPROVE', status: 'approved' },
    { label: 'SUSPEND', status: 'suspended' },
    { label: 'UNSUSPEND', status: 'active' },
    { label: 'DELETE', status: 'deleted', tone: 'danger' },
  ]

  return actions.filter((action) => action.status !== job.status)
}

async function reportJob(job: Job | FreelanceJob, kind: 'job' | 'freelance_job' = 'job') {
  reportingJobId.value = job.id

  try {
    await apiRequest(`/api/jobs/${job.id}/report`, {
      method: 'POST',
      body: JSON.stringify({
        itemId: job.id,
        type: kind,
        reason: 'Admin report',
        details: 'Flagged by an admin from the jobs management view.',
      }),
    })
    toast.success('Job reported')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to report job')
  } finally {
    reportingJobId.value = null
  }
}

function resetCreateForm() {
  title.value = ''
  companyName.value = ''
  description.value = ''
  skills.value = ''
  jobLocation.value = ''
  jobType.value = 'full-time'
  jobWorkMode.value = 'remote'
  senderEmail.value = ''
  qualifications.value = ''
  tasks.value = ''
  workExperience.value = ''
  minSalary.value = ''
  maxSalary.value = ''
  salaryCurrency.value = 'NGN'
  applicationEndDate.value = ''
  formError.value = null
}

async function createNewJob() {
  formError.value = null

  if (!title.value.trim() || !companyName.value.trim() || !description.value.trim()) {
    formError.value = 'Title, company name, and description are required'
    return
  }

  creating.value = true

  try {
    await createJob({
      title: title.value.trim(),
      companyName: companyName.value.trim(),
      description: description.value.trim(),
      skills: skills.value.trim() || undefined,
      location: jobLocation.value.trim() || undefined,
      type: jobType.value,
      workMode: jobWorkMode.value,
      senderEmail: senderEmail.value.trim() || undefined,
      qualifications: qualifications.value.trim() || undefined,
      tasks: tasks.value.trim() || undefined,
      workExperience: workExperience.value.trim() || undefined,
      minSalary: parseOptionalNumber(minSalary.value),
      maxSalary: parseOptionalNumber(maxSalary.value) ?? null,
      salaryCurrency: salaryCurrency.value.trim() || undefined,
      applicationEndDate: applicationEndDate.value || undefined,
    })

    toast.success('Job created')
    resetCreateForm()
    showCreateForm.value = false
    page.value = 1
    await fetchJobs()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create job'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchJobs()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Jobs</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ pageTitle }}</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            {{ pageDescription }}
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:items-end">
          <div class="inline-flex rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-1">
            <button
              v-for="tab in feedTabs"
              :key="tab.value"
              type="button"
              class="h-9 rounded-[0.7rem] px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent-strong)]"
              :class="activeFeedTab === tab.value ? 'bg-[var(--accent)] text-white hover:text-white' : ''"
              @click="switchFeedTab(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="fetchJobs"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
          <button
            v-if="activeFeedTab === 'regular'"
            v-show="false"
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            @click="showCreateForm = !showCreateForm"
          >
            <X v-if="showCreateForm" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ showCreateForm ? 'Close form' : 'New job' }}
          </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="false && activeFeedTab === 'regular' && showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-4xl" @submit.prevent="createNewJob">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <BriefcaseBusiness class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create job posting</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Required fields match the jobs API: title, company name, and description.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Title</label>
            <input v-model="title" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Senior Software Engineer" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Company name</label>
            <input v-model="companyName" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Skills4Export" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Location</label>
            <input v-model="jobLocation" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Remote" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Application email</label>
            <input v-model="senderEmail" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="owner@example.com" type="email" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Type</label>
            <select v-model="jobType" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]">
              <option v-for="option in typeOptions.filter((item) => item.value)" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Work mode</label>
            <select v-model="jobWorkMode" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]">
              <option v-for="option in workModeOptions.filter((item) => item.value)" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Skills</label>
            <input v-model="skills" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="JavaScript, Vue" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Experience</label>
            <input v-model="workExperience" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="2-3" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Minimum salary</label>
            <input v-model="minSalary" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="250000" inputmode="numeric" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Maximum salary</label>
            <input v-model="maxSalary" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Optional" inputmode="numeric" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Salary currency</label>
            <input v-model="salaryCurrency" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="NGN" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Application end date</label>
            <input v-model="applicationEndDate" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" type="date" />
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</label>
            <textarea v-model="description" class="min-h-32 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Describe the role"></textarea>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Qualifications</label>
            <textarea v-model="qualifications" class="min-h-28 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Qualifications and requirements"></textarea>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Tasks</label>
            <textarea v-model="tasks" class="min-h-28 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Responsibilities and tasks"></textarea>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ formError }}</p>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="showCreateForm = false">Cancel</button>
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            {{ creating ? 'Creating...' : 'Create job' }}
          </button>
        </div>
      </form>
    </section>

    <section class="min-w-0 overflow-hidden">
      <div class="app-scroll flex snap-x gap-4 overflow-x-auto pb-1">
        <article v-for="stat in jobStats" :key="stat.label" class="min-h-36 min-w-[14rem] snap-start rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
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

    <section class="min-w-0 rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="border-b border-[color:var(--border-soft)] p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">{{ currentTableTitle }}</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} jobs</p>
          </div>

          <div class="grid min-w-0 gap-2 sm:grid-cols-2">
            <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
              <Search class="h-4 w-4" />
              <input v-model="query" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="End date, return email, location, post name" type="search" @keyup.enter="applyFilters" />
            </label>
            <select v-model="status" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" @change="applyFilters">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select v-model="type" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" @change="applyFilters">
              <option v-for="option in currentTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select v-if="!isFreelanceFeed" v-model="workMode" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" @change="applyFilters">
              <option v-for="option in workModeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select v-model="sort" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" @change="applyFilters">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>

        <div class="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <input v-model="location" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="Filter by location" @keyup.enter="applyFilters" />
          <input v-model="skill" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="Filter by skill" @keyup.enter="applyFilters" />
          <div class="flex gap-2">
            <input v-if="!isFreelanceFeed" v-model="experience" class="h-10 min-w-0 flex-1 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="Experience" @keyup.enter="applyFilters" />
            <button type="button" class="h-10 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="applyFilters">Apply</button>
            <button type="button" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="resetFilters">Reset</button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading jobs
      </div>

      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
      </div>

      <div v-else-if="visibleRows.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No jobs found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create a job or adjust the active filters.</p>
        </div>
      </div>

      <div v-else-if="activeFeedTab === 'regular'" class="app-scroll hidden max-w-full overflow-x-auto overflow-y-visible md:block">
        <table class="w-full min-w-[62rem] table-fixed text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="w-[4rem] px-4 py-3 font-semibold">#</th>
              <th class="w-[22%] px-4 py-3 font-semibold">Post name</th>
              <th class="w-[18%] px-4 py-3 font-semibold">Company</th>
              <th class="w-[12%] px-4 py-3 font-semibold">Location</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Return email</th>
              <th class="w-[12%] px-4 py-3 font-semibold">End Date</th>
              <th class="w-[12%] px-4 py-3 font-semibold">Status</th>
              <th class="w-[10rem] px-4 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="(job, index) in jobs" :key="job.id">
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ (page - 1) * perPage + index + 1 }}</td>
              <td class="px-4 py-3">
                <button type="button" class="max-w-full truncate font-semibold text-[var(--accent-strong)] hover:underline" @click="viewingJob = job">{{ job.title }}</button>
                <p class="mt-1 truncate text-xs text-[var(--text-tertiary)]">{{ job.slug }}</p>
                <div v-if="job.skills.length" class="mt-2 flex flex-wrap gap-1.5 overflow-hidden">
                  <span v-for="jobSkill in job.skills.slice(0, 2)" :key="jobSkill" class="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[0.7rem] font-semibold text-[var(--text-tertiary)]">{{ jobSkill }}</span>
                </div>
              </td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ job.companyName }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ job.location || 'Not listed' }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ job.applicationEmail || 'Not listed' }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ formatDate(job.applicationEndDate) }}</td>
              <td class="px-4 py-3">
                <StatusChip :tone="statusTone(job.status)">{{ formatLabel(job.status) }}</StatusChip>
              </td>
              <td class="px-4 py-3">
                <div class="relative flex justify-end gap-2">
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`View ${job.title}`" @click="viewingJob = job">
                    <Eye class="h-4 w-4" />
                  </button>
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="updatingStatusId === job.id" :aria-label="`Open actions for ${job.title}`" @click="toggleActionMenu(getActionMenuKey('regular', job.id))">
                    <Loader2 v-if="updatingStatusId === job.id" class="h-4 w-4 animate-spin" />
                    <MoreVertical v-else class="h-4 w-4" />
                  </button>
                  <div v-if="actionMenuId === getActionMenuKey('regular', job.id)" class="absolute right-12 top-0 z-50 w-40 overflow-hidden rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-1">
                    <button v-for="action in regularJobActions(job)" :key="action.status" type="button" class="flex w-full rounded-[0.65rem] px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :class="action.tone === 'danger' ? 'text-red-600 hover:text-red-700 dark:text-red-300' : ''" @click="changeJobStatus(job, action.status)">
                      {{ action.label }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="app-scroll hidden max-w-full overflow-x-auto overflow-y-visible md:block">
        <table class="w-full min-w-[62rem] table-fixed text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="w-[4rem] px-4 py-3 font-semibold">#</th>
              <th class="w-[22%] px-4 py-3 font-semibold">Post name</th>
              <th class="w-[18%] px-4 py-3 font-semibold">Company</th>
              <th class="w-[12%] px-4 py-3 font-semibold">Location</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Return email</th>
              <th class="w-[12%] px-4 py-3 font-semibold">End Date</th>
              <th class="w-[12%] px-4 py-3 font-semibold">Status</th>
              <th class="w-[10rem] px-4 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="(job, index) in freelanceJobs" :key="job.id">
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ (page - 1) * perPage + index + 1 }}</td>
              <td class="px-4 py-3">
                <button type="button" class="max-w-full truncate font-semibold text-[var(--accent-strong)] hover:underline" @click="viewingFreelanceJob = job">{{ job.title }}</button>
                <p class="mt-1 truncate text-xs text-[var(--text-tertiary)]">{{ job.slug }}</p>
              </td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ job.companyName }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ job.location || 'Not listed' }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ job.postedByUserId }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ formatDate(job.applicationEndDate) }}</td>
              <td class="px-4 py-3"><StatusChip :tone="statusTone(job.status)">{{ formatLabel(job.status) }}</StatusChip></td>
              <td class="px-4 py-3">
                <div class="relative flex justify-end gap-2">
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`View ${job.title}`" @click="viewingFreelanceJob = job">
                    <Eye class="h-4 w-4" />
                  </button>
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="updatingStatusId === job.id" :aria-label="`Open actions for ${job.title}`" @click="toggleActionMenu(getActionMenuKey('freelance', job.id))">
                    <Loader2 v-if="updatingStatusId === job.id" class="h-4 w-4 animate-spin" />
                    <MoreVertical v-else class="h-4 w-4" />
                  </button>
                  <div v-if="actionMenuId === getActionMenuKey('freelance', job.id)" class="absolute right-12 top-0 z-50 w-40 overflow-hidden rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-1">
                    <button v-for="action in freelanceJobActions(job)" :key="action.status" type="button" class="flex w-full rounded-[0.65rem] px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :class="action.tone === 'danger' ? 'text-red-600 hover:text-red-700 dark:text-red-300' : ''" @click="changeFreelanceJobStatus(job, action.status)">
                      {{ action.label }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && activeFeedTab === 'regular' && visibleRows.length > 0" class="space-y-3 p-4 md:hidden">
        <article v-for="job in jobs" :key="job.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-[var(--text-primary)]">{{ job.title }}</p>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ job.companyName }}</p>
            </div>
            <StatusChip :tone="statusTone(job.status)">{{ formatLabel(job.status) }}</StatusChip>
          </div>
          <p class="mt-3 line-clamp-3 text-sm text-[var(--text-secondary)]">{{ job.summary || job.description || 'No description provided' }}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)]">
            <span class="inline-flex items-center gap-1"><MapPin class="h-3.5 w-3.5" />{{ job.location || 'Not listed' }}</span>
            <span>{{ formatLabel(job.type) }}</span>
            <span>{{ job.applicantCount }} applicants</span>
          </div>
          <div class="mt-3 flex justify-end">
            <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" :title="`View ${job.title}`" @click="viewingJob = job">
              <Eye class="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>

      <div v-if="!loading && !error && activeFeedTab === 'freelance' && visibleRows.length > 0" class="space-y-3 p-4 md:hidden">
        <article v-for="job in freelanceJobs" :key="job.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-[var(--text-primary)]">{{ job.title }}</p>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ job.companyName }}</p>
            </div>
            <StatusChip :tone="statusTone(job.status)">{{ formatLabel(job.status) }}</StatusChip>
          </div>
          <p class="mt-3 line-clamp-3 text-sm text-[var(--text-secondary)]">{{ job.description || 'No description provided' }}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)]">
            <span class="inline-flex items-center gap-1"><MapPin class="h-3.5 w-3.5" />{{ job.location || 'Not listed' }}</span>
            <span>{{ formatLabel(job.type) }}</span>
            <span>{{ job.applicantCount }} applicants</span>
          </div>
          <div class="mt-3 flex justify-end">
            <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" :title="`View ${job.title}`" @click="viewingFreelanceJob = job">
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

    <div v-if="viewingJob" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingJob = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Job details</p>
            <h2 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingJob.title }}</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ viewingJob.companyName }} / {{ viewingJob.location || 'Not listed' }}</p>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingJob = null">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <StatusChip :tone="statusTone(viewingJob.status)">{{ formatLabel(viewingJob.status) }}</StatusChip>
          <StatusChip tone="accent">{{ formatLabel(viewingJob.type) }}</StatusChip>
          <StatusChip tone="muted">{{ formatLabel(viewingJob.workMode) }}</StatusChip>
          <button type="button" class="h-9 rounded-[0.75rem] border border-amber-200 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10" :disabled="reportingJobId === viewingJob.id" @click="reportJob(viewingJob)">
            {{ reportingJobId === viewingJob.id ? 'Reporting...' : 'Report' }}
          </button>
          <button v-for="action in regularJobActions(viewingJob)" :key="action.status" type="button" class="h-9 rounded-[0.75rem] border border-[color:var(--border-soft)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)] disabled:opacity-60" :class="action.tone === 'danger' ? 'text-red-600 hover:text-red-700 dark:text-red-300' : ''" :disabled="updatingStatusId === viewingJob.id" @click="changeJobStatus(viewingJob, action.status)">
            {{ action.label }}
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Salary</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ formatSalary(viewingJob) }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Applications</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingJob.applicantCount }} applicants</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Experience</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingJob.experience || 'Not listed' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Deadline</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ formatDate(viewingJob.applicationEndDate) }}</p>
          </div>
        </div>

        <div class="mt-5 space-y-5">
          <div>
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Description</h3>
            <p class="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--text-secondary)]">{{ viewingJob.description || 'No description provided' }}</p>
          </div>
          <div v-if="viewingJob.skills.length">
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Skills</h3>
            <div class="mt-2 flex flex-wrap gap-2">
              <span v-for="jobSkill in viewingJob.skills" :key="jobSkill" class="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">{{ jobSkill }}</span>
            </div>
          </div>
          <div v-if="viewingJob.requirements.length">
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Requirements</h3>
            <ul class="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
              <li v-for="item in viewingJob.requirements" :key="item" class="rounded-[0.75rem] bg-[var(--surface-secondary)] px-3 py-2">{{ item }}</li>
            </ul>
          </div>
          <div v-if="viewingJob.responsibilities.length">
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Responsibilities</h3>
            <ul class="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
              <li v-for="item in viewingJob.responsibilities" :key="item" class="rounded-[0.75rem] bg-[var(--surface-secondary)] px-3 py-2">{{ item }}</li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <div v-if="viewingFreelanceJob" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingFreelanceJob = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Freelance job details</p>
            <h2 class="mt-2 truncate font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingFreelanceJob.title }}</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ viewingFreelanceJob.companyName }} / {{ viewingFreelanceJob.location || 'Not listed' }}</p>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingFreelanceJob = null">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <StatusChip :tone="statusTone(viewingFreelanceJob.status)">{{ formatLabel(viewingFreelanceJob.status) }}</StatusChip>
          <StatusChip tone="accent">{{ formatLabel(viewingFreelanceJob.type) }}</StatusChip>
          <StatusChip :tone="viewingFreelanceJob.verified ? 'success' : 'muted'">{{ viewingFreelanceJob.verified ? 'Verified' : 'Unverified' }}</StatusChip>
          <button type="button" class="h-9 rounded-[0.75rem] border border-amber-200 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10" :disabled="reportingJobId === viewingFreelanceJob.id" @click="reportJob(viewingFreelanceJob, 'freelance_job')">
            {{ reportingJobId === viewingFreelanceJob.id ? 'Reporting...' : 'Report' }}
          </button>
          <button v-for="action in freelanceJobActions(viewingFreelanceJob)" :key="action.status" type="button" class="h-9 rounded-[0.75rem] border border-[color:var(--border-soft)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)] disabled:opacity-60" :class="action.tone === 'danger' ? 'text-red-600 hover:text-red-700 dark:text-red-300' : ''" :disabled="updatingStatusId === viewingFreelanceJob.id" @click="changeFreelanceJobStatus(viewingFreelanceJob, action.status)">
            {{ action.label }}
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Fee</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ formatFee(viewingFreelanceJob) }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Applications</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingFreelanceJob.applicantCount }} applicants</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Posted by</p>
            <p class="mt-2 truncate font-semibold text-[var(--text-primary)]">{{ viewingFreelanceJob.postedByUserId }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Deadline</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ formatDate(viewingFreelanceJob.applicationEndDate) }}</p>
          </div>
        </div>

        <div class="mt-5 space-y-5">
          <div>
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Description</h3>
            <p class="mt-2 whitespace-pre-line break-words text-sm leading-6 text-[var(--text-secondary)]">{{ viewingFreelanceJob.description || 'No description provided' }}</p>
          </div>
          <div>
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Qualifications</h3>
            <p class="mt-2 whitespace-pre-line break-words text-sm leading-6 text-[var(--text-secondary)]">{{ viewingFreelanceJob.qualifications || 'No qualifications provided' }}</p>
          </div>
          <div v-if="viewingFreelanceJob.skills.length">
            <h3 class="font-display text-base font-semibold text-[var(--text-primary)]">Skills</h3>
            <div class="mt-2 flex flex-wrap gap-2">
              <span v-for="jobSkill in viewingFreelanceJob.skills" :key="jobSkill" class="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">{{ jobSkill }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
