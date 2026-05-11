<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Eye, FileText, Loader2, Plus, RefreshCw, Search, Send, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import { createPost, deletePost, listPosts, type Post, type PostMediaAsset } from '../../services'

const posts = ref<Post[]>([])
const search = ref('')
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
const viewingPost = ref<Post | null>(null)
const activePostTab = ref<'content' | 'media' | 'meta'>('content')
const postTabs = ['content', 'media', 'meta'] as const

const title = ref('')
const content = ref('')
const userId = ref('')
const communityId = ref('')
const pageId = ref('')
const mediaAssetIds = ref('')

const filteredPosts = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) return posts.value

  return posts.value.filter((post) => {
    return `${post.title} ${post.content} ${post.user?.name || ''} ${post.user?.email || ''}`.toLowerCase().includes(term)
  })
})

const postStats = computed(() => [
  { label: 'Total posts', value: total.value, detail: 'Across all pages', icon: FileText },
  { label: 'Loaded comments', value: posts.value.reduce((sum, post) => sum + post.comment_count, 0), detail: 'On this page', icon: Send },
  { label: 'Reported', value: posts.value.filter((post) => post.is_report).length, detail: 'On this page', icon: Trash2 },
])

function formatDate(value?: string | null) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function postAuthor(post: Post) {
  return post.user?.name || post.user?.email || 'Unknown author'
}

