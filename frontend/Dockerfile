# Development: run Vite dev server so frontend starts with docker compose.
# Not for production (use build + nginx for that).
# Use slim (Debian) instead of Alpine so esbuild native bindings run reliably; Alpine can cause "The service was stopped".
FROM node:26-slim AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm run build

# Runtime stage
FROM mirror.gcr.io/library/nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
