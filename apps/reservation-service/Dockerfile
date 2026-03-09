FROM node:24.14.0-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy workspace metadata and the target app manifest first for cached installs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/reservation-service/package.json ./apps/reservation-service/package.json

FROM base AS dependencies
# Install all dependencies needed to build the service.
# `...` means this package and its dependencies https://pnpm.io/filtering#--filter-package_name-1
RUN pnpm install --filter @tailtown/reservation-service... --frozen-lockfile

# Development stage - includes everything for live reload.
FROM dependencies AS development
COPY apps/reservation-service ./apps/reservation-service
WORKDIR /app/apps/reservation-service
RUN pnpm exec prisma generate
EXPOSE 3003
CMD ["pnpm", "run", "dev"]

# Production build stage.
FROM dependencies AS build
COPY apps/reservation-service ./apps/reservation-service
WORKDIR /app/apps/reservation-service
RUN pnpm exec prisma generate
RUN pnpm run build

# Production stage.
FROM node:24.14.0-alpine AS production
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/reservation-service/package.json ./apps/reservation-service/package.json
# Install runtime dependencies plus Prisma CLI used for client generation.
# `...` means this package and its dependencies https://pnpm.io/filtering#--filter-package_name-1
RUN pnpm install --filter @tailtown/reservation-service... --frozen-lockfile

COPY apps/reservation-service/prisma ./apps/reservation-service/prisma
WORKDIR /app/apps/reservation-service
RUN pnpm exec prisma generate

COPY --from=build /app/apps/reservation-service/dist ./dist

EXPOSE 3003
CMD ["node", "dist/index.js"]
