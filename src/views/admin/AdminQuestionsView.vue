<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CircleHelp, Eye, Lock, Loader2, MessageSquareText, Plus, RefreshCw, Search, Unlock, Users, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { apiRequest } from '../../composables/useApi'
import StatusChip from '../../components/StatusChip.vue'

type Community = {
  id: string
  name: string
}

type Question = {
  id: string
  userId: string
  communityId: string | null
  title: string
  body: string
  visibility: 'public' | 'community_only' | 'community_public' | string
  isClosed: boolean
  acceptedAnswerId: string | null
  createdAt: string
  updatedAt: string
  asker: {
    id: string
    name?: string | null
    email?: string | null
  } | null
  community: {
    id: string
    name?: string | null
    description?: string | null
  } | null
  totalAnswers: number
  totalAnswerers: number
  answers: Array<{
    id: string
    content: string
    createdAt: string
    user?: {
      id: string
      name?: string | null
      email?: string | null
    } | null
  }> | null
}

type ListQuestionsResponse = {
  current_page: number
  data: Question[]
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

type CreateQuestionResponse = {
  success: boolean
  data: Question
}

type ListCommunitiesResponse = {
  data: Community[]
}

const questions = ref<Question[]>([])
const communities = ref<Community[]>([])
const search = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const lastPage = ref(1)
const from = ref<number | null>(null)
const to = ref<number | null>(null)
const loading = ref(false)
const creating = ref(false)
const communitiesLoading = ref(false)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const showCreateForm = ref(false)
const viewingQuestion = ref<Question | null>(null)

const title = ref('')
const body = ref('')
const communityId = ref('')
const visibility = ref<'public' | 'community_only' | 'community_public'>('public')

const filteredQuestions = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) {
    return questions.value
  }

  return questions.value.filter((question) => {
    return `${question.title} ${question.body} ${question.asker?.name || ''} ${question.asker?.email || ''}`.toLowerCase().includes(term)
  })
})

const questionStats = computed(() => [
  {
    label: 'Total questions',
    value: total.value,
    detail: 'Across all pages',
    icon: CircleHelp,
  },
  {
    label: 'With answers',
    value: questions.value.filter((question) => question.totalAnswers > 0).length,
    detail: 'On this page',
    icon: MessageSquareText,
  },
  {
    label: 'In communities',
    value: questions.value.filter((question) => question.communityId || question.community).length,
    detail: 'On this page',
    icon: Users,
  },
  {
    label: 'Open questions',
    value: questions.value.filter((question) => !question.isClosed).length,
    detail: 'On this page',
    icon: Unlock,
  },
  {
    label: 'Closed questions',
    value: questions.value.filter((question) => question.isClosed).length,
    detail: 'On this page',
    icon: Lock,
  },
])

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

function formatVisibility(value: string) {
  return value.replace(/_/g, ' ')
}

function getAskerName(question: Question) {
  return question.asker?.name || question.asker?.email || 'Unknown asker'
}

function buildQuestionsPath() {
  const params = new URLSearchParams({
    page: String(page.value),
    per_page: String(perPage.value),
  })

  return `/api/questions?${params.toString()}`
}

async function fetchCommunities() {
  communitiesLoading.value = true

  try {
    const response = await apiRequest<ListCommunitiesResponse>('/api/communities?per_page=100')
    communities.value = Array.isArray(response.data) ? response.data : []
  } catch {
    communities.value = []
  } finally {
    communitiesLoading.value = false
  }
}

async function fetchQuestions() {
  loading.value = true
  error.value = null

  try {
    const response = await apiRequest<ListQuestionsResponse>(buildQuestionsPath())
    questions.value = response.data || []
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load questions'
  } finally {
    loading.value = false
  }
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchQuestions()
}

