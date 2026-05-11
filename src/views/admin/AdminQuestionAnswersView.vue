<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Loader2, MessageSquarePlus, RefreshCw, Send } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import StatusChip from '../../components/StatusChip.vue'
import { createAnswer, listAnswers, listQuestions, type Answer, type Question } from '../../services'

const route = useRoute()
const questionId = computed(() => String(route.params.questionId || ''))

const question = ref<Question | null>(null)
const answers = ref<Answer[]>([])
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
const content = ref('')
const parentAnswerId = ref('')

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

function answerAuthor(answer: Answer) {
  return answer.user?.name || answer.user?.email || 'Unknown answerer'
}

async function fetchQuestionSummary() {
  try {
    const response = await listQuestions({ page: 1, per_page: 100 })
    question.value = response.data.find((item) => item.id === questionId.value) || null
  } catch {
    question.value = null
  }
}

async function fetchAnswers() {
  loading.value = true
  error.value = null

  try {
    const response = await listAnswers(questionId.value, {
      page: page.value,
      per_page: perPage.value,
    })

    answers.value = response.data || []
    total.value = response.total || 0
    lastPage.value = response.last_page || 1
    perPage.value = response.per_page || perPage.value
    from.value = response.from
    to.value = response.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load answers'
    answers.value = []
  } finally {
    loading.value = false
  }
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), lastPage.value)
  fetchAnswers()
}

async function createNewAnswer() {
  formError.value = null

  if (!content.value.trim()) {
    formError.value = 'Answer content is required'
    return
  }

  creating.value = true

  try {
    await createAnswer(questionId.value, {
      content: content.value.trim(),
      parentAnswerId: parentAnswerId.value.trim() || null,
    })

    toast.success('Answer created')
    content.value = ''
    parentAnswerId.value = ''
    page.value = 1
    await fetchAnswers()
    await fetchQuestionSummary()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to create answer'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchQuestionSummary()
  fetchAnswers()
})
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="min-w-0">
          <RouterLink to="/admin/questions" class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]">
            <ArrowLeft class="h-4 w-4" />
            Questions
          </RouterLink>
          <p class="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Answers</p>
          <h1 class="mt-2 truncate font-display text-xl font-semibold text-[var(--text-primary)]">
            {{ question?.title || 'Question answers' }}
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            {{ question?.body || `Question ID: ${questionId}` }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <StatusChip :tone="question?.isClosed ? 'muted' : 'success'">{{ question?.isClosed ? 'Closed' : 'Open' }}</StatusChip>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border border-[color:var(--border-soft)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60" :disabled="loading" @click="fetchAnswers">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <form class="mx-auto max-w-3xl" @submit.prevent="createNewAnswer">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <MessageSquarePlus class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Create answer</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">The authenticated admin user becomes the answer author.</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4">
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Parent answer ID</label>
            <input v-model="parentAnswerId" class="h-11 w-full rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="Optional reply parent" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Answer</label>
            <textarea v-model="content" class="min-h-32 w-full resize-y rounded-[0.85rem] border border-[color:var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--surface-primary)]" placeholder="You can fix it by..."></textarea>
          </div>
        </div>

        <p v-if="formError" class="mt-4 rounded-[0.85rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ formError }}</p>

        <div class="mt-5 flex justify-end">
          <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70" :disabled="creating">
            <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
            <Send v-else class="h-4 w-4" />
            {{ creating ? 'Creating...' : 'Create answer' }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)]">
      <div class="border-b border-[color:var(--border-soft)] p-4">
        <h2 class="font-display text-base font-semibold text-[var(--text-primary)]">Answers</h2>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ from || 0 }}-{{ to || 0 }} of {{ total }} answers</p>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Loader2 class="h-4 w-4 animate-spin" />
        Loading answers
      </div>

      <div v-else-if="error" class="p-4">
        <div class="rounded-[0.9rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
      </div>

      <div v-else-if="answers.length === 0" class="flex min-h-64 items-center justify-center p-4 text-center">
        <div>
          <p class="font-semibold text-[var(--text-primary)]">No answers found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Create the first answer for this question.</p>
        </div>
      </div>

      <div v-else class="divide-y divide-[color:var(--border-soft)]">
        <article v-for="answer in answers" :key="answer.id" class="p-4">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="font-semibold text-[var(--text-primary)]">{{ answerAuthor(answer) }}</p>
              <p class="mt-1 font-mono text-xs text-[var(--text-tertiary)] break-all">{{ answer.id }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <StatusChip v-if="answer.parentAnswerId" tone="accent">Reply</StatusChip>
              <StatusChip tone="muted">{{ formatDate(answer.createdAt) }}</StatusChip>
            </div>
          </div>
          <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">{{ answer.content }}</p>
          <p v-if="answer.parentAnswerId" class="mt-3 break-all text-xs text-[var(--text-tertiary)]">Parent: {{ answer.parentAnswerId }}</p>
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
  </div>
</template>
