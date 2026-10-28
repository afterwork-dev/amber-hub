export default function init(appManager) {
  appManager.registerRoute('GET', '/ping', () => ({ ok: true }))

  appManager.registerTool({
    name: 'ok',
    description: 'The one valid tool.',
    inputSchema: { type: 'object', additionalProperties: false },
    handler: () => ({ ok: true }),
  })

  appManager.registerTool({
    name: '',
    description: 'Empty name.',
    inputSchema: { type: 'object' },
    handler: () => ({}),
  })

  appManager.registerTool({
    name: 'ok',
    description: 'Duplicate name.',
    inputSchema: { type: 'object' },
    handler: () => ({}),
  })

  appManager.registerTool({
    name: 'array-schema',
    description: 'Non-object schema.',
    inputSchema: { type: 'array' },
    handler: () => ({}),
  })

  appManager.registerTool({
    name: 'bad-annotation',
    description: 'Unknown annotation.',
    inputSchema: { type: 'object' },
    annotations: { bogus: 1 },
    handler: () => ({}),
  })
}
