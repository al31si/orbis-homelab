# syntax=docker/dockerfile:1

# Multi-architecture without emulation: every stage that executes code (npm, tsc, vite) runs on
# the BUILD platform. The runtime stage only receives files (all production dependencies are
# pure JavaScript, no native modules), so `docker buildx build --platform linux/amd64,linux/arm64`
# never needs QEMU. Keep it that way: the runtime stage must not contain a RUN instruction.

ARG NODE_IMAGE=node:22-alpine

# ---- dependencies (workspace install, cached on manifests only)
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
COPY sdk/package.json sdk/
RUN npm ci

# ---- server build
FROM --platform=$BUILDPLATFORM deps AS build-server
COPY tsconfig.base.json ./
COPY shared shared
COPY sdk sdk
COPY server server
RUN npm run build -w server

# ---- web build
FROM --platform=$BUILDPLATFORM deps AS build-web
COPY tsconfig.base.json ./
COPY shared shared
COPY sdk sdk
COPY web web
RUN npm run build -w web

# ---- production dependencies only
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
COPY sdk/package.json sdk/
RUN npm ci --omit=dev --workspace=server --include-workspace-root=false

# ---- empty mount points with the right owner (the runtime stage cannot run mkdir/chown)
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS mountpoints
RUN mkdir /mountpoints /mountpoints/config /mountpoints/data /mountpoints/extensions \
 && chown -R 1000:1000 /mountpoints

# ---- API-only image
FROM ${NODE_IMAGE} AS server
ARG VERSION=dev
ARG REVISION=unknown
ARG SOURCE=https://github.com/al31si/orbis-homelab
LABEL org.opencontainers.image.title="Orbis Homelab" \
      org.opencontainers.image.description="Self-hosted homelab control center (PWA + backend-for-frontend)" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.source="${SOURCE}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"
# getaddrinfo runs on libuv's threadpool: an unresolvable host blocks a thread for ~5 s, so a
# larger pool keeps one missing container name from stalling every other collector.
ENV NODE_ENV=production \
    UV_THREADPOOL_SIZE=64 \
    CONFIG_DIR=/config \
    DATA_DIR=/data \
    EXTENSIONS_DIR=/extensions \
    WEB_DIR=/app/web
WORKDIR /app
COPY --chown=node:node --from=mountpoints /mountpoints/ /
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build-server /app/server/dist server/dist
COPY server/package.json server/
COPY package.json ./
# Licence of the project and of the bundled packages travel with every image.
COPY LICENSE NOTICE THIRD_PARTY_NOTICES.md ./
COPY scripts/healthcheck.mjs ./
USER node
EXPOSE 3100
# healthcheck.mjs reads `server.port` from /config/config.yaml (default 3100), so a custom port
# needs no change here.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "/app/healthcheck.mjs"]
CMD ["node", "server/dist/server/src/index.js"]

# ---- full image (default target): BFF + PWA bundle
FROM server AS runtime
COPY --from=build-web /app/web/dist web
