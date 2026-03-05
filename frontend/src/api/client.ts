const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const TOKEN_KEY = 'discovery_access_token'

/** In-memory token so redirect/navigate in same session has token before localStorage is read. */
let memoryToken: string | null = null

export interface UserInfo {
  id: string
  email: string
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

export interface SignupResponse {
  id: string
  email: string
  created_at: string
}

export interface ApiError {
  detail: string | { msg: string; loc: string[] }[]
}

/** Auth headers for use by other API modules (e.g. lib/api) so requests work before cookie is attached. */
export function getAuthHeaders(): Record<string, string> {
  const token = memoryToken ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null)
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include', // send/receive HTTP-only cookies
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({ detail: 'Network error' }))
    const message =
      typeof body.detail === 'string'
        ? body.detail
        : body.detail.map((e) => e.msg).join(', ')
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export async function signup(email: string, password: string): Promise<SignupResponse> {
  return request<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function login(email: string, password: string, rememberMe = false): Promise<LoginResponse> {
  const data = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  memoryToken = data.access_token
  if (rememberMe && typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem('rememberMe', 'true')
  }
  return data
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' })
  } finally {
    memoryToken = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('rememberMe')
    }
  }
}

export async function validateSession(): Promise<UserInfo> {
  return request<UserInfo>('/auth/validate')
}
