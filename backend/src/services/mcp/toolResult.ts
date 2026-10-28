import type { CallToolResult } from '@modelcontextprotocol/server'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** An isError tool result the LLM can act on, carrying only the given text. */
export function errorResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true }
}

/**
 * Turns an app tool handler's plain return value into an MCP tool result the LLM can read.
 * A rendered text longer than `maxChars` becomes an isError result rather than a truncated
 * payload silently presented as complete.
 */
export function renderToolResult(value: unknown, maxChars: number): CallToolResult {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  if (text.length > maxChars) {
    return errorResult('The tool returned a result that is too large to deliver.')
  }
  const result: CallToolResult = { content: [{ type: 'text', text }] }
  if (isPlainObject(value)) {
    result.structuredContent = value
  }
  return result
}
