# Building an App for Amber Hub

Apps live inside this repository, as workspace packages under `apps/`. This guide covers
everything you need to create one — with or without its own frontend — and see it running
in the Hub.

Apps are architecturally *external* residents: they may import only
[`@amber-hub/app-sdk`](tools/app-sdk/README.md) from the Hub side, and they talk to the Hub
exclusively through the contracts documented below. That boundary is enforced by lint, and
it is what keeps any App extractable into its own repository later.

## App workspace structure

An App is a workspace package under `apps/<app-id>/` with a `manifest.json`:

```text
apps/weather-widget/
├── package.json      # private workspace package with a "build" script
├── manifest.json     # the App's identity and entry points
├── frontend/         # your source — any layout you like
└── backend/
```

`manifest.json`:

```json
{
  "id": "weather-widget",
  "displayName": "Weather Widget",
  "version": "1.0.0"
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Matches `^[a-z0-9-]+$`. **Must equal the directory name** under `apps/`. Becomes the App's identity in the Hub. |
| `displayName` | yes | Shown in the Hub's navigation drawer and App view page. |
| `version` | yes | Free-form non-empty string. |
| `frontend` | no | See [Adding a frontend](#adding-a-frontend) — omit entirely for a backend-only App. |
| `backend` | no | See [Adding a backend](#adding-a-backend) — omit entirely for a frontend-only App. |

`frontend` and `backend` are independent — declare either, both, or neither.

### The build contract

Your `package.json` must define a `build` script that produces a **self-contained App
package** in `dist/`:

- `dist/manifest.json` at the root
- every file referenced by `frontend.entry` / `backend.entry`, plus any assets they load
- all dependencies **bundled** — `dist/` is copied as-is into the Hub's app storage, and
  there is no install step at the destination

The repo's build then validates every App's `dist/` and copies it into the Hub's app
storage, where the Hub discovers it exactly as it discovers any other App:

```sh
npm run build
```

A broken manifest, a missing entry file, an entry that escapes the package, or an
`id` that doesn't match the directory name **fails the build**, naming the App and the
problem. Nothing is written to app storage unless every App validates.

### The development loop

```sh
npm run app:dev -- weather-widget
```

This rebuilds your App and re-syncs it into app storage on every source change, so with the
Hub running (`npm run dev:backend` and `npm run dev:frontend`):

| You edit | To see it |
|---|---|
| frontend source | refresh the browser |
| backend source | restart `npm run dev:backend` |

The backend restart is required because the Hub starts each App's backend as its own OS
process when the Hub itself starts; a running process keeps its old code until then.

## Minimal example

The smallest valid frontend-bearing App:

`apps/widget-app/package.json`:

```json
{
  "name": "@amber-apps/widget-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "rm -rf dist && mkdir -p dist && cp manifest.json dist/ && cp -R frontend dist/"
  }
}
```

`apps/widget-app/manifest.json`:

```json
{
  "id": "widget-app",
  "displayName": "Widget App",
  "version": "1.0.0",
  "frontend": { "entry": "frontend/index.js" }
}
```

`apps/widget-app/frontend/index.js`:

```js
export function mount(root) {
  const el = document.createElement('div')
  el.textContent = 'Hello from Widget App'
  root.appendChild(el)
}

