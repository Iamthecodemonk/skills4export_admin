<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CheckCircle2, Eye, FileText, ImageUp, Loader2, Plus, RefreshCw, Search, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { apiRequest } from '../../composables/useApi'
import StatusChip from '../../components/StatusChip.vue'

type PageCategory = {
  id: string
  name: string
  slug: string
}

type Page = {
  id: string
  ownerId: string
  categoryId: string | null
  name: string
  slug: string
  description?: string | null
  avatar?: string | null
  coverImage?: string | null
  isVerified: number
  isActive: number
  isApproved: number
  approvalNotes?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  metadata?: Record<string, unknown> | null
  followers_count?: number | null
  posts_count?: number | null
  category_pages_count?: number | null
  createdAt: string
  updatedAt: string
}

type ListPagesResponse = {
  current_page: number
  data: Page[]
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

type CreatePageResponse = {
  success: boolean
  data: Page
}

type PageResponse = {
  success: boolean
  data: Page
}

type UploadPageImageResponse = {
  success: boolean
  data: {
    jobId: string
  }
}

type ListPageCategoriesResponse = {
  success?: boolean
  data?: PageCategory[]
}

const pages = ref<Page[]>([])
const categories = ref<PageCategory[]>([])
const search = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const lastPage = ref(1)
const from = ref<number | null>(null)
const to = ref<number | null>(null)
const loading = ref(false)
const creating = ref(false)
const categoriesLoading = ref(false)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const showCreateForm = ref(false)
const viewingPage = ref<Page | null>(null)
const uploadingAvatarId = ref<string | null>(null)
const uploadingCoverId = ref<string | null>(null)
const approvingPageId = ref<string | null>(null)

const name = ref('')
const slug = ref('')
const description = ref('')
const categoryId = ref('')
const metadataJson = ref('')

const categoryById = computed(() => {
  return new Map(categories.value.map((category) => [String(category.id), category]))
})

const filteredPages = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) {
    return pages.value
  }

  return pages.value.filter((pageItem) => {
    return `${pageItem.name} ${pageItem.slug} ${pageItem.description || ''}`.toLowerCase().includes(term)
  })
})

function getCategoryName(id: string | null) {
  if (!id) {
    return 'No category'
  }

  return categoryById.value.get(String(id))?.name || 'Unknown category'
}

function parseMetadata() {
  const trimmed = metadataJson.value.trim()

  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    throw new Error('Metadata must be valid JSON')
  }
}

function stringifyJson(value: Record<string, unknown> | null | undefined) {
  return value ? JSON.stringify(value, null, 2) : 'None'
}

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

function buildPagesPath() {
  const params = new URLSearchParams({
    page: String(page.value),
    per_page: String(perPage.value),
  })

  return `/api/pages?${params.toString()}`
}

async function fetchCategories() {
  categoriesLoading.value = true

  try {
    const response = await apiRequest<ListPageCategoriesResponse | PageCategory[]>('/api/page-categories')
    categories.value = Array.isArray(response) ? response : response.data || []
  } catch {
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

async function fetchPages() {
  loading.value = true
  error.value = null

  try {
    const response = await apiRequest<ListPagesResponse>(buildPagesPath())
    pages.value = response.data || []
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load pages'
  } finally {
    loading.value = false
  }
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchPages()
}

function resetCreateForm() {
  name.value = ''
  slug.value = ''
  description.value = ''
  categoryId.value = ''
  metadataJson.value = ''
  formError.value = null
}

async function createPage() {
  formError.value = null

  if (!name.value.trim() || !slug.value.trim()) {
    formError.value = 'Name and slug are required'
    return
  }

  creating.value = true

  try {
    await apiRequest<CreatePageResponse>('/api/pages', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: categoryId.value || null,
        name: name.value.trim(),
        slug: slug.value.trim(),
        description: description.value.trim() || undefined,
        metadata: parseMetadata(),
      }),
    })

    toast.success('Page created')
    resetCreateForm()
    showCreateForm.value = false
    page.value = 1
    await fetchPages()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create page'
  } finally {
    creating.value = false
  }
}

