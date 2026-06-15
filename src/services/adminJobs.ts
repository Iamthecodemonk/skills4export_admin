import { apiRequest } from '../composables/useApi'

export type JobStatus = 'draft' | 'pending_review' | 'live' | 'approved' | 'active' | 'closed' | 'archived' | 'deleted' | 'suspended'
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
  all?: boolean
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

function buildPath(path: string, params: ListJobsParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') {
      search.set(k, String(v))
    }
  })

  return `${path}${search.toString() ? `?${search.toString()}` : ''}`
}

export async function listJobs(params: ListJobsParams = {}) {
  return normalizeJobsResponse(await apiRequest<ListJobsResponse>(buildPath('/api/jobs', params), { method: 'GET' }))
}

export async function listAdminJobs(params: ListJobsParams = {}) {
  return normalizeJobsResponse(await apiRequest<ListJobsResponse>(buildPath('/api/admin/jobs', {
    per_page: 100,
    ...params,
  }), { method: 'GET' }))
}

export async function listMyPostedJobs(params: ListJobsParams = {}) {
  return normalizeJobsResponse(await apiRequest<ListJobsResponse>(buildPath('/api/me/jobs/posted', params), { method: 'GET' }))
}

export async function createJob(payload: CreateJobPayload) {
  return apiRequest<CreateJobResponse>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateJobStatus(id: string, status: JobStatus) {
  return apiRequest<CreateJobResponse>(`/api/jobs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export default {
  listJobs,
  listAdminJobs,
  listMyPostedJobs,
  createJob,
  updateJobStatus,
}

function normalizeJobsResponse(response: ListJobsResponse): ListJobsResponse {
  return {
    ...response,
    data: Array.isArray(response.data) ? response.data.map(normalizeJob) : [],
    current_page: Number(response.current_page || 1),
    last_page: Number(response.last_page || 1),
    per_page: Number(response.per_page || response.data?.length || 0),
    total: Number(response.total ?? response.data?.length ?? 0),
    from: response.from ?? (response.data?.length ? 1 : null),
    to: response.to ?? (response.data?.length || null),
  }
}

function normalizeJob(job: Job | (Partial<Job> & Record<string, unknown>)): Job {
  const source = job as Partial<Job> & Record<string, unknown>

  return {
    id: readString(source.id),
    slug: readString(source.slug),
    title: readString(source.title),
    companyName: readString(source.companyName ?? source.company_name ?? source.company),
    companyId: readNullableString(source.companyId ?? source.company_id),
    location: readNullableString(source.location),
    workMode: readNullableString(source.workMode ?? source.work_mode) as WorkMode | null,
    type: readString(source.type || 'full-time') as JobType,
    salaryMin: readNullableNumber(source.salaryMin ?? source.salary_min ?? source.minSalary ?? source.min_salary),
    salaryMax: readNullableNumber(source.salaryMax ?? source.salary_max ?? source.maxSalary ?? source.max_salary),
    salaryCurrency: readNullableString(source.salaryCurrency ?? source.salary_currency),
    salaryLabel: readNullableString(source.salaryLabel ?? source.salary_label),
    experience: readNullableString(source.experience ?? source.workExperience ?? source.work_experience),
    skills: readStringArray(source.skills),
    description: readNullableString(source.description),
    summary: readNullableString(source.summary),
    responsibilities: readStringArray(source.responsibilities ?? source.tasks),
    requirements: readStringArray(source.requirements ?? source.qualifications),
    perks: readStringArray(source.perks),
    applicationEmail: readNullableString(source.applicationEmail ?? source.application_email ?? source.senderEmail ?? source.sender_email),
    applicationUrl: readNullableString(source.applicationUrl ?? source.application_url),
    applicationEndDate: readNullableString(source.applicationEndDate ?? source.application_end_date ?? source.closing_date),
    status: readString(source.status || 'pending_review') as JobStatus,
    applicantCount: readNumber(source.applicantCount ?? source.applicant_count),
    hasApplied: typeof source.hasApplied === 'boolean' ? source.hasApplied : typeof source.has_applied === 'boolean' ? source.has_applied : null,
    createdByUserId: readString(source.createdByUserId ?? source.created_by_user_id ?? source.userId ?? source.user_id),
    createdAt: readString(source.createdAt ?? source.created_at),
    updatedAt: readString(source.updatedAt ?? source.updated_at),
  }
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
}

function readNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function readNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function readNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean)
  }

  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean)
    }
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return [value]
}
