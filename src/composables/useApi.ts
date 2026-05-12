type ApiErrorResponse = {
  error?: {
    message?: string
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

  const firstFieldError = Object.values(body.data?.errors || {})[0]?.[0]
  if (firstFieldError) {
    return firstFieldError
  }

  return 'Unable to complete request'
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

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body))
  }

  return body as T
}
 
