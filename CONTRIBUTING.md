# Contributing

Thanks for your interest. Amber Hub is pre-MVP, so the core still changes a lot.

- **Bugs and ideas:** open an issue.
- **Small fixes** (typos, docs, obvious bugs): a PR is fine.
- **Anything larger:** open an issue first so we can agree on the approach before you spend time
  on it.

## Setup

Follow [README.md](README.md) to install dependencies and run the backend and frontend. You need
Node.js and a MongoDB instance.

Before opening a PR, make sure these pass (CI runs the same):

```sh
npm run lint
npm run build
npm test
```

## Building apps

Apps under `apps/*` are architecturally external to the Hub: they may import only
`@amber-hub/app-sdk`, and lint enforces it. Read [developer.md](developer.md) for the app
contracts and [apps/CLAUDE.md](apps/CLAUDE.md) for the working rules.
