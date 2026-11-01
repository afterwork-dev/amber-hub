# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# One COPY per workspace manifest, before `npm ci`, so editing app or Hub *source* does not
# bust the install layer. A new workspace needs its line added here or its build will fail.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY shared/package.json shared/package.json
COPY tools/app-sdk/package.json tools/app-sdk/package.json
COPY tools/app-build/package.json tools/app-build/package.json
COPY tools/ui/package.json tools/ui/package.json
COPY tools/ui-gallery/package.json tools/ui-gallery/package.json
COPY apps/treasury/package.json apps/treasury/package.json
COPY apps/investment-income/package.json apps/investment-income/package.json
COPY apps/networth/package.json apps/networth/package.json
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL="/api"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Builds every workspace (including each app under apps/) and then syncs the built app
# packages into backend/apps-data, which the runtime stage bakes into the image.
RUN npm run build

FROM node:20-alpine AS runtime
RUN apk add --no-cache nginx

WORKDIR /app

# Reuses the build stage's already-installed node_modules instead of running a second,
# independent `npm install` here — both stages share the same base image, so this avoids
# re-resolving platform-specific optional dependencies (e.g. esbuild's native binary) a
# second time, which is otherwise a known source of install failures.
#
# Only the root node_modules is copied: npm workspaces hoists every backend dependency
# there, so a clean `npm ci` creates no backend/node_modules at all. If a future backend
# dependency ever fails to hoist (a version conflict with another workspace), it will land
# in /app/backend/node_modules in the build stage and must be copied here too — the symptom
# is a MODULE_NOT_FOUND at container start for a package that installs fine locally.
COPY --from=build /app/node_modules /app/node_modules
COPY backend/package.json backend/package.json
COPY backend/src backend/src
COPY backend/tsconfig.json backend/tsconfig.json
COPY shared/package.json shared/package.json
COPY shared/src shared/src
COPY shared/tsconfig.json shared/tsconfig.json
COPY --from=build /app/frontend/dist /usr/share/nginx/html
# In-repo apps ship with the image; app storage is derived build output, never a mounted
# volume. It keeps its build-stage location because the Hub resolves this path from the backend
# package itself — a fixed location with no override, identical to local development.
COPY --from=build /app/backend/apps-data /app/backend/apps-data

COPY docker/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV PORT=9290
EXPOSE 9290

ENTRYPOINT ["/docker-entrypoint.sh"]
