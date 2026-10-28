# Working on Apps

Everything under `apps/` is an **App**: a product the Hub serves, not part of the Hub. Apps
live in this repo for convenience, but they are architecturally external and must stay that
way — the whole point is that any app can be lifted into its own repository later without
untangling.

## The boundary (enforced by lint)

An app may import:

- `@amber-hub/app-sdk`, including its `/frontend` and `/backend` subpaths
- its own dependencies, declared in its own `package.json`

An app must **never** import:

- `@amber-hub/shared` — the SDK re-exports the parts that belong to the app contract
- anything under `backend/src`, `frontend/src`, or `shared/src`, by package name or relative
  path (`../../backend/...` is caught too)

`no-restricted-imports` scoped to `apps/**` in `eslint.config.mjs` enforces this; `npm run lint`
fails on a violation. If an app genuinely needs a Hub capability it can't reach, extend the SDK
contract first — never reach around it.

Apps talk to the running Hub only through the documented contracts: `mount`/`unmount`
(frontend), `init(appManager)` / `registerRoute` / `registerTool` (backend), `{method} /app-api/{appId}/{path}`,
and `/resources/{appId}/*`. Full reference: [developer.md](../developer.md).

## Workspace rules

- One directory per app: `apps/<app-id>/`, with its own `package.json` (`private: true`) and a
  `manifest.json`.
- **`manifest.id` must equal the directory name.** The build fails on a mismatch.
- `package.json` must define a `build` script producing a **self-contained app package** in
  `dist/`: `manifest.json` at the root, every declared entry file, all assets, and all
  dependencies bundled. `dist/` is copied as-is into app storage — there is no install step at
  the destination.
- `entry` paths in the manifest are relative to `dist/`, i.e. they point at build output.
- Adding a new app also means adding a `COPY apps/<id>/package.json` line to the root
  `Dockerfile`, or the image build fails at `npm ci`.

## Never write to app storage

`backend/apps-data/` is **derived output**. Only `tools/app-build`'s sync step writes there; it
reconciles the directory to exactly the set of built apps on every run. Never write to it from
an app, never edit it by hand, and never commit it — anything you put there is deleted by the
next build.

## Development loop

```sh
npm run app:dev -- <app-id>
```

Rebuilds the app and re-syncs it into app storage on every source change. With the Hub running
(`npm run dev:backend`, `npm run dev:frontend`):

- **frontend** changes → refresh the browser
- **backend** changes → restart `npm run dev:backend` (app backends are OS processes spawned at
  Hub startup, so a running one keeps its old code)

`npm run build` at the repo root builds every workspace and syncs all apps. A broken manifest, a
missing or escaping entry, or an id/directory mismatch fails the build and writes nothing.

## Reference

[`apps/treasury`](treasury) is a working example — Vue frontend, backend, and a Vite build.
