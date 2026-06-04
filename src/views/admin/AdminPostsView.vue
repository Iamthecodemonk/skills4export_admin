<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import {
  deletePost,
  deletePostComment,
  listPostComments,
  listPosts,
  updatePostCommentStatus,
  updatePostStatus,
  type Post,
  type PostComment,
  type PostMediaAsset,
} from '../../services'

type PostDetailTab = 'main' | 'moderate' | 'comments'
type ModerationAction = {
  label: string
  status: string
  tone?: 'danger' | 'success' | 'warning'
  icon: typeof CheckCircle2
}

const posts = ref<Post[]>([])
const search = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const lastPage = ref(1)
const from = ref<number | null>(null)
const to = ref<number | null>(null)
const loading = ref(false)
const deletingId = ref<string | null>(null)
const updatingPostId = ref<string | null>(null)
const updatingCommentId = ref<string | null>(null)
const error = ref<string | null>(null)
const viewingPost = ref<Post | null>(null)
const activePostTab = ref<PostDetailTab>('main')
const postTabs: Array<{ label: string; value: PostDetailTab; icon: typeof FileText }> = [
  { label: 'Main', value: 'main', icon: FileText },
  { label: 'Moderate', value: 'moderate', icon: ShieldCheck },
  { label: 'Comments', value: 'comments', icon: MessageSquareText },
]
const cardMediaIndex = ref<Record<string, number>>({})
const modalMediaIndex = ref(0)
const comments = ref<PostComment[]>([])
const commentsLoading = ref(false)
const commentsError = ref<string | null>(null)
const commentsLoadedPostId = ref<string | null>(null)

const filteredPosts = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) return posts.value

  return posts.value.filter((post) => {
    return `${post.title} ${post.content} ${post.user?.name || ''} ${post.user?.email || ''} ${post.community?.name || ''}`.toLowerCase().includes(term)
  })
})

const postStats = computed(() => [
  { label: 'Total posts', value: total.value, detail: 'Across all pages', icon: FileText },
  { label: 'Loaded comments', value: posts.value.reduce((sum, post) => sum + post.comment_count, 0), detail: 'On this page', icon: Send },
  { label: 'Reported', value: posts.value.filter((post) => post.is_report).length, detail: 'On this page', icon: Trash2 },
  { label: 'With media', value: posts.value.filter((post) => getPostMediaAssets(post).length > 0).length, detail: 'On this page', icon: ImageIcon },
])

const selectedPostMedia = computed(() => {
  if (!viewingPost.value) return []
  return getPostMediaAssets(viewingPost.value)
})

const selectedPostImage = computed(() => {
  const assets = selectedPostMedia.value
  if (!assets.length) return null
  return assets[Math.min(modalMediaIndex.value, assets.length - 1)]
})

function formatDate(value?: string | null) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatLabel(value?: string | null) {
  if (!value) return 'Not available'
  return value.replace(/[-_]/g, ' ')
}

function postAuthor(post: Post) {
  return post.user?.name || post.user?.email || 'Unknown author'
}

function commentAuthor(comment: PostComment) {
  return comment.user?.name || comment.user?.email || 'Unknown author'
}

function commentContent(comment: PostComment) {
  return String(comment.content || comment.body || 'No comment content')
}

