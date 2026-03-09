FROM node:24.14.0-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy package metadata and install app-local dependencies.
COPY package.json ./

FROM base AS dependencies
RUN pnpm install --no-frozen-lockfile

# Development stage
FROM dependencies AS development
COPY . .
EXPOSE 3000
CMD ["pnpm", "start"]

# Build stage
FROM dependencies AS build
COPY . .
RUN pnpm run build

# Production stage - serve using nginx
FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
