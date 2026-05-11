import { apiRequest } from '../composables/useApi'

export type JobStatus = 'draft' | 'pending_review' | 'live' | 'closed' | 'archived'
export type JobType = 'full-time' | 'part-time' | 'contract' | 'hybrid' | 'remote'
export type WorkMode = 'remote' | 'hybrid' | 'onsite'

export type Job = {
  id: string
  slug: string
  title: string
  companyName: string
  companyId: string | null
  location: string | null
  workMode: WorkMode | null
  type: JobType
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryLabel: string | null
  experience: string | null
  skills: string[]
  description: string | null
  summary: string | null
  responsibilities: string[]
  requirements: string[]
  perks: string[]
  applicationEmail: string | null
  applicationUrl: string | null
  applicationEndDate: string | null
  status: JobStatus
  applicantCount: number
  hasApplied: boolean | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export type ListJobsParams = {
  page?: number
  per_page?: number
  q?: string
  status?: string
  sort?: string
  location?: string
  type?: string
  skill?: string
  experience?: string
  workMode?: string
}

export type ListJobsResponse = {
  current_page: number
  data: Job[]
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

export type CreateJobPayload = {
  title: string
  skills?: string[] | string
  location?: string
  type?: JobType
  workMode?: WorkMode
  senderEmail?: string
  companyName: string
  company?: string
  description: string
  qualifications?: string
  tasks?: string
  workExperience?: string
  minSalary?: number
  maxSalary?: number | null
  salaryCurrency?: string
  applicationEndDate?: string
}

export type CreateJobResponse = {
  success: boolean
  message?: string
  data: Job
}

export async function listJobs(params: ListJobsParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') {
      search.set(k, String(v))
    }
  })

  const path = `/api/jobs${search.toString() ? `?${search.toString()}` : ''}`
  return apiRequest<ListJobsResponse>(path, { method: 'GET' })
}

export async function createJob(payload: CreateJobPayload) {
  return apiRequest<CreateJobResponse>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export default {
  listJobs,
  createJob,
}
