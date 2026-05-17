# Build context: monorepo root
# docker build -f apps/admin/Dockerfile -t xd-admin .

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/admin/package.json apps/admin/vite.config.ts apps/admin/tsconfig.json apps/admin/tsconfig.node.json apps/admin/index.html ./apps/admin/
RUN pnpm install --frozen-lockfile

COPY packages/shared/src ./packages/shared/src
COPY apps/admin ./apps/admin

RUN pnpm --filter @xd/admin run build

FROM nginx:1.25-alpine AS runner
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
