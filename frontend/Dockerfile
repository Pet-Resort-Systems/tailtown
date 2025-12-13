FROM node:20.19-alpine as base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base as dependencies
RUN npm ci

# Development stage
FROM dependencies as development
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# Build stage
FROM dependencies as build
COPY . .
RUN npm run build

# Production stage - serve using nginx
FROM nginx:alpine as production
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
