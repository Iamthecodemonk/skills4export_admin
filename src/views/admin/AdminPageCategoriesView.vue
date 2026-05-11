<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Eye, FileStack, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { apiRequest } from '../../composables/useApi'
import StatusChip from '../../components/StatusChip.vue'

type PageCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  is_active: number
  rules?: Record<string, unknown> | null
  max_pages_per_user?: number | null
  requires_approval?: number | null
  validation_rules?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  total_pages?: number | null
}

type ListPageCategoriesResponse = {
  success?: boolean
  data?: PageCategory[]
}

type PageCategoryResponse = {
  success: boolean
  data: PageCategory
}

type DeletePageCategoryResponse = {
  success: boolean
  data: {
    id: string
  }
}

const categories = ref<PageCategory[]>([])
const search = ref('')
const loading = ref(false)
const creating = ref(false)
const updating = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const editError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const showCreateForm = ref(false)
const editingCategory = ref<PageCategory | null>(null)
const viewingCategory = ref<PageCategory | null>(null)
const deletingCategory = ref<PageCategory | null>(null)
const viewLoadingId = ref<string | null>(null)

const name = ref('')
const slug = ref('')
const description = ref('')
const icon = ref('')
const isActive = ref(1)
const requiresApproval = ref(1)
const maxPagesPerUser = ref<number | null>(null)
const rulesJson = ref('')
const validationRulesJson = ref('')

const editName = ref('')
const editSlug = ref('')
const editDescription = ref('')
const editIcon = ref('')
const editIsActive = ref(1)
const editRequiresApproval = ref(1)
const editMaxPagesPerUser = ref<number | null>(null)
const editRulesJson = ref('')
const editValidationRulesJson = ref('')

const filteredCategories = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) {
    return categories.value
  }

  return categories.value.filter((category) => {
    return `${category.name} ${category.slug} ${category.description || ''}`.toLowerCase().includes(term)
  })
})

function parseOptionalJson(value: string, label: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    throw new Error(`${label} must be valid JSON`)
  }
}

function stringifyJson(value: Record<string, unknown> | null | undefined) {
  return value ? JSON.stringify(value, null, 2) : ''
}

function resetCreateForm() {
  name.value = ''
  slug.value = ''
  description.value = ''
  icon.value = ''
  isActive.value = 1
  requiresApproval.value = 1
  maxPagesPerUser.value = null
  rulesJson.value = ''
  validationRulesJson.value = ''
  formError.value = null
}

function buildPayload(mode: 'create' | 'edit') {
  const source = mode === 'create'
    ? {
        name: name.value,
        slug: slug.value,
        description: description.value,
        icon: icon.value,
        isActive: isActive.value,
        requiresApproval: requiresApproval.value,
        maxPagesPerUser: maxPagesPerUser.value,
        rulesJson: rulesJson.value,
        validationRulesJson: validationRulesJson.value,
      }
    : {
        name: editName.value,
        slug: editSlug.value,
        description: editDescription.value,
        icon: editIcon.value,
        isActive: editIsActive.value,
        requiresApproval: editRequiresApproval.value,
        maxPagesPerUser: editMaxPagesPerUser.value,
        rulesJson: editRulesJson.value,
        validationRulesJson: editValidationRulesJson.value,
      }

  if (!source.name.trim() || !source.slug.trim()) {
    throw new Error('Name and slug are required')
  }

  return {
    name: source.name.trim(),
    slug: source.slug.trim(),
    description: source.description.trim() || undefined,
    icon: source.icon.trim() || undefined,
    is_active: source.isActive,
    requires_approval: source.requiresApproval,
    max_pages_per_user: source.maxPagesPerUser,
    rules: parseOptionalJson(source.rulesJson, 'Rules'),
    validation_rules: parseOptionalJson(source.validationRulesJson, 'Validation rules'),
  }
}

function formatDate(value: string) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

async function fetchCategories() {
  loading.value = true
  error.value = null

  try {
    const response = await apiRequest<ListPageCategoriesResponse | PageCategory[]>('/api/page-categories')
    categories.value = Array.isArray(response) ? response : response.data || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load page categories'
  } finally {
    loading.value = false
  }
}

async function createCategory() {
  creating.value = true
  formError.value = null

  try {
    const response = await apiRequest<PageCategoryResponse>('/api/page-categories', {
      method: 'POST',
      body: JSON.stringify(buildPayload('create')),
    })

    categories.value = [response.data, ...categories.value]
    resetCreateForm()
    showCreateForm.value = false
    toast.success('Page category created')
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create page category'
  } finally {
    creating.value = false
  }
}

async function openViewModal(category: PageCategory) {
  viewLoadingId.value = category.id

  try {
    const response = await apiRequest<PageCategoryResponse>(`/api/page-categories/${category.id}`)
    viewingCategory.value = response.data
  } catch {
    viewingCategory.value = category
  } finally {
    viewLoadingId.value = null
  }
}