function commentCreatedAt(comment: PostComment) {
  return comment.created_at || comment.createdAt || null
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

function getMediaIndex(post: Post) {
  const assets = getPostMediaAssets(post)
  if (!assets.length) return 0
  return Math.min(cardMediaIndex.value[post.id] ?? 0, assets.length - 1)
}

function setMediaIndex(post: Post, nextIndex: number) {
  const assets = getPostMediaAssets(post)
  if (!assets.length) return
  const normalized = (nextIndex + assets.length) % assets.length
  cardMediaIndex.value = { ...cardMediaIndex.value, [post.id]: normalized }
}

function postStatus(post: Post) {
  if (post.status) return post.status
  if (post.is_report) return 'reported'
  return post.type || 'active'
}

function statusTone(value?: string | null) {
  if (value === 'approved' || value === 'active' || value === 'live') return 'success'
  if (value === 'pending_review' || value === 'reported') return 'warning'
  if (value === 'suspended' || value === 'deleted') return 'danger'
  return 'muted'
}

function postModerationActions(post: Post): ModerationAction[] {
  const current = postStatus(post)
  const actions: ModerationAction[] = [
    { label: 'Approve', status: 'approved', tone: 'success', icon: CheckCircle2 },
    { label: 'Suspend', status: 'suspended', tone: 'warning', icon: Ban },
    { label: 'Unsuspend', status: 'active', tone: 'success', icon: ShieldCheck },
    { label: 'Delete', status: 'deleted', tone: 'danger', icon: Trash2 },
  ]

  return actions.filter((action) => action.status !== current)
}

function commentModerationActions(comment: PostComment): ModerationAction[] {
  const current = comment.status || (comment.is_report || comment.isReport ? 'reported' : 'active')
  const actions: ModerationAction[] = [
    { label: 'Approve', status: 'approved', tone: 'success', icon: CheckCircle2 },
    { label: 'Suspend', status: 'suspended', tone: 'warning', icon: Ban },
    { label: 'Unsuspend', status: 'active', tone: 'success', icon: ShieldCheck },
    { label: 'Delete', status: 'deleted', tone: 'danger', icon: Trash2 },
  ]

  return actions.filter((action) => action.status !== current)
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

async function changePostStatus(post: Post, nextStatus: string) {
  if (nextStatus === 'deleted') {
    await removePost(post)
    return
  }

  updatingPostId.value = post.id

  try {
    const response = await updatePostStatus(post.id, nextStatus)
    posts.value = posts.value.map((item) => item.id === post.id ? response.data : item)
    if (viewingPost.value?.id === post.id) viewingPost.value = response.data
    toast.success(`Post moved to ${formatLabel(nextStatus)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to update post')
  } finally {
    updatingPostId.value = null
  }
}

async function fetchComments(postId: string, force = false) {
  if (!force && commentsLoadedPostId.value === postId) return

  commentsLoading.value = true
  commentsError.value = null

  try {
    const response = await listPostComments(postId, { page: 1, per_page: 100 })
    comments.value = response.data || []
    commentsLoadedPostId.value = postId
  } catch (err) {
    comments.value = []
    commentsError.value = err instanceof Error ? err.message : 'Unable to load comments'
  } finally {
    commentsLoading.value = false
  }
}

async function changeCommentStatus(comment: PostComment, nextStatus: string) {
  if (!viewingPost.value) return

  updatingCommentId.value = comment.id

  try {
    if (nextStatus === 'deleted') {
      await deletePostComment(viewingPost.value.id, comment.id)
      comments.value = comments.value.filter((item) => item.id !== comment.id)
      toast.success('Comment deleted')
      return
    }

    const response = await updatePostCommentStatus(viewingPost.value.id, comment.id, nextStatus)
    comments.value = comments.value.map((item) => item.id === comment.id ? response.data : item)
    toast.success(`Comment moved to ${formatLabel(nextStatus)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to update comment')
  } finally {
    updatingCommentId.value = null
  }
}

function openPost(post: Post, tab: PostDetailTab = 'main') {
  viewingPost.value = post
  activePostTab.value = tab
  modalMediaIndex.value = 0
  comments.value = []
  commentsError.value = null
  commentsLoadedPostId.value = null

  if (tab === 'comments') {
    fetchComments(post.id)
  }
}

function selectTab(tab: PostDetailTab) {
  activePostTab.value = tab
  if (tab === 'comments' && viewingPost.value) {
    fetchComments(viewingPost.value.id)
  }
}

function closePost() {
  viewingPost.value = null
  comments.value = []
  commentsError.value = null
  commentsLoadedPostId.value = null
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
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Review post media, open full details, moderate posts, and manage comments.</p>
        </div>

        <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading" @click="fetchPosts">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
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
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Adjust your search or refresh the list.</p>
        </div>
      </div>

      <div v-else class="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="post in filteredPosts" :key="post.id" class="overflow-hidden rounded-[0.95rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
          <div class="relative aspect-[1.35/1] bg-[var(--surface-muted)]">
            <template v-if="getPostMediaAssets(post).length">
              <img
                v-if="isImageAsset(getPostMediaAssets(post)[getMediaIndex(post)])"
                :src="getPostMediaAssets(post)[getMediaIndex(post)].thumbnail_url || getPostMediaAssets(post)[getMediaIndex(post)].url"
                :alt="post.title"
                class="h-full w-full object-cover"
              />
              <div v-else class="grid h-full place-items-center p-4 text-center text-sm font-medium text-[var(--text-secondary)]">
                {{ getPostMediaAssets(post)[getMediaIndex(post)].media_type || 'Media asset' }}
              </div>

              <div class="absolute left-3 top-3">
                <StatusChip :tone="statusTone(postStatus(post))">{{ formatLabel(postStatus(post)) }}</StatusChip>
              </div>

              <div v-if="getPostMediaAssets(post).length > 1" class="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
                <button type="button" class="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-800 shadow-sm" title="Previous image" @click="setMediaIndex(post, getMediaIndex(post) - 1)">
                  <ChevronLeft class="h-4 w-4" />
                </button>
                <button type="button" class="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-800 shadow-sm" title="Next image" @click="setMediaIndex(post, getMediaIndex(post) + 1)">
                  <ChevronRight class="h-4 w-4" />
                </button>
              </div>

              <div v-if="getPostMediaAssets(post).length > 1" class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                <span v-for="asset in getPostMediaAssets(post)" :key="asset.id || asset.url" class="h-1.5 w-1.5 rounded-full bg-white/60" :class="getPostMediaAssets(post).indexOf(asset) === getMediaIndex(post) ? 'bg-white' : ''"></span>
              </div>
            </template>

            <div v-else class="grid h-full place-items-center text-[var(--text-tertiary)]">
              <ImageIcon class="h-10 w-10" />
            </div>
          </div>

          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="line-clamp-2 font-display text-base font-semibold leading-5 text-[var(--text-primary)]">{{ post.title }}</h3>
                <p class="mt-2 truncate text-sm text-[var(--text-secondary)]">{{ postAuthor(post) }}</p>
              </div>
              <StatusChip :tone="post.is_report ? 'danger' : 'muted'">{{ post.is_report ? 'Reported' : post.type }}</StatusChip>
            </div>

            <p class="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--text-secondary)]">{{ post.content }}</p>

            <div class="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--border-soft)] pt-3">
              <div class="text-xs text-[var(--text-tertiary)]">
                <p>{{ formatDate(post.created_at) }}</p>
                <p class="mt-1">{{ post.comment_count }} comments / {{ post.score }} score</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" @click="openPost(post)">
                <Eye class="h-4 w-4" />
                Read more
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

    <div v-if="viewingPost" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="closePost">
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
        <div class="relative bg-[var(--surface-muted)]">
          <div class="aspect-[2.2/1] max-h-[22rem]">
            <img
              v-if="selectedPostImage && isImageAsset(selectedPostImage)"
              :src="selectedPostImage.thumbnail_url || selectedPostImage.url"
              :alt="viewingPost.title"
              class="h-full w-full object-cover"
            />
            <div v-else class="grid h-full place-items-center text-[var(--text-tertiary)]">
              <ImageIcon class="h-14 w-14" />
            </div>
          </div>

          <div class="absolute left-4 top-4">
            <StatusChip :tone="statusTone(postStatus(viewingPost))">{{ formatLabel(postStatus(viewingPost)) }}</StatusChip>
          </div>

          <button type="button" class="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-[0.75rem] bg-white/90 text-slate-800 shadow-sm" title="Close" @click="closePost">
            <X class="h-4 w-4" />
          </button>

          <div v-if="selectedPostMedia.length > 1" class="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
            <button type="button" class="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-800 shadow-sm" title="Previous image" @click="modalMediaIndex = (modalMediaIndex - 1 + selectedPostMedia.length) % selectedPostMedia.length">
              <ChevronLeft class="h-4 w-4" />
            </button>
            <button type="button" class="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-800 shadow-sm" title="Next image" @click="modalMediaIndex = (modalMediaIndex + 1) % selectedPostMedia.length">
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="p-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Post details</p>
              <h2 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ viewingPost.title }}</h2>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ postAuthor(viewingPost) }} / {{ formatDate(viewingPost.created_at) }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <StatusChip tone="muted">{{ viewingPost.comment_count }} comments</StatusChip>
              <StatusChip tone="accent">{{ viewingPost.score }} score</StatusChip>
            </div>
          </div>

          <div class="app-scroll mt-5 flex gap-2 overflow-x-auto border-b border-[color:var(--border-soft)] pb-2">
            <button
              v-for="tab in postTabs"
              :key="tab.value"
              type="button"
              class="inline-flex h-9 shrink-0 items-center gap-2 rounded-[0.75rem] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
              :class="activePostTab === tab.value ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:text-white' : ''"
              @click="selectTab(tab.value)"
            >
              <component :is="tab.icon" class="h-4 w-4" />
              {{ tab.label }}
            </button>
          </div>

          <div v-if="activePostTab === 'main'" class="mt-5 space-y-4">
            <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
              <p class="text-sm font-semibold text-[var(--text-primary)]">Description</p>
              <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">{{ viewingPost.content }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Author</p>
                <p class="mt-2 text-sm font-semibold text-[var(--text-primary)]">{{ postAuthor(viewingPost) }}</p>
                <p class="mt-1 break-all text-xs text-[var(--text-secondary)]">{{ viewingPost.user?.email || viewingPost.user_id }}</p>
              </div>
              <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Community</p>
                <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ viewingPost.community?.name || 'No community' }}</p>
              </div>
              <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Visibility</p>
                <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ formatLabel(viewingPost.visibility) }}</p>
              </div>
              <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Media</p>
                <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ selectedPostMedia.length }} assets / {{ viewingPost.images_count }} images</p>
              </div>
              <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Created</p>
                <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ formatDate(viewingPost.created_at) }}</p>
              </div>
              <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Flags</p>
                <p class="mt-2 text-sm text-[var(--text-secondary)]">Liked: {{ viewingPost.is_liked ? 'yes' : 'no' }} / Saved: {{ viewingPost.is_saved ? 'yes' : 'no' }}</p>
              </div>
            </div>

            <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">IDs</p>
              <p class="mt-2 break-all font-mono text-xs text-[var(--text-secondary)]">Post: {{ viewingPost.id }}</p>
              <p class="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">User: {{ viewingPost.user_id }}</p>
              <p class="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">Community: {{ viewingPost.community_id || 'none' }}</p>
            </div>
          </div>

          <div v-else-if="activePostTab === 'moderate'" class="mt-5 space-y-4">
            <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-4">
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p class="font-semibold text-[var(--text-primary)]">Post moderation</p>
                  <p class="mt-1 text-sm text-[var(--text-secondary)]">Approve, suspend, unsuspend, or delete this post.</p>
                </div>
                <StatusChip :tone="statusTone(postStatus(viewingPost))">{{ formatLabel(postStatus(viewingPost)) }}</StatusChip>
              </div>

              <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  v-for="action in postModerationActions(viewingPost)"
                  :key="action.status"
                  type="button"
                  class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] border px-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
                  :class="action.tone === 'danger' ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:text-red-200 dark:hover:bg-red-400/10' : action.tone === 'success' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-200 dark:hover:bg-emerald-400/10' : 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10'"
                  :disabled="updatingPostId === viewingPost.id || deletingId === viewingPost.id"
                  @click="changePostStatus(viewingPost, action.status)"
                >
                  <Loader2 v-if="updatingPostId === viewingPost.id || (deletingId === viewingPost.id && action.status === 'deleted')" class="h-4 w-4 animate-spin" />
                  <component :is="action.icon" v-else class="h-4 w-4" />
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>

          <div v-else class="mt-5 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-semibold text-[var(--text-primary)]">Comments</p>
                <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ comments.length }} loaded comments for this post.</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-60" :disabled="commentsLoading" @click="fetchComments(viewingPost.id, true)">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': commentsLoading }" />
                Refresh
              </button>
            </div>

            <div v-if="commentsLoading" class="flex min-h-32 items-center justify-center gap-2 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] text-sm text-[var(--text-secondary)]">
              <Loader2 class="h-4 w-4 animate-spin" />
              Loading comments
            </div>

            <div v-else-if="commentsError" class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
              {{ commentsError }}
            </div>

            <div v-else-if="comments.length === 0" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
              No comments loaded for this post.
            </div>

            <div v-else class="space-y-3">
              <article v-for="comment in comments" :key="comment.id" class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-semibold text-[var(--text-primary)]">{{ commentAuthor(comment) }}</p>
                      <StatusChip :tone="statusTone(comment.status || (comment.is_report || comment.isReport ? 'reported' : 'active'))">{{ formatLabel(comment.status || (comment.is_report || comment.isReport ? 'reported' : 'active')) }}</StatusChip>
                    </div>
                    <p class="mt-1 text-xs text-[var(--text-tertiary)]">{{ formatDate(commentCreatedAt(comment)) }}</p>
                    <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">{{ commentContent(comment) }}</p>
                  </div>

                  <div class="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-72">
                    <button
                      v-for="action in commentModerationActions(comment)"
                      :key="action.status"
                      type="button"
                      class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] border px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-60"
                      :class="action.tone === 'danger' ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:text-red-200 dark:hover:bg-red-400/10' : action.tone === 'success' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-200 dark:hover:bg-emerald-400/10' : 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10'"
                      :disabled="updatingCommentId === comment.id"
                      @click="changeCommentStatus(comment, action.status)"
                    >
                      <Loader2 v-if="updatingCommentId === comment.id" class="h-3.5 w-3.5 animate-spin" />
                      <component :is="action.icon" v-else class="h-3.5 w-3.5" />
                      {{ action.label }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
