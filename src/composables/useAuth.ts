import { getApiErrorMessage, getApiUrl } from './useApi'

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('admin-token')
}

export async function login(email: string, password: string) {
  if (!email || !password) {
    return { ok: false, error: 'Email and password are required' }
  }

  try {
    const loginPaths = ['/api/login', '/api/auth/login', '/api/admin/login']
    let body: Record<string, any> = {}
    let loginError = 'Login failed'

    for (const path of loginPaths) {
      const response = await fetch(getApiUrl(path), {
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

      body = await response.json().catch(() => ({}))

      if (response.ok) {
        loginError = ''
        break
      }

      loginError = getApiErrorMessage(body)

      if (!/handler not implemented|not implemented/i.test(loginError)) {
        return { ok: false, error: loginError }
      }
    }

    if (loginError) {
      return { ok: false, error: loginError }
    }

    const user = body.data
    const token = body.token || body.access_token || user?.api_token || user?.token
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
