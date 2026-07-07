<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  Ban,
  BarChart3,
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
import { apiRequest } from '../../composables/useApi'
import { REPORT_REASONS } from '../../constants/reportReasons'
import {
  deletePost,
  deletePostComment,
  listAdminPosts,
  listPostComments,
  reportPost,
  reportPostComment,
  updatePostCommentStatus,
  updatePostStatus,
  type Post,
  type PostComment,
  type PostMediaAsset,
} from '../../services'

type PostDetailTab = 'main' | 'moderate' | 'report' | 'comments'
type ModerationAction = {
  label: string
  status: string
  tone?: 'danger' | 'success' | 'warning'
  icon: typeof CheckCircle2
}

type ReportedPostWrapper = {
  id: string
  targetId?: string
  primaryReportId?: string
  moderation_status?: string | null
  status?: string | null
  target?: Post
  data?: Post
  reports_count?: number
  reports?: unknown[]
}

type ReportedPostsResponse = {
  data: ReportedPostWrapper[]
  total?: number
  from?: number | null
  to?: number | null
  last_page?: number
  per_page?: number
}

const reportStatusBuckets = ['', 'reported', 'pending_review', 'approved', 'active', 'suspended', 'deleted']

const props = withDefaults(defineProps<{
  reportedOnly?: boolean
  deletedOnly?: boolean
  pageTitle?: string
  pageDescription?: string
}>(), {
  reportedOnly: false,
  deletedOnly: false,
  pageTitle: 'Manage Posts',
  pageDescription: 'Review post media, open full details, moderate posts, and manage comments.',
})

const posts = ref<Post[]>([])
const search = ref('')
const statusFilter = ref(props.deletedOnly ? 'deleted' : '')
const sortFilter = ref<'latest' | 'oldest' | 'middle'>('latest')
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
const reportingPostId = ref<string | null>(null)
const reportingCommentId = ref<string | null>(null)
const selectedReportReason = ref(REPORT_REASONS[0])
const reportDetails = ref('')
const error = ref<string | null>(null)
const viewingPost = ref<Post | null>(null)
const showingStats = ref(false)
const activePostTab = ref<PostDetailTab>('main')
const postTabs: Array<{ label: string; value: PostDetailTab; icon: typeof FileText }> = [
  { label: 'Main', value: 'main', icon: FileText },
  { label: 'Moderate', value: 'moderate', icon: ShieldCheck },
  { label: 'Report', value: 'report', icon: AlertTriangle },
  { label: 'Comments', value: 'comments', icon: MessageSquareText },
]
const cardMediaIndex = ref<Record<string, number>>({})
const modalMediaIndex = ref(0)
const comments = ref<PostComment[]>([])
const commentsLoading = ref(false)
const commentsError = ref<string | null>(null)
const commentsLoadedPostId = ref<string | null>(null)

