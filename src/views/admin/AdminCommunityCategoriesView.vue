<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FolderPlus, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { apiRequest } from '../../composables/useApi'

type CommunityCategory = {
  id: string
  name: string
  total_communities?: number
}

type ListCommunityCategoriesResponse = {
  success: boolean
  data: CommunityCategory[]
}

type CreateCommunityCategoryResponse = {
  success: boolean
  data: CommunityCategory
}

type UpdateCommunityCategoryResponse = {
  success: boolean
  data: CommunityCategory
}

type DeleteCommunityCategoryResponse = {
  success: boolean
  data: {
    id: string
  }
}

const categories = ref<CommunityCategory[]>([])
const search = ref('')
const name = ref('')
const loading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const showCreateForm = ref(false)
const editingCategory = ref<CommunityCategory | null>(null)
const editName = ref('')
const editError = ref<string | null>(null)
const updating = ref(false)
const deletingCategory = ref<CommunityCategory | null>(null)
const deleteError = ref<string | null>(null)
const deleting = ref(false)

const filteredCategories = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) {
    return categories.value
  }

  return categories.value.filter((category) => {
    return category.name.toLowerCase().includes(term)
  })
})

async function fetchCategories() {
  loading.value = true
  error.value = null

  try {
    const response = await apiRequest<ListCommunityCategoriesResponse>('/api/community-categories')
    categories.value = response.data || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load community categories'
  } finally {
    loading.value = false
  }
}

async function createCategory() {
  formError.value = null

  if (!name.value.trim()) {
    formError.value = 'Category name is required'
    return
  }

  creating.value = true

  try {
    const response = await apiRequest<CreateCommunityCategoryResponse>('/api/community-categories', {
      method: 'POST',
      body: JSON.stringify({
        name: name.value.trim(),
      }),
    })

    categories.value = [response.data, ...categories.value]
    name.value = ''
    showCreateForm.value = false
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create category'
  } finally {
    creating.value = false
  }
}

function openEditModal(category: CommunityCategory) {
  editingCategory.value = category
  editName.value = category.name
  editError.value = null
}

function closeEditModal() {
  if (updating.value) {
    return
  }

  editingCategory.value = null
  editName.value = ''
  editError.value = null
}

function openDeleteModal(category: CommunityCategory) {
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

async function updateCategory() {
  if (!editingCategory.value) {
    return
  }

  editError.value = null

  if (!editName.value.trim()) {
    editError.value = 'Category name is required'
    return
  }

  updating.value = true

  try {
    const response = await apiRequest<UpdateCommunityCategoryResponse>(`/api/community-categories/${editingCategory.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editName.value.trim(),
      }),
    })

    categories.value = categories.value.map((category) => {
      return category.id === response.data.id ? response.data : category
    })
    toast.success('Community category updated')
    editingCategory.value = null
    editName.value = ''
    editError.value = null
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Unable to update category'
  } finally {
    updating.value = false
  }
}

async function deleteCategory() {
  if (!deletingCategory.value) {
    return
  }

  deleting.value = true
  deleteError.value = null

  try {
    const response = await apiRequest<DeleteCommunityCategoryResponse>(`/api/community-categories/${deletingCategory.value.id}`, {
      method: 'DELETE',
    })

    categories.value = categories.value.filter((category) => category.id !== response.data.id)
    toast.success('Community category deleted')
    deletingCategory.value = null
    deleteError.value = null
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Unable to delete category'
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
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Communities
          </p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">
            Community Categories
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Organize communities into clear categories that make browsing and moderation easier.
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
      <form class="mx-auto max-w-2xl" @submit.prevent="createCategory">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <FolderPlus class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create category</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Add a focused label that communities can be grouped under.</p>
          </div>
        </div>

        <div class="mt-5">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
            <input
              v-model="name"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              placeholder="Sports"
              type="text"
            />
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

          <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-72">
            <Search class="h-4 w-4" />
            <input
              v-model="search"
              class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              placeholder="Search categories"
              type="search"
            />
          </label>
        </div>

        <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
          <Loader2 class="h-4 w-4 animate-spin" />
          Loading categories
        </div>

        <div v-else-if="error" class="p-4">
          <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {{ error }}
          </div>
        </div>

        <div v-else-if="filteredCategories.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
          <div>
            <p class="font-semibold text-[var(--text-primary)]">No categories found</p>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Create your first category or adjust your search.</p>
          </div>
        </div>

        <div v-else class="hidden overflow-x-auto md:block">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              <tr>
                <th class="px-4 py-3 font-semibold">Name</th>
                <th class="px-4 py-3 text-right font-semibold">Communities</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[color:var(--border-soft)]">
              <tr v-for="category in filteredCategories" :key="category.id">
                <td class="px-4 py-3 font-semibold text-[var(--text-primary)]">{{ category.name }}</td>
                <td class="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">{{ category.total_communities ?? 0 }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                      :aria-label="`Edit ${category.name}`"
                      :title="`Edit ${category.name}`"
                      @click="openEditModal(category)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600 hover:bg-red-50"
                      :aria-label="`Delete ${category.name}`"
                      :title="`Delete ${category.name}`"
                      @click="openDeleteModal(category)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loading && !error && filteredCategories.length > 0" class="space-y-3 p-4 md:hidden">
          <article
            v-for="category in filteredCategories"
            :key="category.id"
            class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"
          >
            <p class="font-semibold text-[var(--text-primary)]">{{ category.name }}</p>
            <div class="mt-3 flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-[var(--text-primary)]">
                {{ category.total_communities ?? 0 }} communities
              </p>
              <div class="flex shrink-0 gap-2">
                <button
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                  :aria-label="`Edit ${category.name}`"
                  :title="`Edit ${category.name}`"
                  @click="openEditModal(category)"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-600 hover:bg-red-50"
                  :aria-label="`Delete ${category.name}`"
                  :title="`Delete ${category.name}`"
                  @click="openDeleteModal(category)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        </div>
    </section>

    <div
      v-if="editingCategory"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-category-title"
      @click.self="closeEditModal"
    >
      <section class="w-full max-w-lg rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Communities
            </p>
            <h2 id="edit-category-title" class="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">
              Edit category
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

        <form class="mt-5 space-y-4" @submit.prevent="updateCategory">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Name</label>
            <input
              v-model="editName"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              type="text"
            />
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
      v-if="deletingCategory"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-title"
      @click.self="closeDeleteModal"
    >
      <section class="w-full max-w-md rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-red-600">
              Delete category
            </p>
            <h2 id="delete-category-title" class="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">
              {{ deletingCategory.name }}
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
          This will remove the category from the admin list. This action cannot be undone from this screen.
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
            @click="deleteCategory"
          >
            <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
            {{ deleting ? 'Deleting...' : 'Delete category' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
