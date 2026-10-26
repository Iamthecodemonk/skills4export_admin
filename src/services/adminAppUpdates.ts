import { apiRequest } from '../composables/useApi'

export type AppPlatform = 'android' | 'ios'

export type AppUpdatePayload = {
  latestVersion: string
  minSupportedVersion: string
  storeUrl: string
  releaseNotes: string
  releasedAt: string | null
  isPublished: boolean
}

export type AppUpdatePolicy = AppUpdatePayload & { platform: AppPlatform }

type PolicyResponse = Partial<AppUpdatePolicy> & {
  platform: AppPlatform
  latest_version?: string
  min_supported_version?: string
  store_url?: string
  release_notes?: string | null
  released_at?: string | null
  is_published?: boolean | number
}

export async function listAppUpdatePolicies(): Promise<AppUpdatePolicy[]> {
  const response = await apiRequest<{ data: PolicyResponse[] }>('/api/admin/app-updates')
  if (!Array.isArray(response.data)) throw new Error('The server returned an invalid app update policy list.')
  return response.data.map(policy => ({
    platform: policy.platform,
    latestVersion: policy.latestVersion ?? policy.latest_version ?? '',
    minSupportedVersion: policy.minSupportedVersion ?? policy.min_supported_version ?? '',
    storeUrl: policy.storeUrl ?? policy.store_url ?? '',
    releaseNotes: policy.releaseNotes ?? policy.release_notes ?? '',
    releasedAt: policy.releasedAt ?? policy.released_at ?? null,
    isPublished: policy.isPublished === true || policy.is_published === true || policy.is_published === 1,
  }))
}

export function saveAppUpdatePolicy(platform: AppPlatform, payload: AppUpdatePayload) {
  return apiRequest(`/api/admin/app-updates/${platform}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function compareAppVersions(left: string, right: string): number {
  const a = left.split('.').map(BigInt)
  const b = right.split('.').map(BigInt)
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1
  }
  return 0
}

export function validateAppUpdatePolicy(platform: AppPlatform, payload: AppUpdatePayload): string | null {
  if (!/^\d+\.\d+\.\d+$/.test(payload.latestVersion) || !/^\d+\.\d+\.\d+$/.test(payload.minSupportedVersion)) {
    return 'Latest and minimum supported versions must use numeric major.minor.patch format.'
  }
  if (compareAppVersions(payload.minSupportedVersion, payload.latestVersion) > 0) {
    return 'Minimum supported version cannot exceed the latest version.'
  }
  try {
    const url = new URL(payload.storeUrl)
    const validListing = platform === 'android'
      ? url.hostname === 'play.google.com' && url.pathname === '/store/apps/details' && !!url.searchParams.get('id')?.trim()
      : url.hostname === 'apps.apple.com' && /\/id\d+(?:\/|$)/.test(url.pathname)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !validListing) throw new Error()
  } catch {
    return platform === 'android'
      ? 'Enter the real HTTPS play.google.com/store/apps/details listing URL, including its app id.'
      : 'Enter the real HTTPS apps.apple.com listing URL for this app. Leave iOS unconfigured until it exists.'
  }
  if (payload.isPublished && !payload.releasedAt) return 'A release date is required to publish.'
  if (payload.releasedAt && !Number.isFinite(Date.parse(payload.releasedAt))) return 'Enter a valid release date.'
  if (payload.isPublished && payload.releasedAt && Date.parse(payload.releasedAt) > Date.now()) {
    return 'The release date cannot be in the future when publishing. Confirm the release is already available.'
  }
  return null
}
