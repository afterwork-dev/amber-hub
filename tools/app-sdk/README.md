# @amber-hub/app-sdk

TypeScript types (and a small call helper) for building an amber-hub App, so you never have
to hand-transcribe the App-Hub interface from [developer.md](../../developer.md) prose.

This is the **only** Hub-side package an App may import. Everything else — the Hub's
backend, frontend, and `@amber-hub/shared` — is off limits, and lint enforces it. That
boundary is what keeps an App extractable into its own repository later.

## Using it

Apps live under `apps/` in this repo, so the SDK is a workspace dependency — no install
from a registry:

```json
{
  "name": "@amber-apps/weather-widget",
  "private": true,
  "dependencies": {
    "@amber-hub/app-sdk": "*"
  }
}
```

Then run `npm install` at the repo root to link it.

## Declaring your App

Every App needs a `manifest.json` at its workspace root, whose `id` matches the directory
name under `apps/`:

```json
{
  "id": "widget-app",
  "displayName": "Widget App",
  "version": "1.0.0",
  "frontend": { "entry": "frontend/index.js" },
  "backend": { "entry": "backend/index.js" }
}
```

`frontend`/`backend` are each optional and independent — declare either, both, or neither.
The `entry` paths are relative to your **built** package (`dist/`), so they point at your
build output, not your TypeScript sources. See
[developer.md](../../developer.md#the-build-contract) for the build contract.

## Writing your frontend entry

```ts
// frontend/index.ts
import type { AppMount, AppUnmount } from '@amber-hub/app-sdk/frontend'

export const mount: AppMount = (root, context) => {
  const el = document.createElement('div')
  el.textContent = `Hello from ${context.appId}`
  root.appendChild(el)
}

export const unmount: AppUnmount = (root) => {
  root.replaceChildren()
}
```

`AppMount`/`AppUnmount` match the real Hub's `mount(root, context)` / `unmount(root)`
invocation exactly — a wrong signature is a compile error in your editor, not a mystery
once the App is running. See
[developer.md](../../developer.md#the-mountunmount-contract)
for the full type reference.

## Writing your backend entry

```ts
// backend/index.ts
import type { AppBackendInit } from '@amber-hub/app-sdk/backend'

const init: AppBackendInit = (appManager) => {
  appManager.registerRoute('GET', '/whoami', (context) => {
    return { calledBy: context.user.username }
  })
}

export default init
```

`AppBackendInit`/`AppManager`/`RouteContext` match the real Hub's backend contract exactly.
See [developer.md](../../developer.md#the-entry-module-contract)
for the full type reference.

## Storing data

Your backend gets durable storage through `appManager.storage` — three functions, and the
only way an App persists data. You pass a **collection name** you choose plus the data or
filter; the Hub handles everything else.

```ts
const init: AppBackendInit = (appManager) => {
  appManager.registerRoute('POST', '/notes', async (context) => {
    // No id → insert. The Hub assigns and returns one.
    const note = await appManager.storage.store('notes', { text: 'hello', done: false })
    return { note }                                    // { id: '…', text: 'hello', done: false }
  })

  appManager.registerRoute('GET', '/notes', async () => ({
    notes: await appManager.storage.query('notes', { done: false }),
  }))

  appManager.registerRoute('PUT', '/notes', async (context) => ({
    // With an id → full replace of that record.
    note: await appManager.storage.store('notes', { id: context.query.id, text: 'updated' }),
  }))

  appManager.registerRoute('DELETE', '/notes', async (context) => {
    await appManager.storage.remove('notes', context.query.id)
    return {}
  })
}
```

What the Hub guarantees, and what it expects from you:

- **Your data is yours.** Another App using the very same collection name sees entirely
  different data. You never learn where records are physically stored, and no collection
  name you can spell reaches outside your own App.
- **No setup, no lifecycle.** You never create, drop, or rename a collection. It starts
  existing the first time `store` succeeds; before that `query` simply returns `[]`.
- **The Hub owns ids.** `store` without an `id` inserts and returns the new `id`; `store`
  with an `id` replaces that record, or rejects with `APP_STORAGE_RECORD_NOT_FOUND` if it
  no longer exists. You cannot pick your own ids.
- **Collection names** must match `^[a-z][a-z0-9-]{0,39}$` — lowercase, starting with a
  letter, hyphens allowed.
- **Values must be JSON-safe.** `Date`, `Map`, class instances and `undefined` do not
  survive the trip: a `Date` arrives as an ISO string, `undefined` fields vanish, `NaN`
  becomes `null`. Store ISO strings and plain objects instead.
- **Filters are equality-only** on top-level fields (`id` included). Keys starting with `$`
  or containing `.` are rejected.

Every failure rejects with a typed `AppStorageError`, so branch on `errorCode`, never on
message text:

```ts
import { isAppStorageError } from '@amber-hub/app-sdk/backend'

try {
  await appManager.storage.remove('notes', id)
} catch (error) {
  if (isAppStorageError(error) && error.errorCode === 'APP_STORAGE_RECORD_NOT_FOUND') {
    return { alreadyGone: true }
  }
  throw error
}
```

The codes are `APP_STORAGE_INVALID_COLLECTION_NAME`, `APP_STORAGE_INVALID_RECORD`,
`APP_STORAGE_INVALID_FILTER`, `APP_STORAGE_RECORD_NOT_FOUND`, and
`APP_STORAGE_UNAVAILABLE`. A storage error you don't catch reaches the HTTP caller as the
usual `APP_BACKEND_HANDLER_ERROR`. See
[developer.md](../../developer.md#storing-data)
for the full reference.

## Publishing MCP tools

Your backend can offer some of its functionality as [MCP](https://modelcontextprotocol.io)
tools, so users can drive your App from their own LLM client. You declare a tool with
`appManager.registerTool` the same way you register a route — the Hub owns the MCP endpoint,
protocol, authentication, input validation and error handling; you only write the handler.

```ts
const init: AppBackendInit = (appManager) => {
  appManager.registerTool<{ limit?: number }>({
    name: 'list-notes',
    description: "Lists the caller's notes, newest first.",
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 100 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    handler: async ({ user, input }) => {
      const notes = await appManager.storage.query('notes', { userId: user.id })
      return { notes: notes.slice(0, input.limit ?? 20) }
    },
  })
}
```

What the Hub guarantees, and what it expects from you:

- **`context.user` is the API key's owner**, Hub-verified — the same identity a route handler
  gets. Your handler never sees a credential.
- **`context.input` is already valid.** The Hub validates the client's arguments against your
  `inputSchema` (JSON Schema 2020-12) before calling you; invalid input never reaches the
  handler.
- **Return a plain value**, exactly like a route handler. The Hub renders a string as text and
  any other value as pretty-printed JSON (plus `structuredContent` for objects).
- **Clients see `<app-id>_<tool>`.** Names must match `^[A-Za-z0-9_-]+$`, be unique within your
  App, and stay within 64 characters once prefixed.
- **`annotations`** are optional hints forwarded to clients unchanged: `readOnlyHint` (the tool
  only reads) and `destructiveHint` (it may delete or overwrite). Omit them to make no claim.
- **A throwing handler** surfaces to the client as a generic "Tool … failed." — your error's
  message and stack are logged by the Hub, never sent to the client.
- **Invalid declarations are dropped, not fatal.** A tool with a bad name, a non-object schema,
  or an unknown annotation is skipped and logged (`Rejected tool "<name>" of app "<id>": …`);
  your other tools and routes keep working.

Users connect their client with an API key; see the Hub's README "Connect an LLM client (MCP)".
Full reference: [developer.md](../../developer.md#publishing-mcp-tools).

## Calling your own backend from your frontend

```ts
import { callAppApi, type AppApiError } from '@amber-hub/app-sdk'

try {
  const { calledBy } = await callAppApi<{ calledBy: string }>('widget-app', 'GET', '/whoami')
  console.log(calledBy)
} catch (err) {
  const apiError = err as AppApiError
  console.error(apiError.errorCode, apiError.errorMessage)
}
```

`callAppApi` builds the `{method} /app-api/{appId}/{path}` request, unwraps the response
envelope, and either resolves with your handler's result directly or rejects with a typed
`AppApiError` carrying the same `errorCode` the real Hub returns — no manual envelope
parsing. See [developer.md](../../developer.md#calling-your-backend-from-your-own-frontend)
for the full behavior table.

## Seeing your App run

There is no separate preview tool: you develop against the real Hub.

```sh
npm run app:dev -- <app-id>
```

rebuilds your App and re-syncs it into the Hub's app storage on every change, while
`npm run dev:backend` and `npm run dev:frontend` serve the Hub itself. Frontend changes
appear on a browser refresh; backend changes need a `dev:backend` restart. Full workflow in
[developer.md](../../developer.md#the-development-loop).

## Example

[`apps/treasury`](../../apps/treasury) is a complete, working App with both a frontend and a
backend — the reference for everything above.

## Versioning

`SDK_VERSION` (exported from the package root) reports the SDK's version. See
[CHANGELOG.md](./CHANGELOG.md) for which documented App-Hub interface revision each version
targets.
