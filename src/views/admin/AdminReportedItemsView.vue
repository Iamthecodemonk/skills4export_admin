<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import { apiRequest } from '../../composables/useApi'

type ReportedKind = 'posts' | 'jobs' | 'questions' | 'answers' | 'comments' | 'pages'
type ReportedItem = {
  id: string
  title?: string | null
  name?: string | null
  content?: string | null
  body?: string | null
  description?: string | null
  status?: string | null
  type?: string | null
  is_report?: boolean
  isReport?: boolean
  created_at?: string | null
  createdAt?: string | null
  user?: { name?: string | null; email?: string | null } | null
  asker?: { name?: string | null; email?: string | null } | null
  target?: ReportedItem | null
  data?: ReportedItem | null
  reports_count?: number
  reports?: unknown[]
  [key: string]: unknown
}

type ReportedResponse = {
  data?: ReportedItem[]
  total?: number
  from?: number | null
  to?: number | null
  last_page?: number
  per_page?: number
}

const props = withDefaults(defineProps<{
  kind: ReportedKind
  pageTitle?: string
}>(), {
  pageTitle: 'Reported items',
})

const items = ref<ReportedItem[]>([])
const query = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const updatingId = ref<string | null>(null)

const filteredItems = computed(() => {
  const term = query.value.trim().toLowerCase()
  const reported = items.value.filter((item) => item.is_report !== false && item.isReport !== false)

  if (!term) return reported

  return reported.filter((item) => {
    return `${itemTitle(item)} ${itemBody(item)} ${itemAuthor(item)} ${item.status || ''}`.toLowerCase().includes(term)
  })
})

function itemTitle(item: ReportedItem) {
  const target = reportTarget(item)
  return target.title || target.name || `${formatKind(props.kind)} report`
}

function itemBody(item: ReportedItem) {
  const target = reportTarget(item)
  return target.content || target.body || target.description || 'No details available.'
}

function itemAuthor(item: ReportedItem) {
  const target = reportTarget(item)
  return target.user?.name || target.user?.email || target.asker?.name || target.asker?.email || 'Unknown author'
}

function reportTarget(item: ReportedItem): ReportedItem {
  if (item.target && typeof item.target === 'object') return item.target
  if (item.data && typeof item.data === 'object' && !Array.isArray(item.data)) return item.data
  return item
}

function formatKind(value: string) {
  return value.replace(/[-_]/g, ' ')
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function createdAt(item: ReportedItem) {
  const target = reportTarget(item)
  return target.created_at || target.createdAt || item.created_at || item.createdAt || null
}

function statusTone(value?: string | null) {
  if (value === 'approved' || value === 'active') return 'success'
  if (value === 'suspended' || value === 'deleted') return 'danger'
  if (value === 'reported' || value === 'pending_review') return 'warning'
  return 'muted'
}

function candidateListPaths() {
  return [
    `/api/admin/reports/${props.kind}`,
  ]
}

function reportType() {
  return props.kind
}

function reportActionPath(id: string, action: 'approve' | 'suspend' | 'unsuspend' | 'delete') {
  return `/api/admin/reports/${reportType()}/${id}/${action}`
}

function targetStatus(item: ReportedItem) {
  const target = reportTarget(item)
  return target.status || item.status || 'reported'
}

function isSuspended(item: ReportedItem) {
  return targetStatus(item) === 'suspended'
}

function nextLocalStatus(action: 'approve' | 'suspend' | 'unsuspend' | 'delete') {
  if (action === 'approve') return 'approved'
  if (action === 'suspend') return 'suspended'
  if (action === 'unsuspend') return 'active'
  return 'deleted'
}

async function fetchReportedItems() {
  loading.value = true
  error.value = null

  try {
    let response: ReportedResponse | null = null
    let lastError: unknown = null

    for (const path of candidateListPaths()) {
      try {
        response = await apiRequest<ReportedResponse>(path)
        break
      } catch (err) {
        lastError = err
      }
    }

    if (!response) throw lastError instanceof Error ? lastError : new Error('Unable to load reported items')

    items.value = response.data || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load reported items'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function moderateItem(item: ReportedItem, action: 'approve' | 'suspend' | 'unsuspend' | 'delete') {
  const target = reportTarget(item)
  updatingId.value = target.id || item.id

  try {
    const status = nextLocalStatus(action)
    await apiRequest(reportActionPath(target.id || item.id, action), {
      method: 'POST',
    })

    if (status === 'deleted') {
      items.value = items.value.filter((entry) => (reportTarget(entry).id || entry.id) !== (target.id || item.id))
    } else {
      items.value = items.value.map((entry) => {
        const entryTarget = reportTarget(entry)
        if ((entryTarget.id || entry.id) !== (target.id || item.id)) return entry
        if (entry.target) return { ...entry, target: { ...entryTarget, status } }
        if (entry.data) return { ...entry, data: { ...entryTarget, status } }
        return { ...entry, status }
      })
    }

    toast.success(`${formatKind(props.kind)} moved to ${formatKind(status)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to moderate report')
  } finally {
    updatingId.value = null
  }
}

watch(() => props.kind, fetchReportedItems)

onMounted(() => {
  fetchReportedItems()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Reports</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ pageTitle }}</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Only reported {{ formatKind(kind) }} are shown here.</p>
        </div>

        <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading" @click="fetchReportedItems">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Reported {{ formatKind(kind) }}</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ filteredItems.length }} loaded</p>
        </div>
        <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-80">
          <Search class="h-4 w-4" />
          <input v-model="query" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search reports" type="search" />
        </label>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading reports
      </div>
      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
      </div>
      <div v-else-if="filteredItems.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <AlertTriangle class="mx-auto h-8 w-8 text-[var(--text-tertiary)]" />
          <p class="mt-3 font-semibold text-[var(--text-primary)]">No reported {{ formatKind(kind) }} found</p>
        </div>
      </div>

      <div v-else class="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="item in filteredItems" :key="item.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="line-clamp-2 font-display text-sm font-semibold text-[var(--text-primary)]">{{ itemTitle(item) }}</h3>
              <p class="mt-1 truncate text-xs text-[var(--text-secondary)]">{{ itemAuthor(item) }}</p>
            </div>
            <StatusChip :tone="statusTone(targetStatus(item))">{{ formatKind(targetStatus(item)) }}</StatusChip>
          </div>
          <p class="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{{ itemBody(item) }}</p>
          <p class="mt-3 text-xs text-[var(--text-tertiary)]">{{ formatDate(createdAt(item)) }} / {{ item.reports_count || item.reports?.length || 1 }} reports</p>

          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-60" :disabled="updatingId === (reportTarget(item).id || item.id)" @click="moderateItem(item, 'approve')">
              <CheckCircle2 class="h-3.5 w-3.5" />
              Approve
            </button>
            <button v-if="!isSuspended(item)" type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] border border-amber-200 px-3 text-xs font-semibold text-amber-700 disabled:opacity-60" :disabled="updatingId === (reportTarget(item).id || item.id)" @click="moderateItem(item, 'suspend')">
              <ShieldCheck class="h-3.5 w-3.5" />
              Suspend
            </button>
            <button v-else type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-60" :disabled="updatingId === (reportTarget(item).id || item.id)" @click="moderateItem(item, 'unsuspend')">
              <ShieldCheck class="h-3.5 w-3.5" />
              Unsuspend
            </button>
            <button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-60" :disabled="updatingId === (reportTarget(item).id || item.id)" @click="moderateItem(item, 'delete')">
              <Trash2 class="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
