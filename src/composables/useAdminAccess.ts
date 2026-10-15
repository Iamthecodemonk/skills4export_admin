import { readonly, ref } from 'vue'
import { apiRequest, getAuthToken } from './useApi'

const access = ref({ isAdmin: false, isSuperAdmin: false })
let loadedToken: string | null = null
let pending: Promise<void> | null = null
let pendingToken: string | null = null

export const adminAccess = readonly(access)

export async function loadAdminAccess() {
  const token = getAuthToken()
  if (loadedToken === token && token) return
  if (pending && pendingToken === token) return pending
  access.value = { isAdmin: false, isSuperAdmin: false }
  pendingToken = token
  const request = apiRequest<{ data: { isAdmin: boolean; isSuperAdmin: boolean } }>('/api/admin/users/me')
    .then(({ data }) => {
      if (getAuthToken() !== token) return
      access.value = { isAdmin: data.isAdmin === true, isSuperAdmin: data.isAdmin === true && data.isSuperAdmin === true }
      loadedToken = token
    })
  pending = request
  try { await request } finally { if (pending === request) pending = null }
}