const statusFilterOptions = computed(() => {
  if (props.deletedOnly) {
    return [{ label: 'Deleted', value: 'deleted' }]
  }

  return [
    { label: 'All statuses', value: '' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Unsuspended', value: 'active' },
    { label: 'Approved', value: 'approved' },
  ]
})

const sortFilterOptions: Array<{ label: string; value: 'latest' | 'oldest' | 'middle' }> = [
  { label: 'Latest posts', value: 'latest' },
  { label: 'Oldest posts', value: 'oldest' },
  { label: 'Middle posts', value: 'middle' },
]

const filteredPosts = computed(() => {
  const term = search.value.trim().toLowerCase()
  const status = statusFilter.value

  const sourcePosts = props.reportedOnly
    ? posts.value.filter((post) => shouldShowReportedBadge(post))
    : posts.value.filter((post) => props.deletedOnly ? isDeletedPost(post) : !isDeletedPost(post))

  const searched = sourcePosts.filter((post) => {
    const matchesSearch = !term || `${post.title} ${post.content} ${post.user?.name || ''} ${post.user?.email || ''} ${post.community?.name || ''}`.toLowerCase().includes(term)
    const matchesStatus = !status || postStatus(post) === status

    return matchesSearch && matchesStatus
  })

  const sorted = [...searched].sort((a, b) => {
    const first = new Date(a.created_at).getTime()
    const second = new Date(b.created_at).getTime()
    return sortFilter.value === 'oldest' ? first - second : second - first
  })

  if (sortFilter.value !== 'middle' || sorted.length < 3) return sorted

  const middleIndex = Math.floor(sorted.length / 2)
  return [
    sorted[middleIndex],
    ...sorted.slice(0, middleIndex).reverse(),
    ...sorted.slice(middleIndex + 1),
  ]
})

const postStats = computed(() => [
  { label: 'Total posts', value: total.value, detail: 'Across all pages', icon: FileText },
  { label: 'Loaded comments', value: posts.value.reduce((sum, post) => sum + post.comment_count, 0), detail: 'On this page', icon: Send },
  { label: 'Reported', value: posts.value.filter((post) => post.is_report).length, detail: 'On this page', icon: Trash2 },
  { label: 'With media', value: posts.value.filter((post) => getPostMediaAssets(post).length > 0).length, detail: 'On this page', icon: ImageIcon },
])

function reportedPostFromWrapper(item: ReportedPostWrapper): Post | null {
  const post = item.target || item.data
  if (!post) return null
  const targetStatus = post.moderation_status || post.status
  const reportStatus = item.moderation_status || item.status
  const resolvedTargetStatus = targetStatus === 'approved' || targetStatus === 'deleted' ? targetStatus : null

  return {
    ...post,
    id: item.targetId || post.id || item.id,
    status: resolvedTargetStatus || reportStatus || targetStatus,
    moderation_status: resolvedTargetStatus || reportStatus || targetStatus,
    is_report: true,
  }
}

async function fetchReportedPostRows() {
  const responses = await Promise.allSettled(reportStatusBuckets.map((status) => {
    const search = new URLSearchParams({
      page: String(page.value),
      per_page: String(perPage.value),
    })

    if (status) search.set('status', status)

    return apiRequest<ReportedPostsResponse>(`/api/admin/reports/posts?${search.toString()}`)
  }))

  const rows = responses.flatMap((response) => response.status === 'fulfilled' ? response.value.data || [] : [])
  const uniqueRows = Array.from(new Map(rows.map((row) => [row.targetId || row.target?.id || row.data?.id || row.id, row])).values())

  return uniqueRows
}

const selectedPostMedia = computed(() => {
  if (!viewingPost.value) return []
  return getPostMediaAssets(viewingPost.value)
})

const selectedPostImage = computed(() => {
  const assets = selectedPostMedia.value
  if (!assets.length) return null
  return assets[Math.min(modalMediaIndex.value, assets.length - 1)]
})

const visiblePostTabs = computed(() => {
  return props.reportedOnly ? postTabs.filter((tab) => tab.value !== 'report') : postTabs
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

function stripHtml(value?: string | null) {
  if (!value) return ''
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeHtml(value?: string | null) {
  if (!value) return '<p>No description available.</p>'

  const parser = new DOMParser()
  const document = parser.parseFromString(value, 'text/html')
  const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'])
  const allowedAttributes = new Set(['href', 'target', 'rel'])

  document.querySelectorAll('script, style, iframe, object, embed, form, input, button').forEach((node) => node.remove())

  Array.from(document.body.querySelectorAll('*')).forEach((element) => {
    const tag = element.tagName.toLowerCase()

    if (!allowedTags.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes))
      return
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      const isUnsafeHref = name === 'href' && (value.startsWith('javascript:') || value.startsWith('data:'))

      if (!allowedAttributes.has(name) || isUnsafeHref) {
        element.removeAttribute(attribute.name)
      }
    })

    if (tag === 'a') {
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noreferrer')
    }
  })

  return document.body.innerHTML || `<p>${stripHtml(value)}</p>`
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
  if (post.moderation_status) return post.moderation_status
  if (post.status) return post.status
  if (post.is_report) return 'reported'
  return post.type || 'active'
}

function isDeletedPost(post: Post) {
  const meta = post as Post & { deleted_at?: string | null; deletedAt?: string | null; is_deleted?: boolean | number; isDeleted?: boolean | number }
  return postStatus(post) === 'deleted' || Boolean(meta.deleted_at || meta.deletedAt || meta.is_deleted || meta.isDeleted)
}

function isApprovedPost(post: Post) {
  return postStatus(post) === 'approved'
}

function shouldShowReportedBadge(post: Post) {
  return Boolean(post.is_report) && !isDeletedPost(post) && !isApprovedPost(post)
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
    { label: 'Delete', status: 'deleted', tone: 'danger', icon: Trash2 },
  ]

  if (current === 'suspended') {
    actions.splice(1, 0, { label: 'Unsuspend', status: 'active', tone: 'success', icon: ShieldCheck })
  } else {
    actions.splice(1, 0, { label: 'Suspend', status: 'suspended', tone: 'warning', icon: Ban })
  }

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
    if (props.reportedOnly) {
      const rows = await fetchReportedPostRows()
      const unresolvedReportedPosts = rows
        .map(reportedPostFromWrapper)
        .filter((post): post is Post => Boolean(post))
        .filter(shouldShowReportedBadge)

      posts.value = unresolvedReportedPosts
      total.value = unresolvedReportedPosts.length
      lastPage.value = 1
      from.value = unresolvedReportedPosts.length ? 1 : null
      to.value = unresolvedReportedPosts.length || null
      return
    }

    const [response, reportedRows] = await Promise.all([
      listAdminPosts({
        page: page.value,
        per_page: perPage.value,
        status: props.deletedOnly ? 'deleted' : 'approved,pending_review,active,suspended',
      }),
      fetchReportedPostRows().catch(() => []),
    ])

    const reportedPosts = reportedRows.map(reportedPostFromWrapper).filter((post): post is Post => Boolean(post))
    const reportedPostIds = new Set(reportedPosts.filter(shouldShowReportedBadge).map((post) => post.id))

    posts.value = (response.data || []).map((post) => ({
      ...post,
      is_report: reportedPostIds.has(post.id),
    }))
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
  if (props.reportedOnly) {
    const action = nextStatus === 'approved'
      ? 'approve'
      : nextStatus === 'suspended'
        ? 'suspend'
        : nextStatus === 'deleted'
          ? 'delete'
          : 'unsuspend'

    updatingPostId.value = post.id

    try {
      await apiRequest(`/api/admin/reports/posts/${post.id}/${action}`, {
        method: 'POST',
      })

      if (nextStatus === 'deleted') {
        posts.value = posts.value.filter((item) => item.id !== post.id)
        total.value = Math.max(total.value - 1, 0)
        if (viewingPost.value?.id === post.id) viewingPost.value = null
      } else {
        const updatedPost = { ...post, status: nextStatus, moderation_status: nextStatus }
        posts.value = posts.value.map((item) => item.id === post.id ? updatedPost : item)
        if (viewingPost.value?.id === post.id) viewingPost.value = updatedPost
      }

      toast.success(`Post moved to ${formatLabel(nextStatus)}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to moderate reported post')
    } finally {
      updatingPostId.value = null
    }
    return
  }

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

async function submitPostReport(post: Post) {
  reportingPostId.value = post.id

  try {
    await reportPost(post.id, {
      reason: selectedReportReason.value,
      details: reportDetails.value.trim() || 'Flagged by an admin from the Manage Posts detail modal.',
    })
    posts.value = posts.value.map((item) => item.id === post.id ? { ...item, is_report: true } : item)
    if (viewingPost.value?.id === post.id) viewingPost.value = { ...viewingPost.value, is_report: true }
    toast.success('Post reported')
    selectedReportReason.value = REPORT_REASONS[0]
    reportDetails.value = ''
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to report post')
  } finally {
    reportingPostId.value = null
  }
}

async function submitCommentReport(comment: PostComment) {
  reportingCommentId.value = comment.id

  try {
    await reportPostComment(comment.id, {
      reason: selectedReportReason.value,
      details: reportDetails.value.trim() || 'Flagged by an admin from the post comments tab.',
    })
    comments.value = comments.value.map((item) => item.id === comment.id ? { ...item, is_report: true, isReport: true } : item)
    toast.success('Comment reported')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Unable to report comment')
  } finally {
    reportingCommentId.value = null
  }
}

function openPost(post: Post, tab: PostDetailTab = 'main') {
  viewingPost.value = post
  activePostTab.value = props.reportedOnly && tab === 'report' ? 'main' : tab
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

watch(() => props.reportedOnly, () => {
  page.value = 1
  search.value = ''
  statusFilter.value = ''
  viewingPost.value = null
  activePostTab.value = 'main'
  fetchPosts()
})

watch(() => props.deletedOnly, () => {
  page.value = 1
  search.value = ''
  statusFilter.value = props.deletedOnly ? 'deleted' : ''
  viewingPost.value = null
  activePostTab.value = 'main'
  fetchPosts()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{{ reportedOnly ? 'Reports' : 'Posts' }}</p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{{ pageTitle }}</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{{ pageDescription }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]" @click="showingStats = true">
            <BarChart3 class="h-4 w-4" />
            Stats
          </button>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:opacity-60" :disabled="loading" @click="fetchPosts">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
        </div>
      </div>
    </section>

    <section class="min-w-0 overflow-hidden rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Posts</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} {{ reportedOnly ? 'reported posts' : 'posts' }}</p>
        </div>
        <div class="grid gap-2 md:w-[42rem] md:grid-cols-[1fr_12rem_12rem]">
          <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)]">
            <Search class="h-4 w-4" />
            <input v-model="search" class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="Search loaded posts" type="search" />
          </label>
          <select v-model="statusFilter" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm font-semibold text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]">
            <option v-for="option in statusFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <select v-model="sortFilter" class="h-10 rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm font-semibold text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]">
            <option v-for="option in sortFilterOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
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
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ reportedOnly ? 'No reported posts are loaded.' : 'Adjust your search or refresh the list.' }}</p>
        </div>
      </div>

      <div v-else class="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <article v-for="post in filteredPosts" :key="post.id" class="overflow-hidden rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)]">
          <div class="relative aspect-[1.55/1] bg-[var(--surface-muted)]">
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

          <div class="p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="line-clamp-2 font-display text-sm font-semibold leading-5 text-[var(--text-primary)]">{{ post.title }}</h3>
                <p class="mt-1 truncate text-xs text-[var(--text-secondary)]">{{ postAuthor(post) }}</p>
              </div>
              <StatusChip :tone="shouldShowReportedBadge(post) ? 'danger' : 'muted'">{{ shouldShowReportedBadge(post) ? 'Reported' : post.type }}</StatusChip>
            </div>

            <p class="mt-2 line-clamp-2 min-h-9 text-xs leading-5 text-[var(--text-secondary)]">{{ stripHtml(post.content) }}</p>

            <div class="mt-3 flex items-center justify-between gap-3 border-t border-[color:var(--border-soft)] pt-3">
              <div class="text-xs text-[var(--text-tertiary)]">
                <p>{{ formatDate(post.created_at) }}</p>
                <p class="mt-1">{{ post.comment_count }} comments / {{ post.score }} score</p>
              </div>
              <button type="button" class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.7rem] bg-[var(--accent)] px-2.5 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]" @click="openPost(post)">
                <Eye class="h-4 w-4" />
                {{ reportedOnly ? 'View details' : 'Read more' }}
              </button>
            </div>

            <div v-if="reportedOnly" class="mt-3 flex flex-wrap gap-2 border-t border-[color:var(--border-soft)] pt-3">
              <button
                v-for="action in postModerationActions(post)"
                :key="action.status"
                type="button"
                class="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[0.7rem] border px-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-60"
                :class="action.tone === 'danger' ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:text-red-200 dark:hover:bg-red-400/10' : action.tone === 'success' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-200 dark:hover:bg-emerald-400/10' : 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10'"
                :disabled="updatingPostId === post.id || deletingId === post.id"
                @click="changePostStatus(post, action.status)"
              >
                <component :is="action.icon" class="h-3.5 w-3.5" />
                {{ action.label }}
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
              v-for="tab in visiblePostTabs"
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
              <div class="post-content mt-2 break-words text-sm leading-6 text-[var(--text-secondary)]" v-html="sanitizeHtml(viewingPost.content)"></div>
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

          <div v-else-if="activePostTab === 'report'" class="mt-5 space-y-4">
            <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-4 text-[var(--text-primary)]">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="font-semibold">Submit a report</p>
                  <p class="mt-1 text-sm text-[var(--text-secondary)]">Choose the rule that applies to this post.</p>
                </div>
                <StatusChip tone="warning">{{ selectedReportReason }}</StatusChip>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-for="reason in REPORT_REASONS"
                  :key="reason"
                  type="button"
                  class="min-h-9 rounded-[0.75rem] border px-3 py-1.5 text-sm font-semibold"
                  :class="selectedReportReason === reason ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'border-[color:var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--accent-strong)]'"
                  @click="selectedReportReason = reason"
                >
                  {{ reason }}
                </button>
              </div>

              <label class="mt-4 block">
                <span class="mb-2 block text-sm font-semibold">Details</span>
                <textarea
                  v-model="reportDetails"
                  class="min-h-24 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-strong)]"
                  placeholder="Add context for moderators"
                ></textarea>
              </label>

              <div class="mt-4 flex justify-end">
                <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[var(--accent-soft)] px-3 text-sm font-semibold text-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60" :disabled="reportingPostId === viewingPost.id" @click="submitPostReport(viewingPost)">
                  <Loader2 v-if="reportingPostId === viewingPost.id" class="h-4 w-4 animate-spin" />
                  <AlertTriangle v-else class="h-4 w-4" />
                  Report post
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

            <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-4 text-[var(--text-primary)]">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="font-semibold">Comment report reason</p>
                  <p class="mt-1 text-sm text-[var(--text-secondary)]">Choose the rule before reporting a comment.</p>
                </div>
                <StatusChip tone="warning">{{ selectedReportReason }}</StatusChip>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-for="reason in REPORT_REASONS"
                  :key="`comment-${reason}`"
                  type="button"
                  class="min-h-9 rounded-[0.75rem] border px-3 py-1.5 text-sm font-semibold"
                  :class="selectedReportReason === reason ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'border-[color:var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--accent-strong)]'"
                  @click="selectedReportReason = reason"
                >
                  {{ reason }}
                </button>
              </div>

              <label class="mt-4 block">
                <span class="mb-2 block text-sm font-semibold">Details</span>
                <textarea
                  v-model="reportDetails"
                  class="min-h-20 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-strong)]"
                  placeholder="Add context for the comment report"
                ></textarea>
              </label>
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
                      type="button"
                      class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.75rem] border border-amber-200 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10"
                      :disabled="reportingCommentId === comment.id"
                      @click="submitCommentReport(comment)"
                    >
                      <Loader2 v-if="reportingCommentId === comment.id" class="h-3.5 w-3.5 animate-spin" />
                      <AlertTriangle v-else class="h-3.5 w-3.5" />
                      Report
                    </button>
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

    <div v-if="showingStats" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6" role="dialog" aria-modal="true" @click.self="showingStats = false">
      <section class="w-full max-w-3xl rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Posts</p>
            <h2 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Post stats</h2>
          </div>
          <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]" title="Close stats" @click="showingStats = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <article v-for="stat in postStats" :key="stat.label" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-4">
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
    </div>
  </div>
</template>
