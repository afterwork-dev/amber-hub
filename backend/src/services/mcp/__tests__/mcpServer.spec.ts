import { afterEach, describe, it, expect, vi } from 'vitest'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { AppError } from '../../../errors/AppError'
import { buildMcpServer, type McpDeps, type McpUser } from '../mcpServer'
import type { PublishedTool } from '../toolDeclarationValidator'

const USER: McpUser = { id: 'u1', username: 'alice' }
const ACCEPT = 'application/json, text/event-stream'

function tool(overrides: Partial<PublishedTool> = {}): PublishedTool {
  return {
    appId: 'tool-app',
    name: 'whoami',
    presentedName: 'tool-app_whoami',
    description: 'Reports the caller.',
    inputSchema: { type: 'object', additionalProperties: false },
    validate: () => ({ valid: true, errors: [] }),
    ...overrides,
  }
}

const echoTool = tool({
  name: 'echo',
  presentedName: 'tool-app_echo',
  description: 'Echoes text.',
  inputSchema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
})

function harness(deps: Partial<McpDeps> = {}) {
  const full: McpDeps = {
    listTools: () => [echoTool, tool()],
    callTool: vi.fn(async () => ({ calledBy: 'alice' })),
    ...deps,
  }
  const handler = createMcpHandler(() => buildMcpServer(USER, full), { responseMode: 'json' })
  const rpc = async (body: unknown) => {
    const res = await handler.fetch(
      new Request('http://x/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: ACCEPT },
        body: JSON.stringify(body),
      }),
    )
    const line = (await res.text()).split('\n').find((l) => l.startsWith('data:'))
    return JSON.parse(line!.slice('data:'.length).trim())
  }
  return { rpc, callTool: full.callTool, close: () => handler.close() }
}

describe('buildMcpServer via the MCP handler', () => {
  it('answers initialize with the server identity and instructions', async () => {
    const h = harness()
    const res = await h.rpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'c', version: '0' },
      },
    })
    expect(res.result.serverInfo).toEqual({ name: 'amber-hub', version: '1.0.0' })
    expect(res.result.capabilities.tools).toBeTruthy()
    expect(res.result.instructions.length).toBeGreaterThan(0)
    await h.close()
  })

  it('lists tools under their presented names, annotations only where declared', async () => {
    const h = harness()
    const res = await h.rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    const tools = res.result.tools as Array<Record<string, unknown>>
    expect(tools.map((t) => t.name)).toEqual(['tool-app_echo', 'tool-app_whoami'])
    expect(tools[0]?.annotations).toEqual({ readOnlyHint: true })
    expect(tools[1]).not.toHaveProperty('annotations')
    await h.close()
  })

  it('calls a tool as the bound user and renders an object result', async () => {
    const callTool = vi.fn(async () => ({ calledBy: 'alice' }))
    const h = harness({ callTool })
    const res = await h.rpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'tool-app_echo', arguments: { text: 'hi' } },
    })
    expect(callTool).toHaveBeenCalledWith('tool-app', 'echo', { text: 'hi' }, USER)
    expect(res.result.structuredContent).toEqual({ calledBy: 'alice' })
    expect(res.result.content[0].text).toContain('calledBy')
    await h.close()
  })

  it('never lets tool-call params override the bound user identity', async () => {
    const callTool = vi.fn(async () => ({}))
    const h = harness({ callTool })
    await h.rpc({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'tool-app_whoami', arguments: {}, user: { id: 'evil', username: 'mallory' } },
    })
    expect(callTool).toHaveBeenCalledWith('tool-app', 'whoami', {}, USER)
    await h.close()
  })

  it('rejects invalid input as an isError result without calling the tool', async () => {
    const callTool = vi.fn(async () => ({}))
    const h = harness({ callTool })
    const res = await h.rpc({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'tool-app_echo', arguments: {} },
    })
    expect(res.result.isError).toBe(true)
    expect(callTool).not.toHaveBeenCalled()
    await h.close()
  })

  it('returns a JSON-RPC error for an unknown tool', async () => {
    const h = harness()
    const res = await h.rpc({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'nope', arguments: {} },
    })
    expect(res.error.code).toBe(-32602)
    await h.close()
  })
})

describe('tool-call failures map to self-correcting isError results', () => {
  afterEach(() => vi.restoreAllMocks())

  async function callWhoamiRejecting(error: unknown) {
    const callTool = vi.fn(async () => {
      throw error
    })
    const h = harness({ callTool })
    const res = await h.rpc({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'tool-app_whoami', arguments: {} },
    })
    await h.close()
    return res.result
  }

  it.each([
    'APP_BACKEND_CRASHED',
    'APP_BACKEND_NOT_DECLARED',
    'APP_NOT_FOUND',
    'APP_TOOL_NOT_FOUND',
  ])('reports "currently unavailable" for %s', async (code) => {
    const result = await callWhoamiRejecting(new AppError(code as never, 'internal', 502))
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe(
      'Tool tool-app_whoami is currently unavailable: its app backend is not running.',
    )
  })

  it('reports "timed out" for APP_BACKEND_TIMEOUT', async () => {
    const result = await callWhoamiRejecting(new AppError('APP_BACKEND_TIMEOUT', 'internal', 504))
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Tool tool-app_whoami timed out.')
  })

  it('reports "failed" and logs for a handler error without leaking its message', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await callWhoamiRejecting(
      new AppError('APP_BACKEND_HANDLER_ERROR', 'secret handler detail', 502),
    )
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Tool tool-app_whoami failed.')
    expect(result.content[0].text).not.toContain('secret handler detail')
    expect(error).toHaveBeenCalledWith('Tool tool-app_whoami failed:', expect.anything())
  })

  it('reports "failed" and logs for an unexpected non-AppError rejection', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await callWhoamiRejecting(new Error('boom'))
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Tool tool-app_whoami failed.')
    expect(error).toHaveBeenCalled()
  })

  it('rejects a result larger than the cap as an isError result', async () => {
    process.env.MCP_TOOL_RESULT_MAX_CHARS = '20'
    const callTool = vi.fn(async () => 'x'.repeat(50))
    const h = harness({ callTool })
    const res = await h.rpc({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: { name: 'tool-app_whoami', arguments: {} },
    })
    await h.close()
    delete process.env.MCP_TOOL_RESULT_MAX_CHARS
    expect(res.result.isError).toBe(true)
    expect(res.result.content[0].text).toContain('too large')
  })
})