function openEditModal(category: PageCategory) {
  editingCategory.value = category
  editName.value = category.name
  editSlug.value = category.slug
  editDescription.value = category.description || ''
  editIcon.value = category.icon || ''
  editIsActive.value = category.is_active ? 1 : 0
  editRequiresApproval.value = category.requires_approval ? 1 : 0
  editMaxPagesPerUser.value = category.max_pages_per_user ?? null
  editRulesJson.value = stringifyJson(category.rules)
  editValidationRulesJson.value = stringifyJson(category.validation_rules)
  editError.value = null
}

function closeEditModal() {
  if (updating.value) {
    return
  }

  editingCategory.value = null
  editError.value = null
}

async function updateCategory() {
  if (!editingCategory.value) {
    return
  }

  updating.value = true
  editError.value = null

  try {
    const response = await apiRequest<PageCategoryResponse>(`/api/page-categories/${editingCategory.value.id}`, {
      method: 'PUT',
      body: JSON.stringify(buildPayload('edit')),
    })

    categories.value = categories.value.map((category) => category.id === response.data.id ? response.data : category)
    editingCategory.value = null
    toast.success('Page category updated')
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Unable to update page category'
  } finally {
    updating.value = false
  }
}

function openDeleteModal(category: PageCategory) {
  deletingCategory.value = category
  deleteError.value = null
}

function closeDeleteModal() {
  if (deleting.value) {
    return
  }

  deletingCategory.value = null
  deleteError.value = null
}

