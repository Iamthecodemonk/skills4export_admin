import { apiRequest } from '../composables/useApi'

export type FreelancerStatus = 'draft' | 'pending_review' | 'available' | 'certified' | 'suspended'
export type FreelancerAvailability = 'available_now' | 'open' | 'busy' | 'unavailable'

export type Freelancer = {
  id: string
  userId: string
  name: string
  title: string
  skills: string[]
  location: string | null
  bio: string | null
  avatar: string | null
  passportMediaId: string | null
  status: FreelancerStatus
  availability: FreelancerAvailability
  remoteOnly: boolean
  hourlyRateMin: number | null
  hourlyRateMax: number | null
  currency: string | null
  rating: number | null
  completedJobsCount: number
  createdAt: string
  updatedAt: string
}

export type ListFreelancersParams = {
  page?: number
  per_page?: number
  q?: string
  status?: string
  sort?: string
  skill?: string
  location?: string
  availability?: string
  remoteOnly?: boolean
}

export type ListFreelancersResponse = {
  current_page: number
  data: Freelancer[]
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

export type CreateFreelancerPayload = {
  name: string
  title: string
  skills: string[]
  location: string
  bio: string
  passportMediaId?: string
  availability: FreelancerAvailability
  remoteOnly?: boolean
  agreedToTerms: boolean
}

export type CreateFreelancerResponse = {
  success: boolean
  message?: string
  data: Freelancer
}

export async function listFreelancers(params: ListFreelancersParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })

  const path = `/api/freelancers${search.toString() ? `?${search.toString()}` : ''}`
  return apiRequest<ListFreelancersResponse>(path, { method: 'GET' })
}

export async function createFreelancer(payload: CreateFreelancerPayload) {
  return apiRequest<CreateFreelancerResponse>('/api/freelancers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export default {
  listFreelancers,
  createFreelancer,
}
