import type { AppBackendInit } from '../../backend'

const init: AppBackendInit = (appManager) => {
  // @ts-expect-error - a tool definition must include a handler
  appManager.registerTool({
    name: 'no-handler',
    description: 'Missing its handler.',
    inputSchema: { type: 'object' },
  })

  appManager.registerTool({
    name: 'array-input',
    description: 'Declares a non-object input schema.',
    // @ts-expect-error - inputSchema.type must be the literal 'object'
    inputSchema: { type: 'array' },
    handler: () => ({}),
  })

  appManager.registerTool({
    name: 'bad-annotation',
    description: 'Declares an unknown annotation.',
    inputSchema: { type: 'object' },
    // @ts-expect-error - only readOnlyHint and destructiveHint are valid annotations
    annotations: { idempotent: true },
    handler: () => ({}),
  })
}

void init
