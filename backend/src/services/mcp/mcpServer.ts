import {
  McpServer,
  fromJsonSchema,
  type CallToolResult,
  type ToolAnnotations,
} from '@modelcontextprotocol/server'
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/server/validators/cf-worker'
import { AppError } from '../../errors/AppError'
import { getMcpToolResultMaxChars } from '../../config/env'
import {
  callTool as defaultCallTool,
  listPublishedTools as defaultListTools,
} from '../appBackends/appBackendManager'
import type { PublishedTool } from './toolDeclarationValidator'
import { errorResult, renderToolResult } from './toolResult'

const UNAVAILABLE_CODES = new Set([
  'APP_BACKEND_CRASHED',
  'APP_BACKEND_NOT_DECLARED',
  'APP_NOT_FOUND',
  'APP_TOOL_NOT_FOUND',
])

/** Maps a failed tool call to a fixed, self-correcting isError result — never the handler's own message. */
function toErrorResult(presentedName: string, error: unknown): CallToolResult {
  if (error instanceof AppError) {
    if (UNAVAILABLE_CODES.has(error.errorCode)) {
      return errorResult(
        `Tool ${presentedName} is currently unavailable: its app backend is not running.`,
      )
    }
    if (error.errorCode === 'APP_BACKEND_TIMEOUT') {
      return errorResult(`Tool ${presentedName} timed out.`)
    }
  }
  console.error(`Tool ${presentedName} failed:`, error)
  return errorResult(`Tool ${presentedName} failed.`)
}

export const SERVER_NAME = 'amber-hub'
export const SERVER_VERSION = '1.0.0'
export const INSTRUCTIONS =
  'Tools are named <app-id>_<tool>. Every call runs as the owner of the API key used to connect; ' +
  'a tool reaches only the data that user could reach through the app itself.'

const validator = new CfWorkerJsonSchemaValidator()

export interface McpUser {
  id: string
  username: string
}

export interface McpDeps {
  listTools: () => PublishedTool[]
  callTool: (appId: string, name: string, input: unknown, user: McpUser) => Promise<unknown>
}

const defaultDeps: McpDeps = { listTools: defaultListTools, callTool: defaultCallTool }

/** Builds a fresh MCP server exposing the published tools, every call bound to `user`. */
export function buildMcpServer(user: McpUser, deps: McpDeps = defaultDeps): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  )

  for (const tool of deps.listTools()) {
    server.registerTool(
      tool.presentedName,
      {
        description: tool.description,
        inputSchema: fromJsonSchema(tool.inputSchema, validator),
        ...(tool.annotations ? { annotations: tool.annotations as ToolAnnotations } : {}),
      },
      async (input) => {
        try {
          const body = await deps.callTool(tool.appId, tool.name, input, user)
          return renderToolResult(body, getMcpToolResultMaxChars())
        } catch (error) {
          return toErrorResult(tool.presentedName, error)
        }
      },
    )
  }

  return server
}
