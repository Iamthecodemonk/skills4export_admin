import { readonly, ref } from 'vue'
import { ApiError, apiRequest, getAuthToken } from './useApi'

const access = ref({ isAdmin: false, isSuperAdmin: false })
const check = ref({ loading: false, checked: false, error: '' })
let loadedToken: string | null = null
let pending: Promise<void> | null = null
let pendingToken: string | null = null

export const adminAccess = readonly(access)
export const adminAccessCheck = readonly(check)

export async function loadAdminAccess(force = false) {
  const token = getAuthToken()
  if (!force && loadedToken === token && token) return
  if (pending && pendingToken === token) return pending
  loadedToken = null
  access.value = { isAdmin: false, isSuperAdmin: false }
  check.value = { loading: true, checked: false, error: '' }
  pendingToken = token
  const request = apiRequest<{ data: { isAdmin: boolean; isSuperAdmin: boolean } }>('/api/admin/users/me')
    .then(({ data }) => {
      if (getAuthToken() !== token) return
      if (typeof data?.isAdmin !== 'boolean' || typeof data?.isSuperAdmin !== 'boolean') {
        throw new Error('The permissions endpoint returned an invalid response. Deploy the admin permissions API before using these pages.')
      }
      access.value = { isAdmin: data.isAdmin === true, isSuperAdmin: data.isAdmin === true && data.isSuperAdmin === true }
      loadedToken = token
      check.value.checked = true
    })
    .catch(error => {
      if (getAuthToken() === token) {
        check.value.error = error instanceof ApiError && error.status === 404
          ? 'Account permissions are unavailable on the server (HTTP 404).'
          : error instanceof Error ? error.message : 'Unable to check account permissions.'
      }
      throw error
    })
  pending = request
  try { await request } finally { if (pending === request) { pending = null; check.value.loading = false } }
}