export function unmount(root) {
  root.replaceChildren()
}
```

Then register the new workspace and build:

```sh
npm install
```

```sh
npm run build
```

Select "Widget App" from the Hub's navigation drawer — you should see "Hello from Widget
App" rendered on the App view page. See [`apps/treasury`](apps/treasury) for a working
example that has both a frontend and a backend.

## Adding a frontend

Declare a `frontend` object with an `entry` pointing at a JavaScript file **inside your
built package**:

```json
{
  "id": "weather-widget",
  "displayName": "Weather Widget",
  "version": "1.0.0",
  "frontend": { "entry": "frontend/index.js" }
}
```

- `entry` is a path relative to the package root (i.e. relative to `dist/` after your build
  runs). The file must exist and must resolve to a location *inside* the package — a missing
  or escaping (`../`) entry fails the build.
- There is no fixed directory convention — name and organize your build output however you
  like, as long as `entry` points at it.

### Packaging your bundle

Your entry file is loaded by the Hub via a direct `import()` of its real, served URL — **not**
through a `blob:` URL — so genuine relative `import`s inside it resolve normally. In practice:

- A single self-contained bundle (e.g. a Vite/Rollup "single file" build) is **recommended**
  — fewer round trips, simpler caching — but it is not a hard requirement.
- You may split your frontend across multiple files: `import './helpers.js'` from your entry
  resolves correctly, as does a `<link rel="stylesheet" href="./style.css">` or
  `<img src="./logo.png">` you inject into the DOM at runtime.
- Any file inside your package — referenced by a relative path or by an absolute URL like
  `/resources/weather-widget/frontend/logo.png` — is servable. The Hub doesn't restrict this
  to your declared `entry`.

### The `mount`/`unmount` contract

Your entry file must export two functions:

```ts
export function mount(root: ShadowRoot, context: { appId: string }): void
export function unmount(root: ShadowRoot): void
```

- **`mount(root, context)`** is called once, when a user selects your App from the Hub. `root`
  is an empty native `ShadowRoot` — render your UI into it (e.g. `createApp(MyApp).mount(root)`
  for a Vue app).
- **`unmount(root)`** is called once, before the Hub mounts a different App or when the user
  navigates away. Tear down whatever `mount` created — unmount your framework's app instance,
  clear timers/listeners/watchers — so nothing outlives the visit.
- **`context`** currently only carries `{ appId: string }`. More fields may be added later;
  ignore keys you don't recognize rather than validating the object's exact shape.
- Your module is loaded fresh on every visit to the App view page — don't assume `mount` runs
  only once globally; a user can navigate away and back.

The Hub, in turn, guarantees:

- `mount` is never called twice in a row without an intervening `unmount`, for the same App or
  a different one — at most one App's frontend is mounted at any time.
- The `ShadowRoot` passed to `mount` is empty and exclusive to your App instance; the Hub never
  reads or modifies its contents.
- If `mount` throws, or your entry fails to load, the Hub shows its own fallback error state and
  does not retry automatically.

`@amber-hub/app-sdk` exports these signatures as types (`AppMount`, `AppUnmount`, `AppContext`),
so your own tooling flags a mismatch at compile time.

### Shadow DOM styling

`root` is a native [`ShadowRoot`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot),
not the page's regular DOM. This gives your App's styles genuine isolation in both directions —
the Hub's styles can't leak into your App, and yours can't leak into the Hub or other Apps — but
it means:

- Inject any stylesheets your App needs as children of `root` (an injected `<style>` element, or
  an adopted stylesheet via `root.adoptedStyleSheets`) — **not** into `document.head`. Anything
  added to the real document escapes your App's isolation.
- A `<link rel="stylesheet">` element appended inside `root` works too, and can point at a
  relative or absolute path served under your App's `/resources/.../frontend/*` route.
- Shadow DOM does not isolate JavaScript's global scope — your code still runs in the Hub's
  `window`. Avoid touching global state you don't own.

### Referencing additional static assets

Any file inside your package is reachable at:

```
GET /resources/{appId}/frontend/{path-relative-to-your-package}
```

For example, a file at `frontend/logo.png` in your package is served at
`/resources/weather-widget/frontend/frontend/logo.png`. This route requires an authenticated
Hub session (the browser handles this automatically once a user is logged in) and is the only
way to load any file your bundle needs beyond what a relative `import`/`<link>` already resolves.

## Building a real frontend (e.g. with Vue)

The minimal example above uses plain DOM APIs. For a real UI — components, reactive state, the
works — use your framework of choice, declared as a normal dependency of your App's
`package.json`.

1. Write your entry as a small wrapper that creates and tears down your framework's app instance:

   ```js
   // src/entry.js
   import { createApp, h, ref } from 'vue'

   let appInstance = null

   export function mount(root) {
     const App = {
       setup() {
         const count = ref(0)
         return () =>
           h('div', [
             h('p', `Count: ${count.value}`),
             h('button', { onClick: () => count.value++ }, 'Click me'),
           ])
       },
     }

     const style = document.createElement('style')
     style.textContent = `button { cursor: pointer; }`
     root.appendChild(style)

     const mountPoint = document.createElement('div')
     root.appendChild(mountPoint)

     appInstance = createApp(App)
     appInstance.mount(mountPoint)
   }

   export function unmount() {
     appInstance?.unmount()
     appInstance = null
   }
   ```

2. Build it in Vite's **library mode** — not Vite's normal app mode — pointed at your entry,
   producing a single ES module directly into your package's `dist/`:

   ```js
   // vite.config.js
   import { defineConfig } from 'vite'

   export default defineConfig({
     define: {
       // Required. Vue's distributed build checks process.env.NODE_ENV at runtime and
       // expects the bundler to replace it. Vite does this automatically for its own
       // app-build mode, but NOT for library mode — omit this and your bundle throws
       // `process is not defined` the instant the Hub loads it in the browser.
       'process.env.NODE_ENV': JSON.stringify('production'),
     },
     build: {
       lib: {
         entry: 'src/entry.js',
         formats: ['es'],
         fileName: () => 'index.js',
       },
       outDir: 'dist/frontend',
     },
   })
   ```

3. Make your `build` script run Vite *and* place `manifest.json` alongside its output, so
   `dist/` ends up as a complete package:

   ```json
   {
     "scripts": {
       "build": "vite build && cp manifest.json dist/"
     }
   }
   ```

   with `"frontend": { "entry": "frontend/index.js" }` in your manifest.

This produces one self-contained file with Vue itself bundled in — nothing the Hub needs to
provide at runtime, no CDN. The same `process.env.NODE_ENV` fix applies to any other framework
whose distributed build references it (React, Preact, etc.) — if you hit `process is not defined`
with a different framework, this is almost certainly why.

If your build naturally produces multiple files instead (separate CSS, code-split JS, images),
that's supported too — see [Packaging your bundle](#packaging-your-bundle) above; just make sure
every file your entry needs ends up inside `dist/`.

## Adding a backend

To give your App server-side code, declare a `backend` object with an `entry` pointing at a
Node-executable JavaScript file inside your built package:

```json
{
  "id": "weather-widget",
  "displayName": "Weather Widget",
  "version": "1.0.0",
  "backend": { "entry": "backend/index.js" }
}
```

- `entry` follows the same validation rules as `frontend.entry`: the file must exist in the
  package and must resolve inside it.
- `backend` and `frontend` are validated and run completely independently.
- The Hub starts your backend as its own OS process, isolated from the Hub's own process and
  from every other App's backend. It is started eagerly, for every App with a declared backend,
  whenever the Hub starts. There is no on-demand start.
- Your backend entry must be **fully bundled** — it runs from app storage, which has no
  `node_modules` of its own.

### The entry-module contract

Your entry file's default export is a function that receives an `appManager` and registers one
handler per route your backend needs:

```js
// backend/index.js
export default function init(appManager) {
  appManager.registerRoute('GET', '/greet', (context) => {
    return { message: `Hello, ${context.user.username}!` }
  })
}
```

- The default export is called **once**, when the Hub starts your backend process. It may return
  a `Promise`; the Hub waits for it to resolve before treating your backend as ready.
- It must be a plain ES module — `export default`, not `module.exports`.
- `appManager.registerRoute(method, path, handler)`:
  - `method` — an HTTP method string (`'GET'`, `'POST'`, ...), matched case-insensitively.
  - `path` — an **exact-match** path relative to your App's own call namespace, e.g. `'/greet'`
    answers calls to `/app-api/{your-app-id}/greet`. There are no `:param` segments in v1 —
    register one exact string per distinct path you need.
  - `handler(context)` — called once per matching call. Its return value (any JSON-serializable
    value, sync or via a returned `Promise`) becomes the `data` field of the Hub's response. If it
    throws, the caller gets a generic `APP_BACKEND_HANDLER_ERROR` — your thrown error's own
    message/stack is never exposed to the caller, so ordinary `Error`s are safe to throw for
    control flow.

`context` passed to every handler:

```ts
interface RouteContext {
  user: { id: string; username: string } // the real, Hub-verified caller — always present
  query: Record<string, string>          // parsed query-string parameters
  body: unknown                          // the parsed request body, whatever shape the caller sent
}
```

`context.user` is always the authenticated Hub user who made the call. Your backend never sees or
verifies a raw token itself — there's no way for a call to reach your handler without a valid Hub
session in the first place.

`@amber-hub/app-sdk` exports these shapes as types (`AppBackendInit`, `AppManager`,
`AppRouteHandler`, `RouteContext`).

### Calling your backend from your own frontend

Your App's frontend reaches your backend through:

```
{method} /app-api/{your-app-id}/{path}
```

matching whatever `path` you passed to `registerRoute`. This is same-origin — call it with an
ordinary `fetch()`:

```js
const response = await fetch(`/app-api/weather-widget/greet`)
const { data } = await response.json()
```

or use the SDK's `callAppApi()`, which unwraps the `ApiResponse` envelope and throws a typed
`AppApiError` on failure.

The Hub forwards your identity automatically via the same session the rest of the Hub UI already
uses — **your frontend never attaches or manages a token itself**. Query strings and request
bodies are forwarded to your handler as `context.query`/`context.body` exactly as sent.

### What this API does **not** provide (v1)

- **No direct database access.** `context` carries no database handle, address, or credentials.
  Durable state goes through `appManager.storage` (see [Storing data](#storing-data) below) — that
  is the only persistence path, and the Hub owns everything about it.
- **No path parameters.** Register one exact `path` string per route; there's no `:id`-style
  capture group.
- **No App-to-App calls.** Your backend is only reachable by your own App's frontend, through your
  own `/app-api/{your-app-id}/*` namespace.

### Minimal backend example

A backend that registers a single `/whoami` route:

```js
export default function init(appManager) {
  appManager.registerRoute('GET', '/whoami', (context) => {
    return { calledBy: context.user.username }
  })
}
```

After `npm run build`, calling `GET /app-api/{your-app-id}/whoami` from any authenticated
same-origin context returns:

```json
{ "success": true, "data": { "calledBy": "<your-username>" }, "error": null }
```

### Storing data

Your backend persists data through `appManager.storage`. You pass a collection name you invent
plus the data or filter — the Hub decides where and how it is stored:

```js
export default function init(appManager) {
  appManager.registerRoute('POST', '/notes', async (context) => {
    const note = await appManager.storage.store('notes', { text: context.body.text, done: false })
    return { note } // { id: '65f…', text: '…', done: false } — id assigned by the Hub
  })

  appManager.registerRoute('GET', '/notes', async () => ({
    notes: await appManager.storage.query('notes', { done: false }),
  }))

  appManager.registerRoute('DELETE', '/notes', async (context) => {
    await appManager.storage.remove('notes', context.query.id)
    return {}
  })
}
```

Three functions, and the rules worth internalising:

| | |
|---|---|
| **Isolation** | Your collection names are private. Another App using `notes` gets entirely different data — guaranteed by the Hub, not by convention. |
| **No lifecycle** | Never create or drop a collection. It exists once `store` succeeds; before that, `query` returns `[]`. |
| **Hub-owned ids** | `store` without `id` inserts and returns the new one. `store` with an `id` replaces that record, or fails with `APP_STORAGE_RECORD_NOT_FOUND`. You cannot mint ids. |
| **Names** | `^[a-z][a-z0-9-]{0,39}$` — lowercase, letter-first, hyphens fine. |
| **JSON only** | A `Date` comes back an ISO string, `undefined` fields disappear, `NaN` becomes `null`. Store plain values. |
| **Filters** | Equality on top-level fields (`id` works). No `$` operators, no dotted paths. |

Failures reject with a typed `AppStorageError` carrying an `errorCode` —
`APP_STORAGE_INVALID_COLLECTION_NAME`, `APP_STORAGE_INVALID_RECORD`,
`APP_STORAGE_INVALID_FILTER`, `APP_STORAGE_RECORD_NOT_FOUND`, `APP_STORAGE_UNAVAILABLE` — which
you branch on with the SDK's `isAppStorageError()` guard. **A storage error you don't catch
propagates to the HTTP caller as `APP_BACKEND_HANDLER_ERROR` (502)**, the same as any other
uncaught handler error, so catch the ones you can act on:

```js
import { isAppStorageError } from '@amber-hub/app-sdk/backend'

try {
  await appManager.storage.remove('notes', context.query.id)
} catch (error) {
  if (isAppStorageError(error) && error.errorCode === 'APP_STORAGE_RECORD_NOT_FOUND') {
    return { alreadyGone: true }
  }
  throw error
}
```

Not in v1: aggregations, multi-operation transactions, custom indexes, and per-App quotas.
Deleting an App does not delete its stored data.

## Publishing MCP tools

You can expose some of your App's functionality as [MCP](https://modelcontextprotocol.io) tools
so users drive it from their own LLM client (Claude, Cursor, and the like). You declare a tool
with `appManager.registerTool`, a sibling of `registerRoute`. The Hub owns everything
MCP-facing — the connection, the protocol, authentication, listing tools, validating input, and
mapping failures — so your only job is to register the tool and write its handler.

```js
export default function init(appManager) {
  appManager.registerTool({
    name: 'whoami',
    description: 'Returns the username of the Hub user calling this tool.',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: { readOnlyHint: true },
    handler: (context) => ({ calledBy: context.user.username }),
  })
}
```

A tool declaration has:

- `name` — matches `^[A-Za-z0-9_-]+$` and is unique within your App. Clients see it as
  `<your-app-id>_<name>` (e.g. `treasury_add-entry`), so the whole presented name must stay
  within 64 characters.
- `description` — a non-empty sentence telling the LLM when to use the tool.
- `inputSchema` — a JSON Schema 2020-12 object (`type: 'object'`). The Hub validates the
  client's arguments against it and rejects bad input before your handler runs, so
  `context.input` is always valid.
- `annotations` — optional `{ readOnlyHint?, destructiveHint? }` hints forwarded to clients
  unchanged. Omit them to make no claim; the Hub never defaults them to "read-only".
- `handler(context)` — receives `context.user` (the Hub-verified owner of the API key that made
  the call — never a raw credential) and `context.input` (the validated arguments). Its return
  value is treated exactly like a route handler's: any JSON-serialisable value. The Hub renders
  a string as text and any other value as pretty-printed JSON (objects also as
  `structuredContent`).

Throwing surfaces to the client as a generic `Tool <name> failed.` — your error's message and
stack are logged by the Hub with your app id and tool name, never sent to the caller. A tool
that is slow, unavailable (its backend is not running), or returns an oversized result yields a
distinct, self-correcting error the LLM can act on.

The Hub validates every declaration when your backend reports ready. An invalid one — empty or
malformed `name`, a duplicate within your App, a presented name over 64 characters, an empty
`description`, an `inputSchema` that is not a compilable `type: 'object'` schema, or an
annotation that is not a boolean `readOnlyHint`/`destructiveHint` — is **dropped and logged**
(`Rejected tool "<name>" of app "<app-id>": <reason>`); your remaining tools and all your routes
keep working. Registering a tool never takes your App down.

Users point their client at the Hub's `/mcp` endpoint and authenticate with an API key from
**Settings → API Key**; see the Hub's README section "Connect an LLM client (MCP)".

Not in v1: output schemas, non-text results (images, embedded resources), progress
notifications, and per-user tool visibility — every authenticated user sees every published
tool, and access control stays at the data level (a tool acting as a user reaches only that
user's data).

## Deployment

Apps ship with the Hub. The Docker image build runs the same `npm run build` documented above and
bakes every App's package into the image, so deploying an App update is just deploying the Hub.
There is no upload step and no separate App release cycle.

One consequence worth knowing: adding a new App workspace means adding a matching
`COPY apps/<id>/package.json` line to the `Dockerfile`, alongside the existing ones — the image
build installs dependencies before copying sources, and a missing line fails the build.
