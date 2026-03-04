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

export function getStoredToken(): string | null {
  return memoryToken ?? localStorage.getItem(TOKEN_KEY)
}

function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  }).then(async (res) => {

    if (!res.ok) {
      if (res.status === 401) {
        memoryToken = null
        localStorage.removeItem(TOKEN_KEY)
      }
      const body: ApiError = await res.json().catch(() => ({ detail: 'Network error' }))
      const message =
        typeof body.detail === 'string'
          ? body.detail
          : Array.isArray(body.detail) ? body.detail.map((e: { msg: string }) => e.msg).join(', ') : 'Request failed'
      throw new Error(message)
    }
    return res.json() as Promise<T>
  })
}

export async function signup(email: string, password: string): Promise<SignupResponse> {
  return request<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  memoryToken = data.access_token
  localStorage.setItem(TOKEN_KEY, data.access_token)
  return data
}

export function clearStoredToken(): void {
  memoryToken = null
  localStorage.removeItem(TOKEN_KEY)
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' })
  } finally {
    clearStoredToken()
  }
}

export async function validateSession(): Promise<UserInfo> {
  return request<UserInfo>('/auth/validate')
}
