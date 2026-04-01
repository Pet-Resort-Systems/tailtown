FROM node:24.14.0-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV APP_ENV=development
ENV PORT=3000

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/frontend/.env ./apps/frontend/.env
COPY apps/frontend/.env.example ./apps/frontend/.env.example

RUN pnpm install --filter @tailtown/frontend... --frozen-lockfile

COPY apps/frontend ./apps/frontend

WORKDIR /app/apps/frontend

EXPOSE 3000

CMD ["sh", "-c", "if [ \"$APP_ENV\" = \"production\" ]; then pnpm run build && pnpm run preview -- --port ${PORT}; else pnpm run dev -- --port ${PORT}; fi"]
