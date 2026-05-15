import { apiRequest } from '../composables/useApi'

export type FreelanceJobStatus = 'pending_review' | 'live' | 'approved' | 'active' | 'closed' | 'archived' | 'deleted' | 'suspended'
export type FreelanceJobType = 'contract' | 'part-time' | 'project-based' | 'remote' | 'hybrid'

export type FreelanceJob = {
  id: string
  slug: string
  title: string
  companyName: string
  postedByUserId: string
  location: string | null
  type: FreelanceJobType
  skills: string[]
  description: string | null
  qualifications: string | null
  minFee: number | null
  maxFee: number | null
  currency: string | null
  feeLabel: string | null
  applicationEndDate: string | null
  status: FreelanceJobStatus
  applicantCount: number
  verified: boolean
  hasApplied: boolean | null
  createdAt: string
  updatedAt: string
}

export type FreelanceApplication = {
  id: string
  freelanceJobId: string
  userId: string
  freelanceJob: Record<string, unknown> | null
  proposal: string | null
  bidAmount: number | null
  currency: string | null
  attachmentMediaIds: string[]
  status: string
  createdAt: string
  appliedAt: string
  updatedAt: string
}

export type FreelanceJobParams = {
  page?: number
  per_page?: number
  q?: string
  status?: string
  sort?: string
  skill?: string
  location?: string
  type?: string
}

export type FreelanceJobPaginator<T> = {
  current_page: number
  data: T[]
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

export type CreateFreelanceJobPayload = {
  title: string
  skills: string[]
  location: string
  type: FreelanceJobType
  description: string
  qualifications: string
  minFee?: number
  maxFee?: number
  currency?: string
  companyName: string
  applicationEndDate: string
  agreedToTerms: boolean
}

export type FreelanceJobApiDataResponse<T> = {
  success: boolean
  message?: string
  data: T
}

function buildPath(path: string, params: FreelanceJobParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })

  return `${path}${search.toString() ? `?${search.toString()}` : ''}`
}

export async function listFreelanceJobs(params: FreelanceJobParams = {}) {
  return apiRequest<FreelanceJobPaginator<FreelanceJob>>(buildPath('/api/freelance-jobs', params))
}

export async function createFreelanceJob(payload: CreateFreelanceJobPayload) {
  return apiRequest<FreelanceJobApiDataResponse<FreelanceJob>>('/api/freelance-jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteFreelanceJob(id: string) {
  return apiRequest<FreelanceJobApiDataResponse<{ id: string }>>(`/api/freelance-jobs/${id}`, {
    method: 'DELETE',
  })
}

export async function updateFreelanceJobStatus(id: string, status: FreelanceJobStatus) {
  return apiRequest<FreelanceJobApiDataResponse<FreelanceJob>>(`/api/freelance-jobs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function listMyFreelanceJobs(params: FreelanceJobParams = {}) {
  return apiRequest<FreelanceJobPaginator<FreelanceJob>>(buildPath('/api/me/freelance-jobs/posted', params))
}

export async function listMyFreelanceApplications(params: Pick<FreelanceJobParams, 'page' | 'per_page' | 'q' | 'status' | 'sort'> = {}) {
  return apiRequest<FreelanceJobPaginator<FreelanceApplication>>(buildPath('/api/me/freelance-jobs/applications', params))
}

export default {
  listFreelanceJobs,
  createFreelanceJob,
  deleteFreelanceJob,
  updateFreelanceJobStatus,
  listMyFreelanceJobs,
  listMyFreelanceApplications,
}