async function uploadPageImage(pageItem: Page, type: 'avatar' | 'cover', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  const isAvatar = type === 'avatar'

  if (isAvatar) {
    uploadingAvatarId.value = pageItem.id
  } else {
    uploadingCoverId.value = pageItem.id
  }

  try {
    const response = await apiRequest<UploadPageImageResponse>(`/api/pages/${pageItem.id}/${isAvatar ? 'avatar-file' : 'cover-file'}`, {
      method: 'POST',
      body: formData,
    })

    toast.success(`${isAvatar ? 'Avatar' : 'Cover'} upload queued`, {
      description: `Job ID: ${response.data.jobId}`,
    })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : `Unable to upload ${isAvatar ? 'avatar' : 'cover'}`)
  } finally {
    if (isAvatar) {
      uploadingAvatarId.value = null
    } else {
      uploadingCoverId.value = null
    }

    input.value = ''
  }
}

async function approvePage(pageItem: Page) {
  approvingPageId.value = pageItem.id

  try {
    const response = await apiRequest<PageResponse>(`/api/pages/${pageItem.id}/approve`, {
      method: 'POST',
    })

    pages.value = pages.value.map((item) => item.id === response.data.id ? response.data : item)

    if (viewingPage.value?.id === response.data.id) {
      viewingPage.value = response.data
    }

    toast.success('Page approved')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to approve page')
  } finally {
    approvingPageId.value = null
  }
}