async function deleteCategory() {
  if (!deletingCategory.value) {
    return
  }

  deleting.value = true
  deleteError.value = null

  try {
    const response = await apiRequest<DeletePageCategoryResponse>(`/api/page-categories/${deletingCategory.value.id}`, {
      method: 'DELETE',
    })

    categories.value = categories.value.filter((category) => category.id !== response.data.id)
    deletingCategory.value = null
    toast.success('Page category deleted')
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Unable to delete page category'
  } finally {
    deleting.value = false
  }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Pages</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Page Categories</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Configure page category types, rules, approval requirements, and page limits.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="fetchCategories"
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
            {{ showCreateForm ? 'Close form' : 'New category' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-4xl" @submit.prevent="createCategory">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <FileStack class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create page category</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Define how pages in this category behave.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
            <input v-model="name" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Community" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Slug</label>
            <input v-model="slug" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="community" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Icon</label>
            <input v-model="icon" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="users" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Max pages per user</label>
            <input v-model.number="maxPagesPerUser" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" min="0" type="number" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Status</label>
            <select v-model.number="isActive" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]">
              <option :value="1">Active</option>
              <option :value="0">Inactive</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Requires approval</label>
            <select v-model.number="requiresApproval" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]">
              <option :value="1">Yes</option>
              <option :value="0">No</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</label>
            <textarea v-model="description" class="min-h-24 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Community pages for user groups, discussions and events."></textarea>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Rules JSON</label>
            <textarea v-model="rulesJson" class="min-h-32 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 font-mono text-xs outline-none focus:border-[var(--accent)]" placeholder='{"allowPosting": true}'></textarea>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Validation rules JSON</label>
            <textarea v-model="validationRulesJson" class="min-h-32 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 font-mono text-xs outline-none focus:border-[var(--accent)]" placeholder='{"slugPattern": "^[a-z0-9-]+$"}'></textarea>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ formError }}</p>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="showCreateForm = false">Cancel</button>
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            {{ creating ? 'Creating...' : 'Create category' }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Categories</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ categories.length }} total categories</p>
        </div>
        <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-80">
          <Search class="h-4 w-4" />
          <input v-model="search" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search categories" type="search" />
        </label>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading page categories
      </div>
      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{{ error }}</div>
      </div>
      <div v-else-if="filteredCategories.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No page categories found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create your first page category or adjust your search.</p>
        </div>
      </div>

      <div v-else class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="px-4 py-3 font-semibold">Category</th>
              <th class="px-4 py-3 font-semibold">Slug</th>
              <th class="px-4 py-3 font-semibold">Approval</th>
              <th class="px-4 py-3 font-semibold">Pages</th>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="category in filteredCategories" :key="category.id">
              <td class="px-4 py-3">
                <p class="font-semibold text-[var(--text-primary)]">{{ category.name }}</p>
                <p class="mt-1 max-w-md truncate text-sm text-[var(--text-secondary)]">{{ category.description || 'No description' }}</p>
              </td>
              <td class="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{{ category.slug }}</td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ category.requires_approval ? 'Required' : 'Not required' }}</td>
              <td class="px-4 py-3 font-semibold text-[var(--text-primary)]">{{ category.total_pages ?? 0 }}</td>
              <td class="px-4 py-3">
                <StatusChip :tone="category.is_active ? 'success' : 'muted'">{{ category.is_active ? 'Active' : 'Inactive' }}</StatusChip>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60" :disabled="viewLoadingId === category.id" :title="`View ${category.name}`" @click="openViewModal(category)">
                    <Loader2 v-if="viewLoadingId === category.id" class="h-4 w-4 animate-spin" />
                    <Eye v-else class="h-4 w-4" />
                  </button>
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`Edit ${category.name}`" @click="openEditModal(category)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600 hover:bg-red-50" :title="`Delete ${category.name}`" @click="openDeleteModal(category)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && filteredCategories.length > 0" class="space-y-3 p-4 md:hidden">
        <article v-for="category in filteredCategories" :key="category.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-[var(--text-primary)]">{{ category.name }}</p>
              <p class="mt-1 font-mono text-xs text-[var(--text-secondary)]">{{ category.slug }}</p>
            </div>
            <StatusChip :tone="category.is_active ? 'success' : 'muted'">{{ category.is_active ? 'Active' : 'Inactive' }}</StatusChip>
          </div>
          <p class="mt-3 text-sm text-[var(--text-secondary)]">{{ category.description || 'No description' }}</p>
          <div class="mt-3 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">{{ category.total_pages ?? 0 }} pages</p>
            <div class="flex gap-2">
              <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" @click="openViewModal(category)"><Eye class="h-4 w-4" /></button>
              <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" @click="openEditModal(category)"><Pencil class="h-4 w-4" /></button>
              <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600" @click="openDeleteModal(category)"><Trash2 class="h-4 w-4" /></button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div v-if="viewingCategory" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingCategory = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Page category details</p>
            <h2 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingCategory.name }}</h2>
            <p class="mt-1 font-mono text-xs text-[var(--text-secondary)]">{{ viewingCategory.slug }}</p>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingCategory = null"><X class="h-4 w-4" /></button>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Pages</p>
            <p class="mt-2 font-display text-2xl font-semibold">{{ viewingCategory.total_pages ?? 0 }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Limit</p>
            <p class="mt-2 font-display text-2xl font-semibold">{{ viewingCategory.max_pages_per_user ?? 'None' }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Approval</p>
            <p class="mt-2 font-display text-2xl font-semibold">{{ viewingCategory.requires_approval ? 'Yes' : 'No' }}</p>
          </article>
        </div>
        <div class="mt-5 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <p class="text-sm font-semibold text-[var(--text-primary)]">Description</p>
          <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{{ viewingCategory.description || 'No description' }}</p>
        </div>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Rules</p>
            <pre class="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-[var(--text-secondary)]">{{ stringifyJson(viewingCategory.rules) || 'None' }}</pre>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Validation rules</p>
            <pre class="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-[var(--text-secondary)]">{{ stringifyJson(viewingCategory.validation_rules) || 'None' }}</pre>
          </div>
        </div>
        <p class="mt-5 text-xs text-[var(--text-tertiary)]">Created {{ formatDate(viewingCategory.created_at) }} · Updated {{ formatDate(viewingCategory.updated_at) }}</p>
      </section>
    </div>

    <div v-if="editingCategory" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="closeEditModal">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Pages</p>
            <h2 class="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">Edit page category</h2>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="closeEditModal"><X class="h-4 w-4" /></button>
        </div>
        <form class="mt-5 grid gap-4 md:grid-cols-2" @submit.prevent="updateCategory">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
            <input v-model="editName" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Slug</label>
            <input v-model="editSlug" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Icon</label>
            <input v-model="editIcon" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Max pages per user</label>
            <input v-model.number="editMaxPagesPerUser" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]" min="0" type="number" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Status</label>
            <select v-model.number="editIsActive" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]">
              <option :value="1">Active</option>
              <option :value="0">Inactive</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Requires approval</label>
            <select v-model.number="editRequiresApproval" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--accent)]">
              <option :value="1">Yes</option>
              <option :value="0">No</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</label>
            <textarea v-model="editDescription" class="min-h-24 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"></textarea>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Rules JSON</label>
            <textarea v-model="editRulesJson" class="min-h-32 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 font-mono text-xs outline-none focus:border-[var(--accent)]"></textarea>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Validation rules JSON</label>
            <textarea v-model="editValidationRulesJson" class="min-h-32 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 font-mono text-xs outline-none focus:border-[var(--accent)]"></textarea>
          </div>
          <p v-if="editError" class="rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 md:col-span-2">{{ editError }}</p>
          <div class="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)]" :disabled="updating" @click="closeEditModal">Cancel</button>
            <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-70" :disabled="updating">
              <Loader2 v-if="updating" class="h-4 w-4 animate-spin" />
              {{ updating ? 'Saving...' : 'Save changes' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="deletingCategory" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="closeDeleteModal">
      <section class="w-full max-w-md rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-red-600">Delete category</p>
            <h2 class="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">{{ deletingCategory.name }}</h2>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="closeDeleteModal"><X class="h-4 w-4" /></button>
        </div>
        <p class="mt-4 text-sm leading-6 text-[var(--text-secondary)]">Pages that reference this category will be unassigned before deletion.</p>
        <p v-if="deleteError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ deleteError }}</p>
        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)]" :disabled="deleting" @click="closeDeleteModal">Cancel</button>
          <button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-70" :disabled="deleting" @click="deleteCategory">
            <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
            {{ deleting ? 'Deleting...' : 'Delete category' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
