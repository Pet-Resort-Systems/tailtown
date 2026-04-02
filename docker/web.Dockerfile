# Example to run this file for the frontend app
# docker build -f docker/web.Dockerfile --build-arg WORKSPACE_NAME=@tailtown/frontend --build-arg APP_DIR=apps/frontend -t tailtown/frontend .

# -*********************************************************-
# Stage 1 - Base setup
# -*********************************************************-
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
# pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set working directory
WORKDIR /app


# -*********************************************************-
# Stage 2 - Prune the monorepo
# -*********************************************************-
FROM base AS pruner
# Turborepo
RUN pnpm add -g turbo@2.8.17
COPY . .
# Add lockfile and package.json's of isolated subworkspace
# Generate a partial monorepo with a pruned lockfile for a target workspace.
# `WORKSPACE_NAME` should match the name of the app in package.json { "name": "@tailtown/frontend" }
ARG WORKSPACE_NAME=@tailtown/frontend
RUN turbo prune ${WORKSPACE_NAME} --docker


# -*********************************************************-
# Stage 3 - Install dependencies
# -*********************************************************-
FROM base AS installer
# First install the dependencies (as they change less often)
COPY --from=pruner /app/out/json/ ./
# Install ALL deps (including devDependencies for build step).
# --frozen-lockfile ensures reproducible installs.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile


# -*********************************************************-
# Stage 4 - Build
# -*********************************************************-
FROM installer AS builder
# Copy the rest of the source code
COPY --from=pruner /app/out/full/ ./
# Restore shared root TypeScript configs omitted by `turbo prune --docker`.
COPY --from=pruner /app/tsconfig.base.json /app/tsconfig.node.json ./
# Build the app
RUN pnpm turbo build --filter=@tailtown/frontend


# -*********************************************************-
# Stage 5 - Run
# -*********************************************************-
FROM nginx:1.29-alpine AS runner
ENV NODE_ENV=production

# SPA-friendly nginx config
RUN cat <<'NGINX_CONF' > /etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /health {
    access_log off;
    add_header Content-Type text/plain;
    return 200 'ok';
  }
}
NGINX_CONF

ARG APP_DIR=apps/frontend
COPY --from=builder /app/${APP_DIR}/dist/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
