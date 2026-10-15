type ApiErrorResponse = {
  error?: {
    message?: string
    code?: string
  }
  message?: string
  data?: {
    errors?: Record<string, string[]>
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.skills4export.com' : '')

export function getApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  if (!API_BASE_URL) {
    return path
  }

  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export function getAuthToken(): string | null {
  return localStorage.getItem('admin-token')
}

export function getApiErrorMessage(body: ApiErrorResponse): string {
  if (body.error?.message) {
    return body.error.message
  }

  if (body.message) {
    return body.message
  }

  if (body.error?.code) return body.error.code.replace(/_/g, ' ')

  const firstFieldError = Object.values(body.data?.errors || {})[0]?.[0]
  if (firstFieldError) {
    return firstFieldError
  }

  return 'Unable to complete request'
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.success === false) {
    if (response.status === 401) {
      localStorage.removeItem('admin-token')
      localStorage.removeItem('admin-user')

      if (window.location.pathname !== '/auth/login') {
        window.location.assign('/auth/login')
      }
    }

    throw new ApiError(response.status === 403 ? `Access denied: ${getApiErrorMessage(body)}` : getApiErrorMessage(body), response.status, body.error?.code)
  }

  return body as T
}
 
