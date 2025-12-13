FROM node:20.19-alpine as base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base as dependencies
RUN npm ci

# Development stage - includes everything for dev
FROM dependencies as development
COPY . .
RUN npm run prisma:generate
EXPOSE 3002
CMD ["npm", "run", "dev"]

# Production build stage
FROM dependencies as build
COPY . .
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM base as production
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma

# Only install production dependencies
RUN npm ci --only=production

EXPOSE 3002
CMD ["node", "dist/index.js"]
