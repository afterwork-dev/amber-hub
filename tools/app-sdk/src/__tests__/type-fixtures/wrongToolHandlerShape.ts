import type { AppBackendInit } from '../../backend'

const init: AppBackendInit = (appManager) => {
  appManager.registerTool<{ text: string }>({
    name: 'echo',
    description: 'Echoes text back.',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    // @ts-expect-error - handler receives a single ToolContext, never a second parameter
    handler: (context, extra: string) => ({ text: context.input.text, extra }),
  })

  appManager.registerTool<{ text: string }>({
    name: 'shout',
    description: 'Uppercases text.',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    // @ts-expect-error - input.text is a string; multiplying it is not valid
    handler: (context) => context.input.text * 2,
  })
}

void init
