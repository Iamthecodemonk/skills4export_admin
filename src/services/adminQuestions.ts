import { apiRequest } from '../composables/useApi'

export type QuestionVisibility = 'public' | 'community_only' | 'community_public'

export type QuestionUser = {
  id: string
  name?: string | null
  email?: string | null
}

export type QuestionCommunity = {
  id: string
  name?: string | null
  description?: string | null
}

export type Answer = {
  id: string
  questionId: string
  userId: string
  parentAnswerId: string | null
  content: string
  createdAt: string
  updatedAt: string
  user: QuestionUser | null
}

export type Question = {
  id: string
  userId: string
  communityId: string | null
  title: string
  body: string
  visibility: QuestionVisibility | string
  isClosed: boolean
  acceptedAnswerId: string | null
  createdAt: string
  updatedAt: string
  asker: QuestionUser | null
  community: QuestionCommunity | null
  totalAnswers: number
  totalAnswerers: number
  answers: Answer[] | null
}

export type Paginator<T> = {
  current_page: number
  data: T[]
  first_page_url?: string | null
  from: number | null
  last_page: number
  last_page_url?: string | null
  links?: Array<Record<string, unknown>>
  next_page_url?: string | null
  path?: string
  per_page: number
  prev_page_url?: string | null
  to: number | null
  total: number
}

export type CreateQuestionPayload = {
  communityId?: string | null
  title: string
  body: string
  visibility?: QuestionVisibility
}

export type CreateAnswerPayload = {
  content: string
  parentAnswerId?: string | null
}

export type ApiDataResponse<T> = {
  success: boolean
  data: T
}

export async function listQuestions(params: { page?: number; per_page?: number } = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })

  const path = `/api/questions${search.toString() ? `?${search.toString()}` : ''}`
  return apiRequest<Paginator<Question>>(path)
}

export async function createQuestion(payload: CreateQuestionPayload) {
  return apiRequest<ApiDataResponse<Question>>('/api/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listAnswers(questionId: string, params: { page?: number; per_page?: number } = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })

  const path = `/api/questions/${questionId}/answers${search.toString() ? `?${search.toString()}` : ''}`
  return apiRequest<Paginator<Answer>>(path)
}

export async function createAnswer(questionId: string, payload: CreateAnswerPayload) {
  return apiRequest<ApiDataResponse<Answer>>(`/api/questions/${questionId}/answers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export default {
  listQuestions,
  createQuestion,
  listAnswers,
  createAnswer,
}
