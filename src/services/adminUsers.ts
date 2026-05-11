import { apiRequest } from '../composables/useApi'

export type UserRole = 'user' | 'admin' | string | null

export type UserProfile = {
  username: string | null
  avatar: string | null
  bio: string | null
  location: string | null
}

export type UserStats = {
  posts: number
  questions: number
  answers: number
  comments: number
  jobs: number
  jobApplications: number
  freelanceJobs: number
  freelanceApplications: number
  pages: number
  communities: number
  ownedCommunities: number
  skills: number
  portfolios: number
  certifications: number
  education: number
  experiences: number
  followers: number
  totalFollowers: number
  following: number
}

export type LatestRecord = Record<string, unknown> | null
export type UserDetailRecord = Record<string, unknown>

export type AdminUser = {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string | null
  profile: UserProfile
  skills: UserDetailRecord[]
  portfolios: UserDetailRecord[]
  certifications: UserDetailRecord[]
  education: UserDetailRecord[]
  experiences: UserDetailRecord[]
  stats: UserStats
  latest: {
    post: LatestRecord
    question: LatestRecord
    job: LatestRecord
    freelanceJob: LatestRecord
    page: LatestRecord
  }
}

export type ListUsersParams = {
  page?: number
  per_page?: number
  perPage?: number
  limit?: number
  offset?: number
}

export type ListUsersResponse = {
  current_page: number
  data: AdminUser[]
  first_page_url: string | null
  from: number | null
  last_page: number
  last_page_url: string | null
  links: Array<Record<string, unknown>>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

export type CreateUserPayload = {
  email: string
  password: string
  role?: 'user' | 'admin'
}

export type CreateUserResponse = {
  success: boolean
  data: {
    id: string
    email: string
  }
}

export async function listUsers(params: ListUsersParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })

  const path = `/api/users${search.toString() ? `?${search.toString()}` : ''}`
  return apiRequest<ListUsersResponse>(path, { method: 'GET' })
}

export async function createUser(payload: CreateUserPayload) {
  return apiRequest<CreateUserResponse>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export default {
  listUsers,
  createUser,
}
