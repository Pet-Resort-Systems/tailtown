FROM node:24.14.0-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy workspace metadata and the target app manifest first for cached installs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/customer-service/package.json ./apps/customer-service/package.json

FROM base AS dependencies
# Install all dependencies needed to build the service.
# `...` means this package and its dependencies https://pnpm.io/filtering#--filter-package_name-1
RUN pnpm install --filter @tailtown/customer-service... --frozen-lockfile

# Development stage - includes everything for live reload.
FROM dependencies AS development
COPY apps/customer-service ./apps/customer-service
WORKDIR /app/apps/customer-service
RUN pnpm run prisma:generate
EXPOSE 3002
CMD ["pnpm", "run", "dev"]

# Production build stage.
FROM dependencies AS build
COPY apps/customer-service ./apps/customer-service
WORKDIR /app/apps/customer-service
RUN pnpm run prisma:generate
RUN pnpm run build

# Production stage.
FROM node:24.14.0-alpine AS production
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/customer-service/package.json ./apps/customer-service/package.json
RUN pnpm install --filter @tailtown/customer-service... --frozen-lockfile

COPY apps/customer-service/prisma ./apps/customer-service/prisma
WORKDIR /app/apps/customer-service
RUN pnpm run prisma:generate

COPY --from=build /app/apps/customer-service/dist ./dist

EXPOSE 3002
CMD ["node", "dist/index.js"]
