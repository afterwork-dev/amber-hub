import { httpPost } from './httpClient'

export interface LoginResult {
  username: string
  token: string
  expiresIn: string
  refreshToken: string
  refreshExpiresIn: string
}

export type RegisterResult = LoginResult

export async function register(username: string, password: string): Promise<RegisterResult> {
  return httpPost<RegisterResult>('/auth/register', { username, password })
}

export async function login(username: string, password: string): Promise<LoginResult> {
  return httpPost<LoginResult>('/auth/login', { username, password })
}

export async function refresh(refreshToken: string): Promise<LoginResult> {
  return httpPost<LoginResult>('/auth/refresh', { refreshToken })
}
