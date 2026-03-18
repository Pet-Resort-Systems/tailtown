FROM node:24.14.0-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV APP_ENV=development
ENV PORT=3000

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend-vite/package.json ./apps/frontend-vite/package.json
COPY apps/frontend-vite/.env ./apps/frontend-vite/.env
COPY apps/frontend-vite/.env.example ./apps/frontend-vite/.env.example

RUN pnpm install --filter tailtown-frontend-vite... --frozen-lockfile

COPY apps/frontend-vite ./apps/frontend-vite

WORKDIR /app/apps/frontend-vite

EXPOSE 3000

CMD ["sh", "-c", "if [ \"$APP_ENV\" = \"production\" ]; then pnpm run build && pnpm run preview -- --port ${PORT}; else pnpm run dev -- --port ${PORT}; fi"]
