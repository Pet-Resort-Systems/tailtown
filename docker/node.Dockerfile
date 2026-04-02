# Example to run this file for a service (e.g., apps/customer-service)
# docker build -f docker/node.Dockerfile --build-arg WORKSPACE_NAME=@tailtown/customer-service --build-arg APP_DIR=apps/customer-service -t tailtown/customer-service .

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
# `WORKSPACE_NAME` should match the name of the app/service in package.json { "name": "@tailtown/customer-service" }
ARG WORKSPACE_NAME
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
RUN pnpm turbo build

# -*********************************************************-
# Stage 5 - Run
# -*********************************************************-
# Don't run as root
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 appgroup && \
    adduser  --system --uid 1001 --ingroup appgroup appuser

# Do a prod install with the pruned lockfile + manifests
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
ARG APP_DIR
COPY --from=builder /app/${APP_DIR}/dist ./${APP_DIR}/dist

# Copy only built artifacts for internal workspace packages.
# The pruned install already provides each package's manifest under ./packages/*,
# and pnpm links node_modules entries back to those workspace paths at runtime.
RUN --mount=type=bind,from=builder,source=/app/packages,target=/tmp/packages,readonly \
    find /tmp/packages -mindepth 2 -maxdepth 2 -type d -name dist | while read -r dist_dir; do \
      pkg_dir="${dist_dir#/tmp/packages/}"; \
      pkg_dir="${pkg_dir%/dist}"; \
      mkdir -p "./packages/${pkg_dir}"; \
      cp -R "${dist_dir}" "./packages/${pkg_dir}/dist"; \
    done

USER appuser

ARG APP_DIR
ENV APP_DIR=${APP_DIR}

# Each service's package.json should define: "start": "node dist/index.js"
# CMD pnpm --filter ${APP_DIR} run start
ENTRYPOINT ["sh", "-c", "node \"$APP_DIR/dist/index.js\""]
