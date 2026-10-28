import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ToolDeclaration } from '../../appBackends/ipcProtocol'
import { validateToolDeclarations } from '../toolDeclarationValidator'

function declaration(overrides: Partial<ToolDeclaration> = {}): ToolDeclaration {
  return {
    name: 'do-thing',
    description: 'Does a thing.',
    inputSchema: { type: 'object', additionalProperties: false },
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateToolDeclarations', () => {
  it('turns a valid declaration into a PublishedTool with a compiled validate function', () => {
    const [tool, ...rest] = validateToolDeclarations('treasury', [declaration()])

    expect(rest).toEqual([])
    expect(tool).toMatchObject({
      appId: 'treasury',
      name: 'do-thing',
      presentedName: 'treasury_do-thing',
      description: 'Does a thing.',
      inputSchema: { type: 'object', additionalProperties: false },
    })
    expect(typeof tool!.validate).toBe('function')
    expect(tool!.validate({}).valid).toBe(true)
    expect(tool).not.toHaveProperty('annotations')
  })

  it('keeps annotations only when the declaration carries them', () => {
    const [tool] = validateToolDeclarations('treasury', [
      declaration({ annotations: { readOnlyHint: true } }),
    ])

    expect(tool!.annotations).toEqual({ readOnlyHint: true })
  })

  it('drops each invalid declaration and logs the app id, tool name, and a reason', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const declarations: ToolDeclaration[] = [
      declaration({ name: '' }),
      declaration({ name: 'has space' }),
      declaration({ name: 'has.dot' }),
      declaration({ name: 'has/slash' }),
      declaration({ name: 'ok' }),
      declaration({ name: 'ok' }),
      declaration({ name: 'x'.repeat(64) }),
      declaration({ description: '' }),
      declaration({ description: 123 as unknown as string }),
      { name: 'no-schema', description: 'x' } as unknown as ToolDeclaration,
      declaration({ inputSchema: [] as unknown as Record<string, unknown> }),
      declaration({ inputSchema: { type: 'array' } }),
      declaration({ annotations: { readOnlyHint: 'yes' as unknown as boolean } }),
      declaration({ annotations: { bogus: true } as Record<string, unknown> }),
    ]

    const published = validateToolDeclarations('treasury', declarations)

    expect(published.map((tool) => tool.name)).toEqual(['ok'])
    for (const call of errorSpy.mock.calls) {
      expect(String(call[0])).toContain('treasury')
    }
    expect(errorSpy).toHaveBeenCalledTimes(declarations.length - 1)
  })

  it('rejects a presented name longer than 64 characters', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // 'treasury_' is 9 chars, so a 56-char name is the limit; 57 pushes it to 66.
    const published = validateToolDeclarations('treasury', [declaration({ name: 'a'.repeat(57) })])

    expect(published).toEqual([])
    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it('tolerates an x-mcp-header keyword inside a property schema', () => {
    const published = validateToolDeclarations('treasury', [
      declaration({
        inputSchema: {
          type: 'object',
          properties: { region: { type: 'string', 'x-mcp-header': 'Region' } },
        },
      }),
    ])

    expect(published.map((tool) => tool.name)).toEqual(['do-thing'])
  })
})