onMounted(() => {
  fetchCategories()
  fetchPages()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Pages</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Manage Pages</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Create and review public pages, approval status, ownership, and engagement totals.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="fetchPages"
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
            {{ showCreateForm ? 'Close form' : 'New page' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-3xl" @submit.prevent="createPage">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <FileText class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create page</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Assign a category and optional metadata for richer page behavior.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
            <input v-model="name" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="My Page" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Slug</label>
            <input v-model="slug" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="my-page" />
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Category</label>
            <select v-model="categoryId" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" :disabled="categoriesLoading">
              <option value="">No category</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</label>
            <textarea v-model="description" class="min-h-24 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="A public page"></textarea>
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Metadata JSON</label>
            <textarea v-model="metadataJson" class="min-h-28 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 font-mono text-xs outline-none focus:border-[var(--accent)]" placeholder='{"theme": "business"}'></textarea>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ formError }}</p>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)]" @click="showCreateForm = false">Cancel</button>
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            {{ creating ? 'Creating...' : 'Create page' }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Pages</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} pages</p>
        </div>
        <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-80">
          <Search class="h-4 w-4" />
          <input v-model="search" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search loaded pages" type="search" />
        </label>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading pages
      </div>
      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{{ error }}</div>
      </div>
      <div v-else-if="filteredPages.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No pages found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create a page or adjust your search.</p>
        </div>
      </div>

      <div v-else class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="px-4 py-3 font-semibold">Page</th>
              <th class="px-4 py-3 font-semibold">Images</th>
              <th class="px-4 py-3 font-semibold">Category</th>
              <th class="px-4 py-3 font-semibold">Followers</th>
              <th class="px-4 py-3 font-semibold">Posts</th>
              <th class="px-4 py-3 font-semibold">Approval</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="pageItem in filteredPages" :key="pageItem.id">
              <td class="px-4 py-3">
                <p class="font-semibold text-[var(--text-primary)]">{{ pageItem.name }}</p>
                <p class="mt-1 font-mono text-xs text-[var(--text-secondary)]">{{ pageItem.slug }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
                    <img v-if="pageItem.avatar" :src="pageItem.avatar" alt="" class="h-full w-full object-cover" />
                    <FileText v-else class="h-4 w-4 text-[var(--text-tertiary)]" />
                  </div>
                  <div class="min-w-[8rem]">
                    <div class="h-5 overflow-hidden rounded-[0.45rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
                      <img v-if="pageItem.coverImage" :src="pageItem.coverImage" alt="" class="h-full w-full object-cover" />
                    </div>
                    <div class="mt-2 flex gap-1.5">
                      <label class="grid h-8 w-8 cursor-pointer place-items-center rounded-[0.65rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`Upload avatar for ${pageItem.name}`">
                        <Loader2 v-if="uploadingAvatarId === pageItem.id" class="h-4 w-4 animate-spin" />
                        <ImageUp v-else class="h-4 w-4" />
                        <input class="hidden" type="file" accept="image/*" :disabled="uploadingAvatarId === pageItem.id" @change="uploadPageImage(pageItem, 'avatar', $event)" />
                      </label>
                      <label class="grid h-8 w-8 cursor-pointer place-items-center rounded-[0.65rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`Upload cover for ${pageItem.name}`">
                        <Loader2 v-if="uploadingCoverId === pageItem.id" class="h-4 w-4 animate-spin" />
                        <ImageUp v-else class="h-4 w-4" />
                        <input class="hidden" type="file" accept="image/*" :disabled="uploadingCoverId === pageItem.id" @change="uploadPageImage(pageItem, 'cover', $event)" />
                      </label>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ getCategoryName(pageItem.categoryId) }}</td>
              <td class="px-4 py-3 font-semibold text-[var(--text-primary)]">{{ pageItem.followers_count ?? 0 }}</td>
              <td class="px-4 py-3 font-semibold text-[var(--text-primary)]">{{ pageItem.posts_count ?? 0 }}</td>
              <td class="px-4 py-3">
                <StatusChip :tone="pageItem.isApproved ? 'success' : 'warning'">{{ pageItem.isApproved ? 'Approved' : 'Pending' }}</StatusChip>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button
                    v-if="!pageItem.isApproved"
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                    :disabled="approvingPageId === pageItem.id"
                    :title="`Approve ${pageItem.name}`"
                    @click="approvePage(pageItem)"
                  >
                    <Loader2 v-if="approvingPageId === pageItem.id" class="h-4 w-4 animate-spin" />
                    <CheckCircle2 v-else class="h-4 w-4" />
                  </button>
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`View ${pageItem.name}`" @click="viewingPage = pageItem">
                    <Eye class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && filteredPages.length > 0" class="space-y-3 p-4 md:hidden">
        <article v-for="pageItem in filteredPages" :key="pageItem.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-[var(--text-primary)]">{{ pageItem.name }}</p>
              <p class="mt-1 font-mono text-xs text-[var(--text-secondary)]">{{ pageItem.slug }}</p>
            </div>
            <StatusChip :tone="pageItem.isApproved ? 'success' : 'warning'">{{ pageItem.isApproved ? 'Approved' : 'Pending' }}</StatusChip>
          </div>
          <div class="mt-3 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
            <div class="grid h-14 w-14 place-items-center overflow-hidden rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
              <img v-if="pageItem.avatar" :src="pageItem.avatar" alt="" class="h-full w-full object-cover" />
              <FileText v-else class="h-5 w-5 text-[var(--text-tertiary)]" />
            </div>
            <div>
              <div class="h-14 overflow-hidden rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
                <img v-if="pageItem.coverImage" :src="pageItem.coverImage" alt="" class="h-full w-full object-cover" />
                <div v-else class="grid h-full place-items-center text-xs text-[var(--text-tertiary)]">No cover</div>
              </div>
              <div class="mt-2 flex gap-2">
                <label class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[0.65rem] border border-[color:var(--border-soft)] px-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <ImageUp class="h-3.5 w-3.5" />
                  Avatar
                  <input class="hidden" type="file" accept="image/*" @change="uploadPageImage(pageItem, 'avatar', $event)" />
                </label>
                <label class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[0.65rem] border border-[color:var(--border-soft)] px-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <ImageUp class="h-3.5 w-3.5" />
                  Cover
                  <input class="hidden" type="file" accept="image/*" @change="uploadPageImage(pageItem, 'cover', $event)" />
                </label>
              </div>
            </div>
          </div>
          <p class="mt-3 text-sm text-[var(--text-secondary)]">{{ getCategoryName(pageItem.categoryId) }}</p>
          <div class="mt-3 flex items-center justify-between gap-3">
            <p class="text-xs text-[var(--text-tertiary)]">{{ pageItem.followers_count ?? 0 }} followers · {{ pageItem.posts_count ?? 0 }} posts</p>
            <div class="flex gap-2">
              <button v-if="!pageItem.isApproved" type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-emerald-200 text-emerald-700" @click="approvePage(pageItem)">
                <CheckCircle2 class="h-4 w-4" />
              </button>
              <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" @click="viewingPage = pageItem">
                <Eye class="h-4 w-4" />
              </button>
            </div>
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

    <div v-if="viewingPage" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingPage = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Page details</p>
            <h2 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingPage.name }}</h2>
            <p class="mt-1 font-mono text-xs text-[var(--text-secondary)]">{{ viewingPage.slug }}</p>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingPage = null">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Followers</p>
            <p class="mt-2 font-display text-2xl font-semibold">{{ viewingPage.followers_count ?? 0 }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Posts</p>
            <p class="mt-2 font-display text-2xl font-semibold">{{ viewingPage.posts_count ?? 0 }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Category total</p>
            <p class="mt-2 font-display text-2xl font-semibold">{{ viewingPage.category_pages_count ?? 0 }}</p>
          </article>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Avatar</p>
            <div class="mt-3 flex items-center gap-3">
              <div class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
                <img v-if="viewingPage.avatar" :src="viewingPage.avatar" alt="" class="h-full w-full object-cover" />
                <FileText v-else class="h-5 w-5 text-[var(--text-tertiary)]" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs text-[var(--text-secondary)]">{{ viewingPage.avatar || 'No avatar uploaded' }}</p>
                <label class="mt-2 inline-flex h-9 cursor-pointer items-center justify-center rounded-[0.75rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]">
                  <Loader2 v-if="uploadingAvatarId === viewingPage.id" class="mr-2 h-4 w-4 animate-spin" />
                  {{ uploadingAvatarId === viewingPage.id ? 'Uploading...' : 'Upload avatar' }}
                  <input class="hidden" type="file" accept="image/*" :disabled="uploadingAvatarId === viewingPage.id" @change="uploadPageImage(viewingPage, 'avatar', $event)" />
                </label>
              </div>
            </div>
          </article>

          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Cover image</p>
            <div class="mt-3 overflow-hidden rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
              <img v-if="viewingPage.coverImage" :src="viewingPage.coverImage" alt="" class="h-24 w-full object-cover" />
              <div v-else class="grid h-24 place-items-center text-sm text-[var(--text-tertiary)]">No cover uploaded</div>
            </div>
            <label class="mt-3 inline-flex h-9 cursor-pointer items-center justify-center rounded-[0.75rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]">
              <Loader2 v-if="uploadingCoverId === viewingPage.id" class="mr-2 h-4 w-4 animate-spin" />
              {{ uploadingCoverId === viewingPage.id ? 'Uploading...' : 'Upload cover' }}
              <input class="hidden" type="file" accept="image/*" :disabled="uploadingCoverId === viewingPage.id" @change="uploadPageImage(viewingPage, 'cover', $event)" />
            </label>
          </article>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Description</p>
            <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{{ viewingPage.description || 'No description' }}</p>
          </div>
          <div class="space-y-3 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-[var(--text-secondary)]">Active</span>
              <StatusChip :tone="viewingPage.isActive ? 'success' : 'muted'">{{ viewingPage.isActive ? 'Yes' : 'No' }}</StatusChip>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-[var(--text-secondary)]">Verified</span>
              <StatusChip :tone="viewingPage.isVerified ? 'success' : 'muted'">{{ viewingPage.isVerified ? 'Yes' : 'No' }}</StatusChip>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-[var(--text-secondary)]">Approved</span>
              <StatusChip :tone="viewingPage.isApproved ? 'success' : 'warning'">{{ viewingPage.isApproved ? 'Yes' : 'No' }}</StatusChip>
            </div>
          </div>
        </div>

        <div class="mt-5 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <p class="text-sm font-semibold text-[var(--text-primary)]">Metadata</p>
          <pre class="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-[var(--text-secondary)]">{{ stringifyJson(viewingPage.metadata) }}</pre>
        </div>

        <p class="mt-5 text-xs text-[var(--text-tertiary)]">
          Category: {{ getCategoryName(viewingPage.categoryId) }} · Created {{ formatDate(viewingPage.createdAt) }} · Updated {{ formatDate(viewingPage.updatedAt) }}
        </p>
      </section>
    </div>
  </div>
</template>
