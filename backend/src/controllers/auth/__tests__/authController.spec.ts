import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { loginHandler, refreshHandler, registerHandler } from '../authController'
import * as userService from '../../../services/user/userService'
import * as tokenService from '../../../services/auth/tokenService'
import type { User } from '../../../services/user/user.types'

const user: User = {
  id: 'user-123',
  username: 'alice',
  passwordHash: 'hashed-password',
  createdAt: new Date(),
}

function createReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  }
  return reply as unknown as FastifyReply
}

describe('registerHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('issues an access and refresh token and returns them alongside the username', async () => {
    vi.spyOn(userService, 'register').mockResolvedValue(user)
    vi.spyOn(tokenService, 'issueAccessToken').mockReturnValue({
      token: 'jwt-token',
      expiresIn: '15m',
    })
    vi.spyOn(tokenService, 'issueRefreshToken').mockReturnValue({
      refreshToken: 'refresh-token',
      refreshExpiresIn: '7d',
    })

    const request = {
      body: { username: 'alice', password: 'correct-horse' },
    } as FastifyRequest<{ Body: userService.RegisterUserInput }>
    const reply = createReply()

    await registerHandler(request, reply)

    expect(tokenService.issueAccessToken).toHaveBeenCalledWith(user)
    expect(tokenService.issueRefreshToken).toHaveBeenCalledWith(user)
    expect(reply.header).toHaveBeenCalledWith(
      'set-cookie',
      'accessToken=jwt-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=900',
    )
    expect(reply.status).toHaveBeenCalledWith(201)
    expect(reply.send).toHaveBeenCalledWith({
      success: true,
      data: {
        username: 'alice',
        token: 'jwt-token',
        expiresIn: '15m',
        refreshToken: 'refresh-token',
        refreshExpiresIn: '7d',
      },
      error: null,
    })
  })
})

describe('loginHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('issues an access and refresh token and returns them alongside the username', async () => {
    vi.spyOn(userService, 'authenticate').mockResolvedValue(user)
    vi.spyOn(tokenService, 'issueAccessToken').mockReturnValue({
      token: 'jwt-token',
      expiresIn: '15m',
    })
    vi.spyOn(tokenService, 'issueRefreshToken').mockReturnValue({
      refreshToken: 'refresh-token',
      refreshExpiresIn: '7d',
    })

    const request = {
      body: { username: 'alice', password: 'correct-horse' },
    } as FastifyRequest<{ Body: userService.LoginUserInput }>
    const reply = createReply()

    await loginHandler(request, reply)

    expect(reply.header).toHaveBeenCalledWith(
      'set-cookie',
      'accessToken=jwt-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=900',
    )
    expect(reply.status).toHaveBeenCalledWith(200)
    expect(reply.send).toHaveBeenCalledWith({
      success: true,
      data: {
        username: 'alice',
        token: 'jwt-token',
        expiresIn: '15m',
        refreshToken: 'refresh-token',
        refreshExpiresIn: '7d',
      },
      error: null,
    })
  })
})

describe('refreshHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('verifies the refresh token, then issues a fresh access+refresh pair for that user', async () => {
    vi.spyOn(tokenService, 'verifyRefreshToken').mockResolvedValue(user)
    vi.spyOn(tokenService, 'issueAccessToken').mockReturnValue({
      token: 'new-jwt-token',
      expiresIn: '15m',
    })
    vi.spyOn(tokenService, 'issueRefreshToken').mockReturnValue({
      refreshToken: 'new-refresh-token',
      refreshExpiresIn: '7d',
    })

    const request = {
      body: { refreshToken: 'old-refresh-token' },
    } as FastifyRequest<{ Body: { refreshToken: string } }>
    const reply = createReply()

    await refreshHandler(request, reply)

    expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('old-refresh-token')
    expect(tokenService.issueAccessToken).toHaveBeenCalledWith(user)
    expect(tokenService.issueRefreshToken).toHaveBeenCalledWith(user)
    expect(reply.header).toHaveBeenCalledWith(
      'set-cookie',
      'accessToken=new-jwt-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=900',
    )
    expect(reply.status).toHaveBeenCalledWith(200)
    expect(reply.send).toHaveBeenCalledWith({
      success: true,
      data: {
        username: 'alice',
        token: 'new-jwt-token',
        expiresIn: '15m',
        refreshToken: 'new-refresh-token',
        refreshExpiresIn: '7d',
      },
      error: null,
    })
  })
})
