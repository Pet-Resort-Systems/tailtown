FROM node:24.14.0-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy workspace metadata and the target app manifest first for cached installs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/legacy-frontend/package.json ./apps/legacy-frontend/package.json

FROM base AS dependencies
# Install all dependencies needed to build the service.
# `...` means this package and its dependencies https://pnpm.io/filtering#--filter-package_name-1
RUN pnpm install --filter @tailtown/legacy-frontend... --frozen-lockfile

# Development stage
FROM dependencies AS development
COPY apps/legacy-frontend ./apps/legacy-frontend
WORKDIR /app/apps/legacy-frontend
EXPOSE 3000
CMD ["pnpm", "start"]

# Build stage
FROM dependencies AS build
COPY apps/legacy-frontend ./apps/legacy-frontend
WORKDIR /app/apps/legacy-frontend
RUN pnpm run build

# Production stage - serve using nginx
FROM nginx:alpine AS production
COPY --from=build /app/apps/legacy-frontend/build /usr/share/nginx/html
COPY apps/legacy-frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
