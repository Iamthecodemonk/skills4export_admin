import { apiRequest } from '../composables/useApi'

export type UserRole = 'user' | 'admin' | string | null

export type UserSettings = {
  featureAndAnnouncement: boolean | null
  inbox: boolean | null
  research: boolean | null
  recommended: boolean | null
  alerts: boolean | null
  profile: boolean | null
}

export type UserProfile = {
  username: string | null
  avatar: string | null
  bio: string | null
  location: string | null
  currentJobTitle: string | null
  currentWorkspace: string | null
  current_job_title?: string | null
  current_workspace?: string | null
  setting: UserSettings | null
  settings: UserSettings | null
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
  counts?: Partial<UserStats> | null
  setting?: UserSettings | null
  settings?: UserSettings | null
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
  const response = await apiRequest<ListUsersResponse>(path, { method: 'GET' })

  return {
    ...response,
    data: Array.isArray(response.data) ? response.data.map(normalizeAdminUser) : [],
  }
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

function normalizeAdminUser(user: AdminUser | (Partial<AdminUser> & Record<string, unknown>)): AdminUser {
  const source = user as Partial<AdminUser> & Record<string, unknown>
  const setting = normalizeUserSettings(source.setting ?? source.settings)

  return {
    ...source,
    id: typeof source.id === 'string' ? source.id : String(source.id ?? ''),
    email: typeof source.email === 'string' ? source.email : String(source.email ?? ''),
    role: typeof source.role === 'string' || source.role === null ? source.role : null,
    created_at: readString(source.created_at ?? source.createdAt),
    updated_at: readNullableString(source.updated_at ?? source.updatedAt),
    profile: normalizeUserProfile(source.profile, source, setting),
    skills: readArray(source.skills),
    portfolios: readArray(source.portfolios),
    certifications: readArray(source.certifications),
    education: readArray(source.education),
    experiences: readArray(source.experiences),
    stats: normalizeUserStats(source.stats ?? source.counts),
    counts: normalizeUserStats(source.stats ?? source.counts),
    setting,
    settings: setting,
    latest: {
      post: readLatest(source.latest, 'post'),
      question: readLatest(source.latest, 'question'),
      job: readLatest(source.latest, 'job'),
      freelanceJob: readLatest(source.latest, 'freelanceJob'),
      page: readLatest(source.latest, 'page'),
    },
  } as AdminUser
}

function normalizeUserProfile(profile: unknown, user: Record<string, unknown>, fallbackSetting: UserSettings | null): UserProfile {
  const source = isRecord(profile) ? profile : {}
  const setting = normalizeUserSettings(source.setting ?? source.settings) ?? fallbackSetting

  return {
    username: readNullableString(source.username ?? source.name ?? user.name),
    avatar: readNullableString(source.avatar ?? source.profileImageUrl ?? source.profile_image_url ?? user.profile_image),
    bio: readNullableString(source.bio ?? user.bio),
    location: readNullableString(source.location ?? user.location),
    currentJobTitle: readNullableString(source.currentJobTitle ?? source.current_job_title ?? user.currentJobTitle ?? user.current_job_title),
    currentWorkspace: readNullableString(source.currentWorkspace ?? source.current_workspace ?? user.currentWorkspace ?? user.current_workspace),
    current_job_title: readNullableString(source.current_job_title ?? source.currentJobTitle ?? user.current_job_title ?? user.currentJobTitle),
    current_workspace: readNullableString(source.current_workspace ?? source.currentWorkspace ?? user.current_workspace ?? user.currentWorkspace),
    setting,
    settings: setting,
  }
}

function normalizeUserStats(stats: unknown): UserStats {
  const source = isRecord(stats) ? stats : {}

  return {
    posts: readCount(source.posts),
    questions: readCount(source.questions),
    answers: readCount(source.answers),
    comments: readCount(source.comments),
    jobs: readCount(source.jobs),
    jobApplications: readCount(source.jobApplications ?? source.job_applications),
    freelanceJobs: readCount(source.freelanceJobs ?? source.freelance_jobs),
    freelanceApplications: readCount(source.freelanceApplications ?? source.freelance_applications),
    pages: readCount(source.pages),
    communities: readCount(source.communities),
    ownedCommunities: readCount(source.ownedCommunities ?? source.owned_communities),
    skills: readCount(source.skills),
    portfolios: readCount(source.portfolios ?? source.projects),
    certifications: readCount(source.certifications),
    education: readCount(source.education ?? source.educations),
    experiences: readCount(source.experiences),
    followers: readCount(source.followers),
    totalFollowers: readCount(source.totalFollowers ?? source.total_followers ?? source.followers),
    following: readCount(source.following),
  }
}

function normalizeUserSettings(settings: unknown): UserSettings | null {
  if (!isRecord(settings)) {
    return null
  }

  return {
    featureAndAnnouncement: readBool(settings.featureAndAnnouncement ?? settings.feature_and_announcement),
    inbox: readBool(settings.inbox),
    research: readBool(settings.research),
    recommended: readBool(settings.recommended),
    alerts: readBool(settings.alerts),
    profile: readBool(settings.profile),
  }
}

function readLatest(latest: unknown, key: string): LatestRecord {
  if (!isRecord(latest)) {
    return null
  }

  const value = latest[key]
  return isRecord(value) ? value : null
}

function readArray(value: unknown): UserDetailRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function readCount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function readBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1 ? true : value === 0 ? false : null
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false
    }
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
