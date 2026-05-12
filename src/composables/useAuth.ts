import { getApiErrorMessage, getApiUrl } from './useApi'

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('admin-token')
}

export async function login(email: string, password: string) {
  if (!email || !password) {
    return { ok: false, error: 'Email and password are required' }
  }

  try {
    const response = await fetch(getApiUrl('/api/login'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      return { ok: false, error: getApiErrorMessage(body) }
    }

    const user = body.data
    const token = body.token || user?.api_token
    if (!token || !user?.id || !user?.email) {
      return { ok: false, error: 'Invalid response from server' }
    }

    localStorage.setItem('admin-token', token)
    localStorage.setItem('admin-user', JSON.stringify(user))
    return { ok: true }
  } catch {
    return { ok: false, error: 'Unable to connect to the server' }
  }
}

export async function logout() {
  const token = localStorage.getItem('admin-token')

  if (token) {
    await fetch(getApiUrl('/api/logout'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => undefined)
  }

  localStorage.removeItem('admin-token')
  localStorage.removeItem('admin-user')
}

export function clearAuth() {
  localStorage.removeItem('admin-token')
  localStorage.removeItem('admin-user')
}

export default {
  isAuthenticated,
  login,
  logout,
}
