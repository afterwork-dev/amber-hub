## App Boundary (apps/*)

Apps live under `apps/*` as workspace packages, but they are **architecturally external**:
they are products the Hub serves, not part of the Hub. This keeps any app extractable into
its own repository later.

- An app may import **only** `@amber-hub/app-sdk` (plus its own dependencies) — never
  `@amber-hub/shared`, `backend/src`, `frontend/src`, or `shared/src`. `no-restricted-imports`
  scoped to `apps/**` in `eslint.config.mjs` fails the build if you try.
- Apps reach the Hub only through the documented contracts: `mount`/`unmount`,
  `init(appManager)`/`registerRoute`, `/app-api/{appId}/*`, `/resources/{appId}/*`.
- The Hub must never special-case in-repo apps, and must only ever load app code from app
  storage (`backend/apps-data`), which is **derived build output** — written solely by
  `tools/app-build`'s sync step, never edited by hand or committed.

When working on files under `apps/`, see [apps/CLAUDE.md](apps/CLAUDE.md). The developer-facing
guide is [developer.md](developer.md).