async function createQuestion() {
  formError.value = null

  if (!title.value.trim() || !body.value.trim()) {
    formError.value = 'Title and body are required'
    return
  }

  creating.value = true

  try {
    await apiRequest<CreateQuestionResponse>('/api/questions', {
      method: 'POST',
      body: JSON.stringify({
        communityId: communityId.value || null,
        title: title.value.trim(),
        body: body.value.trim(),
        visibility: visibility.value,
      }),
    })

    toast.success('Question created')
    title.value = ''
    body.value = ''
    communityId.value = ''
    visibility.value = 'public'
    showCreateForm.value = false
    page.value = 1
    await fetchQuestions()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create question'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchCommunities()
  fetchQuestions()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Questions
          </p>
          <h1 class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">Manage Questions</h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Review platform questions, create admin-seeded questions, and inspect answers at a glance.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="fetchQuestions"
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
            {{ showCreateForm ? 'Close form' : 'New question' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="showCreateForm" class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-3xl" @submit.prevent="createQuestion">
        <div>
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create question</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Attach it to a community when the question belongs in a specific group.</p>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Title</label>
            <input
              v-model="title"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              placeholder="How do I configure X?"
              type="text"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Community</label>
            <select
              v-model="communityId"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              :disabled="communitiesLoading"
            >
              <option value="">No community</option>
              <option v-for="community in communities" :key="community.id" :value="community.id">
                {{ community.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Visibility</label>
            <select
              v-model="visibility"
              class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
            >
              <option value="public">Public</option>
              <option value="community_only">Community only</option>
              <option value="community_public">Community public</option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Body</label>
            <textarea
              v-model="body"
              class="min-h-32 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]"
              placeholder="I tried Y but get error Z"
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
            {{ creating ? 'Creating...' : 'Create question' }}
          </button>
        </div>
      </form>
    </section>

    <section class="min-w-0 overflow-hidden">
      <div class="app-scroll flex snap-x gap-4 overflow-x-auto pb-1">
        <article
          v-for="stat in questionStats"
          :key="stat.label"
          class="question-stat-card relative min-h-40 min-w-[15rem] snap-start overflow-hidden rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-5"
        >
          <div class="question-stat-icon" aria-hidden="true">
            <span></span>
            <span>
              <component :is="stat.icon" class="h-5 w-5" />
            </span>
          </div>
          <p class="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{{ stat.label }}</p>
          <p class="mt-6 font-display text-3xl font-semibold leading-none text-[var(--text-primary)]">{{ stat.value }}</p>
          <p class="mt-4 max-w-[11rem] text-sm leading-6 text-[var(--text-secondary)]">{{ stat.detail }}</p>
        </article>
      </div>
    </section>

    <section class="min-w-0 overflow-hidden rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Questions</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} questions</p>
        </div>

        <label class="flex h-10 items-center gap-2 rounded-[0.85rem] bg-[var(--search-bg)] px-3 text-[var(--text-tertiary)] md:w-80">
          <Search class="h-4 w-4" />
          <input
            v-model="search"
            class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            placeholder="Search loaded questions"
            type="search"
          />
        </label>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading questions
      </div>

      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {{ error }}
        </div>
      </div>

      <div v-else-if="filteredQuestions.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No questions found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create a question or adjust your search.</p>
        </div>
      </div>

      <div v-else class="app-scroll hidden max-w-full overflow-x-auto md:block">
        <table class="min-w-[58rem] table-fixed text-left text-sm">
          <thead class="border-b border-[color:var(--border-soft)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            <tr>
              <th class="w-[42%] px-4 py-3 font-semibold">Question</th>
              <th class="w-[18%] px-4 py-3 font-semibold">Community</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Visibility</th>
              <th class="w-[14%] px-4 py-3 font-semibold">Answers</th>
              <th class="w-[12%] px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--border-soft)]">
            <tr v-for="question in filteredQuestions" :key="question.id">
              <td class="px-4 py-3">
                <p class="truncate font-semibold text-[var(--text-primary)]">{{ question.title }}</p>
                <p class="mt-1 max-w-lg truncate text-sm text-[var(--text-secondary)]">{{ question.body }}</p>
              </td>
              <td class="truncate px-4 py-3 text-[var(--text-secondary)]">{{ question.community?.name || 'No community' }}</td>
              <td class="px-4 py-3 capitalize text-[var(--text-secondary)]">{{ formatVisibility(question.visibility) }}</td>
              <td class="px-4 py-3">
                <RouterLink :to="`/admin/questions/${question.id}/answers`">
                  <StatusChip :tone="question.totalAnswers > 0 ? 'success' : 'muted'">
                  {{ question.totalAnswers }} answers
                  </StatusChip>
                </RouterLink>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/admin/questions/${question.id}/answers`"
                    class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                    :aria-label="`Manage answers for ${question.title}`"
                    :title="`Manage answers for ${question.title}`"
                  >
                    <MessageSquareText class="h-4 w-4" />
                  </RouterLink>
                  <button
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                    :aria-label="`View ${question.title}`"
                    :title="`View ${question.title}`"
                    @click="viewingQuestion = question"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && filteredQuestions.length > 0" class="space-y-3 p-4 md:hidden">
        <article
          v-for="question in filteredQuestions"
          :key="question.id"
          class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-[var(--text-primary)]">{{ question.title }}</p>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ question.community?.name || 'No community' }}</p>
            </div>
            <StatusChip :tone="question.isClosed ? 'muted' : 'success'">
              {{ question.isClosed ? 'Closed' : 'Open' }}
            </StatusChip>
          </div>
          <p class="mt-3 line-clamp-3 text-sm text-[var(--text-secondary)]">{{ question.body }}</p>
          <div class="mt-3 flex items-center justify-between gap-3">
            <span class="text-xs capitalize text-[var(--text-tertiary)]">{{ formatVisibility(question.visibility) }}</span>
            <div class="flex gap-2">
              <RouterLink
                :to="`/admin/questions/${question.id}/answers`"
                class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                :aria-label="`Manage answers for ${question.title}`"
                :title="`Manage answers for ${question.title}`"
              >
                <MessageSquareText class="h-4 w-4" />
              </RouterLink>
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-[0.75rem] border border-[color:var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
                :aria-label="`View ${question.title}`"
                :title="`View ${question.title}`"
                @click="viewingQuestion = question"
              >
                <Eye class="h-4 w-4" />
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
      v-if="viewingQuestion"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-bg)] px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-question-title"
      @click.self="viewingQuestion = null"
    >
      <section class="app-scroll max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Question details
            </p>
            <h2 id="view-question-title" class="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">
              {{ viewingQuestion.title }}
            </h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">
              Asked by {{ getAskerName(viewingQuestion) }} · {{ formatDate(viewingQuestion.createdAt) }}
            </p>
          </div>

          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-[0.75rem] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]"
            aria-label="Close details modal"
            @click="viewingQuestion = null"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Answers</p>
            <p class="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{{ viewingQuestion.totalAnswers }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Answerers</p>
            <p class="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{{ viewingQuestion.totalAnswerers }}</p>
          </article>
          <article class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Status</p>
            <p class="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">{{ viewingQuestion.isClosed ? 'Closed' : 'Open' }}</p>
          </article>
        </div>

        <div class="mt-5 rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
          <p class="text-sm font-semibold text-[var(--text-primary)]">Body</p>
          <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{{ viewingQuestion.body }}</p>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Community</p>
            <p class="mt-2 text-sm text-[var(--text-secondary)]">{{ viewingQuestion.community?.name || 'No community' }}</p>
          </div>
          <div class="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] p-3">
            <p class="text-sm font-semibold text-[var(--text-primary)]">Visibility</p>
            <p class="mt-2 text-sm capitalize text-[var(--text-secondary)]">{{ formatVisibility(viewingQuestion.visibility) }}</p>
          </div>
        </div>

        <RouterLink
          :to="`/admin/questions/${viewingQuestion.id}/answers`"
          class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          <MessageSquareText class="h-4 w-4" />
          Manage answers
        </RouterLink>
      </section>
    </div>
  </div>
</template>

<style scoped>
.question-stat-card {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.question-stat-card::before {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 87% 18%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 24%),
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 7%, transparent), transparent 42%);
  content: "";
  pointer-events: none;
}

.question-stat-icon {
  position: absolute;
  top: 1.55rem;
  right: 1.55rem;
  width: 3.7rem;
  height: 3.7rem;
}

.question-stat-icon span {
  position: absolute;
  display: grid;
  place-items: center;
  border-radius: 0.85rem;
}

.question-stat-icon span:first-child {
  top: -0.75rem;
  right: -0.75rem;
  width: 3.5rem;
  height: 3.5rem;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.question-stat-icon span:last-child {
  right: 0.55rem;
  bottom: 0.1rem;
  width: 2.9rem;
  height: 2.9rem;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
}
</style>
