# syntax=docker/dockerfile:1

FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

FROM base AS builder

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/types/package.json packages/types/package.json
COPY apps/server/package.json apps/server/package.json

RUN pnpm install --frozen-lockfile

COPY packages/types/ packages/types/
COPY apps/server/ apps/server/

RUN pnpm --filter @env2/types run build
RUN pnpm --filter @env2/server run build

FROM builder AS pruner

RUN pnpm deploy --filter @env2/server --prod --legacy /prod/server

RUN node -e "require('/prod/server/node_modules/better-sqlite3')" \
    && echo "better-sqlite3 native binding OK"

FROM node:22-slim AS runner

RUN groupadd --system app && useradd --system --gid app app

WORKDIR /app

COPY --from=pruner --chown=app:app /prod/server ./
COPY --from=builder --chown=app:app /app/apps/server/dist ./dist

RUN mkdir -p /data && chown app:app /data

USER app

ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

CMD ["node", "dist/index.js"]
