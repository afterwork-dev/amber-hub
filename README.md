# Amber Hub

A self-hosted hub for small personal apps. The Hub handles accounts, navigation, storage and an
[MCP](https://modelcontextprotocol.io) endpoint; apps plug in through a small SDK and get their
own frontend, backend and data. It ships with three proof of concept / showcase personal-finance apps: **Treasury**,
**Net Worth** and **Investment Income**.

> [!WARNING]
> **Alpha — pre-MVP and not feature-complete.** Amber Hub is under active development and the
> feature set is still incomplete. Expect breaking changes to the app SDK, the APIs and the
> stored data, with **no migration path** between versions yet. Don't use it for data you can't
> afford to re-enter, and don't expose it to the public internet.

Much of the code was written with AI assistance (Claude Code), using a spec-first workflow and
a large automated test suite. It has not had a thorough human review yet, so read it with that
in mind.

## Status

**Works today**

- Registration, login and session renewal
- App platform: apps as workspaces with their own frontend, backend and storage, built and
  shipped with the Hub ([developer.md](developer.md))
- MCP endpoint with per-user API keys, so an LLM client can read and add data through app tools
- Treasury, Net Worth and Investment Income apps
- Single-container Docker image

**Not there yet**

- Disabling registration, password change/reset, user management
- Data export, backups and schema migrations
- Isolation for app backends (they run as ordinary Node processes; see [Things to know before you host it](#things-to-know-before-you-host-it))
- Installing apps at runtime (apps are built into the image)
- A dashboard with real content
- App Management of adding and removing Apps from an admin UI

## Things to know before you host it

Amber Hub is alpha software and has not had a security review. In particular:

- **Registration is always open.** Anyone who can reach the Hub can create an account. Run it
  on a private network or behind a VPN or an authenticating reverse proxy, not on the public
  internet.
- **App backends are not sandboxed.** Each app backend runs as an ordinary Node.js child process
  of the Hub, with the Hub's permissions. Only run apps whose code you trust.
- **`JWT_SECRET` protects every session.** Use a long random value and keep it out of version
  control.
- **MongoDB has no authentication by default.** Don't publish its port; the provided stack keeps
  it on the internal Docker network.
- **API keys act as their owner.** An MCP client holding a key can read and change everything
  that user can through the apps' tools. Delete keys you no longer use.

## Development

A monorepo with an independently runnable `backend/` (Fastify) and `frontend/` (Vue 3 + Vuetify), plus a `shared/` package for types used by both.

## Prerequisites

- Node.js 24 LTS (the frontend tests need Node 22 or newer)
- npm (ships with Node; used for workspace install)
- A MongoDB instance reachable from the backend (used for user registration; see below)
- Docker, only if deploying via the single-container option below

## Setup

From the repository root:

```sh
npm install
```

This installs dependencies for `frontend/`, `backend/`, `shared/`, `tools/*`, and every app under `apps/*` via npm workspaces in one pass.

## Run locally (frontend and backend as separate processes)

In two terminals:

```sh
npm run dev:backend
npm run dev:frontend
```

The backend listens on `http://localhost:3000` and exposes its API under `/api/...`; the frontend dev server listens on `http://localhost:5173`.

Both ports are configurable via environment variables, with no source changes:

```sh
PORT=4000 npm run dev:backend
FRONTEND_PORT=6000 VITE_API_BASE_URL=http://localhost:4000/api npm run dev:frontend
```

`VITE_API_BASE_URL` is also how the frontend's backend target is configured (defaults to `http://localhost:3000/api`). It includes the `/api` prefix — every frontend service builds its requests as `${VITE_API_BASE_URL}/<resource>`, so this is the one place that prefix lives.

Each package has a `.env.example` documenting these (`backend/.env.example`, `frontend/.env.example`). Copy each to `.env` in its own package directory — `npm run dev:backend`/`npm run dev:frontend` both load their `.env` automatically (the backend via Node's `--env-file-if-exists` flag, the frontend via Vite).

`MONGODB_URI` is required — the backend fails fast at startup if it's unset. Start a local MongoDB with Docker, put its URI in `backend/.env`, then run the backend normally:

```sh
docker run --rm -p 27017:27017 mongo:7
cp backend/.env.example backend/.env   # already points at mongodb://localhost:27017/amber-hub
npm run dev:backend
```

`JWT_SECRET` is also required — the backend fails fast at startup if it's unset; it signs the JWTs issued by `POST /api/auth/login`. `JWT_EXPIRES_IN` is optional and controls how long an issued token stays valid (a `jsonwebtoken`-style duration string, e.g. `15m`, `1h` — defaults to `15m`). Both are documented in `backend/.env.example`. The token is never persisted server-side (no database row, no session store) — it's verified purely by signature and expiry.

Installed apps live in `backend/apps-data/`, one subfolder per app named after its manifest `id`. It's derived build output that `npm run build` writes and reconciles, and the Hub resolves the location from the backend package itself, so it's identical in local development and in the Docker image.

## Validate: user registration

1. With the backend, frontend, and MongoDB all running, open `http://localhost:5173/register`.
2. Enter a unique username (3-30 letters/numbers/underscores), a password (8+ characters), and a matching confirmation, then submit. Expect a success message.
3. Repeat with the same username — expect a "username already taken" message and no new account created.

## Apps

Apps live in this repo under `apps/*`, one workspace package each, and ship with the Hub.

```sh
npm run build              # builds every app and syncs it into backend/apps-data
npm run app:dev -- treasury  # rebuild + resync that app on every source change
```

To validate: run `npm run build`, confirm `backend/apps-data/treasury/` contains `manifest.json` plus both entry files, then start the Hub and log in — "Treasury" appears in the navigation drawer and renders the app.

A broken manifest, a missing or escaping entry file, or a `manifest.id` that doesn't match its directory name fails the build with an error naming the app, and writes nothing to app storage.

Apps are architecturally external: they may import only `@amber-hub/app-sdk`, enforced by lint. See [developer.md](developer.md) for the full guide and [apps/CLAUDE.md](apps/CLAUDE.md) for the working rules.

## Connect an LLM client (MCP)

Installed apps can publish tools that any [MCP](https://modelcontextprotocol.io) client can list
and call. The Hub exposes one Streamable HTTP endpoint for every app's tools:

- **Dev:** `http://localhost:3000/mcp`
- **Docker:** `http://<host>:9290/mcp`

Authentication is an API key from **Settings → API Key**, sent as a bearer token. Every tool call
runs as that key's owner and can only reach the data that user could reach through the app itself.
Deleting the key disconnects the client on its next request.

Add it to a client that reaches localhost directly (for example Claude Code):

```sh
claude mcp add --transport http amber-hub http://localhost:3000/mcp \
  --header "Authorization: Bearer ahk_your-key-here"
```

Claude Desktop's native custom connectors reach servers from Anthropic's cloud, so a `localhost`
URL is not reachable there and the endpoint must be a public HTTPS URL with a valid certificate.
To use a locally-hosted Hub with Claude Desktop, bridge it with `mcp-remote` in
`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "amber-hub": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:3000/mcp",
        "--header",
        "Authorization: Bearer ahk_your-key-here"
      ]
    }
  }
}
```

Tools appear as `<app-id>_<tool>`, so tools from different apps never collide.

## Run via Docker (single container, single port)

Build and run the whole application — frontend and backend together, both reachable through one port:

```sh
docker build -t amber-hub .
docker run --rm -p 9290:9290 -e MONGODB_URI=mongodb://host.docker.internal:27017/amber-hub -e JWT_SECRET=change-me-to-a-long-random-value amber-hub
```

The image does not bundle a MongoDB server — `MONGODB_URI` must point at an external/sibling Mongo instance reachable from the container.

Open `http://localhost:9290` for the UI; `http://localhost:9290/api/...` for the API — both served through the same port, with `/api/...` proxied by nginx to the backend.

Apps are baked into the image at `/app/backend/apps-data` by the same `npm run build` the image build runs. App content is immutable per release, so updating an app is just rebuilding and redeploying the Hub. Mounting a volume over that path would shadow the apps that shipped in the image.

The container's published port is configurable at `docker run` time, no rebuild needed:

```sh
docker run --rm -e PORT=9000 -p 8081:9000 amber-hub
```

The frontend's backend target is configurable at `docker build` time (this one does need a rebuild, since it's baked into the static assets nginx serves):

```sh
docker build -t amber-hub --build-arg VITE_API_BASE_URL=http://other-backend-host:3000/api .
```

With no `VITE_API_BASE_URL` build argument, the built frontend defaults to `/api` — a same-origin relative path — which is what the default `docker run` example above relies on.

## Other scripts

```sh
npm run build   # builds/type-checks all workspaces
npm run test    # runs all workspace test suites
npm run lint    # lints the whole repo
npm run format  # formats the whole repo with Prettier
```

## Project structure

```text
backend/         # Fastify + TypeScript API, served under /api/...
frontend/        # Vue 3 + Vuetify SPA (Vite)
shared/          # Types shared by both (ApiResponse<T>, error codes)
apps/            # In-repo Apps, one workspace each (see developer.md)
tools/app-sdk/   # The App-Hub contract: types + callAppApi, the only Hub package an App may import
tools/app-build/ # Build tooling: validates each App's package and syncs it into app storage
docker/          # nginx config template + entrypoint script for the single-container build
Dockerfile       # multi-stage build: builds all workspaces, then assembles the runtime image
```

## License

[MIT](LICENSE). Provided as is, without warranty of any kind.
