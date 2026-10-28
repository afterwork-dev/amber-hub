import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ApiResponse } from '@amber-hub/shared'
import {
  authenticate,
  register,
  type LoginUserInput,
  type RegisterUserInput,
} from '../../services/user/userService'
import {
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  type IssuedToken,
} from '../../services/auth/tokenService'
import { buildAccessTokenCookie } from '../../utils/cookies'

interface SessionResponse {
  username: string
  token: string
  expiresIn: string
  refreshToken: string
  refreshExpiresIn: string
}

export interface RefreshInput {
  refreshToken: string
}

function isHttpsRequest(request: FastifyRequest): boolean {
  return request.protocol === 'https' || request.headers?.['x-forwarded-proto'] === 'https'
}

function setAccessTokenCookie(request: FastifyRequest, reply: FastifyReply, issued: IssuedToken): void {
  reply.header(
    'set-cookie',
    buildAccessTokenCookie(issued.token, issued.expiresIn, isHttpsRequest(request)),
  )
}

export async function registerHandler(
  request: FastifyRequest<{ Body: RegisterUserInput }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await register(request.body)
  const issuedToken = issueAccessToken(user)
  const { refreshToken, refreshExpiresIn } = issueRefreshToken(user)

  setAccessTokenCookie(request, reply, issuedToken)
  const body: ApiResponse<SessionResponse> = {
    success: true,
    data: {
      username: user.username,
      token: issuedToken.token,
      expiresIn: issuedToken.expiresIn,
      refreshToken,
      refreshExpiresIn,
    },
    error: null,
  }
  reply.status(201).send(body)
}

export async function loginHandler(
  request: FastifyRequest<{ Body: LoginUserInput }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await authenticate(request.body)
  const issuedToken = issueAccessToken(user)
  const { refreshToken, refreshExpiresIn } = issueRefreshToken(user)

  setAccessTokenCookie(request, reply, issuedToken)
  const body: ApiResponse<SessionResponse> = {
    success: true,
    data: {
      username: user.username,
      token: issuedToken.token,
      expiresIn: issuedToken.expiresIn,
      refreshToken,
      refreshExpiresIn,
    },
    error: null,
  }
  reply.status(200).send(body)
}

export async function refreshHandler(
  request: FastifyRequest<{ Body: RefreshInput }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await verifyRefreshToken(request.body?.refreshToken)
  const issuedToken = issueAccessToken(user)
  const { refreshToken, refreshExpiresIn } = issueRefreshToken(user)

  setAccessTokenCookie(request, reply, issuedToken)
  const body: ApiResponse<SessionResponse> = {
    success: true,
    data: {
      username: user.username,
      token: issuedToken.token,
      expiresIn: issuedToken.expiresIn,
      refreshToken,
      refreshExpiresIn,
    },
    error: null,
  }
  reply.status(200).send(body)
}