function parseMediaAssetIds() {
  return mediaAssetIds.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getPostMediaAssets(post: Post) {
  const seen = new Set<string>()
  const assets: PostMediaAsset[] = []

  for (const asset of [...post.media_path, ...post.file_path]) {
    const url = asset.url || asset.thumbnail_url
    const key = asset.id || url

    if (!url || !key || seen.has(key)) continue

    seen.add(key)
    assets.push(asset)
  }

  return assets.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
}

function isImageAsset(asset: PostMediaAsset) {
  return String(asset.media_type || '').toLowerCase().includes('image') || /\.(png|jpe?g|webp|gif|avif)$/i.test(asset.url || '')
}

async function fetchPosts() {
  loading.value = true
  error.value = null

  try {
    const response = await listPosts({
      page: page.value,
      per_page: perPage.value,
    })

    posts.value = response.data || []
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load posts'
    posts.value = []
  } finally {
    loading.value = false
  }
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchPosts()
}

function resetCreateForm() {
  title.value = ''
  content.value = ''
  userId.value = ''
  communityId.value = ''
  pageId.value = ''
  mediaAssetIds.value = ''
  formError.value = null
}

async function createNewPost() {
  formError.value = null

  if (!title.value.trim() || !content.value.trim()) {
    formError.value = 'Title and content are required'
    return
  }

  creating.value = true

  try {
    const mediaIds = parseMediaAssetIds()

    await createPost({
      userId: userId.value.trim() || undefined,
      communityId: communityId.value.trim() || null,
      pageId: pageId.value.trim() || undefined,
      title: title.value.trim(),
      content: content.value.trim(),
      mediaAssetIds: mediaIds.length ? mediaIds : undefined,
    })

    toast.success('Post created')
    resetCreateForm()
    showCreateForm.value = false
    page.value = 1
    await fetchPosts()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create post'
  } finally {
    creating.value = false
  }
}

async function removePost(post: Post) {
  deletingId.value = post.id

  try {
    await deletePost(post.id, post.user_id)
    toast.success('Post deleted')
    posts.value = posts.value.filter((item) => item.id !== post.id)
    total.value = Math.max(total.value - 1, 0)
    if (viewingPost.value?.id === post.id) viewingPost.value = null
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to delete post')
  } finally {
    deletingId.value = null
  }
}

function openPost(post: Post) {
  viewingPost.value = post
  activePostTab.value = 'content'
}

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Posts</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Manage Posts</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Review feed posts, create admin posts, inspect media, and remove posts with owner verification.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading" @click="fetchPosts">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="showCreateForm = !showCreateForm">
            <X v-if="showCreateForm" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ showCreateForm ? 'Close form' : 'New post' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-3xl" @submit.prevent="createNewPost">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <FileText class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create post</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Media asset IDs must already be processed before they are attached.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Title</label>
            <input v-model="title" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Hello world" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">User ID</label>
            <input v-model="userId" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Optional author override" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Community ID</label>
            <input v-model="communityId" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Optional" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Page ID</label>
            <input v-model="pageId" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Optional" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Media asset IDs</label>
            <input v-model="mediaAssetIds" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="asset-uuid-123, asset-uuid-456" />
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Content</label>
            <textarea v-model="content" class="min-h-36 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Hello world - this is a test post."></textarea>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ formError }}</p>

        <div class="mt-5 flex justify-end">
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            <Plus v-else class="h-4 w-4" />
            {{ creating ? 'Creating...' : 'Create post' }}
          </button>
        </div>
      </form>
    </section>

    <section class="min-w-0 overflow-hidden">
      <div class="app-scroll flex snap-x gap-4 overflow-x-auto pb-1">
        <article v-for="stat in postStats" :key="stat.label" class="min-h-36 min-w-[14rem] snap-start rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
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
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Posts</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} posts</p>
        </div>
        <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-80">
          <Search class="h-4 w-4" />
          <input v-model="search" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search loaded posts" type="search" />
        </label>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading posts
      </div>
      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
      </div>
      <div v-else-if="filteredPosts.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No posts found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create a post or adjust your search.</p>
        </div>
      </div>

      <div v-else class="app-scroll hidden max-w-full overflow-x-auto md:block">
        <table class="w-full min-w-[64rem] table-fixed text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="w-[34%] px-4 py-3 font-semibold">Post</th>
              <th class="w-[18%] px-4 py-3 font-semibold">Author</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Community</th>
              <th class="w-[12%] px-4 py-3 font-semibold">Engagement</th>
              <th class="w-[10%] px-4 py-3 font-semibold">Type</th>
              <th class="w-[12%] px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="post in filteredPosts" :key="post.id">
              <td class="px-4 py-3">
                <p class="truncate font-semibold text-[var(--text-primary)]">{{ post.title }}</p>
                <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ post.content }}</p>
              </td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ postAuthor(post) }}</td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ post.community?.name || 'No community' }}</td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">
                <div>{{ post.comment_count }} comments</div>
                <div class="mt-1 text-xs text-[var(--text-tertiary)]">{{ post.score }} score</div>
              </td>
              <td class="px-4 py-3">
                <StatusChip :tone="post.is_report ? 'danger' : 'muted'">{{ post.is_report ? 'Reported' : post.type }}</StatusChip>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :title="`View ${post.title}`" @click="openPost(post)">
                    <Eye class="h-4 w-4" />
                  </button>
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:border-red-400/20 dark:text-red-200 dark:hover:bg-red-400/10" :disabled="deletingId === post.id" :title="`Delete ${post.title}`" @click="removePost(post)">
                    <Loader2 v-if="deletingId === post.id" class="h-4 w-4 animate-spin" />
                    <Trash2 v-else class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && filteredPosts.length > 0" class="space-y-3 p-4 md:hidden">
        <article v-for="post in filteredPosts" :key="post.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-semibold text-[var(--text-primary)]">{{ post.title }}</p>
              <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ postAuthor(post) }}</p>
            </div>
            <StatusChip :tone="post.is_report ? 'danger' : 'muted'">{{ post.type }}</StatusChip>
          </div>
          <p class="mt-3 line-clamp-3 text-sm text-[var(--text-secondary)]">{{ post.content }}</p>
          <div class="mt-3 flex justify-end gap-2">
            <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)]" @click="openPost(post)">
              <Eye class="h-4 w-4" />
            </button>
            <button type="button" class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-red-200 text-red-700" :disabled="deletingId === post.id" @click="removePost(post)">
              <Trash2 class="h-4 w-4" />
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

    <div v-if="viewingPost" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="viewingPost = null">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Post details</p>
            <h2 class="mt-2 truncate font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingPost.title }}</h2>
            <p class="mt-1 truncate text-sm text-[var(--text-secondary)]">{{ postAuthor(viewingPost) }} / {{ formatDate(viewingPost.created_at) }}</p>
          </div>
          <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" @click="viewingPost = null">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="app-scroll mt-5 flex gap-2 overflow-x-auto border-b border-[color:var(--border-soft)] pb-2">
          <button v-for="tab in postTabs" :key="tab" type="button" class="h-9 shrink-0 rounded-[0.75rem] px-3 text-sm font-semibold capitalize text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]" :class="activePostTab === tab ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white' : ''" @click="activePostTab = tab">
            {{ tab }}
          </button>
        </div>

        <div v-if="activePostTab === 'content'" class="mt-5 space-y-4">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Content</p>
            <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">{{ viewingPost.content }}</p>
          </div>
        </div>

        <div v-else-if="activePostTab === 'media'" class="mt-5 space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Images</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingPost.images_count }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Media assets</p>
            <p class="mt-2 font-semibold text-[var(--text-primary)]">{{ viewingPost.media_path.length }}</p>
          </div>
          </div>

          <div v-if="getPostMediaAssets(viewingPost).length === 0" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
            No media assets are attached to this post.
          </div>

          <div v-else class="grid gap-3 sm:grid-cols-2">
            <a
              v-for="asset in getPostMediaAssets(viewingPost)"
              :key="asset.id || asset.url"
              :href="asset.url || asset.thumbnail_url"
              target="_blank"
              rel="noreferrer"
              class="overflow-hidden rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]"
            >
              <img
                v-if="isImageAsset(asset)"
                :src="asset.thumbnail_url || asset.url"
                :alt="String(asset.id || 'Post media')"
                class="aspect-video w-full object-cover"
              />
              <div v-else class="grid aspect-video place-items-center p-4 text-center text-sm text-[var(--text-secondary)]">
                {{ asset.url || asset.id || 'Media asset' }}
              </div>
              <div class="border-t border-[color:var(--border-soft)] p-3">
                <p class="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{{ asset.media_type || 'media' }}</p>
                <p class="mt-1 truncate font-mono text-xs text-[var(--text-secondary)]">{{ asset.id || asset.url }}</p>
              </div>
            </a>
          </div>
        </div>

        <div v-else class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Community</p>
            <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ viewingPost.community?.name || 'No community' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Flags</p>
            <p class="mt-2 text-sm text-[var(--text-secondary)]">Liked: {{ viewingPost.is_liked ? 'yes' : 'no' }} / Saved: {{ viewingPost.is_saved ? 'yes' : 'no' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3 sm:col-span-2">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">IDs</p>
            <p class="mt-2 break-all font-mono text-xs text-[var(--text-secondary)]">Post: {{ viewingPost.id }}</p>
            <p class="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">User: {{ viewingPost.user_id }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
