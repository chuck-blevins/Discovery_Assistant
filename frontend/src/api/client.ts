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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include', // send/receive HTTP-only cookies
    headers: {
      'Content-Type': 'application/json',
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

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

export async function validateSession(): Promise<UserInfo> {
  return request<UserInfo>('/auth/validate')
}
