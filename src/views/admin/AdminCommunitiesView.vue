<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check, ChevronDown, Eye, FolderPlus, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { apiRequest } from '../../composables/useApi'
import StatusChip from '../../components/StatusChip.vue'

type CommunityCategory = {
  id: string
  name: string
  description?: string | null
}

type Community = {
  id: string
  categoryId?: string | null
  category_id?: string | null
  category?: CommunityCategory | null
  icon?: string | null
  name: string
  description?: string | null
  is_active: number
  default_post_visibility: 'public' | 'connections' | 'community' | string | null
  posts_count?: number
  post_likes_count?: number
  post_reactions_count?: number
  comments_count?: number
  created_at: string
}

type ListCommunityCategoriesResponse = {
  success: boolean
  data: CommunityCategory[]
}

type ListCommunitiesResponse = {
  current_page: number
  data: Community[]
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

type CreateCommunityResponse = {
  success: boolean
  data: Community
}

type GetCommunityResponse = {
  success: boolean
  data: Community
}

type UpdateCommunityResponse = {
  success: boolean
  data: Community
}

type DeleteCommunityResponse = {
  success: boolean
  data: {
    id: string
  }
}

const communities = ref<Community[]>([])
const categories = ref<CommunityCategory[]>([])
const search = ref('')
const selectedCategoryId = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const lastPage = ref(1)
const from = ref<number | null>(null)
const to = ref<number | null>(null)
const loading = ref(false)
const categoriesLoading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const showCreateForm = ref(false)
const editingCommunity = ref<Community | null>(null)
const editName = ref('')
const editIcon = ref('las la-users')
const editDescription = ref('')
const editDefaultPostVisibility = ref<'public' | 'connections' | 'community'>('public')
const editIsActive = ref(1)
const editError = ref<string | null>(null)
const updating = ref(false)
const deletingCommunity = ref<Community | null>(null)
const deleteError = ref<string | null>(null)
const deleting = ref(false)
const viewingCommunity = ref<Community | null>(null)
const viewError = ref<string | null>(null)
const viewLoadingId = ref<string | null>(null)

const name = ref('')
const icon = ref('las la-users')
const description = ref('')
const defaultPostVisibility = ref<'public' | 'connections' | 'community'>('public')
const iconPickerOpen = ref(false)
const editIconPickerOpen = ref(false)
const iconSearch = ref('')
const editIconSearch = ref('')

const communityIconOptions = [
  { label: 'Users', value: 'las la-users' },
  { label: 'Chess', value: 'las la-chess' },
  { label: 'Globe', value: 'las la-globe' },
  { label: 'Africa', value: 'las la-globe-africa' },
  { label: 'Briefcase', value: 'las la-briefcase' },
  { label: 'Handshake', value: 'las la-handshake' },
  { label: 'Comments', value: 'las la-comments' },
  { label: 'Question', value: 'las la-question-circle' },
  { label: 'Laptop code', value: 'las la-laptop-code' },
  { label: 'Code', value: 'las la-code' },
  { label: 'Store', value: 'las la-store' },
  { label: 'Shopping bag', value: 'las la-shopping-bag' },
  { label: 'Chart', value: 'las la-chart-line' },
  { label: 'Coins', value: 'las la-coins' },
  { label: 'Landmark', value: 'las la-landmark' },
  { label: 'Balance', value: 'las la-balance-scale' },
  { label: 'Gavel', value: 'las la-gavel' },
  { label: 'Tools', value: 'las la-tools' },
  { label: 'Cogs', value: 'las la-cogs' },
  { label: 'Helping hands', value: 'las la-hands-helping' },
  { label: 'Teacher', value: 'las la-chalkboard-teacher' },
  { label: 'Graduation', value: 'las la-graduation-cap' },
  { label: 'Book', value: 'las la-book' },
  { label: 'Book open', value: 'las la-book-open' },
  { label: 'Flask', value: 'las la-flask' },
  { label: 'Microscope', value: 'las la-microscope' },
  { label: 'Stethoscope', value: 'las la-stethoscope' },
  { label: 'Hospital', value: 'las la-hospital' },
  { label: 'Home', value: 'las la-home' },
  { label: 'City', value: 'las la-city' },
  { label: 'Map marker', value: 'las la-map-marker-alt' },
  { label: 'Seedling', value: 'las la-seedling' },
  { label: 'Leaf', value: 'las la-leaf' },
  { label: 'Tractor', value: 'las la-tractor' },
  { label: 'Ship', value: 'las la-ship' },
  { label: 'Plane', value: 'las la-plane' },
  { label: 'Truck', value: 'las la-truck' },
  { label: 'Camera', value: 'las la-camera' },
  { label: 'Video', value: 'las la-video' },
  { label: 'Microphone', value: 'las la-microphone' },
  { label: 'Music', value: 'las la-music' },
  { label: 'Palette', value: 'las la-palette' },
  { label: 'Paint brush', value: 'las la-paint-brush' },
  { label: 'Pen nib', value: 'las la-pen-nib' },
  { label: 'Futbol', value: 'las la-futbol' },
  { label: 'Running', value: 'las la-running' },
  { label: 'Heartbeat', value: 'las la-heartbeat' },
  { label: 'Heart', value: 'las la-heart' },
  { label: 'Star', value: 'las la-star' },
  { label: 'Lightbulb', value: 'las la-lightbulb' },
]

const categoryById = computed(() => {
  return new Map(categories.value.map((category) => [String(category.id), category]))
})

const filteredCreateIcons = computed(() => filterIcons(iconSearch.value))
const filteredEditIcons = computed(() => filterIcons(editIconSearch.value))

function getCategoryName(community: Community) {
  if (community.category?.name) {
    return community.category.name
  }

  const id = getCommunityCategoryId(community)

  if (!id) {
    return 'No category returned'
  }

  return categoryById.value.get(String(id))?.name || 'Unknown category'
}

function getCommunityCategoryId(community: Community) {
  return community.categoryId || community.category_id || community.category?.id || null
}

function getPostVisibilityLabel(value?: string | null) {
  if (value === 'community') {
    return 'Vertical'
  }

  return 'Horizontal'
}

function filterIcons(value: string) {
  const term = value.trim().toLowerCase()

  if (!term) {
    return communityIconOptions
  }

  return communityIconOptions.filter((option) => {
    return `${option.label} ${option.value}`.toLowerCase().includes(term)
  })
}

function normalizeCommunityIcon(value: string | null | undefined) {
  const trimmed = (value || '').trim()

  if (!trimmed) {
    return 'las la-users'
  }

  if (/^la-[a-z0-9-]+$/.test(trimmed)) {
    return `las ${trimmed}`
  }

  if (/^la[rsb]\s+la-[a-z0-9-]+$/.test(trimmed)) {
    return trimmed
  }

  return 'las la-users'
}

function getCommunityIcon(community: Community) {
  return normalizeCommunityIcon(community.icon)
}

function selectCreateIcon(value: string) {
  icon.value = value
  iconPickerOpen.value = false
  iconSearch.value = ''
}

function selectEditIcon(value: string) {
  editIcon.value = value
  editIconPickerOpen.value = false
  editIconSearch.value = ''
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

function buildCommunitiesPath() {
  const params = new URLSearchParams({
    page: String(page.value),
    per_page: String(perPage.value),
  })

  const term = search.value.trim()
  if (term) {
    params.set('q', term)
  }

  if (selectedCategoryId.value) {
    params.set('categoryId', selectedCategoryId.value)
  }

  return `/api/communities?${params.toString()}`
}

async function fetchCategories() {
  categoriesLoading.value = true

  try {
    const response = await apiRequest<ListCommunityCategoriesResponse>('/api/community-categories')
    categories.value = response.data || []
  } catch {
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

async function fetchCommunities() {
  loading.value = true
  error.value = null

  try {
    const response = await apiRequest<ListCommunitiesResponse>(buildCommunitiesPath())
    communities.value = response.data || []
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load communities'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  fetchCommunities()
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchCommunities()
}

async function createCommunity() {
  formError.value = null

  if (!name.value.trim()) {
    formError.value = 'Community name is required'
    return
  }

  creating.value = true

  try {
    await apiRequest<CreateCommunityResponse>('/api/communities', {
      method: 'POST',
      body: JSON.stringify({
        name: name.value.trim(),
        icon: normalizeCommunityIcon(icon.value),
        description: description.value.trim() || undefined,
        defaultPostVisibility: defaultPostVisibility.value,
      }),
    })

    toast.success('Community created')
    name.value = ''
    icon.value = 'las la-users'
    iconPickerOpen.value = false
    iconSearch.value = ''
    description.value = ''
    defaultPostVisibility.value = 'public'
    showCreateForm.value = false
    page.value = 1
    await fetchCommunities()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create community'
  } finally {
    creating.value = false
  }
}

function openEditModal(community: Community) {
  editingCommunity.value = community
  editName.value = community.name
  editIcon.value = normalizeCommunityIcon(community.icon)
  editDescription.value = community.description || ''
  editDefaultPostVisibility.value = community.default_post_visibility === 'community' ? 'community' : 'public'
  editIsActive.value = community.is_active ? 1 : 0
  editError.value = null
}

function closeEditModal() {
  if (updating.value) {
    return
  }

  editingCommunity.value = null
  editName.value = ''
  editIcon.value = 'las la-users'
  editIconPickerOpen.value = false
  editIconSearch.value = ''
  editDescription.value = ''
  editDefaultPostVisibility.value = 'public'
  editIsActive.value = 1
  editError.value = null
}

function openDeleteModal(community: Community) {
  deletingCommunity.value = community
  deleteError.value = null
}

function closeDeleteModal() {
  if (deleting.value) {
    return
  }

  deletingCommunity.value = null
  deleteError.value = null
}

function closeViewModal() {
  viewingCommunity.value = null
  viewError.value = null
}

async function openViewModal(community: Community) {
  viewLoadingId.value = community.id
  viewError.value = null

  try {
    const response = await apiRequest<GetCommunityResponse>(`/api/communities/${community.id}`)
    viewingCommunity.value = response.data
  } catch (err) {
    viewError.value = err instanceof Error ? err.message : 'Unable to load community details'
    viewingCommunity.value = community
  } finally {
    viewLoadingId.value = null
  }
}

async function updateCommunity() {
  if (!editingCommunity.value) {
    return
  }

  editError.value = null

  if (!editName.value.trim()) {
    editError.value = 'Community name is required'
    return
  }

  updating.value = true

  try {
    const response = await apiRequest<UpdateCommunityResponse>(`/api/communities/${editingCommunity.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editName.value.trim(),
        icon: normalizeCommunityIcon(editIcon.value),
        description: editDescription.value.trim() || undefined,
        defaultPostVisibility: editDefaultPostVisibility.value,
        is_active: editIsActive.value,
      }),
    })

    communities.value = communities.value.map((community) => {
      return community.id === response.data.id ? response.data : community
    })
    toast.success('Community updated')
    editingCommunity.value = null
    editName.value = ''
    editIcon.value = 'las la-users'
    editIconPickerOpen.value = false
    editIconSearch.value = ''
    editDescription.value = ''
    editDefaultPostVisibility.value = 'public'
    editIsActive.value = 1
    editError.value = null
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Unable to update community'
  } finally {
    updating.value = false
  }
}

async function deleteCommunity() {
  if (!deletingCommunity.value) {
    return
  }

  deleting.value = true
  deleteError.value = null

  try {
    const response = await apiRequest<DeleteCommunityResponse>(`/api/communities/${deletingCommunity.value.id}`, {
      method: 'DELETE',
    })

    communities.value = communities.value.filter((community) => community.id !== response.data.id)
    total.value = Math.max(total.value - 1, 0)
    toast.success('Community deleted')
    deletingCommunity.value = null
    deleteError.value = null
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Unable to delete community'
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchCategories()
  fetchCommunities()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Communities
          </p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">
            Manage Communities
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Create and organize communities, choose icons, and control default post visibility.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="fetchCommunities"
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
            {{ showCreateForm ? 'Close form' : 'New community' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-3xl" @submit.prevent="createCommunity">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <FolderPlus class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create community</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Set up a new community and choose how new posts are shared by default.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
            <input
              v-model="name"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              placeholder="Local Chess Club"
              type="text"
            />
          </div>

          <div class="relative">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Icon</label>
            <button
              type="button"
              class="flex h-11 w-full items-center justify-between gap-3 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-left text-sm text-[var(--text-primary)] outline-none hover:border-[var(--accent)] hover:bg-[var(--surface-primary)]"
              :aria-expanded="iconPickerOpen"
              @click="iconPickerOpen = !iconPickerOpen"
            >
              <span class="flex min-w-0 items-center gap-3">
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-[0.75rem] bg-[var(--accent-soft)] text-xl text-[var(--accent-strong)]">
                  <i :class="normalizeCommunityIcon(icon)" aria-hidden="true"></i>
                </span>
                <span class="min-w-0 truncate font-medium">{{ normalizeCommunityIcon(icon) }}</span>
              </span>
              <ChevronDown class="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" :class="iconPickerOpen ? 'rotate-180' : ''" />
            </button>

            <div
              v-if="iconPickerOpen"
              class="absolute left-0 right-0 top-[4.8rem] z-20 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-3"
            >
              <label class="flex h-10 items-center gap-2 rounded-[0.75rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
                <Search class="h-4 w-4" />
                <input
                  v-model="iconSearch"
                  class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                  placeholder="Search Line Awesome icons"
                  type="search"
                />
              </label>

              <div class="app-scroll mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                <button
                  v-for="option in filteredCreateIcons"
                  :key="option.value"
                  type="button"
                  class="flex min-w-0 flex-col items-center gap-1 rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-2 py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  :class="normalizeCommunityIcon(icon) === option.value ? 'border-[var(--accent)] text-[var(--accent-strong)]' : ''"
                  @click="selectCreateIcon(option.value)"
                >
                  <i :class="option.value" class="text-2xl" aria-hidden="true"></i>
                  <span class="w-full truncate">{{ option.label }}</span>
                </button>
              </div>

              <p v-if="filteredCreateIcons.length === 0" class="mt-3 text-center text-sm text-[var(--text-secondary)]">No matching icons</p>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Default post visibility</label>
            <select
              v-model="defaultPostVisibility"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
            >
              <option value="public">Horizontal</option>
              <option value="community">Vertical</option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</label>
            <textarea
              v-model="description"
              class="min-h-24 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              placeholder="We meet weekly to play chess"
            ></textarea>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {{ formError }}
        </p>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]"
            @click="showCreateForm = false"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="creating"
          >
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            {{ creating ? 'Creating...' : 'Create community' }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Communities</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">
              {{ from || 0 }}-{{ to || 0 }} of {{ total }} communities
            </p>
          </div>

          <div class="flex flex-col gap-2 md:flex-row md:items-center">
            <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-72">
              <Search class="h-4 w-4" />
              <input
                v-model="search"
                class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                placeholder="Search communities"
                type="search"
                @keyup.enter="applyFilters"
              />
            </label>

            <select
              v-model="selectedCategoryId"
              class="h-10 rounded-[0.85rem] border border-transparent bg-[var(--search-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              :disabled="categoriesLoading"
              @change="applyFilters"
            >
              <option value="">All categories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>

            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]"
              @click="applyFilters"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading communities
      </div>

      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {{ error }}
        </div>
      </div>

      <div v-else-if="communities.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No communities found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create your first community or adjust your filters.</p>
        </div>
      </div>

      <div v-else class="app-scroll hidden max-w-full overflow-x-auto md:block">
        <table class="w-full min-w-[68rem] table-fixed text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="px-4 py-3 font-semibold">Community</th>
              <th class="px-4 py-3 font-semibold">Category</th>
              <th class="px-4 py-3 font-semibold">Visibility</th>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="community in communities" :key="community.id">
              <td class="px-4 py-3">
                <div class="flex min-w-0 items-start gap-3">
                  <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.8rem] bg-[var(--accent-soft)] text-xl text-[var(--accent-strong)]">
                    <i :class="getCommunityIcon(community)" aria-hidden="true"></i>
                  </span>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-[var(--text-primary)]">{{ community.name }}</p>
                    <p class="mt-1 max-w-md truncate text-sm text-[var(--text-secondary)]">{{ community.description || 'No description' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ getCategoryName(community) }}</td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ getPostVisibilityLabel(community.default_post_visibility) }}</td>
              <td class="px-4 py-3">
                <StatusChip :tone="community.is_active ? 'success' : 'muted'">
                  {{ community.is_active ? 'Active' : 'Inactive' }}
                </StatusChip>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60"
                    :aria-label="`View ${community.name}`"
                    :title="`View ${community.name}`"
                    :disabled="viewLoadingId === community.id"
                    @click="openViewModal(community)"
                  >
                    <Loader2 v-if="viewLoadingId === community.id" class="h-4 w-4 animate-spin" />
                    <Eye v-else class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                    :aria-label="`Edit ${community.name}`"
                    :title="`Edit ${community.name}`"
                    @click="openEditModal(community)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600 hover:bg-red-50"
                    :aria-label="`Delete ${community.name}`"
                    :title="`Delete ${community.name}`"
                    @click="openDeleteModal(community)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && communities.length > 0" class="space-y-3 p-4 md:hidden">
        <article
          v-for="community in communities"
          :key="community.id"
          class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.8rem] bg-[var(--accent-soft)] text-xl text-[var(--accent-strong)]">
                <i :class="getCommunityIcon(community)" aria-hidden="true"></i>
              </span>
              <div class="min-w-0">
                <p class="truncate font-semibold text-[var(--text-primary)]">{{ community.name }}</p>
                <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ getCategoryName(community) }}</p>
              </div>
            </div>
            <StatusChip :tone="community.is_active ? 'success' : 'muted'">
              {{ community.is_active ? 'Active' : 'Inactive' }}
            </StatusChip>
          </div>
          <p class="mt-3 text-sm text-[var(--text-secondary)]">{{ community.description || 'No description' }}</p>
          <div class="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
            <span>{{ getPostVisibilityLabel(community.default_post_visibility) }}</span>
            <div class="flex gap-2">
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60"
                :aria-label="`View ${community.name}`"
                :title="`View ${community.name}`"
                :disabled="viewLoadingId === community.id"
                @click="openViewModal(community)"
              >
                <Loader2 v-if="viewLoadingId === community.id" class="h-4 w-4 animate-spin" />
                <Eye v-else class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                :aria-label="`Edit ${community.name}`"
                :title="`Edit ${community.name}`"
                @click="openEditModal(community)"
              >
                <Pencil class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600 hover:bg-red-50"
                :aria-label="`Delete ${community.name}`"
                :title="`Delete ${community.name}`"
                @click="openDeleteModal(community)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>
      </div>

      <div
        v-if="!loading && !error && total > 0"
        class="flex flex-col gap-3 border-t border-[color:var(--border-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-[var(--text-secondary)]">Page {{ page }} of {{ lastPage }}</p>
        <div class="flex gap-2">
          <button
            type="button"
            class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >
            Previous
          </button>
          <button
            type="button"
            class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page >= lastPage"
            @click="goToPage(page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </section>

    <div
      v-if="viewingCommunity"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-community-title"
      @click.self="closeViewModal"
    >
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <span class="grid h-12 w-12 shrink-0 place-items-center rounded-[0.9rem] bg-[var(--accent-soft)] text-2xl text-[var(--accent-strong)]">
              <i :class="getCommunityIcon(viewingCommunity)" aria-hidden="true"></i>
            </span>
            <div class="min-w-0">
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Community details
            </p>
            <h2 id="view-community-title" class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">
              {{ viewingCommunity.name }}
            </h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">
              {{ getCategoryName(viewingCommunity) }}
            </p>
            </div>
          </div>

          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
            aria-label="Close details modal"
            @click="closeViewModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <p v-if="viewError" class="mt-4 rounded-[0.85rem] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {{ viewError }}
        </p>

        <div class="mt-5 grid gap-3 sm:grid-cols-4">
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Posts</p>
            <p class="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{{ viewingCommunity.posts_count ?? 0 }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Likes</p>
            <p class="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{{ viewingCommunity.post_likes_count ?? 0 }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Reactions</p>
            <p class="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{{ viewingCommunity.post_reactions_count ?? 0 }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Comments</p>
            <p class="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{{ viewingCommunity.comments_count ?? 0 }}</p>
          </article>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Description</p>
            <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{{ viewingCommunity.description || 'No description' }}</p>
          </div>

          <div class="space-y-3 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-[var(--text-secondary)]">Icon</span>
              <span class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <i :class="getCommunityIcon(viewingCommunity)" class="text-xl text-[var(--accent-strong)]" aria-hidden="true"></i>
                {{ getCommunityIcon(viewingCommunity) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-[var(--text-secondary)]">Status</span>
              <StatusChip :tone="viewingCommunity.is_active ? 'success' : 'muted'">
                {{ viewingCommunity.is_active ? 'Active' : 'Inactive' }}
              </StatusChip>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-[var(--text-secondary)]">Default visibility</span>
              <span class="text-sm font-semibold text-[var(--text-primary)]">{{ getPostVisibilityLabel(viewingCommunity.default_post_visibility) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-[var(--text-secondary)]">Created</span>
              <span class="text-sm font-semibold text-[var(--text-primary)]">{{ formatDate(viewingCommunity.created_at) }}</span>
            </div>
          </div>
        </div>

        <div class="mt-5 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <p class="text-sm font-semibold text-[var(--text-primary)]">System identifiers</p>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <dt class="text-[var(--text-secondary)]">Community ID</dt>
              <dd class="min-w-0 break-all font-mono text-xs text-[var(--text-primary)]">{{ viewingCommunity.id }}</dd>
            </div>
            <div class="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <dt class="text-[var(--text-secondary)]">Category ID</dt>
              <dd class="min-w-0 break-all font-mono text-xs text-[var(--text-primary)]">{{ getCommunityCategoryId(viewingCommunity) || 'None' }}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>

    <div
      v-if="editingCommunity"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-community-title"
      @click.self="closeEditModal"
    >
      <section class="w-full max-w-lg rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Communities
            </p>
            <h2 id="edit-community-title" class="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">
              Edit community
            </h2>
          </div>

          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
            aria-label="Close edit modal"
            @click="closeEditModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="updateCommunity">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
            <input
              v-model="editName"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              type="text"
            />
          </div>

          <div class="relative">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Icon</label>
            <button
              type="button"
              class="flex h-11 w-full items-center justify-between gap-3 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-left text-sm text-[var(--text-primary)] outline-none hover:border-[var(--accent)] hover:bg-[var(--surface-primary)]"
              :aria-expanded="editIconPickerOpen"
              @click="editIconPickerOpen = !editIconPickerOpen"
            >
              <span class="flex min-w-0 items-center gap-3">
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-[0.75rem] bg-[var(--accent-soft)] text-xl text-[var(--accent-strong)]">
                  <i :class="normalizeCommunityIcon(editIcon)" aria-hidden="true"></i>
                </span>
                <span class="min-w-0 truncate font-medium">{{ normalizeCommunityIcon(editIcon) }}</span>
              </span>
              <ChevronDown class="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" :class="editIconPickerOpen ? 'rotate-180' : ''" />
            </button>

            <div
              v-if="editIconPickerOpen"
              class="absolute left-0 right-0 top-[4.8rem] z-20 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-3"
            >
              <label class="flex h-10 items-center gap-2 rounded-[0.75rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
                <Search class="h-4 w-4" />
                <input
                  v-model="editIconSearch"
                  class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                  placeholder="Search Line Awesome icons"
                  type="search"
                />
              </label>

              <div class="app-scroll mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                <button
                  v-for="option in filteredEditIcons"
                  :key="option.value"
                  type="button"
                  class="flex min-w-0 flex-col items-center gap-1 rounded-[0.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-2 py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  :class="normalizeCommunityIcon(editIcon) === option.value ? 'border-[var(--accent)] text-[var(--accent-strong)]' : ''"
                  @click="selectEditIcon(option.value)"
                >
                  <i :class="option.value" class="text-2xl" aria-hidden="true"></i>
                  <span class="w-full truncate">{{ option.label }}</span>
                  <Check v-if="normalizeCommunityIcon(editIcon) === option.value" class="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                </button>
              </div>

              <p v-if="filteredEditIcons.length === 0" class="mt-3 text-center text-sm text-[var(--text-secondary)]">No matching icons</p>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</label>
            <textarea
              v-model="editDescription"
              class="min-h-28 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
            ></textarea>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Default post visibility</label>
              <select
                v-model="editDefaultPostVisibility"
                class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              >
                <option value="public">Horizontal</option>
                <option value="community">Vertical</option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Status</label>
              <select
                v-model.number="editIsActive"
                class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              >
                <option :value="1">Active</option>
                <option :value="0">Inactive</option>
              </select>
            </div>
          </div>

          <p v-if="editError" class="rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {{ editError }}
          </p>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updating"
              @click="closeEditModal"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              :disabled="updating"
            >
              <Loader2 v-if="updating" class="h-4 w-4 animate-spin" />
              {{ updating ? 'Saving...' : 'Save changes' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div
      v-if="deletingCommunity"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-community-title"
      @click.self="closeDeleteModal"
    >
      <section class="w-full max-w-md rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-red-600">
              Delete community
            </p>
            <h2 id="delete-community-title" class="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">
              {{ deletingCommunity.name }}
            </h2>
          </div>

          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
            aria-label="Close delete modal"
            @click="closeDeleteModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          This will remove the community from the admin list. This action cannot be undone from this screen.
        </p>

        <p v-if="deleteError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {{ deleteError }}
        </p>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-[0.85rem] border border-[color:var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="deleting"
            @click="closeDeleteModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="deleting"
            @click="deleteCommunity"
          >
            <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
            {{ deleting ? 'Deleting...' : 'Delete community' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
