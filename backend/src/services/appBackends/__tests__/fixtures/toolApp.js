export default function init(appManager) {
  appManager.registerRoute('GET', '/whoami', (context) => ({ calledBy: context.user.username }))

  appManager.registerTool({
    name: 'whoami',
    description: 'Returns the calling user name.',
    inputSchema: { type: 'object', additionalProperties: false },
    handler: (context) => ({ calledBy: context.user.username }),
  })

  appManager.registerTool({
    name: 'echo',
    description: 'Echoes the given text.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    handler: (context) => context.input.text,
  })

  appManager.registerTool({
    name: 'fail',
    description: 'Always throws.',
    inputSchema: { type: 'object', additionalProperties: false },
    handler: () => {
      throw new Error('internal tool detail that must not leak')
    },
  })

  appManager.registerTool({
    name: 'slow',
    description: 'Resolves after a delay.',
    inputSchema: { type: 'object', additionalProperties: false },
    handler: () => new Promise((resolve) => setTimeout(() => resolve({ done: true }), 500)),
  })
}
