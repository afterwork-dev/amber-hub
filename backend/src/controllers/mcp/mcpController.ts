import type { FastifyReply, FastifyRequest } from 'fastify'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { buildMcpServer } from '../../services/mcp/mcpServer'

const MCP_ENDPOINT_URL = 'http://amber-hub.local/mcp'
const FORWARDED_HEADERS = ['accept', 'mcp-protocol-version', 'mcp-session-id']

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers({ 'content-type': 'application/json' })
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers[name]
    if (typeof value === 'string') {
      headers.set(name, value)
    }
  }
  if (!headers.has('accept')) {
    headers.set('accept', 'application/json, text/event-stream')
  }
  return new Request(MCP_ENDPOINT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(request.body ?? null),
  })
}

async function sendWebResponse(reply: FastifyReply, response: Response): Promise<void> {
  const body = await response.text()
  reply.status(response.status)
  const contentType = response.headers.get('content-type')
  if (contentType) {
    reply.header('content-type', contentType)
  }
  reply.send(body.length > 0 ? body : undefined)
}

export async function mcpHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.user!
  const handler = createMcpHandler(() => buildMcpServer(user), { responseMode: 'json' })
  try {
    const response = await handler.fetch(toWebRequest(request))
    await sendWebResponse(reply, response)
  } finally {
    await handler.close()
  }
}
