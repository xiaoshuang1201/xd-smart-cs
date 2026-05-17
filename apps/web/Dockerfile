# Build context: monorepo root
# docker build -f apps/web/Dockerfile -t xd-web .

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/web/package.json apps/web/nuxt.config.ts apps/web/tsconfig.json apps/web/tailwind.config.ts ./apps/web/
RUN pnpm install --frozen-lockfile

COPY packages/shared/src ./packages/shared/src
COPY apps/web ./apps/web

RUN pnpm --filter @xd/web run build

FROM nginx:1.25-alpine AS runner
COPY --from=builder /app/apps/web/.output/public /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
