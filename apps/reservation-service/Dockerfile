FROM node:24.14.0-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy package metadata and install app-local dependencies.
COPY package.json ./

FROM base AS dependencies
RUN pnpm install --no-frozen-lockfile

# Development stage - includes everything for live reload.
FROM dependencies AS development
COPY . .
RUN pnpm exec prisma generate
EXPOSE 3003
CMD ["pnpm", "run", "dev"]

# Production build stage.
FROM dependencies AS build
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

# Production stage.
FROM node:24.14.0-alpine AS production
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY prisma ./prisma
RUN pnpm exec prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 3003
CMD ["node", "dist/index.js"]
