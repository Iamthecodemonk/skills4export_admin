import { apiRequest } from '../composables/useApi'

export type AdvertStatus = 'pending_review' | 'approved' | 'active' | 'expired' | 'suspended' | 'deleted'
export type AdvertOptionStatus = 'active' | 'suspended' | 'deleted'

export type AdvertPlacementOption = {
  id: string
  name: string
  description: string | null
  status: AdvertOptionStatus
  createdAt: string
  updatedAt: string
}

export type Advert = {
  id: string
  locationId: string
  location: AdvertPlacementOption | Record<string, unknown> | null
  siteId: string
  site: AdvertPlacementOption | Record<string, unknown> | null
  duration: string | number | null
  durationDays: number | null
  imageUrl: string | null
  imageMediaId: string | null
  linkUrl: string | null
  ownerName: string | null
  ownerPhone: string | null
  ownerEmail: string | null
  approvedBy: string | null
  textAbove: string | null
  textBelow: string | null
  status: AdvertStatus
  startsAt: string | null
  expiresAt: string | null
  isExpired: boolean
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export type AdvertPaginator<T> = {
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

export type AdvertParams = {
  page?: number
  per_page?: number
  q?: string
  status?: string
  sort?: string
  locationId?: string
  siteId?: string
}

export type CreateAdvertPayload = {
  locationId: string
  siteId: string
  duration: string | number
  durationDays?: number
  imageUrl?: string
  imageMediaId?: string
  mediaPath?: string
  linkUrl?: string
  ownerName?: string
  ownerPhone?: string
  ownerContact?: string
  ownerEmail?: string
  approvedBy?: string
  textAbove?: string
  textBelow?: string
  status?: AdvertStatus
  startsAt?: string
  expiresAt?: string
}

export type AdvertOptionPayload = {
  name: string
  description?: string
  status?: AdvertOptionStatus
}

type DataResponse<T> = {
  success: boolean
  message?: string
  data: T
}

function withParams(path: string, params: AdvertParams = {}) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })

  return `${path}${search.toString() ? `?${search.toString()}` : ''}`
}

export function listAdverts(params: AdvertParams = {}) {
  return apiRequest<AdvertPaginator<Advert>>(withParams('/api/adverts/all', params))
}

export function createAdvert(payload: CreateAdvertPayload) {
  return apiRequest<DataResponse<Advert>>('/api/adverts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAdvert(id: string) {
  return apiRequest<DataResponse<Advert>>(`/api/adverts/${id}`)
}

export function updateAdvert(id: string, payload: Partial<CreateAdvertPayload>) {
  return apiRequest<DataResponse<Advert>>(`/api/adverts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateAdvertStatus(id: string, status: AdvertStatus) {
  return apiRequest<DataResponse<Advert>>(`/api/adverts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function deleteAdvert(id: string) {
  return apiRequest<DataResponse<Advert>>(`/api/adverts/${id}`, {
    method: 'DELETE',
  })
}

export function listAdvertLocations(params: AdvertParams = {}) {
  return apiRequest<AdvertPaginator<AdvertPlacementOption>>(withParams('/api/advert-locations', params))
}

export function createAdvertLocation(payload: AdvertOptionPayload) {
  return apiRequest<DataResponse<AdvertPlacementOption>>('/api/advert-locations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdvertLocation(id: string, payload: AdvertOptionPayload) {
  return apiRequest<DataResponse<AdvertPlacementOption>>(`/api/advert-locations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAdvertLocation(id: string) {
  return apiRequest<DataResponse<AdvertPlacementOption>>(`/api/advert-locations/${id}`, {
    method: 'DELETE',
  })
}

export function updateAdvertLocationStatus(id: string, status: AdvertOptionStatus) {
  return apiRequest<DataResponse<AdvertPlacementOption>>(`/api/advert-locations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function listAdvertSites(params: AdvertParams = {}) {
  return apiRequest<AdvertPaginator<AdvertPlacementOption>>(withParams('/api/advert-sites', params))
}

export function createAdvertSite(payload: AdvertOptionPayload) {
  return apiRequest<DataResponse<AdvertPlacementOption>>('/api/advert-sites', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdvertSite(id: string, payload: AdvertOptionPayload) {
  return apiRequest<DataResponse<AdvertPlacementOption>>(`/api/advert-sites/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAdvertSite(id: string) {
  return apiRequest<DataResponse<AdvertPlacementOption>>(`/api/advert-sites/${id}`, {
    method: 'DELETE',
  })
}

export function updateAdvertSiteStatus(id: string, status: AdvertOptionStatus) {
  return apiRequest<DataResponse<AdvertPlacementOption>>(`/api/advert-sites/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export default {
  listAdverts,
  createAdvert,
  getAdvert,
  updateAdvert,
  updateAdvertStatus,
  deleteAdvert,
  listAdvertLocations,
  createAdvertLocation,
  updateAdvertLocation,
  deleteAdvertLocation,
  updateAdvertLocationStatus,
  listAdvertSites,
  createAdvertSite,
  updateAdvertSite,
  deleteAdvertSite,
  updateAdvertSiteStatus,
}
